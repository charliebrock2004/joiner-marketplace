import type { Metadata } from "next";
import { ReputationPreview } from "@/components/marketing/ReputationPreview";
import { FinalCta } from "@/components/marketing/FinalCta";
import { PageHeader } from "@/components/site/PageHeader";
import { Section, SectionHeading } from "@/components/ui/Section";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How our joinery marketplace works: post a small job, local joiners with availability see it, and you choose who you want to work with. Reviews and verification are being built next.",
  alternates: { canonical: "/how-it-works" },
};

const customerSteps = [
  {
    title: "You post the job",
    body: "Describe what needs doing, add a photo or two, and say roughly when suits and what you'd expect to pay. It's free and there's no obligation.",
  },
  {
    title: "Local joiners see it",
    body: "Your job goes to joiners nearby whose skills and availability match. Right now we do that matching by hand; the platform will do it as the network grows.",
  },
  {
    title: "You choose who you work with",
    body: "You'll see who's interested, what they do and what they'd charge. You pick, you agree the price with them directly, and they get the job done.",
  },
];

const joinerSteps = [
  {
    title: "Register what you do",
    body: "Your trade, your experience level, the categories of work you want and how far you'll travel.",
  },
  {
    title: "Get jobs that fit",
    body: "You hear about local jobs in your categories. Respond to the ones that suit your week and ignore the rest.",
  },
  {
    title: "Build a track record",
    body: "Completed jobs and customer reviews build a profile that makes the next job easier to win.",
  },
];

function Steps({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="mt-10 grid gap-6 sm:grid-cols-3">
      {steps.map((step, index) => (
        <li key={step.title} className="rounded-2xl border border-line bg-white p-6">
          <span className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
            {index + 1}
          </span>
          <h3 className="mt-4 font-medium text-ink">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="How it works"
        title="Three steps, both ways round"
        lead="The idea is simple: make it easy to say what you need, and easy for the right local person to put their hand up."
      />

      <Section>
        <SectionHeading eyebrow="If you need a job done" title="For customers" />
        <Steps steps={customerSteps} />
      </Section>

      <Section tone="sunk">
        <SectionHeading eyebrow="If you're on the tools" title="For joiners" />
        <Steps steps={joinerSteps} />
      </Section>

      <Section>
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="What we're building next"
              title="Reputation, done properly"
              lead="Right now the platform is deliberately manual — we'd rather get a handful of real jobs done well than launch an empty marketplace. What comes next is the reputation system that makes it work without us in the middle."
            />
            <ul className="mt-8 space-y-4 text-ink-soft">
              {[
                "Reviews that only a customer with a completed job can leave",
                "Jobs completed, completion rate and response rate on every profile",
                "Identity verification, then qualification and insurance checks",
                "Experience level shown plainly — apprentice, qualified, experienced",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 rounded-xl border border-line bg-paper-sunk p-5 text-sm leading-relaxed text-ink-soft">
              <strong className="font-semibold text-ink">To be completely clear:</strong> none of
              that is live today. No joiner on {site.name} has been identity checked or had their
              qualifications verified yet, and we won&apos;t display a badge saying otherwise until
              the check genuinely exists.
            </p>
          </div>

          <div className="lg:pt-16">
            <ReputationPreview />
          </div>
        </div>
      </Section>

      <FinalCta />
    </>
  );
}
