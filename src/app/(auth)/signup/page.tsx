import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/AuthForms";
import { PageHeader } from "@/components/site/PageHeader";
import { currentUser, safeReturnTo } from "@/lib/auth/guards.ts";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create a Tradezy account to post local trade jobs, or to find work that fits around your week.",
  robots: { index: false, follow: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; role?: string }>;
}) {
  const user = await currentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/dashboard");

  const { next, role } = await searchParams;
  const safeNext = safeReturnTo(next) ?? undefined;
  const defaultRole = role === "tradesperson" ? "tradesperson" : "customer";

  return (
    <>
      <PageHeader
        title="Create your account"
        lead="It takes a minute. You can post a job or start looking for work straight after."
      />
      <div className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-md">
          <SignupForm next={safeNext} defaultRole={defaultRole} />
        </div>
      </div>
    </>
  );
}
