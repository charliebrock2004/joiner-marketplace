import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards.ts";
import { countJobsByStatus, listJobsForCustomer } from "@/lib/db/queries/jobs.ts";
import { getProfileByUserId } from "@/lib/db/queries/profiles.ts";
import { getReviewStats } from "@/lib/db/queries/reviews.ts";
import { listReviewableJobs } from "@/lib/db/queries/reviews.ts";
import { EmptyState, JobStatusBadge, StarRating, StatTile } from "@/components/marketplace/Bits";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");

  if (user.role === "customer") {
    const [counts, jobs, reviewable] = await Promise.all([
      countJobsByStatus(user.id),
      listJobsForCustomer(user.id),
      listReviewableJobs(user.id),
    ]);
    const active = (counts.accepted ?? 0) + (counts.in_progress ?? 0);

    return (
      <div className="container-page py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Hello, {user.fullName}</h1>
            <p className="mt-1 text-ink-soft">Post a job and choose who does it.</p>
          </div>
          <ButtonLink href="/dashboard/jobs/new">Post a job</ButtonLink>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Open jobs" value={(counts.open ?? 0) + (counts.applications ?? 0)} />
          <StatTile label="Active jobs" value={active} />
          <StatTile label="Completed" value={counts.completed ?? 0} />
          <StatTile label="Awaiting review" value={reviewable.length} />
        </dl>

        {reviewable.length > 0 && (
          <div className="mt-8 rounded-2xl border border-line bg-white p-6">
            <h2 className="font-semibold text-ink">Leave a review</h2>
            <p className="mt-1 text-sm text-muted">
              {reviewable.length} completed job{reviewable.length === 1 ? "" : "s"} waiting for your
              feedback. Reviews are how good tradespeople get more work.
            </p>
            <Link
              href="/dashboard/reviews"
              className="mt-4 inline-flex text-sm font-medium text-brand hover:underline"
            >
              Review your completed jobs
            </Link>
          </div>
        )}

        <h2 className="mt-10 text-lg font-semibold text-ink">Recent jobs</h2>
        <div className="mt-4 space-y-3">
          {jobs.length === 0 ? (
            <EmptyState
              title="No jobs yet"
              body="Post your first job and we'll put it in front of local tradespeople who have availability."
              action={{ href: "/dashboard/jobs/new", label: "Post a job" }}
            />
          ) : (
            jobs.slice(0, 5).map((job) => (
              <Link
                key={job.id}
                href={`/dashboard/jobs/${job.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white p-4 transition-colors hover:border-line-strong"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{job.title}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {job.trade_name} · {job.postcode_outward} · {job.application_count} application
                    {job.application_count === 1 ? "" : "s"}
                  </p>
                </div>
                <JobStatusBadge status={job.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    );
  }

  // Tradesperson overview.
  const [profile, stats] = await Promise.all([
    getProfileByUserId(user.id),
    getReviewStats(user.id),
  ]);
  const profileComplete = Boolean(profile?.primary_trade_id && profile?.about);

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Hello, {user.fullName}</h1>
          <p className="mt-1 text-ink-soft">Find local work that fits round your week.</p>
        </div>
        <ButtonLink href="/jobs">Find jobs</ButtonLink>
      </div>

      {!profileComplete && (
        <div className="mt-8 rounded-2xl border border-accent/30 bg-accent-soft p-6">
          <h2 className="font-semibold text-ink">Finish your profile first</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            We match jobs on your trade, the work you want and how far you travel. Until that is
            filled in we cannot show you anything relevant.
          </p>
          <ButtonLink href="/dashboard/profile" className="mt-4">
            Complete my profile
          </ButtonLink>
        </div>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Jobs completed" value={stats.jobs_completed} />
        <StatTile label="Reviews" value={stats.review_count} />
        <StatTile label="Rating" value={stats.average_rating ? Number(stats.average_rating).toFixed(1) : "—"} />
        <StatTile label="Travel radius" value={profile ? `${profile.radius_miles} mi` : "—"} />
      </dl>

      <div className="mt-8 rounded-2xl border border-line bg-white p-6">
        <h2 className="font-semibold text-ink">Your reputation</h2>
        <div className="mt-3">
          <StarRating value={stats.average_rating} count={stats.review_count} size="md" />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Completed jobs and customer reviews are what win the next job. Verification is reviewed by
          our team — it is never granted automatically.
        </p>
      </div>
    </div>
  );
}
