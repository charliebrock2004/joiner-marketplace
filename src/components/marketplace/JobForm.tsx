"use client";

import { useActionState, useMemo, useState } from "react";
import { createJobAction, type JobFormState } from "@/lib/actions/jobs.ts";
import { FormError } from "@/components/forms/FormStatus";
import { PhotoUpload } from "@/components/forms/PhotoUpload";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { OptionCards } from "@/components/ui/OptionCards";
import { budgetBands, timings } from "@/lib/validation/marketplace.ts";
import type { JobCategory, Trade } from "@/lib/db/queries/trades.ts";

const initial: JobFormState = {};

export function JobForm({
  trades,
  categories,
  defaultPostcode,
}: {
  trades: Trade[];
  categories: JobCategory[];
  defaultPostcode: string | null;
}) {
  const [state, action, pending] = useActionState(createJobAction, initial);
  const [tradeId, setTradeId] = useState<string[]>([trades[0]?.id ?? ""]);
  const [categoryId, setCategoryId] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);

  const selectedTrade = tradeId[0] ?? "";
  // Categories cascade from the chosen trade; the server re-checks the pair.
  const tradeCategories = useMemo(
    () => categories.filter((c) => c.trade_id === selectedTrade),
    [categories, selectedTrade],
  );

  return (
    <form
      action={(formData) => {
        formData.delete("photos");
        for (const photo of photos) formData.append("photos", photo);
        return action(formData);
      }}
      className="space-y-7"
    >
      {state.error && <FormError message={state.error} />}
      <input type="hidden" name="tradeId" value={selectedTrade} />
      {categoryId[0] && <input type="hidden" name="categoryId" value={categoryId[0]} />}

      <fieldset className="space-y-5" disabled={pending}>
        <legend className="sr-only">About the job</legend>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">What trade do you need?</span>
          <OptionCards
            name="tradeChoice"
            type="radio"
            options={trades.map((t) => ({ value: t.id, label: t.name, blurb: t.description ?? undefined }))}
            selected={tradeId}
            onChange={(next) => {
              setTradeId(next);
              setCategoryId([]);
            }}
            invalid={Boolean(state.fieldErrors?.tradeId)}
          />
          {state.fieldErrors?.tradeId && (
            <p className="text-sm text-red-600">{state.fieldErrors.tradeId}</p>
          )}
        </div>

        {tradeCategories.length > 0 && (
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-ink">
              What kind of job is it?{" "}
              <span className="font-normal text-muted">(optional)</span>
            </span>
            <OptionCards
              name="categoryChoice"
              type="radio"
              options={tradeCategories.map((c) => ({
                value: c.id,
                label: c.name,
                blurb: c.blurb ?? undefined,
              }))}
              selected={categoryId}
              onChange={setCategoryId}
            />
          </div>
        )}

        <Field
          label="Job title"
          hint="A short summary, e.g. 'Two internal doors need hung'."
          error={state.fieldErrors?.title}
        >
          {({ id, describedBy, invalid }) => (
            <Input id={id} name="title" aria-describedby={describedBy} aria-invalid={invalid} maxLength={120} required />
          )}
        </Field>

        <Field
          label="Describe the job"
          hint="Sizes, materials, access, whether you already have the parts — anything that saves a site visit."
          error={state.fieldErrors?.description}
        >
          {({ id, describedBy, invalid }) => (
            <Textarea id={id} name="description" aria-describedby={describedBy} aria-invalid={invalid} maxLength={4000} required />
          )}
        </Field>

        <PhotoUpload files={photos} onChange={setPhotos} error={state.fieldErrors?.photos} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Postcode"
            hint="Only the first part is shown publicly."
            error={state.fieldErrors?.postcode}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="postcode"
                defaultValue={defaultPostcode ?? ""}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                autoComplete="postal-code"
                required
              />
            )}
          </Field>

          <Field label="When would suit you?" error={state.fieldErrors?.timing}>
            {({ id, describedBy, invalid }) => (
              <Select id={id} name="timing" aria-describedby={describedBy} aria-invalid={invalid} defaultValue="flexible">
                {timings.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Preferred date" optional error={state.fieldErrors?.preferredDate}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="preferredDate" aria-describedby={describedBy} aria-invalid={invalid} placeholder="e.g. any Saturday" maxLength={120} />
            )}
          </Field>

          <Field label="Rough budget" error={state.fieldErrors?.budgetBand}>
            {({ id, describedBy, invalid }) => (
              <Select id={id} name="budgetBand" aria-describedby={describedBy} aria-invalid={invalid} defaultValue="unsure">
                {budgetBands.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Posting…" : "Post job"}
        </Button>
        <p className="text-sm text-muted">Free · You choose who does the work</p>
      </div>
    </form>
  );
}
