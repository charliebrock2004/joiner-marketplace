import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { validateImageUploads, type UploadError } from "@/lib/security/uploads";
import { readBlobToken } from "@/lib/env.ts";
import type { SubmissionAttachment } from "@/lib/submissions/types";

/**
 * Image storage.
 *
 * Two drivers behind one function, mirroring the database and submission-sink
 * pattern:
 *
 *  - Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production).
 *  - The local filesystem otherwise, served back through /api/uploads, so
 *    development needs no cloud account.
 *
 * Every file is re-validated by magic bytes before it is stored and is given a
 * generated name, so a client-supplied filename or MIME type can never decide
 * where a file lands or how it is served.
 */

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

export type StoredImage = { url: string; size: number; contentType: string };

export function isBlobConfigured(): boolean {
  return Boolean(readBlobToken());
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

/**
 * Refuses the local-disk fallback in production.
 *
 * Serverless filesystems are ephemeral. Without Blob configured, an upload
 * would appear to succeed, the job or profile would show a photo, and the
 * image would 404 after the next deploy. An honest failure at upload time is
 * better than a listing that quietly loses its photos.
 */
function assertStorageConfigured(): void {
  if (!isBlobConfigured() && isProductionRuntime()) {
    throw new Error(
      "No Blob token found (checked BLOB_READ_WRITE_TOKEN and " +
        "blob_read_write_token). Refusing to write uploads to the local " +
        "filesystem in production — it is ephemeral, so photos would disappear " +
        "on the next deploy. Create a Vercel Blob store for this project.",
    );
  }
}

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

async function storeOne(
  attachment: SubmissionAttachment,
  prefix: string,
): Promise<StoredImage> {
  const extension = EXTENSION_BY_TYPE[attachment.contentType] ?? "bin";
  // Generated name: nothing user-controlled reaches the stored path.
  const key = `${prefix}/${randomUUID()}.${extension}`;
  const bytes = Buffer.from(attachment.content, "base64");

  const blobToken = readBlobToken();
  if (blobToken) {
    const { put } = await import("@vercel/blob");
    const result = await put(key, bytes, {
      access: "public",
      contentType: attachment.contentType,
      addRandomSuffix: false,
      // Passed explicitly rather than left to the SDK. @vercel/blob reads only
      // the exact key BLOB_READ_WRITE_TOKEN from the environment and throws if
      // it is absent, so a lowercase blob_read_write_token would fail at upload
      // time even though our own check had already passed.
      token: blobToken,
    });
    return { url: result.url, size: attachment.size, contentType: attachment.contentType };
  }

  const destination = path.join(LOCAL_UPLOAD_DIR, key);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return { url: `/api/uploads/${key}`, size: attachment.size, contentType: attachment.contentType };
}

/**
 * Validates and stores a set of uploaded images.
 *
 * `prefix` groups files (e.g. "jobs", "portfolio"). It is never taken from
 * user input.
 */
export async function storeImages(
  files: File[],
  prefix: "jobs" | "portfolio" | "avatars",
  limit: number,
): Promise<{ images: StoredImage[] } | UploadError> {
  const usable = files.filter((file) => file.size > 0);
  if (usable.length === 0) return { images: [] };
  if (usable.length > limit) return { message: `You can upload up to ${limit} photos` };

  try {
    assertStorageConfigured();
  } catch (error) {
    console.error("[storage]", error instanceof Error ? error.message : error);
    return { message: "Photo uploads are not available right now. Please try again later." };
  }

  const validated = await validateImageUploads(usable);
  if ("message" in validated) return validated;

  const images: StoredImage[] = [];
  for (const attachment of validated.attachments) {
    images.push(await storeOne(attachment, prefix));
  }
  return { images };
}

/**
 * Whether a stored URL is one we produced. Used before rendering an image so
 * a tampered database row cannot point the page at an arbitrary host.
 */
export function isTrustedImageUrl(url: string): boolean {
  if (url.startsWith("/api/uploads/")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
