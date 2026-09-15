import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Section, SectionHeading } from "@/components/ui/Section";

const benefits = [
  {
    title: "Work that fits round your week",
    body: "Take jobs on evenings, weekends or the quiet days between contracts. Nothing is compulsory — you only respond to what suits you.",
  },
  {
    title: "Jobs matched to your skills and area",
    body: "Tell us the work you want and how far you'll travel. You see local jobs in your categories, not everything in the country.",
  },
  {
    title: "Build a reputation that travels",
    body: "Completed jobs and customer reviews build a profile you own, so new customers can see your track record instead of guessing.",
  },
  {
    title: "Apprentices welcome",
    body: "Building experience on smaller jobs is exactly how the trade works. Your level is shown honestly, so customers know who they're hiring.",
  },
];

export function JoinerSection() {
  return (
    <Section id="joiners" tone="sunk">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <SectionHeading
            eyebrow="For joiners"
            title="Got spare time and want extra work?"
            lead="Most joiners have gaps — a cancelled week, quiet evenings, a run-in period on the tools. We pass local jobs your way so those gaps earn."
          />
          <div className="mt-8">
            <ButtonLink href="/join-as-a-joiner" size="lg">
              Join as a joiner
              <Icon name="arrowRight" className="size-4" />
            </ButtonLink>
            <p className="mt-4 max-w-sm text-sm text-muted">
              Free to register while we build the network. Registering doesn&apos;t automatically
              approve you for work — we speak to every joiner first.
            </p>
          </div>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <li key={benefit.title} className="rounded-2xl border border-line bg-white p-6">
              <h3 className="font-medium text-ink">{benefit.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{benefit.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
