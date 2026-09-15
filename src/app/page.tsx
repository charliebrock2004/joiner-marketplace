import Link from "next/link";
import type { Metadata } from "next";
import { CoverageSection } from "@/components/marketing/CoverageSection";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { FinalCta } from "@/components/marketing/FinalCta";
import { Hero } from "@/components/marketing/Hero";
import { JoinerSection } from "@/components/marketing/JoinerSection";
import { ProblemSection } from "@/components/marketing/ProblemSection";
import { TrustSection } from "@/components/marketing/TrustSection";
import { OrganisationJsonLd, WebsiteJsonLd } from "@/components/site/StructuredData";
import { Section, SectionHeading } from "@/components/ui/Section";
import { faqs } from "@/lib/content/faqs";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: `Find a joiner for small jobs in ${site.region}`,
  description: site.description,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <OrganisationJsonLd />
      <WebsiteJsonLd />

      <Hero />
      <ProblemSection />
      <JoinerSection />
      <TrustSection />
      <CoverageSection />

      <Section>
        <SectionHeading eyebrow="Questions" title="The things people ask first" align="center" />
        <div className="mx-auto mt-10 max-w-3xl">
          <FaqAccordion items={faqs.slice(0, 5)} />
          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/faq" className="font-medium text-brand hover:underline">
              Read all questions
            </Link>
          </p>
        </div>
      </Section>

      <FinalCta />
    </>
  );
}
