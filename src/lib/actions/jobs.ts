"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authorise } from "@/lib/auth/guards.ts";
import { addJobPhotos, createJob, updateJobStatus } from "@/lib/db/queries/jobs.ts";
import { categoryBelongsToTrade } from "@/lib/db/queries/trades.ts";
import { storeImages } from "@/lib/storage";
import { rateLimit } from "@/lib/security/rate-limit.ts";
import { jobSchema, jobStatusChangeSchema } from "@/lib/validation/marketplace.ts";
import { toFieldErrors } from "@/lib/validation/shared.ts";

export type JobFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const MAX_JOB_PHOTOS = 6;

export async function createJobAction(
  _previous: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const auth = await authorise("customer");
  if (!auth.ok) return { error: auth.error };

  const limit = rateLimit(`job:create:${auth.user.id}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return { error: "You have posted a lot of jobs recently. Please try again later." };
  }

  const parsed = jobSchema.safeParse({
    title: formData.get("title"),
    tradeId: formData.get("tradeId"),
    categoryId: formData.get("categoryId") ?? "",
    description: formData.get("description"),
    postcode: formData.get("postcode"),
    budgetBand: formData.get("budgetBand") ?? undefined,
    timing: formData.get("timing") ?? undefined,
    preferredDate: formData.get("preferredDate") ?? "",
  });

  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  }

  // A category must genuinely belong to the submitted trade — otherwise a
  // crafted form could file a job under a mismatched pair.
  const categoryId = parsed.data.categoryId || null;
  if (categoryId && !(await categoryBelongsToTrade(categoryId, parsed.data.tradeId))) {
    return { error: "That job type does not match the trade you chose." };
  }

  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File);
  const stored = await storeImages(photos, "jobs", MAX_JOB_PHOTOS);
  if ("message" in stored) {
    return { error: stored.message, fieldErrors: { photos: stored.message } };
  }

  const job = await createJob({
    customerId: auth.user.id,
    tradeId: parsed.data.tradeId,
    categoryId,
    title: parsed.data.title,
    description: parsed.data.description,
    postcode: parsed.data.postcode,
    budgetBand: parsed.data.budgetBand,
    timing: parsed.data.timing,
    preferredDate: parsed.data.preferredDate || null,
    status: "open",
  });

  await addJobPhotos(job.id, stored.images.map((image) => image.url));

  revalidatePath("/dashboard/jobs");
  redirect(`/dashboard/jobs/${job.id}?posted=1`);
}

export async function changeJobStatusAction(
  _previous: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const auth = await authorise("customer");
  if (!auth.ok) return { error: auth.error };

  const parsed = jobStatusChangeSchema.safeParse({
    jobId: formData.get("jobId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "That status change is not allowed." };

  // updateJobStatus scopes by customer id and checks the transition is legal,
  // so neither a guessed job id nor an illegal jump can succeed.
  const result = await updateJobStatus(parsed.data.jobId, auth.user.id, parsed.data.status);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/dashboard/jobs/${parsed.data.jobId}`);
  revalidatePath("/dashboard/jobs");
  return {};
}
