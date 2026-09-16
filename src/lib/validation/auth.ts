import { z } from "zod";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/constants.ts";
import { emailSchema, nameSchema, phoneSchema, postcodeSchema } from "./shared.ts";

/**
 * Passwords: a length floor rather than a composition rule.
 *
 * Forced symbol/digit rules push people towards "Password1!" and are worse in
 * practice than simply requiring length. Ten characters with a check against
 * the handful of passwords that dominate credential-stuffing lists is a better
 * trade, and it keeps the signup form short — which matters when most traffic
 * arrives from a phone.
 */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890",
  "qwertyuiop", "letmein123", "iloveyou1", "welcome123", "admin123", "tradezy123",
]);

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, "That password is too long")
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), "That password is too easy to guess");

export const signupSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  postcode: postcodeSchema,
  password: passwordSchema,
  role: z.enum(["customer", "tradesperson"], { error: "Choose how you want to use Tradezy" }),
  terms: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === "on" || v === "true")
    .refine((v) => v, "Please accept the terms to continue"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  // Deliberately only a presence check: an existing account may predate any
  // rule change, and telling an attacker that a password failed a format rule
  // is information we do not need to give away.
  password: z.string().min(1, "Enter your password").max(MAX_PASSWORD_LENGTH),
});

export type LoginInput = z.infer<typeof loginSchema>;
