import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isBlobConfigured } from "@/lib/storage";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

/**
 * Serves locally stored uploads in development.
 *
 * In production Vercel Blob serves files directly, so this route refuses to
 * run — it exists only so development works without a cloud account.
 *
 * The resolved path is checked to be inside the upload directory, so a
 * traversal attempt (`..%2f..%2fetc%2fpasswd`) cannot escape it.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (isBlobConfigured()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { path: segments } = await params;
  const requested = path.join(UPLOAD_DIR, ...segments);
  const resolved = path.resolve(requested);

  if (resolved !== UPLOAD_DIR && !resolved.startsWith(UPLOAD_DIR + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const extension = path.extname(resolved).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) return new NextResponse("Not found", { status: 404 });

  try {
    const file = await readFile(resolved);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
