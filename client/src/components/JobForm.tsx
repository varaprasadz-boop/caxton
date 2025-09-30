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
import { insertJobSchema, type InsertJob, type Job, type Client, type Machine, type Department, JOB_TYPES, type StageDeadlines, getDefaultStageDeadlines } from "@shared/schema";
import { z } from "zod";
import { Calendar, User } from "lucide-react";
import StageDeadlineAllocation from "./StageTimeAllocation";

interface JobFormProps {
  job?: Job; // If provided, we're editing; otherwise, we're creating
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function JobForm({ job, onSuccess, onCancel }: JobFormProps) {
  const isEditing = !!job;
  const [formData, setFormData] = useState<InsertJob>({
    clientId: job?.clientId || "",
    jobType: job?.jobType || "",
    description: job?.description || "",
    quantity: job?.quantity || 0,
    size: job?.size || "",
    colors: job?.colors || "",
    finishingOptions: job?.finishingOptions || "",
    deadline: job?.deadline ? new Date(job.deadline) : new Date(),
    stageDeadlines: (job?.stageDeadlines as StageDeadlines) || {},
    status: (job?.status as any) || "pending",
    machineIds: job?.machineIds || []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
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

  const mutation = useMutation({
    mutationFn: async (data: InsertJob) => {
      const method = isEditing ? "PATCH" : "POST";
      const url = isEditing ? `/api/jobs/${job!.id}` : "/api/jobs";
      
      const res = await apiRequest(method, url, {
        ...data,
        deadline: data.deadline.toISOString()
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/jobs"] });
      if (isEditing && job) {
        queryClient.invalidateQueries({ queryKey: ["/api/jobs", job.id] });
      }
      toast({
        title: isEditing ? "Job updated" : "Job created",
        description: isEditing 
          ? "Job has been updated successfully." 
          : "New printing job has been created with automated workflow tasks.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} job.`,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      let validatedData;
      if (isEditing) {
        // For editing, send all current form data
        validatedData = insertJobSchema.parse(formData);
      } else {
        // For creating, validate all required fields
        validatedData = insertJobSchema.parse(formData);
      }
      mutation.mutate(validatedData);
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
    setFormData(prev => ({ ...prev, [field]: value }));
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

  // Auto-populate default stage deadlines when job type changes (for new jobs only)
  useEffect(() => {
    if (!isEditing && formData.jobType && Object.keys(formData.stageDeadlines || {}).length === 0) {
      const defaultDeadlines = getDefaultStageDeadlines(formData.jobType, formData.deadline);
      setFormData(prev => ({ ...prev, stageDeadlines: defaultDeadlines }));
    }
  }, [formData.jobType, isEditing, formData.stageDeadlines, formData.deadline]);

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const selectedClient = clients.find(c => c.id === formData.clientId);

  return (
    <Card className="w-full max-w-4xl" data-testid={`card-${isEditing ? 'edit' : 'create'}-job`}>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Job' : 'Create New Job'}</CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Update the job information below'
            : 'Set up a new printing job with automatic workflow generation'
          }
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
                  {clients.filter(client => client.id && client.id.trim()).map((client) => (
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
                  {JOB_TYPES.filter(type => type && type.trim()).map((type) => (
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
            <Label htmlFor="description">Job Description *</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={handleChange("description")}
              placeholder="Describe the job requirements, specifications, and special instructions..."
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
                value={formData.quantity}
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
              <div className="relative">
                <Input
                  id="deadline"
                  type="date"
                  value={formatDateForInput(formData.deadline)}
                  onChange={handleChange("deadline")}
                  min={formatDateForInput(new Date())}
                  data-testid="input-job-deadline"
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
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
                placeholder="A4, 5.5x8.5 inches, etc."
                data-testid="input-job-size"
              />
              {errors.size && (
                <p className="text-sm text-destructive">{errors.size}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="colors">Colors/Ink</Label>
              <Input
                id="colors"
                value={formData.colors || ""}
                onChange={handleChange("colors")}
                placeholder="CMYK, 2 Colors, etc."
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
                placeholder="Lamination, UV coating, etc."
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

          {/* Stage Time Allocation */}
          {!isEditing && (
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
              disabled={mutation.isPending}
              data-testid={`button-submit-${isEditing ? 'edit' : 'create'}-job`}
            >
              {mutation.isPending 
                ? (isEditing ? "Updating..." : "Creating...") 
                : (isEditing ? "Update Job" : "Create Job")
              }
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                data-testid={`button-cancel-${isEditing ? 'edit' : 'create'}-job`}
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