import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards.ts";
import { listUsers } from "@/lib/db/queries/admin.ts";
import { ReinstateUser, SuspendUser } from "@/components/admin/AdminForms";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/components/marketplace/Bits";

export const metadata: Metadata = { title: "Users", robots: { index: false, follow: false } };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string; q?: string }>;
}) {
  await requireAdmin("/admin/users");
  const { role, status, q } = await searchParams;

  const users = await listUsers({
    role: ["customer", "tradesperson", "admin"].includes(role ?? "") ? role : undefined,
    status: ["active", "suspended"].includes(status ?? "") ? status : undefined,
    search: q,
  });

  const filters = [
    { label: "All", href: "/admin/users" },
    { label: "Customers", href: "/admin/users?role=customer" },
    { label: "Tradespeople", href: "/admin/users?role=tradesperson" },
    { label: "Suspended", href: "/admin/users?status=suspended" },
  ];

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Users</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.href}
            href={filter.href}
            className="rounded-full bg-paper-sunk px-3.5 py-1.5 text-sm text-ink-soft hover:bg-white hover:text-ink"
          >
            {filter.label}
          </Link>
        ))}
        <form className="ml-auto flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name or email"
            className="h-9 rounded-full border border-line-strong bg-white px-4 text-sm"
            aria-label="Search users"
          />
        </form>
      </div>

      <div className="mt-6 space-y-3">
        {users.length === 0 && <p className="text-sm text-muted">No users match.</p>}
        {users.map((user) => (
          <div key={user.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{user.full_name}</span>
                  <Badge tone="outline">{user.role}</Badge>
                  {user.status === "suspended" && <Badge tone="accent">Suspended</Badge>}
                  {user.verification_status === "verified" && <Badge tone="brand">Verified</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {user.email} · {user.postcode_outward ?? "—"} · joined {formatDate(user.created_at)}
                </p>
                {user.suspended_reason && (
                  <p className="mt-1 text-sm text-red-600">Reason: {user.suspended_reason}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {user.role === "tradesperson" && (
                  <Link
                    href={`/tradespeople/${user.id}`}
                    className="text-sm font-medium text-brand hover:underline"
                  >
                    View profile
                  </Link>
                )}
                {user.role !== "admin" &&
                  (user.status === "suspended" ? (
                    <ReinstateUser userId={user.id} />
                  ) : (
                    <SuspendUser userId={user.id} />
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
