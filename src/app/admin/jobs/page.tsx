import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards.ts";
import { listAllJobs } from "@/lib/db/queries/admin.ts";
import { RemoveJob } from "@/components/admin/AdminForms";
import { JobStatusBadge, formatDate } from "@/components/marketplace/Bits";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Jobs", robots: { index: false, follow: false } };

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin("/admin/jobs");
  const { status } = await searchParams;
  const jobs = await listAllJobs(status);

  const filters = ["open", "applications", "accepted", "in_progress", "completed", "cancelled"];

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Jobs</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/jobs" className="rounded-full bg-paper-sunk px-3.5 py-1.5 text-sm text-ink-soft hover:bg-white hover:text-ink">
          All
        </Link>
        {filters.map((filter) => (
          <Link
            key={filter}
            href={`/admin/jobs?status=${filter}`}
            className="rounded-full bg-paper-sunk px-3.5 py-1.5 text-sm text-ink-soft hover:bg-white hover:text-ink"
          >
            {filter.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {jobs.length === 0 && <p className="text-sm text-muted">No jobs match.</p>}
        {jobs.map((job) => (
          <div key={job.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{job.title}</span>
                  <JobStatusBadge status={job.status} />
                  {job.removed_at && <Badge tone="accent">Removed</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {job.trade_name} · {job.postcode_outward} · by {job.customer_name} ·{" "}
                  {job.application_count} application{job.application_count === 1 ? "" : "s"} ·{" "}
                  {formatDate(job.created_at)}
                </p>
              </div>
              <RemoveJob jobId={job.id} removed={Boolean(job.removed_at)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
