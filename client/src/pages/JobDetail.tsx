import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Edit, Download, Share, FileText, Calendar, Package, User, Palette, Scissors, Cog, Printer, ChevronDown } from "lucide-react";
import JobTimelineVisualization from "@/components/JobTimelineVisualization";
import JobForm from "@/components/JobForm";
import Modal from "@/components/Modal";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Job, type Client, type Machine, type ProductCategory } from "@shared/schema";
import { format } from "date-fns";

export default function JobDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState({
    basic: true,
    specs: true,
    prePress: false,
    printing: false,
    additionalProcess: false,
    cutting: false,
    delivery: false,
    items: false
  });
  
  const printRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: job, isLoading, isError } = useQuery<Job | null>({
    queryKey: ["/api/jobs", id],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${id}`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Job not found');
        }
        throw new Error('Failed to fetch job');
      }
      return res.json();
    },
    enabled: !!id,
    retry: false
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", job?.clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${job?.clientId}`, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch client');
      return res.json();
    },
    enabled: !!job?.clientId
  });

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ["/api/machines"]
  });

  const { data: productCategories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"]
  });

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

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handlePrintJobCard = () => {
    setLocation(`/jobs/${id}/print`);
  };

  const handlePrintJobCardLegacy = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !job) return;

    const productCategory = productCategories.find(c => c.id === job.productCategoryId);
    const prePressSpecs = job.prePressSpecs as Record<string, string> || {};
    const printingInfo = job.printingInfo as Record<string, string> || {};
    const additionalProcess = job.additionalProcess as Record<string, string> || {};
    const cuttingSlip = job.cuttingSlip as Record<string, string> || {};
    const customerDelivery = job.customerDelivery as Record<string, string> || {};
    const items = (job.items as any[]) || [];

    const jobCardHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Job Card - ${job.jobNumber || job.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header h2 { font-size: 16px; font-weight: normal; }
          .job-number { font-size: 18px; font-weight: bold; color: #333; margin-top: 10px; }
          .section { margin-bottom: 15px; border: 1px solid #ccc; }
          .section-header { background: #f0f0f0; padding: 8px 10px; font-weight: bold; border-bottom: 1px solid #ccc; }
          .section-content { padding: 10px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .field { margin-bottom: 8px; }
          .field-label { font-weight: bold; font-size: 11px; color: #666; }
          .field-value { font-size: 12px; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
          th { background: #f0f0f0; }
          .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CAXTON PHP</h1>
          <h2>Printing Company</h2>
          <div class="job-number">Job No: ${job.jobNumber || job.id}</div>
        </div>

        <div class="section">
          <div class="section-header">Basic Information</div>
          <div class="section-content">
            <div class="grid">
              <div class="field">
                <div class="field-label">Client</div>
                <div class="field-value">${client?.name || '-'} (${client?.company || '-'})</div>
              </div>
              <div class="field">
                <div class="field-label">Product Category</div>
                <div class="field-value">${productCategory?.name || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Job Name</div>
                <div class="field-value">${job.jobName || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Job Type</div>
                <div class="field-value">${job.jobType}</div>
              </div>
              <div class="field">
                <div class="field-label">Order Date</div>
                <div class="field-value">${job.orderDate ? format(new Date(job.orderDate), "dd/MM/yyyy") : '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Schedule Date</div>
                <div class="field-value">${job.scheduleDate ? format(new Date(job.scheduleDate), "dd/MM/yyyy") : '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Delivery Deadline</div>
                <div class="field-value">${format(new Date(job.deadline), "dd/MM/yyyy")}</div>
              </div>
              <div class="field">
                <div class="field-label">Status</div>
                <div class="field-value">${job.status.toUpperCase()}</div>
              </div>
            </div>
            ${job.description ? `
            <div class="field" style="margin-top: 10px;">
              <div class="field-label">Description</div>
              <div class="field-value">${job.description}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-header">Specifications</div>
          <div class="section-content">
            <div class="grid-3">
              <div class="field">
                <div class="field-label">Quantity</div>
                <div class="field-value">${job.quantity}</div>
              </div>
              <div class="field">
                <div class="field-label">Size</div>
                <div class="field-value">${job.size || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">CLS</div>
                <div class="field-value">${job.cls || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Colors</div>
                <div class="field-value">${job.colors || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Paper</div>
                <div class="field-value">${job.paper || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Finishing</div>
                <div class="field-value">${job.finishingOptions || '-'}</div>
              </div>
            </div>
            ${job.jobSpecs ? `
            <div class="field" style="margin-top: 10px;">
              <div class="field-label">Additional Specifications</div>
              <div class="field-value">${job.jobSpecs}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-header">Pre-Press</div>
          <div class="section-content">
            <div class="grid">
              <div class="field">
                <div class="field-label">Artwork Received</div>
                <div class="field-value">${prePressSpecs.artworkReceived || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Proof Sent</div>
                <div class="field-value">${prePressSpecs.proofSent || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Proof Approved</div>
                <div class="field-value">${prePressSpecs.proofApproved || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Plate Making</div>
                <div class="field-value">${prePressSpecs.plateMaking || '-'}</div>
              </div>
            </div>
            ${prePressSpecs.notes ? `
            <div class="field" style="margin-top: 10px;">
              <div class="field-label">Notes</div>
              <div class="field-value">${prePressSpecs.notes}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-header">Printing</div>
          <div class="section-content">
            <div class="grid-3">
              <div class="field">
                <div class="field-label">Machine</div>
                <div class="field-value">${printingInfo.machine || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Forms</div>
                <div class="field-value">${printingInfo.forms || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Ups</div>
                <div class="field-value">${printingInfo.ups || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Print Run</div>
                <div class="field-value">${printingInfo.printRun || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Sheets Required</div>
                <div class="field-value">${printingInfo.sheetsRequired || '-'}</div>
              </div>
            </div>
            ${printingInfo.notes ? `
            <div class="field" style="margin-top: 10px;">
              <div class="field-label">Notes</div>
              <div class="field-value">${printingInfo.notes}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-header">Additional Process</div>
          <div class="section-content">
            <div class="grid-3">
              <div class="field">
                <div class="field-label">Lamination</div>
                <div class="field-value">${additionalProcess.lamination || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">UV Coating</div>
                <div class="field-value">${additionalProcess.uvCoating || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Foiling</div>
                <div class="field-value">${additionalProcess.foiling || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Embossing</div>
                <div class="field-value">${additionalProcess.embossing || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Die Cutting</div>
                <div class="field-value">${additionalProcess.dieCutting || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">Cutting Slip</div>
          <div class="section-content">
            <div class="grid-3">
              <div class="field">
                <div class="field-label">Cut Size</div>
                <div class="field-value">${cuttingSlip.cutSize || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Quantity</div>
                <div class="field-value">${cuttingSlip.quantity || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Sections</div>
                <div class="field-value">${cuttingSlip.sections || '-'}</div>
              </div>
            </div>
            ${cuttingSlip.notes ? `
            <div class="field" style="margin-top: 10px;">
              <div class="field-label">Notes</div>
              <div class="field-value">${cuttingSlip.notes}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-header">Delivery</div>
          <div class="section-content">
            <div class="grid">
              <div class="field">
                <div class="field-label">Contact</div>
                <div class="field-value">${customerDelivery.contact || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Address</div>
                <div class="field-value">${customerDelivery.address || '-'}</div>
              </div>
            </div>
            ${customerDelivery.instructions ? `
            <div class="field" style="margin-top: 10px;">
              <div class="field-label">Instructions</div>
              <div class="field-value">${customerDelivery.instructions}</div>
            </div>
            ` : ''}
          </div>
        </div>

        ${items.length > 0 ? `
        <div class="section">
          <div class="section-header">Items</div>
          <div class="section-content">
            <table>
              <thead>
                <tr>
                  <th>Sr.</th>
                  <th>Particulars</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item: any) => `
                <tr>
                  <td>${item.srNo || '-'}</td>
                  <td>${item.particulars || '-'}</td>
                  <td>${item.quantity || '-'}</td>
                  <td>${item.unit || '-'}</td>
                  <td>${item.rate || '-'}</td>
                  <td>${item.amount || '-'}</td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        ${job.partyPressRemarks ? `
        <div class="section">
          <div class="section-header">Party/Press Remarks</div>
          <div class="section-content">
            <div class="field-value">${job.partyPressRemarks}</div>
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <p>Printed on: ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(jobCardHTML);
    printWindow.document.close();
  };

  const getProductCategoryName = () => {
    if (!job?.productCategoryId) return null;
    return productCategories.find(c => c.id === job.productCategoryId)?.name;
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (isError || (!isLoading && !job)) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested job could not be found or has been deleted.</p>
          <Button onClick={handleBack} data-testid="button-back-to-jobs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  const SectionHeader = ({ title, section }: { title: string; section: keyof typeof openSections }) => (
    <CollapsibleTrigger 
      className="flex w-full items-center justify-between py-2 text-sm font-medium hover-elevate rounded-md px-2"
      onClick={() => toggleSection(section)}
    >
      <span>{title}</span>
      <ChevronDown className={`h-4 w-4 transition-transform ${openSections[section] ? 'rotate-180' : ''}`} />
    </CollapsibleTrigger>
  );

  const prePressSpecs = (job?.prePressSpecs as Record<string, string>) || {};
  const printingInfo = (job?.printingInfo as Record<string, string>) || {};
  const additionalProcess = (job?.additionalProcess as Record<string, string>) || {};
  const cuttingSlip = (job?.cuttingSlip as Record<string, string>) || {};
  const customerDelivery = (job?.customerDelivery as Record<string, string>) || {};
  const items = (job?.items as any[]) || [];

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-job-detail">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2"
          data-testid="button-back-to-jobs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Button>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrintJobCard}
            disabled={isLoading || !job}
            data-testid="button-print-job-card"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Job Card
          </Button>
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
            Export
          </Button>
        </div>
      </div>

      {/* Job Header with Number */}
      {job && (
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold" data-testid="text-job-number">
            {job.jobNumber || `Job ${job.id.substring(0, 8)}`}
          </h1>
          <Badge variant={job.status === "completed" ? "default" : "secondary"} data-testid="badge-job-status">
            {job.status.replace("-", " ")}
          </Badge>
          {job.jobName && (
            <span className="text-muted-foreground" data-testid="text-job-name">
              {job.jobName}
            </span>
          )}
        </div>
      )}

      {/* Job Details */}
      {job && (
        <div className="space-y-4">
          {/* Basic Information */}
          <Collapsible open={openSections.basic}>
            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Basic Information" section="basic" />
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Client</p>
                    <p className="text-sm">{client?.name || '-'} {client?.company ? `(${client.company})` : ''}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Product Category</p>
                    <p className="text-sm">{getProductCategoryName() || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Job Type</p>
                    <p className="text-sm">{job.jobType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Order Date</p>
                    <p className="text-sm">{job.orderDate ? format(new Date(job.orderDate), "PPP") : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Schedule Date</p>
                    <p className="text-sm">{job.scheduleDate ? format(new Date(job.scheduleDate), "PPP") : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Delivery Deadline</p>
                    <p className="text-sm">{format(new Date(job.deadline), "PPP")}</p>
                  </div>
                  {job.description && (
                    <div className="col-span-full">
                      <p className="text-sm font-medium text-muted-foreground">Description</p>
                      <p className="text-sm">{job.description}</p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Specifications */}
          <Collapsible open={openSections.specs}>
            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Specifications" section="specs" />
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                    <p className="text-sm">{job.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Size</p>
                    <p className="text-sm">{job.size || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">CLS</p>
                    <p className="text-sm">{job.cls || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Colors</p>
                    <p className="text-sm">{job.colors || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Paper</p>
                    <p className="text-sm">{job.paper || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Finishing Options</p>
                    <p className="text-sm">{job.finishingOptions || '-'}</p>
                  </div>
                  {job.jobSpecs && (
                    <div className="col-span-full">
                      <p className="text-sm font-medium text-muted-foreground">Additional Specifications</p>
                      <p className="text-sm">{job.jobSpecs}</p>
                    </div>
                  )}
                  {job.machineIds && job.machineIds.length > 0 && (
                    <div className="col-span-full">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Machines</p>
                      <div className="flex flex-wrap gap-2">
                        {job.machineIds.map(machineId => {
                          const machine = machines.find(m => m.id === machineId);
                          return machine ? (
                            <Badge key={machineId} variant="secondary">
                              {machine.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Pre-Press */}
          <Collapsible open={openSections.prePress}>
            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Pre-Press Specifications" section="prePress" />
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Artwork Received</p>
                    <p className="text-sm">{prePressSpecs.artworkReceived || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Proof Sent</p>
                    <p className="text-sm">{prePressSpecs.proofSent || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Proof Approved</p>
                    <p className="text-sm">{prePressSpecs.proofApproved || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Plate Making</p>
                    <p className="text-sm">{prePressSpecs.plateMaking || '-'}</p>
                  </div>
                  {prePressSpecs.notes && (
                    <div className="col-span-full">
                      <p className="text-sm font-medium text-muted-foreground">Notes</p>
                      <p className="text-sm">{prePressSpecs.notes}</p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Printing Info */}
          <Collapsible open={openSections.printing}>
            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Printing Information" section="printing" />
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Machine</p>
                    <p className="text-sm">{printingInfo.machine || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Forms</p>
                    <p className="text-sm">{printingInfo.forms || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ups</p>
                    <p className="text-sm">{printingInfo.ups || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Print Run</p>
                    <p className="text-sm">{printingInfo.printRun || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sheets Required</p>
                    <p className="text-sm">{printingInfo.sheetsRequired || '-'}</p>
                  </div>
                  {printingInfo.notes && (
                    <div className="col-span-full">
                      <p className="text-sm font-medium text-muted-foreground">Notes</p>
                      <p className="text-sm">{printingInfo.notes}</p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Additional Process */}
          <Collapsible open={openSections.additionalProcess}>
            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Additional Process" section="additionalProcess" />
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Lamination</p>
                    <p className="text-sm">{additionalProcess.lamination || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">UV Coating</p>
                    <p className="text-sm">{additionalProcess.uvCoating || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Foiling</p>
                    <p className="text-sm">{additionalProcess.foiling || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Embossing</p>
                    <p className="text-sm">{additionalProcess.embossing || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Die Cutting</p>
                    <p className="text-sm">{additionalProcess.dieCutting || '-'}</p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Cutting Slip */}
          <Collapsible open={openSections.cutting}>
            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Cutting Slip" section="cutting" />
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cut Size</p>
                    <p className="text-sm">{cuttingSlip.cutSize || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                    <p className="text-sm">{cuttingSlip.quantity || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sections</p>
                    <p className="text-sm">{cuttingSlip.sections || '-'}</p>
                  </div>
                  {cuttingSlip.notes && (
                    <div className="col-span-full">
                      <p className="text-sm font-medium text-muted-foreground">Notes</p>
                      <p className="text-sm">{cuttingSlip.notes}</p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Delivery */}
          <Collapsible open={openSections.delivery}>
            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Customer Delivery" section="delivery" />
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact</p>
                    <p className="text-sm">{customerDelivery.contact || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="text-sm">{customerDelivery.address || '-'}</p>
                  </div>
                  {customerDelivery.instructions && (
                    <div className="col-span-full">
                      <p className="text-sm font-medium text-muted-foreground">Instructions</p>
                      <p className="text-sm">{customerDelivery.instructions}</p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Items */}
          {items.length > 0 && (
            <Collapsible open={openSections.items}>
              <Card>
                <CardHeader className="pb-2">
                  <SectionHeader title="Items" section="items" />
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Sr.</TableHead>
                            <TableHead>Particulars</TableHead>
                            <TableHead className="w-20">Qty</TableHead>
                            <TableHead className="w-20">Unit</TableHead>
                            <TableHead className="w-24">Rate</TableHead>
                            <TableHead className="w-24">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{item.srNo || index + 1}</TableCell>
                              <TableCell>{item.particulars || '-'}</TableCell>
                              <TableCell>{item.quantity || '-'}</TableCell>
                              <TableCell>{item.unit || '-'}</TableCell>
                              <TableCell>{item.rate || '-'}</TableCell>
                              <TableCell>{item.amount || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Party/Press Remarks */}
          {job.partyPressRemarks && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Party/Press Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{job.partyPressRemarks}</p>
              </CardContent>
            </Card>
          )}

          {/* PO File */}
          {job.poFileUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Purchase Order (PO)</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(job.poFileUrl!, '_blank')}
                  data-testid="button-view-po"
                >
                  <Download className="h-4 w-4 mr-2" />
                  View/Download PO
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Job Timeline Visualization */}
      <JobTimelineVisualization
        jobId={id}
        onAssignTask={handleAssignTask}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Task Assignment Modal */}
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
