import Link from "next/link";
import { requireUser } from "@/lib/auth/guards.ts";
import { countUnread } from "@/lib/db/queries/messages.ts";

/**
 * Dashboard shell.
 *
 * The nav is built from the signed-in role, but that is presentation only —
 * every page underneath calls its own guard, so removing a link from here
 * would not grant access to anything.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard");
  const unread = await countUnread(user.id);

  const links =
    user.role === "customer"
      ? [
          { href: "/dashboard", label: "Overview" },
          { href: "/dashboard/jobs", label: "My jobs" },
          { href: "/dashboard/messages", label: "Messages", badge: unread },
          { href: "/dashboard/reviews", label: "Reviews" },
        ]
      : [
          { href: "/dashboard", label: "Overview" },
          { href: "/jobs", label: "Find jobs" },
          { href: "/dashboard/applications", label: "My applications" },
          { href: "/dashboard/messages", label: "Messages", badge: unread },
          { href: "/dashboard/profile", label: "My profile" },
        ];

  return (
    <div className="border-b border-line bg-paper-sunk">
      <div className="container-page">
        <nav
          aria-label="Dashboard"
          className="-mx-5 flex gap-1 overflow-x-auto px-5 py-3 sm:mx-0 sm:px-0"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[0.9375rem] text-ink-soft transition-colors hover:bg-white hover:text-ink"
            >
              {link.label}
              {"badge" in link && typeof link.badge === "number" && link.badge > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
      <div className="min-h-[70vh] border-t border-line bg-paper">{children}</div>
    </div>
  );
}
