import { 
  type Client, 
  type InsertClient,
  type Department,
  type InsertDepartment,
  type Role,
  type InsertRole,
  type Employee, 
  type InsertEmployee,
  type Machine,
  type InsertMachine,
  type Job,
  type InsertJob,
  type Task,
  type InsertTask,
  clients,
  departments,
  roles,
  employees,
  machines,
  jobs,
  tasks
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // Clients
  getClient(id: string): Promise<Client | undefined>;
  getClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  
  // Departments
  getDepartment(id: string): Promise<Department | undefined>;
  getDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, updates: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: string): Promise<boolean>;
  
  // Roles
  getRole(id: string): Promise<Role | undefined>;
  getRoles(): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, updates: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: string): Promise<boolean>;
  
  // Employees
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployees(): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, updates: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;
  
  // Machines
  getMachine(id: string): Promise<Machine | undefined>;
  getMachines(): Promise<Machine[]>;
  createMachine(machine: InsertMachine): Promise<Machine>;
  updateMachine(id: string, updates: Partial<InsertMachine>): Promise<Machine | undefined>;
  deleteMachine(id: string): Promise<boolean>;
  
  // Jobs
  getJob(id: string): Promise<Job | undefined>;
  getJobs(): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined>;
  
  // Tasks
  getTask(id: string): Promise<Task | undefined>;
  getTasks(): Promise<Task[]>;
  getTasksByJobId(jobId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Pick<Task, 'status' | 'employeeId' | 'remarks'>>): Promise<Task | undefined>;
}

export class MemStorage implements IStorage {
  private clients: Map<string, Client>;
  private departments: Map<string, Department>;
  private employees: Map<string, Employee>;
  private machines: Map<string, Machine>;
  private jobs: Map<string, Job>;
  private tasks: Map<string, Task>;

  constructor() {
    this.clients = new Map();
    this.departments = new Map();
    this.employees = new Map();
    this.machines = new Map();
    this.jobs = new Map();
    this.tasks = new Map();
  }

  // Clients
  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client: Client = { 
      ...insertClient, 
      id,
      address: insertClient.address || null,
      gstNo: insertClient.gstNo || null,
      paymentMethod: insertClient.paymentMethod || "Cash"
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    
    const updatedClient: Client = { 
      ...client, 
      ...updates,
      address: updates.address !== undefined ? updates.address : client.address
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: string): Promise<boolean> {
    return this.clients.delete(id);
  }

  // Departments
  async getDepartment(id: string): Promise<Department | undefined> {
    return this.departments.get(id);
  }

  async getDepartments(): Promise<Department[]> {
    return Array.from(this.departments.values()).sort((a, b) => a.order - b.order);
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const id = randomUUID();
    const createdAt = new Date();
    const department: Department = { 
      ...insertDepartment,
      id,
      description: insertDepartment.description || null,
      createdAt
    };
    this.departments.set(id, department);
    return department;
  }

  async updateDepartment(id: string, updates: Partial<InsertDepartment>): Promise<Department | undefined> {
    const department = this.departments.get(id);
    if (!department) return undefined;
    
    const updatedDepartment: Department = { 
      ...department, 
      ...updates 
    };
    this.departments.set(id, updatedDepartment);
    return updatedDepartment;
  }

  async deleteDepartment(id: string): Promise<boolean> {
    return this.departments.delete(id);
  }

  // Employees
  async getEmployee(id: string): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async getEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const id = randomUUID();
    const employee: Employee = { 
      ...insertEmployee, 
      id,
      phone: insertEmployee.phone || null,
      departmentId: insertEmployee.departmentId || null,
      passwordHash: insertEmployee.passwordHash || null
    };
    this.employees.set(id, employee);
    return employee;
  }

  async updateEmployee(id: string, updates: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const employee = this.employees.get(id);
    if (!employee) return undefined;
    
    const updatedEmployee: Employee = { 
      ...employee, 
      ...updates,
      phone: updates.phone !== undefined ? updates.phone : employee.phone
    };
    this.employees.set(id, updatedEmployee);
    return updatedEmployee;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    return this.employees.delete(id);
  }

  // Machines
  async getMachine(id: string): Promise<Machine | undefined> {
    return this.machines.get(id);
  }

  async getMachines(): Promise<Machine[]> {
    return Array.from(this.machines.values());
  }

  async createMachine(insertMachine: InsertMachine): Promise<Machine> {
    const id = randomUUID();
    const createdAt = new Date();
    const machine: Machine = { 
      ...insertMachine, 
      id,
      createdAt,
      description: insertMachine.description || null
    };
    this.machines.set(id, machine);
    return machine;
  }

  async updateMachine(id: string, updates: Partial<InsertMachine>): Promise<Machine | undefined> {
    const machine = this.machines.get(id);
    if (!machine) return undefined;
    
    const updatedMachine: Machine = { 
      ...machine, 
      ...updates,
      description: updates.description !== undefined ? updates.description : machine.description
    };
    this.machines.set(id, updatedMachine);
    return updatedMachine;
  }

  async deleteMachine(id: string): Promise<boolean> {
    return this.machines.delete(id);
  }

