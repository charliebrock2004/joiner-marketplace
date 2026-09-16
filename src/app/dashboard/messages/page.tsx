import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards.ts";
import { listConversations } from "@/lib/db/queries/messages.ts";
import { EmptyState, formatDateTime } from "@/components/marketplace/Bits";

export const metadata: Metadata = { title: "Messages", robots: { index: false, follow: false } };

export default async function MessagesPage() {
  const user = await requireUser("/dashboard/messages");
  const conversations = await listConversations(user.id);

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Messages</h1>
      <p className="mt-1 text-ink-soft">
        A conversation opens once a customer chooses a tradesperson for a job.
      </p>

      <div className="mt-8 space-y-3">
        {conversations.length === 0 ? (
          <EmptyState
            title="No conversations yet"
            body={
              user.role === "customer"
                ? "Once you choose someone for a job, you'll be able to message each other here."
                : "Once a customer chooses you for a job, you'll be able to message them here."
            }
          />
        ) : (
          conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/dashboard/messages/${conversation.id}`}
              className="block rounded-2xl border border-line bg-white p-5 transition-colors hover:border-line-strong"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{conversation.other_party_name}</p>
                  <p className="mt-0.5 text-sm text-muted">{conversation.job_title}</p>
                </div>
                <div className="flex items-center gap-3">
                  {conversation.unread_count > 0 && (
                    <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                      {conversation.unread_count}
                    </span>
                  )}
                  <span className="text-sm text-muted">{formatDateTime(conversation.last_message_at)}</span>
                </div>
              </div>
              {conversation.last_message && (
                <p className="mt-3 truncate text-sm text-ink-soft">{conversation.last_message}</p>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
