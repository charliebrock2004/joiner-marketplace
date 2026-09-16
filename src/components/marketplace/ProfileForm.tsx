"use client";

import { useActionState, useMemo, useState } from "react";
import {
  updateProfileAction,
  uploadPortfolioAction,
  uploadProfilePhotoAction,
  deletePortfolioPhotoAction,
  type ActionState,
} from "@/lib/actions/marketplace.ts";
import { FormError } from "@/components/forms/FormStatus";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { OptionCards } from "@/components/ui/OptionCards";
import { Icon } from "@/components/ui/Icon";
import { availabilitySlots, experienceLevels, radiusOptions } from "@/lib/validation/marketplace.ts";
import type { JobCategory, Trade } from "@/lib/db/queries/trades.ts";
import type { PublicTradesperson } from "@/lib/db/queries/profiles.ts";

const initial: ActionState = {};

function Notice({ state }: { state: ActionState }) {
  if (state.success) {
    return (
      <p role="status" className="rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-brand-ink">
        {state.success}
      </p>
    );
  }
  if (state.error) return <FormError message={state.error} />;
  return null;
}

export function ProfileForm({
  profile,
  trades,
  categories,
}: {
  profile: PublicTradesperson;
  trades: Trade[];
  categories: JobCategory[];
}) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);
  const [tradeId, setTradeId] = useState<string[]>(
    profile.primary_trade_id ? [profile.primary_trade_id] : [trades[0]?.id ?? ""],
  );
  const [skills, setSkills] = useState<string[]>(profile.skills.map((s) => s.id));
  const [availability, setAvailability] = useState<string[]>(profile.availability);
  const [experience, setExperience] = useState<string[]>([profile.experience_level]);

  const selectedTrade = tradeId[0] ?? "";
  const tradeCategories = useMemo(
    () => categories.filter((c) => c.trade_id === selectedTrade),
    [categories, selectedTrade],
  );

  return (
    <form action={action} className="space-y-7">
      <Notice state={state} />
      <input type="hidden" name="primaryTradeId" value={selectedTrade} />
      <input type="hidden" name="experienceLevel" value={experience[0] ?? ""} />
      {skills.map((id) => (
        <input key={id} type="hidden" name="skillIds" value={id} />
      ))}
      {availability.map((slot) => (
        <input key={slot} type="hidden" name="availability" value={slot} />
      ))}

      <fieldset className="space-y-5" disabled={pending}>
        <legend className="text-sm font-semibold text-ink">Your trade</legend>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">Main trade</span>
          <OptionCards
            name="tradeChoice"
            type="radio"
            options={trades.map((t) => ({ value: t.id, label: t.name }))}
            selected={tradeId}
            onChange={(next) => {
              setTradeId(next);
              setSkills([]);
            }}
            invalid={Boolean(state.fieldErrors?.primaryTradeId)}
          />
          {state.fieldErrors?.primaryTradeId && (
            <p className="text-sm text-red-600">{state.fieldErrors.primaryTradeId}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">
            Which describes you? Customers always see this.
          </span>
          <OptionCards
            name="experienceChoice"
            type="radio"
            options={experienceLevels.map((e) => ({ value: e.value, label: e.label, blurb: e.blurb }))}
            selected={experience}
            onChange={setExperience}
            columns={1}
            invalid={Boolean(state.fieldErrors?.experienceLevel)}
          />
          {state.fieldErrors?.experienceLevel && (
            <p className="text-sm text-red-600">{state.fieldErrors.experienceLevel}</p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Years in the trade" error={state.fieldErrors?.yearsExperience}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="yearsExperience"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                defaultValue={profile.years_experience}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                required
              />
            )}
          </Field>
          <Field label="How far will you travel?" error={state.fieldErrors?.radiusMiles}>
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                name="radiusMiles"
                defaultValue={String(profile.radius_miles)}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              >
                {radiusOptions.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field
          label="Qualifications"
          optional
          hint="Recorded as self-declared. We show it as your own claim until our team has actually checked it."
          error={state.fieldErrors?.qualifications}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="qualifications"
              defaultValue={profile.qualifications ?? ""}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              maxLength={300}
            />
          )}
        </Field>
      </fieldset>

      <fieldset className="space-y-5 border-t border-line pt-7" disabled={pending}>
        <legend className="text-sm font-semibold text-ink">Work you want</legend>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">
            What kind of jobs? This is what we match on.
          </span>
          <OptionCards
            name="skillChoice"
            type="checkbox"
            options={tradeCategories.map((c) => ({ value: c.id, label: c.name, blurb: c.blurb ?? undefined }))}
            selected={skills}
            onChange={setSkills}
            invalid={Boolean(state.fieldErrors?.skillIds)}
          />
          {state.fieldErrors?.skillIds && (
            <p className="text-sm text-red-600">{state.fieldErrors.skillIds}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">When are you available?</span>
          <OptionCards
            name="availabilityChoice"
            type="checkbox"
            options={availabilitySlots.map((a) => ({ value: a.value, label: a.label }))}
            selected={availability}
            onChange={setAvailability}
            invalid={Boolean(state.fieldErrors?.availability)}
          />
          {state.fieldErrors?.availability && (
            <p className="text-sm text-red-600">{state.fieldErrors.availability}</p>
          )}
        </div>

        <Field
          label="About your work"
          hint="What you do and the jobs you're good at. Customers read this before choosing."
          error={state.fieldErrors?.about}
        >
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              name="about"
              defaultValue={profile.about ?? ""}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              maxLength={2000}
              required
            />
          )}
        </Field>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-paper-sunk p-4">
          <input
            type="checkbox"
            name="acceptingWork"
            defaultChecked={profile.accepting_work}
            className="mt-0.5 size-4 shrink-0 accent-[#14493c]"
          />
          <span className="text-sm leading-relaxed text-ink-soft">
            I&apos;m currently taking on work. Untick this to pause new job matches.
          </span>
        </label>
      </fieldset>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

/* --------------------------------------------------------------- photos --- */

export function ProfilePhotoForm({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState(uploadProfilePhotoAction, initial);
  return (
    <form action={action} className="space-y-3">
      <Notice state={state} />
      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper-sunk">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt="" className="size-full object-cover" />
          ) : (
            <Icon name="shield" className="size-6 text-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <input
            type="file"
            name="photo"
            accept=".jpg,.jpeg,.png,.webp,.heic"
            className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-paper-sunk file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink"
          />
        </div>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Uploading…" : "Update photo"}
      </Button>
    </form>
  );
}

export function PortfolioForm({
  photos,
}: {
  photos: { id: string; url: string; caption: string | null }[];
}) {
  const [state, action, pending] = useActionState(uploadPortfolioAction, initial);
  const [deleteState, deleteAction] = useActionState(deletePortfolioPhotoAction, initial);

  return (
    <div className="space-y-4">
      <Notice state={state} />
      <Notice state={deleteState} />

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="aspect-square w-full rounded-xl border border-line object-cover" />
              <form action={deleteAction}>
                <input type="hidden" name="photoId" value={photo.id} />
                <button
                  type="submit"
                  aria-label="Remove photo"
                  className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-white"
                >
                  <Icon name="close" className="size-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="space-y-3">
        <input
          type="file"
          name="photos"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.heic"
          className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-paper-sunk file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink"
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Uploading…" : "Add photos"}
        </Button>
      </form>
    </div>
  );
}
