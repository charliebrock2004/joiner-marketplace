import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { launchTowns } from "@/lib/content/towns";

/**
 * The first screen has one job: tell a visitor arriving from a Facebook post
 * what this is, who it is for, and what they can do — before they scroll.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="container-page py-16 sm:py-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-rise">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand-ink">
              <Icon name="pin" className="size-4" />
              Now building in {launchTowns[0]}, {launchTowns[1]} &amp; across Perthshire
            </p>

            <h1 className="mt-6 text-4xl leading-[1.08] font-semibold text-ink sm:text-5xl lg:text-[3.5rem]">
              Got a small joinery job?
              <span className="block text-brand">Find someone who can do it.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Big joinery firms are booked out for months and rarely take on the small stuff. We
              connect you with local joiners, apprentices and skilled tradespeople who have spare
              evenings, weekends and quiet days — and actually want the work.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/post-a-job" size="lg">
                Post a job
                <Icon name="arrowRight" className="size-4" />
              </ButtonLink>
              <ButtonLink href="/join-as-a-joiner" variant="secondary" size="lg">
                Join as a joiner
              </ButtonLink>
            </div>

            <p className="mt-5 text-sm text-muted">
              Free to post · No obligation · You agree the price directly with the joiner
            </p>
          </div>

          <StepsPanel />
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    title: "Post a job",
    body: "Tell us what needs doing, where you are and roughly when. Two minutes, photos optional.",
  },
  {
    title: "Get connected",
    body: "We put your job in front of local joiners with availability and pass on who's interested.",
  },
  {
    title: "Get it done",
    body: "You pick who you want, agree the price with them directly, and the job gets finished.",
  },
];

function StepsPanel() {
  return (
    <div className="animate-rise rounded-2xl border border-line bg-white p-6 sm:p-8">
      <p className="text-sm font-semibold tracking-wide text-muted uppercase">How it works</p>
      <ol className="mt-6 space-y-6">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span className="relative flex flex-col items-center">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                {index + 1}
              </span>
              {index < steps.length - 1 && (
                <span className="mt-2 w-px flex-1 bg-line-strong" aria-hidden="true" />
              )}
            </span>
            <span className="pb-1">
              <span className="block font-medium text-ink">{step.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
