import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertClientSchema, type InsertClient } from "@shared/schema";
import { z } from "zod";

interface CreateClientFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateClientForm({ onSuccess, onCancel }: CreateClientFormProps) {
  const [formData, setFormData] = useState<InsertClient>({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    gstNo: "",
    paymentMethod: "Cash"
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createClientMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client created",
        description: "New client has been added successfully.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validatedData = insertClientSchema.parse(formData);
      createClientMutation.mutate(validatedData);
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

  const handleChange = (field: keyof InsertClient) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSelectChange = (field: keyof InsertClient) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Card className="w-full max-w-2xl" data-testid="card-create-client">
      <CardHeader>
        <CardTitle>Add New Client</CardTitle>
        <CardDescription>
          Enter the client information to add them to your system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Contact Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleChange("name")}
                placeholder="John Smith"
                data-testid="input-client-name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={handleChange("company")}
                placeholder="ABC Corporation"
                data-testid="input-client-company"
              />
              {errors.company && (
                <p className="text-sm text-destructive">{errors.company}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange("email")}
                placeholder="john@company.com"
                data-testid="input-client-email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={handleChange("phone")}
                placeholder="+1 555-0123"
                data-testid="input-client-phone"
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address || ""}
              onChange={handleChange("address")}
              placeholder="123 Business St, City, State 12345"
              rows={3}
              data-testid="textarea-client-address"
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gstNo">GST No</Label>
              <Input
                id="gstNo"
                value={formData.gstNo || ""}
                onChange={handleChange("gstNo")}
                placeholder="27XXXXX1234X1X1"
                data-testid="input-client-gst-no"
              />
              {errors.gstNo && (
                <p className="text-sm text-destructive">{errors.gstNo}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={handleSelectChange("paymentMethod")}
              >
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash" data-testid="select-payment-cash">Cash</SelectItem>
                  <SelectItem value="Online" data-testid="select-payment-online">Online</SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentMethod && (
                <p className="text-sm text-destructive">{errors.paymentMethod}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={createClientMutation.isPending}
              data-testid="button-submit-client"
            >
              {createClientMutation.isPending ? "Creating..." : "Create Client"}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                data-testid="button-cancel-client"
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