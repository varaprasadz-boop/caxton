import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { uploadMiddleware, handleFileUpload } from "./upload";
import { 
  insertClientSchema, 
  insertEmployeeSchema, 
  insertJobSchema, 
  insertTaskSchema,
  JOB_TYPES,
  EMPLOYEE_ROLES,
  TASK_STAGES,
  getAllWorkflowStages
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // File upload route
  app.post("/api/upload", uploadMiddleware, handleFileUpload);

  // File serving route for PO files
  app.get("/files/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      const privateDir = process.env.PRIVATE_OBJECT_DIR;
      
      if (!privateDir) {
        return res.status(500).json({ error: 'Object storage not configured' });
      }
      
      const filePath = `${privateDir}/${filename}`;
      res.sendFile(filePath, { root: '/' });
    } catch (error) {
      res.status(404).json({ error: 'File not found' });
    }
  });

  // Clients routes
  app.get("/api/clients", async (req, res) => {
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

  app.post("/api/clients", async (req, res) => {
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

  app.patch("/api/clients/:id", async (req, res) => {
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

  app.delete("/api/clients/:id", async (req, res) => {
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

  // Employees routes
  app.get("/api/employees", async (req, res) => {
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

  app.post("/api/employees", async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid employee data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  app.patch("/api/employees/:id", async (req, res) => {
    try {
      const updates = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(req.params.id, updates);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
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

  // Jobs routes
  app.get("/api/jobs", async (req, res) => {
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

  app.post("/api/jobs", async (req, res) => {
    try {
      // Handle date string conversion for API compatibility
      const requestData = { ...req.body };
      if (requestData.deadline && typeof requestData.deadline === 'string') {
        requestData.deadline = new Date(requestData.deadline);
      }
      
      const validatedData = insertJobSchema.parse(requestData);
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

  app.patch("/api/jobs/:id", async (req, res) => {
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
  app.get("/api/tasks", async (req, res) => {
    try {
      const { jobId } = req.query;
      let tasks;
      
      if (jobId && typeof jobId === 'string') {
        tasks = await storage.getTasksByJobId(jobId);
      } else {
        tasks = await storage.getTasks();
      }
      
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
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid task data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const { status, employeeId, remarks } = req.body;
      const task = await storage.updateTask(req.params.id, { status, employeeId, remarks });
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
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
          
          if (deadline <= threeDaysFromNow) {
            alerts.push({
              id: task.id,
              title: `Task: ${task.stage}`,
              type: "task",
              employee: employee?.name,
              deadline,
              status: task.status,
              stage: task.stage
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
        
        activities.push({
          id: `task-${task.id}`,
          type: "task_completed",
          title: `Task completed: ${task.stage}`,
          description: `Job: ${job?.jobType || "Unknown"} • ${client?.name || "Unknown Client"}`,
          timestamp: task.updatedAt || task.createdAt || new Date(), // Use updatedAt for completion time
          metadata: {
            taskId: task.id,
            stage: task.stage,
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
      
      // Stage distribution
      const stageStats = tasks.reduce((acc, task) => {
        acc[task.stage] = (acc[task.stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Employee workload
      const employeeWorkload = employees.map(employee => {
        const assignedTasks = tasks.filter(task => task.employeeId === employee.id);
        const activeTasks = assignedTasks.filter(task => task.status !== "completed");
        const completedTasks = assignedTasks.filter(task => task.status === "completed");
        
        return {
          employeeId: employee.id,
          name: employee.name,
          role: employee.role,
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
    const workflowStages = getAllWorkflowStages(); // Now all jobs get all stages
    const deliveryDate = new Date(deadline);
    
    for (let i = 0; i < workflowStages.length; i++) {
      const stage = workflowStages[i]; // Now a plain string
      let taskDeadline: Date;
      
      if (stageDeadlines && stageDeadlines[stage]) {
        // Use custom stage deadline if provided
        taskDeadline = new Date(stageDeadlines[stage]);
      } else {
        // Fallback to default: evenly distribute stages between now and delivery
        const now = new Date();
        const totalDays = Math.max(1, Math.ceil((deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const daysBetweenStages = Math.max(1, Math.floor(totalDays / workflowStages.length));
        taskDeadline = new Date(now.getTime() + (i + 1) * daysBetweenStages * 24 * 60 * 60 * 1000);
      }
      
      await storage.createTask({
        jobId,
        stage: stage, // Now using plain string
        deadline: taskDeadline,
        status: "pending",
        order: i + 1,
        employeeId: null,
        remarks: null
      });
    }
  }

  // Removed duplicate getWorkflowStages function - now using the one from shared/schema

  const httpServer = createServer(app);
  return httpServer;
}
