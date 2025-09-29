import { 
  type Client, 
  type InsertClient, 
  type Employee, 
  type InsertEmployee,
  type Job,
  type InsertJob,
  type Task,
  type InsertTask
} from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // Clients
  getClient(id: string): Promise<Client | undefined>;
  getClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  
  // Employees
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployees(): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  
  // Jobs
  getJob(id: string): Promise<Job | undefined>;
  getJobs(): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  
  // Tasks
  getTask(id: string): Promise<Task | undefined>;
  getTasks(): Promise<Task[]>;
  getTasksByJobId(jobId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Pick<Task, 'status' | 'employeeId' | 'remarks'>>): Promise<Task | undefined>;
}

export class MemStorage implements IStorage {
  private clients: Map<string, Client>;
  private employees: Map<string, Employee>;
  private jobs: Map<string, Job>;
  private tasks: Map<string, Task>;

  constructor() {
    this.clients = new Map();
    this.employees = new Map();
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
      address: insertClient.address || null 
    };
    this.clients.set(id, client);
    return client;
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
      phone: insertEmployee.phone || null 
    };
    this.employees.set(id, employee);
    return employee;
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
      finishingOptions: insertJob.finishingOptions || null
    };
    this.jobs.set(id, job);
    return job;
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
      updatedAt: createdAt, // Set initial updatedAt to createdAt
      employeeId: insertTask.employeeId || null,
      status: insertTask.status || "pending",
      remarks: insertTask.remarks || null
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

export const storage = new MemStorage();
