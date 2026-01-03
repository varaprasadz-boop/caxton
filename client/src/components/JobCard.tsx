import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Package, Eye } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { format } from "date-fns";

interface JobCardProps {
  id: string;
  title: string;
  client: string;
  jobType: string;
  quantity: number;
  deadline: Date;
  status: string;
  description?: string;
  onView?: (id: string) => void;
}

export default function JobCard({
  id,
  title,
  client,
  jobType,
  quantity,
  deadline,
  status,
  description,
  onView
}: JobCardProps) {
  const handleView = () => {
    console.log(`Viewing job ${id}`);
    onView?.(id);
  };

  const isOverdue = new Date() > deadline && !["completed", "delivered"].includes(status.toLowerCase());

  return (
    <Card className="hover-elevate" data-testid={`card-job-${id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {client}
            </CardDescription>
          </div>
          <StatusBadge 
            status={isOverdue ? "overdue" : status} 
            variant="job" 
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            <Package className="h-3 w-3 mr-1" />
            {jobType}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {quantity.toLocaleString()} units
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className={isOverdue ? "text-overdue font-medium" : ""}>
              {format(deadline, "MMM dd, yyyy")}
            </span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleView}
            data-testid={`button-view-job-${id}`}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}