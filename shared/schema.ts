import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, json, serial, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const session = pgTable('session', {
  sid: text('sid').primaryKey(),          // keep original column name
  sess: text('sess').notNull(),
  expire: timestamp('expire', { withTimezone: true }).notNull(),
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientNumber: serial("client_number").notNull(), // Sequential client number for display (e.g., 10001, 10002, etc.)
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

// Roles table for granular permission management
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: json("permissions").notNull(), // JSON object with module permissions
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
  role: text("role").notNull().default("employee"), // 'admin' or 'employee' - system role
  roleId: varchar("role_id"), // Reference to custom roles table for granular permissions
});

// Machines table
export const machines = pgTable("machines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  departmentId: varchar("department_id").notNull(), // Reference to departments
  description: text("description"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Product Categories table
export const productCategories = pgTable("product_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Jobs table
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobNumber: serial("job_number").notNull(), // Sequential job number for display (e.g., 0001, 0002, etc.)
  clientId: varchar("client_id").notNull(),
  productCategoryId: varchar("product_category_id"), // Reference to product categories
  jobType: text("job_type").notNull(), // Carton, Booklet, Folder, etc.
  jobName: text("job_name"), // Custom job name
  description: text("description"),
  quantity: integer("quantity").notNull(),
  size: text("size"),
  colors: text("colors"),
  finishingOptions: text("finishing_options"),
  deadline: timestamp("deadline").notNull(),
  stageDeadlines: json("stage_deadlines"), // JSON object with stage names and deadline dates
  poFileUrl: text("po_file_url"), // URL to uploaded PO file in object storage
  machineIds: text("machine_ids").array(), // Array of machine IDs selected for this job
  status: text("status").notNull().default("pending"), // pending, pre-press, printing, cutting, folding, binding, qc, packaging, dispatch, delivered, completed
  createdAt: timestamp("created_at").default(sql`now()`),
  // Job info fields
  jobSpecs: text("job_specs"),
  orderDate: timestamp("order_date"),
  scheduleDate: timestamp("schedule_date"),
  cls: text("cls"),
  paper: text("paper"),
  // Pre-press specifications (JSON object)
  prePressSpecs: json("pre_press_specs"), // { specialInstructions, fileName, outputST, outputFT, paperGsm, paperSize, sheetsCount, cutSize, machine, durationST, durationFT }
  // Printing information (JSON object)
  printingInfo: json("printing_info"), // { printingSize, colors, impression, coating, durationST, durationFT, wastage }
  // Additional process options (JSON object)
  additionalProcess: json("additional_process"), // { coating, threading, lamination, iLets, foiling, folding, spotUv, sectionCentre, punching, perfectBinding, pasting, centrePinning }
  // Cutting slip (JSON object)
  cuttingSlip: json("cutting_slip"), // { jobName, quantity, billNo, cutSize, gsm, machine }
  // Customer & delivery (JSON object)
  customerDelivery: json("customer_delivery"), // { customer, wastage, deliveryDate, clientDetails }
  // Dynamic items array
  items: json("items"), // Array of { item1, item2, remarks }
  // Party press remarks
  partyPressRemarks: text("party_press_remarks"),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskSequence: integer("task_sequence").notNull(), // Sequential task number within a job (1, 2, 3, etc.)
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
}, (table) => ({
  // Ensure task sequence is unique within a job
  uniqueJobTask: uniqueIndex("unique_job_task_idx").on(table.jobId, table.taskSequence),
}));

// Company Settings table (single row for company information)
export const companySettings = pgTable("company_settings", {
  id: varchar("id").primaryKey().default("default"), // Single row with ID 'default'
  companyName: text("company_name").notNull().default("Caxton PHP"),
  address: text("address"),
  logoUrl: text("logo_url"), // URL to uploaded logo in object storage
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Stage deadline allocation schema
export const stageDeadlinesSchema = z.record(z.string(), z.string().datetime()); // stage name -> ISO date string

// Permission structure schema
export const modulePermissionSchema = z.object({
  create: z.boolean().default(false),
  edit: z.boolean().default(false),
  view: z.boolean().default(false),
  delete: z.boolean().default(false),
});

export const permissionsSchema = z.object({
  jobs: modulePermissionSchema,
  clients: modulePermissionSchema,
  employees: modulePermissionSchema,
  departments: modulePermissionSchema,
  machines: modulePermissionSchema,
  tasks: modulePermissionSchema,
  roles: modulePermissionSchema.optional(), // Only admins can manage roles
});

// Available modules for permission management
export const PERMISSION_MODULES = ["jobs", "clients", "employees", "departments", "machines", "tasks", "roles"] as const;
export type PermissionModule = typeof PERMISSION_MODULES[number];

export type ModulePermissions = z.infer<typeof modulePermissionSchema>;
export type Permissions = z.infer<typeof permissionsSchema>;

// Insert schemas
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, clientNumber: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true }).extend({
  permissions: permissionsSchema,
});
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export const insertMachineSchema = createInsertSchema(machines).omit({ id: true, createdAt: true });
export const insertProductCategorySchema = createInsertSchema(productCategories).omit({ id: true, createdAt: true });

// JSON field schemas for job extended data
export const prePressSpecsSchema = z.object({
  specialInstructions: z.string().optional(),
  fileName: z.string().optional(),
  outputST: z.string().optional(),
  outputFT: z.string().optional(),
  paperGsm: z.string().optional(),
  paperSize: z.string().optional(),
  sheetsCount: z.string().optional(),
  cutSize: z.string().optional(),
  machine: z.string().optional(),
  durationST: z.string().optional(),
  durationFT: z.string().optional(),
}).optional();

export const printingInfoSchema = z.object({
  printingSize: z.string().optional(),
  colors: z.string().optional(),
  impression: z.string().optional(),
  coating: z.string().optional(),
  durationST: z.string().optional(),
  durationFT: z.string().optional(),
  wastage: z.string().optional(),
}).optional();

export const additionalProcessSchema = z.object({
  coating: z.string().optional(),
  threading: z.string().optional(),
  lamination: z.string().optional(),
  iLets: z.string().optional(),
  foiling: z.string().optional(),
  folding: z.string().optional(),
  spotUv: z.string().optional(),
  sectionCentre: z.string().optional(),
  punching: z.string().optional(),
  perfectBinding: z.string().optional(),
  pasting: z.string().optional(),
  centrePinning: z.string().optional(),
}).optional();

export const cuttingSlipSchema = z.object({
  jobName: z.string().optional(),
  quantity: z.string().optional(),
  billNo: z.string().optional(),
  cutSize: z.string().optional(),
  gsm: z.string().optional(),
  machine: z.string().optional(),
}).optional();

export const customerDeliverySchema = z.object({
  customer: z.string().optional(),
  wastage: z.string().optional(),
  deliveryDate: z.string().optional(),
  clientDetails: z.string().optional(),
}).optional();

export const jobItemSchema = z.object({
  item1: z.string().optional(),
  item2: z.string().optional(),
  remarks: z.string().optional(),
});

export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, jobNumber: true, createdAt: true }).extend({
  status: z.enum(["pending", "pre-press", "printing", "cutting", "folding", "binding", "qc", "packaging", "dispatch", "delivered", "completed"]).optional(),
  stageDeadlines: stageDeadlinesSchema.optional(),
  poFileUrl: z.string().min(1).optional(),
  machineIds: z.array(z.string()).optional(),
  productCategoryId: z.string().optional(),
  jobName: z.string().optional(),
  jobSpecs: z.string().optional(),
  orderDate: z.coerce.date().optional(),
  scheduleDate: z.coerce.date().optional(),
  cls: z.string().optional(),
  paper: z.string().optional(),
  prePressSpecs: prePressSpecsSchema,
  printingInfo: printingInfoSchema,
  additionalProcess: additionalProcessSchema,
  cuttingSlip: cuttingSlipSchema,
  customerDelivery: customerDeliverySchema,
  items: z.array(jobItemSchema).optional(),
  partyPressRemarks: z.string().optional(),
});
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, taskSequence: true, createdAt: true, updatedAt: true }).extend({
  status: z.enum(["pending", "in-queue", "in-progress", "completed", "delayed"]).optional(),
  delayComment: z.string().optional()
});
export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({ id: true, updatedAt: true }).partial();

// Types
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type Machine = typeof machines.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type PrePressSpecs = z.infer<typeof prePressSpecsSchema>;
export type PrintingInfo = z.infer<typeof printingInfoSchema>;
export type AdditionalProcess = z.infer<typeof additionalProcessSchema>;
export type CuttingSlip = z.infer<typeof cuttingSlipSchema>;
export type CustomerDelivery = z.infer<typeof customerDeliverySchema>;
export type JobItem = z.infer<typeof jobItemSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;

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
