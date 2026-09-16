import type { Metadata } from "next";
import Link from "next/link";
import { requireCustomer } from "@/lib/auth/guards.ts";
import { listJobsForCustomer } from "@/lib/db/queries/jobs.ts";
import { BUDGET_LABELS, EmptyState, JobStatusBadge, formatDate } from "@/components/marketplace/Bits";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "My jobs", robots: { index: false, follow: false } };

export default async function MyJobsPage() {
  const user = await requireCustomer("/dashboard/jobs");
  const jobs = await listJobsForCustomer(user.id);

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">My jobs</h1>
        <ButtonLink href="/dashboard/jobs/new">Post a job</ButtonLink>
      </div>

      <div className="mt-8 space-y-3">
        {jobs.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            body="Post your first job and local tradespeople with availability will be able to apply."
            action={{ href: "/dashboard/jobs/new", label: "Post a job" }}
          />
        ) : (
          jobs.map((job) => (
            <Link
              key={job.id}
              href={`/dashboard/jobs/${job.id}`}
              className="block rounded-2xl border border-line bg-white p-5 transition-colors hover:border-line-strong"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-medium text-ink">{job.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {job.trade_name}
                    {job.category_name ? ` · ${job.category_name}` : ""} · {job.postcode_outward}
                  </p>
                </div>
                <JobStatusBadge status={job.status} />
              </div>
              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
                <div className="flex gap-1.5">
                  <dt>Posted</dt>
                  <dd className="text-ink">{formatDate(job.created_at)}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>Budget</dt>
                  <dd className="text-ink">{BUDGET_LABELS[job.budget_band] ?? job.budget_band}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>Applications</dt>
                  <dd className="font-medium text-ink">{job.application_count}</dd>
                </div>
              </dl>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
