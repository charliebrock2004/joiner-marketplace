"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/lib/config/site";

const SHARE_TEXT =
  "Got a small joinery job nobody will come out for? This connects you with local joiners who have spare capacity.";

/**
 * Sharing is a primary growth channel here — the site gets posted into local
 * Facebook groups. Native share on mobile, Facebook + copy-link elsewhere.
 */
export function ShareLinks({ url = site.url }: { url?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: site.name, text: SHARE_TEXT, url });
        return;
      } catch {
        // User dismissed the sheet — fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-medium text-ink ring-1 ring-line-strong transition-colors hover:bg-paper-sunk"
      >
        Share on Facebook
      </a>
      <button
        type="button"
        onClick={share}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-medium text-ink ring-1 ring-line-strong transition-colors hover:bg-paper-sunk"
      >
        {copied && <Icon name="check" className="size-4 text-brand" />}
        {copied ? "Link copied" : "Share link"}
      </button>
    </div>
  );
}
