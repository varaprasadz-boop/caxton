import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  variant?: "job" | "task";
  className?: string;
}

export default function StatusBadge({ status, variant = "job", className }: StatusBadgeProps) {
  const getStatusColor = (status: string, variant: string) => {
    if (variant === "job") {
      switch (status.toLowerCase()) {
        case "pending":
          return "bg-pending text-white";
        case "pre-press":
        case "printing":
        case "cutting":
        case "folding":
        case "binding":
        case "qc":
        case "packaging":
        case "dispatch":
          return "bg-in-progress text-white";
        case "delivered":
        case "completed":
          return "bg-completed text-white";
        default:
          return "bg-muted text-muted-foreground";
      }
    } else {
      switch (status.toLowerCase()) {
        case "pending":
          return "bg-pending text-white";
        case "in-progress":
          return "bg-in-progress text-white";
        case "completed":
          return "bg-completed text-white";
        case "overdue":
          return "bg-overdue text-white";
        default:
          return "bg-muted text-muted-foreground";
      }
    }
  };

  const formatStatus = (status: string) => {
    return status.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Badge 
      className={cn(getStatusColor(status, variant), "text-xs font-medium", className)}
      data-testid={`badge-status-${status}`}
    >
      {formatStatus(status)}
    </Badge>
  );
}