type ClassValue = string | false | null | undefined;

/** Minimal class joiner — avoids pulling in clsx for a five-line function. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
