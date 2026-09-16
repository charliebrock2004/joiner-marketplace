import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client.ts";

/**
 * Session management.
 *
 * Sessions are opaque 256-bit random tokens looked up in the database. Only a
 * SHA-256 hash of the token is stored, so a database leak does not hand out
 * live sessions. There is no signing secret to manage because the token
 * carries no claims — it is unguessable and every lookup hits the database,
 * which also means a suspended user loses access immediately rather than at
 * token expiry.
 *
 * CSRF: the cookie is SameSite=Lax, so it is not sent on cross-site POSTs.
 * Server Actions additionally compare Origin against Host.
 */

export const SESSION_COOKIE = "tz_session";
const SESSION_TTL_DAYS = 30;
/** Rewrite last_used_at at most this often, to avoid a write per request. */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  email: string;
  role: "customer" | "tradesperson" | "admin";
  fullName: string;
  phone: string | null;
  postcode: string | null;
  postcodeOutward: string | null;
  status: "active" | "suspended" | "deleted";
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a session row and sets the cookie. Must be called from a Server
 * Action or Route Handler — cookies cannot be written during render.
 */
export async function createSession(userId: string, userAgent?: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const db = await getDb();
  await db.query(
    `insert into sessions (user_id, token_hash, expires_at, user_agent)
     values ($1, $2, $3, $4)`,
    [userId, hashToken(token), expiresAt, userAgent?.slice(0, 200) ?? null],
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

type SessionRow = {
  session_id: string;
  last_used_at: Date | string;
  id: string;
  email: string;
  role: SessionUser["role"];
  full_name: string;
  phone: string | null;
  postcode: string | null;
  postcode_outward: string | null;
  status: SessionUser["status"];
};

/**
 * Resolves the signed-in user, or null.
 *
 * A suspended or deleted user resolves to null even with a valid session, so
 * suspension takes effect on the very next request.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const [row] = await db.query<SessionRow>(
    `select s.id as session_id, s.last_used_at,
            u.id, u.email, u.role, u.full_name, u.phone, u.postcode,
            u.postcode_outward, u.status
       from sessions s
       join users u on u.id = s.user_id
      where s.token_hash = $1
        and s.expires_at > now()`,
    [hashToken(token)],
  );

  if (!row || row.status !== "active") return null;

  // Keep the session warm without writing on every single request.
  const lastUsed = new Date(row.last_used_at).getTime();
  if (Date.now() - lastUsed > TOUCH_INTERVAL_MS) {
    await db
      .query("update sessions set last_used_at = now() where id = $1", [row.session_id])
      .catch(() => {});
  }

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    postcode: row.postcode,
    postcodeOutward: row.postcode_outward,
    status: row.status,
  };
}

/** Deletes the current session server-side and clears the cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    const db = await getDb();
    await db.query("delete from sessions where token_hash = $1", [hashToken(token)]);
  }

  store.delete(SESSION_COOKIE);
}

/** Invalidates every session for a user — used when suspending an account. */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  const db = await getDb();
  await db.query("delete from sessions where user_id = $1", [userId]);
}

/** Housekeeping for expired rows. Safe to call from a scheduled job. */
export async function purgeExpiredSessions(): Promise<number> {
  const db = await getDb();
  const rows = await db.query<{ id: string }>(
    "delete from sessions where expires_at < now() returning id",
  );
  return rows.length;
}

/**
 * Constant-time string comparison, for comparing opaque values where a timing
 * signal would leak information.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
