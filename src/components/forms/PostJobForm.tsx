"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FormError, FormSuccess } from "@/components/forms/FormStatus";
import { PhotoUpload } from "@/components/forms/PhotoUpload";
import { useSubmission } from "@/components/forms/useSubmission";
import { Button } from "@/components/ui/Button";
import { Field, Honeypot, Input, Select, Textarea } from "@/components/ui/Field";
import { OptionCards } from "@/components/ui/OptionCards";
import { jobCategories } from "@/lib/content/categories";
import { site } from "@/lib/config/site";
import { budgetOptions, timingOptions } from "@/lib/validation/job";

export function PostJobForm() {
  const { status, fieldErrors, formError, inLaunchArea, submit } = useSubmission("/api/jobs");
  const [category, setCategory] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // Files are tracked in React state, so replace the native entries.
    formData.delete("photos");
    for (const photo of photos) formData.append("photos", photo);

    await submit(formData);
  }

  if (status === "success") {
    return (
      <FormSuccess title="Thanks — your job has been submitted.">
        <p>
          It&apos;s come straight through to us and we&apos;ll be in touch by email or phone,
          usually within a day.
        </p>
        {inLaunchArea ? (
          <p>
            You&apos;re inside our launch area, so we&apos;ll start contacting suitable local
            joiners about your job right away.
          </p>
        ) : (
          <p>
            Your postcode is outside the area we currently cover. We&apos;ll still try to find
            someone, and we&apos;ll be straight with you if we can&apos;t yet rather than leave you
            waiting.
          </p>
        )}
        <p>
          While the platform is being built we match jobs to joiners by hand. That means a person
          reads every job — including yours.
        </p>
        <p className="pt-2">
          <Link href="/">Back to home</Link>
        </p>
      </FormSuccess>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-7">
      <Honeypot />
      {formError && <FormError message={formError} />}

      <fieldset className="space-y-5" disabled={status === "submitting"}>
        <legend className="sr-only">About the job</legend>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">What kind of job is it?</span>
          <OptionCards
            name="category"
            type="radio"
            options={jobCategories}
            selected={category}
            onChange={setCategory}
            invalid={Boolean(fieldErrors.category)}
          />
          {fieldErrors.category && (
            <p className="text-sm text-red-600">{fieldErrors.category}</p>
          )}
        </div>

        <Field
          label="Describe the job"
          hint="What needs doing, and anything a joiner would want to know — sizes, materials, access, whether you've got the parts already."
          error={fieldErrors.description}
        >
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              name="description"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              placeholder="e.g. Two internal doors need hung. Doors and hinges are here already, just need trimming and fitting."
              maxLength={2000}
              required
            />
          )}
        </Field>

        <PhotoUpload files={photos} onChange={setPhotos} error={fieldErrors.photos} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Postcode" hint="So we can find joiners near you." error={fieldErrors.postcode}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="postcode"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                autoComplete="postal-code"
                placeholder="PH7 3AB"
                required
              />
            )}
          </Field>

          <Field label="When would suit you?" error={fieldErrors.timing}>
            {({ id, describedBy, invalid }) => (
              <Select id={id} name="timing" aria-describedby={describedBy} aria-invalid={invalid} defaultValue="flexible">
                {timingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="Preferred date"
            optional
            hint="Anything specific we should work around."
            error={fieldErrors.preferredDate}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="preferredDate"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                placeholder="e.g. any Saturday, or after the 20th"
                maxLength={120}
              />
            )}
          </Field>

          <Field
            label="Rough budget"
            hint="A guide only — you agree the final price with the joiner."
            error={fieldErrors.budget}
          >
            {({ id, describedBy, invalid }) => (
              <Select id={id} name="budget" aria-describedby={describedBy} aria-invalid={invalid} defaultValue="unsure">
                {budgetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-line pt-7" disabled={status === "submitting"}>
        <legend className="text-sm font-semibold text-ink">How we reach you</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your name" error={fieldErrors.name}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="name" aria-describedby={describedBy} aria-invalid={invalid} autoComplete="name" required />
            )}
          </Field>

          <Field label="Phone" error={fieldErrors.phone}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="phone" type="tel" aria-describedby={describedBy} aria-invalid={invalid} autoComplete="tel" placeholder="07700 900123" required />
            )}
          </Field>
        </div>

        <Field label="Email" error={fieldErrors.email}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} name="email" type="email" aria-describedby={describedBy} aria-invalid={invalid} autoComplete="email" required />
          )}
        </Field>

        <div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-paper-sunk p-4">
            <input
              type="checkbox"
              name="consent"
              required
              className="mt-0.5 size-4 shrink-0 accent-[#14493c]"
            />
            <span className="text-sm leading-relaxed text-ink-soft">
              I&apos;m happy for {site.name} to contact me about this job and to share my job
              details with suitable local joiners. Your address and contact details are only shared
              with a joiner once you&apos;ve agreed to work with them.
            </span>
          </label>
          {fieldErrors.consent && <p className="mt-1.5 text-sm text-red-600">{fieldErrors.consent}</p>}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={status === "submitting"}>
          {status === "submitting" ? "Sending…" : "Post my job"}
        </Button>
        <p className="text-sm text-muted">Free · No obligation to hire anyone</p>
      </div>
    </form>
  );
}
