"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeReturnTo } from "@/lib/auth/guards.ts";
import { hashPassword, verifyPassword } from "@/lib/auth/password.ts";
import { createSession, destroySession } from "@/lib/auth/session.ts";
import { createUser, findUserByEmail } from "@/lib/db/queries/users.ts";
import { rateLimit } from "@/lib/security/rate-limit.ts";
import { loginSchema, signupSchema } from "@/lib/validation/auth.ts";
import { toFieldErrors } from "@/lib/validation/shared.ts";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

async function requestContext() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return {
    ip: forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown",
    userAgent: headerList.get("user-agent") ?? undefined,
  };
}

/** Field values echoed back on error so the form does not empty itself. */
function echo(formData: FormData, keys: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

/**
 * A hash of a throwaway password, verified when an email is unknown so that a
 * failed login costs the same time whether or not the account exists. Without
 * this, response timing tells an attacker which emails are registered.
 */
let decoyHash: Promise<string> | null = null;
function getDecoyHash(): Promise<string> {
  decoyHash ??= hashPassword("tradezy-decoy-password-value");
  return decoyHash;
}

export async function signupAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { ip, userAgent } = await requestContext();
  const limit = rateLimit(`signup:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Too many attempts from this connection. Please try again shortly." };
  }

  const values = echo(formData, ["fullName", "email", "phone", "postcode", "role"]);
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    postcode: formData.get("postcode"),
    password: formData.get("password"),
    role: formData.get("role"),
    terms: formData.get("terms") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error), values };
  }

  const result = await createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    role: parsed.data.role,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    postcode: parsed.data.postcode,
  });

  if ("error" in result) {
    return {
      error: "An account already exists with that email address.",
      fieldErrors: { email: "That email is already registered. Try signing in instead." },
      values,
    };
  }

  await createSession(result.id, userAgent);

  const next = safeReturnTo(formData.get("next")?.toString());
  redirect(next ?? (parsed.data.role === "customer" ? "/dashboard" : "/dashboard/profile"));
}

export async function loginAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { ip, userAgent } = await requestContext();
  const values = echo(formData, ["email"]);

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error), values };
  }

  // Limit per IP and per account, so one attacker cannot lock out an inbox by
  // hammering it, and one IP cannot spray many accounts.
  const ipLimit = rateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000);
  const accountLimit = rateLimit(`login:acct:${parsed.data.email}`, 8, 15 * 60 * 1000);
  if (!ipLimit.ok || !accountLimit.ok) {
    return { error: "Too many sign-in attempts. Please wait a few minutes and try again.", values };
  }

  const user = await findUserByEmail(parsed.data.email);

  // Always do the work, so timing does not reveal whether the email exists.
  const passwordOk = user
    ? await verifyPassword(parsed.data.password, user.password_hash)
    : await verifyPassword(parsed.data.password, await getDecoyHash());

  // One message for every failure mode: wrong email, wrong password, or an
  // account that is not usable. Anything more specific is an account oracle.
  if (!user || !passwordOk) {
    return { error: "Email or password is incorrect.", values };
  }

  if (user.status === "suspended") {
    return {
      error: "This account has been suspended. Email us if you think that is a mistake.",
      values,
    };
  }
  if (user.status !== "active") {
    return { error: "Email or password is incorrect.", values };
  }

  await createSession(user.id, userAgent);

  const next = safeReturnTo(formData.get("next")?.toString());
  redirect(next ?? (user.role === "admin" ? "/admin" : "/dashboard"));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
