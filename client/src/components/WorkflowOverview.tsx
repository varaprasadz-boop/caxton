import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, Clock, Users, BarChart3, Filter, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Task, Employee, Job, Client } from "@shared/schema";
import { format, differenceInDays, differenceInHours, isAfter } from "date-fns";

export default function WorkflowOverview() {
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  // Fetch all data
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"]
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"]
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"]
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"]
  });

  // Create lookup maps
  const employeeMap = new Map(employees.map(e => [e.id, e]));
  const jobMap = new Map(jobs.map(j => [j.id, j]));
  const clientMap = new Map(clients.map(c => [c.id, c]));

  const now = new Date();

  // Calculate overall workflow metrics
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(job => job.status !== "completed" && job.status !== "delivered").length;
  const completedTasks = tasks.filter(task => task.status === "completed").length;
  const totalTasks = tasks.length;
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Identify bottlenecks by stage
  const stageBottlenecks = new Map<string, {
    stage: string;
    tasksAtRisk: number;
    averageDelay: number;
    affectedJobs: string[];
  }>();

  tasks.forEach(task => {
    const taskDeadline = new Date(task.deadline);
    const isOverdue = isAfter(now, taskDeadline) && task.status !== "completed";
    const isAtRisk = differenceInDays(taskDeadline, now) <= 1 && task.status === "pending";
    
    if (isOverdue || isAtRisk) {
      const existing = stageBottlenecks.get(task.stage) || {
        stage: task.stage,
        tasksAtRisk: 0,
        averageDelay: 0,
        affectedJobs: []
      };
      
      existing.tasksAtRisk += 1;
      const job = jobMap.get(task.jobId);
      if (job && !existing.affectedJobs.includes(job.id)) {
        existing.affectedJobs.push(job.id);
      }
      
      stageBottlenecks.set(task.stage, existing);
    }
  });

  // Employee workload analysis
  const employeeWorkload = new Map<string, {
    employee: Employee;
    activeTasks: number;
    completedTasks: number;
    overdueTasks: number;
    efficiency: number;
  }>();

  employees.forEach(employee => {
    const employeeTasks = tasks.filter(task => task.employeeId === employee.id);
    const activeTasks = employeeTasks.filter(task => task.status === "in-progress").length;
    const completedTasks = employeeTasks.filter(task => task.status === "completed").length;
    const overdueTasks = employeeTasks.filter(task => {
      const deadline = new Date(task.deadline);
      return isAfter(now, deadline) && task.status !== "completed";
    }).length;
    
    const totalAssigned = employeeTasks.length;
    const efficiency = totalAssigned > 0 ? Math.round((completedTasks / totalAssigned) * 100) : 0;

    employeeWorkload.set(employee.id, {
      employee,
      activeTasks,
      completedTasks,
      overdueTasks,
      efficiency
    });
  });

  // Filter tasks for detailed view
  const filteredTasks = tasks
    .filter(task => {
      const matchesStage = stageFilter === "all" || task.stage === stageFilter;
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const job = jobMap.get(task.jobId);
      const client = job ? clientMap.get(job.clientId) : null;
      const employee = task.employeeId ? employeeMap.get(task.employeeId) : null;
      
      const matchesSearch = !searchTerm || 
        task.stage.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job?.jobType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStage && matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      // Sort by priority: overdue first, then in-progress, then pending
      const getPriority = (task: Task) => {
        const deadline = new Date(task.deadline);
        const isOverdue = isAfter(now, deadline) && task.status !== "completed";
        if (isOverdue) return 0;
        if (task.status === "in-progress") return 1;
        return 2;
      };
      return getPriority(a) - getPriority(b);
    });

  const handleViewJob = (jobId: string) => {
    setLocation(`/jobs/${jobId}`);
  };

  return (
    <div className="space-y-6 p-6" data-testid="workflow-overview">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workflow Overview</h1>
        <p className="text-muted-foreground">
          Monitor workflow progress, identify bottlenecks, and manage resource allocation
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobs}</div>
            <div className="text-xs text-muted-foreground">of {totalJobs} total</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallProgress}%</div>
            <Progress value={overallProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bottlenecks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stageBottlenecks.size}</div>
            <div className="text-xs text-muted-foreground">stages at risk</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resource Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <div className="text-xs text-muted-foreground">active employees</div>
          </CardContent>
        </Card>
      </div>

      {/* Bottleneck Analysis */}
      {stageBottlenecks.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Workflow Bottlenecks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(stageBottlenecks.values()).map(bottleneck => (
                <div key={bottleneck.stage} className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-lg">
                  <div>
                    <div className="font-medium">{bottleneck.stage}</div>
                    <div className="text-sm text-muted-foreground">
                      {bottleneck.tasksAtRisk} task{bottleneck.tasksAtRisk > 1 ? "s" : ""} at risk across {bottleneck.affectedJobs.length} job{bottleneck.affectedJobs.length > 1 ? "s" : ""}
                    </div>
                  </div>
                  <Badge variant="outline" className="border-warning text-warning">
                    High Priority
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Workload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Workload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(employeeWorkload.values()).map(workload => (
              <div key={workload.employee.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{workload.employee.name}</div>
                  <Badge variant="outline" className="text-xs">{workload.employee.role}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-in-progress">{workload.activeTasks}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-completed">{workload.completedTasks}</div>
                    <div className="text-xs text-muted-foreground">Done</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-destructive">{workload.overdueTasks}</div>
                    <div className="text-xs text-muted-foreground">Overdue</div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-xs">
                    <span>Efficiency</span>
                    <span className={`font-medium ${
                      workload.efficiency >= 80 ? "text-completed" : 
                      workload.efficiency >= 60 ? "text-warning" : "text-destructive"
                    }`}>{workload.efficiency}%</span>
                  </div>
                  <Progress value={workload.efficiency} className="h-1 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Task Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks, jobs, or employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-tasks"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="Pre-Press">Pre-Press</SelectItem>
                <SelectItem value="Printing">Printing</SelectItem>
                <SelectItem value="Cutting">Cutting</SelectItem>
                <SelectItem value="Folding">Folding</SelectItem>
                <SelectItem value="Binding">Binding</SelectItem>
                <SelectItem value="QC">QC</SelectItem>
                <SelectItem value="Packaging">Packaging</SelectItem>
                <SelectItem value="Dispatch">Dispatch</SelectItem>
              </SelectContent>
            </Select>
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
          </div>

          {/* Task List */}
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tasks found matching your criteria
              </div>
            ) : (
              filteredTasks.map(task => {
                const job = jobMap.get(task.jobId);
                const client = job ? clientMap.get(job.clientId) : null;
                const employee = task.employeeId ? employeeMap.get(task.employeeId) : null;
                const deadline = new Date(task.deadline);
                const isOverdue = isAfter(now, deadline) && task.status !== "completed";
                const isAtRisk = differenceInDays(deadline, now) <= 1 && task.status !== "completed";

                return (
                  <div
                    key={task.id}
                    className={`p-4 border rounded-lg hover-elevate ${
                      isOverdue ? "border-destructive/50 bg-destructive/5" : 
                      isAtRisk ? "border-warning/50 bg-warning/5" : ""
                    }`}
                    data-testid={`task-overview-${task.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={task.status === "completed" ? "default" : 
                                  task.status === "in-progress" ? "secondary" : "outline"}
                          className="capitalize"
                        >
                          {task.status}
                        </Badge>
                        <span className="font-medium">{task.stage}</span>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                        {isAtRisk && !isOverdue && (
                          <Badge variant="outline" className="border-warning text-warning text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            At Risk
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => job && handleViewJob(job.id)}
                        data-testid={`button-view-job-${task.jobId}`}
                      >
                        View Job
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Job</div>
                        <div className="font-medium">{job?.jobType || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{client?.name || "Unknown Client"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Assigned To</div>
                        <div className="font-medium">{employee?.name || "Unassigned"}</div>
                        <div className="text-xs text-muted-foreground">{employee?.role || ""}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Deadline</div>
                        <div className={`font-medium ${isOverdue ? "text-destructive" : isAtRisk ? "text-warning" : ""}`}>
                          {format(deadline, "MMM dd, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(deadline, "h:mm a")}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}