import { useState } from "react";
import JobCard from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter } from "lucide-react";

export default function Jobs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // TODO: Remove mock data when implementing real functionality
  const mockJobs = [
    {
      id: "1",
      title: "Business Card Print Run",
      client: "TechCorp Solutions",
      jobType: "Business Cards",
      quantity: 1000,
      deadline: new Date("2024-01-15"),
      status: "printing",
      description: "Premium business cards with matte finish and embossed logo"
    },
    {
      id: "2",
      title: "Marketing Brochure",
      client: "Green Earth Co", 
      jobType: "Brochures",
      quantity: 500,
      deadline: new Date("2023-12-20"),
      status: "overdue",
      description: "Tri-fold brochures for environmental awareness campaign"
    },
    {
      id: "3",
      title: "Product Catalog",
      client: "Fashion Store",
      jobType: "Booklet",
      quantity: 200,
      deadline: new Date("2024-01-25"),
      status: "pre-press",
      description: "48-page product catalog with high-quality photography"
    },
    {
      id: "4",
      title: "Event Flyers",
      client: "Local Events Co",
      jobType: "Flyers",
      quantity: 2000,
      deadline: new Date("2024-01-10"),
      status: "completed",
      description: "A5 flyers for upcoming community events"
    }
  ];

  const handleCreateJob = () => {
    console.log('Creating new job');
  };

  const handleViewJob = (id: string) => {
    console.log('Viewing job:', id);
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
        <Button onClick={handleCreateJob} data-testid="button-create-job">
          <Plus className="mr-2 h-4 w-4" />
          Create Job
        </Button>
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockJobs.map(job => (
          <JobCard
            key={job.id}
            {...job}
            onView={handleViewJob}
          />
        ))}
      </div>

      {/* Empty State */}
      {mockJobs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No jobs found matching your criteria</p>
          <Button onClick={handleCreateJob} data-testid="button-create-first-job">
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Job
          </Button>
        </div>
      )}
    </div>
  );
}