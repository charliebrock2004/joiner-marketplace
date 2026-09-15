import type { SubmissionSink } from "../types";

/**
 * Development visibility. Never counted as durable, so it can never make a
 * production submission look successful when nothing was stored.
 */
export const consoleSink: SubmissionSink = {
  name: "console",
  durable: false,
  async deliver(record) {
    const { attachments, ...rest } = record;
    console.info(
      `[submission:${record.kind}] ${record.id}`,
      JSON.stringify({ ...rest, attachmentCount: attachments.length }, null, 2),
    );
  },
};
