import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { uploadMiddleware, handleFileUpload, handleFileUploadRoute, multerUpload } from "./upload";
import { requireAuth, requireAdmin, requirePermission, getUserRole } from "./auth";
import fs from 'fs';
import path from 'path';
import { Client } from '@replit/object-storage';
import bcrypt from 'bcrypt';
import { 
  insertClientSchema, 
  insertDepartmentSchema,
  insertRoleSchema,
  insertEmployeeSchema,
  insertMachineSchema,
  insertProductCategorySchema,
  insertJobSchema, 
  insertTaskSchema,
  insertCompanySettingsSchema,
  JOB_TYPES,
  type Task
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Attach storage to all requests for permission checks
  app.use((req, res, next) => {
    req.storage = storage as any; // Storage is PostgreSQL in production
    next();
  });

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
	
      req.session.save(err => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Could not save session" });
        }
      
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
      
      // Fetch role permissions if user has a roleId
      let permissions = null;
      if (employee.roleId) {
        const role = await storage.getRole(employee.roleId);
        if (role) {
          permissions = role.permissions;
        }
      }
      
      res.json({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        departmentId: employee.departmentId,
        role: req.session.userRole,
        roleId: employee.roleId,
        permissions: permissions
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user info" });
    }
  });
  
  // File upload route
  app.post("/api/upload", requireAuth, uploadMiddleware, handleFileUploadRoute);

  // File serving route for PO files (local fallback) - SECURE
  app.get("/files/:filename", requireAuth, async (req, res) => {
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
  app.get("/api/clients", requirePermission('clients', 'view'), async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", requireAuth, async (req, res) => {
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

  app.post("/api/clients", requirePermission('clients', 'create'), async (req, res) => {
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

  app.patch("/api/clients/:id", requirePermission('clients', 'edit'), async (req, res) => {
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

  app.delete("/api/clients/:id", requirePermission('clients', 'delete'), async (req, res) => {
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
  app.get("/api/departments", requirePermission('departments', 'view'), async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.get("/api/departments/:id", requireAuth, async (req, res) => {
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

  app.post("/api/departments", requirePermission('departments', 'create'), async (req, res) => {
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

  app.patch("/api/departments/:id", requirePermission('departments', 'edit'), async (req, res) => {
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

  app.delete("/api/departments/:id", requirePermission('departments', 'delete'), async (req, res) => {
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

  // Roles routes (Admin only for all operations)
  app.get("/api/roles", requireAdmin, async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.get("/api/roles/:id", requireAdmin, async (req, res) => {
    try {
      const role = await storage.getRole(req.params.id);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }
      res.json(role);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch role" });
    }
  });

  app.post("/api/roles", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(validatedData);
      res.status(201).json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid role data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  app.patch("/api/roles/:id", requireAdmin, async (req, res) => {
    try {
      const updates = insertRoleSchema.partial().parse(req.body);
      const role = await storage.updateRole(req.params.id, updates);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }
      res.json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid role data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.delete("/api/roles/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteRole(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Role not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete role" });
    }
  });

  // Employees routes
  app.get("/api/employees", requirePermission('employees', 'view'), async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", requireAuth, async (req, res) => {
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

  app.post("/api/employees", requirePermission('employees', 'create'), async (req, res) => {
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

  app.patch("/api/employees/:id", requirePermission('employees', 'edit'), async (req, res) => {
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

  app.delete("/api/employees/:id", requirePermission('employees', 'delete'), async (req, res) => {
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
  app.get("/api/machines", requirePermission('machines', 'view'), async (req, res) => {
    try {
      const machines = await storage.getMachines();
      res.json(machines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch machines" });
    }
  });

  app.get("/api/machines/:id", requireAuth, async (req, res) => {
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

  app.post("/api/machines", requirePermission('machines', 'create'), async (req, res) => {
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

  app.patch("/api/machines/:id", requirePermission('machines', 'edit'), async (req, res) => {
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

  app.delete("/api/machines/:id", requirePermission('machines', 'delete'), async (req, res) => {
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

  // Product Categories routes
  app.get("/api/product-categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getProductCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product categories" });
    }
  });

  app.get("/api/product-categories/:id", requireAuth, async (req, res) => {
    try {
      const category = await storage.getProductCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Product category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product category" });
    }
  });

  app.post("/api/product-categories", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertProductCategorySchema.parse(req.body);
      const category = await storage.createProductCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid product category data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create product category" });
    }
  });

  app.patch("/api/product-categories/:id", requireAdmin, async (req, res) => {
    try {
      const updates = insertProductCategorySchema.partial().parse(req.body);
      const category = await storage.updateProductCategory(req.params.id, updates);
      if (!category) {
        return res.status(404).json({ error: "Product category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid product category data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update product category" });
    }
  });

  app.delete("/api/product-categories/:id", requireAdmin, async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      // Check if category exists
      const category = await storage.getProductCategory(categoryId);
      if (!category) {
        return res.status(404).json({ error: "Product category not found" });
      }
      
      // Check if category is referenced by any jobs
      const jobs = await storage.getJobs();
      const jobsUsingCategory = jobs.filter(job => job.productCategoryId === categoryId);
      
      if (jobsUsingCategory.length > 0) {
        return res.status(400).json({ 
          error: "Cannot delete product category",
          message: `This category is being used by ${jobsUsingCategory.length} job(s). Please remove it from those jobs first.`
        });
      }
      
      await storage.deleteProductCategory(categoryId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product category" });
    }
  });

  // Admin credential update route
  app.post("/api/admin/update-credentials", requireAdmin, async (req, res) => {
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

  // Employee password change route
  app.post("/api/employee/change-password", requireAuth, async (req, res) => {
    try {
      // Validate input
      const passwordChangeSchema = z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(6, "New password must be at least 6 characters"),
        confirmPassword: z.string().min(1, "Password confirmation is required")
      }).refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"]
      });

      const validatedData = passwordChangeSchema.parse(req.body);
      const { currentPassword, newPassword } = validatedData;

      // Get current user
      const employee = await storage.getEmployee(req.session.userId!);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      // Verify current password
      if (!employee.passwordHash) {
        return res.status(400).json({ error: "No password set for this account" });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, employee.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash and update new password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateEmployee(employee.id, { passwordHash });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Employee password change error:", error);
      res.status(500).json({ error: "Failed to update password" });
    }
  });

  // Jobs routes (All authenticated users can view jobs, only admin can modify)
  app.get("/api/jobs", requirePermission('jobs', 'view'), async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", requireAuth, async (req, res) => {
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

  app.post("/api/jobs", requirePermission('jobs', 'create'), async (req, res) => {
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

  app.patch("/api/jobs/:id", requirePermission('jobs', 'edit'), async (req, res) => {
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
  app.get("/api/tasks", requirePermission('tasks', 'view'), async (req, res) => {
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

  app.get("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Permission check: Employees can only view their own assigned tasks
      if (req.session.userRole === 'employee') {
        if (task.employeeId !== req.session.userId) {
          return res.status(403).json({ 
            error: "Permission denied", 
            details: "You can only view tasks assigned to you"
          });
        }
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", requirePermission('tasks', 'create'), async (req, res) => {
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

  app.patch("/api/tasks/:id", requirePermission('tasks', 'edit'), async (req, res) => {
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
  app.get("/api/stats/jobs", requireAuth, async (req, res) => {
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
  app.get("/api/alerts/deadlines", requireAuth, async (req, res) => {
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
    const allDepartments = await storage.getDepartments();
    const employees = await storage.getEmployees();
    
    // If stageDeadlines is provided, only create tasks for departments in stageDeadlines
    // This allows users to delete unwanted departments before saving
    let departmentsToUse: any[] = [];
    
    if (stageDeadlines && Object.keys(stageDeadlines).length > 0) {
      // Filter departments to only those with deadlines set
      // Maintain department order based on their 'order' field
      departmentsToUse = allDepartments
        .filter(dept => stageDeadlines[dept.id])
        .sort((a, b) => a.order - b.order);
    } else {
      // If no stage deadlines, create tasks for all departments (backward compatibility)
      departmentsToUse = [...allDepartments].sort((a, b) => a.order - b.order);
    }
    
    for (let i = 0; i < departmentsToUse.length; i++) {
      const department = departmentsToUse[i];
      let taskDeadline: Date;
      
      if (stageDeadlines && stageDeadlines[department.id]) {
        // Use the deadline from stageDeadlines
        taskDeadline = new Date(stageDeadlines[department.id]);
      } else {
        // Fallback to default: evenly distribute departments between now and delivery
        const now = new Date();
        const deliveryDate = new Date(deadline);
        const totalDays = Math.max(1, Math.ceil((deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const daysBetweenStages = Math.max(1, Math.floor(totalDays / departmentsToUse.length));
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

  // Reports routes
  app.get("/api/reports/jobs", requireAuth, async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      const tasks = await storage.getTasks();
      const clients = await storage.getClients();
      const departments = await storage.getDepartments();

      const now = new Date();
      const clientMap = new Map(clients.map(c => [c.id, c]));
      const departmentMap = new Map(departments.map((d: any) => [d.id, d]));

      const jobsWithDetails = jobs.map(job => {
        const jobTasks = tasks.filter(t => t.jobId === job.id);
        const completedTasks = jobTasks.filter(t => t.status === "completed").length;
        const totalTasks = jobTasks.length;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const isOverdue = new Date(job.deadline) < now && !["completed", "delivered"].includes(job.status);
        const daysUntilDeadline = Math.ceil((new Date(job.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: job.id,
          jobType: job.jobType,
          description: job.description,
          client: clientMap.get(job.clientId)?.name || "Unknown",
          clientCompany: clientMap.get(job.clientId)?.company,
          quantity: job.quantity,
          status: job.status,
          deadline: job.deadline,
          createdAt: job.createdAt,
          progress,
          completedTasks,
          totalTasks,
          isOverdue,
          daysUntilDeadline,
          currentStage: jobTasks.find(t => t.status === "in-progress")
            ? departmentMap.get(jobTasks.find(t => t.status === "in-progress")!.departmentId)?.name
            : null
        };
      });

      const summary = {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(j => !["completed", "delivered"].includes(j.status)).length,
        completedJobs: jobs.filter(j => ["completed", "delivered"].includes(j.status)).length,
        overdueJobs: jobs.filter(j => new Date(j.deadline) < now && !["completed", "delivered"].includes(j.status)).length,
        byStatus: jobs.reduce((acc, job) => {
          acc[job.status] = (acc[job.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byJobType: jobs.reduce((acc, job) => {
          acc[job.jobType] = (acc[job.jobType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      res.json({ jobs: jobsWithDetails, summary });
    } catch (error) {
      console.error("Jobs report error:", error);
      res.status(500).json({ error: "Failed to generate jobs report" });
    }
  });

  app.get("/api/reports/performance", requireAuth, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      const tasks = await storage.getTasks();
      const departments = await storage.getDepartments();
      const jobs = await storage.getJobs();

      const now = new Date();
      const departmentMap = new Map(departments.map((d: any) => [d.id, d]));
      const jobMap = new Map(jobs.map(j => [j.id, j]));

      const employeePerformance = employees.map(employee => {
        const employeeTasks = tasks.filter(t => t.employeeId === employee.id);
        const completedTasks = employeeTasks.filter(t => t.status === "completed");
        const activeTasks = employeeTasks.filter(t => !["completed", "in-queue"].includes(t.status));
        const overdueTasks = employeeTasks.filter(t =>
          new Date(t.deadline) < now && t.status !== "completed"
        );

        const completedOnTime = completedTasks.filter(t => {
          const job = jobMap.get(t.jobId);
          return job && new Date(job.deadline) >= now;
        }).length;

        const onTimeRate = completedTasks.length > 0
          ? (completedOnTime / completedTasks.length) * 100
          : 0;

        return {
          employeeId: employee.id,
          name: employee.name,
          email: employee.email,
          department: employee.departmentId ? departmentMap.get(employee.departmentId)?.name : "Unassigned",
          totalTasks: employeeTasks.length,
          completedTasks: completedTasks.length,
          activeTasks: activeTasks.length,
          overdueTasks: overdueTasks.length,
          completionRate: employeeTasks.length > 0
            ? (completedTasks.length / employeeTasks.length) * 100
            : 0,
          onTimeRate
        };
      });

      const departmentPerformance = departments.map((dept: any) => {
        const deptTasks = tasks.filter(t => t.departmentId === dept.id);
        const completedTasks = deptTasks.filter(t => t.status === "completed");
        const activeTasks = deptTasks.filter(t => !["completed", "in-queue"].includes(t.status));
        const deptEmployees = employees.filter(e => e.departmentId === dept.id);

        return {
          departmentId: dept.id,
          name: dept.name,
          employeeCount: deptEmployees.length,
          totalTasks: deptTasks.length,
          completedTasks: completedTasks.length,
          activeTasks: activeTasks.length,
          completionRate: deptTasks.length > 0
            ? (completedTasks.length / deptTasks.length) * 100
            : 0
        };
      });

      res.json({
        employees: employeePerformance,
        departments: departmentPerformance
      });
    } catch (error) {
      console.error("Performance report error:", error);
      res.status(500).json({ error: "Failed to generate performance report" });
    }
  });

  app.get("/api/reports/timeline", requireAuth, async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      const tasks = await storage.getTasks();
      const clients = await storage.getClients();
      const departments = await storage.getDepartments();

      const now = new Date();
      const clientMap = new Map(clients.map(c => [c.id, c]));
      const departmentMap = new Map(departments.map((d: any) => [d.id, d]));

      const timelineData = jobs.map(job => {
        const jobTasks = tasks.filter(t => t.jobId === job.id).sort((a, b) => a.order - b.order);
        const daysUntilDeadline = Math.ceil((new Date(job.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysUntilDeadline < 0 && !["completed", "delivered"].includes(job.status);

        const taskTimeline = jobTasks.map(task => ({
          stage: departmentMap.get(task.departmentId)?.name || "Unknown",
          status: task.status,
          deadline: task.deadline,
          isOverdue: new Date(task.deadline) < now && task.status !== "completed",
          daysUntilDeadline: Math.ceil((new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }));

        const completedTasks = jobTasks.filter(t => t.status === "completed").length;
        const totalDuration = job.createdAt
          ? Math.ceil((new Date(job.deadline).getTime() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          jobId: job.id,
          jobType: job.jobType,
          description: job.description,
          client: clientMap.get(job.clientId)?.name || "Unknown",
          status: job.status,
          deadline: job.deadline,
          createdAt: job.createdAt,
          daysUntilDeadline,
          isOverdue,
          totalDuration,
          progress: jobTasks.length > 0 ? (completedTasks / jobTasks.length) * 100 : 0,
          tasks: taskTimeline
        };
      });

      const upcomingDeadlines = timelineData
        .filter(j => !["completed", "delivered"].includes(j.status) && j.daysUntilDeadline >= 0)
        .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)
        .slice(0, 10);

      const overdueJobs = timelineData
        .filter(j => j.isOverdue)
        .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline);

      res.json({
        timeline: timelineData,
        upcomingDeadlines,
        overdueJobs
      });
    } catch (error) {
      console.error("Timeline report error:", error);
      res.status(500).json({ error: "Failed to generate timeline report" });
    }
  });

  app.get("/api/reports/clients", requireAuth, async (req, res) => {
    try {
      const clients = await storage.getClients();
      const jobs = await storage.getJobs();
      const tasks = await storage.getTasks();

      const now = new Date();
      const jobMap = new Map(jobs.map(j => [j.id, j]));

      const clientStats = clients.map(client => {
        const clientJobs = jobs.filter(j => j.clientId === client.id);
        const activeJobs = clientJobs.filter(j => !["completed", "delivered"].includes(j.status));
        const completedJobs = clientJobs.filter(j => ["completed", "delivered"].includes(j.status));
        const overdueJobs = clientJobs.filter(j =>
          new Date(j.deadline) < now && !["completed", "delivered"].includes(j.status)
        );

        const totalQuantity = clientJobs.reduce((sum, job) => sum + job.quantity, 0);

        const jobTypeBreakdown = clientJobs.reduce((acc, job) => {
          acc[job.jobType] = (acc[job.jobType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const lastJobDate = clientJobs.length > 0
          ? new Date(Math.max(...clientJobs.map(j => new Date(j.createdAt || 0).getTime())))
          : null;

        return {
          clientId: client.id,
          name: client.name,
          company: client.company,
          email: client.email,
          phone: client.phone,
          paymentMethod: client.paymentMethod,
          totalJobs: clientJobs.length,
          activeJobs: activeJobs.length,
          completedJobs: completedJobs.length,
          overdueJobs: overdueJobs.length,
          totalQuantity,
          jobTypeBreakdown,
          lastJobDate
        };
      }).sort((a, b) => b.totalJobs - a.totalJobs);

      const topClients = clientStats.slice(0, 10);

      const summary = {
        totalClients: clients.length,
        activeClients: clientStats.filter(c => c.activeJobs > 0).length,
        totalJobsAllClients: jobs.length,
        avgJobsPerClient: clients.length > 0 ? jobs.length / clients.length : 0
      };

      res.json({
        clients: clientStats,
        topClients,
        summary
      });
    } catch (error) {
      console.error("Client report error:", error);
      res.status(500).json({ error: "Failed to generate client report" });
    }
  });

  // Company Settings routes
  app.get("/api/company-settings", async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings);
    } catch (error) {
      console.error('Get company settings error:', error);
      res.status(500).json({ error: "Failed to get company settings" });
    }
  });

  app.patch("/api/company-settings", requireAdmin, async (req, res) => {
    try {
      const parsed = insertCompanySettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid company settings data", details: parsed.error });
      }
      
      const updated = await storage.updateCompanySettings(parsed.data);
      res.json(updated);
    } catch (error) {
      console.error('Update company settings error:', error);
      res.status(500).json({ error: "Failed to update company settings" });
    }
  });

  app.post("/api/company-settings/logo", requireAdmin, multerUpload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Upload to object storage
      const result = await handleFileUpload(req.file, 'public');
      
      // Update company settings with new logo URL
      const updated = await storage.updateCompanySettings({ logoUrl: result.url });
      
      res.json({ url: result.url, settings: updated });
    } catch (error) {
      console.error('Upload logo error:', error);
      res.status(500).json({ error: "Failed to upload logo" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
