"use client";

import { useActionState, useState } from "react";
import {
  moderateReviewAction,
  removeJobAction,
  reinstateUserAction,
  resolveReportAction,
  restoreJobAction,
  setVerificationAction,
  suspendUserAction,
  type AdminActionState,
} from "@/lib/actions/admin.ts";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";

const initial: AdminActionState = {};

function Feedback({ state }: { state: AdminActionState }) {
  if (state.error) return <p className="mt-1 text-sm text-red-600">{state.error}</p>;
  if (state.success) return <p role="status" className="mt-1 text-sm text-brand">{state.success}</p>;
  return null;
}

export function SuspendUser({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(suspendUserAction, initial);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <>
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          Suspend
        </Button>
        <Feedback state={state} />
      </>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Input name="reason" placeholder="Reason for suspension" required maxLength={300} className="max-w-xs" />
      <Button type="submit" disabled={pending}>{pending ? "Suspending…" : "Confirm"}</Button>
      <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      <Feedback state={state} />
    </form>
  );
}

export function ReinstateUser({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(reinstateUserAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Reinstating…" : "Reinstate"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function VerificationControl({ userId, current }: { userId: string; current: string }) {
  const [state, action, pending] = useActionState(setVerificationAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Select name="status" defaultValue={current} className="max-w-[11rem]" aria-label="Verification status">
        <option value="unverified">Unverified</option>
        <option value="pending">Pending review</option>
        <option value="verified">Verified</option>
        <option value="rejected">Rejected</option>
      </Select>
      <Input name="notes" placeholder="Notes (optional)" maxLength={500} className="max-w-xs" />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      <Feedback state={state} />
    </form>
  );
}

export function RemoveJob({ jobId, removed }: { jobId: string; removed: boolean }) {
  const [state, action, pending] = useActionState(removeJobAction, initial);
  const [restoreState, restoreAction, restorePending] = useActionState(restoreJobAction, initial);
  const [open, setOpen] = useState(false);

  if (removed) {
    return (
      <form action={restoreAction}>
        <input type="hidden" name="jobId" value={jobId} />
        <Button type="submit" variant="secondary" disabled={restorePending}>
          {restorePending ? "Restoring…" : "Restore"}
        </Button>
        <Feedback state={restoreState} />
      </form>
    );
  }

  if (!open) {
    return (
      <>
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>Remove</Button>
        <Feedback state={state} />
      </>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="jobId" value={jobId} />
      <Input name="reason" placeholder="Reason" required maxLength={300} className="max-w-xs" />
      <Button type="submit" disabled={pending}>{pending ? "Removing…" : "Confirm"}</Button>
      <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      <Feedback state={state} />
    </form>
  );
}

export function ModerateReview({ reviewId, current }: { reviewId: string; current: string }) {
  const [state, action, pending] = useActionState(moderateReviewAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <Select name="status" defaultValue={current} className="max-w-[9rem]" aria-label="Review status">
        <option value="published">Published</option>
        <option value="hidden">Hidden</option>
        <option value="removed">Removed</option>
      </Select>
      <Input name="reason" placeholder="Reason (optional)" maxLength={300} className="max-w-xs" />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      <Feedback state={state} />
    </form>
  );
}

export function ResolveReport({ reportId, current }: { reportId: string; current: string }) {
  const [state, action, pending] = useActionState(resolveReportAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="reportId" value={reportId} />
      <Select
        name="status"
        defaultValue={current === "open" ? "reviewing" : current}
        className="max-w-[9rem]"
        aria-label="Report status"
      >
        <option value="reviewing">Reviewing</option>
        <option value="resolved">Resolved</option>
        <option value="dismissed">Dismissed</option>
      </Select>
      <Input name="notes" placeholder="Notes (optional)" maxLength={500} className="max-w-xs" />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      <Feedback state={state} />
    </form>
  );
}
