"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/site/Logo";
import { nav } from "@/lib/config/site";
import { cn } from "@/lib/utils/cn";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {nav.map((item) => (
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

        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href="/join-as-a-joiner" variant="secondary">
            Join as a joiner
          </ButtonLink>
          <ButtonLink href="/post-a-job">Post a job</ButtonLink>
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
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="rounded-xl px-3 py-3 text-base text-ink-soft hover:bg-paper-sunk"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid gap-2">
              <ButtonLink href="/post-a-job" size="lg" onClick={closeMenu}>
                Post a job
              </ButtonLink>
              <ButtonLink href="/join-as-a-joiner" variant="secondary" size="lg" onClick={closeMenu}>
                Join as a joiner
              </ButtonLink>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
