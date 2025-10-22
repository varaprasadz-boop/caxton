import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock, Building2, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { insertCompanySettingsSchema, type CompanySettings } from "@shared/schema";

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

function CompanyInfoTab() {
  const { toast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ['/api/company-settings']
  });

  const companyForm = useForm({
    resolver: zodResolver(insertCompanySettingsSchema),
    defaultValues: {
      companyName: '',
      address: ''
    }
  });

  // Reset form when settings are loaded
  useEffect(() => {
    if (settings) {
      companyForm.reset({
        companyName: settings.companyName || '',
        address: settings.address || ''
      });
    }
  }, [settings, companyForm]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { companyName?: string; address?: string }) => {
      const res = await apiRequest("PATCH", "/api/company-settings", data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/company-settings'] });
      // Reset form with new values to clear dirty state
      companyForm.reset({
        companyName: data.companyName || '',
        address: data.address || ''
      });
      toast({
        title: "Settings updated",
        description: "Company information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update company settings.",
        variant: "destructive",
      });
    }
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await apiRequest("POST", "/api/company-settings/logo", formData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company-settings'] });
      setLogoFile(null);
      setLogoPreview(null);
      toast({
        title: "Logo uploaded",
        description: "Company logo has been uploaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo.",
        variant: "destructive",
      });
    }
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = () => {
    if (logoFile) {
      uploadLogoMutation.mutate(logoFile);
    }
  };

  const onSubmit = (data: { companyName?: string; address?: string }) => {
    updateSettingsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card data-testid="card-company-info">
        <CardContent className="p-6">
          <p>Loading company information...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card data-testid="card-company-logo">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <CardTitle>Company Logo</CardTitle>
          </div>
          <CardDescription>Upload your company logo to replace default branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.logoUrl && !logoPreview && (
            <div className="flex items-center gap-4">
              <img 
                src={settings.logoUrl} 
                alt="Company logo" 
                className="h-16 w-16 object-contain border rounded-md p-2"
                data-testid="img-current-logo"
              />
              <p className="text-sm text-muted-foreground">Current logo</p>
            </div>
          )}
          {logoPreview && (
            <div className="flex items-center gap-4">
              <img 
                src={logoPreview} 
                alt="Logo preview" 
                className="h-16 w-16 object-contain border rounded-md p-2"
                data-testid="img-logo-preview"
              />
              <p className="text-sm text-muted-foreground">Preview</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              data-testid="input-logo-file"
            />
            <Button
              onClick={handleLogoUpload}
              disabled={!logoFile || uploadLogoMutation.isPending}
              data-testid="button-upload-logo"
            >
              {uploadLogoMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-company-details">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Company Details</CardTitle>
          </div>
          <CardDescription>Update company name and address</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...companyForm}>
            <form onSubmit={companyForm.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={companyForm.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter company name"
                        {...field}
                        data-testid="input-company-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={companyForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter company address"
                        {...field}
                        value={field.value || ''}
                        data-testid="input-company-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending || !companyForm.formState.isDirty}
                data-testid="button-update-company"
              >
                {updateSettingsMutation.isPending ? "Updating..." : "Update Company Info"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

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
          <p className="text-muted-foreground">Manage system settings and preferences</p>
        </div>

        <Tabs defaultValue="account" className="max-w-4xl">
          <TabsList data-testid="tabs-settings">
            <TabsTrigger value="account" data-testid="tab-account">Account</TabsTrigger>
            <TabsTrigger value="company" data-testid="tab-company">Company Info</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="mt-6">
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
          </TabsContent>

          <TabsContent value="company" className="mt-6">
            <CompanyInfoTab />
          </TabsContent>
        </Tabs>
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
