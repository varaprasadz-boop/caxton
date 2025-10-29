import { useState } from "react";
import { useLocation } from "wouter";
import CreateJobForm from "@/components/CreateJobForm";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Package, Calendar, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Job, Client, Task } from "@shared/schema";
import { format } from "date-fns";
import { usePermissions } from "@/hooks/use-permissions";
import { useToast } from "@/hooks/use-toast";

function formatJobNumber(jobNumber: number, createdAt: Date | null): string {
  if (!createdAt) return `CAX${String(jobNumber).padStart(4, '0')}`;
  const date = new Date(createdAt);
  const paddedNumber = String(jobNumber).padStart(4, '0');
  const year = date.getFullYear();
  const nextYear = String(year + 1).slice(-2); // Get last 2 digits of next year
  return `CAX${paddedNumber}/${year}-${nextYear}`;
}

export default function Jobs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { canCreate } = usePermissions();
  const { toast } = useToast();

  // Fetch real data
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"]
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"]
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"]
  });

  // Create client lookup map
  const clientMap = new Map(clients.map(c => [c.id, c]));

  // Calculate completion percentage for each job
  const calculateCompletion = (jobId: string): number => {
    const jobTasks = tasks.filter(task => task.jobId === jobId);
    if (jobTasks.length === 0) return 0;
    const completedTasks = jobTasks.filter(task => task.status === "completed");
    return Math.round((completedTasks.length / jobTasks.length) * 100);
  };

  // Transform jobs for display
  const transformedJobs = jobs.map(job => {
    const deadline = new Date(job.deadline);
    const isOverdue = deadline < new Date() && !["completed", "delivered"].includes(job.status);
    const formattedJobNumber = formatJobNumber(job.jobNumber, job.createdAt);
    const completionPercentage = calculateCompletion(job.id);
    
    return {
      id: job.id,
      jobNumber: formattedJobNumber,
      jobName: job.jobName,
      client: clientMap.get(job.clientId)?.name || "Unknown Client",
      jobType: job.jobType,
      quantity: job.quantity,
      deadline: deadline,
      status: job.status,
      isOverdue,
      completionPercentage
    };
  });

  // Apply filters
  const filteredJobs = transformedJobs.filter(job => {
    const matchesSearch = job.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.jobType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (job.jobName && job.jobName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "overdue" ? job.isOverdue : job.status === statusFilter);
    const matchesType = typeFilter === "all" || job.jobType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreateJob = () => {
    setIsCreateJobModalOpen(true);
  };

  const handleCreateJobSuccess = () => {
    setIsCreateJobModalOpen(false);
  };

  const handleViewJob = (id: string) => {
    setLocation(`/jobs/${id}`);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-jobs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">
            Manage your printing jobs and track their progress
          </p>
        </div>
        {canCreate('jobs') && (
          <Button onClick={handleCreateJob} data-testid="button-create-job">
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs by ID, client, type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-jobs"
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
              <SelectItem value="pre-press">Pre-Press</SelectItem>
              <SelectItem value="printing">Printing</SelectItem>
              <SelectItem value="cutting">Cutting</SelectItem>
              <SelectItem value="folding">Folding</SelectItem>
              <SelectItem value="binding">Binding</SelectItem>
              <SelectItem value="qc">QC</SelectItem>
              <SelectItem value="packaging">Packaging</SelectItem>
              <SelectItem value="dispatch">Dispatch</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40" data-testid="select-type-filter">
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Business Cards">Business Cards</SelectItem>
              <SelectItem value="Brochures">Brochures</SelectItem>
              <SelectItem value="Booklet">Booklet</SelectItem>
              <SelectItem value="Flyers">Flyers</SelectItem>
              <SelectItem value="Carton">Carton</SelectItem>
              <SelectItem value="Pouch Folder">Pouch Folder</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Jobs Table */}
      {transformedJobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No jobs found</p>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first job to get started with the workflow management
          </p>
          {canCreate('jobs') && (
            <Button onClick={handleCreateJob} data-testid="button-create-first-job">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Job
            </Button>
          )}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No jobs found matching your filters</p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setTypeFilter("all");
            }}
            data-testid="button-clear-filters"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Job ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow 
                  key={job.id} 
                  className={job.isOverdue ? "bg-destructive/5" : ""}
                  data-testid={`row-job-${job.id}`}
                >
                  <TableCell data-testid={`text-job-id-${job.id}`}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-medium">
                          {job.jobNumber}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(job.jobNumber, "Job ID")}
                          data-testid={`button-copy-job-id-${job.id}`}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {job.jobName && (
                        <div className="text-xs text-muted-foreground" data-testid={`text-job-name-${job.id}`}>
                          {job.jobName}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-job-client-${job.id}`}>
                    {job.client}
                  </TableCell>
                  <TableCell data-testid={`badge-job-type-${job.id}`}>
                    <Badge variant="outline" className="text-xs">
                      <Package className="h-3 w-3 mr-1" />
                      {job.jobType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-job-quantity-${job.id}`}>
                    {job.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell data-testid={`text-job-deadline-${job.id}`}>
                    <div className={`flex items-center gap-1 text-sm ${job.isOverdue ? "text-destructive font-semibold" : ""}`}>
                      <Calendar className="h-3 w-3" />
                      {format(job.deadline, "MMM dd, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`badge-job-status-${job.id}`}>
                    <div className="flex flex-col gap-1">
                      <StatusBadge 
                        status={job.isOverdue ? "overdue" : job.status} 
                        variant="job" 
                      />
                      <div className="text-xs text-muted-foreground" data-testid={`text-job-completion-${job.id}`}>
                        <span className="font-semibold text-foreground">{job.completionPercentage}%</span> Complete
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewJob(job.id)}
                      data-testid={`button-view-job-${job.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Job Modal */}
      <Modal
        isOpen={isCreateJobModalOpen}
        onClose={() => setIsCreateJobModalOpen(false)}
        title="Create New Job"
      >
        <CreateJobForm
          onSuccess={handleCreateJobSuccess}
          onCancel={() => setIsCreateJobModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
