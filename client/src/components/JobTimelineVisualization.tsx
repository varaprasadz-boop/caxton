import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock, CheckCircle, User, Calendar, TrendingUp, BarChart3 } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { format, differenceInDays, differenceInHours, isAfter, isBefore } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { Task, Employee, Job, Client } from "@shared/schema";

interface JobTimelineVisualizationProps {
  jobId: string;
  onAssignTask?: (taskId: string) => void;
  onUpdateStatus?: (taskId: string, status: string) => void;
}

export default function JobTimelineVisualization({ 
  jobId, 
  onAssignTask, 
  onUpdateStatus 
}: JobTimelineVisualizationProps) {
  // Fetch real data
  const { data: job } = useQuery<Job>({
    queryKey: [`/api/jobs/${jobId}`]
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

  if (!job) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Job not found</p>
        </CardContent>
      </Card>
    );
  }

  // Create lookup maps
  const employeeMap = new Map(employees.map(e => [e.id, e]));
  const clientMap = new Map(clients.map(c => [c.id, c]));

  // Filter tasks for this job
  const jobTasks = tasks.filter(task => task.jobId === jobId);
  
  if (jobTasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Workflow Timeline - {job.description || job.jobType}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No tasks found for this job</p>
        </CardContent>
      </Card>
    );
  }

  // Sort tasks by creation order (assuming order by stage)
  const stageOrder = ["Pre-Press", "Printing", "Cutting", "Folding", "Binding", "QC", "Packaging", "Dispatch"];
  const sortedTasks = [...jobTasks].sort((a, b) => {
    const orderA = stageOrder.indexOf(a.stage);
    const orderB = stageOrder.indexOf(b.stage);
    return orderA - orderB;
  });

  // Calculate job progress
  const completedTasks = sortedTasks.filter(task => task.status === "completed").length;
  const totalTasks = sortedTasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate time metrics
  const now = new Date();
  const jobDeadline = new Date(job.deadline);
  const jobCreated = new Date(job.createdAt || now);
  const totalJobDays = differenceInDays(jobDeadline, jobCreated);
  const daysUsed = differenceInDays(now, jobCreated);
  const daysRemaining = differenceInDays(jobDeadline, now);

  // Identify bottlenecks (tasks that are overdue or taking too long)
  const bottlenecks = sortedTasks.filter(task => {
    if (task.status === "completed") return false;
    const taskDeadline = new Date(task.deadline);
    const isOverdue = isAfter(now, taskDeadline);
    const isAtRisk = differenceInDays(taskDeadline, now) <= 1 && task.status === "pending";
    return isOverdue || isAtRisk;
  });

  // Calculate stage durations and identify delays
  const getStageAnalytics = (task: Task) => {
    const taskCreated = new Date(task.createdAt || now);
    const taskDeadline = new Date(task.deadline);
    const hoursAllocated = differenceInHours(taskDeadline, taskCreated);
    
    let hoursSpent = 0;
    if (task.status === "completed" && task.updatedAt) {
      hoursSpent = differenceInHours(new Date(task.updatedAt), taskCreated);
    } else if (task.status === "in-progress") {
      hoursSpent = differenceInHours(now, taskCreated);
    }

    const efficiency = hoursAllocated > 0 ? Math.min(100, Math.round((hoursAllocated - hoursSpent) / hoursAllocated * 100)) : 100;
    const isDelayed = hoursSpent > hoursAllocated;

    return { hoursAllocated, hoursSpent, efficiency, isDelayed };
  };

  const client = clientMap.get(job.clientId);

  const handleAssignTask = (taskId: string) => {
    onAssignTask?.(taskId);
  };

  const handleStatusUpdate = (taskId: string, status: string) => {
    onUpdateStatus?.(taskId, status);
  };

  return (
    <div className="space-y-6" data-testid={`job-timeline-${jobId}`}>
      {/* Job Overview Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Workflow Timeline - {job.description || job.jobType}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Client: {client?.name || "Unknown"} • {job.quantity.toLocaleString()} units
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{progressPercentage}%</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span>{completedTasks} of {totalTasks} tasks completed</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Timeline Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="font-medium">{Math.abs(daysRemaining)}</span> days {daysRemaining >= 0 ? "remaining" : "overdue"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Due: {format(jobDeadline, "MMM dd, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="font-medium">{Math.round((daysUsed / totalJobDays) * 100)}%</span> time used
                </span>
              </div>
            </div>

            {/* Bottleneck Alerts */}
            {bottlenecks.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Workflow Bottlenecks Detected</div>
                  <div className="text-xs text-muted-foreground">
                    {bottlenecks.length} stage{bottlenecks.length > 1 ? "s" : ""} need attention: {bottlenecks.map(t => t.stage).join(", ")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Stage Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stage Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {sortedTasks.map((task, index) => {
              const isOverdue = new Date() > new Date(task.deadline) && task.status !== "completed";
              const analytics = getStageAnalytics(task);
              const assignedEmployee = task.employeeId ? employeeMap.get(task.employeeId) : null;

              return (
                <div 
                  key={task.id} 
                  className="flex items-start gap-4"
                  data-testid={`timeline-stage-${task.id}`}
                >
                  {/* Timeline connector */}
                  <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      task.status === "completed" 
                        ? "bg-completed border-completed" 
                        : task.status === "in-progress"
                        ? "bg-in-progress border-in-progress animate-pulse"
                        : "bg-background border-muted-foreground"
                    }`} />
                    {index < sortedTasks.length - 1 && (
                      <div className={`w-px h-20 mt-2 ${
                        task.status === "completed" ? "bg-completed/30" : "bg-border"
                      }`} />
                    )}
                  </div>

                  {/* Stage Content */}
                  <div className="flex-1 min-w-0 pb-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-base">{task.stage}</h4>
                        <StatusBadge 
                          status={isOverdue ? "overdue" : task.status} 
                          variant="task" 
                        />
                        {analytics.isDelayed && task.status !== "completed" && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Delayed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!task.employeeId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAssignTask(task.id)}
                            data-testid={`button-assign-${task.id}`}
                          >
                            <User className="h-3 w-3 mr-1" />
                            Assign
                          </Button>
                        )}
                        {task.status === "in-progress" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleStatusUpdate(task.id, "completed")}
                            data-testid={`button-complete-${task.id}`}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Stage Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        {assignedEmployee && (
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>{assignedEmployee.name}</span>
                            <Badge variant="outline" className="text-xs">{assignedEmployee.role}</Badge>
                          </div>
                        )}
                        <div className={`flex items-center gap-2 ${isOverdue ? "text-destructive font-medium" : ""}`}>
                          <Calendar className="h-3 w-3" />
                          <span>Due: {format(new Date(task.deadline), "MMM dd, yyyy 'at' h:mm a")}</span>
                        </div>
                        {task.remarks && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <strong>Notes:</strong> {task.remarks}
                          </div>
                        )}
                      </div>
                      
                      {/* Time Analytics */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Time Allocated:</span>
                          <span>{analytics.hoursAllocated}h</span>
                        </div>
                        {analytics.hoursSpent > 0 && (
                          <div className="flex justify-between text-xs">
                            <span>Time Spent:</span>
                            <span className={analytics.isDelayed ? "text-destructive font-medium" : ""}>
                              {analytics.hoursSpent}h
                            </span>
                          </div>
                        )}
                        {task.status !== "pending" && (
                          <div className="flex justify-between text-xs">
                            <span>Efficiency:</span>
                            <span className={`font-medium ${
                              analytics.efficiency >= 80 ? "text-completed" : 
                              analytics.efficiency >= 60 ? "text-warning" : "text-destructive"
                            }`}>
                              {analytics.efficiency >= 0 ? analytics.efficiency : 0}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}