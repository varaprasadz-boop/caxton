import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, User, Mail, Phone, Building2, MapPin, FileText, Briefcase, Eye, Calendar, Package } from "lucide-react";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { type Client, type Job, type Task } from "@shared/schema";
import { format } from "date-fns";

function formatJobNumber(jobNumber: number | null | undefined, createdAt: string | Date | null): string {
  if (jobNumber === null || jobNumber === undefined || !Number.isFinite(jobNumber)) {
    return 'Job ID Unavailable';
  }
  if (!createdAt) return `CAX${String(jobNumber).padStart(4, '0')}`;
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const paddedNumber = String(jobNumber).padStart(4, '0');
  const year = date.getFullYear();
  const nextYear = String(year + 1).slice(-2);
  return `CAX${paddedNumber}/${year}-${nextYear}`;
}

export default function ClientDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch client details
  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ["/api/clients", id],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error('Failed to fetch client');
      return res.json();
    },
    enabled: !!id
  });

  // Fetch all jobs for this client
  const { data: allJobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  // Fetch tasks for progress calculation
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"]
  });

  // Filter jobs for this client and enhance with progress
  const clientJobs = allJobs
    .filter(job => job.clientId === id)
    .map(job => {
      const jobTasks = tasks.filter((task: Task) => task.jobId === job.id);
      const completedTasks = jobTasks.filter((task: Task) => task.status === "completed");
      const progress = jobTasks.length > 0 
        ? Math.round((completedTasks.length / jobTasks.length) * 100) 
        : 0;
      
      const formattedJobNumber = formatJobNumber(job.jobNumber, job.createdAt);
      const isOverdue = job.deadline && new Date(job.deadline) < new Date() && !["completed", "delivered"].includes(job.status);
      
      return {
        ...job,
        formattedJobNumber,
        progress,
        isOverdue
      };
    });

  // Separate jobs by status
  const pendingJobs = clientJobs.filter(job => job.status === "pending");
  const inProgressJobs = clientJobs.filter(job => job.status === "in-progress");
  const completedJobs = clientJobs.filter(job => ["completed", "delivered"].includes(job.status));
  const overdueJobs = clientJobs.filter(job => job.isOverdue);
  const activeJobs = clientJobs.filter(job => !["completed", "delivered"].includes(job.status));

  const handleBack = () => {
    setLocation("/clients");
  };

  const handleViewJob = (jobId: string) => {
    setLocation(`/jobs/${jobId}`);
  };

  const renderJobsTable = (jobList: typeof clientJobs, emptyMessage: string) => (
    <div className="rounded-md border">
      {jobList.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Job ID</TableHead>
              <TableHead>Job Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Quantity</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Progress</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobList.map((job) => (
              <TableRow 
                key={job.id}
                data-testid={`row-job-${job.id}`}
                className={job.isOverdue ? "border-l-4 border-l-destructive bg-destructive/5" : ""}
              >
                <TableCell data-testid={`text-job-id-${job.id}`}>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-medium">
                    {job.formattedJobNumber}
                  </code>
                </TableCell>
                <TableCell data-testid={`text-job-name-${job.id}`}>
                  {job.jobName ? (
                    <span className="text-sm">{job.jobName}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">No name</span>
                  )}
                </TableCell>
                <TableCell data-testid={`text-job-type-${job.id}`}>
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{job.jobType}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center" data-testid={`text-job-quantity-${job.id}`}>
                  <span className="text-sm">{job.quantity}</span>
                </TableCell>
                <TableCell data-testid={`text-job-created-${job.id}`}>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {job.createdAt ? format(new Date(job.createdAt), "MMM dd, yyyy") : "N/A"}
                    </span>
                  </div>
                </TableCell>
                <TableCell data-testid={`text-job-deadline-${job.id}`}>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className={`text-sm ${job.isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {job.deadline ? format(new Date(job.deadline), "MMM dd, yyyy") : "No deadline"}
                    </span>
                  </div>
                </TableCell>
                <TableCell data-testid={`badge-job-status-${job.id}`}>
                  <StatusBadge status={job.status} />
                </TableCell>
                <TableCell className="text-center" data-testid={`text-job-progress-${job.id}`}>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-medium">{job.progress}%</span>
                    <Badge variant={job.progress === 100 ? "default" : "secondary"} className="text-xs">
                      {job.progress === 100 ? "Complete" : `${job.progress}% Complete`}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewJob(job.id)}
                    data-testid={`button-view-job-${job.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
    </div>
  );

  if (!id) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Client Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested client could not be found.</p>
          <Button onClick={handleBack} data-testid="button-back-to-clients">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-client-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2"
          data-testid="button-back-to-clients"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isLoading || !client}
            onClick={() => setIsEditModalOpen(true)}
            data-testid="button-edit-client"
          >
            <Edit className="h-4 w-4 mr-2" />
            {isLoading ? "Loading..." : "Edit Client"}
          </Button>
        </div>
      </div>

      {/* Client Details */}
      {client && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Client Information Card */}
          <Card data-testid="card-client-info">
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>Contact and company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">{client.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Company</p>
                  <p className="text-sm text-muted-foreground">{client.company}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{client.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{client.phone}</p>
                </div>
              </div>

              {client.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{client.address}</p>
                  </div>
                </div>
              )}

              {client.gstNo && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">GST Number</p>
                    <p className="text-sm text-muted-foreground">{client.gstNo}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Payment Method</p>
                  <p className="text-sm text-muted-foreground">{client.paymentMethod}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Statistics Card */}
          <Card data-testid="card-job-statistics">
            <CardHeader>
              <CardTitle>Job Statistics</CardTitle>
              <CardDescription>Overview of jobs for this client</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Active Jobs</p>
                  <p className="text-2xl font-bold text-muted-foreground">{activeJobs.length}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Completed Jobs</p>
                  <p className="text-2xl font-bold text-muted-foreground">{completedJobs.length}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Total Jobs</p>
                  <p className="text-2xl font-bold text-muted-foreground">{clientJobs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Client Jobs with Status Tabs */}
      {client && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Jobs for {client.name}</h2>
            <p className="text-muted-foreground">
              All printing jobs associated with this client
            </p>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All Jobs ({clientJobs.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingJobs.length})
              </TabsTrigger>
              <TabsTrigger value="in-progress">
                In Progress ({inProgressJobs.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedJobs.length})
              </TabsTrigger>
              <TabsTrigger value="overdue" className="text-destructive">
                Overdue ({overdueJobs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {renderJobsTable(clientJobs, "No jobs for this client yet")}
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              {renderJobsTable(pendingJobs, "No pending jobs")}
            </TabsContent>

            <TabsContent value="in-progress" className="mt-6">
              {renderJobsTable(inProgressJobs, "No jobs in progress")}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {renderJobsTable(completedJobs, "No completed jobs")}
            </TabsContent>

            <TabsContent value="overdue" className="mt-6">
              {renderJobsTable(overdueJobs, "No overdue jobs")}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Edit Client Modal - Placeholder for now */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Client"
      >
        <div className="p-6">
          <p className="text-muted-foreground">Edit client functionality will be implemented here.</p>
          <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="mt-4">
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
