import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, User, Calendar } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { format } from "date-fns";

interface Task {
  id: string;
  stage: string;
  employeeName?: string;
  deadline: Date;
  status: "pending" | "in-progress" | "completed";
  order: number;
}

interface TaskTimelineProps {
  jobId: string;
  jobTitle: string;
  tasks: Task[];
  onAssignTask?: (taskId: string) => void;
  onUpdateStatus?: (taskId: string, status: string) => void;
}

export default function TaskTimeline({ 
  jobId, 
  jobTitle, 
  tasks, 
  onAssignTask, 
  onUpdateStatus 
}: TaskTimelineProps) {
  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);

  const handleAssignTask = (taskId: string) => {
    console.log(`Assigning task ${taskId}`);
    onAssignTask?.(taskId);
  };

  const handleStatusUpdate = (taskId: string, status: string) => {
    console.log(`Updating task ${taskId} status to ${status}`);
    onUpdateStatus?.(taskId, status);
  };

  return (
    <Card data-testid={`card-timeline-${jobId}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Workflow Timeline - {jobTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedTasks.map((task, index) => {
            const isOverdue = new Date() > task.deadline && task.status !== "completed";
            
            return (
              <div 
                key={task.id} 
                className="flex items-start gap-4"
                data-testid={`task-item-${task.id}`}
              >
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full border-2 ${
                    task.status === "completed" 
                      ? "bg-completed border-completed" 
                      : task.status === "in-progress"
                      ? "bg-in-progress border-in-progress"
                      : "bg-background border-muted-foreground"
                  }`} />
                  {index < sortedTasks.length - 1 && (
                    <div className="w-px h-12 bg-border mt-2" />
                  )}
                </div>

                {/* Task content */}
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{task.stage}</h4>
                      <StatusBadge 
                        status={isOverdue ? "overdue" : task.status} 
                        variant="task" 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignTask(task.id)}
                        data-testid={`button-assign-${task.id}`}
                      >
                        <User className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                      {task.status === "in-progress" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleStatusUpdate(task.id, "completed")}
                          data-testid={`button-complete-${task.id}`}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {task.employeeName && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {task.employeeName}
                      </div>
                    )}
                    <div className={`flex items-center gap-1 ${isOverdue ? "text-overdue font-medium" : ""}`}>
                      <Calendar className="h-3 w-3" />
                      Due: {format(task.deadline, "MMM dd, yyyy")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}