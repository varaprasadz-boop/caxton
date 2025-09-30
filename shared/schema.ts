import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  gstNo: text("gst_no"),
  paymentMethod: text("payment_method").notNull().default("Cash"), // Cash, Online
});

// Departments table
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  order: integer("order").notNull(), // Display order in workflow
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Employees table
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  departmentId: varchar("department_id"), // Reference to departments
  email: text("email").notNull().unique(), // Email is username, must be unique
  phone: text("phone"),
  passwordHash: text("password_hash"), // Hashed password for login
});

// Jobs table
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  jobType: text("job_type").notNull(), // Carton, Booklet, Folder, etc.
  description: text("description"),
  quantity: integer("quantity").notNull(),
  size: text("size"),
  colors: text("colors"),
  finishingOptions: text("finishing_options"),
  deadline: timestamp("deadline").notNull(),
  stageDeadlines: json("stage_deadlines"), // JSON object with stage names and deadline dates
  poFileUrl: text("po_file_url"), // URL to uploaded PO file in object storage
  status: text("status").notNull().default("pending"), // pending, pre-press, printing, cutting, folding, binding, qc, packaging, dispatch, delivered, completed
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  employeeId: varchar("employee_id"),
  departmentId: varchar("department_id").notNull(), // Reference to departments (replaces stage)
  deadline: timestamp("deadline").notNull(),
  status: text("status").notNull().default("pending"), // pending, in-queue, in-progress, completed, delayed
  delayComment: text("delay_comment"), // Comment when task is marked as delayed
  remarks: text("remarks"),
  order: integer("order").notNull(), // Task order in workflow
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Stage deadline allocation schema
export const stageDeadlinesSchema = z.record(z.string(), z.string().datetime()); // stage name -> ISO date string

// Insert schemas
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true }).extend({
  status: z.enum(["pending", "pre-press", "printing", "cutting", "folding", "binding", "qc", "packaging", "dispatch", "delivered", "completed"]).optional(),
  stageDeadlines: stageDeadlinesSchema.optional(),
  poFileUrl: z.string().min(1).optional() // Allow relative URLs for local file storage
});
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  status: z.enum(["pending", "in-queue", "in-progress", "completed", "delayed"]).optional(),
  delayComment: z.string().optional()
});

// Types
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Job types enum
export const JOB_TYPES = ["Carton", "Booklet", "Pouch Folder", "Flyers", "Business Cards", "Brochures"] as const;
export type JobType = typeof JOB_TYPES[number];

// Employee roles enum
export const EMPLOYEE_ROLES = ["Designer", "Printer", "Binder", "QC", "Packaging", "Logistics"] as const;
export type EmployeeRole = typeof EMPLOYEE_ROLES[number];

// Task stages enum
export const TASK_STAGES = ["Pre-Press", "Printing", "Cutting", "Folding", "Binding", "QC", "Packaging", "Dispatch"] as const;
export type TaskStage = typeof TASK_STAGES[number];

// Stage deadline allocation type
export type StageDeadlines = {
  [stageName: string]: string; // Stage name -> ISO date string
};

// Status enums
export const JOB_STATUSES = ["pending", "pre-press", "printing", "cutting", "folding", "binding", "qc", "packaging", "dispatch", "delivered", "completed"] as const;
export type JobStatus = typeof JOB_STATUSES[number];

export const TASK_STATUSES = ["pending", "in-queue", "in-progress", "completed", "delayed"] as const;
export type TaskStatus = typeof TASK_STATUSES[number];

// Helper function to get workflow stages for a job type
export function getWorkflowStages(jobType: string): TaskStage[] {
  const baseStages: TaskStage[] = ["Pre-Press", "Printing", "QC", "Packaging", "Dispatch"];
  
  // Add job-specific stages
  if (["Booklet", "Brochures"].includes(jobType)) {
    return ["Pre-Press", "Printing", "Cutting", "Folding", "Binding", "QC", "Packaging", "Dispatch"];
  } else if (["Carton", "Pouch Folder"].includes(jobType)) {
    return ["Pre-Press", "Printing", "Cutting", "Folding", "QC", "Packaging", "Dispatch"];
  } else {
    return ["Pre-Press", "Printing", "Cutting", "QC", "Packaging", "Dispatch"];
  }
}

// Updated function to get all workflow stages (for the new requirement that all job types have all stages)
export function getAllWorkflowStages(): TaskStage[] {
  return ["Pre-Press", "Printing", "Cutting", "Folding", "Binding", "QC", "Packaging", "Dispatch"];
}

// Helper function to get default stage deadlines (evenly spaced between now and delivery deadline)
export function getDefaultStageDeadlines(jobType: string, deliveryDeadline: Date): StageDeadlines {
  const stages = getAllWorkflowStages(); // Now all jobs get all stages
  const defaultDeadlines: StageDeadlines = {};
  
  const now = new Date();
  const totalDays = Math.max(1, Math.ceil((deliveryDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const daysBetweenStages = Math.max(1, Math.floor(totalDays / stages.length));
  
  stages.forEach((stage, index) => {
    const stageDeadline = new Date(now);
    stageDeadline.setDate(now.getDate() + (index + 1) * daysBetweenStages);
    defaultDeadlines[stage] = stageDeadline.toISOString();
  });
  
  return defaultDeadlines;
}
