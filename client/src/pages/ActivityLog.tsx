import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Search, Clock } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import type { JobActivityLog, ActivityChange } from "@shared/schema";
import type { User } from "@/App";

function formatJobNumber(jobNumber: number | null | undefined): string {
  if (!jobNumber) return "—";
  return `CAX${String(jobNumber).padStart(4, "0")}`;
}

export default function ActivityLog() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: user } = useQuery<User>({ queryKey: ["/api/me"] });

  const { data: logs = [], isLoading } = useQuery<JobActivityLog[]>({
    queryKey: ["/api/activity-log"],
    enabled: user?.role === "admin",
  });

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Only administrators can view the activity log.</p>
        </div>
      </div>
    );
  }

  const filtered = logs.filter(log => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    return (
      log.employeeName.toLowerCase().includes(lower) ||
      String(log.jobNumber || "").includes(lower) ||
      (log.changes as ActivityChange[]).some(c => c.label.toLowerCase().includes(lower))
    );
  });

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-activity-log">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground">All job edits made by employees</p>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by employee, job, or field..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-64"
            data-testid="input-search-activity-log"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Edit History
            {logs.length > 0 && (
              <Badge variant="outline" className="ml-2">{logs.length} entries</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? "No matching activity found." : "No activity recorded yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Fields Changed</TableHead>
                  <TableHead>Changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(log => {
                  const changes = log.changes as ActivityChange[];
                  return (
                    <TableRow key={log.id} data-testid={`row-activity-${log.id}`}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {log.createdAt ? format(new Date(log.createdAt), "dd/MM/yyyy HH:mm") : "—"}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-sm" data-testid={`text-activity-employee-${log.id}`}>
                          {log.employeeName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm" data-testid={`text-activity-job-${log.id}`}>
                          {formatJobNumber(log.jobNumber)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {changes.map((c, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {c.label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="space-y-1">
                          {changes.map((c, i) => (
                            <div key={i} className="text-xs">
                              <span className="font-medium">{c.label}:</span>{" "}
                              <span className="text-muted-foreground line-through">
                                {c.oldValue || "—"}
                              </span>
                              {" → "}
                              <span className="text-foreground">{c.newValue || "—"}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
