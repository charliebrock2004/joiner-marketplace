"use client";

import { useActionState, useState } from "react";
import { createReportAction, type ActionState } from "@/lib/actions/marketplace.ts";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { reportReasons } from "@/lib/validation/marketplace.ts";

const initial: ActionState = {};

/**
 * Reporting is available on jobs, users, messages and reviews. It is
 * deliberately low-friction: a reason and optional detail, nothing else.
 */
export function ReportButton({
  targetType,
  targetId,
  label = "Report",
}: {
  targetType: "user" | "job" | "message" | "review";
  targetId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createReportAction, initial);

  if (state.success) {
    return (
      <p role="status" className="text-sm text-muted">
        {state.success}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        {label}
      </button>
    );
  }

  return (
    <form action={action} className="max-w-md space-y-4 rounded-2xl border border-line bg-white p-5">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <h2 className="font-semibold text-ink">{label}</h2>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Field label="What's the problem?" error={state.fieldErrors?.reason}>
        {({ id, describedBy, invalid }) => (
          <Select id={id} name="reason" aria-describedby={describedBy} aria-invalid={invalid} required>
            <option value="">Choose a reason</option>
            {reportReasons.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Anything else?" optional error={state.fieldErrors?.details}>
        {({ id, describedBy, invalid }) => (
          <Textarea id={id} name="details" aria-describedby={describedBy} aria-invalid={invalid} maxLength={1000} className="min-h-24" />
        )}
      </Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send report"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
