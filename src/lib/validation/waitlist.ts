import { z } from "zod";
import { emailSchema, honeypotSchema, postcodeSchema } from "./shared";

export const waitlistRoles = [
  { value: "customer", label: "I need a job doing" },
  { value: "joiner", label: "I'm a joiner looking for work" },
] as const;

export const waitlistSubmissionSchema = z.object({
  email: emailSchema,
  postcode: postcodeSchema,
  role: z.enum(["customer", "joiner"], { error: "Let us know which you are" }),
  website: honeypotSchema,
});

export type WaitlistSubmission = z.infer<typeof waitlistSubmissionSchema>;
