import StatusBadge from '../StatusBadge';

export default function StatusBadgeExample() {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Job Statuses</h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="pending" variant="job" />
          <StatusBadge status="pre-press" variant="job" />
          <StatusBadge status="printing" variant="job" />
          <StatusBadge status="cutting" variant="job" />
          <StatusBadge status="completed" variant="job" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Task Statuses</h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="pending" variant="task" />
          <StatusBadge status="in-progress" variant="task" />
          <StatusBadge status="completed" variant="task" />
          <StatusBadge status="overdue" variant="task" />
        </div>
      </div>
    </div>
  );
}