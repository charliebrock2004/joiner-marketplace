import "server-only";

import { getDb } from "../client.ts";

/**
 * Tradesperson profiles.
 *
 * verification_status is never writable from here — only the admin module can
 * change it. That separation is deliberate: "verified" must mean an admin
 * actually checked something.
 */

export type TradespersonProfile = {
  id: string;
  user_id: string;
  full_name: string;
  postcode_outward: string | null;
  primary_trade_id: string | null;
  trade_name: string | null;
  trade_slug: string | null;
  experience_level: "apprentice" | "qualified" | "experienced" | "other";
  years_experience: number;
  radius_miles: number;
  about: string | null;
  qualifications: string | null;
  profile_photo_url: string | null;
  verification_status: "unverified" | "pending" | "verified" | "rejected";
  accepting_work: boolean;
};

export type PublicTradesperson = TradespersonProfile & {
  average_rating: number | null;
  review_count: number;
  jobs_completed: number;
  skills: { id: string; name: string }[];
  availability: string[];
  portfolio: { id: string; url: string; caption: string | null }[];
};

const PROFILE_COLUMNS = `
  p.id, p.user_id, u.full_name, u.postcode_outward,
  p.primary_trade_id, t.name as trade_name, t.slug as trade_slug,
  p.experience_level, p.years_experience, p.radius_miles, p.about,
  p.qualifications, p.profile_photo_url, p.verification_status, p.accepting_work
`;

export async function getProfileByUserId(userId: string): Promise<TradespersonProfile | null> {
  const db = await getDb();
  const [row] = await db.query<TradespersonProfile>(
    `select ${PROFILE_COLUMNS}
       from tradesperson_profiles p
       join users u on u.id = p.user_id
       left join trades t on t.id = p.primary_trade_id
      where p.user_id = $1`,
    [userId],
  );
  return row ?? null;
}

/** The public profile. Contact details are never selected. */
export async function getPublicProfile(userId: string): Promise<PublicTradesperson | null> {
  const db = await getDb();
  const [row] = await db.query<PublicTradesperson>(
    `select ${PROFILE_COLUMNS},
            (select round(avg(r.rating), 1) from reviews r
              where r.subject_id = u.id and r.status = 'published') as average_rating,
            (select count(*)::int from reviews r
              where r.subject_id = u.id and r.status = 'published') as review_count,
            (select count(*)::int from jobs j
              where j.accepted_tradesperson_id = u.id and j.status = 'completed') as jobs_completed
       from tradesperson_profiles p
       join users u on u.id = p.user_id
       left join trades t on t.id = p.primary_trade_id
      where p.user_id = $1 and u.status = 'active'`,
    [userId],
  );
  if (!row) return null;

  row.skills = await db.query(
    `select c.id, c.name from tradesperson_skills s
       join job_categories c on c.id = s.category_id
      where s.profile_id = $1 order by c.sort_order`,
    [row.id],
  );
  const slots = await db.query<{ slot: string }>(
    "select slot from tradesperson_availability where profile_id = $1",
    [row.id],
  );
  row.availability = slots.map((s) => s.slot);
  row.portfolio = await db.query(
    "select id, url, caption from portfolio_photos where profile_id = $1 order by sort_order",
    [row.id],
  );
  return row;
}

export type UpdateProfileInput = {
  primaryTradeId: string;
  experienceLevel: string;
  yearsExperience: number;
  radiusMiles: number;
  about: string;
  qualifications: string | null;
  acceptingWork: boolean;
  skillIds: string[];
  availability: string[];
};

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [profile] = await tx.query<{ id: string }>(
      `update tradesperson_profiles
          set primary_trade_id = $2, experience_level = $3, years_experience = $4,
              radius_miles = $5, about = $6, qualifications = $7, accepting_work = $8,
              updated_at = now()
        where user_id = $1
        returning id`,
      [
        userId,
        input.primaryTradeId,
        input.experienceLevel,
        input.yearsExperience,
        input.radiusMiles,
        input.about,
        input.qualifications,
        input.acceptingWork,
      ],
    );
    if (!profile) throw new Error("Profile not found");

    await tx.query("delete from tradesperson_skills where profile_id = $1", [profile.id]);
    for (const skillId of input.skillIds) {
      await tx.query(
        `insert into tradesperson_skills (profile_id, category_id)
         select $1, $2 where exists (select 1 from job_categories where id = $2)`,
        [profile.id, skillId],
      );
    }

    await tx.query("delete from tradesperson_availability where profile_id = $1", [profile.id]);
    for (const slot of input.availability) {
      await tx.query(
        "insert into tradesperson_availability (profile_id, slot) values ($1, $2) on conflict do nothing",
        [profile.id, slot],
      );
    }
  });
}

export async function setProfilePhoto(userId: string, url: string): Promise<void> {
  const db = await getDb();
  await db.query(
    "update tradesperson_profiles set profile_photo_url = $2, updated_at = now() where user_id = $1",
    [userId, url],
  );
}

export async function addPortfolioPhotos(userId: string, urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  const db = await getDb();
  const [profile] = await db.query<{ id: string; count: string }>(
    `select p.id, (select count(*) from portfolio_photos where profile_id = p.id) as count
       from tradesperson_profiles p where p.user_id = $1`,
    [userId],
  );
  if (!profile) return;
  let order = Number(profile.count);
  for (const url of urls) {
    await db.query(
      "insert into portfolio_photos (profile_id, url, sort_order) values ($1, $2, $3)",
      [profile.id, url, order++],
    );
  }
}

/** Scoped by owner so a guessed photo id cannot delete someone else's work. */
export async function deletePortfolioPhoto(userId: string, photoId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.query(
    `delete from portfolio_photos
      where id = $1
        and profile_id = (select id from tradesperson_profiles where user_id = $2)
      returning id`,
    [photoId, userId],
  );
  return rows.length > 0;
}

/** Trades a tradesperson works in — primary plus any extras. */
export async function getTradeIdsForProfile(profileId: string, primaryTradeId: string | null): Promise<string[]> {
  const db = await getDb();
  const extra = await db.query<{ trade_id: string }>(
    "select trade_id from tradesperson_trades where profile_id = $1",
    [profileId],
  );
  const ids = new Set(extra.map((r) => r.trade_id));
  if (primaryTradeId) ids.add(primaryTradeId);
  return [...ids];
}
