import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertJobSchema, type InsertJob, type Client, type Machine, type Department, JOB_TYPES, type StageDeadlines } from "@shared/schema";
import { z } from "zod";
import { Calendar, User, Upload, FileText, X } from "lucide-react";
import StageDeadlineAllocation from "@/components/StageTimeAllocation";

interface CreateJobFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateJobForm({ onSuccess, onCancel }: CreateJobFormProps) {
  // Initialize with a valid future date (tomorrow)
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
    machineIds: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingPO, setUploadingPO] = useState(false);
  const [poFile, setPOFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch clients, machines, and departments for the dropdowns
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"]
  });

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ["/api/machines"]
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"]
  });

  // Group machines by department
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
      
      // Upload PO file first if provided
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
      
      // Create the payload, only including poFileUrl if it has a value
      const payload: any = {
        ...data,
        deadline: data.deadline.toISOString(),
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
      
      // Clear form state including PO file
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
    } else if (field === "deadline") {
      value = new Date(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSelectChange = (field: keyof InsertJob) => (value: string) => {
    const updates: Partial<InsertJob> = { [field]: value };
    
    // Reset stage deadlines when job type changes
    if (field === 'jobType') {
      updates.stageDeadlines = {};
    }
    
    setFormData(prev => ({ ...prev, ...updates }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
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
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, poFile: 'Please upload a PDF, JPG, or PNG file' }));
        return;
      }
      
      // Validate file size (5MB max)
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

  // Format date for input with validation
  const formatDateForInput = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      // Return tomorrow's date if invalid date provided
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  };

  const selectedClient = clients.find(c => c.id === formData.clientId);

  return (
    <Card className="w-full max-w-4xl" data-testid="card-create-job">
      <CardHeader>
        <CardTitle>Create New Job</CardTitle>
        <CardDescription>
          Set up a new printing job with automatic workflow generation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client and Job Type */}
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Job Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={handleChange("description")}
              placeholder="Describe the printing job requirements..."
              rows={3}
              data-testid="textarea-job-description"
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Quantity and Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size/Dimensions</Label>
              <Input
                id="size"
                value={formData.size || ""}
                onChange={handleChange("size")}
                placeholder="A4, 10x15cm, etc."
                data-testid="input-job-size"
              />
              {errors.size && (
                <p className="text-sm text-destructive">{errors.size}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="colors">Colors</Label>
              <Input
                id="colors"
                value={formData.colors || ""}
                onChange={handleChange("colors")}
                placeholder="4-color, CMYK, etc."
                data-testid="input-job-colors"
              />
              {errors.colors && (
                <p className="text-sm text-destructive">{errors.colors}</p>
              )}
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
              {errors.finishingOptions && (
                <p className="text-sm text-destructive">{errors.finishingOptions}</p>
              )}
            </div>
          </div>

          {/* Machine Selection */}
          {machines.length > 0 && (
            <div className="space-y-3">
              <Label>Select Machines (Optional)</Label>
              <div className="space-y-4">
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
              </div>
              {(formData.machineIds || []).length > 0 && (
                <p className="text-xs text-muted-foreground" data-testid="text-selected-machines-count">
                  {(formData.machineIds || []).length} machine(s) selected
                </p>
              )}
            </div>
          )}

          {/* PO File Upload */}
          <div className="space-y-2">
            <Label>Purchase Order (PO) File</Label>
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
              <p className="text-sm text-destructive">{errors.poFile}</p>
            )}
          </div>

          {/* Stage Time Allocation */}
          {formData.jobType && (
            <StageDeadlineAllocation
              jobType={formData.jobType}
              stageDeadlines={formData.stageDeadlines || {}}
              deliveryDeadline={formData.deadline}
              onDeadlinesChange={handleStageDeadlinesChange}
            />
          )}

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