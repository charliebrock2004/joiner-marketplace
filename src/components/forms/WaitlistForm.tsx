"use client";

import { useState, type FormEvent } from "react";
import { useSubmission } from "@/components/forms/useSubmission";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Field";
import { waitlistRoles } from "@/lib/validation/waitlist";
import { cn } from "@/lib/utils/cn";

/**
 * Compact "tell me when you reach my area" capture. Deliberately three fields:
 * every extra one costs sign-ups, and postcode is the only thing we genuinely
 * need to decide where to expand next.
 */
export function WaitlistForm() {
  const { status, fieldErrors, formError, inLaunchArea, submit } = useSubmission("/api/waitlist");
  const [role, setRole] = useState<"customer" | "joiner">("customer");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await submit({
      email: data.get("email"),
      postcode: data.get("postcode"),
      role,
      website: data.get("website") ?? "",
    });
  }

  if (status === "success") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand-soft p-5">
        <Icon name="check" className="mt-0.5 size-5 shrink-0 text-brand" />
        <div className="text-sm leading-relaxed text-brand-ink">
          <p className="font-semibold">You&apos;re on the list.</p>
          <p className="mt-1">
            {inLaunchArea
              ? "You're already in our launch area — you don't have to wait. Post a job or register as a joiner whenever you're ready."
              : "We'll email you as soon as we've got joiners covering your area. The more people who sign up from one town, the sooner we get there."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex gap-2" role="radiogroup" aria-label="Which are you?">
        {waitlistRoles.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={role === option.value}
            onClick={() => setRole(option.value)}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors",
              role === option.value
                ? "bg-ink text-white"
                : "bg-white text-ink-soft ring-1 ring-line-strong hover:bg-paper-sunk",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
        <div>
          <Input
            name="email"
            type="email"
            placeholder="you@example.com"
            aria-label="Email address"
            aria-invalid={Boolean(fieldErrors.email)}
            autoComplete="email"
            required
          />
          {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
        </div>
        <div>
          <Input
            name="postcode"
            placeholder="Postcode"
            aria-label="Postcode"
            aria-invalid={Boolean(fieldErrors.postcode)}
            autoComplete="postal-code"
            required
          />
          {fieldErrors.postcode && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.postcode}</p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={status === "submitting"}>
        {status === "submitting" ? "Adding you…" : "Notify me at launch"}
      </Button>

      {formError && <p className="text-sm text-red-600">{formError}</p>}
    </form>
  );
}
