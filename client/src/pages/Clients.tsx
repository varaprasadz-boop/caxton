import { useState } from "react";
import { useLocation } from "wouter";
import ClientCard from "@/components/ClientCard";
import CreateClientForm from "@/components/CreateClientForm";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Client } from "@shared/schema";
import { usePermissions } from "@/hooks/use-permissions";

export default function Clients() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const { canCreate } = usePermissions();

  // Fetch real data
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"]
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["/api/jobs"]
  });

  // Calculate job stats for each client
  const clientsWithStats = clients.map(client => {
    const clientJobs = jobs.filter((job: any) => job.clientId === client.id);
    const activeJobs = clientJobs.filter((job: any) => !["completed", "delivered"].includes(job.status)).length;
    
    return {
      ...client,
      activeJobs,
      totalJobs: clientJobs.length
    };
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

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    console.log('Searching clients:', value);
  };

  const filteredClients = clientsWithStats.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        {canCreate('clients') && (
          <Button onClick={handleCreateClient} data-testid="button-create-client">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-clients"
          />
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map(client => (
          <ClientCard
            key={client.id}
            {...client}
            onView={handleViewClient}
            onEdit={handleEditClient}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No clients found matching "{searchTerm}"</p>
          <Button variant="outline" onClick={() => setSearchTerm("")}>
            Clear Search
          </Button>
        </div>
      )}

      {clients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No clients yet</p>
          <Button onClick={handleCreateClient} data-testid="button-create-first-client">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Client
          </Button>
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