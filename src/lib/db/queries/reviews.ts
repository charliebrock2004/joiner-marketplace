import "server-only";

import { getDb } from "../client.ts";

/**
 * Reviews.
 *
 * Three rules, all enforced in the database rather than only in the UI:
 *  - only the customer of a completed job may review, and only the
 *    tradesperson who actually did it;
 *  - one review per reviewer per job per direction (unique index);
 *  - no self-reviews (check constraint).
 *
 * `direction` exists so tradesperson-to-customer reviews can be added later
 * without a migration. Only customer_to_tradesperson is written today.
 */

export type Review = {
  id: string;
  rating: number;
  quality: number | null;
  communication: number | null;
  reliability: number | null;
  body: string | null;
  created_at: string;
  reviewer_name: string;
  job_title: string;
};

export type ReviewStats = {
  average_rating: number | null;
  review_count: number;
  jobs_completed: number;
  average_quality: number | null;
  average_communication: number | null;
  average_reliability: number | null;
};

export async function listReviewsFor(subjectId: string): Promise<Review[]> {
  const db = await getDb();
  return db.query<Review>(
    `select r.id, r.rating, r.quality, r.communication, r.reliability, r.body,
            r.created_at, u.full_name as reviewer_name, j.title as job_title
       from reviews r
       join users u on u.id = r.reviewer_id
       join jobs j on j.id = r.job_id
      where r.subject_id = $1 and r.status = 'published'
      order by r.created_at desc`,
    [subjectId],
  );
}

export async function getReviewStats(subjectId: string): Promise<ReviewStats> {
  const db = await getDb();
  const [row] = await db.query<ReviewStats>(
    `select round(avg(r.rating), 1) as average_rating,
            count(*)::int as review_count,
            round(avg(r.quality), 1) as average_quality,
            round(avg(r.communication), 1) as average_communication,
            round(avg(r.reliability), 1) as average_reliability
       from reviews r
      where r.subject_id = $1 and r.status = 'published'`,
    [subjectId],
  );
  const [completed] = await db.query<{ count: string }>(
    "select count(*) as count from jobs where accepted_tradesperson_id = $1 and status = 'completed'",
    [subjectId],
  );
  return {
    average_rating: row?.average_rating ?? null,
    review_count: row?.review_count ?? 0,
    average_quality: row?.average_quality ?? null,
    average_communication: row?.average_communication ?? null,
    average_reliability: row?.average_reliability ?? null,
    jobs_completed: Number(completed?.count ?? 0),
  };
}

export type ReviewableJob = {
  job_id: string;
  title: string;
  tradesperson_id: string;
  tradesperson_name: string;
  completed_at: string;
};

/** Completed jobs this customer has not yet reviewed. */
export async function listReviewableJobs(customerId: string): Promise<ReviewableJob[]> {
  const db = await getDb();
  return db.query<ReviewableJob>(
    `select j.id as job_id, j.title, j.accepted_tradesperson_id as tradesperson_id,
            u.full_name as tradesperson_name, j.completed_at
       from jobs j
       join users u on u.id = j.accepted_tradesperson_id
      where j.customer_id = $1
        and j.status = 'completed'
        and j.removed_at is null
        and not exists (
          select 1 from reviews r
           where r.job_id = j.id and r.reviewer_id = $1
             and r.direction = 'customer_to_tradesperson'
        )
      order by j.completed_at desc`,
    [customerId],
  );
}

export type CreateReviewInput = {
  jobId: string;
  reviewerId: string;
  rating: number;
  quality: number | null;
  communication: number | null;
  reliability: number | null;
  body: string | null;
};

export async function createReview(
  input: CreateReviewInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const db = await getDb();

  // Eligibility is proved from the job row, not taken from the form: the
  // reviewer must own the job, it must be completed, and the subject is read
  // from the job rather than submitted by the client.
  const [job] = await db.query<{ accepted_tradesperson_id: string | null }>(
    `select accepted_tradesperson_id from jobs
      where id = $1 and customer_id = $2 and status = 'completed' and removed_at is null`,
    [input.jobId, input.reviewerId],
  );
  if (!job?.accepted_tradesperson_id) {
    return { ok: false, error: "You can only review a job you posted once it is complete." };
  }

  try {
    const [row] = await db.query<{ id: string }>(
      `insert into reviews (job_id, reviewer_id, subject_id, direction, rating,
                            quality, communication, reliability, body)
       values ($1, $2, $3, 'customer_to_tradesperson', $4, $5, $6, $7, $8)
       returning id`,
      [
        input.jobId,
        input.reviewerId,
        job.accepted_tradesperson_id,
        input.rating,
        input.quality,
        input.communication,
        input.reliability,
        input.body,
      ],
    );
    if (!row) return { ok: false, error: "Could not save that review." };
    return { ok: true, id: row.id };
  } catch (error) {
    if (error instanceof Error && /unique|duplicate/i.test(error.message)) {
      return { ok: false, error: "You have already reviewed this job." };
    }
    throw error;
  }
}
