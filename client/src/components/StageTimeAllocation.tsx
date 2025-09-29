import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";
import { getWorkflowStages, getDefaultStageTimeAllocations, type StageTimeAllocations } from "@shared/schema";

interface StageTimeAllocationProps {
  jobType: string;
  allocations: StageTimeAllocations;
  deadline: Date;
  onAllocationsChange: (allocations: StageTimeAllocations) => void;
}

export default function StageTimeAllocation({
  jobType,
  allocations,
  deadline,
  onAllocationsChange
}: StageTimeAllocationProps) {
  const [stages, setStages] = useState<string[]>([]);
  

  // Update stages when job type changes
  useEffect(() => {
    if (jobType) {
      const workflowStages = getWorkflowStages(jobType);
      setStages(workflowStages);
    } else {
      setStages([]);
    }
  }, [jobType]);

  // Set default allocations when job type changes and allocations are empty
  useEffect(() => {
    if (jobType && Object.keys(allocations).length === 0) {
      const defaultAllocations = getDefaultStageTimeAllocations(jobType);
      onAllocationsChange(defaultAllocations);
    }
  }, [jobType]); // Only depend on jobType, not allocations

  const handleTimeChange = (stage: string, hours: string) => {
    const numHours = parseFloat(hours) || 0;
    if (numHours >= 0.1 && numHours <= 168) { // Min 0.1 hours, max 1 week
      onAllocationsChange({
        ...allocations,
        [stage]: numHours
      });
    }
  };

  const getTotalHours = () => {
    return Object.values(allocations).reduce((sum, hours) => sum + hours, 0);
  };

  const getStageDeadline = (stageIndex: number) => {
    const totalHours = getTotalHours();
    // Calculate hours before this stage using stages array order, not object key order
    const hoursBeforeThisStage = stages
      .slice(0, stageIndex)
      .reduce((sum, stage) => sum + (allocations[stage] || 0), 0);
    
    const stageDeadline = new Date(deadline.getTime() - (totalHours - hoursBeforeThisStage) * 60 * 60 * 1000);
    return stageDeadline;
  };

  if (!jobType || stages.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center h-24">
          <p className="text-muted-foreground text-sm">Select a job type to configure stage time allocations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Stage Time Allocation
        </CardTitle>
        <CardDescription>
          Set the time allocation for each workflow stage. Total time: {getTotalHours().toFixed(1)} hours
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage, index) => (
          <div key={stage} className="flex items-center gap-4 p-3 rounded-lg border">
            <div className="flex-1">
              <Label htmlFor={`stage-${stage}`} className="text-sm font-medium">
                {stage}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Due: {getStageDeadline(index).toLocaleDateString()} at {getStageDeadline(index).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                id={`stage-${stage}`}
                type="number"
                min="0.1"
                max="168"
                step="0.5"
                value={allocations[stage] || ""}
                onChange={(e) => handleTimeChange(stage, e.target.value)}
                className="w-20 text-center"
                data-testid={`input-stage-hours-${stage.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              />
              <span className="text-sm text-muted-foreground">hours</span>
            </div>
            
            <Badge variant="outline" className="ml-2">
              Step {index + 1}
            </Badge>
          </div>
        ))}
        
        {getTotalHours() > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Total Production Time</span>
            <Badge variant="secondary">
              {getTotalHours().toFixed(1)} hours ({(getTotalHours() / 24).toFixed(1)} days)
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}