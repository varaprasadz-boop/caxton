import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, CheckCircle, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, Employee } from "@shared/schema";

interface TaskCardProps extends Task {
  employees: Employee[];
  jobTitle?: string;
  assignedEmployeeName?: string;
  onAssign?: (taskId: string, employeeId: string) => void;
  onUpdateStatus?: (taskId: string, status: string) => void;
}

const statusIcons = {
  pending: AlertCircle,
  "in-progress": Clock,
  completed: CheckCircle
};

const statusColors = {
  pending: "default",
  "in-progress": "secondary", 
  completed: "default"
} as const;

export default function TaskCard({
  id,
  jobId,
  stage,
  status,
  employeeId,
  deadline,
  remarks,
  employees,
  jobTitle,
  assignedEmployeeName,
  onAssign,
  onUpdateStatus
}: TaskCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const assignTaskMutation = useMutation({
    mutationFn: async ({ employeeId }: { employeeId: string | null }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, { employeeId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task assigned",
        description: "Task has been assigned successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign task.",
        variant: "destructive",
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/jobs"] });
      toast({
        title: "Status updated",
        description: "Task status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to update task status.",
        variant: "destructive",
      });
    }
  });

  const handleAssignEmployee = (selectedEmployeeId: string) => {
    // Handle "unassigned" value - set employeeId to null in the database
    const employeeIdValue = selectedEmployeeId === "unassigned" ? null : selectedEmployeeId;
    assignTaskMutation.mutate({ employeeId: employeeIdValue });
    onAssign?.(id, selectedEmployeeId);
  };

  const handleStatusUpdate = (newStatus: string) => {
    updateStatusMutation.mutate({ status: newStatus });
    onUpdateStatus?.(id, newStatus);
  };

  const StatusIcon = statusIcons[status as keyof typeof statusIcons] || AlertCircle;
  const isOverdue = new Date(deadline) < new Date() && status !== "completed";

  return (
    <Card className="transition-colors hover-elevate" data-testid={`card-task-${id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${status === "completed" ? "text-green-600" : isOverdue ? "text-destructive" : "text-primary"}`} />
            <CardTitle className="text-base">{stage}</CardTitle>
            <Badge variant={statusColors[status as keyof typeof statusColors] || "default"}>{status.replace("-", " ")}</Badge>
          </div>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              Overdue
            </Badge>
          )}
        </div>
        {jobTitle && (
          <CardDescription className="text-sm">
            Job: {jobTitle}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Assignment */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3" />
            <span className="text-sm">Assigned to:</span>
          </div>
          <Select
            value={employeeId || "unassigned"}
            onValueChange={handleAssignEmployee}
            disabled={assignTaskMutation.isPending}
          >
            <SelectTrigger className="w-40" data-testid={`select-employee-${id}`}>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name} - {employee.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Update */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span className="text-sm">Status:</span>
          </div>
          <Select
            value={status}
            onValueChange={handleStatusUpdate}
            disabled={updateStatusMutation.isPending}
          >
            <SelectTrigger className="w-40" data-testid={`select-status-${id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Deadline */}
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          <span className="text-sm">
            Due: {new Date(deadline).toLocaleDateString()}
            {isOverdue && status !== "completed" && (
              <span className="text-destructive text-xs ml-2">(Overdue)</span>
            )}
          </span>
        </div>

        {/* Remarks */}
        {remarks && (
          <div className="text-sm text-muted-foreground">
            <strong>Remarks:</strong> {remarks}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {status === "pending" && employeeId && (
            <Button
              size="sm"
              onClick={() => handleStatusUpdate("in-progress")}
              disabled={updateStatusMutation.isPending}
              data-testid={`button-start-task-${id}`}
            >
              Start Task
            </Button>
          )}
          {status === "in-progress" && (
            <Button
              size="sm"
              onClick={() => handleStatusUpdate("completed")}
              disabled={updateStatusMutation.isPending}
              data-testid={`button-complete-task-${id}`}
            >
              Mark Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}