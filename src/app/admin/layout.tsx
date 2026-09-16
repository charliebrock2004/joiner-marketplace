import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards.ts";

/**
 * Admin shell.
 *
 * The guard here protects the whole subtree, and every page and action beneath
 * it re-checks the admin role independently — nothing relies on this layout
 * alone.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin("/admin");

  const links = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/jobs", label: "Jobs" },
    { href: "/admin/verification", label: "Verification" },
    { href: "/admin/reviews", label: "Reviews" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/audit", label: "Audit log" },
  ];

  return (
    <div className="bg-paper-sunk">
      <div className="container-page">
        <nav aria-label="Admin" className="-mx-5 flex gap-1 overflow-x-auto px-5 py-3 sm:mx-0 sm:px-0">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-full px-3.5 py-2 text-[0.9375rem] text-ink-soft transition-colors hover:bg-white hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="min-h-[70vh] border-t border-line bg-paper">{children}</div>
    </div>
  );
}
