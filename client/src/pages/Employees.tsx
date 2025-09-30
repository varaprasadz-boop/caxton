import { useState } from "react";
import { useLocation } from "wouter";
import EmployeeCard from "@/components/EmployeeCard";
import CreateEmployeeForm from "@/components/CreateEmployeeForm";
import EditEmployeeForm from "@/components/EditEmployeeForm";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Employee, Department, Task } from "@shared/schema";

export default function Employees() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [isCreateEmployeeModalOpen, setIsCreateEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Fetch real data
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"]
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"]
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"]
  });

  // Calculate task stats for each employee
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

  // Create a map of department IDs to names for easier lookup
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

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-employees">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">
            Manage your team members and their assignments
          </p>
        </div>
        <Button onClick={handleCreateEmployee} data-testid="button-create-employee">
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Filters */}
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

      {/* Employees Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map(employee => (
          <EmployeeCard
            key={employee.id}
            id={employee.id}
            name={employee.name}
            email={employee.email}
            phone={employee.phone || undefined}
            activeTasks={employee.activeTasks}
            completedTasks={employee.completedTasks}
            department={employee.departmentId ? departmentMap[employee.departmentId] : "Unassigned"}
            onView={handleViewEmployee}
            onEdit={handleEditEmployee}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredEmployees.length === 0 && (searchTerm || departmentFilter !== "all") && (
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

      {employees.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No employees yet</p>
          <Button onClick={handleCreateEmployee} data-testid="button-create-first-employee">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Employee
          </Button>
        </div>
      )}

      {/* Create Employee Modal */}
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

      {/* Edit Employee Modal */}
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