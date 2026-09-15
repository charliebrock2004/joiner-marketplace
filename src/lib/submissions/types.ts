export type SubmissionKind = "job" | "joiner" | "waitlist";

export type SubmissionAttachment = {
  filename: string;
  contentType: string;
  /** Base64-encoded bytes. Kept in memory only; never written to a public path. */
  content: string;
  size: number;
};

/**
 * The canonical shape that leaves the application. Every sink receives this,
 * so adding Postgres later means writing one more sink — not rewriting the
 * API routes.
 */
export type SubmissionRecord = {
  id: string;
  kind: SubmissionKind;
  createdAt: string;
  /** Validated, normalised payload from the relevant Zod schema. */
  data: Record<string, unknown>;
  attachments: SubmissionAttachment[];
  meta: {
    /** Coarse signal only — we do not persist raw IPs in the record. */
    inLaunchArea: boolean;
    userAgent?: string;
    referer?: string;
  };
};

export type SinkResult = { sink: string; ok: boolean; error?: string };

export type SubmissionSink = {
  name: string;
  /**
   * A durable sink is one we would trust to not lose a real customer's job.
   * Console logging is not durable. Local files are durable in development
   * only, because serverless filesystems are ephemeral.
   */
  durable: boolean;
  deliver(record: SubmissionRecord): Promise<void>;
};
