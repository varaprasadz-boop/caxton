import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, User, Mail, Phone, Building2, CheckCircle2, Clock } from "lucide-react";
import Modal from "@/components/Modal";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { type Employee, type Department, type Task, type Job } from "@shared/schema";
import EditEmployeeForm from "@/components/EditEmployeeForm";
import TaskCard from "@/components/TaskCard";

export default function EmployeeDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch employee details
  const { data: employee, isLoading } = useQuery<Employee>({
    queryKey: ["/api/employees", id],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${id}`);
      if (!res.ok) throw new Error('Failed to fetch employee');
      return res.json();
    },
    enabled: !!id
  });

  // Fetch department information
  const { data: department } = useQuery<Department>({
    queryKey: ["/api/departments", employee?.departmentId],
    queryFn: async () => {
      const res = await fetch(`/api/departments/${employee?.departmentId}`);
      if (!res.ok) throw new Error('Failed to fetch department');
      return res.json();
    },
    enabled: !!employee?.departmentId
  });

  // Fetch all tasks assigned to this employee
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  // Fetch all jobs to get job names for tasks
  const { data: allJobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  // Filter tasks for this employee
  const employeeTasks = allTasks.filter(task => task.employeeId === id);
  const activeTasks = employeeTasks.filter(task => task.status !== "completed");
  const completedTasks = employeeTasks.filter(task => task.status === "completed");

  // Create a map of job IDs to job types (since jobs don't have a name field)
  const jobMap = allJobs.reduce((acc, job) => {
    acc[job.id] = job.jobType;
    return acc;
  }, {} as Record<string, string>);
  
  // Get all employees for TaskCard
  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const handleBack = () => {
    setLocation("/employees");
  };

  if (!id) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Employee Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested employee could not be found.</p>
          <Button onClick={handleBack} data-testid="button-back-to-employees">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-employee-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2"
          data-testid="button-back-to-employees"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Employees
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isLoading || !employee}
            onClick={() => setIsEditModalOpen(true)}
            data-testid="button-edit-employee"
          >
            <Edit className="h-4 w-4 mr-2" />
            {isLoading ? "Loading..." : "Edit Employee"}
          </Button>
        </div>
      </div>

      {/* Employee Details */}
      {employee && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Employee Information Card */}
          <Card data-testid="card-employee-info">
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
              <CardDescription>Personal and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">{employee.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{employee.email}</p>
                </div>
              </div>

              {employee.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{employee.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Department</p>
                  <p className="text-sm text-muted-foreground">
                    {department ? department.name : "Unassigned"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task Statistics Card */}
          <Card data-testid="card-task-statistics">
            <CardHeader>
              <CardTitle>Task Statistics</CardTitle>
              <CardDescription>Overview of assigned tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Active Tasks</p>
                  <p className="text-2xl font-bold text-muted-foreground">{activeTasks.length}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Completed Tasks</p>
                  <p className="text-2xl font-bold text-muted-foreground">{completedTasks.length}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Total Tasks</p>
                  <p className="text-2xl font-bold text-muted-foreground">{employeeTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assigned Tasks */}
      {employee && (
        <Card data-testid="card-assigned-tasks">
          <CardHeader>
            <CardTitle>Assigned Tasks</CardTitle>
            <CardDescription>
              All tasks currently assigned to {employee.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {employeeTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No tasks assigned yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {employeeTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    {...task}
                    employees={allEmployees}
                    jobTitle={jobMap[task.jobId] || "Unknown Job"}
                    assignedEmployeeName={employee.name}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Employee Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Employee"
      >
        <div className="p-6">
          {employee && (
            <EditEmployeeForm
              employee={employee}
              onSuccess={() => {
                setIsEditModalOpen(false);
                toast({
                  title: "Employee updated",
                  description: "Employee has been updated successfully.",
                });
              }}
              onCancel={() => setIsEditModalOpen(false)}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
