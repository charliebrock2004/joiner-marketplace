"use client";

import { useActionState } from "react";
import { applyToJobAction, type ActionState } from "@/lib/actions/marketplace.ts";
import { FormError } from "@/components/forms/FormStatus";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";

const initial: ActionState = {};

export function ApplyForm({ jobId }: { jobId: string }) {
  const [state, action, pending] = useActionState(applyToJobAction, initial);

  if (state.success) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand-soft p-5">
        <Icon name="check" className="mt-0.5 size-5 shrink-0 text-brand" />
        <div className="text-sm leading-relaxed text-brand-ink">
          <p className="font-semibold">Interest sent.</p>
          <p className="mt-1">
            The customer can see your profile and will be in touch if they pick you. You&apos;ll get a
            message here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="jobId" value={jobId} />
      {state.error && <FormError message={state.error} />}

      <fieldset className="space-y-5" disabled={pending}>
        <legend className="sr-only">Apply for this job</legend>

        <Field
          label="Message to the customer"
          optional
          hint="A line or two on how you'd tackle it and when you could do it."
          error={state.fieldErrors?.message}
        >
          {({ id, describedBy, invalid }) => (
            <Textarea id={id} name="message" aria-describedby={describedBy} aria-invalid={invalid} maxLength={1000} />
          )}
        </Field>

        <Field
          label="Rough estimate (£)"
          optional
          hint="A guide only — you can agree the final price after speaking."
          error={state.fieldErrors?.quoteAmount}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="quoteAmount"
              type="number"
              inputMode="decimal"
              min={0}
              max={100000}
              step="1"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              placeholder="150"
            />
          )}
        </Field>
      </fieldset>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "I'm interested"}
      </Button>
    </form>
  );
}
