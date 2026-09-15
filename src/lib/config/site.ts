/**
 * Central site configuration. Anything that changes when the brand, the
 * launch area or the contact details change belongs here, not in a page.
 */
export const site = {
  name: "Joinly",
  tagline: "Find a joiner for the small jobs",
  description:
    "Post a small joinery or carpentry job and get connected with local tradespeople who have spare capacity. Now building our network across Perth, Crieff, Auchterarder, Dunblane, Kinross and the rest of Perthshire.",
  /**
   * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://joinly.co.uk) so that
   * canonical URLs, sitemap entries and Open Graph images resolve absolutely.
   */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@joinly.co.uk",
  region: "Perthshire",
  launchStage: "Early access",
} as const;

export const nav = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
] as const;
