/**
 * Environment variable lookup with deterministic case fallback.
 *
 * Why this exists: Vercel's mobile dashboard can only create environment
 * variable keys in lowercase, and `process.env` on Linux is case-sensitive, so
 * `DATABASE_URL` and `database_url` are entirely different keys. Rather than
 * leave the deployment depending on which device the variable was added from,
 * the app reads a short, explicit list of accepted names.
 *
 * Rules:
 *  - Names are tried strictly in the order given. The conventional uppercase
 *    name always comes first, so a correctly cased variable always wins.
 *  - A value that is missing, empty or only whitespace counts as unset, so a
 *    blank variable falls through to the next name rather than masking it.
 *  - Values are trimmed. Nothing here ever logs or returns a value in an
 *    error message — only key names, which are not secret.
 *
 * IMPORTANT: this helper indexes `process.env` dynamically, which Next.js
 * cannot statically replace when bundling for the browser. It is therefore for
 * server-only modules. Client-reachable code (see lib/config/site.ts) must
 * keep literal `process.env.NEXT_PUBLIC_*` property accesses so that Next can
 * inline them.
 */

/** The first non-empty value among `names`, trimmed. */
export function readEnvVar(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return undefined;
}

/** Which of `names` supplied the value, for diagnostics. Never the value. */
export function readEnvVarSource(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim() !== "") return name;
  }
  return undefined;
}

/**
 * Accepted spellings, in priority order. Declared in one place so the database
 * client, the demo-seed guard and the CLI cannot drift apart — a guard that
 * checked fewer names than the client would be a hole, not an inconvenience.
 */
export const DATABASE_URL_KEYS = ["DATABASE_URL", "database_url"] as const;
export const BLOB_TOKEN_KEYS = ["BLOB_READ_WRITE_TOKEN", "blob_read_write_token"] as const;

export function readDatabaseUrl(): string | undefined {
  return readEnvVar(...DATABASE_URL_KEYS);
}

export function readBlobToken(): string | undefined {
  return readEnvVar(...BLOB_TOKEN_KEYS);
}
