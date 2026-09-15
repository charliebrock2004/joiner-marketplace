import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

/**
 * A mock-up of the worker profile we are building.
 *
 * It is labelled, and repeatedly described, as an example. Nothing here is a
 * real joiner and no real statistics are implied — presenting invented numbers
 * as real would poison the exact trust we are trying to build.
 */
export function ReputationPreview() {
  return (
    <figure className="relative m-0">
      <div className="pointer-events-none absolute -top-3 left-4 z-10">
        <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase">
          Example only — not a real joiner
        </span>
      </div>

      <div className="rounded-2xl border border-line bg-white p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-lg font-semibold text-muted"
            aria-hidden="true"
          >
            JM
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">J. McKay</span>
              <Badge tone="brand">
                <Icon name="shield" className="size-3.5" />
                Verified identity
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted">Qualified joiner · Crieff · travels 20 miles</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <span className="flex gap-0.5 text-accent" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Icon key={i} name="star" filled className="size-4" />
            ))}
          </span>
          <span className="text-sm font-semibold text-ink">4.9</span>
          <span className="text-sm text-muted">from 38 reviews</span>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-5">
          {[
            { label: "Jobs completed", value: "47" },
            { label: "Completion rate", value: "98%" },
            { label: "Responds within", value: "3 hrs" },
          ].map((stat) => (
            <div key={stat.label}>
              <dt className="text-xs text-muted">{stat.label}</dt>
              <dd className="mt-0.5 text-lg font-semibold text-ink">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
          <Badge tone="accent">Qualified joiner</Badge>
          <Badge tone="outline">Doors</Badge>
          <Badge tone="outline">Flooring</Badge>
          <Badge tone="outline">Shelving</Badge>
        </div>
      </div>

      <figcaption className="mt-3 text-sm text-muted">
        This is a design preview of the joiner profiles we&apos;re building. Ratings, verification
        and completion stats are not live yet.
      </figcaption>
    </figure>
  );
}
