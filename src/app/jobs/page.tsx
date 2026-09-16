import type { Metadata } from "next";
import Link from "next/link";
import { requireTradesperson } from "@/lib/auth/guards.ts";
import { listMarketplaceJobs } from "@/lib/db/queries/jobs.ts";
import { getProfileByUserId, getTradeIdsForProfile } from "@/lib/db/queries/profiles.ts";
import { parsePostcode } from "@/lib/geo/postcode.ts";
import { BUDGET_LABELS, EmptyState, TIMING_LABELS, formatDate } from "@/components/marketplace/Bits";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Find jobs", robots: { index: false, follow: false } };

export default async function MarketplacePage() {
  const user = await requireTradesperson("/jobs");
  const profile = await getProfileByUserId(user.id);

  if (!profile?.primary_trade_id) {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-lg">
          <EmptyState
            title="Set up your profile first"
            body="We match jobs on your trade, the work you want and how far you'll travel. Fill that in and local jobs will appear here."
            action={{ href: "/dashboard/profile", label: "Complete my profile" }}
          />
        </div>
      </div>
    );
  }

  const location = parsePostcode(user.postcode ?? "");
  const tradeIds = await getTradeIdsForProfile(profile.id, profile.primary_trade_id);

  const jobs = await listMarketplaceJobs({
    tradeIds,
    outward: location?.outward ?? null,
    area: location?.area ?? null,
    radiusMiles: profile.radius_miles,
    tradespersonId: user.id,
  });

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Jobs near you</h1>
          <p className="mt-1 text-ink-soft">
            {profile.trade_name} · within {profile.radius_miles} miles of {location?.outward ?? "your postcode"}
          </p>
        </div>
        <ButtonLink href="/dashboard/profile" variant="secondary">
          Change what I see
        </ButtonLink>
      </div>

      <div className="mt-8 space-y-3">
        {jobs.length === 0 ? (
          <EmptyState
            title="Nothing matching right now"
            body="There are no open jobs in your trade and travel area at the moment. We're still building the network locally, so check back — or widen your radius in your profile."
            action={{ href: "/dashboard/profile", label: "Widen my radius" }}
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
                    {job.trade_name}
                    {job.category_name ? ` · ${job.category_name}` : ""} · {job.postcode_outward}
                  </p>
                </div>
                <span className="rounded-full bg-paper-sunk px-3 py-1 text-sm font-medium text-ink">
                  {BUDGET_LABELS[job.budget_band] ?? job.budget_band}
                </span>
              </div>
              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
                <div className="flex gap-1.5">
                  <dt>Posted</dt>
                  <dd className="text-ink">{formatDate(job.created_at)}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>Timing</dt>
                  <dd className="text-ink">{TIMING_LABELS[job.timing] ?? job.timing}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>Applications</dt>
                  <dd className="text-ink">{job.application_count}</dd>
                </div>
              </dl>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
