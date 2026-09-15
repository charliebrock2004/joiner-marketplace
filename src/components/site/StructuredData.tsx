import { faqs } from "@/lib/content/faqs";
import { launchTowns } from "@/lib/content/towns";
import { site } from "@/lib/config/site";

/**
 * JSON-LD for local search. Generated from the same content the page renders,
 * so the markup can never describe something a visitor cannot see.
 */
function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Content is fully application-controlled; no user input reaches this.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function OrganisationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: site.name,
        url: site.url,
        description: site.description,
        email: site.contactEmail,
        areaServed: launchTowns.map((town) => ({
          "@type": "City",
          name: town,
          address: { "@type": "PostalAddress", addressRegion: "Perthshire", addressCountry: "GB" },
        })),
      }}
    />
  );
}

export function WebsiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: site.name,
        url: site.url,
        inLanguage: "en-GB",
      }}
    />
  );
}

export function FaqJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      }}
    />
  );
}
