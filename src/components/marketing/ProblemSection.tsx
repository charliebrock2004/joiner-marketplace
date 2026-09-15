import Link from "next/link";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icon";
import { jobCategories } from "@/lib/content/categories";

const examples = [
  "Hang a door",
  "Fit skirting and architrave",
  "Put up shelving",
  "Lay laminate flooring",
  "Build flat-pack furniture",
  "Fit a loft hatch",
  "Fix a sticking window",
  "Bespoke small jobs",
];

export function ProblemSection() {
  return (
    <Section id="customers">
      <SectionHeading
        eyebrow="For homeowners"
        title="Struggling to find someone for a small job?"
        lead="You ring round six joiners. Four don't answer, one is booked until spring and one never turns up to quote. It isn't that the work is difficult — it's that a half-day job doesn't fit into a firm's diary."
      />

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">
            Jobs people post
          </h3>
          <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {examples.map((example) => (
              <li key={example} className="flex items-start gap-2.5 text-ink-soft">
                <Icon name="check" className="mt-1 size-4 shrink-0 text-brand" />
                <span>{example}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
          <h3 className="font-semibold text-ink">We cover eight types of work</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Keeping the list short means jobs get to the right person quickly. If yours doesn&apos;t
            fit neatly, pick general joinery and describe it.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {jobCategories.map((category) => (
              <span
                key={category.value}
                className="rounded-full bg-paper-sunk px-3 py-1.5 text-sm text-ink-soft"
              >
                {category.label}
              </span>
            ))}
          </div>
          <Link
            href="/post-a-job"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover"
          >
            Post your job
            <Icon name="arrowRight" className="size-4" />
          </Link>
        </div>
      </div>
    </Section>
  );
}
