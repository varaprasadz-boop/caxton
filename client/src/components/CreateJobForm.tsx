import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertJobSchema, type InsertJob, type Client, type Machine, type Department, type ProductCategory, JOB_TYPES, type StageDeadlines } from "@shared/schema";
import { z } from "zod";
import { Calendar, User, Upload, FileText, X, ChevronDown, Plus, Trash2 } from "lucide-react";
import StageDeadlineAllocation from "@/components/StageTimeAllocation";

interface JobItem {
  srNo: number;
  particulars: string;
  quantity: string;
  unit: string;
  rate: string;
  amount: string;
}

interface CreateJobFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateJobForm({ onSuccess, onCancel }: CreateJobFormProps) {
  const getDefaultDeadline = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  const [formData, setFormData] = useState<InsertJob>({
    clientId: "",
    jobType: "",
    description: "",
    quantity: 0,
    size: "",
    colors: "",
    finishingOptions: "",
    deadline: getDefaultDeadline(),
    status: "pending",
    stageDeadlines: {},
    machineIds: [],
    productCategoryId: "",
    jobName: "",
    jobSpecs: "",
    orderDate: undefined,
    scheduleDate: undefined,
    cls: "",
    paper: "",
    prePressSpecs: {},
    printingInfo: {},
    additionalProcess: {},
    cuttingSlip: {},
    customerDelivery: {},
    items: [],
    partyPressRemarks: ""
  });

  const [items, setItems] = useState<JobItem[]>([
    { srNo: 1, particulars: "", quantity: "", unit: "", rate: "", amount: "" }
  ]);

