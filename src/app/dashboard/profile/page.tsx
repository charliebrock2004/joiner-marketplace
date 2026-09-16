import type { Metadata } from "next";
import Link from "next/link";
import { requireTradesperson } from "@/lib/auth/guards.ts";
import { getPublicProfile } from "@/lib/db/queries/profiles.ts";
import { listCategories, listTrades } from "@/lib/db/queries/trades.ts";
import { PortfolioForm, ProfileForm, ProfilePhotoForm } from "@/components/marketplace/ProfileForm";
import { VerificationBadge } from "@/components/marketplace/Bits";

export const metadata: Metadata = { title: "My profile", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const user = await requireTradesperson("/dashboard/profile");
  const [profile, trades, categories] = await Promise.all([
    getPublicProfile(user.id),
    listTrades(),
    listCategories(),
  ]);

  if (!profile) {
    return (
      <div className="container-page py-10">
        <p className="text-ink-soft">We couldn&apos;t load your profile. Please sign out and back in.</p>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">My profile</h1>
          <Link href={`/tradespeople/${user.id}`} className="text-sm font-medium text-brand hover:underline">
            View public profile
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">Verification</h2>
            <VerificationBadge status={profile.verification_status} />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {profile.verification_status === "verified"
              ? "Our team has verified your identity. Customers can see that badge on your profile."
              : "Identity and qualification checks are carried out by our team. Nothing on your profile claims to be verified until that has actually happened."}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-white p-5">
          <h2 className="font-semibold text-ink">Profile photo</h2>
          <div className="mt-4">
            <ProfilePhotoForm current={profile.profile_photo_url} />
          </div>
        </div>

        <div className="mt-6">
          <ProfileForm profile={profile} trades={trades} categories={categories} />
        </div>

        <div className="mt-8 rounded-2xl border border-line bg-white p-5">
          <h2 className="font-semibold text-ink">Photos of your work</h2>
          <p className="mt-1 text-sm text-muted">
            The most useful thing on your profile while you&apos;re building up reviews.
          </p>
          <div className="mt-4">
            <PortfolioForm photos={profile.portfolio} />
          </div>
        </div>
      </div>
    </div>
  );
}
