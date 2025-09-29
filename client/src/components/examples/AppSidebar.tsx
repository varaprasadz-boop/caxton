import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from '../AppSidebar';

export default function AppSidebarExample() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-64 w-full border rounded-md overflow-hidden">
        <AppSidebar />
        <main className="flex-1 p-4 bg-background">
          <p className="text-muted-foreground">Main content area</p>
        </main>
      </div>
    </SidebarProvider>
  );
}