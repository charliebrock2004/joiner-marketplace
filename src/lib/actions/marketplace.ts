"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authorise } from "@/lib/auth/guards.ts";
import {
  acceptApplication,
  createApplication,
  withdrawApplication,
} from "@/lib/db/queries/applications.ts";
import { ensureConversation, markConversationRead, sendMessage } from "@/lib/db/queries/messages.ts";
import { createReview } from "@/lib/db/queries/reviews.ts";
import { addPortfolioPhotos, deletePortfolioPhoto, setProfilePhoto, updateProfile } from "@/lib/db/queries/profiles.ts";
import { rateLimit } from "@/lib/security/rate-limit.ts";
import { storeImages } from "@/lib/storage";
import {
  applicationSchema,
  idSchema,
  messageSchema,
  profileSchema,
  reportSchema,
  reviewSchema,
} from "@/lib/validation/marketplace.ts";
import { toFieldErrors } from "@/lib/validation/shared.ts";
import { getDb } from "@/lib/db/client.ts";

export type ActionState = { error?: string; fieldErrors?: Record<string, string>; success?: string };

/* ------------------------------------------------------------- profile ---- */

export async function updateProfileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorise("tradesperson");
  if (!auth.ok) return { error: auth.error };

  const parsed = profileSchema.safeParse({
    primaryTradeId: formData.get("primaryTradeId"),
    experienceLevel: formData.get("experienceLevel"),
    yearsExperience: formData.get("yearsExperience"),
    radiusMiles: formData.get("radiusMiles"),
    about: formData.get("about"),
    qualifications: formData.get("qualifications") ?? "",
    acceptingWork: formData.get("acceptingWork") ?? undefined,
    skillIds: formData.getAll("skillIds").map(String),
    availability: formData.getAll("availability").map(String),
  });

  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  }

  await updateProfile(auth.user.id, {
    primaryTradeId: parsed.data.primaryTradeId,
    experienceLevel: parsed.data.experienceLevel,
    yearsExperience: parsed.data.yearsExperience,
    radiusMiles: parsed.data.radiusMiles,
    about: parsed.data.about,
    qualifications: parsed.data.qualifications || null,
    acceptingWork: parsed.data.acceptingWork,
    skillIds: parsed.data.skillIds,
    availability: parsed.data.availability,
  });

  revalidatePath("/dashboard/profile");
  return { success: "Profile saved." };
}

export async function uploadProfilePhotoAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorise("tradesperson");
  if (!auth.ok) return { error: auth.error };

  const files = formData.getAll("photo").filter((f): f is File => f instanceof File);
  const stored = await storeImages(files, "avatars", 1);
  if ("message" in stored) return { error: stored.message };
  const first = stored.images[0];
  if (!first) return { error: "Choose a photo to upload." };

  await setProfilePhoto(auth.user.id, first.url);
  revalidatePath("/dashboard/profile");
  return { success: "Photo updated." };
}

export async function uploadPortfolioAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorise("tradesperson");
  if (!auth.ok) return { error: auth.error };

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File);
  const stored = await storeImages(files, "portfolio", 8);
  if ("message" in stored) return { error: stored.message };

  await addPortfolioPhotos(auth.user.id, stored.images.map((i) => i.url));
  revalidatePath("/dashboard/profile");
  return { success: "Photos added." };
}

export async function deletePortfolioPhotoAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorise("tradesperson");
  if (!auth.ok) return { error: auth.error };

  const photoId = idSchema.safeParse(formData.get("photoId"));
  if (!photoId.success) return { error: "Could not remove that photo." };

  const removed = await deletePortfolioPhoto(auth.user.id, photoId.data);
  revalidatePath("/dashboard/profile");
  return removed ? { success: "Photo removed." } : { error: "Could not remove that photo." };
}

/* --------------------------------------------------------- applications --- */

export async function applyToJobAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorise("tradesperson");
  if (!auth.ok) return { error: auth.error };

  const limit = rateLimit(`apply:${auth.user.id}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return { error: "You have applied to a lot of jobs recently. Try again later." };

  const parsed = applicationSchema.safeParse({
    jobId: formData.get("jobId"),
    message: formData.get("message") ?? "",
    quoteAmount: formData.get("quoteAmount") ?? "",
  });
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const quote = parsed.data.quoteAmount;
  const result = await createApplication({
    jobId: parsed.data.jobId,
    tradespersonId: auth.user.id,
    message: parsed.data.message || null,
    quoteAmount: typeof quote === "number" ? quote : null,
  });

  if (!result.ok) return { error: result.error };

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${parsed.data.jobId}`);
  return { success: "Your interest has been sent to the customer." };
}

