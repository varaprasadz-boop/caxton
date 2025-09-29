import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Download, Share } from "lucide-react";
import JobTimelineVisualization from "@/components/JobTimelineVisualization";
import JobForm from "@/components/JobForm";
// import TaskAssignmentModal from "@/components/TaskAssignmentModal"; // TODO: Implement this component
import Modal from "@/components/Modal";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Job } from "@shared/schema";

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