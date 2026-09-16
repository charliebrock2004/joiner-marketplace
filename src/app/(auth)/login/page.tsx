import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/AuthForms";
import { PageHeader } from "@/components/site/PageHeader";
import { currentUser, safeReturnTo } from "@/lib/auth/guards.ts";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Tradezy account to manage your jobs or find local work.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await currentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/dashboard");

  const { next } = await searchParams;
  const safeNext = safeReturnTo(next) ?? undefined;

  return (
    <>
      <PageHeader title="Sign in" lead="Welcome back." />
      <div className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-md">
          <LoginForm next={safeNext} />
        </div>
      </div>
    </>
  );
}
