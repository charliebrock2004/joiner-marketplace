import "server-only";

import { getDb } from "../client.ts";

/**
 * Admin data access.
 *
 * Every function here is only ever reached after requireAdmin()/authorise("admin"),
 * which is enforced in the page or action, not by this module. Each mutation
 * writes to admin_actions, which is append-only — the audit trail is what makes
 * moderation reviewable after the fact.
 */

export type AdminStats = {
  total_users: number;
  customers: number;
  tradespeople: number;
  suspended: number;
  open_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  applications: number;
  reviews: number;
  open_reports: number;
  pending_verification: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const db = await getDb();
  const [row] = await db.query<AdminStats>(`
    select
      (select count(*)::int from users where status <> 'deleted') as total_users,
      (select count(*)::int from users where role = 'customer' and status <> 'deleted') as customers,
      (select count(*)::int from users where role = 'tradesperson' and status <> 'deleted') as tradespeople,
      (select count(*)::int from users where status = 'suspended') as suspended,
      (select count(*)::int from jobs where status in ('open','applications') and removed_at is null) as open_jobs,
      (select count(*)::int from jobs where status in ('accepted','in_progress') and removed_at is null) as active_jobs,
      (select count(*)::int from jobs where status = 'completed' and removed_at is null) as completed_jobs,
      (select count(*)::int from applications) as applications,
      (select count(*)::int from reviews where status = 'published') as reviews,
      (select count(*)::int from reports where status in ('open','reviewing')) as open_reports,
      (select count(*)::int from tradesperson_profiles where verification_status = 'pending') as pending_verification
  `);
  if (!row) throw new Error("Could not load admin stats");
  return row;
}

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  postcode_outward: string | null;
  created_at: string;
  suspended_reason: string | null;
  verification_status: string | null;
  job_count: number;
};

export async function listUsers(filter: {
  role?: string;
  status?: string;
  search?: string;
}): Promise<AdminUser[]> {
  const db = await getDb();
  return db.query<AdminUser>(
    `select u.id, u.email, u.full_name, u.role, u.status, u.postcode_outward,
            u.created_at, u.suspended_reason,
            p.verification_status,
            (select count(*)::int from jobs j where j.customer_id = u.id) as job_count
       from users u
       left join tradesperson_profiles p on p.user_id = u.id
      where u.status <> 'deleted'
        and ($1::text is null or u.role = $1)
        and ($2::text is null or u.status = $2)
        and ($3::text is null or u.full_name ilike '%' || $3 || '%' or u.email ilike '%' || $3 || '%')
      order by u.created_at desc
      limit 200`,
    [filter.role ?? null, filter.status ?? null, filter.search || null],
  );
}

export type AdminJob = {
  id: string;
  title: string;
  status: string;
  customer_name: string;
  customer_id: string;
  trade_name: string;
  postcode_outward: string;
  created_at: string;
  removed_at: string | null;
  application_count: number;
};

export async function listAllJobs(status?: string): Promise<AdminJob[]> {
  const db = await getDb();
  return db.query<AdminJob>(
    `select j.id, j.title, j.status, j.postcode_outward, j.created_at, j.removed_at,
            u.full_name as customer_name, u.id as customer_id, t.name as trade_name,
            (select count(*)::int from applications a where a.job_id = j.id) as application_count
       from jobs j
       join users u on u.id = j.customer_id
       join trades t on t.id = j.trade_id
      where ($1::text is null or j.status = $1)
      order by j.created_at desc
      limit 200`,
    [status ?? null],
  );
}

export type AdminReview = {
  id: string;
  rating: number;
  body: string | null;
  status: string;
  created_at: string;
  reviewer_name: string;
  subject_name: string;
  subject_id: string;
  job_title: string;
};

export async function listAllReviews(status?: string): Promise<AdminReview[]> {
  const db = await getDb();
  return db.query<AdminReview>(
    `select r.id, r.rating, r.body, r.status, r.created_at,
            reviewer.full_name as reviewer_name,
            subject.full_name as subject_name, subject.id as subject_id,
            j.title as job_title
       from reviews r
       join users reviewer on reviewer.id = r.reviewer_id
       join users subject on subject.id = r.subject_id
       join jobs j on j.id = r.job_id
      where ($1::text is null or r.status = $1)
      order by r.created_at desc
      limit 200`,
    [status ?? null],
  );
}

export type AdminReport = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_name: string;
  resolution_notes: string | null;
};

export async function listReports(status?: string): Promise<AdminReport[]> {
  const db = await getDb();
  return db.query<AdminReport>(
    `select r.id, r.target_type, r.target_id, r.reason, r.details, r.status,
            r.created_at, r.resolution_notes, u.full_name as reporter_name
       from reports r
       join users u on u.id = r.reporter_id
      where ($1::text is null or r.status = $1)
      order by case r.status when 'open' then 0 when 'reviewing' then 1 else 2 end,
               r.created_at desc
      limit 200`,
    [status ?? null],
  );
}

export type PendingVerification = {
  user_id: string;
  full_name: string;
  email: string;
  trade_name: string | null;
  experience_level: string;
  years_experience: number;
  qualifications: string | null;
  verification_status: string;
  verification_notes: string | null;
  created_at: string;
};

export async function listForVerification(status?: string): Promise<PendingVerification[]> {
  const db = await getDb();
  return db.query<PendingVerification>(
    `select p.user_id, u.full_name, u.email, t.name as trade_name,
            p.experience_level, p.years_experience, p.qualifications,
            p.verification_status, p.verification_notes, p.created_at
       from tradesperson_profiles p
       join users u on u.id = p.user_id
       left join trades t on t.id = p.primary_trade_id
      where u.status <> 'deleted'
        and ($1::text is null or p.verification_status = $1)
      order by case p.verification_status when 'pending' then 0 else 1 end, p.created_at desc
      limit 200`,
    [status ?? null],
  );
}

export type AuditEntry = {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  admin_name: string;
};

export async function listAuditLog(limit = 100): Promise<AuditEntry[]> {
  const db = await getDb();
  return db.query<AuditEntry>(
    `select a.id, a.action, a.target_type, a.target_id, a.metadata, a.created_at,
            u.full_name as admin_name
       from admin_actions a
       join users u on u.id = a.admin_id
      order by a.created_at desc
      limit $1`,
    [limit],
  );
}

/** Appends to the audit trail. Called by every admin mutation. */
export async function recordAdminAction(input: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = await getDb();
  await db.query(
    `insert into admin_actions (admin_id, action, target_type, target_id, metadata)
     values ($1, $2, $3, $4, $5)`,
    [
      input.adminId,
      input.action,
      input.targetType,
      input.targetId,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

export async function getUserDetail(userId: string) {
  const db = await getDb();
  const [user] = await db.query<AdminUser & { phone: string | null; postcode: string | null }>(
    `select u.id, u.email, u.full_name, u.role, u.status, u.phone, u.postcode,
            u.postcode_outward, u.created_at, u.suspended_reason,
            p.verification_status,
            (select count(*)::int from jobs j where j.customer_id = u.id) as job_count
       from users u
       left join tradesperson_profiles p on p.user_id = u.id
      where u.id = $1`,
    [userId],
  );
  return user ?? null;
}