export async function withdrawApplicationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorise("tradesperson");
  if (!auth.ok) return { error: auth.error };

  const id = idSchema.safeParse(formData.get("applicationId"));
  if (!id.success) return { error: "Could not withdraw that application." };

  const result = await withdrawApplication(id.data, auth.user.id);
  revalidatePath("/dashboard/applications");
  return result.ok ? { success: "Application withdrawn." } : { error: result.error };
}

export async function acceptApplicationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorise("customer");
  if (!auth.ok) return { error: auth.error };

  const id = idSchema.safeParse(formData.get("applicationId"));
  if (!id.success) return { error: "Could not accept that application." };

  const result = await acceptApplication(id.data, auth.user.id);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/dashboard/jobs/${result.jobId}`);
  revalidatePath("/dashboard/messages");
  redirect(`/dashboard/jobs/${result.jobId}?accepted=1`);
}

/* ------------------------------------------------------------ messaging --- */

export async function sendMessageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorise("customer", "tradesperson");
  if (!auth.ok) return { error: auth.error };

  const limit = rateLimit(`message:${auth.user.id}`, 60, 10 * 60 * 1000);
  if (!limit.ok) return { error: "You are sending messages very quickly. Please slow down." };

  const parsed = messageSchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const result = await sendMessage(parsed.data.conversationId, auth.user.id, parsed.data.body);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/dashboard/messages/${parsed.data.conversationId}`);
  revalidatePath("/dashboard/messages");
  return {};
}

export async function markReadAction(conversationId: string): Promise<void> {
  const auth = await authorise("customer", "tradesperson");
  if (!auth.ok) return;
  const id = idSchema.safeParse(conversationId);
  if (!id.success) return;
  await markConversationRead(id.data, auth.user.id);
}

export async function startConversationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorise("customer");
  if (!auth.ok) return { error: auth.error };

  const jobId = idSchema.safeParse(formData.get("jobId"));
  const tradespersonId = idSchema.safeParse(formData.get("tradespersonId"));
  if (!jobId.success || !tradespersonId.success) return { error: "Could not open that conversation." };

  const conversationId = await ensureConversation(jobId.data, auth.user.id, tradespersonId.data);
  if (!conversationId) return { error: "Could not open that conversation." };

  redirect(`/dashboard/messages/${conversationId}`);
}

/* -------------------------------------------------------------- reviews --- */

export async function createReviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorise("customer");
  if (!auth.ok) return { error: auth.error };

  const parsed = reviewSchema.safeParse({
    jobId: formData.get("jobId"),
    rating: formData.get("rating"),
    quality: formData.get("quality") ?? "",
    communication: formData.get("communication") ?? "",
    reliability: formData.get("reliability") ?? "",
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  }

  // The subject is derived from the job inside createReview, never submitted.
  const result = await createReview({
    jobId: parsed.data.jobId,
    reviewerId: auth.user.id,
    rating: parsed.data.rating,
    quality: parsed.data.quality,
    communication: parsed.data.communication,
    reliability: parsed.data.reliability,
    body: parsed.data.body || null,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/dashboard/reviews");
  revalidatePath(`/dashboard/jobs/${parsed.data.jobId}`);
  return { success: "Thanks — your review has been published." };
}

/* -------------------------------------------------------------- reports --- */

export async function createReportAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorise("customer", "tradesperson");
  if (!auth.ok) return { error: auth.error };

  const limit = rateLimit(`report:${auth.user.id}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return { error: "You have submitted several reports recently. Please try again later." };

  const parsed = reportSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    reason: formData.get("reason"),
    details: formData.get("details") ?? "",
  });
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const db = await getDb();
  try {
    await db.query(
      `insert into reports (reporter_id, target_type, target_id, reason, details)
       values ($1, $2, $3, $4, $5)`,
      [auth.user.id, parsed.data.targetType, parsed.data.targetId, parsed.data.reason, parsed.data.details || null],
    );
  } catch (error) {
    // The partial unique index stops one person filing the same open report twice.
    if (error instanceof Error && /unique|duplicate/i.test(error.message)) {
      return { success: "You have already reported this. Our team is looking at it." };
    }
    throw error;
  }

  return { success: "Thanks for letting us know. Our team will look into it." };
}
