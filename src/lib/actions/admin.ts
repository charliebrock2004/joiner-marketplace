"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorise } from "@/lib/auth/guards.ts";
import { destroyAllSessionsForUser } from "@/lib/auth/session.ts";
import { getDb } from "@/lib/db/client.ts";
import { recordAdminAction } from "@/lib/db/queries/admin.ts";
import { idSchema } from "@/lib/validation/marketplace.ts";
import { shortText } from "@/lib/validation/shared.ts";

export type AdminActionState = { error?: string; success?: string };

/**
 * Admin mutations.
 *
 * Every one of these re-checks the admin role server-side. None of them are
 * reachable by hiding a button, and each writes an entry to admin_actions so
 * moderation decisions can be reviewed later.
 */

const suspendSchema = z.object({
  userId: idSchema,
  reason: shortText(3, 300, "Reason"),
});

export async function suspendUserAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await authorise("admin");
  if (!auth.ok) return { error: auth.error };

  const parsed = suspendSchema.safeParse({
    userId: formData.get("userId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "Give a reason for the suspension." };

  // An admin cannot suspend themselves out of the platform.
  if (parsed.data.userId === auth.user.id) {
    return { error: "You cannot suspend your own account." };
  }

  const db = await getDb();
  const rows = await db.query<{ id: string }>(
    `update users set status = 'suspended', suspended_reason = $2, suspended_at = now(),
            updated_at = now()
      where id = $1 and status = 'active' and role <> 'admin'
      returning id`,
    [parsed.data.userId, parsed.data.reason],
  );
  if (rows.length === 0) return { error: "That account could not be suspended." };

  // Kill their sessions so suspension takes effect immediately.
  await destroyAllSessionsForUser(parsed.data.userId);

  await recordAdminAction({
    adminId: auth.user.id,
    action: "user.suspend",
    targetType: "user",
    targetId: parsed.data.userId,
    metadata: { reason: parsed.data.reason },
  });

  revalidatePath("/admin/users");
  return { success: "Account suspended." };
}

export async function reinstateUserAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await authorise("admin");
  if (!auth.ok) return { error: auth.error };

  const userId = idSchema.safeParse(formData.get("userId"));
  if (!userId.success) return { error: "Could not reinstate that account." };

  const db = await getDb();
  await db.query(
    `update users set status = 'active', suspended_reason = null, suspended_at = null,
            updated_at = now()
      where id = $1 and status = 'suspended'`,
    [userId.data],
  );

  await recordAdminAction({
    adminId: auth.user.id,
    action: "user.reinstate",
    targetType: "user",
    targetId: userId.data,
  });

  revalidatePath("/admin/users");
  return { success: "Account reinstated." };
}

const verificationSchema = z.object({
  userId: idSchema,
  status: z.enum(["unverified", "pending", "verified", "rejected"]),
  notes: shortText(0, 500, "Notes").optional().or(z.literal("")),
});

/**
 * The only path that can mark someone verified.
 *
 * Nothing in the tradesperson-facing code can write verification_status, so a
 * "verified" badge always means an admin took this action.
 */
export async function setVerificationAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await authorise("admin");
  if (!auth.ok) return { error: auth.error };

  const parsed = verificationSchema.safeParse({
    userId: formData.get("userId"),
    status: formData.get("status"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: "That verification change is not valid." };

  const db = await getDb();
  await db.query(
    `update tradesperson_profiles
        set verification_status = $2,
            verification_notes = $3,
            verified_at = case when $2 = 'verified' then now() else null end,
            verified_by = case when $2 = 'verified' then $4::uuid else null end,
            updated_at = now()
      where user_id = $1`,
    [parsed.data.userId, parsed.data.status, parsed.data.notes || null, auth.user.id],
  );

  await recordAdminAction({
    adminId: auth.user.id,
    action: `verification.${parsed.data.status}`,
    targetType: "tradesperson",
    targetId: parsed.data.userId,
    metadata: { notes: parsed.data.notes || null },
  });

  revalidatePath("/admin/verification");
  return { success: `Verification set to ${parsed.data.status}.` };
}

const removeJobSchema = z.object({
  jobId: idSchema,
  reason: shortText(3, 300, "Reason"),
});

export async function removeJobAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await authorise("admin");
  if (!auth.ok) return { error: auth.error };

  const parsed = removeJobSchema.safeParse({
    jobId: formData.get("jobId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "Give a reason for removing the job." };

  const db = await getDb();
  // Soft delete: the row stays for the audit trail but disappears everywhere
  // in the product, because every marketplace query filters removed_at.
  await db.query(
    `update jobs set removed_at = now(), removed_by = $2, removed_reason = $3, updated_at = now()
      where id = $1 and removed_at is null`,
    [parsed.data.jobId, auth.user.id, parsed.data.reason],
  );

  await recordAdminAction({
    adminId: auth.user.id,
    action: "job.remove",
    targetType: "job",
    targetId: parsed.data.jobId,
    metadata: { reason: parsed.data.reason },
  });

  revalidatePath("/admin/jobs");
  return { success: "Job removed." };
}

export async function restoreJobAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await authorise("admin");
  if (!auth.ok) return { error: auth.error };

  const jobId = idSchema.safeParse(formData.get("jobId"));
  if (!jobId.success) return { error: "Could not restore that job." };

  const db = await getDb();
  await db.query(
    "update jobs set removed_at = null, removed_by = null, removed_reason = null where id = $1",
    [jobId.data],
  );
  await recordAdminAction({
    adminId: auth.user.id,
    action: "job.restore",
    targetType: "job",
    targetId: jobId.data,
  });

  revalidatePath("/admin/jobs");
  return { success: "Job restored." };
}

const moderateReviewSchema = z.object({
  reviewId: idSchema,
  status: z.enum(["published", "hidden", "removed"]),
  reason: shortText(0, 300, "Reason").optional().or(z.literal("")),
});

export async function moderateReviewAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await authorise("admin");
  if (!auth.ok) return { error: auth.error };

  const parsed = moderateReviewSchema.safeParse({
    reviewId: formData.get("reviewId"),
    status: formData.get("status"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { error: "That moderation change is not valid." };

  const db = await getDb();
  await db.query(
    `update reviews set status = $2, moderated_by = $3, moderated_at = now(),
            moderation_reason = $4
      where id = $1`,
    [parsed.data.reviewId, parsed.data.status, auth.user.id, parsed.data.reason || null],
  );

  await recordAdminAction({
    adminId: auth.user.id,
    action: `review.${parsed.data.status}`,
    targetType: "review",
    targetId: parsed.data.reviewId,
    metadata: { reason: parsed.data.reason || null },
  });

  revalidatePath("/admin/reviews");
  return { success: `Review ${parsed.data.status}.` };
}

const resolveReportSchema = z.object({
  reportId: idSchema,
  status: z.enum(["reviewing", "resolved", "dismissed"]),
  notes: shortText(0, 500, "Notes").optional().or(z.literal("")),
});

export async function resolveReportAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await authorise("admin");
  if (!auth.ok) return { error: auth.error };

  const parsed = resolveReportSchema.safeParse({
    reportId: formData.get("reportId"),
    status: formData.get("status"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: "That report update is not valid." };

  const db = await getDb();
  const resolved = parsed.data.status !== "reviewing";
  await db.query(
    `update reports
        set status = $2,
            resolved_by = case when $4 then $3::uuid else null end,
            resolved_at = case when $4 then now() else null end,
            resolution_notes = $5
      where id = $1`,
    [parsed.data.reportId, parsed.data.status, auth.user.id, resolved, parsed.data.notes || null],
  );

  await recordAdminAction({
    adminId: auth.user.id,
    action: `report.${parsed.data.status}`,
    targetType: "report",
    targetId: parsed.data.reportId,
    metadata: { notes: parsed.data.notes || null },
  });

  revalidatePath("/admin/reports");
  return { success: `Report marked ${parsed.data.status}.` };
}

const removeMessageSchema = z.object({ messageId: idSchema });

export async function removeMessageAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await authorise("admin");
  if (!auth.ok) return { error: auth.error };

  const parsed = removeMessageSchema.safeParse({ messageId: formData.get("messageId") });
  if (!parsed.success) return { error: "Could not remove that message." };

  const db = await getDb();
  await db.query(
    "update messages set removed_at = now(), removed_by = $2 where id = $1 and removed_at is null",
    [parsed.data.messageId, auth.user.id],
  );

  await recordAdminAction({
    adminId: auth.user.id,
    action: "message.remove",
    targetType: "message",
    targetId: parsed.data.messageId,
  });

  revalidatePath("/admin/reports");
  return { success: "Message removed." };
}
