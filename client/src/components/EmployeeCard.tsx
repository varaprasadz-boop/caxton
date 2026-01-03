import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, Briefcase, Eye, Edit } from "lucide-react";

interface EmployeeCardProps {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  activeTasks?: number;
  completedTasks?: number;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export default function EmployeeCard({
  id,
  name,
  role,
  email,
  phone,
  activeTasks = 0,
  completedTasks = 0,
  onView,
  onEdit
}: EmployeeCardProps) {
  const handleView = () => {
    console.log(`Viewing employee ${id}`);
    onView?.(id);
  };

  const handleEdit = () => {
    console.log(`Editing employee ${id}`);
    onEdit?.(id);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      'Designer': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'Printer': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'Binder': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'QC': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'Packaging': 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
      'Logistics': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  return (
    <Card className="hover-elevate" data-testid={`card-employee-${id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription>
                <Badge className={`text-xs ${getRoleBadgeColor(role)}`}>
                  {role}
                </Badge>
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEdit}
              data-testid={`button-edit-employee-${id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleView}
              data-testid={`button-view-employee-${id}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="truncate">{email}</span>
          </div>
          {phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{phone}</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 pt-2 border-t">
          <Badge variant="outline" className="text-xs">
            <Briefcase className="h-3 w-3 mr-1" />
            {activeTasks} Active
          </Badge>
          <Badge variant="outline" className="text-xs">
            {completedTasks} Completed
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}