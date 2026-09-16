import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTradesperson } from "@/lib/auth/guards.ts";
import { getJobForTradesperson } from "@/lib/db/queries/jobs.ts";
import { hasApplied } from "@/lib/db/queries/applications.ts";
import { ApplyForm } from "@/components/marketplace/ApplyForm";
import { JobPhotos } from "@/components/marketplace/JobPhotos";
import { ReportButton } from "@/components/marketplace/ReportButton";
import {
  BUDGET_LABELS,
  JobStatusBadge,
  TIMING_LABELS,
  formatDate,
} from "@/components/marketplace/Bits";

export const metadata: Metadata = { title: "Job", robots: { index: false, follow: false } };

export default async function PublicJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireTradesperson(`/jobs/${id}`);

  // Returns null unless this job is open, or this tradesperson is involved.
  const job = await getJobForTradesperson(id, user.id);
  if (!job) notFound();

  const applied = await hasApplied(id, user.id);
  const open = ["open", "applications"].includes(job.status);

  return (
    <div className="container-page py-10">
      <Link href="/jobs" className="text-sm text-muted hover:text-ink">
        ← All jobs
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{job.title}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="mt-2 text-sm text-muted">
            {job.trade_name}
            {job.category_name ? ` · ${job.category_name}` : ""} · {job.postcode_outward} · Posted{" "}
            {formatDate(job.created_at)}
          </p>

          <p className="mt-6 leading-relaxed whitespace-pre-line text-ink-soft">{job.description}</p>

          <JobPhotos photos={job.photos} />

          <div className="mt-8">
            <ReportButton targetType="job" targetId={job.id} label="Report this job" />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-line bg-white p-5">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted">Area</dt>
                <dd className="text-ink">
                  {job.postcode ?? job.postcode_outward}
                  {!job.postcode && (
                    <span className="block text-xs text-muted">
                      Full address shared once you&apos;re chosen
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Budget</dt>
                <dd className="text-ink">{BUDGET_LABELS[job.budget_band] ?? job.budget_band}</dd>
              </div>
              <div>
                <dt className="text-muted">Timing</dt>
                <dd className="text-ink">{TIMING_LABELS[job.timing] ?? job.timing}</dd>
              </div>
              {job.preferred_date && (
                <div>
                  <dt className="text-muted">Preferred date</dt>
                  <dd className="text-ink">{job.preferred_date}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted">Applications so far</dt>
                <dd className="text-ink">{job.application_count}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            {job.accepted_tradesperson_id === user.id ? (
              <div className="text-sm leading-relaxed text-ink-soft">
                <p className="font-semibold text-ink">You were chosen for this job.</p>
                <Link href="/dashboard/messages" className="mt-2 inline-flex font-medium text-brand hover:underline">
                  Message the customer
                </Link>
              </div>
            ) : applied ? (
              <p className="text-sm leading-relaxed text-ink-soft">
                <span className="font-semibold text-ink">You&apos;ve applied for this job.</span> The
                customer will be in touch if they pick you.
              </p>
            ) : open ? (
              <ApplyForm jobId={job.id} />
            ) : (
              <p className="text-sm text-muted">This job is no longer taking applications.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
