"use client";

import { cn } from "@/lib/utils/cn";

type Option = { value: string; label: string; blurb?: string };

/**
 * Tappable option cards used instead of native radios/checkboxes where the
 * choice carries meaning worth explaining (experience level, job type).
 * Native inputs stay in the DOM so keyboard and form semantics are preserved.
 */
export function OptionCards({
  name,
  options,
  type,
  selected,
  onChange,
  columns = 2,
  invalid,
  describedBy,
}: {
  name: string;
  options: readonly Option[];
  type: "radio" | "checkbox";
  selected: string[];
  onChange: (value: string[]) => void;
  columns?: 1 | 2;
  invalid?: boolean;
  describedBy?: string;
}) {
  function toggle(value: string) {
    if (type === "radio") {
      onChange([value]);
      return;
    }
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <div
      role={type === "radio" ? "radiogroup" : "group"}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn("grid gap-2.5", columns === 2 ? "sm:grid-cols-2" : "grid-cols-1")}
    >
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
              isSelected
                ? "border-brand bg-brand-soft"
                : "border-line-strong bg-white hover:border-line-strong hover:bg-paper-sunk",
              invalid && !isSelected && "border-red-300",
            )}
          >
            <input
              type={type}
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => toggle(option.value)}
              className="mt-0.5 size-4 shrink-0 accent-[#14493c]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{option.label}</span>
              {option.blurb && (
                <span className="mt-0.5 block text-sm leading-snug text-muted">{option.blurb}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
