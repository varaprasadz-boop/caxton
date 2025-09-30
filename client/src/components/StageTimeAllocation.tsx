import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type StageDeadlines, type Department } from "@shared/schema";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface StageDeadlineAllocationProps {
  jobType: string;
  stageDeadlines: StageDeadlines;
  deliveryDeadline: Date;
  onDeadlinesChange: (deadlines: StageDeadlines) => void;
}

export default function StageDeadlineAllocation({
  jobType,
  stageDeadlines,
  deliveryDeadline,
  onDeadlinesChange,
}: StageDeadlineAllocationProps) {
  // Fetch all departments from the database
  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"]
  });

  // Sort departments by their order field
  const sortedDepartments = [...departments].sort((a, b) => a.order - b.order);

  // Initialize active departments based on existing stageDeadlines or all departments
  // This ensures deletions persist and the component responds to prop changes
  useEffect(() => {
    if (sortedDepartments.length === 0) return; // Wait for departments to load
    
    // If stageDeadlines already exists (editing mode), use those department IDs
    if (Object.keys(stageDeadlines).length > 0) {
      // Don't auto-populate, respect existing stageDeadlines
      return;
    }
    
    // Auto-generate default deadlines for all departments (creation mode)
    const defaultDeadlines: StageDeadlines = {};
    const totalDays = Math.max(1, Math.ceil((deliveryDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
    const daysPerDepartment = Math.max(1, Math.floor(totalDays / sortedDepartments.length));
    
    sortedDepartments.forEach((dept, index) => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + ((index + 1) * daysPerDepartment));
      // Ensure deadline doesn't exceed delivery deadline
      if (deadlineDate > deliveryDeadline) {
        deadlineDate.setTime(deliveryDeadline.getTime());
      }
      defaultDeadlines[dept.id] = deadlineDate.toISOString();
    });
    
    onDeadlinesChange(defaultDeadlines);
  }, [departments, jobType, deliveryDeadline]); // Depend on actual data, not length

  const handleDeadlineChange = (departmentId: string, dateValue: string) => {
    if (dateValue) {
      // Parse both dates as UTC midnight to avoid timezone issues
      const [year, month, day] = dateValue.split('-').map(Number);
      const selectedDate = new Date(Date.UTC(year, month - 1, day));
      
      const deliveryDate = new Date(deliveryDeadline);
      const deliveryUTC = new Date(Date.UTC(
        deliveryDate.getFullYear(),
        deliveryDate.getMonth(),
        deliveryDate.getDate()
      ));
      
      // Validate that selected date is not after delivery deadline
      if (selectedDate > deliveryUTC) {
        alert(`Stage deadline cannot exceed job delivery date (${format(deliveryDate, "MMM dd, yyyy")})`);
        return;
      }
      
      onDeadlinesChange({
        ...stageDeadlines,
        [departmentId]: selectedDate.toISOString()
      });
    }
  };

  const handleDepartmentDelete = (departmentId: string) => {
    // Remove from deadlines - this automatically removes it from active departments
    // since activeDepartments is derived from stageDeadlines
    const newDeadlines = { ...stageDeadlines };
    delete newDeadlines[departmentId];
    onDeadlinesChange(newDeadlines);
  };

  const formatDateForInput = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toISOString().split('T')[0];
  };

  const getTotalDays = () => {
    const deadlineValues = Object.values(stageDeadlines).filter(Boolean);
    if (deadlineValues.length === 0) return 0;
    
    const earliestDate = new Date(Math.min(...deadlineValues.map(d => new Date(d).getTime())));
    const latestDate = new Date(Math.max(...deadlineValues.map(d => new Date(d).getTime())));
    
    return Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Get active departments based on which ones have deadlines set
  // This ensures deletions persist correctly
  const activeDepartments = sortedDepartments.filter(dept => 
    stageDeadlines[dept.id] !== undefined
  );

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center h-24">
          <p className="text-muted-foreground text-sm">Loading departments...</p>
        </CardContent>
      </Card>
    );
  }

  if (!jobType || sortedDepartments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center h-24">
          <p className="text-muted-foreground text-sm">Select a job type to configure department deadlines</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Department Task Allocation
        </CardTitle>
        <CardDescription>
          Set the deadline date for each department stage. Delete unwanted stages before saving. Total workflow span: {getTotalDays()} days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeDepartments.map((department, index) => (
          <div key={department.id} className="flex items-center gap-4 p-3 rounded-lg border">
            <div className="flex-1">
              <Label htmlFor={`dept-${department.id}`} className="text-sm font-medium">
                {department.name}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {stageDeadlines[department.id] ? `Due: ${new Date(stageDeadlines[department.id]).toLocaleDateString()}` : 'No deadline set'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                id={`dept-${department.id}`}
                type="date"
                value={formatDateForInput(stageDeadlines[department.id])}
                onChange={(e) => handleDeadlineChange(department.id, e.target.value)}
                max={new Date(deliveryDeadline).toISOString().split('T')[0]}
                className="w-40"
                data-testid={`input-dept-deadline-${department.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDepartmentDelete(department.id)}
                className="text-destructive hover:text-destructive"
                data-testid={`button-delete-dept-${department.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <Badge variant="outline" className="ml-2">
              Step {index + 1}
            </Badge>
          </div>
        ))}
        
        {getTotalDays() > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Total Workflow Timeline</span>
            <Badge variant="secondary">
              {getTotalDays()} days
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}