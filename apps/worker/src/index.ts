type JobName = "certificate.generate" | "notification.deliver" | "report.export";

interface WorkerJob {
  id: string;
  name: JobName;
  payload: Record<string, unknown>;
  attempts: number;
}

const demoJobs: WorkerJob[] = [
  { id: "job-cert-demo", name: "certificate.generate", payload: { enrollmentId: "enroll-security-lena" }, attempts: 0 },
  { id: "job-reminder-demo", name: "notification.deliver", payload: { userId: "user-learner", template: "lesson-reminder" }, attempts: 0 }
];

export async function processJob(job: WorkerJob) {
  job.attempts += 1;
  return {
    jobId: job.id,
    name: job.name,
    status: "completed",
    attempts: job.attempts,
    processedAt: new Date().toISOString()
  };
}

if (process.env.NODE_ENV !== "test") {
  for (const job of demoJobs) {
    processJob(job).then((result) => console.log(JSON.stringify(result)));
  }
}
