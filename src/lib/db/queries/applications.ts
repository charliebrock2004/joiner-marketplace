import "server-only";

import { getDb } from "../client.ts";

/**
 * Applications.
 *
 * The applicant view a customer sees deliberately excludes the tradesperson's
 * email and phone: contact details are exchanged through messaging once the
 * customer has chosen someone, not published to everyone who posts a job.
 */

export type Applicant = {
  id: string;
  tradesperson_id: string;
  message: string | null;
  quote_amount: string | null;
  status: string;
  created_at: string;
  full_name: string;
  postcode_outward: string | null;
  experience_level: string;
  years_experience: number;
  verification_status: string;
  profile_photo_url: string | null;
  trade_name: string | null;
  average_rating: number | null;
  review_count: number;
  jobs_completed: number;
};

const APPLICANT_COLUMNS = `
  a.id, a.tradesperson_id, a.message, a.quote_amount, a.status, a.created_at,
  u.full_name, u.postcode_outward,
  p.experience_level, p.years_experience, p.verification_status, p.profile_photo_url,
  t.name as trade_name,
  (select round(avg(r.rating), 1) from reviews r
    where r.subject_id = u.id and r.status = 'published') as average_rating,
  (select count(*)::int from reviews r
    where r.subject_id = u.id and r.status = 'published') as review_count,
  (select count(*)::int from jobs j2
    where j2.accepted_tradesperson_id = u.id and j2.status = 'completed') as jobs_completed
`;

export async function listApplicantsForJob(
  jobId: string,
  customerId: string,
): Promise<Applicant[]> {
  const db = await getDb();
  // The join back to jobs enforces ownership inside the query itself.
  return db.query<Applicant>(
    `select ${APPLICANT_COLUMNS}
       from applications a
       join jobs j on j.id = a.job_id and j.customer_id = $2
       join users u on u.id = a.tradesperson_id
       left join tradesperson_profiles p on p.user_id = u.id
       left join trades t on t.id = p.primary_trade_id
      where a.job_id = $1 and a.status <> 'withdrawn' and u.status = 'active'
      order by case a.status when 'accepted' then 0 when 'shortlisted' then 1 else 2 end,
               a.created_at`,
    [jobId, customerId],
  );
}

export async function hasApplied(jobId: string, tradespersonId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.query(
    "select 1 from applications where job_id = $1 and tradesperson_id = $2",
    [jobId, tradespersonId],
  );
  return rows.length > 0;
}

export type ApplyResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createApplication(input: {
  jobId: string;
  tradespersonId: string;
  message: string | null;
  quoteAmount: number | null;
}): Promise<ApplyResult> {
  const db = await getDb();

  // Re-check the job is still open inside the same statement that inserts, so
  // a job closing between page load and submit cannot be applied to.
  const [job] = await db.query<{ status: string; customer_id: string }>(
    `select status, customer_id from jobs
      where id = $1 and removed_at is null and status in ('open', 'applications')`,
    [input.jobId],
  );
  if (!job) return { ok: false, error: "This job is no longer accepting applications." };
  if (job.customer_id === input.tradespersonId) {
    return { ok: false, error: "You cannot apply to your own job." };
  }

  try {
    const [row] = await db.query<{ id: string }>(
      `insert into applications (job_id, tradesperson_id, message, quote_amount)
       values ($1, $2, $3, $4)
       returning id`,
      [input.jobId, input.tradespersonId, input.message, input.quoteAmount],
    );
    if (!row) return { ok: false, error: "Could not record that application." };

    // First application moves the job from 'open' to 'applications'.
    await db.query(
      "update jobs set status = 'applications', updated_at = now() where id = $1 and status = 'open'",
      [input.jobId],
    );

    return { ok: true, id: row.id };
  } catch (error) {
    // The unique index is the real guard against double-applying.
    if (error instanceof Error && /unique|duplicate/i.test(error.message)) {
      return { ok: false, error: "You have already applied for this job." };
    }
    throw error;
  }
}

/**
 * Accepts an applicant.
 *
 * Runs in a transaction: the application is accepted, every other application
 * is declined, the job moves to 'accepted', and the conversation is opened.
 * Either all of that happens or none of it does.
 */
export async function acceptApplication(
  applicationId: string,
  customerId: string,
): Promise<{ ok: true; tradespersonId: string; jobId: string } | { ok: false; error: string }> {
  const db = await getDb();

  return db.transaction(async (tx) => {
    const [application] = await tx.query<{
      id: string;
      job_id: string;
      tradesperson_id: string;
      job_status: string;
    }>(
      `select a.id, a.job_id, a.tradesperson_id, j.status as job_status
         from applications a
         join jobs j on j.id = a.job_id
        where a.id = $1 and j.customer_id = $2 and j.removed_at is null`,
      [applicationId, customerId],
    );

    if (!application) return { ok: false as const, error: "Application not found." };
    if (!["open", "applications"].includes(application.job_status)) {
      return { ok: false as const, error: "This job already has someone assigned." };
    }

    await tx.query("update applications set status = 'accepted', updated_at = now() where id = $1", [
      applicationId,
    ]);
    await tx.query(
      `update applications set status = 'declined', updated_at = now()
        where job_id = $1 and id <> $2 and status in ('pending', 'shortlisted')`,
      [application.job_id, applicationId],
    );
    await tx.query(
      `update jobs
          set status = 'accepted', accepted_tradesperson_id = $2, accepted_at = now(), updated_at = now()
        where id = $1`,
      [application.job_id, application.tradesperson_id],
    );
    await tx.query(
      `insert into conversations (job_id, customer_id, tradesperson_id)
       values ($1, $2, $3)
       on conflict (job_id, tradesperson_id) do nothing`,
      [application.job_id, customerId, application.tradesperson_id],
    );

    return {
      ok: true as const,
      tradespersonId: application.tradesperson_id,
      jobId: application.job_id,
    };
  });
}

export async function withdrawApplication(
  applicationId: string,
  tradespersonId: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  const rows = await db.query(
    `update applications set status = 'withdrawn', updated_at = now()
      where id = $1 and tradesperson_id = $2 and status in ('pending', 'shortlisted')
      returning id`,
    [applicationId, tradespersonId],
  );
  return rows.length > 0
    ? { ok: true }
    : { ok: false, error: "That application can no longer be withdrawn." };
}
