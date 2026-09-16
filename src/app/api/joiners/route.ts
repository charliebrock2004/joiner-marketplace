/**
 * LEGACY lead-capture endpoint.
 *
 * Superseded by the real marketplace: customers now post jobs through an
 * account at /dashboard/jobs/new, which stores them in the database. This
 * route is kept working so any existing external integration (a Zapier hook,
 * a saved form) keeps functioning, but nothing on the site posts to it any
 * more. Submissions here do NOT enter the marketplace.
 */
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
