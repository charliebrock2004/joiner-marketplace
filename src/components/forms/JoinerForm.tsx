"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FormError, FormSuccess } from "@/components/forms/FormStatus";
import { useSubmission } from "@/components/forms/useSubmission";
import { Button } from "@/components/ui/Button";
import { Field, Honeypot, Input, Select, Textarea } from "@/components/ui/Field";
import { OptionCards } from "@/components/ui/OptionCards";
import { jobCategories } from "@/lib/content/categories";
import {
  availabilityOptions,
  experienceLevels,
  radiusOptions,
} from "@/lib/validation/joiner";

export function JoinerForm() {
  const { status, fieldErrors, formError, inLaunchArea, submit } = useSubmission("/api/joiners");
  const [experienceLevel, setExperienceLevel] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(new FormData(event.currentTarget));
  }

  if (status === "success") {
    return (
      <FormSuccess title="Thanks — you're on the list.">
        <p>
          We&apos;ll be in touch to go through what you do and the kind of jobs you want. Nothing is
          automatic: we speak to every joiner before passing work on.
        </p>
        {inLaunchArea ? (
          <p>You&apos;re in our launch area, so expect jobs to start coming your way soon.</p>
        ) : (
          <p>
            You&apos;re outside the area we&apos;ve started in. We&apos;ll keep your details and get
            in touch as we expand — joiners signing up is exactly how we decide where to go next.
          </p>
        )}
        <p>
          To be clear: registering doesn&apos;t mean you&apos;re approved or verified. When
          verification goes live we&apos;ll come back to you to get it done properly.
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
        <legend className="text-sm font-semibold text-ink">About you</legend>

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
          <Field label="Email" error={fieldErrors.email}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="email" type="email" aria-describedby={describedBy} aria-invalid={invalid} autoComplete="email" required />
            )}
          </Field>
          <Field label="Postcode" hint="Where you're based." error={fieldErrors.postcode}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="postcode" aria-describedby={describedBy} aria-invalid={invalid} autoComplete="postal-code" placeholder="PH1 1AA" required />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-line pt-7" disabled={status === "submitting"}>
        <legend className="text-sm font-semibold text-ink">Experience</legend>
        <p className="text-sm text-muted">
          We show experience level honestly on profiles rather than badging everyone as a joiner.
          Apprentices are welcome — being upfront about your level is what makes customers trust
          the platform.
        </p>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">Which describes you best?</span>
          <OptionCards
            name="experienceLevel"
            type="radio"
            options={experienceLevels}
            selected={experienceLevel}
            onChange={setExperienceLevel}
            columns={1}
            invalid={Boolean(fieldErrors.experienceLevel)}
          />
          {fieldErrors.experienceLevel && (
            <p className="text-sm text-red-600">{fieldErrors.experienceLevel}</p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Years in the trade" error={fieldErrors.yearsExperience}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="yearsExperience"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                placeholder="5"
                required
              />
            )}
          </Field>
          <Field label="How far will you travel?" error={fieldErrors.radiusMiles}>
            {({ id, describedBy, invalid }) => (
              <Select id={id} name="radiusMiles" aria-describedby={describedBy} aria-invalid={invalid} defaultValue="20">
                {radiusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field
          label="Qualifications"
          optional
          hint="e.g. SVQ Level 3 Carpentry & Joinery, CSCS card, time served. We record these as self-declared until verification is live — we won't display them as checked."
          error={fieldErrors.qualifications}
        >
          {({ id, describedBy, invalid }) => (
            <Input id={id} name="qualifications" aria-describedby={describedBy} aria-invalid={invalid} maxLength={300} />
          )}
        </Field>
      </fieldset>

      <fieldset className="space-y-5 border-t border-line pt-7" disabled={status === "submitting"}>
        <legend className="text-sm font-semibold text-ink">Work you want</legend>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">
            What kind of jobs do you want? Pick as many as apply.
          </span>
          <OptionCards
            name="skills"
            type="checkbox"
            options={jobCategories}
            selected={skills}
            onChange={setSkills}
            invalid={Boolean(fieldErrors.skills)}
          />
          {fieldErrors.skills && <p className="text-sm text-red-600">{fieldErrors.skills}</p>}
        </div>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">When are you generally available?</span>
          <OptionCards
            name="availability"
            type="checkbox"
            options={availabilityOptions}
            selected={availability}
            onChange={setAvailability}
            invalid={Boolean(fieldErrors.availability)}
          />
          {fieldErrors.availability && (
            <p className="text-sm text-red-600">{fieldErrors.availability}</p>
          )}
        </div>

        <Field
          label="Tell customers about your work"
          hint="A few lines on what you do and the kind of jobs you're good at. This is the sort of thing that will go on your profile later."
          error={fieldErrors.about}
        >
          {({ id, describedBy, invalid }) => (
            <Textarea id={id} name="about" aria-describedby={describedBy} aria-invalid={invalid} maxLength={1200} required />
          )}
        </Field>

        <Field
          label="Instagram, Facebook or website"
          optional
          hint="Photos of previous work help a lot while we've no reviews yet."
          error={fieldErrors.profileUrl}
        >
          {({ id, describedBy, invalid }) => (
            <Input id={id} name="profileUrl" type="url" aria-describedby={describedBy} aria-invalid={invalid} placeholder="https://" maxLength={300} />
          )}
        </Field>

        <div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-paper-sunk p-4">
            <input type="checkbox" name="consent" required className="mt-0.5 size-4 shrink-0 accent-[#14493c]" />
            <span className="text-sm leading-relaxed text-ink-soft">
              I understand that registering doesn&apos;t approve or verify me, and I&apos;m happy to
              be contacted about local jobs and about verification when it launches.
            </span>
          </label>
          {fieldErrors.consent && <p className="mt-1.5 text-sm text-red-600">{fieldErrors.consent}</p>}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={status === "submitting"}>
          {status === "submitting" ? "Sending…" : "Register my interest"}
        </Button>
        <p className="text-sm text-muted">Free while we build the network</p>
      </div>
    </form>
  );
}