  // Jobs
  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values());
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = randomUUID();
    const createdAt = new Date();
    const job: Job = { 
      ...insertJob, 
      id, 
      createdAt,
      status: insertJob.status || "pending",
      description: insertJob.description || null,
      size: insertJob.size || null,
      colors: insertJob.colors || null,
      finishingOptions: insertJob.finishingOptions || null,
      stageDeadlines: insertJob.stageDeadlines || null,
      poFileUrl: insertJob.poFileUrl || null
    };
    this.jobs.set(id, job);
    return job;
  }

  async updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    
    const updatedJob: Job = { 
      ...job, 
      ...updates,
      description: updates.description !== undefined ? updates.description : job.description,
      size: updates.size !== undefined ? updates.size : job.size,
      colors: updates.colors !== undefined ? updates.colors : job.colors,
      finishingOptions: updates.finishingOptions !== undefined ? updates.finishingOptions : job.finishingOptions
    };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  // Tasks
  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTasksByJobId(jobId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.jobId === jobId);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const createdAt = new Date();
    const task: Task = { 
      ...insertTask, 
      id, 
      createdAt,
      updatedAt: createdAt,
      employeeId: insertTask.employeeId || null,
      status: insertTask.status || "pending",
      remarks: insertTask.remarks || null,
      delayComment: insertTask.delayComment || null
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: string, updates: Partial<Pick<Task, 'status' | 'employeeId' | 'remarks'>>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updatedTask: Task = { 
      ...task, 
      ...updates, 
      updatedAt: new Date() // Always update timestamp when task is modified
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
}

// PostgreSQL Storage Implementation
export class PostgreSQLStorage implements IStorage {
  // Clients
  async getClient(id: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id));
    return result[0] || undefined;
  }

  async getClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(insertClient).returning();
    return result[0];
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db.update(clients).set(updates).where(eq(clients.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Departments
  async getDepartment(id: string): Promise<Department | undefined> {
    const result = await db.select().from(departments).where(eq(departments.id, id));
    return result[0] || undefined;
  }

  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(departments.order);
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const result = await db.insert(departments).values(insertDepartment).returning();
    return result[0];
  }

  async updateDepartment(id: string, updates: Partial<InsertDepartment>): Promise<Department | undefined> {
    const result = await db.update(departments).set(updates).where(eq(departments.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteDepartment(id: string): Promise<boolean> {
    const result = await db.delete(departments).where(eq(departments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Roles
  async getRole(id: string): Promise<Role | undefined> {
    const result = await db.select().from(roles).where(eq(roles.id, id));
    return result[0] || undefined;
  }

  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles);
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const result = await db.insert(roles).values(insertRole).returning();
    return result[0];
  }

  async updateRole(id: string, updates: Partial<InsertRole>): Promise<Role | undefined> {
    const result = await db.update(roles).set(updates).where(eq(roles.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteRole(id: string): Promise<boolean> {
    const result = await db.delete(roles).where(eq(roles.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Employees
  async getEmployee(id: string): Promise<Employee | undefined> {
    const result = await db.select().from(employees).where(eq(employees.id, id));
    return result[0] || undefined;
  }

  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees);
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const result = await db.insert(employees).values(insertEmployee).returning();
    return result[0];
  }

  async updateEmployee(id: string, updates: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const result = await db.update(employees).set(updates).where(eq(employees.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const result = await db.delete(employees).where(eq(employees.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Machines
  async getMachine(id: string): Promise<Machine | undefined> {
    const result = await db.select().from(machines).where(eq(machines.id, id));
    return result[0] || undefined;
  }

  async getMachines(): Promise<Machine[]> {
    return await db.select().from(machines);
  }

  async createMachine(insertMachine: InsertMachine): Promise<Machine> {
    const result = await db.insert(machines).values(insertMachine).returning();
    return result[0];
  }

  async updateMachine(id: string, updates: Partial<InsertMachine>): Promise<Machine | undefined> {
    const result = await db.update(machines).set(updates).where(eq(machines.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteMachine(id: string): Promise<boolean> {
    const result = await db.delete(machines).where(eq(machines.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Jobs
  async getJob(id: string): Promise<Job | undefined> {
    const result = await db.select().from(jobs).where(eq(jobs.id, id));
    return result[0] || undefined;
  }

  async getJobs(): Promise<Job[]> {
    return await db.select().from(jobs);
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const result = await db.insert(jobs).values(insertJob).returning();
    return result[0];
  }

  async updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const result = await db.update(jobs).set(updates).where(eq(jobs.id, id)).returning();
    return result[0] || undefined;
  }

  // Tasks
  async getTask(id: string): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0] || undefined;
  }

  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTasksByJobId(jobId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.jobId, jobId));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async updateTask(id: string, updates: Partial<Pick<Task, 'status' | 'employeeId' | 'remarks'>>): Promise<Task | undefined> {
    const result = await db.update(tasks).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(tasks.id, id)).returning();
    return result[0] || undefined;
  }
}

// Use PostgreSQL storage in production/development, MemStorage for testing
export const storage = process.env.NODE_ENV === 'test' ? new MemStorage() : new PostgreSQLStorage();
