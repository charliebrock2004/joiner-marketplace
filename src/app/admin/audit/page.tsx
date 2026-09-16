import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards.ts";
import { listAuditLog } from "@/lib/db/queries/admin.ts";
import { formatDateTime } from "@/components/marketplace/Bits";

export const metadata: Metadata = { title: "Audit log", robots: { index: false, follow: false } };

export default async function AdminAuditPage() {
  await requireAdmin("/admin/audit");
  const entries = await listAuditLog(200);

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Audit log</h1>
      <p className="mt-2 text-ink-soft">
        Every admin action, append-only. This is the record of what was moderated and why.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
        {entries.length === 0 ? (
          <p className="p-5 text-sm text-muted">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {entries.map((entry) => (
              <li key={entry.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-ink">
                    <span className="font-medium">{entry.admin_name}</span>{" "}
                    <span className="font-mono text-xs text-muted">{entry.action}</span>{" "}
                    on {entry.target_type}
                  </span>
                  <span className="text-sm text-muted">{formatDateTime(entry.created_at)}</span>
                </div>
                {Object.keys(entry.metadata ?? {}).length > 0 && (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-paper-sunk p-2 text-xs text-muted">
                    {JSON.stringify(entry.metadata)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
