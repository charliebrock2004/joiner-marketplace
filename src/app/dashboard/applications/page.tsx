import type { Metadata } from "next";
import Link from "next/link";
import { requireTradesperson } from "@/lib/auth/guards.ts";
import { listJobsForTradesperson } from "@/lib/db/queries/jobs.ts";
import { BUDGET_LABELS, EmptyState, JobStatusBadge, formatDate } from "@/components/marketplace/Bits";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "My applications", robots: { index: false, follow: false } };

const APPLICATION_LABELS: Record<string, string> = {
  pending: "Waiting to hear",
  shortlisted: "Shortlisted",
  accepted: "You got it",
  declined: "Not chosen",
  withdrawn: "Withdrawn",
};

export default async function ApplicationsPage() {
  const user = await requireTradesperson("/dashboard/applications");
  const jobs = await listJobsForTradesperson(user.id);

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-ink sm:text-3xl">My applications</h1>
      <p className="mt-1 text-ink-soft">Jobs you&apos;ve shown interest in.</p>

      <div className="mt-8 space-y-3">
        {jobs.length === 0 ? (
          <EmptyState
            title="No applications yet"
            body="Browse local jobs in your trade and tell customers you're interested."
            action={{ href: "/jobs", label: "Find jobs" }}
          />
        ) : (
          jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block rounded-2xl border border-line bg-white p-5 transition-colors hover:border-line-strong"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-medium text-ink">{job.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {job.trade_name} · {job.postcode_outward} · Posted {formatDate(job.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {job.application_status && (
                    <Badge tone={job.application_status === "accepted" ? "brand" : "outline"}>
                      {APPLICATION_LABELS[job.application_status] ?? job.application_status}
                    </Badge>
                  )}
                  <JobStatusBadge status={job.status} />
                </div>
              </div>
              <p className="mt-3 text-sm text-muted">
                Budget: {BUDGET_LABELS[job.budget_band] ?? job.budget_band}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
