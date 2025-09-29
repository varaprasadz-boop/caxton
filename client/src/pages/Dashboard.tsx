import { useState } from "react";
import DashboardStats from "@/components/DashboardStats";
import DeadlineAlerts from "@/components/DeadlineAlerts";
import JobCard from "@/components/JobCard";
import CreateJobForm from "@/components/CreateJobForm";
import Modal from "@/components/Modal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Job, Client } from "@shared/schema";

export default function Dashboard() {
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);

  // Fetch real data
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"]
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"]
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats/jobs"]
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["/api/alerts/deadlines"]
  });

  // Create client lookup map
  const clientMap = new Map(clients.map(c => [c.id, c]));

  // Get recent jobs (last 5)
  const recentJobs = jobs
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5)
    .map(job => ({
      id: job.id,
      title: job.description || job.jobType,
      client: clientMap.get(job.clientId)?.name || "Unknown Client",
      jobType: job.jobType,
      quantity: job.quantity,
      deadline: new Date(job.deadline),
      status: job.status,
      description: job.description
    }));

  const handleCreateJob = () => {
    setIsCreateJobModalOpen(true);
  };

  const handleCreateJobSuccess = () => {
    setIsCreateJobModalOpen(false);
  };

  const handleViewJob = (id: string) => {
    console.log('Viewing job:', id);
    // TODO: Navigate to job detail page
  };

  const handleViewDeadlineItem = (id: string, type: "job" | "task") => {
    console.log('Viewing deadline item:', type, id);
    // TODO: Navigate to appropriate detail page
  };

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your printing workflow operations
          </p>
        </div>
        <Button onClick={handleCreateJob} data-testid="button-create-job">
          <Plus className="mr-2 h-4 w-4" />
          Create Job
        </Button>
      </div>

      {/* Stats */}
      <DashboardStats 
        totalJobs={stats?.totalJobs || 0}
        activeJobs={stats?.activeJobs || 0}
        completedJobs={stats?.completedJobs || 0}
        overdueJobs={stats?.overdueJobs || 0}
      />

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Jobs
            </CardTitle>
            <CardDescription>
              Latest job activities and updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentJobs.length > 0 ? (
              recentJobs.map(job => (
                <JobCard 
                  key={job.id}
                  {...job}
                  onView={handleViewJob}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No jobs yet</p>
                <Button onClick={handleCreateJob} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Job
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deadline Alerts */}
        <DeadlineAlerts 
          items={alerts}
          onView={handleViewDeadlineItem}
        />
      </div>

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