import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, FileText, TrendingUp, Calendar } from "lucide-react";
import JobsReport from "@/components/reports/JobsReport";
import PerformanceReport from "@/components/reports/PerformanceReport";
import TimelineReport from "@/components/reports/TimelineReport";
import ClientReport from "@/components/reports/ClientReport";

export default function Reports() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-reports-title">Reports</h1>
        <p className="text-muted-foreground">Comprehensive analytics and insights for your printing workflow</p>
      </div>

      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Jobs Report
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Clients
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-6">
          <JobsReport />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <PerformanceReport />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <TimelineReport />
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <ClientReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
