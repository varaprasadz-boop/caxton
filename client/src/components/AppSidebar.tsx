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
  Cog
} from "lucide-react";
import { Link, useLocation } from "wouter";
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

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: BarChart3,
  },
  {
    title: "Jobs",
    url: "/jobs",
    icon: Briefcase,
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: CheckSquare,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Users,
  },
  {
    title: "Departments",
    url: "/departments",
    icon: Building2,
  },
  {
    title: "Employees",
    url: "/employees",
    icon: UserCheck,
  },
  {
    title: "Machines",
    url: "/machines",
    icon: Cog,
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

export default function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-sidebar-foreground">Caxton PHP</h2>
            <p className="text-xs text-sidebar-foreground/70">Print Workflow</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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