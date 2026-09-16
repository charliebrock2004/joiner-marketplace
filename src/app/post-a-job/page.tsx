import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { currentUser } from "@/lib/auth/guards.ts";
import { PageHeader } from "@/components/site/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Post a small joinery job",
  description:
    "Tell us about your joinery or carpentry job — hanging a door, fitting skirting, shelving, flooring or small repairs — and we'll connect you with local joiners in Perth, Crieff, Auchterarder and the surrounding Perthshire area.",
  alternates: { canonical: "/post-a-job" },
  openGraph: {
    title: `Post a small joinery job · ${site.name}`,
    description:
      "Describe the job, add a photo, and we'll put it in front of local joiners with availability.",
    url: "/post-a-job",
  },
};

const reassurances = [
  "Free to post, and you're not committing to anything",
  "You agree the price directly with the joiner — we don't take a cut",
  "Your contact details are only passed on to a joiner you've agreed to work with",
];

export default async function PostAJobPage() {
  const user = await currentUser();
  const postHref = user?.role === "customer" ? "/dashboard/jobs/new" : "/signup?role=customer&next=%2Fdashboard%2Fjobs%2Fnew";
  return (
    <>
      <PageHeader
        eyebrow="For homeowners"
        title="Tell us about the job"
        lead="Takes about two minutes. The more detail you give, the easier it is for a joiner to say yes without a site visit first."
      />

      <div className="container-page grid gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
        <div className="min-w-0">
          <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">Post your job in a couple of minutes</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              Create a free account, describe the job and add a photo or two. Local tradespeople
              whose trade and travel area match will see it and tell you if they&apos;re interested.
              You pick who you want and agree the price with them directly.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-muted">
              {[
                "Free to post — we don't take a cut of the job",
                "You see each person's experience level, reviews and completed jobs before choosing",
                "Your full address and phone number are only shared once you've chosen someone",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Icon name="check" className="mt-0.5 size-4 shrink-0 text-brand" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={postHref} size="lg">
                Post a job
                <Icon name="arrowRight" className="size-4" />
              </ButtonLink>
              {!user && (
                <ButtonLink href="/login?next=%2Fdashboard%2Fjobs%2Fnew" variant="secondary" size="lg">
                  I already have an account
                </ButtonLink>
              )}
            </div>
          </div>
        </div>

        <aside>
          <div className="rounded-2xl border border-line bg-white p-6 lg:sticky lg:top-24">
            <h2 className="font-semibold text-ink">What happens next</h2>
            <ol className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
              <li>
                <span className="font-medium text-ink">1. We read it.</span> While we&apos;re getting
                started, a person reviews every job rather than an algorithm.
              </li>
              <li>
                <span className="font-medium text-ink">2. We find joiners.</span> We contact local
                joiners whose skills and availability fit.
              </li>
              <li>
                <span className="font-medium text-ink">3. You choose.</span> We put you in touch with
                whoever&apos;s interested, and you decide.
              </li>
            </ol>

            <ul className="mt-6 space-y-3 border-t border-line pt-5 text-sm text-muted">
              {reassurances.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Icon name="check" className="mt-0.5 size-4 shrink-0 text-brand" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
