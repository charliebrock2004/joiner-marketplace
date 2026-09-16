import "server-only";

import { getDb, type Database } from "../client.ts";
import { parsePostcode } from "@/lib/geo/postcode.ts";
import { AREA_WIDE_RADIUS_MILES } from "@/lib/geo/postcode.ts";

/**
 * Job data access.
 *
 * Every read that returns a specific job takes the viewer into account. There
 * is no "get job by id" that trusts the caller to have checked permission
 * first — that is how IDOR bugs happen. The marketplace view also omits the
 * customer's name, full postcode, phone and email entirely; those columns are
 * not selected, so they cannot leak through a serialisation mistake.
 */

export type JobStatus =
  | "draft"
  | "open"
  | "applications"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

/** Statuses a tradesperson may still apply to. */
export const APPLYABLE_STATUSES: JobStatus[] = ["open", "applications"];

export type JobSummary = {
  id: string;
  title: string;
  status: JobStatus;
  trade_name: string;
  trade_slug: string;
  category_name: string | null;
  postcode_outward: string;
  budget_band: string;
  timing: string;
  preferred_date: string | null;
  created_at: string;
  photo_url: string | null;
  application_count: number;
};

export type JobDetail = JobSummary & {
  description: string;
  customer_id: string;
  accepted_tradesperson_id: string | null;
  completed_at: string | null;
  photos: { id: string; url: string }[];
  /** Only populated for the customer who owns the job, or an admin. */
  postcode: string | null;
};

const SUMMARY_COLUMNS = `
  j.id, j.title, j.status, j.postcode_outward, j.budget_band, j.timing,
  j.preferred_date, j.created_at,
  t.name as trade_name, t.slug as trade_slug,
  c.name as category_name,
  (select p.url from job_photos p where p.job_id = j.id order by p.sort_order limit 1) as photo_url,
  (select count(*)::int from applications a
    where a.job_id = j.id and a.status <> 'withdrawn') as application_count
`;

const JOIN_TAXONOMY = `
  join trades t on t.id = j.trade_id
  left join job_categories c on c.id = j.category_id
`;

/* ----------------------------------------------------------------- create -- */

export type CreateJobInput = {
  customerId: string;
  tradeId: string;
  categoryId: string | null;
  title: string;
  description: string;
  postcode: string;
  budgetBand: string;
  timing: string;
  preferredDate: string | null;
  status: "draft" | "open";
};

export async function createJob(
  input: CreateJobInput,
  tx?: Database,
): Promise<{ id: string }> {
  const db = tx ?? (await getDb());
  const parts = parsePostcode(input.postcode);
  if (!parts) throw new Error("Invalid postcode reached createJob");

  const [row] = await db.query<{ id: string }>(
    `insert into jobs (customer_id, trade_id, category_id, title, description,
                       postcode, postcode_outward, postcode_area,
                       budget_band, timing, preferred_date, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     returning id`,
    [
      input.customerId,
      input.tradeId,
      input.categoryId,
      input.title,
      input.description,
      parts.formatted,
      parts.outward,
      parts.area,
      input.budgetBand,
      input.timing,
      input.preferredDate,
      input.status,
    ],
  );
  if (!row) throw new Error("Job insert returned no row");
  return row;
}

export async function addJobPhotos(
  jobId: string,
  urls: string[],
  tx?: Database,
): Promise<void> {
  if (urls.length === 0) return;
  const db = tx ?? (await getDb());
  for (const [index, url] of urls.entries()) {
    await db.query("insert into job_photos (job_id, url, sort_order) values ($1, $2, $3)", [
      jobId,
      url,
      index,
    ]);
  }
}

/* ------------------------------------------------------------- customer --- */

export async function listJobsForCustomer(customerId: string): Promise<JobSummary[]> {
  const db = await getDb();
  return db.query<JobSummary>(
    `select ${SUMMARY_COLUMNS}
       from jobs j ${JOIN_TAXONOMY}
      where j.customer_id = $1 and j.removed_at is null
      order by j.created_at desc`,
    [customerId],
  );
}

/**
 * A job as its owner sees it. Scoped by customer_id in the query itself, so a
 * guessed UUID returns nothing rather than someone else's job.
 */
export async function getJobForCustomer(
  jobId: string,
  customerId: string,
): Promise<JobDetail | null> {
  const db = await getDb();
  const [row] = await db.query<JobDetail>(
    `select ${SUMMARY_COLUMNS}, j.description, j.customer_id, j.accepted_tradesperson_id,
            j.completed_at, j.postcode
       from jobs j ${JOIN_TAXONOMY}
      where j.id = $1 and j.customer_id = $2 and j.removed_at is null`,
    [jobId, customerId],
  );
  if (!row) return null;
  row.photos = await listJobPhotos(jobId);
  return row;
}

async function listJobPhotos(jobId: string): Promise<{ id: string; url: string }[]> {
  const db = await getDb();
  return db.query<{ id: string; url: string }>(
    "select id, url from job_photos where job_id = $1 order by sort_order",
    [jobId],
  );
}

/* --------------------------------------------------------- marketplace ---- */

