"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";

/** Error banner shown above a form, announced to assistive technology. */
export function FormError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      {message}
    </div>
  );
}

/**
 * Success panel shown in place of a form once a submission is stored.
 *
 * The form collapsing to a short panel leaves the viewport scrolled past the
 * confirmation, so focus is moved here on mount. That scrolls the message into
 * view and announces it to screen readers in one go.
 */
export function FormSuccess({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      className="animate-rise rounded-2xl border border-line bg-white p-7 outline-none sm:p-9"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon name="check" className="size-6" />
      </span>
      <h2 className="mt-5 text-2xl font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-ink-soft [&_a]:font-medium [&_a]:text-brand [&_a:hover]:underline">
        {children}
      </div>
    </div>
  );
}
