import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, User, Mail, Phone, Building2, MapPin, FileText, Briefcase } from "lucide-react";
import Modal from "@/components/Modal";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { type Client, type Job } from "@shared/schema";
import { format } from "date-fns";

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

  // Filter jobs for this client
  const clientJobs = allJobs.filter(job => job.clientId === id);
  const activeJobs = clientJobs.filter(job => !["completed", "delivered"].includes(job.status));
  const completedJobs = clientJobs.filter(job => ["completed", "delivered"].includes(job.status));

  const handleBack = () => {
    setLocation("/clients");
  };

  const handleViewJob = (jobId: string) => {
    setLocation(`/jobs/${jobId}`);
  };

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

      {/* Client Jobs */}
      {client && (
        <Card data-testid="card-client-jobs">
          <CardHeader>
            <CardTitle>Jobs for {client.name}</CardTitle>
            <CardDescription>
              All printing jobs associated with this client
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clientJobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No jobs for this client yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientJobs.map(job => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 rounded-md border hover-elevate cursor-pointer"
                    onClick={() => handleViewJob(job.id)}
                    data-testid={`job-item-${job.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{job.jobType}</p>
                        <Badge variant={job.status === "completed" ? "default" : "secondary"}>
                          {job.status.replace("-", " ")}
                        </Badge>
                      </div>
                      {job.description && (
                        <p className="text-sm text-muted-foreground mb-1">{job.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Quantity: {job.quantity}</span>
                        <span>Deadline: {format(new Date(job.deadline), "PP")}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewJob(job.id);
                      }}
                      data-testid={`button-view-job-${job.id}`}
                    >
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
