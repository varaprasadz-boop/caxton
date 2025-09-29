import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  CheckCircle, 
  Briefcase, 
  Calendar,
  User,
  Package
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    jobId?: string;
    taskId?: string;
    jobType?: string;
    client?: string;
    employee?: string;
    stage?: string;
    quantity?: number;
  };
}

const activityIcons = {
  job_created: Briefcase,
  task_completed: CheckCircle,
  task_assigned: User,
  job_completed: Package
};

const activityColors = {
  job_created: "default",
  task_completed: "default", 
  task_assigned: "secondary",
  job_completed: "default"
} as const;

interface ActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
}

export default function ActivityFeed({ limit = 10, showHeader = true }: ActivityFeedProps) {
  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities/recent"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const displayedActivities = limit ? activities.slice(0, limit) : activities;

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (isLoading) {
    return (
      <Card data-testid="card-activity-feed">
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest updates and completed work
            </CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-activity-feed">
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest updates and completed work
          </CardDescription>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-4">
          {displayedActivities.length > 0 ? (
            displayedActivities.map((activity) => {
              const Icon = activityIcons[activity.type as keyof typeof activityIcons] || Clock;
              const badgeVariant = activityColors[activity.type as keyof typeof activityColors] || "default";
              
              return (
                <div 
                  key={activity.id} 
                  className="flex items-start space-x-3 pb-3 border-b last:border-b-0 last:pb-0"
                  data-testid={`activity-${activity.id}`}
                >
                  <div className={`flex-shrink-0 p-2 rounded-full ${
                    activity.type === "task_completed" ? "bg-green-100 text-green-600" :
                    activity.type === "job_created" ? "bg-blue-100 text-blue-600" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {activity.title}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {activity.description}
                    </p>
                    
                    {activity.metadata && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {activity.metadata.quantity && (
                          <Badge variant="outline" className="text-xs">
                            Qty: {activity.metadata.quantity}
                          </Badge>
                        )}
                        {activity.metadata.stage && (
                          <Badge variant="secondary" className="text-xs">
                            {activity.metadata.stage}
                          </Badge>
                        )}
                        {activity.metadata.employee && (
                          <Badge variant="outline" className="text-xs">
                            {activity.metadata.employee}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}