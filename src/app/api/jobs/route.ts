import { handleSubmission } from "@/lib/api/submission-handler";
import { validateImageUploads } from "@/lib/security/uploads";
import { jobSubmissionSchema } from "@/lib/validation/job";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleSubmission(request, {
    kind: "job",
    schema: jobSubmissionSchema,
    handleFiles: validateImageUploads,
  });
}
