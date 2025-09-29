import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone, Briefcase, Eye, Edit } from "lucide-react";

interface ClientCardProps {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  activeJobs?: number;
  totalJobs?: number;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export default function ClientCard({
  id,
  name,
  company,
  email,
  phone,
  activeJobs = 0,
  totalJobs = 0,
  onView,
  onEdit
}: ClientCardProps) {
  const handleView = () => {
    console.log(`Viewing client ${id}`);
    onView?.(id);
  };

  const handleEdit = () => {
    console.log(`Editing client ${id}`);
    onEdit?.(id);
  };

  return (
    <Card className="hover-elevate" data-testid={`card-client-${id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{name}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {company}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEdit}
              data-testid={`button-edit-client-${id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleView}
              data-testid={`button-view-client-${id}`}
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{phone}</span>
          </div>
        </div>
        
        <div className="flex gap-2 pt-2 border-t">
          <Badge variant="outline" className="text-xs">
            <Briefcase className="h-3 w-3 mr-1" />
            {activeJobs} Active
          </Badge>
          <Badge variant="outline" className="text-xs">
            {totalJobs} Total Jobs
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}