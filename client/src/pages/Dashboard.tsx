import DashboardStats from "@/components/DashboardStats";
import DeadlineAlerts from "@/components/DeadlineAlerts";
import JobCard from "@/components/JobCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Activity } from "lucide-react";

export default function Dashboard() {
  // TODO: Remove mock data when implementing real functionality
  const mockRecentJobs = [
    {
      id: "1",
      title: "Business Card Print Run",
      client: "TechCorp Solutions", 
      jobType: "Business Cards",
      quantity: 1000,
      deadline: new Date("2024-01-15"),
      status: "printing",
      description: "Premium business cards with matte finish"
    },
    {
      id: "2",
      title: "Marketing Brochure",
      client: "Green Earth Co",
      jobType: "Brochures", 
      quantity: 500,
      deadline: new Date("2024-01-12"),
      status: "qc"
    }
  ];

  const mockDeadlineItems = [
    {
      id: "1",
      title: "Business Card QC",
      type: "task" as const,
      client: "TechCorp Solutions",
      deadline: new Date(),
      status: "pending",
      stage: "QC"
    },
    {
      id: "2", 
      title: "Urgent Flyers",
      type: "job" as const,
      client: "Event Co",
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "printing"
    }
  ];

  const handleCreateJob = () => {
    console.log('Creating new job');
  };

  const handleViewJob = (id: string) => {
    console.log('Viewing job:', id);
  };

  const handleViewDeadlineItem = (id: string, type: "job" | "task") => {
    console.log('Viewing deadline item:', type, id);
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
        totalJobs={45}
        activeJobs={12}
        completedJobs={28}
        overdueJobs={5}
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
            {mockRecentJobs.map(job => (
              <JobCard 
                key={job.id}
                {...job}
                onView={handleViewJob}
              />
            ))}
          </CardContent>
        </Card>

        {/* Deadline Alerts */}
        <DeadlineAlerts 
          items={mockDeadlineItems}
          onView={handleViewDeadlineItem}
        />
      </div>
    </div>
  );
}