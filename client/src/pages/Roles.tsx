import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Pencil, Trash2, Shield } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRoleSchema, type Role, type InsertRole } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";

const MODULES = [
  { key: "jobs", label: "Jobs" },
  { key: "clients", label: "Clients" },
  { key: "employees", label: "Employees" },
  { key: "departments", label: "Departments" },
  { key: "machines", label: "Machines" },
  { key: "tasks", label: "Tasks" },
  { key: "roles", label: "Roles" }
] as const;

const ACTIONS = [
  { key: "create", label: "Create" },
  { key: "edit", label: "Edit" },
  { key: "view", label: "View" },
  { key: "delete", label: "Delete" }
] as const;

export default function Roles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const { toast } = useToast();
  const { canCreate, canEdit, canDelete } = usePermissions();

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"]
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertRole) => {
      const res = await apiRequest("POST", "/api/roles", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsCreateModalOpen(false);
      toast({ title: "Role created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create role", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertRole> }) => {
      const res = await apiRequest("PATCH", `/api/roles/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setEditingRole(null);
      toast({ title: "Role updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete role", description: error.message, variant: "destructive" });
    }
  });

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const countPermissions = (permissions: any) => {
    if (!permissions || typeof permissions !== 'object') return 0;
    let count = 0;
    for (const module of Object.values(permissions)) {
      if (module && typeof module === 'object') {
        count += Object.values(module).filter(v => v === true).length;
      }
    }
    return count;
  };

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-roles">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground">
            Define custom roles with granular permissions
          </p>
        </div>
        {canCreate('roles') && (
          <Button onClick={() => setIsCreateModalOpen(true)} data-testid="button-create-role">
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        )}
      </div>

      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search roles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-roles"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRoles.map(role => (
          <Card key={role.id} data-testid={`card-role-${role.id}`}>
            <CardHeader className="gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>{role.name}</CardTitle>
                </div>
                <div className="flex gap-2">
                  {canEdit('roles') && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingRole(role)}
                      data-testid={`button-edit-role-${role.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete('roles') && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(role.id)}
                      data-testid={`button-delete-role-${role.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {role.description && (
                <CardDescription>{role.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {countPermissions(role.permissions)} permissions granted
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <RoleFormDialog
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      <RoleFormDialog
        open={!!editingRole}
        onOpenChange={(open) => !open && setEditingRole(null)}
        role={editingRole || undefined}
        onSubmit={(data) => editingRole && updateMutation.mutate({ id: editingRole.id, data })}
        isPending={updateMutation.isPending}
      />
    </div>
  );
}

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role;
  onSubmit: (data: InsertRole) => void;
  isPending: boolean;
}

function RoleFormDialog({ open, onOpenChange, role, onSubmit, isPending }: RoleFormDialogProps) {
  const defaultPermissions = role?.permissions || {
    jobs: { create: false, edit: false, view: false, delete: false },
    clients: { create: false, edit: false, view: false, delete: false },
    employees: { create: false, edit: false, view: false, delete: false },
    departments: { create: false, edit: false, view: false, delete: false },
    machines: { create: false, edit: false, view: false, delete: false },
    tasks: { create: false, edit: false, view: false, delete: false },
    roles: { create: false, edit: false, view: false, delete: false }
  };
  
  const form = useForm<InsertRole>({
    resolver: zodResolver(insertRoleSchema),
    defaultValues: {
      name: "",
      description: "",
      permissions: {
        jobs: { create: false, edit: false, view: false, delete: false },
        clients: { create: false, edit: false, view: false, delete: false },
        employees: { create: false, edit: false, view: false, delete: false },
        departments: { create: false, edit: false, view: false, delete: false },
        machines: { create: false, edit: false, view: false, delete: false },
        tasks: { create: false, edit: false, view: false, delete: false },
        roles: { create: false, edit: false, view: false, delete: false }
      }
    }
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: role?.name || "",
        description: role?.description || "",
        permissions: defaultPermissions
      });
    }
  }, [open, role]);

  const handleSubmit = (data: InsertRole) => {
    onSubmit(data);
    if (!role) {
      form.reset();
    }
  };

  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    const currentPermissions = form.getValues("permissions") || {};
    const modulePermissions = (currentPermissions as any)[module] || {};
    
    form.setValue("permissions", {
      ...currentPermissions,
      [module]: {
        ...modulePermissions,
        [action]: checked
      }
    } as any);
  };

  const getPermissionValue = (module: string, action: string): boolean => {
    const permissions = form.watch("permissions") || {};
    return (permissions as any)[module]?.[action] || false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-role-form">
        <DialogHeader>
          <DialogTitle>{role ? "Edit Role" : "Create Role"}</DialogTitle>
          <DialogDescription>
            Define role details and set granular permissions for each module
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Production Manager" data-testid="input-role-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="Brief description of this role" data-testid="input-role-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div>
                <FormLabel>Permissions</FormLabel>
                <FormDescription>
                  Select which actions this role can perform on each module
                </FormDescription>
              </div>
              
              <div className="rounded-md border">
                <div className="grid grid-cols-5 gap-2 p-4 border-b bg-muted/50">
                  <div className="font-medium">Module</div>
                  {ACTIONS.map(action => (
                    <div key={action.key} className="font-medium text-sm text-center">
                      {action.label}
                    </div>
                  ))}
                </div>
                
                {MODULES.map((module, idx) => (
                  <div 
                    key={module.key} 
                    className={`grid grid-cols-5 gap-2 p-4 ${idx !== MODULES.length - 1 ? 'border-b' : ''}`}
                  >
                    <div className="font-medium">{module.label}</div>
                    {ACTIONS.map(action => (
                      <div key={action.key} className="flex justify-center items-center">
                        <Checkbox
                          checked={getPermissionValue(module.key, action.key)}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(module.key, action.key, checked as boolean)
                          }
                          data-testid={`checkbox-permission-${module.key}-${action.key}`}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-role">
                {isPending ? "Saving..." : role ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
