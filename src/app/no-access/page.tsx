import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { currentUser } from "@/lib/auth/guards.ts";

export const metadata: Metadata = {
  title: "No access",
  robots: { index: false, follow: false },
};

export default async function NoAccessPage() {
  const user = await currentUser();

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-sm font-semibold tracking-wide text-brand uppercase">Not available</p>
      <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
        That area isn&apos;t for your account type
      </h1>
      <p className="mt-4 max-w-md text-ink-soft">
        {user
          ? `You're signed in as a ${user.role === "tradesperson" ? "tradesperson" : user.role}. That page belongs to a different kind of account.`
          : "Sign in to continue."}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={user ? "/dashboard" : "/login"} size="lg">
          {user ? "Go to your dashboard" : "Sign in"}
        </ButtonLink>
        <ButtonLink href="/" variant="secondary" size="lg">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}
