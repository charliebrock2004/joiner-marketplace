import type { Metadata } from "next";
import { JoinerForm } from "@/components/forms/JoinerForm";
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

export default function JoinAsJoinerPage() {
  return (
    <>
      <PageHeader
        eyebrow="For joiners"
        title="Register your interest"
        lead="Tell us what you do, where you work and when you're free. We'll come back to you about local jobs that fit."
      />

      <div className="container-page grid gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
        <div className="min-w-0">
          <JoinerForm />
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
