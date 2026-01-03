import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDepartmentSchema, type Department, type InsertDepartment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";

export default function Departments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const { toast } = useToast();
  const { canCreate, canEdit, canDelete } = usePermissions();

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"]
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertDepartment) => {
      const res = await apiRequest("POST", "/api/departments", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsCreateModalOpen(false);
      toast({ title: "Department created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create department", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertDepartment> }) => {
      const res = await apiRequest("PATCH", `/api/departments/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setEditingDepartment(null);
      toast({ title: "Department updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update department", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Department deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete department", description: error.message, variant: "destructive" });
    }
  });

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-departments">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">
            Manage workflow departments and stages
          </p>
        </div>
        {canCreate('departments') && (
          <Button onClick={() => setIsCreateModalOpen(true)} data-testid="button-create-department">
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        )}
      </div>

      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search departments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-departments"
        />
      </div>

      <div className="rounded-md border">
        {filteredDepartments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Order</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.map(department => (
                <TableRow key={department.id} data-testid={`row-department-${department.id}`}>
                  <TableCell data-testid={`text-department-name-${department.id}`}>
                    <span className="font-medium">{department.name}</span>
                  </TableCell>
                  <TableCell data-testid={`text-department-description-${department.id}`}>
                    <span className="text-sm text-muted-foreground">
                      {department.description || "—"}
                    </span>
                  </TableCell>
                  <TableCell data-testid={`text-department-order-${department.id}`}>
                    <span className="text-sm">{department.order}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {canEdit('departments') && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingDepartment(department)}
                          data-testid={`button-edit-department-${department.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete('departments') && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(department.id)}
                          data-testid={`button-delete-department-${department.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No departments found</p>
          </div>
        )}
      </div>

      <DepartmentFormDialog
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      <DepartmentFormDialog
        open={!!editingDepartment}
        onOpenChange={(open) => !open && setEditingDepartment(null)}
        department={editingDepartment || undefined}
        onSubmit={(data) => editingDepartment && updateMutation.mutate({ id: editingDepartment.id, data })}
        isPending={updateMutation.isPending}
      />
    </div>
  );
}

interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department;
  onSubmit: (data: InsertDepartment) => void;
  isPending: boolean;
}

function DepartmentFormDialog({ open, onOpenChange, department, onSubmit, isPending }: DepartmentFormDialogProps) {
  const form = useForm<InsertDepartment>({
    resolver: zodResolver(insertDepartmentSchema),
    defaultValues: {
      name: department?.name || "",
      description: department?.description || "",
      order: department?.order || 1
    }
  });

  const handleSubmit = (data: InsertDepartment) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-department-form">
        <DialogHeader>
          <DialogTitle>{department ? "Edit Department" : "Create Department"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Pre-Press" data-testid="input-department-name" />
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
                    <Input {...field} value={field.value || ""} placeholder="Brief description" data-testid="input-department-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order (Position in workflow)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      min="1"
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      data-testid="input-department-order"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-department">
                {isPending ? "Saving..." : department ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
