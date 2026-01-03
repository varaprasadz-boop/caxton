import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface ClientStat {
  clientId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  paymentMethod: string;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  overdueJobs: number;
  totalQuantity: number;
  jobTypeBreakdown: Record<string, number>;
  lastJobDate: string | null;
}

interface ClientReportData {
  clients: ClientStat[];
  topClients: ClientStat[];
  summary: {
    totalClients: number;
    activeClients: number;
    totalJobsAllClients: number;
    avgJobsPerClient: number;
  };
}

export default function ClientReport() {
  const { data: reportData, isLoading } = useQuery<ClientReportData>({
    queryKey: ["/api/reports/clients"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading report...</div>
      </div>
    );
  }

  const clients = reportData?.clients ?? [];
  const topClients = reportData?.topClients ?? [];
  const summary = reportData?.summary ?? { totalClients: 0, activeClients: 0, totalJobsAllClients: 0, avgJobsPerClient: 0 };

  const topClientsChartData = topClients.map((client) => ({
    name: client.name.substring(0, 15),
    jobs: client.totalJobs,
    active: client.activeJobs,
    completed: client.completedJobs
  }));

  const jobTypeDistribution = topClients.reduce((acc: Record<string, number>, client) => {
    Object.entries(client.jobTypeBreakdown || {}).forEach(([type, count]) => {
      acc[type] = (acc[type] || 0) + count;
    });
    return acc;
  }, {});

  const jobTypeData = Object.entries(jobTypeDistribution).map(([type, count]) => ({
    name: type,
    value: count
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalClients || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeClients || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalJobsAllClients || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Jobs/Client</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.avgJobsPerClient ? summary.avgJobsPerClient.toFixed(1) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Clients by Jobs</CardTitle>
            <CardDescription>Clients with the most jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topClientsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="jobs" fill="#3b82f6" name="Total Jobs" />
                <Bar dataKey="active" fill="#f59e0b" name="Active" />
                <Bar dataKey="completed" fill="#10b981" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job Type Distribution</CardTitle>
            <CardDescription>Most popular job types across all clients</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={jobTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {jobTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>Complete client statistics and job history</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Total Jobs</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Overdue</TableHead>
                <TableHead>Total Quantity</TableHead>
                <TableHead>Last Job</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No client data available
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.clientId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">{client.company}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{client.email}</div>
                        <div className="text-muted-foreground">{client.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.paymentMethod}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{client.totalJobs}</Badge>
                    </TableCell>
                    <TableCell>
                      {client.activeJobs > 0 ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {client.activeJobs}
                        </Badge>
                      ) : (
                        <Badge variant="outline">0</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {client.completedJobs}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {client.overdueJobs > 0 ? (
                        <Badge variant="destructive">{client.overdueJobs}</Badge>
                      ) : (
                        <Badge variant="outline">0</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{client.totalQuantity.toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      {client.lastJobDate ? (
                        <span className="text-sm">
                          {format(new Date(client.lastJobDate), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">No jobs</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {topClients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Clients - Job Type Breakdown</CardTitle>
            <CardDescription>Detailed job type distribution for top clients</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Job Types</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((client) => (
                  <TableRow key={`breakdown-${client.clientId}`}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(client.jobTypeBreakdown || {}).map(([type, count]) => (
                          <Badge key={type} variant="secondary">
                            {type}: {count}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
