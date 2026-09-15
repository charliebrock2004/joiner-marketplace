import { handleSubmission } from "@/lib/api/submission-handler";
import { joinerSubmissionSchema } from "@/lib/validation/joiner";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleSubmission(request, {
    kind: "joiner",
    schema: joinerSubmissionSchema,
    arrayFields: ["skills", "availability"],
  });
}
