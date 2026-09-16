"use client";

import { useActionState, useState } from "react";
import { createReviewAction, type ActionState } from "@/lib/actions/marketplace.ts";
import { FormError } from "@/components/forms/FormStatus";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

const initial: ActionState = {};

function StarPicker({
  name,
  label,
  hint,
  value,
  onChange,
  required,
}: {
  name: string;
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-ink">
        {label}
        {!required && <span className="ml-1.5 font-normal text-muted">(optional)</span>}
      </span>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <input type="hidden" name={name} value={value || ""} />
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => onChange(value === star ? 0 : star)}
            className="rounded-full p-1"
          >
            <Icon
              name="star"
              filled={star <= value}
              className={cn("size-7", star <= value ? "text-accent" : "text-line-strong")}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewForm({
  jobId,
  jobTitle,
  tradespersonName,
}: {
  jobId: string;
  jobTitle: string;
  tradespersonName: string;
}) {
  const [state, action, pending] = useActionState(createReviewAction, initial);
  const [rating, setRating] = useState(0);
  const [quality, setQuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [reliability, setReliability] = useState(0);

  if (state.success) {
    return (
      <div role="status" className="rounded-2xl border border-brand/20 bg-brand-soft p-5 text-sm text-brand-ink">
        <p className="font-semibold">{state.success}</p>
        <p className="mt-1">Thanks — reviews are how good tradespeople get more work.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6 rounded-2xl border border-line bg-white p-6">
      <input type="hidden" name="jobId" value={jobId} />
      <div>
        <h2 className="font-semibold text-ink">{tradespersonName}</h2>
        <p className="mt-0.5 text-sm text-muted">{jobTitle}</p>
      </div>

      {state.error && <FormError message={state.error} />}

      <StarPicker
        name="rating"
        label="Overall rating"
        value={rating}
        onChange={setRating}
        required
      />
      {state.fieldErrors?.rating && <p className="text-sm text-red-600">{state.fieldErrors.rating}</p>}

      <div className="grid gap-5 sm:grid-cols-3">
        <StarPicker name="quality" label="Quality" value={quality} onChange={setQuality} />
        <StarPicker name="communication" label="Communication" value={communication} onChange={setCommunication} />
        <StarPicker name="reliability" label="Reliability" value={reliability} onChange={setReliability} />
      </div>

      <Field label="Your review" optional error={state.fieldErrors?.body}>
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            name="body"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            maxLength={2000}
            placeholder="How did the job go?"
          />
        )}
      </Field>

      <Button type="submit" disabled={pending || rating === 0}>
        {pending ? "Publishing…" : "Publish review"}
      </Button>
    </form>
  );
}
