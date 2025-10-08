import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { usePermissions } from "@/hooks/use-permissions";

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

const employeePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Password confirmation is required")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type AdminCredentialsForm = z.infer<typeof adminCredentialsSchema>;
type EmployeePasswordForm = z.infer<typeof employeePasswordSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showEmailFields, setShowEmailFields] = useState(false);

  const adminForm = useForm<AdminCredentialsForm>({
    resolver: zodResolver(adminCredentialsSchema),
    defaultValues: {
      currentEmail: "",
      newEmail: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  const employeeForm = useForm<EmployeePasswordForm>({
    resolver: zodResolver(employeePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  const updateAdminCredentialsMutation = useMutation({
    mutationFn: async (data: AdminCredentialsForm) => {
      const res = await apiRequest("POST", "/api/admin/update-credentials", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Credentials updated",
        description: "Admin credentials have been updated successfully.",
      });
      adminForm.reset();
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

  const changeEmployeePasswordMutation = useMutation({
    mutationFn: async (data: EmployeePasswordForm) => {
      const res = await apiRequest("POST", "/api/employee/change-password", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
      employeeForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    }
  });

  const onAdminSubmit = (data: AdminCredentialsForm) => {
    updateAdminCredentialsMutation.mutate(data);
  };

  const onEmployeeSubmit = (data: EmployeePasswordForm) => {
    changeEmployeePasswordMutation.mutate(data);
  };

  if (isAdmin) {
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
              <Form {...adminForm}>
                <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4">
                  <FormField
                    control={adminForm.control}
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
                      control={adminForm.control}
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
                    control={adminForm.control}
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
                        control={adminForm.control}
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
                        control={adminForm.control}
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
                    disabled={updateAdminCredentialsMutation.isPending}
                    data-testid="button-update-credentials"
                  >
                    {updateAdminCredentialsMutation.isPending ? "Updating..." : "Update Credentials"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Employee view - Password change only
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <div className="max-w-2xl">
        <Card data-testid="card-password-change">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <CardDescription>Update your login password</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...employeeForm}>
              <form onSubmit={employeeForm.handleSubmit(onEmployeeSubmit)} className="space-y-4">
                <FormField
                  control={employeeForm.control}
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

                <FormField
                  control={employeeForm.control}
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
                  control={employeeForm.control}
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

                <Button
                  type="submit"
                  disabled={changeEmployeePasswordMutation.isPending}
                  data-testid="button-change-password"
                >
                  {changeEmployeePasswordMutation.isPending ? "Updating..." : "Change Password"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
