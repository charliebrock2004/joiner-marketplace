import { NextResponse } from "next/server";
import type { z } from "zod";
import { isInLaunchArea } from "@/lib/content/towns";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { createSubmission } from "@/lib/submissions/store";
import type { SubmissionKind, SubmissionRecord } from "@/lib/submissions/types";
import { toFieldErrors } from "@/lib/validation/shared";

export type SubmissionApiResponse =
  | { ok: true; id: string; inLaunchArea: boolean }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Rural areas often sit behind shared/CGNAT addresses, so leave headroom
// for genuine households while still stopping a flood.
const RATE_LIMIT = { max: 8, windowMs: 15 * 60 * 1000 };
const MAX_BODY_BYTES = 25 * 1024 * 1024;

/**
 * Turns multipart form data into a plain object, collapsing repeated keys
 * (checkbox groups) into arrays and pulling files out separately.
 */
function formDataToObject(formData: FormData): {
  data: Record<string, unknown>;
  files: File[];
} {
  const data: Record<string, unknown> = {};
  const files: File[] = [];

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      files.push(value);
      continue;
    }
    const existing = data[key];
    if (existing === undefined) {
      data[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      data[key] = [existing, value];
    }
  }

  return { data, files };
}

/** Normalise fields the schema expects as arrays but that arrive singular. */
function coerceArrays(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && !Array.isArray(value)) data[key] = [value];
  }
}

export type HandlerOptions<Schema extends z.ZodType> = {
  kind: SubmissionKind;
  schema: Schema;
  /** Keys that must always be treated as arrays (checkbox groups). */
  arrayFields?: string[];
  /** Optional attachment pipeline; only the job form uses this today. */
  handleFiles?: (
    files: File[],
  ) => Promise<{ attachments: SubmissionRecord["attachments"] } | { message: string }>;
};

export async function handleSubmission<Schema extends z.ZodType>(
  request: Request,
  options: HandlerOptions<Schema>,
): Promise<NextResponse<SubmissionApiResponse>> {
  // 1. Throttle before doing any real work.
  const limit = rateLimit(`${options.kind}:${clientKey(request)}`, RATE_LIMIT.max, RATE_LIMIT.windowMs);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many submissions from this connection. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "That request is too large." }, { status: 413 });
  }

  // 2. Parse whichever encoding the client used.
  let raw: Record<string, unknown>;
  let files: File[] = [];
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const parsed = formDataToObject(await request.formData());
      raw = parsed.data;
      files = parsed.files;
    } else {
      raw = (await request.json()) as Record<string, unknown>;
    }
  } catch {
    return NextResponse.json({ ok: false, error: "We couldn't read that submission." }, { status: 400 });
  }

  coerceArrays(raw, options.arrayFields ?? []);

  // 3. Honeypot: silently accept so bots do not learn they were caught, but
  //    store nothing.
  if (typeof raw.website === "string" && raw.website.trim() !== "") {
    return NextResponse.json({ ok: true, id: "ignored", inLaunchArea: false });
  }

  // 4. Server-side validation is authoritative.
  const parsed = options.schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const data = parsed.data as Record<string, unknown>;

  // 5. Attachments, validated by content rather than by filename.
  let attachments: SubmissionRecord["attachments"] = [];
  if (options.handleFiles && files.length > 0) {
    const result = await options.handleFiles(files);
    if ("message" in result) {
      return NextResponse.json(
        { ok: false, error: result.message, fieldErrors: { photos: result.message } },
        { status: 400 },
      );
    }
    attachments = result.attachments;
  }

  const postcode = typeof data.postcode === "string" ? data.postcode : "";

  const outcome = await createSubmission({
    kind: options.kind,
    data,
    attachments,
    meta: {
      inLaunchArea: isInLaunchArea(postcode),
      userAgent: request.headers.get("user-agent")?.slice(0, 200) ?? undefined,
      referer: request.headers.get("referer")?.slice(0, 200) ?? undefined,
    },
  });

  if (outcome.status === "unconfigured") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "We're not able to receive submissions right now. Please email us directly and we'll pick it up.",
      },
      { status: 503 },
    );
  }

  if (outcome.status === "failed") {
    return NextResponse.json(
      { ok: false, error: "Something went wrong saving that. Please try again in a moment." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: outcome.id,
    inLaunchArea: isInLaunchArea(postcode),
  });
}
