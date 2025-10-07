import {
  Calendar,
  Users,
  Briefcase,
  CheckSquare,
  BarChart3,
  Settings,
  UserCheck,
  FileText,
  Building2,
  FileBarChart,
  Cog,
  Shield
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import type { Employee, Permissions, PermissionModule } from "@/../../shared/schema";
import tenJumpLogo from "@assets/image_1759820515160.png";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  module?: PermissionModule;
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: BarChart3,
  },
  {
    title: "Jobs",
    url: "/jobs",
    icon: Briefcase,
    module: "jobs",
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: CheckSquare,
    module: "tasks",
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Users,
    module: "clients",
  },
  {
    title: "Departments",
    url: "/departments",
    icon: Building2,
    module: "departments",
  },
  {
    title: "Employees",
    url: "/employees",
    icon: UserCheck,
    module: "employees",
  },
  {
    title: "Machines",
    url: "/machines",
    icon: Cog,
    module: "machines",
  },
  {
    title: "Roles",
    url: "/roles",
    icon: Shield,
    module: "roles",
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileBarChart,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

interface CurrentUser extends Employee {
  permissions?: Permissions;
}

export default function AppSidebar() {
  const [location] = useLocation();
  
  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["/api/me"],
  });

  // Filter menu items based on user permissions
  const visibleMenuItems = menuItems.filter(item => {
    // Always show Dashboard
    if (item.url === "/") {
      return true;
    }

    // Always show Reports and Settings to all authenticated users
    if (item.url === "/reports" || item.url === "/settings") {
      return true;
    }

    // Admins can see everything
    if (currentUser?.role === 'admin') {
      return true;
    }

    // For items with module permissions, check if user has view permission
    if (item.module && currentUser?.permissions) {
      const modulePermissions = currentUser.permissions[item.module];
      return modulePermissions?.view === true;
    }

    // Hide items without module mapping for non-admins (safety default)
    return false;
  });

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-center bg-black rounded-md p-3">
          <img 
            src={tenJumpLogo} 
            alt="TenJump" 
            className="h-12 w-auto"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}