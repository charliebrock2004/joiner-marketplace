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

export const budgetOptions = [
  { value: "unsure", label: "Not sure yet" },
  { value: "under-100", label: "Under £100" },
  { value: "100-250", label: "£100 – £250" },
  { value: "250-500", label: "£250 – £500" },
  { value: "500-1000", label: "£500 – £1,000" },
  { value: "over-1000", label: "Over £1,000" },
] as const;

export const timingOptions = [
  { value: "asap", label: "As soon as possible" },
  { value: "this-week", label: "This week" },
  { value: "next-2-weeks", label: "Next couple of weeks" },
  { value: "this-month", label: "Within a month" },
  { value: "flexible", label: "I'm flexible" },
] as const;

const asValues = <T extends readonly { value: string }[]>(options: T) =>
  options.map((option) => option.value) as [string, ...string[]];

export const jobSubmissionSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  postcode: postcodeSchema,
  category: z.enum(jobCategoryValues as [string, ...string[]], {
    error: "Choose the type of job",
  }),
  description: shortText(20, 2000, "Description"),
  budget: z.enum(asValues(budgetOptions)).default("unsure"),
  timing: z.enum(asValues(timingOptions)).default("flexible"),
  /** Free text — people write "after the 12th", not a date. */
  preferredDate: shortText(0, 120, "Preferred date").optional().or(z.literal("")),
  consent: consentSchema,
  website: honeypotSchema,
});

export type JobSubmission = z.infer<typeof jobSubmissionSchema>;
