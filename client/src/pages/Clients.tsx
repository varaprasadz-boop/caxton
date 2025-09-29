import { useState } from "react";
import ClientCard from "@/components/ClientCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");

  // TODO: Remove mock data when implementing real functionality
  const mockClients = [
    {
      id: "1",
      name: "John Smith",
      company: "TechCorp Solutions",
      email: "john@techcorp.com",
      phone: "+1 555-0123",
      activeJobs: 3,
      totalJobs: 12
    },
    {
      id: "2",
      name: "Sarah Johnson",
      company: "Green Earth Co",
      email: "sarah@greenearth.org", 
      phone: "+1 555-0456",
      activeJobs: 1,
      totalJobs: 8
    },
    {
      id: "3",
      name: "Mike Chen",
      company: "Fashion Store",
      email: "mike@fashionstore.com",
      phone: "+1 555-0789",
      activeJobs: 2,
      totalJobs: 15
    },
    {
      id: "4",
      name: "Emma Wilson", 
      company: "Local Events Co",
      email: "emma@localevents.com",
      phone: "+1 555-0321",
      activeJobs: 0,
      totalJobs: 4
    }
  ];

  const handleCreateClient = () => {
    console.log('Creating new client');
  };

  const handleViewClient = (id: string) => {
    console.log('Viewing client:', id);
  };

  const handleEditClient = (id: string) => {
    console.log('Editing client:', id);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    console.log('Searching clients:', value);
  };

  const filteredClients = mockClients.filter(client =>
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
        <Button onClick={handleCreateClient} data-testid="button-create-client">
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
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

      {mockClients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No clients yet</p>
          <Button onClick={handleCreateClient} data-testid="button-create-first-client">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Client
          </Button>
        </div>
      )}
    </div>
  );
}