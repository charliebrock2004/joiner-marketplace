"use client";

import { useActionState } from "react";
import { changeJobStatusAction, type JobFormState } from "@/lib/actions/jobs.ts";
import { acceptApplicationAction, type ActionState } from "@/lib/actions/marketplace.ts";
import { Button } from "@/components/ui/Button";

const initialJob: JobFormState = {};
const initialAction: ActionState = {};

/** Customer-side status controls. The server re-checks every transition. */
export function JobStatusActions({ jobId, status }: { jobId: string; status: string }) {
  const [state, action, pending] = useActionState(changeJobStatusAction, initialJob);

  const options: { to: string; label: string; variant?: "primary" | "secondary" }[] = [];
  if (status === "accepted") options.push({ to: "in_progress", label: "Mark as started" });
  if (status === "in_progress") options.push({ to: "completed", label: "Mark as complete" });
  if (["draft", "open", "applications", "accepted", "in_progress"].includes(status)) {
    options.push({ to: "cancelled", label: "Cancel job", variant: "secondary" });
  }

  if (options.length === 0) return null;

  return (
    <div className="space-y-2">
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <form key={option.to} action={action}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="status" value={option.to} />
            <Button type="submit" variant={option.variant ?? "primary"} disabled={pending}>
              {option.label}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}

export function AcceptApplicantButton({ applicationId }: { applicationId: string }) {
  const [state, action, pending] = useActionState(acceptApplicationAction, initialAction);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Choosing…" : "Choose this person"}
      </Button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