export type MarketplaceFilters = {
  tradeIds: string[];
  outward: string | null;
  area: string | null;
  radiusMiles: number;
  /** Excludes jobs this tradesperson has already applied to. */
  tradespersonId: string;
  categoryIds?: string[];
};

/**
 * Open jobs a tradesperson can see.
 *
 * Deterministic matching: trade must overlap, and location is tiered by
 * postcode. Same outward code always matches; the wider postal area matches
 * once the tradesperson travels far enough. Jobs are never matched across
 * postcode areas, which keeps results honest given we do not yet hold true
 * coordinates.
 *
 * Customer identity is not selected at all.
 */
export async function listMarketplaceJobs(filters: MarketplaceFilters): Promise<JobSummary[]> {
  const db = await getDb();
  const wideRadius = filters.radiusMiles >= AREA_WIDE_RADIUS_MILES;

  return db.query<JobSummary>(
    `select ${SUMMARY_COLUMNS}
       from jobs j ${JOIN_TAXONOMY}
      where j.status = any($1)
        and j.removed_at is null
        and ($2::uuid[] is null or array_length($2::uuid[], 1) is null or j.trade_id = any($2::uuid[]))
        and ($6::uuid[] is null or array_length($6::uuid[], 1) is null or j.category_id = any($6::uuid[]))
        and (
          j.postcode_outward = $3
          or ($4 and j.postcode_area = $5)
        )
        and not exists (
          select 1 from applications a
           where a.job_id = j.id and a.tradesperson_id = $7
        )
      order by
        case when j.postcode_outward = $3 then 0 else 1 end,
        j.created_at desc
      limit 100`,
    [
      APPLYABLE_STATUSES,
      filters.tradeIds.length > 0 ? filters.tradeIds : null,
      filters.outward,
      wideRadius,
      filters.area,
      filters.categoryIds && filters.categoryIds.length > 0 ? filters.categoryIds : null,
      filters.tradespersonId,
    ],
  );
}

/**
 * A job as a tradesperson sees it.
 *
 * Returns the public view unless they are the accepted tradesperson, in which
 * case the full postcode is included so they can actually get there.
 */
export async function getJobForTradesperson(
  jobId: string,
  tradespersonId: string,
): Promise<JobDetail | null> {
  const db = await getDb();
  const [row] = await db.query<JobDetail>(
    `select ${SUMMARY_COLUMNS}, j.description, j.customer_id, j.accepted_tradesperson_id,
            j.completed_at,
            case when j.accepted_tradesperson_id = $2 then j.postcode else null end as postcode
       from jobs j ${JOIN_TAXONOMY}
      where j.id = $1
        and j.removed_at is null
        and (
          j.status = any($3)
          or j.accepted_tradesperson_id = $2
          or exists (select 1 from applications a
                      where a.job_id = j.id and a.tradesperson_id = $2)
        )`,
    [jobId, tradespersonId, APPLYABLE_STATUSES],
  );
  if (!row) return null;
  row.photos = await listJobPhotos(jobId);
  return row;
}

/** Jobs a tradesperson has applied to or been accepted for. */
export async function listJobsForTradesperson(tradespersonId: string): Promise<
  (JobSummary & { application_status: string | null })[]
> {
  const db = await getDb();
  return db.query(
    `select ${SUMMARY_COLUMNS}, a.status as application_status
       from jobs j ${JOIN_TAXONOMY}
       left join applications a on a.job_id = j.id and a.tradesperson_id = $1
      where j.removed_at is null
        and (a.id is not null or j.accepted_tradesperson_id = $1)
      order by j.created_at desc`,
    [tradespersonId],
  );
}

/* ----------------------------------------------------------- transitions -- */

/**
 * Valid status moves. Anything not listed is rejected, so a crafted form
 * cannot jump a job straight from draft to completed and unlock reviews.
 */
const CUSTOMER_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["cancelled"],
  applications: ["cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canCustomerTransition(from: JobStatus, to: JobStatus): boolean {
  return CUSTOMER_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function updateJobStatus(
  jobId: string,
  customerId: string,
  to: JobStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  const [job] = await db.query<{ status: JobStatus }>(
    "select status from jobs where id = $1 and customer_id = $2 and removed_at is null",
    [jobId, customerId],
  );
  if (!job) return { ok: false, error: "Job not found." };
  if (!canCustomerTransition(job.status, to)) {
    return { ok: false, error: `A job cannot move from ${job.status} to ${to}.` };
  }

  const timestampColumn =
    to === "in_progress" ? "started_at" :
    to === "completed" ? "completed_at" :
    to === "cancelled" ? "cancelled_at" : null;

  await db.query(
    `update jobs
        set status = $3,
            updated_at = now()
            ${timestampColumn ? `, ${timestampColumn} = now()` : ""}
      where id = $1 and customer_id = $2`,
    [jobId, customerId, to],
  );
  return { ok: true };
}

export async function countJobsByStatus(customerId: string): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.query<{ status: string; count: string }>(
    `select status, count(*) as count from jobs
      where customer_id = $1 and removed_at is null group by status`,
    [customerId],
  );
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
}
