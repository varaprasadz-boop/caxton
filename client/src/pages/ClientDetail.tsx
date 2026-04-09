import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, User, Mail, Phone, Building2, MapPin, FileText, Briefcase } from "lucide-react";
import Modal from "@/components/Modal";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Client, type Job } from "@shared/schema";
import { format } from "date-fns";

export default function ClientDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editForm, setEditForm] = useState({
    name: "", company: "", email: "", phone: "", address: "", gstNo: "", paymentMethod: "Cash"
  });

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

  const updateClientMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const res = await apiRequest("PATCH", `/api/clients/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", id] });
      setIsEditModalOpen(false);
      toast({ title: "Client updated", description: "Client information has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update client.", variant: "destructive" });
    },
  });

  const openEditModal = () => {
    if (client) {
      setEditForm({
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        address: client.address || "",
        gstNo: client.gstNo || "",
        paymentMethod: client.paymentMethod || "Cash",
      });
    }
    setIsEditModalOpen(true);
  };

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
            onClick={openEditModal}
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

      {/* Edit Client Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Client"
      >
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} data-testid="input-edit-client-name" />
            </div>
            <div className="space-y-2">
              <Label>Company *</Label>
              <Input value={editForm.company} onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))} data-testid="input-edit-client-company" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} data-testid="input-edit-client-email" />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} data-testid="input-edit-client-phone" />
            </div>
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input value={editForm.gstNo} onChange={e => setEditForm(p => ({ ...p, gstNo: e.target.value }))} data-testid="input-edit-client-gst" />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={editForm.paymentMethod} onValueChange={v => setEditForm(p => ({ ...p, paymentMethod: v }))}>
                <SelectTrigger data-testid="select-edit-client-payment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={editForm.address} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} data-testid="input-edit-client-address" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} data-testid="button-cancel-edit-client">Cancel</Button>
            <Button
              onClick={() => updateClientMutation.mutate(editForm)}
              disabled={updateClientMutation.isPending || !editForm.name || !editForm.company || !editForm.email || !editForm.phone}
              data-testid="button-save-edit-client"
            >
              {updateClientMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
