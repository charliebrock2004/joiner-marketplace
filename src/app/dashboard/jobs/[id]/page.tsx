import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth/guards.ts";
import { getJobForCustomer } from "@/lib/db/queries/jobs.ts";
import { listApplicantsForJob } from "@/lib/db/queries/applications.ts";
import { AcceptApplicantButton, JobStatusActions } from "@/components/marketplace/JobActions";
import {
  BUDGET_LABELS,
  EmptyState,
  ExperienceBadge,
  JobStatusBadge,
  StarRating,
  TIMING_LABELS,
  VerificationBadge,
  formatDate,
} from "@/components/marketplace/Bits";
import { JobPhotos } from "@/components/marketplace/JobPhotos";

export const metadata: Metadata = { title: "Job", robots: { index: false, follow: false } };

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ posted?: string; accepted?: string }>;
}) {
  const { id } = await params;
  const user = await requireCustomer(`/dashboard/jobs/${id}`);
  const flags = await searchParams;

  // Scoped by customer id inside the query — a guessed UUID returns nothing.
  const job = await getJobForCustomer(id, user.id);
  if (!job) notFound();

  const applicants = await listApplicantsForJob(id, user.id);
  const chosen = applicants.find((a) => a.status === "accepted");

  return (
    <div className="container-page py-10">
      {flags.posted && (
        <div role="status" className="mb-6 rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-brand-ink">
          Your job is live. We&apos;ll let you know as tradespeople apply.
        </div>
      )}
      {flags.accepted && (
        <div role="status" className="mb-6 rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-brand-ink">
          You&apos;ve chosen your tradesperson. You can now message each other to sort the details.
        </div>
      )}

      <Link href="/dashboard/jobs" className="text-sm text-muted hover:text-ink">
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
            {job.category_name ? ` · ${job.category_name}` : ""} · Posted {formatDate(job.created_at)}
          </p>

          <p className="mt-6 leading-relaxed whitespace-pre-line text-ink-soft">{job.description}</p>

          <JobPhotos photos={job.photos} />

          <h2 className="mt-10 text-lg font-semibold text-ink">
            {applicants.length} application{applicants.length === 1 ? "" : "s"}
          </h2>

          <div className="mt-4 space-y-3">
            {applicants.length === 0 ? (
              <EmptyState
                title="No applications yet"
                body="We're showing your job to local tradespeople whose trade and travel area match. This usually takes a day or two."
              />
            ) : (
              applicants.map((applicant) => (
                <article
                  key={applicant.id}
                  className={`rounded-2xl border bg-white p-5 ${
                    applicant.status === "accepted" ? "border-brand" : "border-line"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/tradespeople/${applicant.tradesperson_id}`}
                          className="font-semibold text-ink hover:underline"
                        >
                          {applicant.full_name}
                        </Link>
                        <ExperienceBadge level={applicant.experience_level} />
                        <VerificationBadge status={applicant.verification_status} />
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {applicant.trade_name ?? "Trade not set"} · {applicant.postcode_outward ?? "—"} ·{" "}
                        {applicant.years_experience} year{applicant.years_experience === 1 ? "" : "s"} experience
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-4">
                        <StarRating value={applicant.average_rating} count={applicant.review_count} />
                        <span className="text-sm text-muted">
                          {applicant.jobs_completed} job{applicant.jobs_completed === 1 ? "" : "s"} completed
                        </span>
                      </div>
                    </div>
                    {applicant.status === "accepted" && <JobStatusBadge status="accepted" />}
                  </div>

                  {applicant.quote_amount && (
                    <p className="mt-3 text-sm">
                      <span className="text-muted">Their estimate: </span>
                      <span className="font-semibold text-ink">
                        £{Number(applicant.quote_amount).toFixed(2)}
                      </span>
                    </p>
                  )}

                  {applicant.message && (
                    <p className="mt-3 rounded-xl bg-paper-sunk p-4 text-sm leading-relaxed whitespace-pre-line text-ink-soft">
                      {applicant.message}
                    </p>
                  )}

                  {!chosen && ["open", "applications"].includes(job.status) && (
                    <div className="mt-4">
                      <AcceptApplicantButton applicationId={applicant.id} />
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-semibold text-ink">Job details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted">Location</dt>
                <dd className="text-ink">{job.postcode}</dd>
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
            </dl>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-semibold text-ink">Manage</h2>
            <div className="mt-4">
              <JobStatusActions jobId={job.id} status={job.status} />
            </div>
            {job.status === "completed" && (
              <Link
                href="/dashboard/reviews"
                className="mt-4 inline-flex text-sm font-medium text-brand hover:underline"
              >
                Leave a review
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
