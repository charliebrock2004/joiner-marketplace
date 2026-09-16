import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards.ts";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-semibold text-ink">Hello, {user.fullName}</h1>
      <p className="mt-2 text-ink-soft" data-testid="role">
        Signed in as {user.role} ({user.email})
      </p>
    </div>
  );
}
