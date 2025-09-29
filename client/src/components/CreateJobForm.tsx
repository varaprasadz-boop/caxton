import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertJobSchema, type InsertJob, type Client, JOB_TYPES } from "@shared/schema";
import { z } from "zod";
import { Calendar, User } from "lucide-react";

interface CreateJobFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateJobForm({ onSuccess, onCancel }: CreateJobFormProps) {
  const [formData, setFormData] = useState<InsertJob>({
    clientId: "",
    jobType: "",
    description: "",
    quantity: 0,
    size: "",
    colors: "",
    finishingOptions: "",
    deadline: new Date(),
    status: "pending"
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch clients for the dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"]
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: InsertJob) => {
      const res = await apiRequest("POST", "/api/jobs", {
        ...data,
        deadline: data.deadline.toISOString()
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/jobs"] });
      toast({
        title: "Job created",
        description: "New printing job has been created with automated workflow tasks.",
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
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Format date for input
  const formatDateForInput = (date: Date) => {
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

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={createJobMutation.isPending}
              data-testid="button-submit-job"
            >
              {createJobMutation.isPending ? "Creating Job..." : "Create Job & Generate Tasks"}
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