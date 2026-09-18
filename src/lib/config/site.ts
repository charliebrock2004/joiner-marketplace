/**
 * Central site configuration. Anything that changes when the brand, the
 * launch area or the contact details change belongs here, not in a page.
 */

/** Used when no site URL is configured — local development, mainly. */
const LOCAL_FALLBACK_URL = "http://localhost:3000";

/**
 * Parses a configured origin into a normalised, trailing-slash-free URL.
 *
 * Returns null rather than throwing for anything unusable: an unset variable,
 * a variable that exists but is empty or whitespace (which `??` does not catch,
 * and which is the usual shape of a misconfigured Vercel project), or a value
 * that simply is not a URL.
 *
 * A bare hostname is accepted and assumed https, because the platform-provided
 * variables below supply hostnames with no protocol.
 */
function parseSiteUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    // Guard against a value like "javascript:..." slipping through.
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Resolves the public origin of the site.
 *
 * Order of preference:
 *   1. NEXT_PUBLIC_SITE_URL — the real domain, once it is set.
 *   2. The Vercel production domain, so a deploy is correct before step 1.
 *   3. The per-deployment Vercel URL, which makes preview deploys self-consistent.
 *   4. localhost, for development.
 *
 * Only NEXT_PUBLIC_-prefixed variables are read. This module is imported by
 * client components (the share links), and Next only inlines NEXT_PUBLIC_ values
 * into the client bundle — reading a server-only variable here would resolve to
 * a different value on the client and cause a hydration mismatch.
 *
 * This never throws. A missing or malformed value degrades to a working
 * fallback instead of failing the production build.
 */
function resolveSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    // Lowercase fallback, for a variable created through a dashboard that
    // forces lowercase keys. Deliberately written as a literal property
    // access, like every entry here: Next.js only inlines literal
    // `process.env.X` reads into the browser bundle, so a dynamic lookup
    // would break the uppercase name above. See the note below on what the
    // browser actually receives.
    process.env.next_public_site_url,
    // Both are provided automatically by Vercel while "Automatically expose
    // System Environment Variables" is enabled (the default).
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
  ];

  for (const candidate of candidates) {
    const parsed = parseSiteUrl(candidate);
    if (parsed) return parsed;
  }

  // Server-side only. In the browser the lowercase name is invisible to Next,
  // so this module always falls back to localhost there — which is fine,
  // because no client component reads `site.url` (see the note above). Warning
  // about it in the user's console would be pure noise.
  if (process.env.NODE_ENV === "production" && typeof window === "undefined") {
    console.warn(
      "[site] No valid site URL found (checked NEXT_PUBLIC_SITE_URL and " +
        "next_public_site_url). Falling back to " +
        `${LOCAL_FALLBACK_URL}. Canonical URLs, the sitemap and Open Graph tags ` +
        "will be wrong until it is configured.",
    );
  }

  return LOCAL_FALLBACK_URL;
}

const url = resolveSiteUrl();

export const site = {
  name: "Tradezy",
  tagline: "Find someone local for the small jobs",
  description:
    "Post a small joinery or carpentry job and get connected with local tradespeople who have spare capacity. Now building our network across Perth, Crieff, Auchterarder, Dunblane, Kinross and the rest of Perthshire.",
  /**
   * Absolute origin, no trailing slash. Always a valid URL — see
   * resolveSiteUrl above for how it is chosen.
   */
  url,
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "hello@tradezy.co.uk",
  region: "Perthshire",
  launchStage: "Early access",
} as const;

/**
 * The single `new URL()` call in the codebase, for the root layout's
 * `metadataBase`. Built from an already-validated string, so it cannot throw
 * during the build the way an unchecked environment variable can.
 */
export const metadataBase = new URL(site.url);

export const nav = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
] as const;
