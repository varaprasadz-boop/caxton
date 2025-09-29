import { useState } from "react";
import TaskCard from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Task, Employee, Job, Client } from "@shared/schema";

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");

  // Fetch data
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"]
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"]
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"]
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"]
  });

  // Create lookup maps
  const employeeMap = new Map(employees.map(e => [e.id, e]));
  const jobMap = new Map(jobs.map(j => [j.id, j]));
  const clientMap = new Map(clients.map(c => [c.id, c]));

  // Enhance tasks with additional info
  const enhancedTasks = tasks.map(task => {
    const job = jobMap.get(task.jobId);
    const client = job ? clientMap.get(job.clientId) : null;
    const assignedEmployee = task.employeeId ? employeeMap.get(task.employeeId) : null;

    return {
      ...task,
      jobTitle: job ? `${job.jobType} - ${client?.name || 'Unknown Client'}` : 'Unknown Job',
      assignedEmployeeName: assignedEmployee?.name
    };
  });

  // Filter tasks
  const filteredTasks = enhancedTasks.filter(task => {
    const matchesSearch = task.stage.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assignedEmployeeName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesStage = stageFilter === "all" || task.stage === stageFilter;
    const matchesEmployee = employeeFilter === "all" || task.employeeId === employeeFilter;

    return matchesSearch && matchesStatus && matchesStage && matchesEmployee;
  });

  // Separate tasks by status
  const pendingTasks = filteredTasks.filter(task => task.status === "pending");
  const inProgressTasks = filteredTasks.filter(task => task.status === "in-progress");
  const completedTasks = filteredTasks.filter(task => task.status === "completed");

  // Get overdue tasks
  const overdueTasks = filteredTasks.filter(task => 
    new Date(task.deadline) < new Date() && task.status !== "completed"
  );

  // Get unique stages for filter
  const uniqueStages = Array.from(new Set(tasks.map(task => task.stage)));

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const renderTaskList = (taskList: typeof enhancedTasks, emptyMessage: string) => (
    <div className="space-y-4">
      {taskList.length > 0 ? (
        taskList.map(task => (
          <TaskCard
            key={task.id}
            {...task}
            employees={employees}
          />
        ))
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-tasks">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage workflow tasks and assignments
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <Search className="h-4 w-4" />
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-sm"
            data-testid="input-search-tasks"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {uniqueStages.map(stage => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map(employee => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            All Tasks ({filteredTasks.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            In Progress ({inProgressTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="text-destructive">
            Overdue ({overdueTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderTaskList(filteredTasks, "No tasks found")}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {renderTaskList(pendingTasks, "No pending tasks")}
        </TabsContent>

        <TabsContent value="in-progress" className="mt-6">
          {renderTaskList(inProgressTasks, "No tasks in progress")}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {renderTaskList(completedTasks, "No completed tasks")}
        </TabsContent>

        <TabsContent value="overdue" className="mt-6">
          {renderTaskList(overdueTasks, "No overdue tasks")}
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {tasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No tasks yet</p>
          <p className="text-sm text-muted-foreground">
            Create a job to generate workflow tasks automatically
          </p>
        </div>
      )}
    </div>
  );
}