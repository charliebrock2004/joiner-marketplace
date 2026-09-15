import { z } from "zod";
import { jobCategoryValues } from "@/lib/content/categories";
import {
  consentSchema,
  emailSchema,
  honeypotSchema,
  nameSchema,
  phoneSchema,
  postcodeSchema,
  shortText,
} from "./shared";

/**
 * Experience level is the backbone of the trust model. A worker is never
 * simply "a joiner" — the level they declare is what the platform will show,
 * and later verify.
 */
export const experienceLevels = [
  {
    value: "apprentice",
    label: "Apprentice / trainee",
    blurb: "Currently training or in the early stages of an apprenticeship",
  },
  {
    value: "qualified",
    label: "Qualified joiner",
    blurb: "Time served or holding a recognised joinery qualification",
  },
  {
    value: "experienced",
    label: "Experienced tradesperson",
    blurb: "Years on the tools, working for yourself or running a squad",
  },
  {
    value: "other",
    label: "Other skilled worker",
    blurb: "Related trade or handy with joinery work without formal training",
  },
] as const;

export const availabilityOptions = [
  { value: "evenings", label: "Evenings" },
  { value: "weekends", label: "Weekends" },
  { value: "weekdays", label: "Weekdays" },
  { value: "occasional", label: "Occasional / between jobs" },
  { value: "full-time", label: "Full time" },
] as const;

export const radiusOptions = [
  { value: "5", label: "Up to 5 miles" },
  { value: "10", label: "Up to 10 miles" },
  { value: "20", label: "Up to 20 miles" },
  { value: "30", label: "Up to 30 miles" },
  { value: "50", label: "50+ miles" },
] as const;

const asValues = <T extends readonly { value: string }[]>(options: T) =>
  options.map((option) => option.value) as [string, ...string[]];

export const joinerSubmissionSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  postcode: postcodeSchema,
  experienceLevel: z.enum(asValues(experienceLevels), {
    error: "Tell us your experience level",
  }),
  yearsExperience: z.coerce
    .number({ error: "Enter a number" })
    .int()
    .min(0)
    .max(60, "Enter a realistic number of years"),
  /** Self-declared only. Never rendered as a verified credential. */
  qualifications: shortText(0, 300, "Qualifications").optional().or(z.literal("")),
  skills: z
    .array(z.enum(jobCategoryValues as [string, ...string[]]))
    .min(1, "Choose at least one type of work"),
  availability: z
    .array(z.enum(asValues(availabilityOptions)))
    .min(1, "Tell us roughly when you're available"),
  radiusMiles: z.enum(asValues(radiusOptions)).default("20"),
  /**
   * Optional social proof while we have no reviews of our own.
   *
   * The scheme is restricted to http/https: a bare URL check accepts
   * `javascript:` and `data:` URLs, which would become an XSS vector the
   * moment this link is rendered on a profile.
   */
  profileUrl: z
    .union([
      z
        .url({ protocol: /^https?$/, hostname: /.+/, error: "Enter a full link starting with https://" })
        .max(300),
      z.literal(""),
    ])
    .optional(),
  about: shortText(20, 1200, "About you"),
  consent: consentSchema,
  website: honeypotSchema,
});

export type JoinerSubmission = z.infer<typeof joinerSubmissionSchema>;
