import { z } from "zod";

/**
 * Primitives reused by every form. Defined once so the client-side hints and
 * the server-side enforcement can never disagree.
 */

/** Trim, collapse whitespace, and strip control characters. */
const clean = (value: unknown) =>
  typeof value === "string"
    ? value
        .replace(/[\p{Cc}\p{Cf}]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
    : value;

export const shortText = (min: number, max: number, label: string) =>
  z.preprocess(
    clean,
    z.string().min(min, `${label} is required`).max(max, `${label} is too long`),
  );

export const nameSchema = shortText(2, 80, "Name");

export const emailSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.email("Enter a valid email address").max(180),
);

/**
 * UK phone numbers, accepting the formats people actually type. Stored
 * normalised (digits and an optional leading +) so duplicates are easy to
 * spot later.
 */
export const phoneSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[\s()-]/g, "") : v),
  z.string().regex(/^(\+44\d{9,10}|0\d{9,10})$/, "Enter a valid UK phone number"),
);

/** Full or partial UK postcode — we only need enough to locate the job. */
export const postcodeSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.toUpperCase().replace(/\s+/g, " ").trim() : v),
  z
    .string()
    .min(2, "Enter your postcode")
    .max(9)
    .regex(/^[A-Z]{1,2}\d{1,2}[A-Z]?( ?\d[A-Z]{2})?$/, "Enter a valid UK postcode"),
);

/**
 * Consent checkbox. An unticked box is simply absent from the form data, so
 * `undefined` has to resolve to `false` rather than failing as a type error —
 * otherwise the visitor gets "Invalid input" instead of a useful message.
 */
export const consentSchema = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true")
  .refine((v) => v, "Please tick the box so we can contact you");

/**
 * Honeypot. Real users never see this field; bots fill everything in, so any
 * value at all means we drop the submission.
 */
export const honeypotSchema = z.string().max(0, "Rejected").optional();

export type FieldErrors = Record<string, string>;

/** Flatten a Zod error into a `{ fieldName: firstMessage }` map for the UI. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
