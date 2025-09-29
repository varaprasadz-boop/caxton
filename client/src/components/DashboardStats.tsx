import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Clock, CheckCircle, AlertTriangle } from "lucide-react";

interface DashboardStatsProps {
  totalJobs?: number;
  activeJobs?: number;
  completedJobs?: number;
  overdueJobs?: number;
}

export default function DashboardStats({ 
  totalJobs = 0, 
  activeJobs = 0, 
  completedJobs = 0, 
  overdueJobs = 0 
}: DashboardStatsProps) {
  const stats = [
    {
      title: "Total Jobs",
      value: totalJobs,
      description: "All jobs in system",
      icon: BarChart3,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Active Jobs",
      value: activeJobs,
      description: "Currently in progress",
      icon: Clock,
      color: "text-in-progress",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
    {
      title: "Completed",
      value: completedJobs,
      description: "Jobs delivered",
      icon: CheckCircle,
      color: "text-completed",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "Overdue",
      value: overdueJobs,
      description: "Past deadline",
      icon: AlertTriangle,
      color: "text-overdue",
      bgColor: "bg-red-100 dark:bg-red-900/20",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} data-testid={`card-stat-${stat.title.toLowerCase().replace(' ', '-')}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`h-8 w-8 rounded-md ${stat.bgColor} flex items-center justify-center`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid={`text-${stat.title.toLowerCase().replace(' ', '-')}-value`}>
              {stat.value}
            </div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}