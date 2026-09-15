import { faqs } from "@/lib/content/faqs";
import { Icon } from "@/components/ui/Icon";

/**
 * Native <details> accordion — no JS, works before hydration, and keyboard
 * accessible for free.
 */
export function FaqAccordion({ items = faqs }: { items?: typeof faqs }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((faq) => (
        <details key={faq.question} className="group py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-medium text-ink [&::-webkit-details-marker]:hidden">
            {faq.question}
            <Icon
              name="plus"
              className="size-5 shrink-0 text-muted transition-transform group-open:rotate-45"
            />
          </summary>
          <p className="pr-8 pb-5 leading-relaxed text-ink-soft">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
