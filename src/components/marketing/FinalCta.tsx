import { ButtonLink } from "@/components/ui/Button";
import { ShareLinks } from "@/components/site/ShareLinks";
import { Icon } from "@/components/ui/Icon";

export function FinalCta() {
  return (
    <section className="bg-ink py-16 text-white sm:py-20">
      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              One small job is all it takes to get started.
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">
              Post the job you&apos;ve been putting off, or put your name down as a joiner. Both
              take a couple of minutes and cost nothing.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/post-a-job" variant="inverse" size="lg">
                Post a job
                <Icon name="arrowRight" className="size-4" />
              </ButtonLink>
              <ButtonLink href="/join-as-a-joiner" variant="inverseOutline" size="lg">
                Join as a joiner
              </ButtonLink>
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
            <h3 className="font-medium text-white">Know someone who needs this?</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              We&apos;re growing through word of mouth and local groups. Sharing this is genuinely
              the most useful thing you can do for it.
            </p>
            <div className="mt-5">
              <ShareLinks />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
