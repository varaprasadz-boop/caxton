import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Job, JOB_STATUSES } from "@shared/schema";
import { format } from "date-fns";

interface EditJobDialogProps {
  job: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return format(d, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export default function EditJobDialog({ job, open, onOpenChange }: EditJobDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const prePressSpecs = (job.prePressSpecs as any) || {};
  const printingInfo = (job.printingInfo as any) || {};
  const additionalProcess = (job.additionalProcess as any) || {};
  const cuttingSlip = (job.cuttingSlip as any) || {};
  const customerDelivery = (job.customerDelivery as any) || {};

  const [basic, setBasic] = useState({
    jobName: job.jobName || "",
    description: job.description || "",
    status: job.status || "pending",
    orderDate: formatDateForInput(job.orderDate),
    scheduleDate: formatDateForInput(job.scheduleDate),
    deadline: formatDateForInput(job.deadline),
  });

  const [specs, setSpecs] = useState({
    quantity: String(job.quantity || ""),
    size: job.size || "",
    cls: job.cls || "",
    colors: job.colors || "",
    paper: job.paper || "",
    finishingOptions: job.finishingOptions || "",
    jobSpecs: job.jobSpecs || "",
    upNumber: (job as any).upNumber || "",
  });

  const [additional, setAdditional] = useState({
    lamination: additionalProcess.lamination || "",
    uvCoating: additionalProcess.uvCoating || "",
    foiling: additionalProcess.foiling || "",
    embossing: additionalProcess.embossing || "",
    dieCutting: additionalProcess.dieCutting || "",
    folding: additionalProcess.folding || "",
    foldingSize: additionalProcess.foldingSize || "",
  });

  const [cutting, setCutting] = useState({
    paperSize: cuttingSlip.paperSize || "",
    cutSize: cuttingSlip.cutSize || "",
    issueSheets: cuttingSlip.issueSheets || "",
    notes: cuttingSlip.notes || "",
  });

  const [printing, setPrinting] = useState({
    machine: printingInfo.machine || "",
    issuedSheets: printingInfo.issuedSheets || "",
    printedSheets: printingInfo.printedSheets || "",
    wastage: printingInfo.wastage || "",
    notes: printingInfo.notes || "",
  });

  const [prePress, setPrePress] = useState({
    artworkReceived: prePressSpecs.artworkReceived || "",
    proofSent: prePressSpecs.proofSent || "",
    proofApproved: prePressSpecs.proofApproved || "",
    plateMaking: prePressSpecs.plateMaking || "",
    notes: prePressSpecs.notes || "",
  });

  const [delivery, setDelivery] = useState({
    address: customerDelivery.address || "",
    contact: customerDelivery.contact || "",
    instructions: customerDelivery.instructions || "",
  });

  const [partyPressRemarks, setPartyPressRemarks] = useState(job.partyPressRemarks || "");

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/jobs/${job.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", job.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-log"] });
      toast({
        title: "Job Updated",
        description: "Job information has been saved successfully.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update job. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const payload: any = {
      jobName: basic.jobName,
      description: basic.description,
      status: basic.status,
      quantity: parseInt(specs.quantity) || job.quantity,
      size: specs.size,
      cls: specs.cls,
      colors: specs.colors,
      paper: specs.paper,
      finishingOptions: specs.finishingOptions,
      jobSpecs: specs.jobSpecs,
      upNumber: specs.upNumber,
      partyPressRemarks,
      additionalProcess: additional,
      cuttingSlip: cutting,
      printingInfo: printing,
      prePressSpecs: prePress,
      customerDelivery: delivery,
    };

    if (basic.orderDate) payload.orderDate = basic.orderDate;
    if (basic.scheduleDate) payload.scheduleDate = basic.scheduleDate;
    if (basic.deadline) payload.deadline = basic.deadline;

    updateMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-job">
        <DialogHeader>
          <DialogTitle>Edit Job — {job.jobName || `#${job.jobNumber}`}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="basic" data-testid="tab-basic">Basic Info</TabsTrigger>
            <TabsTrigger value="specs" data-testid="tab-specs">Specs</TabsTrigger>
            <TabsTrigger value="additional" data-testid="tab-additional">Additional Process</TabsTrigger>
            <TabsTrigger value="cutting" data-testid="tab-cutting">Cutting</TabsTrigger>
            <TabsTrigger value="printing" data-testid="tab-printing">Printing</TabsTrigger>
            <TabsTrigger value="prepress" data-testid="tab-prepress">Pre-Press</TabsTrigger>
            <TabsTrigger value="delivery" data-testid="tab-delivery">Delivery</TabsTrigger>
          </TabsList>

          {/* Basic Info */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Name</Label>
                <Input
                  value={basic.jobName}
                  onChange={e => setBasic(p => ({ ...p, jobName: e.target.value }))}
                  data-testid="input-edit-job-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={basic.status} onValueChange={v => setBasic(p => ({ ...p, status: v }))}>
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Order Date</Label>
                <Input type="date" value={basic.orderDate} onChange={e => setBasic(p => ({ ...p, orderDate: e.target.value }))} data-testid="input-edit-order-date" />
              </div>
              <div className="space-y-2">
                <Label>Schedule Date</Label>
                <Input type="date" value={basic.scheduleDate} onChange={e => setBasic(p => ({ ...p, scheduleDate: e.target.value }))} data-testid="input-edit-schedule-date" />
              </div>
              <div className="space-y-2">
                <Label>Delivery Deadline</Label>
                <Input type="date" value={basic.deadline} onChange={e => setBasic(p => ({ ...p, deadline: e.target.value }))} data-testid="input-edit-deadline" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={basic.description}
                onChange={e => setBasic(p => ({ ...p, description: e.target.value }))}
                rows={3}
                data-testid="textarea-edit-description"
              />
            </div>
          </TabsContent>

          {/* Specs & Quantity */}
          <TabsContent value="specs" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={specs.quantity} onChange={e => setSpecs(p => ({ ...p, quantity: e.target.value }))} data-testid="input-edit-quantity" />
              </div>
              <div className="space-y-2">
                <Label>Size/Dimensions</Label>
                <Input value={specs.size} onChange={e => setSpecs(p => ({ ...p, size: e.target.value }))} data-testid="input-edit-size" />
              </div>
              <div className="space-y-2">
                <Label>CLS</Label>
                <Input value={specs.cls} onChange={e => setSpecs(p => ({ ...p, cls: e.target.value }))} data-testid="input-edit-cls" />
              </div>
              <div className="space-y-2">
                <Label>Colors</Label>
                <Input value={specs.colors} onChange={e => setSpecs(p => ({ ...p, colors: e.target.value }))} data-testid="input-edit-colors" />
              </div>
              <div className="space-y-2">
                <Label>Paper</Label>
                <Input value={specs.paper} onChange={e => setSpecs(p => ({ ...p, paper: e.target.value }))} data-testid="input-edit-paper" />
              </div>
              <div className="space-y-2">
                <Label>Finishing Options</Label>
                <Input value={specs.finishingOptions} onChange={e => setSpecs(p => ({ ...p, finishingOptions: e.target.value }))} data-testid="input-edit-finishing" />
              </div>
              <div className="space-y-2">
                <Label>Up Number</Label>
                <Input value={specs.upNumber} onChange={e => setSpecs(p => ({ ...p, upNumber: e.target.value }))} placeholder="e.g. 4" data-testid="input-edit-up-number" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea value={specs.jobSpecs} onChange={e => setSpecs(p => ({ ...p, jobSpecs: e.target.value }))} rows={3} data-testid="textarea-edit-job-specs" />
            </div>
          </TabsContent>

          {/* Additional Process */}
          <TabsContent value="additional" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lamination</Label>
                <Input value={additional.lamination} onChange={e => setAdditional(p => ({ ...p, lamination: e.target.value }))} data-testid="input-edit-lamination" />
              </div>
              <div className="space-y-2">
                <Label>UV Coating</Label>
                <Input value={additional.uvCoating} onChange={e => setAdditional(p => ({ ...p, uvCoating: e.target.value }))} data-testid="input-edit-uv-coating" />
              </div>
              <div className="space-y-2">
                <Label>Foiling</Label>
                <Input value={additional.foiling} onChange={e => setAdditional(p => ({ ...p, foiling: e.target.value }))} data-testid="input-edit-foiling" />
              </div>
              <div className="space-y-2">
                <Label>Embossing</Label>
                <Input value={additional.embossing} onChange={e => setAdditional(p => ({ ...p, embossing: e.target.value }))} data-testid="input-edit-embossing" />
              </div>
              <div className="space-y-2">
                <Label>Die Cutting</Label>
                <Input value={additional.dieCutting} onChange={e => setAdditional(p => ({ ...p, dieCutting: e.target.value }))} data-testid="input-edit-die-cutting" />
              </div>
              <div className="space-y-2">
                <Label>Folding</Label>
                <Input value={additional.folding} onChange={e => setAdditional(p => ({ ...p, folding: e.target.value }))} placeholder="e.g. Half fold, Tri-fold" data-testid="input-edit-folding" />
              </div>
              <div className="space-y-2">
                <Label>Folding Size</Label>
                <Input value={additional.foldingSize} onChange={e => setAdditional(p => ({ ...p, foldingSize: e.target.value }))} placeholder="e.g. A5, 148x210mm" data-testid="input-edit-folding-size" />
              </div>
            </div>
          </TabsContent>

          {/* Cutting */}
          <TabsContent value="cutting" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Paper Size</Label>
                <Input value={cutting.paperSize} onChange={e => setCutting(p => ({ ...p, paperSize: e.target.value }))} data-testid="input-edit-paper-size" />
              </div>
              <div className="space-y-2">
                <Label>Cut Size</Label>
                <Input value={cutting.cutSize} onChange={e => setCutting(p => ({ ...p, cutSize: e.target.value }))} data-testid="input-edit-cut-size" />
              </div>
              <div className="space-y-2">
                <Label>Issue Sheets</Label>
                <Input value={cutting.issueSheets} onChange={e => setCutting(p => ({ ...p, issueSheets: e.target.value }))} data-testid="input-edit-issue-sheets" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea value={cutting.notes} onChange={e => setCutting(p => ({ ...p, notes: e.target.value }))} rows={3} data-testid="textarea-edit-cutting-notes" />
            </div>
          </TabsContent>

          {/* Printing Information */}
          <TabsContent value="printing" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Machine</Label>
                <Input value={printing.machine} onChange={e => setPrinting(p => ({ ...p, machine: e.target.value }))} data-testid="input-edit-print-machine" />
              </div>
              <div className="space-y-2">
                <Label>Issued Sheets</Label>
                <Input value={printing.issuedSheets} onChange={e => setPrinting(p => ({ ...p, issuedSheets: e.target.value }))} data-testid="input-edit-issued-sheets" />
              </div>
              <div className="space-y-2">
                <Label>Printed Sheets</Label>
                <Input value={printing.printedSheets} onChange={e => setPrinting(p => ({ ...p, printedSheets: e.target.value }))} data-testid="input-edit-printed-sheets" />
              </div>
              <div className="space-y-2">
                <Label>Wastage</Label>
                <Input value={printing.wastage} onChange={e => setPrinting(p => ({ ...p, wastage: e.target.value }))} data-testid="input-edit-wastage" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea value={printing.notes} onChange={e => setPrinting(p => ({ ...p, notes: e.target.value }))} rows={3} data-testid="textarea-edit-printing-notes" />
            </div>
          </TabsContent>

          {/* Pre-Press */}
          <TabsContent value="prepress" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Artwork Received</Label>
                <Input value={prePress.artworkReceived} onChange={e => setPrePress(p => ({ ...p, artworkReceived: e.target.value }))} data-testid="input-edit-artwork-received" />
              </div>
              <div className="space-y-2">
                <Label>Proof Sent</Label>
                <Input value={prePress.proofSent} onChange={e => setPrePress(p => ({ ...p, proofSent: e.target.value }))} data-testid="input-edit-proof-sent" />
              </div>
              <div className="space-y-2">
                <Label>Proof Approved</Label>
                <Input value={prePress.proofApproved} onChange={e => setPrePress(p => ({ ...p, proofApproved: e.target.value }))} data-testid="input-edit-proof-approved" />
              </div>
              <div className="space-y-2">
                <Label>Plate Making</Label>
                <Input value={prePress.plateMaking} onChange={e => setPrePress(p => ({ ...p, plateMaking: e.target.value }))} data-testid="input-edit-plate-making" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea value={prePress.notes} onChange={e => setPrePress(p => ({ ...p, notes: e.target.value }))} rows={3} data-testid="textarea-edit-prepress-notes" />
            </div>
          </TabsContent>

          {/* Customer Delivery */}
          <TabsContent value="delivery" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delivery Address</Label>
                <Textarea value={delivery.address} onChange={e => setDelivery(p => ({ ...p, address: e.target.value }))} rows={2} data-testid="textarea-edit-delivery-address" />
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input value={delivery.contact} onChange={e => setDelivery(p => ({ ...p, contact: e.target.value }))} data-testid="input-edit-delivery-contact" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Delivery Instructions</Label>
              <Textarea value={delivery.instructions} onChange={e => setDelivery(p => ({ ...p, instructions: e.target.value }))} rows={2} data-testid="textarea-edit-delivery-instructions" />
            </div>
            <div className="space-y-2">
              <Label>Party/Press Remarks</Label>
              <Textarea value={partyPressRemarks} onChange={e => setPartyPressRemarks(e.target.value)} rows={3} data-testid="textarea-edit-party-press-remarks" />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit-job">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-edit-job">
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
