import JobCard from '../JobCard';

export default function JobCardExample() {
  // TODO: Remove mock data when implementing real functionality
  const mockJobs = [
    {
      id: "1",
      title: "Business Card Print Run",
      client: "TechCorp Solutions",
      jobType: "Business Cards",
      quantity: 1000,
      deadline: new Date("2024-01-15"),
      status: "printing",
      description: "Premium business cards with matte finish and embossed logo"
    },
    {
      id: "2", 
      title: "Marketing Brochure",
      client: "Green Earth Co",
      jobType: "Brochures",
      quantity: 500,
      deadline: new Date("2023-12-20"),
      status: "overdue",
      description: "Tri-fold brochures for environmental awareness campaign"
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {mockJobs.map(job => (
          <JobCard
            key={job.id}
            {...job}
            onView={(id) => console.log('View job:', id)}
          />
        ))}
      </div>
    </div>
  );
}