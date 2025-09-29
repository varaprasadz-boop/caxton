import TaskTimeline from '../TaskTimeline';

export default function TaskTimelineExample() {
  // TODO: Remove mock data when implementing real functionality
  const mockTasks = [
    {
      id: "1",
      stage: "Pre-Press",
      employeeName: "Sarah Design",
      deadline: new Date("2024-01-10"),
      status: "completed" as const,
      order: 1
    },
    {
      id: "2",
      stage: "Printing", 
      employeeName: "Mike Printer",
      deadline: new Date("2024-01-12"),
      status: "in-progress" as const,
      order: 2
    },
    {
      id: "3",
      stage: "Cutting",
      deadline: new Date("2024-01-13"),
      status: "pending" as const,
      order: 3
    },
    {
      id: "4",
      stage: "Binding",
      deadline: new Date("2024-01-14"),
      status: "pending" as const,
      order: 4
    },
    {
      id: "5",
      stage: "QC",
      deadline: new Date("2023-12-28"),
      status: "pending" as const,
      order: 5
    }
  ];

  return (
    <div className="p-4">
      <TaskTimeline
        jobId="sample-job"
        jobTitle="Business Card Print Run"
        tasks={mockTasks}
        onAssignTask={(id) => console.log('Assign task:', id)}
        onUpdateStatus={(id, status) => console.log('Update task status:', id, status)}
      />
    </div>
  );
}