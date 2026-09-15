import { WaitlistForm } from "@/components/forms/WaitlistForm";
import { Icon } from "@/components/ui/Icon";
import { Section, SectionHeading } from "@/components/ui/Section";
import { launchTowns } from "@/lib/content/towns";
import { site } from "@/lib/config/site";

export function CoverageSection() {
  return (
    <Section id="areas" tone="sunk">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHeading
            eyebrow="Where we are"
            title={`Starting in ${site.region}, not everywhere at once`}
            lead="A marketplace only works if there's someone local to actually do the job. So rather than claim national coverage, we're building a real network of joiners town by town — and we'll tell you straight if we can't cover you yet."
          />
          <ul className="mt-8 flex flex-wrap gap-2">
            {launchTowns.map((town) => (
              <li
                key={town}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-line-strong"
              >
                <Icon name="pin" className="size-3.5 text-brand" />
                {town}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-ink">Not in one of those towns?</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Leave your postcode and we&apos;ll let you know when we reach you. Where people sign up
            is genuinely how we choose the next area.
          </p>
          <div className="mt-6">
            <WaitlistForm />
          </div>
        </div>
      </div>
    </Section>
  );
}
