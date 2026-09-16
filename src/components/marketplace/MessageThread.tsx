"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessageAction, type ActionState } from "@/lib/actions/marketplace.ts";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";

const initial: ActionState = {};

export type ThreadMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  removed_at: string | null;
};

export function MessageThread({
  conversationId,
  messages,
  viewerId,
}: {
  conversationId: string;
  messages: ThreadMessage[];
  viewerId: string;
}) {
  const [state, action, pending] = useActionState(sendMessageAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Clear the box and scroll down once a send completes.
  useEffect(() => {
    if (!pending) {
      formRef.current?.reset();
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [pending, messages.length]);

  return (
    <div className="flex min-h-[50vh] flex-col">
      <ol className="flex-1 space-y-3">
        {messages.length === 0 && (
          <li className="text-sm text-muted">
            No messages yet. Say hello and sort out the details of the job.
          </li>
        )}
        {messages.map((message) => {
          const mine = message.sender_id === viewerId;
          if (message.removed_at) {
            return (
              <li key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <p className="rounded-2xl bg-paper-sunk px-4 py-2 text-sm text-muted italic">
                  This message was removed by our team.
                </p>
              </li>
            );
          }
          return (
            <li key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5",
                  mine ? "bg-brand text-white" : "bg-paper-sunk text-ink",
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-line">{message.body}</p>
                <p className={cn("mt-1 text-xs", mine ? "text-white/60" : "text-muted")}>
                  {new Date(message.created_at).toLocaleString("en-GB", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                  {mine && message.read_at ? " · Read" : ""}
                </p>
              </div>
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>

      <form ref={formRef} action={action} className="mt-6 space-y-2 border-t border-line pt-4">
        <input type="hidden" name="conversationId" value={conversationId} />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Textarea
          name="body"
          required
          maxLength={2000}
          placeholder="Write a message…"
          aria-label="Message"
          className="min-h-24"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
