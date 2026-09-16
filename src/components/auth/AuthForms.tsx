"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, signupAction, type AuthFormState } from "@/lib/actions/auth.ts";
import { FormError } from "@/components/forms/FormStatus";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { OptionCards } from "@/components/ui/OptionCards";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants.ts";

const initialState: AuthFormState = {};

const roleOptions = [
  {
    value: "customer",
    label: "I need work doing",
    blurb: "Post jobs and choose a tradesperson",
  },
  {
    value: "tradesperson",
    label: "I'm a tradesperson",
    blurb: "Find local jobs that fit round your week",
  },
];

export function SignupForm({ next, defaultRole }: { next?: string; defaultRole?: string }) {
  const [state, action, pending] = useActionState(signupAction, initialState);
  const [role, setRole] = useState<string[]>([defaultRole ?? "customer"]);
  const values = state.values ?? {};

  return (
    <form action={action} className="space-y-6">
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <FormError message={state.error} />}

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-ink">How will you use Tradezy?</span>
        <OptionCards
          name="role"
          type="radio"
          options={roleOptions}
          selected={role}
          onChange={setRole}
          columns={1}
          invalid={Boolean(state.fieldErrors?.role)}
        />
        {state.fieldErrors?.role && <p className="text-sm text-red-600">{state.fieldErrors.role}</p>}
      </div>

      <fieldset className="space-y-5" disabled={pending}>
        <legend className="sr-only">Your details</legend>

        <Field label="Your name" error={state.fieldErrors?.fullName}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="fullName"
              defaultValue={values.fullName}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              autoComplete="name"
              required
            />
          )}
        </Field>

        <Field label="Email" error={state.fieldErrors?.email}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="email"
              type="email"
              defaultValue={values.email}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              autoComplete="email"
              required
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone" error={state.fieldErrors?.phone}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="phone"
                type="tel"
                defaultValue={values.phone}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                autoComplete="tel"
                placeholder="07700 900123"
                required
              />
            )}
          </Field>

          <Field label="Postcode" error={state.fieldErrors?.postcode}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="postcode"
                defaultValue={values.postcode}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                autoComplete="postal-code"
                placeholder="PH7 3AB"
                required
              />
            )}
          </Field>
        </div>

        <Field
          label="Password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters. A few words you'll remember beats a short complicated one.`}
          error={state.fieldErrors?.password}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="password"
              type="password"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          )}
        </Field>

        <div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-paper-sunk p-4">
            <input type="checkbox" name="terms" required className="mt-0.5 size-4 shrink-0 accent-[#14493c]" />
            <span className="text-sm leading-relaxed text-ink-soft">
              I agree to Tradezy contacting me about my account and jobs, and I&apos;ve read the{" "}
              <Link href="/privacy" className="font-medium text-brand hover:underline">
                privacy notice
              </Link>
              .
            </span>
          </label>
          {state.fieldErrors?.terms && (
            <p className="mt-1.5 text-sm text-red-600">{state.fieldErrors.terms}</p>
          )}
        </div>
      </fieldset>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const values = state.values ?? {};

  return (
    <form action={action} className="space-y-6">
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <FormError message={state.error} />}

      <fieldset className="space-y-5" disabled={pending}>
        <legend className="sr-only">Sign in</legend>

        <Field label="Email" error={state.fieldErrors?.email}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="email"
              type="email"
              defaultValue={values.email}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              autoComplete="email"
              required
            />
          )}
        </Field>

        <Field label="Password" error={state.fieldErrors?.password}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="password"
              type="password"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              autoComplete="current-password"
              required
            />
          )}
        </Field>
      </fieldset>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted">
        New to Tradezy?{" "}
        <Link href="/signup" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
