import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const adminCredentialsSchema = z.object({
  currentEmail: z.string().email("Invalid email address"),
  newEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal(""))
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type AdminCredentialsForm = z.infer<typeof adminCredentialsSchema>;

export default function Settings() {
  const { toast } = useToast();
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showEmailFields, setShowEmailFields] = useState(false);

  const form = useForm<AdminCredentialsForm>({
    resolver: zodResolver(adminCredentialsSchema),
    defaultValues: {
      currentEmail: "",
      newEmail: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  const updateCredentialsMutation = useMutation({
    mutationFn: async (data: AdminCredentialsForm) => {
      const res = await apiRequest("POST", "/api/admin/update-credentials", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Credentials updated",
        description: "Admin credentials have been updated successfully.",
      });
      form.reset();
      setShowPasswordFields(false);
      setShowEmailFields(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update credentials.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: AdminCredentialsForm) => {
    updateCredentialsMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground">Manage system settings and admin credentials</p>
      </div>

      <div className="max-w-2xl">
        <Card data-testid="card-admin-credentials">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Admin Credentials</CardTitle>
            </div>
            <CardDescription>Update super admin login email and password</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Email (Username)</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@example.com"
                          {...field}
                          data-testid="input-current-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEmailFields(!showEmailFields)}
                    data-testid="button-toggle-email"
                  >
                    {showEmailFields ? "Cancel Email Change" : "Change Email"}
                  </Button>
                </div>

                {showEmailFields && (
                  <FormField
                    control={form.control}
                    name="newEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="newemail@example.com"
                            {...field}
                            data-testid="input-new-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter current password"
                          {...field}
                          data-testid="input-current-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordFields(!showPasswordFields)}
                    data-testid="button-toggle-password"
                  >
                    {showPasswordFields ? "Cancel Password Change" : "Change Password"}
                  </Button>
                </div>

                {showPasswordFields && (
                  <>
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter new password (min 6 characters)"
                              {...field}
                              data-testid="input-new-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm new password"
                              {...field}
                              data-testid="input-confirm-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <Button
                  type="submit"
                  disabled={updateCredentialsMutation.isPending}
                  data-testid="button-update-credentials"
                >
                  {updateCredentialsMutation.isPending ? "Updating..." : "Update Credentials"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
