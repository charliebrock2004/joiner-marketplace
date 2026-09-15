import Link from "next/link";
import { site } from "@/lib/config/site";

/**
 * Wordmark with a mitre-joint mark: two lengths of timber meeting at a 45°
 * corner. A nod to joinery without resorting to hammers and hard hats.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={className}
      aria-label={`${site.name} — home`}
    >
      <span className="flex items-center gap-2.5">
        <svg viewBox="0 0 24 24" className="size-7 text-brand" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="currentColor" />
          <g stroke="white" strokeWidth="1.7" strokeLinecap="round" fill="none">
            {/* The two members of the joint */}
            <path d="M6 18V8.5a2.5 2.5 0 012.5-2.5H18" />
            <path d="M6 18h4.2V10.2H18" />
            {/* The mitre line where they meet */}
            <path d="M6.6 6.6l3.9 3.9" strokeDasharray="0.1 2.6" strokeWidth="1.4" />
          </g>
        </svg>
        <span className="text-[1.0625rem] font-semibold tracking-tight text-ink">{site.name}</span>
      </span>
    </Link>
  );
}
