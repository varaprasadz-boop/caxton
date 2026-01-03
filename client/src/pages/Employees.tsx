import { useState } from "react";
import EmployeeCard from "@/components/EmployeeCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // TODO: Remove mock data when implementing real functionality
  const mockEmployees = [
    {
      id: "1", 
      name: "Sarah Design",
      role: "Designer",
      email: "sarah@caxton.com",
      phone: "+1 555-0111",
      activeTasks: 2,
      completedTasks: 15
    },
    {
      id: "2",
      name: "Mike Printer",
      role: "Printer", 
      email: "mike@caxton.com",
      phone: "+1 555-0222",
      activeTasks: 4,
      completedTasks: 28
    },
    {
      id: "3",
      name: "Anna QC",
      role: "QC",
      email: "anna@caxton.com",
      phone: "+1 555-0333",
      activeTasks: 1,
      completedTasks: 22
    },
    {
      id: "4",
      name: "David Bind",
      role: "Binder",
      email: "david@caxton.com",
      phone: "+1 555-0444", 
      activeTasks: 3,
      completedTasks: 18
    },
    {
      id: "5",
      name: "Lisa Pack",
      role: "Packaging",
      email: "lisa@caxton.com",
      phone: "+1 555-0555",
      activeTasks: 2,
      completedTasks: 25
    },
    {
      id: "6", 
      name: "Tom Deliver",
      role: "Logistics",
      email: "tom@caxton.com",
      phone: "+1 555-0666",
      activeTasks: 1,
      completedTasks: 31
    }
  ];

  const handleCreateEmployee = () => {
    console.log('Creating new employee');
  };

  const handleViewEmployee = (id: string) => {
    console.log('Viewing employee:', id);
  };

  const handleEditEmployee = (id: string) => {
    console.log('Editing employee:', id);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    console.log('Searching employees:', value);
  };

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value);
    console.log('Filtering by role:', value);
  };

  const filteredEmployees = mockEmployees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || employee.role === roleFilter;
    return matchesSearch && matchesRole;
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
        
        <Select value={roleFilter} onValueChange={handleRoleFilter}>
          <SelectTrigger className="w-48" data-testid="select-role-filter">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Designer">Designer</SelectItem>
            <SelectItem value="Printer">Printer</SelectItem>
            <SelectItem value="Binder">Binder</SelectItem>
            <SelectItem value="QC">QC</SelectItem>
            <SelectItem value="Packaging">Packaging</SelectItem>
            <SelectItem value="Logistics">Logistics</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employees Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map(employee => (
          <EmployeeCard
            key={employee.id}
            {...employee}
            onView={handleViewEmployee}
            onEdit={handleEditEmployee}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredEmployees.length === 0 && (searchTerm || roleFilter !== "all") && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No employees found matching your criteria
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Clear Search
            </Button>
            <Button variant="outline" onClick={() => setRoleFilter("all")}>
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {mockEmployees.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No employees yet</p>
          <Button onClick={handleCreateEmployee} data-testid="button-create-first-employee">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Employee
          </Button>
        </div>
      )}
    </div>
  );
}