import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards.ts";
import { getPublicProfile } from "@/lib/db/queries/profiles.ts";
import { getReviewStats, listReviewsFor } from "@/lib/db/queries/reviews.ts";
import { isTrustedImageUrl } from "@/lib/storage";
import { ReportButton } from "@/components/marketplace/ReportButton";
import {
  ExperienceBadge,
  StarRating,
  StatTile,
  VerificationBadge,
  formatDate,
} from "@/components/marketplace/Bits";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Tradesperson",
  robots: { index: false, follow: false },
};

/**
 * Public tradesperson profile.
 *
 * Sign-in required: profiles are for people using the marketplace, not a
 * scrapeable directory. Contact details are never rendered here — they are
 * exchanged through messaging once a customer has chosen someone.
 */
export default async function TradespersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/tradespeople/${id}`);

  const profile = await getPublicProfile(id);
  if (!profile) notFound();

  const [stats, reviews] = await Promise.all([getReviewStats(id), listReviewsFor(id)]);
  const portfolio = profile.portfolio.filter((p) => isTrustedImageUrl(p.url));

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper-sunk text-xl font-semibold text-muted">
            {profile.profile_photo_url && isTrustedImageUrl(profile.profile_photo_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.profile_photo_url} alt="" className="size-full object-cover" />
            ) : (
              profile.full_name.slice(0, 1)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{profile.full_name}</h1>
            <p className="mt-1 text-ink-soft">
              {profile.trade_name ?? "Trade not set"} · {profile.postcode_outward ?? "—"} · travels{" "}
              {profile.radius_miles} miles
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ExperienceBadge level={profile.experience_level} />
              <VerificationBadge status={profile.verification_status} />
              {!profile.accepting_work && <Badge tone="neutral">Not taking work right now</Badge>}
            </div>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Jobs completed" value={stats.jobs_completed} />
          <StatTile label="Reviews" value={stats.review_count} />
          <StatTile
            label="Rating"
            value={stats.average_rating ? Number(stats.average_rating).toFixed(1) : "—"}
          />
          <StatTile label="Years" value={profile.years_experience} />
        </dl>

        {profile.about && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">About</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-soft">{profile.about}</p>
          </section>
        )}

        {profile.qualifications && (
          <section className="mt-8 rounded-2xl border border-line bg-paper-sunk p-5">
            <h2 className="font-semibold text-ink">Qualifications</h2>
            <p className="mt-2 text-ink-soft">{profile.qualifications}</p>
            <p className="mt-3 text-sm text-muted">
              Self-declared by {profile.full_name.split(" ")[0]}.{" "}
              {profile.verification_status === "verified"
                ? "Their identity has been verified by our team."
                : "Our team has not verified this yet."}
            </p>
          </section>
        )}

        {profile.skills.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Work they take on</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill.id} className="rounded-full bg-paper-sunk px-3 py-1.5 text-sm text-ink-soft">
                  {skill.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {portfolio.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Photos of their work</h2>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {portfolio.map((photo) => (
                <li key={photo.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption ?? ""}
                    loading="lazy"
                    className="aspect-square w-full rounded-xl border border-line object-cover"
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-ink">Reviews</h2>
            <StarRating value={stats.average_rating} count={stats.review_count} size="md" />
          </div>

          {reviews.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-line-strong bg-white p-6 text-sm text-muted">
              No reviews yet. Reviews can only be left by a customer whose job was completed through
              Tradezy, so they take a little time to build up.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {reviews.map((review) => (
                <li key={review.id} className="rounded-2xl border border-line bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StarRating value={review.rating} />
                    <span className="text-sm text-muted">{formatDate(review.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {review.reviewer_name} · {review.job_title}
                  </p>
                  {review.body && (
                    <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-soft">{review.body}</p>
                  )}
                  <div className="mt-3">
                    <ReportButton targetType="review" targetId={review.id} label="Report this review" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-10 border-t border-line pt-6">
          <ReportButton targetType="user" targetId={profile.user_id} label="Report this person" />
        </div>
      </div>
    </div>
  );
}
