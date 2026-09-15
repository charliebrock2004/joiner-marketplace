import { ReputationPreview } from "@/components/marketing/ReputationPreview";
import { Section, SectionHeading } from "@/components/ui/Section";

const commitments = [
  {
    title: "Experience shown honestly",
    body: "An apprentice is listed as an apprentice, a time-served joiner as a time-served joiner. Nobody is flattened into a generic “tradesperson” badge, because the difference matters when you're choosing.",
  },
  {
    title: "Reviews earned on real jobs",
    body: "Only a customer whose job was actually completed through the platform will be able to review it. That single rule removes most of what makes review sites worthless.",
  },
  {
    title: "Verification that means something",
    body: "Identity, qualifications and insurance checks are being built. Until a check has genuinely been carried out, no badge will claim it has — nothing on this site says “verified” today.",
  },
  {
    title: "More than a star rating",
    body: "Stars alone hide too much. Profiles will show jobs completed, completion rate, response rate and verification status alongside the rating.",
  },
];

export function TrustSection() {
  return (
    <Section id="trust">
      <SectionHeading
        eyebrow="Trust"
        title="Knowing who's turning up is the whole problem"
        lead="Anyone can call themselves a joiner. The value of a marketplace like this isn't the listings — it's being able to tell, at a glance, who you're actually dealing with. That's what we're building, and we won't pretend it's finished before it is."
      />

      <div className="mt-12 grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <ul className="grid gap-6">
          {commitments.map((item) => (
            <li key={item.title} className="border-l-2 border-brand pl-5">
              <h3 className="font-medium text-ink">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
            </li>
          ))}
        </ul>

        <div className="lg:pt-3">
          <ReputationPreview />
        </div>
      </div>
    </Section>
  );
}
