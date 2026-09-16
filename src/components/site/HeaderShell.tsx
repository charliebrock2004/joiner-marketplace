"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/site/Logo";
import { UserMenu } from "@/components/site/UserMenu";
import { nav } from "@/lib/config/site";
import type { SessionUser } from "@/lib/auth/session.ts";
import { cn } from "@/lib/utils/cn";

export function HeaderShell({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  const links = user?.role === "tradesperson"
    ? [{ href: "/jobs", label: "Find jobs" }, ...nav]
    : nav;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3.5 py-2 text-[0.9375rem] transition-colors",
                pathname === item.href ? "text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <UserMenu user={user} />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="-mr-2 flex size-10 items-center justify-center rounded-full text-ink md:hidden"
        >
          <Icon name={open ? "close" : "menu"} className="size-6" />
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-line bg-paper md:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="rounded-xl px-3 py-3 text-base text-ink-soft hover:bg-paper-sunk"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2">
              <UserMenu user={user} mobile onNavigate={closeMenu} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
