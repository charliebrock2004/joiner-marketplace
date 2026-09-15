import { randomUUID } from "node:crypto";
import { consoleSink } from "./sinks/console";
import { fileSink } from "./sinks/file";
import { createEmailSink } from "./sinks/email";
import { createWebhookSink } from "./sinks/webhook";
import type { SinkResult, SubmissionKind, SubmissionRecord, SubmissionSink } from "./types";

/**
 * Resolves the configured delivery sinks from the environment.
 *
 * The contract: a submission is only reported as successful to the visitor if
 * at least one *durable* sink accepted it. We would rather show an honest
 * error than a thank-you page for a job nobody will ever read.
 */
function resolveSinks(): SubmissionSink[] {
  const sinks: SubmissionSink[] = [];

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SUBMISSIONS_TO_EMAIL;
  const from = process.env.SUBMISSIONS_FROM_EMAIL;
  if (apiKey && to && from) {
    sinks.push(createEmailSink({ apiKey, to, from }));
  }

  const webhookUrl = process.env.SUBMISSIONS_WEBHOOK_URL;
  if (webhookUrl) {
    sinks.push(
      createWebhookSink({ url: webhookUrl, secret: process.env.SUBMISSIONS_WEBHOOK_SECRET }),
    );
  }

  if (process.env.NODE_ENV !== "production") {
    sinks.push(fileSink, consoleSink);
  }

  return sinks;
}

export type SubmissionOutcome =
  | { status: "stored"; id: string; results: SinkResult[] }
  | { status: "unconfigured" }
  | { status: "failed"; results: SinkResult[] };

export function isSubmissionDeliveryConfigured(): boolean {
  return resolveSinks().some((sink) => sink.durable);
}

export type CreateSubmissionInput = {
  kind: SubmissionKind;
  data: Record<string, unknown>;
  attachments?: SubmissionRecord["attachments"];
  meta: SubmissionRecord["meta"];
};

export async function createSubmission(
  input: CreateSubmissionInput,
): Promise<SubmissionOutcome> {
  const sinks = resolveSinks();
  if (!sinks.some((sink) => sink.durable)) {
    console.error(
      "[submissions] No durable sink configured. Set RESEND_API_KEY + SUBMISSIONS_TO_EMAIL + SUBMISSIONS_FROM_EMAIL, or SUBMISSIONS_WEBHOOK_URL.",
    );
    return { status: "unconfigured" };
  }

  const record: SubmissionRecord = {
    id: randomUUID(),
    kind: input.kind,
    createdAt: new Date().toISOString(),
    data: input.data,
    attachments: input.attachments ?? [],
    meta: input.meta,
  };

  // Deliver to every sink; one failing sink must not lose the others.
  const results = await Promise.all(
    sinks.map(async (sink): Promise<SinkResult & { durable: boolean }> => {
      try {
        await sink.deliver(record);
        return { sink: sink.name, ok: true, durable: sink.durable };
      } catch (error) {
        console.error(`[submissions] sink "${sink.name}" failed`, error);
        return {
          sink: sink.name,
          ok: false,
          durable: sink.durable,
          error: error instanceof Error ? error.message : "unknown error",
        };
      }
    }),
  );

  const durableSucceeded = results.some((result) => result.durable && result.ok);
  const publicResults: SinkResult[] = results.map(({ sink, ok, error }) => ({ sink, ok, error }));

  return durableSucceeded
    ? { status: "stored", id: record.id, results: publicResults }
    : { status: "failed", results: publicResults };
}
