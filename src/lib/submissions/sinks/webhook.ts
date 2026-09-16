import { createHmac } from "node:crypto";
import type { SubmissionSink } from "../types";

/**
 * Generic webhook sink — points at Zapier, Make, a Google Sheet endpoint or
 * our own API later. Attachments are sent as metadata only; binary payloads
 * belong in object storage once that exists.
 *
 * When SUBMISSIONS_WEBHOOK_SECRET is set the body is signed so the receiver
 * can verify it really came from us.
 */
export function createWebhookSink(config: { url: string; secret?: string }): SubmissionSink {
  return {
    name: "webhook",
    durable: true,
    async deliver(record) {
      const body = JSON.stringify({
        ...record,
        attachments: record.attachments.map((a) => ({
          filename: a.filename,
          contentType: a.contentType,
          size: a.size,
        })),
      });

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (config.secret) {
        headers["X-Tradezy-Signature"] = createHmac("sha256", config.secret)
          .update(body)
          .digest("hex");
      }

      const response = await fetch(config.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`Webhook responded ${response.status}`);
      }
    },
  };
}
