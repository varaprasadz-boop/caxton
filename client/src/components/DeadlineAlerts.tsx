import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock, Calendar, Eye } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import StatusBadge from "./StatusBadge";

interface DeadlineItem {
  id: string;
  title: string;
  type: "job" | "task";
  client?: string;
  deadline: Date;
  status: string;
  stage?: string;
}

interface DeadlineAlertsProps {
  items: DeadlineItem[];
  onView?: (id: string, type: "job" | "task") => void;
}

export default function DeadlineAlerts({ items, onView }: DeadlineAlertsProps) {
  const now = new Date();
  
  const categorizedItems = {
    overdue: items.filter(item => item.deadline < now && !["completed", "delivered"].includes(item.status.toLowerCase())),
    dueToday: items.filter(item => {
      const days = differenceInDays(item.deadline, now);
      return days === 0 && !["completed", "delivered"].includes(item.status.toLowerCase());
    }),
    dueSoon: items.filter(item => {
      const days = differenceInDays(item.deadline, now);
      return days > 0 && days <= 3 && !["completed", "delivered"].includes(item.status.toLowerCase());
    })
  };

  const handleView = (id: string, type: "job" | "task") => {
    console.log(`Viewing ${type} ${id}`);
    onView?.(id, type);
  };

  const renderItem = (item: DeadlineItem, alertType: "overdue" | "dueToday" | "dueSoon") => {
    const daysUntilDue = differenceInDays(item.deadline, now);
    
    return (
      <div 
        key={`${item.type}-${item.id}`} 
        className="flex items-center justify-between p-3 rounded-lg border"
        data-testid={`deadline-item-${item.id}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{item.title}</h4>
            <StatusBadge 
              status={alertType === "overdue" ? "overdue" : item.status}
              variant={item.type}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {item.client && (
              <span className="truncate">{item.client}</span>
            )}
            {item.stage && (
              <span>{item.stage}</span>
            )}
            <div className={`flex items-center gap-1 ${
              alertType === "overdue" ? "text-overdue font-medium" : ""
            }`}>
              <Calendar className="h-3 w-3" />
              {format(item.deadline, "MMM dd")}
              {alertType === "overdue" && (
                <span className="text-overdue">({Math.abs(daysUntilDue)} days overdue)</span>
              )}
              {alertType === "dueToday" && (
                <span className="text-warning font-medium">(Today)</span>
              )}
              {alertType === "dueSoon" && (
                <span>({daysUntilDue} days)</span>
              )}
            </div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleView(item.id, item.type)}
          data-testid={`button-view-${item.type}-${item.id}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const totalAlerts = categorizedItems.overdue.length + categorizedItems.dueToday.length + categorizedItems.dueSoon.length;

  if (totalAlerts === 0) {
    return (
      <Card data-testid="card-deadline-alerts">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Deadline Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No upcoming deadlines at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-deadline-alerts">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Deadline Alerts
        </CardTitle>
        <CardDescription>
          {totalAlerts} item{totalAlerts !== 1 ? 's' : ''} need attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categorizedItems.overdue.length > 0 && (
          <div className="space-y-2">
            <Alert className="border-overdue bg-red-50 dark:bg-red-950/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-overdue font-medium">
                {categorizedItems.overdue.length} overdue item{categorizedItems.overdue.length !== 1 ? 's' : ''}
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              {categorizedItems.overdue.map(item => renderItem(item, "overdue"))}
            </div>
          </div>
        )}

        {categorizedItems.dueToday.length > 0 && (
          <div className="space-y-2">
            <Alert className="border-warning bg-orange-50 dark:bg-orange-950/20">
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-warning font-medium">
                {categorizedItems.dueToday.length} due today
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              {categorizedItems.dueToday.map(item => renderItem(item, "dueToday"))}
            </div>
          </div>
        )}

        {categorizedItems.dueSoon.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-muted-foreground">Due in 1-3 days</h5>
            <div className="space-y-2">
              {categorizedItems.dueSoon.map(item => renderItem(item, "dueSoon"))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}