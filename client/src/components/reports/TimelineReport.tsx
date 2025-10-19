import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "@/components/StatusBadge";

export default function TimelineReport() {
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["/api/reports/timeline"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading report...</div>
      </div>
    );
  }

  const { timeline = [], upcomingDeadlines = [], overdueJobs = [] } = reportData || {};

  const activeJobs = timeline.filter((j: any) => !["completed", "delivered"].includes(j.status));
  const completedJobs = timeline.filter((j: any) => ["completed", "delivered"].includes(j.status));

  const timelineChartData = upcomingDeadlines.slice(0, 10).map((job: any) => ({
    name: job.jobType.substring(0, 10),
    daysLeft: job.daysUntilDeadline,
    progress: job.progress
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedJobs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingDeadlines.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Jobs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueJobs.length}</div>
          </CardContent>
        </Card>
      </div>

      {upcomingDeadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines Timeline</CardTitle>
            <CardDescription>Days remaining until deadline for active jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="daysLeft" stroke="#3b82f6" name="Days Until Deadline" />
                <Line type="monotone" dataKey="progress" stroke="#10b981" name="Progress %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {overdueJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overdue Jobs</CardTitle>
            <CardDescription className="text-red-600">
              Jobs that have passed their deadline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Days Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueJobs.map((job: any) => (
                  <TableRow key={job.jobId}>
                    <TableCell className="font-medium">{job.jobType}</TableCell>
                    <TableCell>{job.client}</TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={job.progress} className="w-[60px]" />
                        <span className="text-sm text-muted-foreground">
                          {Math.round(job.progress)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(job.deadline), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {Math.abs(job.daysUntilDeadline)} days
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Deadlines</CardTitle>
          <CardDescription>Jobs approaching their deadline in the next 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>Task Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingDeadlines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No upcoming deadlines
                  </TableCell>
                </TableRow>
              ) : (
                upcomingDeadlines.map((job: any) => {
                  const inProgressTask = job.tasks?.find((t: any) => t.status === "in-progress");
                  const nextPendingTask = job.tasks?.find((t: any) => t.status === "pending");
                  const currentTask = inProgressTask || nextPendingTask;

                  return (
                    <TableRow key={job.jobId}>
                      <TableCell className="font-medium">{job.jobType}</TableCell>
                      <TableCell>{job.client}</TableCell>
                      <TableCell>
                        <StatusBadge status={job.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={job.progress} className="w-[60px]" />
                          <span className="text-sm text-muted-foreground">
                            {Math.round(job.progress)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(job.deadline), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            job.daysUntilDeadline <= 3
                              ? "destructive"
                              : job.daysUntilDeadline <= 7
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {job.daysUntilDeadline} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {currentTask ? (
                          <div className="text-sm">
                            <div className="font-medium">{currentTask.stage}</div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {currentTask.status}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No active task</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Jobs Timeline</CardTitle>
          <CardDescription>Complete timeline view of all jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Duration (Days)</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeline.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No jobs available
                  </TableCell>
                </TableRow>
              ) : (
                timeline.map((job: any) => (
                  <TableRow key={job.jobId}>
                    <TableCell className="font-medium">{job.jobType}</TableCell>
                    <TableCell>{job.client}</TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell>
                      {job.createdAt ? format(new Date(job.createdAt), "MMM d, yyyy") : "N/A"}
                    </TableCell>
                    <TableCell>{format(new Date(job.deadline), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{job.totalDuration} days</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={job.progress} className="w-[60px]" />
                        <span className="text-sm text-muted-foreground">
                          {Math.round(job.progress)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
