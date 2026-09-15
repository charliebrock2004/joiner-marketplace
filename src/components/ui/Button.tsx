import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "inverse" | "inverseOutline";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "bg-white text-ink ring-1 ring-line-strong hover:bg-paper-sunk",
  ghost: "text-ink-soft hover:text-ink hover:bg-paper-sunk",
  // For use on the dark sections.
  inverse: "bg-white text-ink hover:bg-white/90",
  inverseOutline: "bg-transparent text-white ring-1 ring-white/25 hover:bg-white/10",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-13 px-7 text-base",
};

function classes(variant: Variant, size: Size, className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={classes(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  onClick,
  children,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  href: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Link href={href} onClick={onClick} className={classes(variant, size, className)}>
      {children}
    </Link>
  );
}
