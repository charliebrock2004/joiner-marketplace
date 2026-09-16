import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards.ts";
import { listAllReviews } from "@/lib/db/queries/admin.ts";
import { ModerateReview } from "@/components/admin/AdminForms";
import { StarRating, formatDate } from "@/components/marketplace/Bits";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Reviews", robots: { index: false, follow: false } };

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin("/admin/reviews");
  const { status } = await searchParams;
  const reviews = await listAllReviews(status);

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Reviews</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/reviews" className="rounded-full bg-paper-sunk px-3.5 py-1.5 text-sm text-ink-soft hover:bg-white hover:text-ink">
          All
        </Link>
        {["published", "hidden", "removed"].map((value) => (
          <Link
            key={value}
            href={`/admin/reviews?status=${value}`}
            className="rounded-full bg-paper-sunk px-3.5 py-1.5 text-sm text-ink-soft hover:bg-white hover:text-ink"
          >
            {value}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {reviews.length === 0 && <p className="text-sm text-muted">No reviews match.</p>}
        {reviews.map((review) => (
          <div key={review.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StarRating value={review.rating} />
              <div className="flex items-center gap-2">
                <Badge tone={review.status === "published" ? "brand" : "outline"}>{review.status}</Badge>
                <span className="text-sm text-muted">{formatDate(review.created_at)}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">
              {review.reviewer_name} → {review.subject_name} · {review.job_title}
            </p>
            {review.body && <p className="mt-3 text-ink-soft">{review.body}</p>}
            <div className="mt-4">
              <ModerateReview reviewId={review.id} current={review.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
