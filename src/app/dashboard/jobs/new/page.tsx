import type { Metadata } from "next";
import { requireCustomer } from "@/lib/auth/guards.ts";
import { listCategories, listTrades } from "@/lib/db/queries/trades.ts";
import { JobForm } from "@/components/marketplace/JobForm";

export const metadata: Metadata = { title: "Post a job", robots: { index: false, follow: false } };

export default async function NewJobPage() {
  const user = await requireCustomer("/dashboard/jobs/new");
  const [trades, categories] = await Promise.all([listTrades(), listCategories()]);

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Post a job</h1>
        <p className="mt-2 text-ink-soft">
          The more detail you give, the easier it is for someone to say yes without visiting first.
        </p>
        <div className="mt-8">
          <JobForm trades={trades} categories={categories} defaultPostcode={user.postcode} />
        </div>
      </div>
    </div>
  );
}
