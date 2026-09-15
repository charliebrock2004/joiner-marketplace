import { subjectFor, toHtml, toPlainText } from "../format";
import type { SubmissionSink } from "../types";

/**
 * Email notification via Resend's REST API.
 *
 * Called with `fetch` rather than the SDK on purpose: it is one HTTP call and
 * avoids another dependency. Swapping to Postmark/SES means editing this file
 * only.
 */
export function createEmailSink(config: {
  apiKey: string;
  to: string;
  from: string;
}): SubmissionSink {
  return {
    name: "email",
    durable: true,
    async deliver(record) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.from,
          to: [config.to],
          reply_to: typeof record.data.email === "string" ? record.data.email : undefined,
          subject: subjectFor(record),
          text: toPlainText(record),
          html: toHtml(record),
          attachments: record.attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
          })),
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Resend responded ${response.status}: ${body.slice(0, 200)}`);
      }
    },
  };
}
