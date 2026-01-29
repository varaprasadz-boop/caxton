import { useState } from "react";
import { useLocation } from "wouter";
import CreateEmployeeForm from "@/components/CreateEmployeeForm";
import EditEmployeeForm from "@/components/EditEmployeeForm";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Pencil, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Employee, Department, Task } from "@shared/schema";
import { usePermissions } from "@/hooks/use-permissions";
import { useToast } from "@/hooks/use-toast";

export default function Employees() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [isCreateEmployeeModalOpen, setIsCreateEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const { canCreate, canEdit, canView } = usePermissions();
  const { toast } = useToast();

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"]
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"]
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"]
  });

  const employeesWithStats = employees.map(employee => {
    const employeeTasks = tasks.filter((task: any) => task.employeeId === employee.id);
    const activeTasks = employeeTasks.filter((task: any) => task.status !== "completed").length;
    const completedTasks = employeeTasks.filter((task: any) => task.status === "completed").length;
    
    return {
      ...employee,
      activeTasks,
      completedTasks
    };
  });

  const handleCreateEmployee = () => {
    setIsCreateEmployeeModalOpen(true);
  };

  const handleCreateEmployeeSuccess = () => {
    setIsCreateEmployeeModalOpen(false);
  };

  const handleViewEmployee = (id: string) => {
    setLocation(`/employees/${id}`);
  };

  const handleEditEmployee = (id: string) => {
    const employee = employees.find(emp => emp.id === id);
    if (employee) {
      setEditingEmployee(employee);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleDepartmentFilter = (value: string) => {
    setDepartmentFilter(value);
  };

  const departmentMap = departments.reduce((acc, dept) => {
    acc[dept.id] = dept.name;
    return acc;
  }, {} as Record<string, string>);

  const filteredEmployees = employeesWithStats.filter(employee => {
    const departmentName = employee.departmentId ? departmentMap[employee.departmentId] : "Unassigned";
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (departmentName && departmentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || employee.departmentId === departmentFilter || (departmentFilter === "unassigned" && !employee.departmentId);
    return matchesSearch && matchesDepartment;
  });

  const handleExportCSV = () => {
    if (filteredEmployees.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no employees matching your current filters",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Name", "Email", "Phone", "Department", "Active Tasks", "Completed Tasks"];
    const csvContent = [
      headers.join(","),
      ...filteredEmployees.map(employee => [
        `"${employee.name}"`,
        `"${employee.email}"`,
        `"${employee.phone || ''}"`,
        `"${employee.departmentId ? departmentMap[employee.departmentId] : 'Unassigned'}"`,
        employee.activeTasks,
        employee.completedTasks
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `employees_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${filteredEmployees.length} employees to CSV`,
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-employees">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">
            Manage your team members and their assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-employees">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {canCreate('employees') && (
            <Button onClick={handleCreateEmployee} data-testid="button-create-employee">
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-employees"
          />
        </div>
        
        <Select value={departmentFilter} onValueChange={handleDepartmentFilter}>
          <SelectTrigger className="w-48" data-testid="select-department-filter">
            <SelectValue placeholder="Filter by department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        {filteredEmployees.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="w-[120px]">Active Tasks</TableHead>
                <TableHead className="w-[120px]">Completed</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map(employee => (
                <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                  <TableCell data-testid={`text-employee-name-${employee.id}`}>
                    <span className="font-medium">{employee.name}</span>
                  </TableCell>
                  <TableCell data-testid={`text-employee-email-${employee.id}`}>
                    <span className="text-sm text-muted-foreground">{employee.email}</span>
                  </TableCell>
                  <TableCell data-testid={`text-employee-phone-${employee.id}`}>
                    <span className="text-sm text-muted-foreground">
                      {employee.phone || "—"}
                    </span>
                  </TableCell>
                  <TableCell data-testid={`text-employee-department-${employee.id}`}>
                    <Badge variant="secondary">
                      {employee.departmentId ? departmentMap[employee.departmentId] : "Unassigned"}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-employee-active-tasks-${employee.id}`}>
                    <div className="flex items-center justify-center">
                      <Badge variant="default">{employee.activeTasks}</Badge>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-employee-completed-tasks-${employee.id}`}>
                    <div className="flex items-center justify-center">
                      <Badge variant="outline">{employee.completedTasks}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {canView('employees') && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleViewEmployee(employee.id)}
                          data-testid={`button-view-employee-${employee.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {canEdit('employees') && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditEmployee(employee.id)}
                          data-testid={`button-edit-employee-${employee.id}`}
                        >
                          <Pencil className="h-4 w-4" />
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
            <p className="text-muted-foreground mb-4">
              No employees found matching your criteria
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
              <Button variant="outline" onClick={() => setDepartmentFilter("all")}>
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {employees.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No employees yet</p>
          {canCreate('employees') && (
            <Button onClick={handleCreateEmployee} data-testid="button-create-first-employee">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Employee
            </Button>
          )}
        </div>
      )}

      <Modal
        isOpen={isCreateEmployeeModalOpen}
        onClose={() => setIsCreateEmployeeModalOpen(false)}
        title="Add New Employee"
      >
        <CreateEmployeeForm 
          onSuccess={handleCreateEmployeeSuccess}
          onCancel={() => setIsCreateEmployeeModalOpen(false)}
        />
      </Modal>

      {editingEmployee && (
        <Modal
          isOpen={!!editingEmployee}
          onClose={() => setEditingEmployee(null)}
          title="Edit Employee"
        >
          <EditEmployeeForm 
            employee={editingEmployee}
            onSuccess={() => setEditingEmployee(null)}
            onCancel={() => setEditingEmployee(null)}
          />
        </Modal>
      )}
    </div>
  );
}
