import "server-only";

import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session.ts";

/**
 * Authorisation guards.
 *
 * These are the authorisation boundary. Hiding a link or a button is a UX
 * detail, never a control: every page, action and route handler that touches
 * protected data calls one of these first, and every query that reads a
 * user's own records is additionally scoped by owner id, so knowing a UUID is
 * not enough to reach someone else's data.
 *
 * Uses `redirect` rather than Next's `unauthorized()`/`forbidden()` helpers,
 * which are still experimental in this version and would need
 * `experimental.authInterrupts`.
 */

export type Role = SessionUser["role"];

/** Where to send someone after signing in. Only same-site paths are honoured. */
export function safeReturnTo(path: string | undefined | null): string | null {
  if (!path) return null;
  // Must be a site-relative path: rejects "//evil.com" and "https://evil.com".
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

function loginUrl(returnTo?: string): string {
  const safe = safeReturnTo(returnTo);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}

/** The signed-in user, or null. For pages that render differently when signed in. */
export async function currentUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

/** Requires any signed-in user. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(loginUrl(returnTo));
  return user;
}

/**
 * Requires one of the given roles. Admin is not implicitly granted the
 * customer or tradesperson roles — an admin browsing the site is still not a
 * customer, and conflating them would let admin tooling create marketplace
 * records that look like a real user's.
 */
export async function requireRole<R extends Role>(
  roles: R[],
  returnTo?: string,
): Promise<SessionUser & { role: R }> {
  const user = await requireUser(returnTo);
  if (!roles.includes(user.role as R)) redirect("/no-access");
  return user as SessionUser & { role: R };
}

export async function requireCustomer(returnTo?: string) {
  return requireRole(["customer"], returnTo);
}

export async function requireTradesperson(returnTo?: string) {
  return requireRole(["tradesperson"], returnTo);
}

export async function requireAdmin(returnTo?: string) {
  return requireRole(["admin"], returnTo);
}

/**
 * Non-throwing variant for Server Actions and route handlers, which return a
 * result object rather than triggering a navigation.
 */
export type ActionAuth =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string; status: 401 | 403 };

export async function authorise(...roles: Role[]): Promise<ActionAuth> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in to do that.", status: 401 };
  if (roles.length > 0 && !roles.includes(user.role)) {
    return { ok: false, error: "You do not have permission to do that.", status: 403 };
  }
  return { ok: true, user };
}
