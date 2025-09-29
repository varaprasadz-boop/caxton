import ClientCard from '../ClientCard';

export default function ClientCardExample() {
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
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {mockClients.map(client => (
          <ClientCard
            key={client.id}
            {...client}
            onView={(id) => console.log('View client:', id)}
            onEdit={(id) => console.log('Edit client:', id)}
          />
        ))}
      </div>
    </div>
  );
}