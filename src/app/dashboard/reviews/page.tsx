import type { Metadata } from "next";
import { requireCustomer } from "@/lib/auth/guards.ts";
import { listReviewableJobs } from "@/lib/db/queries/reviews.ts";
import { ReviewForm } from "@/components/marketplace/ReviewForm";
import { EmptyState } from "@/components/marketplace/Bits";

export const metadata: Metadata = { title: "Reviews", robots: { index: false, follow: false } };

export default async function ReviewsPage() {
  const user = await requireCustomer("/dashboard/reviews");
  const reviewable = await listReviewableJobs(user.id);

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Leave a review</h1>
        <p className="mt-1 text-ink-soft">
          You can review a tradesperson once the job is marked complete. One review per job.
        </p>

        <div className="mt-8 space-y-5">
          {reviewable.length === 0 ? (
            <EmptyState
              title="Nothing to review yet"
              body="When one of your jobs is completed it will appear here so you can leave a review."
              action={{ href: "/dashboard/jobs", label: "View my jobs" }}
            />
          ) : (
            reviewable.map((job) => (
              <ReviewForm
                key={job.job_id}
                jobId={job.job_id}
                jobTitle={job.title}
                tradespersonName={job.tradesperson_name}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
