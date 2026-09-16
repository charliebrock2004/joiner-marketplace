import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------ status ------ */

const JOB_STATUS_LABELS: Record<string, { label: string; tone: "neutral" | "brand" | "accent" | "outline" }> = {
  draft: { label: "Draft", tone: "outline" },
  open: { label: "Open", tone: "brand" },
  applications: { label: "Applications in", tone: "brand" },
  accepted: { label: "Tradesperson chosen", tone: "accent" },
  in_progress: { label: "In progress", tone: "accent" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function JobStatusBadge({ status }: { status: string }) {
  const entry = JOB_STATUS_LABELS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

/* -------------------------------------------------------- experience ------ */

const EXPERIENCE_LABELS: Record<string, string> = {
  apprentice: "Apprentice",
  qualified: "Qualified",
  experienced: "Experienced",
  other: "Other skilled worker",
};

export function experienceLabel(level: string): string {
  return EXPERIENCE_LABELS[level] ?? level;
}

/**
 * Experience level is always shown, and never dressed up as a verification.
 * An apprentice reads as an apprentice.
 */
export function ExperienceBadge({ level }: { level: string }) {
  return <Badge tone="accent">{experienceLabel(level)}</Badge>;
}

/**
 * Verification badge.
 *
 * Only ever renders a positive badge for 'verified', which only an admin can
 * set. Everything else reads as not yet checked, because claiming otherwise is
 * the fastest way to lose a customer's trust.
 */
export function VerificationBadge({ status }: { status: string }) {
  if (status === "verified") {
    return (
      <Badge tone="brand">
        <Icon name="shield" className="size-3.5" />
        ID verified
      </Badge>
    );
  }
  return <Badge tone="outline">Not yet verified</Badge>;
}

/* ------------------------------------------------------------ rating ------ */

export function StarRating({
  value,
  count,
  size = "sm",
}: {
  value: number | null;
  count?: number;
  size?: "sm" | "md";
}) {
  if (value === null || value === undefined) {
    return <span className="text-sm text-muted">No reviews yet</span>;
  }
  const rounded = Math.round(Number(value));
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex gap-0.5 text-accent" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Icon
            key={i}
            name="star"
            filled={i < rounded}
            className={cn(size === "sm" ? "size-3.5" : "size-4", i < rounded ? "" : "text-line-strong")}
          />
        ))}
      </span>
      <span className={cn("font-semibold text-ink", size === "sm" ? "text-sm" : "text-base")}>
        {Number(value).toFixed(1)}
      </span>
      {typeof count === "number" && (
        <span className="text-sm text-muted">
          ({count} review{count === 1 ? "" : "s"})
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------ layout ------ */

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-white p-10 text-center">
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex h-11 items-center rounded-full bg-brand px-5 text-[0.9375rem] font-medium text-white transition-colors hover:bg-brand-hover"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-ink">{value}</dd>
    </div>
  );
}

export const BUDGET_LABELS: Record<string, string> = {
  unsure: "Budget not set",
  "under-100": "Under £100",
  "100-250": "£100–£250",
  "250-500": "£250–£500",
  "500-1000": "£500–£1,000",
  "over-1000": "Over £1,000",
};

export const TIMING_LABELS: Record<string, string> = {
  asap: "As soon as possible",
  "this-week": "This week",
  "next-2-weeks": "Next couple of weeks",
  "this-month": "Within a month",
  flexible: "Flexible",
};

export function formatDate(value: string | Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}
