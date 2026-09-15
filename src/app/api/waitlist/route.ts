import { handleSubmission } from "@/lib/api/submission-handler";
import { waitlistSubmissionSchema } from "@/lib/validation/waitlist";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleSubmission(request, { kind: "waitlist", schema: waitlistSubmissionSchema });
}
