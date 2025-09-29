import DeadlineAlerts from '../DeadlineAlerts';

export default function DeadlineAlertsExample() {
  // TODO: Remove mock data when implementing real functionality
  const mockDeadlineItems = [
    {
      id: "1",
      title: "Business Card Print Run",
      type: "job" as const,
      client: "TechCorp Solutions",
      deadline: new Date("2023-12-20"), // Overdue
      status: "printing"
    },
    {
      id: "2",
      title: "QC Task for Brochures",
      type: "task" as const,
      client: "Green Earth Co",
      deadline: new Date(), // Due today
      status: "pending",
      stage: "QC"
    },
    {
      id: "3",
      title: "Marketing Flyers",
      type: "job" as const,
      client: "Local Cafe",
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Due in 2 days
      status: "cutting"
    },
    {
      id: "4",
      title: "Binding Task",
      type: "task" as const,
      deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Due in 1 day
      status: "pending",
      stage: "Binding"
    }
  ];

  return (
    <div className="p-4">
      <DeadlineAlerts 
        items={mockDeadlineItems}
        onView={(id, type) => console.log('View:', type, id)}
      />
    </div>
  );
}