import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllWorkflowStages, getDefaultStageDeadlines, type StageDeadlines } from "@shared/schema";

interface StageDeadlineAllocationProps {
  jobType: string;
  stageDeadlines: StageDeadlines;
  deliveryDeadline: Date;
  onDeadlinesChange: (deadlines: StageDeadlines) => void;
  onStageDelete?: (stage: string) => void;
}

export default function StageDeadlineAllocation({
  jobType,
  stageDeadlines,
  deliveryDeadline,
  onDeadlinesChange,
  onStageDelete
}: StageDeadlineAllocationProps) {
  const [stages, setStages] = useState<string[]>([]);
  

  // Update stages when job type changes - now all job types get all stages
  useEffect(() => {
    const allStages = getAllWorkflowStages();
    setStages(allStages);
  }, [jobType]);

  // Set default deadlines when job type changes and deadlines are empty
  useEffect(() => {
    if (jobType && Object.keys(stageDeadlines).length === 0) {
      const defaultDeadlines = getDefaultStageDeadlines(jobType, deliveryDeadline);
      onDeadlinesChange(defaultDeadlines);
    }
  }, [jobType, deliveryDeadline]);

  const handleDeadlineChange = (stage: string, dateValue: string) => {
    if (dateValue) {
      const selectedDate = new Date(dateValue);
      onDeadlinesChange({
        ...stageDeadlines,
        [stage]: selectedDate.toISOString()
      });
    }
  };

  const handleStageDelete = (stage: string) => {
    const newDeadlines = { ...stageDeadlines };
    delete newDeadlines[stage];
    onDeadlinesChange(newDeadlines);
    
    const newStages = stages.filter(s => s !== stage);
    setStages(newStages);
    
    onStageDelete?.(stage);
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

  if (!jobType || stages.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center h-24">
          <p className="text-muted-foreground text-sm">Select a job type to configure stage deadlines</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Stage Deadline Allocation
        </CardTitle>
        <CardDescription>
          Set the deadline date for each workflow stage. Total workflow span: {getTotalDays()} days
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
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {stageDeadlines[stage] ? `Due: ${new Date(stageDeadlines[stage]).toLocaleDateString()}` : 'No deadline set'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                id={`stage-${stage}`}
                type="date"
                value={formatDateForInput(stageDeadlines[stage])}
                onChange={(e) => handleDeadlineChange(stage, e.target.value)}
                className="w-40"
                data-testid={`input-stage-deadline-${stage.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleStageDelete(stage)}
                className="text-destructive hover:text-destructive"
                data-testid={`button-delete-stage-${stage.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
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