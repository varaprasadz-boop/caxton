import { useState } from "react";
import { useLocation } from "wouter";
import JobCard from "@/components/JobCard";
import CreateJobForm from "@/components/CreateJobForm";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Job, Client } from "@shared/schema";
import { format } from "date-fns";
import { usePermissions } from "@/hooks/use-permissions";

export default function Jobs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { canCreate } = usePermissions();

  // Fetch real data
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"]
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"]
  });

  // Create client lookup map
  const clientMap = new Map(clients.map(c => [c.id, c]));

  // Transform jobs for JobCard component
  const transformedJobs = jobs.map(job => ({
    id: job.id,
    title: job.description || job.jobType,
    client: clientMap.get(job.clientId)?.name || "Unknown Client",
    jobType: job.jobType,
    quantity: job.quantity,
    deadline: new Date(job.deadline),
    status: job.status,
    description: job.description || undefined // Convert null to undefined for JobCard compatibility
  }));

  const handleCreateJob = () => {
    setIsCreateJobModalOpen(true);
  };

  const handleCreateJobSuccess = () => {
    setIsCreateJobModalOpen(false);
  };

  const handleViewJob = (id: string) => {
    setLocation(`/jobs/${id}`);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    console.log('Searching for:', value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    console.log('Filtering by status:', value);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    console.log('Filtering by type:', value);
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
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-jobs"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="pre-press">Pre-Press</SelectItem>
              <SelectItem value="printing">Printing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={handleTypeFilter}>
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
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Jobs Grid */}
      {/* Job Grid */}
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
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {transformedJobs
            .filter(job => {
              const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 job.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 job.jobType.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesStatus = statusFilter === "all" || job.status === statusFilter;
              const matchesType = typeFilter === "all" || job.jobType === typeFilter;
              return matchesSearch && matchesStatus && matchesType;
            })
            .map(job => (
              <JobCard
                key={job.id}
                {...job}
                onView={handleViewJob}
              />
            ))
          }
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