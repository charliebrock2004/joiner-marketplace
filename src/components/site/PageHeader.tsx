import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-line bg-paper-sunk">
      <div className="container-page py-12 sm:py-16">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="text-sm font-semibold tracking-wide text-brand uppercase">{eyebrow}</p>
          )}
          <h1 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
          {lead && <p className="mt-4 text-lg leading-relaxed text-ink-soft">{lead}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
