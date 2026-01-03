import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Users, 
  Package, 
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  TrendingUp
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface DetailedStatsData {
  jobs: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
  };
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    unassigned: number;
    overdue: number;
  };
  jobTypes: Record<string, number>;
  stages: Record<string, number>;
  employees: Array<{
    employeeId: string;
    name: string;
    role: string;
    activeTasks: number;
    completedTasks: number;
    totalTasks: number;
  }>;
  clients: {
    total: number;
    withActiveJobs: number;
  };
}

export default function DetailedStats() {
  const { data: stats, isLoading } = useQuery<DetailedStatsData>({
    queryKey: ["/api/stats/detailed"],
    refetchInterval: 60000 // Refresh every minute
  });

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
              <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-7 bg-muted rounded w-16 animate-pulse mb-1"></div>
              <div className="h-3 bg-muted rounded w-24 animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const jobCompletionRate = stats.jobs.total > 0 
    ? Math.round((stats.jobs.completed / stats.jobs.total) * 100) 
    : 0;

  const taskCompletionRate = stats.tasks.total > 0
    ? Math.round((stats.tasks.completed / stats.tasks.total) * 100)
    : 0;

  const clientEngagementRate = stats.clients.total > 0
    ? Math.round((stats.clients.withActiveJobs / stats.clients.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Main Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="stat-jobs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.jobs.total}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              {jobCompletionRate}% completion rate
            </div>
            <div className="flex gap-1 mt-2">
              <Badge variant="secondary" className="text-xs">
                {stats.jobs.active} Active
              </Badge>
              {stats.jobs.overdue > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.jobs.overdue} Overdue
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks.total}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <CheckCircle className="h-3 w-3 mr-1" />
              {taskCompletionRate}% completed
            </div>
            <div className="flex gap-1 mt-2">
              <Badge variant="secondary" className="text-xs">
                {stats.tasks.inProgress} In Progress
              </Badge>
              {stats.tasks.unassigned > 0 && (
                <Badge variant="outline" className="text-xs">
                  {stats.tasks.unassigned} Unassigned
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-clients">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clients.withActiveJobs}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <User className="h-3 w-3 mr-1" />
              of {stats.clients.total} total clients
            </div>
            <div className="mt-2">
              <Progress value={clientEngagementRate} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">
                {clientEngagementRate}% engagement
              </p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-performance">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.tasks.overdue + stats.jobs.overdue}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <AlertCircle className="h-3 w-3 mr-1" />
              overdue items
            </div>
            <div className="mt-2">
              {(stats.tasks.overdue + stats.jobs.overdue) === 0 ? (
                <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                  On Track
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  Needs Attention
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Type Distribution */}
      {Object.keys(stats.jobTypes).length > 0 && (
        <Card data-testid="card-job-types">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Job Type Distribution</CardTitle>
            <CardDescription>
              Most common types of work
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.jobTypes)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([type, count]) => {
                  const percentage = Math.round((count / stats.jobs.total) * 100);
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{type}</span>
                        <Badge variant="outline" className="text-xs">{count}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={percentage} className="w-16 h-1" />
                        <span className="text-xs text-muted-foreground w-8">{percentage}%</span>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      {stats.employees.length > 0 && (
        <Card data-testid="card-top-performers">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
            <CardDescription>
              Most productive team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.employees
                .sort((a, b) => b.completedTasks - a.completedTasks)
                .slice(0, 5)
                .map((employee) => (
                  <div key={employee.employeeId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{employee.name}</span>
                      <Badge variant="secondary" className="text-xs">{employee.role}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {employee.completedTasks} completed
                      </span>
                      {employee.activeTasks > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {employee.activeTasks} active
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}