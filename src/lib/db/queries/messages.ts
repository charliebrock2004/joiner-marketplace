import "server-only";

import { getDb } from "../client.ts";

/**
 * Job-scoped private messaging.
 *
 * Access is enforced in every query by requiring the viewer to be one of the
 * two participants. There is no lookup that takes a conversation id on trust.
 */

export type ConversationSummary = {
  id: string;
  job_id: string;
  job_title: string;
  job_status: string;
  other_party_id: string;
  other_party_name: string;
  last_message_at: string | null;
  last_message: string | null;
  unread_count: number;
};

export type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  removed_at: string | null;
};

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const db = await getDb();
  return db.query<ConversationSummary>(
    `select c.id, c.job_id, j.title as job_title, j.status as job_status,
            c.last_message_at,
            case when c.customer_id = $1 then c.tradesperson_id else c.customer_id end as other_party_id,
            case when c.customer_id = $1 then tp.full_name else cu.full_name end as other_party_name,
            (select m.body from messages m
              where m.conversation_id = c.id and m.removed_at is null
              order by m.created_at desc limit 1) as last_message,
            (select count(*)::int from messages m
              where m.conversation_id = c.id and m.sender_id <> $1
                and m.read_at is null and m.removed_at is null) as unread_count
       from conversations c
       join jobs j on j.id = c.job_id
       join users cu on cu.id = c.customer_id
       join users tp on tp.id = c.tradesperson_id
      where (c.customer_id = $1 or c.tradesperson_id = $1)
        and j.removed_at is null
      order by coalesce(c.last_message_at, c.created_at) desc`,
    [userId],
  );
}

export type ConversationDetail = {
  id: string;
  job_id: string;
  job_title: string;
  job_status: string;
  customer_id: string;
  tradesperson_id: string;
  other_party_id: string;
  other_party_name: string;
  messages: Message[];
};

/**
 * Loads a conversation only if the viewer is a participant. Admins use the
 * separate admin query, so this path never has a bypass branch.
 */
export async function getConversation(
  conversationId: string,
  userId: string,
): Promise<ConversationDetail | null> {
  const db = await getDb();
  const [row] = await db.query<ConversationDetail>(
    `select c.id, c.job_id, j.title as job_title, j.status as job_status,
            c.customer_id, c.tradesperson_id,
            case when c.customer_id = $2 then c.tradesperson_id else c.customer_id end as other_party_id,
            case when c.customer_id = $2 then tp.full_name else cu.full_name end as other_party_name
       from conversations c
       join jobs j on j.id = c.job_id
       join users cu on cu.id = c.customer_id
       join users tp on tp.id = c.tradesperson_id
      where c.id = $1
        and (c.customer_id = $2 or c.tradesperson_id = $2)
        and j.removed_at is null`,
    [conversationId, userId],
  );
  if (!row) return null;

  row.messages = await db.query<Message>(
    `select id, sender_id, body, created_at, read_at, removed_at
       from messages where conversation_id = $1 order by created_at`,
    [conversationId],
  );
  return row;
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const db = await getDb();

  // Membership is re-checked here rather than trusted from the caller.
  const [conversation] = await db.query<{ id: string }>(
    `select c.id from conversations c
       join jobs j on j.id = c.job_id
      where c.id = $1 and (c.customer_id = $2 or c.tradesperson_id = $2)
        and j.removed_at is null`,
    [conversationId, senderId],
  );
  if (!conversation) return { ok: false, error: "Conversation not found." };

  const [row] = await db.query<{ id: string }>(
    "insert into messages (conversation_id, sender_id, body) values ($1, $2, $3) returning id",
    [conversationId, senderId, body],
  );
  if (!row) return { ok: false, error: "Could not send that message." };

  await db.query("update conversations set last_message_at = now() where id = $1", [conversationId]);
  return { ok: true, id: row.id };
}

/** Marks the other party's messages as read. */
export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  const db = await getDb();
  await db.query(
    `update messages set read_at = now()
      where conversation_id = (
        select c.id from conversations c
         where c.id = $1 and (c.customer_id = $2 or c.tradesperson_id = $2)
      )
        and sender_id <> $2 and read_at is null`,
    [conversationId, userId],
  );
}

export async function countUnread(userId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db.query<{ count: string }>(
    `select count(*) as count from messages m
       join conversations c on c.id = m.conversation_id
      where (c.customer_id = $1 or c.tradesperson_id = $1)
        and m.sender_id <> $1 and m.read_at is null and m.removed_at is null`,
    [userId],
  );
  return Number(row?.count ?? 0);
}

/** Opens (or finds) the conversation for a job and tradesperson. */
export async function ensureConversation(
  jobId: string,
  customerId: string,
  tradespersonId: string,
): Promise<string | null> {
  const db = await getDb();
  const [job] = await db.query<{ id: string }>(
    "select id from jobs where id = $1 and customer_id = $2 and removed_at is null",
    [jobId, customerId],
  );
  if (!job) return null;

  const [row] = await db.query<{ id: string }>(
    `insert into conversations (job_id, customer_id, tradesperson_id)
     values ($1, $2, $3)
     on conflict (job_id, tradesperson_id) do update set job_id = excluded.job_id
     returning id`,
    [jobId, customerId, tradespersonId],
  );
  return row?.id ?? null;
}
