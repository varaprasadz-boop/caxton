import { useState } from "react";
import { useLocation } from "wouter";
import CreateClientForm from "@/components/CreateClientForm";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Building2, Mail, Phone, Briefcase, Copy, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Client } from "@shared/schema";
import { usePermissions } from "@/hooks/use-permissions";
import { useToast } from "@/hooks/use-toast";

function formatClientNumber(clientNumber: number): string {
  const paddedNumber = String(clientNumber + 10000).padStart(5, '0');
  return `C${paddedNumber}`;
}

export default function Clients() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [jobsFilter, setJobsFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const { canCreate, canEdit } = usePermissions();
  const { toast } = useToast();

  // Fetch real data
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"]
  });

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs"]
  });

  // Calculate job stats for each client and format client number
  const clientsWithStats = clients.map(client => {
    const clientJobs = jobs.filter((job: any) => job.clientId === client.id);
    const activeJobs = clientJobs.filter((job: any) => !["completed", "delivered"].includes(job.status)).length;
    const formattedClientNumber = formatClientNumber(client.clientNumber);
    
    return {
      ...client,
      formattedClientNumber,
      activeJobs,
      totalJobs: clientJobs.length
    };
  });

  // Apply filters
  const filteredClients = clientsWithStats.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.formattedClientNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesJobs = jobsFilter === "all" || 
      (jobsFilter === "active" && client.activeJobs > 0) ||
      (jobsFilter === "inactive" && client.activeJobs === 0);
    
    const matchesPayment = paymentFilter === "all" || client.paymentMethod === paymentFilter;
    
    return matchesSearch && matchesJobs && matchesPayment;
  });

  const handleCreateClient = () => {
    setIsCreateClientModalOpen(true);
  };

  const handleCreateClientSuccess = () => {
    setIsCreateClientModalOpen(false);
  };

  const handleViewClient = (id: string) => {
    setLocation(`/clients/${id}`);
  };

  const handleEditClient = (id: string) => {
    console.log('Editing client:', id);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleExportCSV = () => {
    if (filteredClients.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no clients matching your current filters",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Client ID", "Name", "Company", "Email", "Phone", "Payment Method", "Active Jobs", "Total Jobs"];
    const csvContent = [
      headers.join(","),
      ...filteredClients.map(client => [
        `"${client.formattedClientNumber}"`,
        `"${client.name}"`,
        `"${client.company}"`,
        `"${client.email}"`,
        `"${client.phone}"`,
        `"${client.paymentMethod}"`,
        client.activeJobs,
        client.totalJobs
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `clients_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${filteredClients.length} clients to CSV`,
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-clients">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client relationships and contact information
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-clients">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {canCreate('clients') && (
            <Button onClick={handleCreateClient} data-testid="button-create-client">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients by ID, name, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-clients"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={jobsFilter} onValueChange={setJobsFilter}>
            <SelectTrigger className="w-40" data-testid="select-jobs-filter">
              <SelectValue placeholder="Job Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="active">With Active Jobs</SelectItem>
              <SelectItem value="inactive">No Active Jobs</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-40" data-testid="select-payment-filter">
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment Methods</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Online">Online</SelectItem>
              <SelectItem value="Credit">Credit</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clients Table */}
      {clients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No clients yet</p>
          {canCreate('clients') && (
            <Button onClick={handleCreateClient} data-testid="button-create-first-client">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Client
            </Button>
          )}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No clients found matching your filters</p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm("");
              setJobsFilter("all");
              setPaymentFilter("all");
            }}
            data-testid="button-clear-filters"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Client ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Jobs</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow 
                  key={client.id}
                  data-testid={`row-client-${client.id}`}
                >
                  <TableCell data-testid={`text-client-id-${client.id}`}>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-medium">
                        {client.formattedClientNumber}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(client.formattedClientNumber, "Client ID")}
                        data-testid={`button-copy-client-id-${client.id}`}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium" data-testid={`text-client-name-${client.id}`}>
                    {client.name}
                  </TableCell>
                  <TableCell data-testid={`text-client-company-${client.id}`}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span>{client.company}</span>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-client-email-${client.id}`}>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">{client.email}</span>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-client-phone-${client.id}`}>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{client.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`badge-client-payment-${client.id}`}>
                    <Badge variant="outline" className="text-xs">
                      {client.paymentMethod}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-client-jobs-${client.id}`}>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Briefcase className="h-3 w-3 mr-1" />
                        {client.activeJobs} Active
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {client.totalJobs} Total
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {canEdit('clients') && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditClient(client.id)}
                          data-testid={`button-edit-client-${client.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewClient(client.id)}
                        data-testid={`button-view-client-${client.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Client Modal */}
      <Modal
        isOpen={isCreateClientModalOpen}
        onClose={() => setIsCreateClientModalOpen(false)}
        title="Add New Client"
      >
        <CreateClientForm 
          onSuccess={handleCreateClientSuccess}
          onCancel={() => setIsCreateClientModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
