import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
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

// Employees table
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(), // Designer, Printer, Binder, QC, Packaging, Logistics
  email: text("email").notNull(),
  phone: text("phone"),
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
  status: text("status").notNull().default("pending"), // pending, pre-press, printing, cutting, folding, binding, qc, packaging, dispatch, delivered, completed
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  employeeId: varchar("employee_id"),
  stage: text("stage").notNull(), // Pre-Press, Printing, Cutting, Folding, Binding, QC, Packaging, Dispatch
  deadline: timestamp("deadline").notNull(),
  status: text("status").notNull().default("pending"), // pending, in-progress, completed
  remarks: text("remarks"),
  order: integer("order").notNull(), // Task order in workflow
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Insert schemas
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true }).extend({
  status: z.enum(["pending", "pre-press", "printing", "cutting", "folding", "binding", "qc", "packaging", "dispatch", "delivered", "completed"]).optional()
});
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  status: z.enum(["pending", "in-progress", "completed"]).optional()
});

// Types
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
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

// Status enums
export const JOB_STATUSES = ["pending", "pre-press", "printing", "cutting", "folding", "binding", "qc", "packaging", "dispatch", "delivered", "completed"] as const;
export type JobStatus = typeof JOB_STATUSES[number];

export const TASK_STATUSES = ["pending", "in-progress", "completed"] as const;
export type TaskStatus = typeof TASK_STATUSES[number];
