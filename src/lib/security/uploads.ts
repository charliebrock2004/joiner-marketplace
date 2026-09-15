/**
 * File-upload validation for job photos.
 *
 * Rules:
 *  - Count and size are capped before anything is read into memory.
 *  - The content type is derived from the file's magic bytes, not from the
 *    client-supplied MIME type or extension, which are trivially spoofed.
 *  - Filenames are regenerated, so a malicious name cannot traverse a path.
 *
 * Files never become a public URL in V1; they are attached to the
 * notification email and to local development storage only.
 */
import type { SubmissionAttachment } from "@/lib/submissions/types";

export const MAX_FILES = 4;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic"];

type Signature = { type: string; ext: string; test: (bytes: Uint8Array) => boolean };

const startsWith = (bytes: Uint8Array, prefix: number[], offset = 0) =>
  prefix.every((byte, index) => bytes[offset + index] === byte);

const SIGNATURES: Signature[] = [
  { type: "image/jpeg", ext: "jpg", test: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  {
    type: "image/png",
    ext: "png",
    test: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    type: "image/webp",
    ext: "webp",
    // "RIFF" .... "WEBP"
    test: (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  },
  {
    type: "image/heic",
    ext: "heic",
    // ....ftyp + heic/heix/mif1 brand
    test: (b) =>
      startsWith(b, [0x66, 0x74, 0x79, 0x70], 4) &&
      ["heic", "heix", "mif1", "hevc"].some((brand) =>
        startsWith(b, [...brand].map((c) => c.charCodeAt(0)), 8),
      ),
  },
];

export type UploadError = { message: string };

export async function validateImageUploads(
  files: File[],
): Promise<{ attachments: SubmissionAttachment[] } | UploadError> {
  if (files.length === 0) return { attachments: [] };
  if (files.length > MAX_FILES) {
    return { message: `You can upload up to ${MAX_FILES} photos` };
  }

  const attachments: SubmissionAttachment[] = [];

  for (const [index, file] of files.entries()) {
    if (file.size === 0) continue;
    if (file.size > MAX_FILE_BYTES) {
      return { message: `Each photo must be under ${MAX_FILE_BYTES / (1024 * 1024)}MB` };
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const signature = SIGNATURES.find((candidate) => candidate.test(bytes));
    if (!signature) {
      return { message: "Photos must be JPG, PNG, WebP or HEIC images" };
    }

    attachments.push({
      // Regenerated name: nothing from the client survives into a path.
      filename: `photo-${index + 1}.${signature.ext}`,
      contentType: signature.type,
      content: Buffer.from(bytes).toString("base64"),
      size: file.size,
    });
  }

  return { attachments };
}
