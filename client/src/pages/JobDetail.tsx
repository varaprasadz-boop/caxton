import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Download, Share, FileText, Calendar, Package, User, Palette, Scissors, Cog } from "lucide-react";
import JobTimelineVisualization from "@/components/JobTimelineVisualization";
import JobForm from "@/components/JobForm";
// import TaskAssignmentModal from "@/components/TaskAssignmentModal"; // TODO: Implement this component
import Modal from "@/components/Modal";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Job, type Client, type Machine } from "@shared/schema";
import { format } from "date-fns";

export default function JobDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch job details
  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ["/api/jobs", id],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) throw new Error('Failed to fetch job');
      return res.json();
    },
    enabled: !!id
  });

  // Fetch client information
  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", job?.clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${job?.clientId}`);
      if (!res.ok) throw new Error('Failed to fetch client');
      return res.json();
    },
    enabled: !!job?.clientId
  });

  // Fetch all machines to display selected ones
  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ["/api/machines"]
  });

  // Mutation for updating task status
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: any }) => {
      return apiRequest(`/api/tasks/${taskId}`, "PATCH", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/detailed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/recent"] });
      toast({
        title: "Task Updated",
        description: "Task status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleBack = () => {
    setLocation("/jobs");
  };

  const handleAssignTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsAssignModalOpen(true);
  };

  const handleUpdateStatus = (taskId: string, status: string) => {
    updateTaskMutation.mutate({
      taskId,
      updates: { status }
    });
  };

  const handleAssignmentSuccess = () => {
    setIsAssignModalOpen(false);
    setSelectedTaskId(null);
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    toast({
      title: "Task Assigned",
      description: "Task has been assigned successfully.",
    });
  };

  if (!id) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested job could not be found.</p>
          <Button onClick={handleBack} data-testid="button-back-to-jobs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-job-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2"
          data-testid="button-back-to-jobs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isLoading || !job}
            onClick={() => setIsEditModalOpen(true)}
            data-testid="button-edit-job"
          >
            <Edit className="h-4 w-4 mr-2" />
            {isLoading ? "Loading..." : "Edit Job"}
          </Button>
          <Button variant="outline" size="sm" data-testid="button-download-report">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm" data-testid="button-share-job">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Job Details */}
      {job && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Job Information Card */}
          <Card data-testid="card-job-info">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Job Information</CardTitle>
                <Badge variant={job.status === "completed" ? "default" : "secondary"}>
                  {job.status.replace("-", " ")}
                </Badge>
              </div>
              <CardDescription>Details about this printing job</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Job Type</p>
                  <p className="text-sm text-muted-foreground">{job.jobType}</p>
                </div>
              </div>

              {job.description && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm text-muted-foreground">{job.description}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Quantity</p>
                  <p className="text-sm text-muted-foreground">{job.quantity} units</p>
                </div>
              </div>

              {job.size && (
                <div className="flex items-start gap-3">
                  <Scissors className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Size</p>
                    <p className="text-sm text-muted-foreground">{job.size}</p>
                  </div>
                </div>
              )}

              {job.colors && (
                <div className="flex items-start gap-3">
                  <Palette className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Colors</p>
                    <p className="text-sm text-muted-foreground">{job.colors}</p>
                  </div>
                </div>
              )}

              {job.finishingOptions && (
                <div className="flex items-start gap-3">
                  <Scissors className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Finishing Options</p>
                    <p className="text-sm text-muted-foreground">{job.finishingOptions}</p>
                  </div>
                </div>
              )}

              {job.machineIds && job.machineIds.length > 0 && (
                <div className="flex items-start gap-3">
                  <Cog className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">Machines</p>
                    <div className="flex flex-wrap gap-2">
                      {job.machineIds.map(machineId => {
                        const machine = machines.find(m => m.id === machineId);
                        return machine ? (
                          <Badge key={machineId} variant="secondary" data-testid={`badge-machine-${machineId}`}>
                            {machine.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Delivery Deadline</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(job.deadline), "PPP")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client & PO Information Card */}
          <Card data-testid="card-client-po-info">
            <CardHeader>
              <CardTitle>Client & Documents</CardTitle>
              <CardDescription>Client information and uploaded files</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {client && (
                <>
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Client Name</p>
                      <p className="text-sm text-muted-foreground">{client.name}</p>
                    </div>
                  </div>

                  {client.company && (
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Company</p>
                        <p className="text-sm text-muted-foreground">{client.company}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{client.phone}</p>
                    </div>
                  </div>
                </>
              )}

              {job.poFileUrl && (
                <div className="flex items-start gap-3 pt-4 border-t">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">Purchase Order (PO)</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(job.poFileUrl!, '_blank')}
                      data-testid="button-view-po"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      View/Download PO
                    </Button>
                  </div>
                </div>
              )}

              {!job.poFileUrl && (
                <div className="flex items-start gap-3 pt-4 border-t">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Purchase Order (PO)</p>
                    <p className="text-sm text-muted-foreground">No PO file uploaded</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Job Timeline Visualization */}
      <JobTimelineVisualization
        jobId={id}
        onAssignTask={handleAssignTask}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Task Assignment Modal - TODO: Implement TaskAssignmentModal component */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Task"
      >
        <div className="p-4">
          <p className="text-muted-foreground">Task assignment functionality will be implemented here.</p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Job Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Job"
      >
        <div className="p-6">
          {job && (
            <JobForm
              job={job}
              onSuccess={() => {
                setIsEditModalOpen(false);
                toast({
                  title: "Job updated",
                  description: "Job has been updated successfully.",
                });
              }}
              onCancel={() => setIsEditModalOpen(false)}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}