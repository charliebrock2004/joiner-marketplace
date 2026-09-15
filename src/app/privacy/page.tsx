import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${site.name} collects, uses and protects the information you give us.`,
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const sections = [
  {
    heading: "What we collect",
    body: [
      "If you post a job: your name, email, phone number, postcode, a description of the work, your rough budget and timing, and any photos you choose to upload.",
      "If you register as a joiner: your name, email, phone number, postcode, experience level, years in the trade, any qualifications you tell us about, the work you want, your availability, your travel radius and an optional link to your own profile or website.",
      "If you join the notification list: your email address, your postcode and whether you're a customer or a joiner.",
      "We also record the time of your submission and basic technical information sent by your browser. We do not use advertising or analytics cookies.",
    ],
  },
  {
    heading: "Why we collect it",
    body: [
      "To match jobs with suitable local joiners and to contact you about your submission. That is the only reason.",
      "Postcodes are also used in aggregate to decide which areas to expand to next.",
    ],
  },
  {
    heading: "Who we share it with",
    body: [
      "If you post a job, we share what the work involves and the rough area with joiners who might take it on. We do not pass on your full address, phone number or email until you have agreed to work with someone.",
      "We do not sell your information, and we do not share it with anyone for marketing.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "Job submissions are kept for up to 12 months so we can follow up and understand demand. Joiner registrations are kept while you want to receive work. Notification-list entries are kept until you ask us to remove them or we launch in your area.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "You can ask us for a copy of what we hold about you, ask us to correct it, or ask us to delete it. Email us and we will action it.",
      "If you are not happy with how we have handled your information you can complain to the Information Commissioner's Office (ico.org.uk).",
    ],
  },
  {
    heading: "Security",
    body: [
      "The site is served over HTTPS and submissions are validated on our server before being stored. Photos you upload are not published anywhere on this website — they are only used to describe your job to a joiner.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        title="Privacy"
        lead={`A plain-English explanation of what ${site.name} does with the information you give us.`}
      />

      <div className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold text-ink">{section.heading}</h2>
              <div className="mt-3 space-y-3 leading-relaxed text-ink-soft">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          <section className="rounded-2xl border border-line bg-paper-sunk p-6">
            <h2 className="text-lg font-semibold text-ink">Contact</h2>
            <p className="mt-2 leading-relaxed text-ink-soft">
              For anything to do with your information, email{" "}
              <a href={`mailto:${site.contactEmail}`} className="font-medium text-brand hover:underline">
                {site.contactEmail}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
