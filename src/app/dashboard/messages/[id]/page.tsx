import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards.ts";
import { getConversation, markConversationRead } from "@/lib/db/queries/messages.ts";
import { MessageThread } from "@/components/marketplace/MessageThread";
import { ReportButton } from "@/components/marketplace/ReportButton";

export const metadata: Metadata = { title: "Conversation", robots: { index: false, follow: false } };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/messages/${id}`);

  // Returns null unless the viewer is one of the two participants.
  const conversation = await getConversation(id, user.id);
  if (!conversation) notFound();

  await markConversationRead(id, user.id);

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/messages" className="text-sm text-muted hover:text-ink">
          ← All messages
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink sm:text-2xl">
              {conversation.other_party_name}
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              About: {conversation.job_title}
            </p>
          </div>
          <Link
            href={
              user.role === "customer"
                ? `/dashboard/jobs/${conversation.job_id}`
                : `/jobs/${conversation.job_id}`
            }
            className="text-sm font-medium text-brand hover:underline"
          >
            View job
          </Link>
        </div>

        <div className="mt-6">
          <MessageThread
            conversationId={conversation.id}
            messages={conversation.messages}
            viewerId={user.id}
          />
        </div>

        <div className="mt-8 border-t border-line pt-6">
          <ReportButton targetType="user" targetId={conversation.other_party_id} label="Report this person" />
        </div>
      </div>
    </div>
  );
}
