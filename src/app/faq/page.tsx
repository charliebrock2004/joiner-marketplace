import type { Metadata } from "next";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { FinalCta } from "@/components/marketing/FinalCta";
import { PageHeader } from "@/components/site/PageHeader";
import { FaqJsonLd } from "@/components/site/StructuredData";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "What kind of joinery jobs can I post? How much does it cost? Can apprentices join? Where is the service available? Answers about our Perthshire joinery marketplace.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <>
      <FaqJsonLd />
      <PageHeader
        eyebrow="FAQ"
        title="Frequently asked questions"
        lead="If your question isn't here, email us and we'll answer it properly."
      />

      <div className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <FaqAccordion />
          <p className="mt-8 text-sm text-muted">
            Still stuck?{" "}
            <a href={`mailto:${site.contactEmail}`} className="font-medium text-brand hover:underline">
              {site.contactEmail}
            </a>
          </p>
        </div>
      </div>

      <FinalCta />
    </>
  );
}
