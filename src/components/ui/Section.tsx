import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Section({
  id,
  className,
  tone = "paper",
  children,
}: {
  id?: string;
  className?: string;
  tone?: "paper" | "sunk" | "ink";
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-16 sm:py-24",
        tone === "sunk" && "bg-paper-sunk",
        tone === "ink" && "bg-ink text-white",
        className,
      )}
    >
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  inverted,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "left" | "center";
  inverted?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && (
        <p
          className={cn(
            "text-sm font-semibold tracking-wide uppercase",
            inverted ? "text-white/60" : "text-brand",
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "mt-2 text-3xl font-semibold sm:text-4xl",
          inverted ? "text-white" : "text-ink",
        )}
      >
        {title}
      </h2>
      {lead && (
        <p
          className={cn(
            "mt-4 text-lg leading-relaxed",
            inverted ? "text-white/70" : "text-ink-soft",
          )}
        >
          {lead}
        </p>
      )}
    </div>
  );
}
