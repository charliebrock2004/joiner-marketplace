import { z } from "zod";
import { postcodeSchema, shortText } from "./shared.ts";

/** A UUID that came from a form. Rejects anything that is not one. */
export const idSchema = z.uuid("Something went wrong — please try again");

export const budgetBands = [
  { value: "unsure", label: "Not sure yet" },
  { value: "under-100", label: "Under £100" },
  { value: "100-250", label: "£100 – £250" },
  { value: "250-500", label: "£250 – £500" },
  { value: "500-1000", label: "£500 – £1,000" },
  { value: "over-1000", label: "Over £1,000" },
] as const;

export const timings = [
  { value: "asap", label: "As soon as possible" },
  { value: "this-week", label: "This week" },
  { value: "next-2-weeks", label: "Next couple of weeks" },
  { value: "this-month", label: "Within a month" },
  { value: "flexible", label: "I'm flexible" },
] as const;

export const experienceLevels = [
  { value: "apprentice", label: "Apprentice / trainee", blurb: "Training, or early in an apprenticeship" },
  { value: "qualified", label: "Qualified", blurb: "Time served or formally qualified in your trade" },
  { value: "experienced", label: "Experienced tradesperson", blurb: "Years on the tools, self-employed or running a squad" },
  { value: "other", label: "Other skilled worker", blurb: "Related trade, or skilled without formal training" },
] as const;

export const availabilitySlots = [
  { value: "weekdays", label: "Weekdays" },
  { value: "evenings", label: "Evenings" },
  { value: "weekends", label: "Weekends" },
  { value: "occasional", label: "Occasional / between jobs" },
  { value: "full_time", label: "Full time" },
] as const;

export const radiusOptions = [
  { value: "5", label: "Up to 5 miles" },
  { value: "10", label: "Up to 10 miles" },
  { value: "20", label: "Up to 20 miles" },
  { value: "30", label: "Up to 30 miles" },
  { value: "50", label: "50+ miles" },
] as const;

const values = <T extends readonly { value: string }[]>(options: T) =>
  options.map((o) => o.value) as [string, ...string[]];

/* -------------------------------------------------------------------- job -- */

export const jobSchema = z.object({
  title: shortText(6, 120, "Title"),
  tradeId: idSchema,
  categoryId: z.union([idSchema, z.literal("")]).optional(),
  description: shortText(20, 4000, "Description"),
  postcode: postcodeSchema,
  budgetBand: z.enum(values(budgetBands)).default("unsure"),
  timing: z.enum(values(timings)).default("flexible"),
  preferredDate: shortText(0, 120, "Preferred date").optional().or(z.literal("")),
});

export type JobInput = z.infer<typeof jobSchema>;

export const jobStatusChangeSchema = z.object({
  jobId: idSchema,
  status: z.enum(["open", "in_progress", "completed", "cancelled"]),
});

/* ---------------------------------------------------------------- profile -- */

export const profileSchema = z.object({
  primaryTradeId: idSchema,
  experienceLevel: z.enum(values(experienceLevels), { error: "Tell customers your experience level" }),
  yearsExperience: z.coerce
    .number({ error: "Enter a number" })
    .int()
    .min(0)
    .max(60, "Enter a realistic number of years"),
  radiusMiles: z.coerce.number().int().min(1).max(100),
  about: shortText(20, 2000, "About you"),
  qualifications: shortText(0, 300, "Qualifications").optional().or(z.literal("")),
  acceptingWork: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === "on" || v === "true"),
  skillIds: z.array(idSchema).min(1, "Choose at least one type of work"),
  availability: z.array(z.enum(values(availabilitySlots))).min(1, "Tell us roughly when you're available"),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/* ----------------------------------------------------------- application -- */

export const applicationSchema = z.object({
  jobId: idSchema,
  message: shortText(0, 1000, "Message").optional().or(z.literal("")),
  quoteAmount: z
    .union([z.literal(""), z.coerce.number().min(0, "Enter a positive amount").max(100000)])
    .optional(),
});

/* -------------------------------------------------------------- messages -- */

export const messageSchema = z.object({
  conversationId: idSchema,
  body: shortText(1, 2000, "Message"),
});

/* --------------------------------------------------------------- reviews -- */

const star = z.coerce.number().int().min(1, "Choose a rating").max(5);
const optionalStar = z
  .union([z.literal(""), star])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : Number(v)));

export const reviewSchema = z.object({
  jobId: idSchema,
  rating: star,
  quality: optionalStar,
  communication: optionalStar,
  reliability: optionalStar,
  body: shortText(0, 2000, "Review").optional().or(z.literal("")),
});

/* --------------------------------------------------------------- reports -- */

export const reportReasons = [
  { value: "spam", label: "Spam or advertising" },
  { value: "abuse", label: "Abusive or offensive" },
  { value: "scam", label: "Scam or fraud" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "not_as_described", label: "Not as described" },
  { value: "safety", label: "Safety concern" },
  { value: "other", label: "Something else" },
] as const;

export const reportSchema = z.object({
  targetType: z.enum(["user", "job", "message", "review"]),
  targetId: idSchema,
  reason: z.enum(values(reportReasons), { error: "Choose a reason" }),
  details: shortText(0, 1000, "Details").optional().or(z.literal("")),
});
