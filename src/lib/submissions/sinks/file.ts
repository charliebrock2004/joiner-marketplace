import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SubmissionSink } from "../types";

const DATA_DIR = path.join(process.cwd(), ".data");

/**
 * Local JSONL log, used while developing so the forms are genuinely working
 * end to end without any third-party account.
 *
 * Marked durable only outside production: on Vercel the filesystem is
 * read-only/ephemeral, so relying on it in production would silently lose
 * submissions.
 */
export const fileSink: SubmissionSink = {
  name: "file",
  durable: process.env.NODE_ENV !== "production",
  async deliver(record) {
    await mkdir(DATA_DIR, { recursive: true });

    // Photos are written beside the log rather than inlined, to keep the
    // JSONL readable.
    for (const [index, attachment] of record.attachments.entries()) {
      const safeName = `${record.id}-${index}-${attachment.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await writeFile(path.join(DATA_DIR, safeName), Buffer.from(attachment.content, "base64"));
    }

    const line = JSON.stringify({
      ...record,
      attachments: record.attachments.map((a) => ({
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
      })),
    });
    await appendFile(path.join(DATA_DIR, "submissions.jsonl"), `${line}\n`, "utf8");
  },
};
