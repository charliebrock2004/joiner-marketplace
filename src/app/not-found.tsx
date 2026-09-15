import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-sm font-semibold tracking-wide text-brand uppercase">404</p>
      <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-4 max-w-md text-ink-soft">
        It may have moved, or the link might be wrong. Here&apos;s the way back.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/" size="lg">
          Back to home
        </ButtonLink>
        <ButtonLink href="/post-a-job" variant="secondary" size="lg">
          Post a job
        </ButtonLink>
      </div>
    </div>
  );
}
