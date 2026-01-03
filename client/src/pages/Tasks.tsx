import { useState } from "react";
import TaskTimeline from "@/components/TaskTimeline";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Kanban, List } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [view, setView] = useState<"list" | "kanban">("list");

  // TODO: Remove mock data when implementing real functionality
  const mockJobsWithTasks = [
    {
      jobId: "1",
      jobTitle: "Business Card Print Run",
      client: "TechCorp Solutions",
      tasks: [
        {
          id: "1",
          stage: "Pre-Press",
          employeeName: "Sarah Design",
          deadline: new Date("2024-01-10"),
          status: "completed" as const,
          order: 1
        },
        {
          id: "2", 
          stage: "Printing",
          employeeName: "Mike Printer",
          deadline: new Date("2024-01-12"),
          status: "in-progress" as const,
          order: 2
        },
        {
          id: "3",
          stage: "Cutting",
          deadline: new Date("2024-01-13"),
          status: "pending" as const,
          order: 3
        }
      ]
    },
    {
      jobId: "2",
      jobTitle: "Marketing Brochure",
      client: "Green Earth Co",
      tasks: [
        {
          id: "4",
          stage: "Pre-Press",
          employeeName: "Sarah Design", 
          deadline: new Date("2023-12-18"),
          status: "completed" as const,
          order: 1
        },
        {
          id: "5",
          stage: "Printing",
          employeeName: "Mike Printer",
          deadline: new Date("2023-12-20"),
          status: "in-progress" as const,
          order: 2
        },
        {
          id: "6",
          stage: "QC",
          employeeName: "Anna QC",
          deadline: new Date("2023-12-19"),
          status: "pending" as const,
          order: 3
        }
      ]
    }
  ];

  const allTasks = mockJobsWithTasks.flatMap(job => 
    job.tasks.map(task => ({
      ...task,
      jobTitle: job.jobTitle,
      client: job.client
    }))
  );

  const tasksByStage = allTasks.reduce((acc, task) => {
    if (!acc[task.stage]) acc[task.stage] = [];
    acc[task.stage].push(task);
    return acc;
  }, {} as Record<string, typeof allTasks>);

  const handleAssignTask = (taskId: string) => {
    console.log('Assigning task:', taskId);
  };

  const handleUpdateStatus = (taskId: string, status: string) => {
    console.log('Updating task status:', taskId, status);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    console.log('Searching tasks:', value);
  };

  const KanbanView = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Object.entries(tasksByStage).map(([stage, tasks]) => (
        <Card key={stage} className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{stage}</CardTitle>
            <CardDescription className="text-xs">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map(task => {
              const isOverdue = new Date() > task.deadline && task.status !== "completed";
              return (
                <Card key={task.id} className="p-3 hover-elevate" data-testid={`kanban-task-${task.id}`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium truncate">{task.jobTitle}</h4>
                      <StatusBadge 
                        status={isOverdue ? "overdue" : task.status}
                        variant="task"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{task.client}</p>
                    {task.employeeName && (
                      <p className="text-xs text-muted-foreground">
                        Assigned to: {task.employeeName}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <span className={`text-xs ${isOverdue ? "text-overdue font-medium" : "text-muted-foreground"}`}>
                        Due: {task.deadline.toLocaleDateString()}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAssignTask(task.id)}
                          data-testid={`button-assign-task-${task.id}`}
                        >
                          Assign
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-tasks">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Track and manage individual workflow tasks
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
            data-testid="button-view-list"
          >
            <List className="mr-2 h-4 w-4" />
            List
          </Button>
          <Button
            variant={view === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("kanban")}
            data-testid="button-view-kanban"
          >
            <Kanban className="mr-2 h-4 w-4" />
            Kanban
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-tasks"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-40" data-testid="select-stage-filter">
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
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {view === "kanban" ? (
          <KanbanView />
        ) : (
          <div className="space-y-6">
            {mockJobsWithTasks.map(job => (
              <TaskTimeline
                key={job.jobId}
                jobId={job.jobId}
                jobTitle={job.jobTitle}
                tasks={job.tasks}
                onAssignTask={handleAssignTask}
                onUpdateStatus={handleUpdateStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}