  const [openSections, setOpenSections] = useState({
    basic: true,
    specifications: true,
    prePress: false,
    printing: false,
    additionalProcess: false,
    cuttingSlip: false,
    delivery: false,
    items: false,
    machines: false,
    poFile: false,
    stageAllocation: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingPO, setUploadingPO] = useState(false);
  const [poFile, setPOFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"]
  });

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ["/api/machines"]
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"]
  });

  const { data: productCategories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"]
  });

  const machinesByDepartment = machines.reduce((acc, machine) => {
    const deptId = machine.departmentId;
    if (!acc[deptId]) {
      acc[deptId] = [];
    }
    acc[deptId].push(machine);
    return acc;
  }, {} as Record<string, Machine[]>);

  const uploadPOFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload PO file');
    }
    
    const result = await response.json();
    return result.url;
  };

  const createJobMutation = useMutation({
    mutationFn: async (data: InsertJob) => {
      let poFileUrl: string | undefined = undefined;
      
      if (poFile) {
        setUploadingPO(true);
        try {
          poFileUrl = await uploadPOFile(poFile);
        } catch (error) {
          setUploadingPO(false);
          throw new Error('Failed to upload PO file: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
        setUploadingPO(false);
      }
      
      const payload: any = {
        ...data,
        deadline: data.deadline.toISOString(),
        orderDate: data.orderDate ? data.orderDate.toISOString() : null,
        scheduleDate: data.scheduleDate ? data.scheduleDate.toISOString() : null,
        items: items.filter(item => item.particulars.trim() !== "")
      };
      
      if (poFileUrl) {
        payload.poFileUrl = poFileUrl;
      }
      
      const res = await apiRequest("POST", "/api/jobs", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/jobs"] });
      
      setPOFile(null);
      setUploadingPO(false);
      
      toast({
        title: "Job created",
        description: poFile 
          ? "New printing job has been created with PO file and automated workflow tasks."
          : "New printing job has been created with automated workflow tasks.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create job.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validatedData = insertJobSchema.parse({
        ...formData,
        deadline: formData.deadline
      });
      createJobMutation.mutate(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  const handleChange = (field: keyof InsertJob) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    let value: any = e.target.value;
    if (field === "quantity") {
      value = parseInt(value) || 0;
    } else if (field === "deadline" || field === "orderDate" || field === "scheduleDate") {
      value = e.target.value ? new Date(e.target.value) : null;
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSelectChange = (field: keyof InsertJob) => (value: string) => {
    const updates: Partial<InsertJob> = { [field]: value };
    
    if (field === 'jobType') {
      updates.stageDeadlines = {};
    }
    
    setFormData(prev => ({ ...prev, ...updates }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleJsonFieldChange = (section: 'prePressSpecs' | 'printingInfo' | 'additionalProcess' | 'cuttingSlip' | 'customerDelivery', field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, any> || {}),
        [field]: e.target.value
      }
    }));
  };

  const handleStageDeadlinesChange = (deadlines: StageDeadlines) => {
    setFormData(prev => ({ ...prev, stageDeadlines: deadlines }));
  };

  const toggleMachine = (machineId: string) => {
    setFormData(prev => {
      const currentMachineIds = prev.machineIds || [];
      const isSelected = currentMachineIds.includes(machineId);
      
      return {
        ...prev,
        machineIds: isSelected
          ? currentMachineIds.filter(id => id !== machineId)
          : [...currentMachineIds, machineId]
      };
    });
  };

  const handlePOFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, poFile: 'Please upload a PDF, JPG, or PNG file' }));
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, poFile: 'File size must be less than 5MB' }));
        return;
      }
      
      setPOFile(file);
      setErrors(prev => ({ ...prev, poFile: '' }));
    }
  };

  const removePOFile = () => {
    setPOFile(null);
    setErrors(prev => ({ ...prev, poFile: '' }));
  };

  const formatDateForInput = (date: Date | null) => {
    if (!date || isNaN(date.getTime())) {
      return "";
    }
    return date.toISOString().split('T')[0];
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { srNo: prev.length + 1, particulars: "", quantity: "", unit: "", rate: "", amount: "" }
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, srNo: i + 1 })));
    }
  };

  const updateItem = (index: number, field: keyof JobItem, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'quantity' || field === 'rate') {
        const qty = parseFloat(updated[index].quantity) || 0;
        const rate = parseFloat(updated[index].rate) || 0;
        updated[index].amount = (qty * rate).toFixed(2);
      }
      
      return updated;
    });
  };

  const selectedClient = clients.find(c => c.id === formData.clientId);

  const SectionHeader = ({ title, section }: { title: string; section: keyof typeof openSections }) => (
    <CollapsibleTrigger 
      className="flex w-full items-center justify-between py-2 text-sm font-medium hover-elevate rounded-md px-2"
      onClick={() => toggleSection(section)}
    >
      <span>{title}</span>
      <ChevronDown className={`h-4 w-4 transition-transform ${openSections[section] ? 'rotate-180' : ''}`} />
    </CollapsibleTrigger>
  );

  return (
    <Card className="w-full max-w-4xl" data-testid="card-create-job">
      <CardHeader>
        <CardTitle>Create New Job</CardTitle>
        <CardDescription>
          Set up a new printing job with automatic workflow generation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Basic Information Section */}
          <Collapsible open={openSections.basic}>
            <div className="border rounded-lg p-4">
              <SectionHeader title="Basic Information" section="basic" />
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client *</Label>
                    <Select value={formData.clientId} onValueChange={handleSelectChange("clientId")}>
                      <SelectTrigger data-testid="select-job-client">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {client.name} - {client.company}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.clientId && (
                      <p className="text-sm text-destructive">{errors.clientId}</p>
                    )}
                    {selectedClient && (
                      <p className="text-xs text-muted-foreground">
                        {selectedClient.email} • {selectedClient.phone}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="productCategoryId">Product Category</Label>
                    <Select value={formData.productCategoryId || ""} onValueChange={handleSelectChange("productCategoryId")}>
                      <SelectTrigger data-testid="select-product-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {productCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobName">Job Name</Label>
                    <Input
                      id="jobName"
                      value={formData.jobName || ""}
                      onChange={handleChange("jobName")}
                      placeholder="e.g., Annual Report 2025"
                      data-testid="input-job-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobType">Job Type *</Label>
                    <Select value={formData.jobType} onValueChange={handleSelectChange("jobType")}>
                      <SelectTrigger data-testid="select-job-type">
                        <SelectValue placeholder="Select job type" />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.jobType && (
                      <p className="text-sm text-destructive">{errors.jobType}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderDate">Order Date</Label>
                    <Input
                      id="orderDate"
                      type="date"
                      value={formatDateForInput(formData.orderDate || null)}
                      onChange={handleChange("orderDate")}
                      data-testid="input-order-date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduleDate">Schedule Date</Label>
                    <Input
                      id="scheduleDate"
                      type="date"
                      value={formatDateForInput(formData.scheduleDate || null)}
                      onChange={handleChange("scheduleDate")}
                      data-testid="input-schedule-date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline">Delivery Deadline *</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formatDateForInput(formData.deadline)}
                      onChange={handleChange("deadline")}
                      min={formatDateForInput(new Date())}
                      data-testid="input-job-deadline"
                    />
                    {errors.deadline && (
                      <p className="text-sm text-destructive">{errors.deadline}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Job Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={handleChange("description")}
                    placeholder="Describe the printing job requirements..."
                    rows={2}
                    data-testid="textarea-job-description"
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Specifications Section */}
          <Collapsible open={openSections.specifications}>
            <div className="border rounded-lg p-4">
              <SectionHeader title="Specifications & Quantity" section="specifications" />
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity || ""}
                      onChange={handleChange("quantity")}
                      placeholder="1000"
                      data-testid="input-job-quantity"
                    />
                    {errors.quantity && (
                      <p className="text-sm text-destructive">{errors.quantity}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="size">Size/Dimensions</Label>
                    <Input
                      id="size"
                      value={formData.size || ""}
                      onChange={handleChange("size")}
                      placeholder="A4, 10x15cm, etc."
                      data-testid="input-job-size"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cls">CLS</Label>
                    <Input
                      id="cls"
                      value={formData.cls || ""}
                      onChange={handleChange("cls")}
                      placeholder="CLS specification"
                      data-testid="input-job-cls"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="colors">Colors</Label>
                    <Input
                      id="colors"
                      value={formData.colors || ""}
                      onChange={handleChange("colors")}
                      placeholder="4-color, CMYK, etc."
                      data-testid="input-job-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paper">Paper</Label>
                    <Input
                      id="paper"
                      value={formData.paper || ""}
                      onChange={handleChange("paper")}
                      placeholder="Art Paper 130gsm"
                      data-testid="input-job-paper"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="finishingOptions">Finishing Options</Label>
                    <Input
                      id="finishingOptions"
                      value={formData.finishingOptions || ""}
                      onChange={handleChange("finishingOptions")}
                      placeholder="Matte, UV coating, etc."
                      data-testid="input-job-finishing"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobSpecs">Job Specifications (Details)</Label>
                  <Textarea
                    id="jobSpecs"
                    value={formData.jobSpecs || ""}
                    onChange={handleChange("jobSpecs")}
                    placeholder="Detailed job specifications..."
                    rows={2}
                    data-testid="textarea-job-specs"
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Pre-Press Section */}
          <Collapsible open={openSections.prePress}>
            <div className="border rounded-lg p-4">
              <SectionHeader title="Pre-Press Specifications" section="prePress" />
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Artwork Received</Label>
                    <Input
                      value={(formData.prePressSpecs as any)?.artworkReceived || ""}
                      onChange={handleJsonFieldChange('prePressSpecs', 'artworkReceived')}
                      placeholder="Date or status"
                      data-testid="input-prepress-artwork"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Proof Sent</Label>
                    <Input
                      value={(formData.prePressSpecs as any)?.proofSent || ""}
                      onChange={handleJsonFieldChange('prePressSpecs', 'proofSent')}
                      placeholder="Date or status"
                      data-testid="input-prepress-proof"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Proof Approved</Label>
                    <Input
                      value={(formData.prePressSpecs as any)?.proofApproved || ""}
                      onChange={handleJsonFieldChange('prePressSpecs', 'proofApproved')}
                      placeholder="Date or status"
                      data-testid="input-prepress-approved"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plate Making</Label>
                    <Input
                      value={(formData.prePressSpecs as any)?.plateMaking || ""}
                      onChange={handleJsonFieldChange('prePressSpecs', 'plateMaking')}
                      placeholder="Plate specifications"
                      data-testid="input-prepress-plate"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Pre-Press Notes</Label>
                  <Textarea
                    value={(formData.prePressSpecs as any)?.notes || ""}
                    onChange={handleJsonFieldChange('prePressSpecs', 'notes')}
                    placeholder="Additional pre-press notes..."
                    rows={2}
                    data-testid="textarea-prepress-notes"
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Printing Section */}
          <Collapsible open={openSections.printing}>
            <div className="border rounded-lg p-4">
              <SectionHeader title="Printing Information" section="printing" />
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Machine</Label>
                    <Input
                      value={(formData.printingInfo as any)?.machine || ""}
                      onChange={handleJsonFieldChange('printingInfo', 'machine')}
                      placeholder="Printing machine"
                      data-testid="input-printing-machine"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Forms</Label>
                    <Input
                      value={(formData.printingInfo as any)?.forms || ""}
                      onChange={handleJsonFieldChange('printingInfo', 'forms')}
                      placeholder="Number of forms"
                      data-testid="input-printing-forms"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ups</Label>
                    <Input
                      value={(formData.printingInfo as any)?.ups || ""}
                      onChange={handleJsonFieldChange('printingInfo', 'ups')}
                      placeholder="Ups per sheet"
                      data-testid="input-printing-ups"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Print Run</Label>
                    <Input
                      value={(formData.printingInfo as any)?.printRun || ""}
                      onChange={handleJsonFieldChange('printingInfo', 'printRun')}
                      placeholder="Print run quantity"
                      data-testid="input-printing-run"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sheets Required</Label>
                    <Input
                      value={(formData.printingInfo as any)?.sheetsRequired || ""}
                      onChange={handleJsonFieldChange('printingInfo', 'sheetsRequired')}
                      placeholder="Number of sheets"
                      data-testid="input-printing-sheets"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Printing Notes</Label>
                  <Textarea
                    value={(formData.printingInfo as any)?.notes || ""}
                    onChange={handleJsonFieldChange('printingInfo', 'notes')}
                    placeholder="Additional printing notes..."
                    rows={2}
                    data-testid="textarea-printing-notes"
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Additional Process Section */}
          <Collapsible open={openSections.additionalProcess}>
            <div className="border rounded-lg p-4">
              <SectionHeader title="Additional Process" section="additionalProcess" />
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Lamination</Label>
                    <Input
                      value={(formData.additionalProcess as any)?.lamination || ""}
                      onChange={handleJsonFieldChange('additionalProcess', 'lamination')}
                      placeholder="Lamination type"
                      data-testid="input-additional-lamination"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>UV Coating</Label>
                    <Input
                      value={(formData.additionalProcess as any)?.uvCoating || ""}
                      onChange={handleJsonFieldChange('additionalProcess', 'uvCoating')}
                      placeholder="UV coating details"
                      data-testid="input-additional-uv"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Foiling</Label>
                    <Input
                      value={(formData.additionalProcess as any)?.foiling || ""}
                      onChange={handleJsonFieldChange('additionalProcess', 'foiling')}
                      placeholder="Foiling specifications"
                      data-testid="input-additional-foiling"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Embossing</Label>
                    <Input
                      value={(formData.additionalProcess as any)?.embossing || ""}
                      onChange={handleJsonFieldChange('additionalProcess', 'embossing')}
                      placeholder="Embossing details"
                      data-testid="input-additional-embossing"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Die Cutting</Label>
                    <Input
                      value={(formData.additionalProcess as any)?.dieCutting || ""}
                      onChange={handleJsonFieldChange('additionalProcess', 'dieCutting')}
                      placeholder="Die cutting specifications"
                      data-testid="input-additional-die"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Cutting Slip Section */}
          <Collapsible open={openSections.cuttingSlip}>
            <div className="border rounded-lg p-4">
              <SectionHeader title="Cutting Slip" section="cuttingSlip" />
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Cut Size</Label>
                    <Input
                      value={(formData.cuttingSlip as any)?.cutSize || ""}
                      onChange={handleJsonFieldChange('cuttingSlip', 'cutSize')}
                      placeholder="Cut size dimensions"
                      data-testid="input-cutting-size"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      value={(formData.cuttingSlip as any)?.quantity || ""}
                      onChange={handleJsonFieldChange('cuttingSlip', 'quantity')}
                      placeholder="Cutting quantity"
                      data-testid="input-cutting-quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sections</Label>
                    <Input
                      value={(formData.cuttingSlip as any)?.sections || ""}
                      onChange={handleJsonFieldChange('cuttingSlip', 'sections')}
                      placeholder="Number of sections"
                      data-testid="input-cutting-sections"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cutting Notes</Label>
                  <Textarea
                    value={(formData.cuttingSlip as any)?.notes || ""}
                    onChange={handleJsonFieldChange('cuttingSlip', 'notes')}
                    placeholder="Additional cutting instructions..."
                    rows={2}
                    data-testid="textarea-cutting-notes"
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Delivery Section */}
          <Collapsible open={openSections.delivery}>
            <div className="border rounded-lg p-4">
              <SectionHeader title="Customer Delivery" section="delivery" />
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Delivery Address</Label>
                    <Textarea
                      value={(formData.customerDelivery as any)?.address || ""}
                      onChange={handleJsonFieldChange('customerDelivery', 'address')}
                      placeholder="Delivery address"
                      rows={2}
                      data-testid="textarea-delivery-address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Contact</Label>
                    <Input
                      value={(formData.customerDelivery as any)?.contact || ""}
                      onChange={handleJsonFieldChange('customerDelivery', 'contact')}
                      placeholder="Contact person & number"
                      data-testid="input-delivery-contact"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Delivery Instructions</Label>
                  <Textarea
                    value={(formData.customerDelivery as any)?.instructions || ""}
                    onChange={handleJsonFieldChange('customerDelivery', 'instructions')}
                    placeholder="Special delivery instructions..."
                    rows={2}
                    data-testid="textarea-delivery-instructions"
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Items Section */}
          <Collapsible open={openSections.items}>
            <div className="border rounded-lg p-4">
              <SectionHeader title="Items (Line Items)" section="items" />
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 w-12">Sr.</th>
                        <th className="text-left p-2">Particulars</th>
                        <th className="text-left p-2 w-24">Qty</th>
                        <th className="text-left p-2 w-20">Unit</th>
                        <th className="text-left p-2 w-24">Rate</th>
                        <th className="text-left p-2 w-24">Amount</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-b" data-testid={`row-item-${index}`}>
                          <td className="p-2">{item.srNo}</td>
                          <td className="p-2">
                            <Input
                              value={item.particulars}
                              onChange={(e) => updateItem(index, 'particulars', e.target.value)}
                              placeholder="Item description"
                              data-testid={`input-item-particulars-${index}`}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                              placeholder="0"
                              data-testid={`input-item-quantity-${index}`}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={item.unit}
                              onChange={(e) => updateItem(index, 'unit', e.target.value)}
                              placeholder="pcs"
                              data-testid={`input-item-unit-${index}`}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateItem(index, 'rate', e.target.value)}
                              placeholder="0.00"
                              data-testid={`input-item-rate-${index}`}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={item.amount}
                              readOnly
                              className="bg-muted"
                              data-testid={`input-item-amount-${index}`}
                            />
                          </td>
                          <td className="p-2">
                            {items.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                                data-testid={`button-remove-item-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Machines Section */}
          {machines.length > 0 && (
            <Collapsible open={openSections.machines}>
              <div className="border rounded-lg p-4">
                <SectionHeader title="Machine Selection" section="machines" />
                <CollapsibleContent className="pt-4 space-y-4">
                  {departments.map((dept) => {
                    const deptMachines = machinesByDepartment[dept.id] || [];
                    if (deptMachines.length === 0) return null;
                    
                    return (
                      <div key={dept.id} className="space-y-2" data-testid={`department-group-${dept.id}`}>
                        <h4 className="text-sm font-medium text-muted-foreground">{dept.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-4">
                          {deptMachines.map((machine) => (
                            <div key={machine.id} className="flex items-center space-x-2" data-testid={`checkbox-container-machine-${machine.id}`}>
                              <Checkbox
                                id={`machine-${machine.id}`}
                                checked={(formData.machineIds || []).includes(machine.id)}
                                onCheckedChange={() => toggleMachine(machine.id)}
                                data-testid={`checkbox-machine-${machine.id}`}
                              />
                              <Label
                                htmlFor={`machine-${machine.id}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {machine.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {(formData.machineIds || []).length > 0 && (
                    <p className="text-xs text-muted-foreground" data-testid="text-selected-machines-count">
                      {(formData.machineIds || []).length} machine(s) selected
                    </p>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* PO File Upload Section */}
          <Collapsible open={openSections.poFile}>
            <div className="border rounded-lg p-4">
              <SectionHeader title="Purchase Order (PO) File" section="poFile" />
              <CollapsibleContent className="pt-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  {!poFile ? (
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Upload PO file (PDF, JPG, PNG)
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handlePOFileChange}
                          className="hidden"
                          id="po-file-upload"
                          data-testid="input-po-file"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('po-file-upload')?.click()}
                          data-testid="button-upload-po"
                        >
                          Choose File
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">{poFile.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(poFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removePOFile}
                        data-testid="button-remove-po"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {errors.poFile && (
                  <p className="text-sm text-destructive mt-2">{errors.poFile}</p>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Stage Time Allocation */}
          {formData.jobType && (
            <Collapsible open={openSections.stageAllocation}>
              <div className="border rounded-lg p-4">
                <SectionHeader title="Stage Time Allocation" section="stageAllocation" />
                <CollapsibleContent className="pt-4">
                  <StageDeadlineAllocation
                    jobType={formData.jobType}
                    stageDeadlines={formData.stageDeadlines || {}}
                    deliveryDeadline={formData.deadline}
                    onDeadlinesChange={handleStageDeadlinesChange}
                  />
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Party/Press Remarks */}
          <div className="space-y-2">
            <Label htmlFor="partyPressRemarks">Party/Press Remarks</Label>
            <Textarea
              id="partyPressRemarks"
              value={formData.partyPressRemarks || ""}
              onChange={handleChange("partyPressRemarks")}
              placeholder="Additional remarks from party or press..."
              rows={2}
              data-testid="textarea-party-press-remarks"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={createJobMutation.isPending || uploadingPO}
              data-testid="button-submit-job"
            >
              {uploadingPO 
                ? "Uploading PO File..." 
                : createJobMutation.isPending 
                  ? "Creating Job..." 
                  : "Create Job & Generate Tasks"
              }
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                data-testid="button-cancel-job"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
