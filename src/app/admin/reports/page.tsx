import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards.ts";
import { listReports } from "@/lib/db/queries/admin.ts";
import { ResolveReport } from "@/components/admin/AdminForms";
import { formatDateTime } from "@/components/marketplace/Bits";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Reports", robots: { index: false, follow: false } };

const TARGET_LINKS: Record<string, (id: string) => string | null> = {
  user: (id) => `/tradespeople/${id}`,
  job: (id) => `/admin/jobs?highlight=${id}`,
  review: () => `/admin/reviews`,
  message: () => null,
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin("/admin/reports");
  const { status } = await searchParams;
  const reports = await listReports(status);

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Reports</h1>
      <p className="mt-2 text-ink-soft">Anything users have flagged, newest and unresolved first.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/reports" className="rounded-full bg-paper-sunk px-3.5 py-1.5 text-sm text-ink-soft hover:bg-white hover:text-ink">
          All
        </Link>
        {["open", "reviewing", "resolved", "dismissed"].map((value) => (
          <Link
            key={value}
            href={`/admin/reports?status=${value}`}
            className="rounded-full bg-paper-sunk px-3.5 py-1.5 text-sm text-ink-soft hover:bg-white hover:text-ink"
          >
            {value}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {reports.length === 0 && <p className="text-sm text-muted">Nothing in the queue.</p>}
        {reports.map((report) => {
          const link = TARGET_LINKS[report.target_type]?.(report.target_id) ?? null;
          return (
            <div key={report.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={report.status === "open" ? "accent" : "outline"}>{report.status}</Badge>
                  <span className="font-medium text-ink">{report.reason.replace("_", " ")}</span>
                  <span className="text-sm text-muted">on a {report.target_type}</span>
                </div>
                <span className="text-sm text-muted">{formatDateTime(report.created_at)}</span>
              </div>
              <p className="mt-2 text-sm text-muted">Reported by {report.reporter_name}</p>
              {report.details && (
                <p className="mt-3 rounded-xl bg-paper-sunk p-3 text-sm text-ink-soft">{report.details}</p>
              )}
              {report.resolution_notes && (
                <p className="mt-2 text-sm text-muted">Resolution: {report.resolution_notes}</p>
              )}
              {link && (
                <Link href={link} className="mt-3 inline-flex text-sm font-medium text-brand hover:underline">
                  View reported {report.target_type}
                </Link>
              )}
              <div className="mt-4">
                <ResolveReport reportId={report.id} current={report.status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
