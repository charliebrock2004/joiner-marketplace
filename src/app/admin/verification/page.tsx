import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards.ts";
import { listForVerification } from "@/lib/db/queries/admin.ts";
import { VerificationControl } from "@/components/admin/AdminForms";
import { ExperienceBadge, formatDate } from "@/components/marketplace/Bits";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Verification", robots: { index: false, follow: false } };

export default async function AdminVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin("/admin/verification");
  const { status } = await searchParams;
  const people = await listForVerification(status);

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Verification</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        A tradesperson is only shown as verified once you set it here. Qualifications they enter are
        stored as self-declared claims — check them against real evidence before marking anyone
        verified.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/verification" className="rounded-full bg-paper-sunk px-3.5 py-1.5 text-sm text-ink-soft hover:bg-white hover:text-ink">
          All
        </Link>
        {["pending", "unverified", "verified", "rejected"].map((value) => (
          <Link
            key={value}
            href={`/admin/verification?status=${value}`}
            className="rounded-full bg-paper-sunk px-3.5 py-1.5 text-sm text-ink-soft hover:bg-white hover:text-ink"
          >
            {value}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {people.length === 0 && <p className="text-sm text-muted">Nobody matches.</p>}
        {people.map((person) => (
          <div key={person.user_id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/tradespeople/${person.user_id}`} className="font-medium text-ink hover:underline">
                    {person.full_name}
                  </Link>
                  <ExperienceBadge level={person.experience_level} />
                  <Badge tone={person.verification_status === "verified" ? "brand" : "outline"}>
                    {person.verification_status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {person.email} · {person.trade_name ?? "no trade set"} · {person.years_experience} years ·
                  joined {formatDate(person.created_at)}
                </p>
                {person.qualifications && (
                  <p className="mt-2 rounded-xl bg-paper-sunk p-3 text-sm text-ink-soft">
                    <span className="font-medium text-ink">Claims: </span>
                    {person.qualifications}
                  </p>
                )}
                {person.verification_notes && (
                  <p className="mt-2 text-sm text-muted">Notes: {person.verification_notes}</p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <VerificationControl userId={person.user_id} current={person.verification_status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
