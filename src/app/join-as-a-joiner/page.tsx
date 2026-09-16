import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { currentUser } from "@/lib/auth/guards.ts";
import { PageHeader } from "@/components/site/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Join as a joiner",
  description:
    "Joiners, carpenters and apprentices across Perthshire: register your interest to receive small local jobs that fit around your existing work. Free while we build the network.",
  alternates: { canonical: "/join-as-a-joiner" },
  openGraph: {
    title: `Join as a joiner · ${site.name}`,
    description:
      "Get local joinery jobs that fit round your week. Evenings, weekends or quiet days.",
    url: "/join-as-a-joiner",
  },
};

export default async function JoinAsJoinerPage() {
  const user = await currentUser();
  const joinHref = user?.role === "tradesperson" ? "/dashboard/profile" : "/signup?role=tradesperson&next=%2Fdashboard%2Fprofile";
  return (
    <>
      <PageHeader
        eyebrow="For joiners"
        title="Register your interest"
        lead="Tell us what you do, where you work and when you're free. We'll come back to you about local jobs that fit."
      />

      <div className="container-page grid gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
        <div className="min-w-0">
          <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">Set yourself up in a couple of minutes</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              Create a free account, tell us your trade, the work you want and how far you&apos;ll
              travel. You&apos;ll then see local jobs that match — respond to the ones that suit your
              week and ignore the rest.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-muted">
              {[
                "Free while we build the network",
                "Your experience level is shown honestly — apprentices are welcome",
                "Completed jobs and customer reviews build a profile you own",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Icon name="check" className="mt-0.5 size-4 shrink-0 text-brand" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={joinHref} size="lg">
                Join as a tradesperson
                <Icon name="arrowRight" className="size-4" />
              </ButtonLink>
              {!user && (
                <ButtonLink href="/login?next=%2Fdashboard%2Fprofile" variant="secondary" size="lg">
                  I already have an account
                </ButtonLink>
              )}
            </div>
          </div>
        </div>

        <aside>
          <div className="rounded-2xl border border-line bg-white p-6 lg:sticky lg:top-24">
            <h2 className="font-semibold text-ink">Being straight with you</h2>
            <ul className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
              <li className="flex gap-2.5">
                <Icon name="check" className="mt-0.5 size-4 shrink-0 text-brand" />
                <span>
                  <span className="font-medium text-ink">Registering isn&apos;t approval.</span> We
                  speak to every joiner before passing work on.
                </span>
              </li>
              <li className="flex gap-2.5">
                <Icon name="check" className="mt-0.5 size-4 shrink-0 text-brand" />
                <span>
                  <span className="font-medium text-ink">Nothing is verified yet.</span> Identity and
                  qualification checks are being built — we&apos;ll ask you to complete them properly
                  when they&apos;re ready.
                </span>
              </li>
              <li className="flex gap-2.5">
                <Icon name="check" className="mt-0.5 size-4 shrink-0 text-brand" />
                <span>
                  <span className="font-medium text-ink">No commitment.</span> You only respond to
                  jobs you actually want.
                </span>
              </li>
              <li className="flex gap-2.5">
                <Icon name="check" className="mt-0.5 size-4 shrink-0 text-brand" />
                <span>
                  <span className="font-medium text-ink">No fee right now.</span> {site.name} is free
                  for joiners while we build the network.
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
