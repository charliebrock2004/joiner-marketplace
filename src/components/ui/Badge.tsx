import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "brand" | "accent" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-paper-sunk text-ink-soft",
  brand: "bg-brand-soft text-brand-ink",
  accent: "bg-accent-soft text-accent",
  outline: "ring-1 ring-line-strong text-muted",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
