import DashboardStats from '../DashboardStats';

export default function DashboardStatsExample() {
  return (
    <div className="p-4">
      <DashboardStats 
        totalJobs={45}
        activeJobs={12}
        completedJobs={28}
        overdueJobs={5}
      />
    </div>
  );
}