import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards.ts";
import { getAdminStats, listAuditLog } from "@/lib/db/queries/admin.ts";
import { StatTile, formatDateTime } from "@/components/marketplace/Bits";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminHome() {
  await requireAdmin("/admin");
  const [stats, audit] = await Promise.all([getAdminStats(), listAuditLog(8)]);

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Marketplace overview</h1>

      <h2 className="mt-8 text-sm font-semibold tracking-wide text-muted uppercase">People</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total users" value={stats.total_users} />
        <StatTile label="Customers" value={stats.customers} />
        <StatTile label="Tradespeople" value={stats.tradespeople} />
        <StatTile label="Suspended" value={stats.suspended} />
      </dl>

      <h2 className="mt-8 text-sm font-semibold tracking-wide text-muted uppercase">Jobs</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Open" value={stats.open_jobs} />
        <StatTile label="Active" value={stats.active_jobs} />
        <StatTile label="Completed" value={stats.completed_jobs} />
        <StatTile label="Applications" value={stats.applications} />
      </dl>

      <h2 className="mt-8 text-sm font-semibold tracking-wide text-muted uppercase">Needs attention</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Open reports" value={stats.open_reports} />
        <StatTile label="Awaiting verification" value={stats.pending_verification} />
        <StatTile label="Reviews" value={stats.reviews} />
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        {stats.open_reports > 0 && (
          <Link href="/admin/reports" className="text-sm font-medium text-brand hover:underline">
            {stats.open_reports} report{stats.open_reports === 1 ? "" : "s"} to review →
          </Link>
        )}
        {stats.pending_verification > 0 && (
          <Link href="/admin/verification" className="text-sm font-medium text-brand hover:underline">
            {stats.pending_verification} awaiting verification →
          </Link>
        )}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-ink">Recent admin activity</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white">
        {audit.length === 0 ? (
          <p className="p-5 text-sm text-muted">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {audit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span className="text-ink">
                  <span className="font-medium">{entry.admin_name}</span> · {entry.action}
                </span>
                <span className="text-muted">{formatDateTime(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
