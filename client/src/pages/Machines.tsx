import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMachineSchema, type Machine, type InsertMachine, type Department } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";

export default function Machines() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const { toast } = useToast();
  const { canCreate, canEdit, canDelete } = usePermissions();

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ["/api/machines"]
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"]
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertMachine) => {
      const res = await apiRequest("POST", "/api/machines", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      setIsCreateModalOpen(false);
      toast({ title: "Machine created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create machine", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertMachine> }) => {
      const res = await apiRequest("PATCH", `/api/machines/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      setEditingMachine(null);
      toast({ title: "Machine updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update machine", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/machines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      toast({ title: "Machine deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete machine", description: error.message, variant: "destructive" });
    }
  });

  const getDepartmentName = (deptId: string) => {
    return departments.find(d => d.id === deptId)?.name || "Unknown";
  };

  const filteredMachines = machines.filter(machine =>
    machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (machine.description && machine.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    getDepartmentName(machine.departmentId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-machines">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Machines</h1>
          <p className="text-muted-foreground">
            Manage printing equipment and machinery
          </p>
        </div>
        {canCreate('machines') && (
          <Button onClick={() => setIsCreateModalOpen(true)} data-testid="button-create-machine">
            <Plus className="mr-2 h-4 w-4" />
            Add Machine
          </Button>
        )}
      </div>

      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search machines..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-machines"
        />
      </div>

      <div className="rounded-md border">
        {filteredMachines.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMachines.map(machine => (
                <TableRow key={machine.id} data-testid={`row-machine-${machine.id}`}>
                  <TableCell data-testid={`text-machine-name-${machine.id}`}>
                    <span className="font-medium">{machine.name}</span>
                  </TableCell>
                  <TableCell data-testid={`badge-machine-department-${machine.id}`}>
                    <Badge variant="secondary">
                      {getDepartmentName(machine.departmentId)}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-machine-description-${machine.id}`}>
                    <span className="text-sm text-muted-foreground">
                      {machine.description || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {canEdit('machines') && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingMachine(machine)}
                          data-testid={`button-edit-machine-${machine.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete('machines') && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(machine.id)}
                          data-testid={`button-delete-machine-${machine.id}`}
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
            <p className="text-muted-foreground">No machines found</p>
          </div>
        )}
      </div>

      <MachineFormDialog
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
        departments={departments}
      />

      <MachineFormDialog
        open={!!editingMachine}
        onOpenChange={(open) => !open && setEditingMachine(null)}
        machine={editingMachine || undefined}
        onSubmit={(data) => editingMachine && updateMutation.mutate({ id: editingMachine.id, data })}
        isPending={updateMutation.isPending}
        departments={departments}
      />
    </div>
  );
}

interface MachineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machine?: Machine;
  onSubmit: (data: InsertMachine) => void;
  isPending: boolean;
  departments: Department[];
}

function MachineFormDialog({ open, onOpenChange, machine, onSubmit, isPending, departments }: MachineFormDialogProps) {
  const form = useForm<InsertMachine>({
    resolver: zodResolver(insertMachineSchema),
    defaultValues: {
      name: machine?.name || "",
      description: machine?.description || "",
      departmentId: machine?.departmentId || ""
    }
  });

  const handleSubmit = (data: InsertMachine) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-machine-form">
        <DialogHeader>
          <DialogTitle>{machine ? "Edit Machine" : "Create Machine"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Machine Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Heidelberg Offset Press" data-testid="input-machine-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-machine-department">
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id} data-testid={`option-department-${dept.id}`}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Input {...field} value={field.value || ""} placeholder="Brief description" data-testid="input-machine-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-machine">
                {isPending ? "Saving..." : machine ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
