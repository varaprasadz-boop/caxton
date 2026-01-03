import EmployeeCard from '../EmployeeCard';

export default function EmployeeCardExample() {
  // TODO: Remove mock data when implementing real functionality
  const mockEmployees = [
    {
      id: "1",
      name: "Sarah Design",
      role: "Designer",
      email: "sarah@caxton.com",
      phone: "+1 555-0111",
      activeTasks: 2,
      completedTasks: 15
    },
    {
      id: "2",
      name: "Mike Printer",
      role: "Printer",
      email: "mike@caxton.com",
      phone: "+1 555-0222",
      activeTasks: 4,
      completedTasks: 28
    },
    {
      id: "3",
      name: "Anna QC",
      role: "QC",
      email: "anna@caxton.com",
      activeTasks: 1,
      completedTasks: 22
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockEmployees.map(employee => (
          <EmployeeCard
            key={employee.id}
            {...employee}
            onView={(id) => console.log('View employee:', id)}
            onEdit={(id) => console.log('Edit employee:', id)}
          />
        ))}
      </div>
    </div>
  );
}