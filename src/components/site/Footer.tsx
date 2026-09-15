import Link from "next/link";
import { Logo } from "@/components/site/Logo";
import { ShareLinks } from "@/components/site/ShareLinks";
import { launchTowns } from "@/lib/content/towns";
import { site } from "@/lib/config/site";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-paper-sunk">
      <div className="container-page py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {site.name} connects people who need small joinery jobs done with local joiners who
              have spare capacity. We&apos;re building the network in {site.region} first.
            </p>
            <div className="mt-5">
              <ShareLinks />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink">Pages</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {[
                { href: "/post-a-job", label: "Post a job" },
                { href: "/join-as-a-joiner", label: "Join as a joiner" },
                { href: "/how-it-works", label: "How it works" },
                { href: "/faq", label: "FAQ" },
                { href: "/privacy", label: "Privacy" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-ink">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink">Areas we&apos;re starting in</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {launchTowns.join(" · ")} and the surrounding {site.region} area.
            </p>
            <p className="mt-3 text-sm text-muted">
              <a href={`mailto:${site.contactEmail}`} className="hover:text-ink">
                {site.contactEmail}
              </a>
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. Early access — we are building this platform
            in public.
          </p>
          <p>Joiners are not yet identity or qualification verified. We&apos;ll say so when they are.</p>
        </div>
      </div>
    </footer>
  );
}
