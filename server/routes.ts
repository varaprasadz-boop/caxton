import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { uploadMiddleware, handleFileUpload } from "./upload";
import { requireAuth, requireAdmin, getUserRole } from "./auth";
import fs from 'fs';
import path from 'path';
import { Client } from '@replit/object-storage';
import bcrypt from 'bcrypt';
import { 
  insertClientSchema, 
  insertDepartmentSchema,
  insertEmployeeSchema,
  insertMachineSchema,
  insertJobSchema, 
  insertTaskSchema,
  JOB_TYPES,
  type Task
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      // Find employee by email
      const employees = await storage.getEmployees();
      const employee = employees.find(emp => emp.email.toLowerCase() === email.toLowerCase());
      
      if (!employee) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      // Check if employee has a password
      if (!employee.passwordHash) {
        return res.status(401).json({ error: "No password set for this account. Please contact admin." });
      }
      
      // Verify password
      const passwordMatch = await bcrypt.compare(password, employee.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      // Create session
      const userRole = getUserRole(employee);
      req.session.userId = employee.id;
      req.session.userEmail = employee.email;
      req.session.userRole = userRole;
      
      res.json({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        departmentId: employee.departmentId,
        role: userRole
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/me", requireAuth, async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.session.userId!);
      if (!employee) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        departmentId: employee.departmentId,
        role: req.session.userRole
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user info" });
    }
  });
  
  // File upload route
  app.post("/api/upload", requireAuth, uploadMiddleware, handleFileUpload);

  // File serving route for PO files (local fallback) - SECURE
  app.get("/files/:filename", async (req, res) => {
    try {
      // Get and decode the filename parameter to handle URL encoding
      let filename = decodeURIComponent(req.params.filename);
      
      // Security: Reject any filename containing directory traversal patterns
      // Check both before and after decoding to prevent encoding-based bypasses
      const originalFilename = req.params.filename;
      if (!filename || !originalFilename ||
          filename.includes('..') || filename.includes('/') || filename.includes('\\') ||
          originalFilename.includes('..') || originalFilename.includes('%2e%2e') || 
          originalFilename.includes('%2f') || originalFilename.includes('%5c')) {
        return res.status(400).json({ error: 'Invalid filename: directory traversal not allowed' });
      }
      
      // Security: Only allow safe filename characters (alphanumeric, hyphens, underscores, dots)
      if (!/^[a-zA-Z0-9\-_.]+$/.test(filename)) {
        return res.status(400).json({ error: 'Invalid filename format: only alphanumeric, dash, underscore, and dot allowed' });
      }
      
      // Security: Prevent excessively long filenames that could cause issues
      if (filename.length > 255) {
        return res.status(400).json({ error: 'Filename too long' });
      }
      
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadsDir, filename);
      
      // Security: Double-check the resolved path is within uploads directory
      // Try object storage first, then fall back to local storage
      let fileServed = false;
      
      // Try object storage
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (bucketId) {
        try {
          const objectStorage = new Client();
          const objectPath = `.private/${filename}`;
          const fileBuffer = await objectStorage.downloadAsBytes(objectPath);
          
          // Set appropriate content type based on file extension
          const ext = filename.split('.').pop()?.toLowerCase();
          const contentType = ext === 'pdf' ? 'application/pdf' 
                            : ext === 'png' ? 'image/png'
                            : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                            : 'application/octet-stream';
          
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
          res.send(fileBuffer);
          fileServed = true;
          console.log(`File served from object storage: ${filename}`);
        } catch (objectStorageError) {
          console.warn(`Object storage failed for ${filename}, trying local storage:`, objectStorageError.message);
        }
      }
      
      // Fall back to local storage if object storage failed or unavailable
      if (!fileServed) {
        const realUploadPath = fs.realpathSync(uploadsDir);
        let realFilePath;
        try {
          realFilePath = fs.realpathSync(filePath);
        } catch (e) {
          // File doesn't exist or path resolution failed
          return res.status(404).json({ error: 'File not found' });
        }
        
        if (!realFilePath.startsWith(realUploadPath + path.sep) && realFilePath !== realUploadPath) {
          return res.status(403).json({ error: 'Access denied: path outside allowed directory' });
        }
        
        // Check if file exists and is a regular file
        const stats = fs.statSync(realFilePath);
        if (!stats.isFile()) {
          return res.status(400).json({ error: 'Invalid file type' });
        }
        
        // Set appropriate content type based on file extension
        const ext = filename.split('.').pop()?.toLowerCase();
        const contentType = ext === 'pdf' ? 'application/pdf' 
                          : ext === 'png' ? 'image/png'
                          : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                          : 'application/octet-stream';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.sendFile(realFilePath);
        console.log(`File served from local storage: ${filename}`);
      }
      
    } catch (error) {
      console.error('File serving error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Clients routes (Admin only for modifications, all authenticated users can view)
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid client data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", requireAdmin, async (req, res) => {
    try {
      const updates = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, updates);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid client data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteClient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Departments routes
  app.get("/api/departments", requireAuth, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.get("/api/departments/:id", async (req, res) => {
    try {
      const department = await storage.getDepartment(req.params.id);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch department" });
    }
  });

  app.post("/api/departments", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(validatedData);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid department data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create department" });
    }
  });

  app.patch("/api/departments/:id", async (req, res) => {
    try {
      const updates = insertDepartmentSchema.partial().parse(req.body);
      const department = await storage.updateDepartment(req.params.id, updates);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid department data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update department" });
    }
  });

  app.delete("/api/departments/:id", async (req, res) => {
    try {
      const success = await storage.deleteDepartment(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Department not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete department" });
    }
  });

  // Employees routes
  app.get("/api/employees", requireAuth, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", requireAdmin, async (req, res) => {
    try {
      const { password, ...employeeData } = req.body;
      const validatedData = insertEmployeeSchema.parse(employeeData);
      
      // Hash password if provided
      let passwordHash: string | undefined;
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      }
      
      const employee = await storage.createEmployee({
        ...validatedData,
        passwordHash
      });
      
      // Don't send password hash back to client
      const { passwordHash: _, ...employeeResponse } = employee;
      res.status(201).json(employeeResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid employee data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  app.patch("/api/employees/:id", async (req, res) => {
    try {
      const { password, ...employeeData } = req.body;
      const updates = insertEmployeeSchema.partial().parse(employeeData);
      
      // Hash password if provided for update
      let passwordHash: string | undefined;
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      }
      
      const employee = await storage.updateEmployee(req.params.id, {
        ...updates,
        ...(passwordHash && { passwordHash })
      });
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Don't send password hash back to client
      const { passwordHash: _, ...employeeResponse } = employee;
      res.json(employeeResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid employee data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteEmployee(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });

  // Machines routes
  app.get("/api/machines", requireAuth, async (req, res) => {
    try {
      const machines = await storage.getMachines();
      res.json(machines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch machines" });
    }
  });

  app.get("/api/machines/:id", async (req, res) => {
    try {
      const machine = await storage.getMachine(req.params.id);
      if (!machine) {
        return res.status(404).json({ error: "Machine not found" });
      }
      res.json(machine);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch machine" });
    }
  });

  app.post("/api/machines", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertMachineSchema.parse(req.body);
      const machine = await storage.createMachine(validatedData);
      res.status(201).json(machine);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid machine data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create machine" });
    }
  });

  app.patch("/api/machines/:id", async (req, res) => {
    try {
      const updates = insertMachineSchema.partial().parse(req.body);
      const machine = await storage.updateMachine(req.params.id, updates);
      if (!machine) {
        return res.status(404).json({ error: "Machine not found" });
      }
      res.json(machine);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid machine data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update machine" });
    }
  });

  app.delete("/api/machines/:id", async (req, res) => {
    try {
      const machineId = req.params.id;
      
      // Check if machine exists
      const machine = await storage.getMachine(machineId);
      if (!machine) {
        return res.status(404).json({ error: "Machine not found" });
      }
      
      // Check if machine is referenced by any jobs
      const jobs = await storage.getJobs();
      const jobsUsingMachine = jobs.filter(job => 
        job.machineIds && job.machineIds.includes(machineId)
      );
      
      if (jobsUsingMachine.length > 0) {
        return res.status(400).json({ 
          error: "Cannot delete machine",
          message: `This machine is being used by ${jobsUsingMachine.length} job(s). Please remove it from those jobs first.`
        });
      }
      
      await storage.deleteMachine(machineId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete machine" });
    }
  });

  // Admin credential update route
  app.post("/api/admin/update-credentials", async (req, res) => {
    try {
      // Validate and sanitize input
      const adminCredentialsSchema = z.object({
        currentEmail: z.string().email("Invalid current email"),
        newEmail: z.preprocess(
          val => (typeof val === 'string' && val.trim() === '' ? undefined : val),
          z.string().email("Invalid new email").optional()
        ),
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.preprocess(
          val => (typeof val === 'string' && val.trim() === '' ? undefined : val),
          z.string().min(6, "New password must be at least 6 characters").optional()
        ),
        confirmPassword: z.preprocess(
          val => (typeof val === 'string' && val.trim() === '' ? undefined : val),
          z.string().optional()
        )
      }).refine((data) => {
        if (data.newPassword && data.newPassword !== data.confirmPassword) {
          return false;
        }
        return true;
      }, {
        message: "Passwords do not match",
        path: ["confirmPassword"]
      });

      const validatedData = adminCredentialsSchema.parse(req.body);
      const { currentEmail, newEmail, currentPassword, newPassword } = validatedData;

      // Find employee by current email
      const employees = await storage.getEmployees();
      const adminEmployee = employees.find(emp => emp.email === currentEmail);

      if (!adminEmployee) {
        return res.status(404).json({ error: "Admin account not found" });
      }

      // Verify current password
      if (!adminEmployee.passwordHash) {
        return res.status(400).json({ error: "Admin account has no password set" });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, adminEmployee.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Prepare updates
      const updates: any = {};
      
      if (newEmail && newEmail !== currentEmail) {
        // Check if new email is already in use
        const emailExists = employees.find(emp => emp.email === newEmail && emp.id !== adminEmployee.id);
        if (emailExists) {
          return res.status(400).json({ error: "Email already in use" });
        }
        updates.email = newEmail;
      }

      if (newPassword) {
        updates.passwordHash = await bcrypt.hash(newPassword, 10);
      }

      // Ensure at least one field is being updated
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No changes to update" });
      }

      // Update employee
      await storage.updateEmployee(adminEmployee.id, updates);

      res.json({ message: "Credentials updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Admin credential update error:", error);
      res.status(500).json({ error: "Failed to update admin credentials" });
    }
  });

  // Jobs routes (All authenticated users can view jobs, only admin can modify)
  app.get("/api/jobs", requireAuth, async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  app.post("/api/jobs", requireAdmin, async (req, res) => {
    try {
      // Handle date string conversion for API compatibility
      const requestData = { ...req.body };
      if (requestData.deadline && typeof requestData.deadline === 'string') {
        requestData.deadline = new Date(requestData.deadline);
      }
      
      const validatedData = insertJobSchema.parse(requestData);
      
      // Validate that all stage deadlines are within the job delivery date
      if (validatedData.stageDeadlines) {
        const deliveryDate = new Date(validatedData.deadline);
        const stageDeadlines = validatedData.stageDeadlines as Record<string, string>;
        
        for (const [stage, deadlineStr] of Object.entries(stageDeadlines)) {
          const stageDeadline = new Date(deadlineStr);
          if (stageDeadline > deliveryDate) {
            return res.status(400).json({ 
              error: "Invalid stage deadlines", 
              details: `Stage "${stage}" deadline (${stageDeadline.toISOString()}) exceeds job delivery date (${deliveryDate.toISOString()})`
            });
          }
        }
      }
      
      const job = await storage.createJob(validatedData);
      
      // Auto-generate workflow tasks based on job type and stage time allocations
      await generateJobTasks(job.id, job.jobType, job.deadline, job.stageDeadlines);
      
      res.status(201).json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid job data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create job" });
    }
  });

  app.patch("/api/jobs/:id", requireAdmin, async (req, res) => {
    try {
      // Handle date string conversion for API compatibility
      const requestData = { ...req.body };
      if (requestData.deadline && typeof requestData.deadline === 'string') {
        requestData.deadline = new Date(requestData.deadline);
      }
      
      // Validate request data using partial schema for updates
      const partialJobSchema = insertJobSchema.partial();
      const validatedData = partialJobSchema.parse(requestData);
      
      const job = await storage.updateJob(req.params.id, validatedData);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid job data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update job" });
    }
  });

  // Tasks routes
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const { jobId } = req.query;
      let tasks;
      
      if (jobId && typeof jobId === 'string') {
        tasks = await storage.getTasksByJobId(jobId);
      } else {
        tasks = await storage.getTasks();
      }
      
      // Filter tasks based on user role
      if (req.session.userRole === 'employee') {
        // Employees only see their assigned tasks
        tasks = tasks.filter(task => task.employeeId === req.session.userId);
      }
      // Admins see all tasks
      
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      
      // Validate that task deadline is within job delivery date
      const job = await storage.getJob(validatedData.jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      const taskDeadline = new Date(validatedData.deadline);
      const jobDeadline = new Date(job.deadline);
      
      if (taskDeadline > jobDeadline) {
        return res.status(400).json({ 
          error: "Invalid task deadline", 
          details: `Task deadline (${taskDeadline.toISOString()}) exceeds job delivery date (${jobDeadline.toISOString()})`
        });
      }
      
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid task data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const { status, employeeId, remarks } = req.body;
      
      // Get current task to check its status
      const currentTask = await storage.getTask(req.params.id);
      if (!currentTask) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Permission check: Employees can only update their own assigned tasks
      if (req.session.userRole === 'employee') {
        if (currentTask.employeeId !== req.session.userId) {
          return res.status(403).json({ 
            error: "Permission denied", 
            details: "You can only update tasks assigned to you"
          });
        }
        
        // Employees can only update status and remarks, not reassign
        if (employeeId !== undefined && employeeId !== currentTask.employeeId) {
          return res.status(403).json({ 
            error: "Permission denied", 
            details: "You cannot reassign tasks"
          });
        }
      }
      
      // Prevent status or assignment changes for in-queue tasks
      if (currentTask.status === "in-queue" && (status !== undefined || employeeId !== undefined)) {
        return res.status(400).json({ 
          error: "Cannot modify in-queue tasks", 
          details: "Tasks in queue cannot be updated until the previous task is completed"
        });
      }
      
      const task = await storage.updateTask(req.params.id, { status, employeeId, remarks });
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Auto-advance next task when current task is completed
      if (status === "completed") {
        const allJobTasks = await storage.getTasksByJobId(task.jobId);
        // Find the next task by order
        const nextTask = allJobTasks.find((t: Task) => t.order === task.order + 1 && t.status === "in-queue");
        
        if (nextTask) {
          // Advance next task from in-queue to pending
          await storage.updateTask(nextTask.id, { status: "pending" });
        }
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Job statistics route
  app.get("/api/stats/jobs", async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      const now = new Date();
      
      const stats = {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(job => !["completed", "delivered"].includes(job.status)).length,
        completedJobs: jobs.filter(job => ["completed", "delivered"].includes(job.status)).length,
        overdueJobs: jobs.filter(job => 
          new Date(job.deadline) < now && !["completed", "delivered"].includes(job.status)
        ).length
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job statistics" });
    }
  });

  // Deadline alerts route
  app.get("/api/alerts/deadlines", async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      const tasks = await storage.getTasks();
      const clients = await storage.getClients();
      const employees = await storage.getEmployees();
      
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      // Create lookup maps
      const clientMap = new Map(clients.map(c => [c.id, c]));
      const employeeMap = new Map(employees.map(e => [e.id, e]));
      
      const departments = await storage.getDepartments();
      const departmentMap = new Map(departments.map((d: any) => [d.id, d]));
      
      const alerts = [];
      
      // Check jobs
      for (const job of jobs) {
        if (!["completed", "delivered"].includes(job.status)) {
          const deadline = new Date(job.deadline);
          const client = clientMap.get(job.clientId);
          
          if (deadline <= threeDaysFromNow) {
            alerts.push({
              id: job.id,
              title: `Job: ${job.description || job.jobType}`,
              type: "job",
              client: client?.name,
              deadline,
              status: job.status
            });
          }
        }
      }
      
      // Check tasks
      for (const task of tasks) {
        if (task.status !== "completed") {
          const deadline = new Date(task.deadline);
          const employee = task.employeeId ? employeeMap.get(task.employeeId) : null;
          const department = departmentMap.get(task.departmentId);
          
          if (deadline <= threeDaysFromNow) {
            alerts.push({
              id: task.id,
              title: `Task: ${department?.name || "Unknown"}`,
              type: "task",
              employee: employee?.name,
              deadline,
              status: task.status,
              stage: department?.name || "Unknown"
            });
          }
        }
      }
      
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deadline alerts" });
    }
  });

  // Recent activity feed
  app.get("/api/activities/recent", async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      const tasks = await storage.getTasks();
      const clients = await storage.getClients();
      const employees = await storage.getEmployees();
      
      // Create lookup maps
      const clientMap = new Map(clients.map(c => [c.id, c]));
      const employeeMap = new Map(employees.map(e => [e.id, e]));
      const jobMap = new Map(jobs.map(j => [j.id, j]));
      
      const departments = await storage.getDepartments();
      const departmentMap = new Map(departments.map((d: any) => [d.id, d]));
      
      const activities = [];
      
      // Recent jobs (last 10)
      const recentJobs = jobs
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 10);
      
      for (const job of recentJobs) {
        const client = clientMap.get(job.clientId);
        activities.push({
          id: `job-${job.id}`,
          type: "job_created",
          title: `New job created: ${job.description || job.jobType}`,
          description: `Client: ${client?.name || "Unknown"}`,
          timestamp: job.createdAt || new Date(),
          metadata: {
            jobId: job.id,
            jobType: job.jobType,
            client: client?.name,
            quantity: job.quantity
          }
        });
      }
      
      // Recent completed tasks (last 10)
      const completedTasks = tasks
        .filter(task => task.status === "completed")
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
        .slice(0, 10);
      
      for (const task of completedTasks) {
        const job = jobMap.get(task.jobId);
        const client = job ? clientMap.get(job.clientId) : null;
        const employee = task.employeeId ? employeeMap.get(task.employeeId) : null;
        const department = departmentMap.get(task.departmentId);
        
        activities.push({
          id: `task-${task.id}`,
          type: "task_completed",
          title: `Task completed: ${department?.name || "Unknown"}`,
          description: `Job: ${job?.jobType || "Unknown"} • ${client?.name || "Unknown Client"}`,
          timestamp: task.updatedAt || task.createdAt || new Date(), // Use updatedAt for completion time
          metadata: {
            taskId: task.id,
            stage: department?.name || "Unknown",
            employee: employee?.name,
            jobType: job?.jobType
          }
        });
      }
      
      // Sort all activities by timestamp and take the most recent 20
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20);
      
      res.json(sortedActivities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent activities" });
    }
  });

  // Enhanced job statistics with more details
  app.get("/api/stats/detailed", async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      const tasks = await storage.getTasks();
      const clients = await storage.getClients();
      const employees = await storage.getEmployees();
      
      const now = new Date();
      
      // Job statistics
      const jobStats = {
        total: jobs.length,
        active: jobs.filter(job => !["completed", "delivered"].includes(job.status)).length,
        completed: jobs.filter(job => ["completed", "delivered"].includes(job.status)).length,
        overdue: jobs.filter(job => 
          new Date(job.deadline) < now && !["completed", "delivered"].includes(job.status)
        ).length
      };
      
      // Task statistics
      const taskStats = {
        total: tasks.length,
        pending: tasks.filter(task => task.status === "pending").length,
        inProgress: tasks.filter(task => task.status === "in-progress").length,
        completed: tasks.filter(task => task.status === "completed").length,
        unassigned: tasks.filter(task => !task.employeeId).length,
        overdue: tasks.filter(task => 
          new Date(task.deadline) < now && task.status !== "completed"
        ).length
      };
      
      // Job type distribution
      const jobTypeStats = jobs.reduce((acc, job) => {
        acc[job.jobType] = (acc[job.jobType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Department distribution (formerly stage stats)
      const departments = await storage.getDepartments();
      const departmentMap = new Map(departments.map((d: any) => [d.id, d]));
      const stageStats = tasks.reduce((acc, task) => {
        const deptName = departmentMap.get(task.departmentId)?.name || "Unknown";
        acc[deptName] = (acc[deptName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Employee workload
      const employeeWorkload = employees.map(employee => {
        const assignedTasks = tasks.filter(task => task.employeeId === employee.id);
        const activeTasks = assignedTasks.filter(task => task.status !== "completed");
        const completedTasks = assignedTasks.filter(task => task.status === "completed");
        const department = employee.departmentId ? departmentMap.get(employee.departmentId) : null;
        
        return {
          employeeId: employee.id,
          name: employee.name,
          role: department?.name || "Unassigned",
          activeTasks: activeTasks.length,
          completedTasks: completedTasks.length,
          totalTasks: assignedTasks.length
        };
      });
      
      res.json({
        jobs: jobStats,
        tasks: taskStats,
        jobTypes: jobTypeStats,
        stages: stageStats,
        employees: employeeWorkload,
        clients: {
          total: clients.length,
          withActiveJobs: clients.filter(client => 
            jobs.some(job => job.clientId === client.id && !["completed", "delivered"].includes(job.status))
          ).length
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch detailed statistics" });
    }
  });

  // Utility function to generate workflow tasks
  async function generateJobTasks(jobId: string, jobType: string, deadline: Date, stageDeadlines?: any) {
    const departments = await storage.getDepartments();
    const employees = await storage.getEmployees();
    const deliveryDate = new Date(deadline);
    
    for (let i = 0; i < departments.length; i++) {
      const department = departments[i];
      let taskDeadline: Date;
      
      if (stageDeadlines && stageDeadlines[department.id]) {
        // Use custom stage deadline if provided
        taskDeadline = new Date(stageDeadlines[department.id]);
      } else {
        // Fallback to default: evenly distribute departments between now and delivery
        const now = new Date();
        const totalDays = Math.max(1, Math.ceil((deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const daysBetweenStages = Math.max(1, Math.floor(totalDays / departments.length));
        taskDeadline = new Date(now.getTime() + (i + 1) * daysBetweenStages * 24 * 60 * 60 * 1000);
      }
      
      // Auto-assign to an employee in this department
      const departmentEmployees = employees.filter(emp => emp.departmentId === department.id);
      const assignedEmployee = departmentEmployees.length > 0 ? departmentEmployees[0] : null;
      
      await storage.createTask({
        jobId,
        departmentId: department.id,
        deadline: taskDeadline,
        status: i === 0 ? "pending" : "in-queue", // First task is pending, rest are in-queue
        order: i + 1,
        employeeId: assignedEmployee?.id || null,
        remarks: null
      });
    }
  }

  // Removed duplicate getWorkflowStages function - now using the one from shared/schema

  const httpServer = createServer(app);
  return httpServer;
}
