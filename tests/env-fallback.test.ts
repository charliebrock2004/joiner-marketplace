import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";

/**
 * Environment-variable case fallback.
 *
 * Vercel's mobile dashboard can only create keys in lowercase, and process.env
 * on Linux is case-sensitive, so the app accepts both spellings. These tests
 * pin the priority order and — more importantly — prove that the production
 * safety guards still fire when neither spelling is present.
 *
 * No test asserts on a value that would be secret in production; the fixtures
 * below are obvious placeholders.
 */

const env = process.env as Record<string, string | undefined>;
const KEYS = [
  "NODE_ENV",
  "VERCEL",
  "DATABASE_URL",
  "database_url",
  "BLOB_READ_WRITE_TOKEN",
  "blob_read_write_token",
  "ALLOW_DEMO_SEED",
];
const original = Object.fromEntries(KEYS.map((k) => [k, env[k]]));

function clear() {
  for (const key of KEYS) delete env[key];
}

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete env[key];
    else env[key] = original[key];
  }
});

const UPPER_DB = "postgres://upper@example.invalid:6543/db";
const LOWER_DB = "postgres://lower@example.invalid:6543/db";

describe("readEnvVar priority", () => {
  test("prefers the uppercase name when both are set", async () => {
    clear();
    env.DATABASE_URL = UPPER_DB;
    env.database_url = LOWER_DB;

    const { readDatabaseUrl, readEnvVarSource, DATABASE_URL_KEYS } = await import("@/lib/env.ts");
    assert.equal(readDatabaseUrl(), UPPER_DB);
    assert.equal(readEnvVarSource(...DATABASE_URL_KEYS), "DATABASE_URL");
  });

  test("falls back to the lowercase name when only it is set", async () => {
    clear();
    env.database_url = LOWER_DB;

    const { readDatabaseUrl, readEnvVarSource, DATABASE_URL_KEYS } = await import("@/lib/env.ts");
    assert.equal(readDatabaseUrl(), LOWER_DB);
    assert.equal(readEnvVarSource(...DATABASE_URL_KEYS), "database_url");
  });

  test("treats empty and whitespace-only as unset, so a blank does not mask a good value", async () => {
    clear();
    env.DATABASE_URL = "   ";
    env.database_url = LOWER_DB;

    const { readDatabaseUrl } = await import("@/lib/env.ts");
    assert.equal(readDatabaseUrl(), LOWER_DB);
  });

  test("trims surrounding whitespace", async () => {
    clear();
    env.DATABASE_URL = `  ${UPPER_DB}  `;

    const { readDatabaseUrl } = await import("@/lib/env.ts");
    assert.equal(readDatabaseUrl(), UPPER_DB);
  });

  test("returns undefined when no spelling is set", async () => {
    clear();
    const { readDatabaseUrl, readBlobToken } = await import("@/lib/env.ts");
    assert.equal(readDatabaseUrl(), undefined);
    assert.equal(readBlobToken(), undefined);
  });
});

describe("lowercase database_url is accepted in production", () => {
  test("the production guard does not fire when only database_url is set", async () => {
    clear();
    env.NODE_ENV = "production";
    env.database_url = LOWER_DB;

    const { createDatabase } = await import("@/lib/db/client.ts");
    // Must resolve rather than being refused. pg builds its pool lazily and
    // does not dial the server until the first query, so a successful
    // construction is exactly the signal that the guard let us through.
    const db = await createDatabase({});
    assert.ok(db, "a lowercase database_url must satisfy the production database check");
    await db.close();
  });

  test("the guard still fires when neither spelling is set", async () => {
    clear();
    env.NODE_ENV = "production";

    const { createDatabase } = await import("@/lib/db/client.ts");
    await assert.rejects(() => createDatabase({}), /Refusing to start on the local PGlite/);
  });

  test("isUsingLocalDatabase respects the lowercase name", async () => {
    clear();
    const { isUsingLocalDatabase } = await import("@/lib/db/client.ts");
    assert.equal(isUsingLocalDatabase(), true, "no spelling set means local");

    env.database_url = LOWER_DB;
    assert.equal(isUsingLocalDatabase(), false, "lowercase must count as remote");
  });
});

describe("the demo-seed guard is not weakened by the fallback", () => {
  test("a lowercase database_url still blocks demo seeding", async () => {
    clear();
    env.database_url = LOWER_DB;

    const { assertDemoSeedAllowed } = await import("@/lib/db/demo-seed.ts");
    assert.throws(
      () => assertDemoSeedAllowed(),
      /Refusing to seed demo data/,
      "demo data must not reach a remote database named in lowercase",
    );
  });

  test("still allowed when no database is configured at all", async () => {
    clear();
    const { assertDemoSeedAllowed } = await import("@/lib/db/demo-seed.ts");
    assert.doesNotThrow(() => assertDemoSeedAllowed());
  });
});

describe("lowercase blob_read_write_token is accepted in production", () => {
  const jpeg = () =>
    new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00])], "photo.jpg", {
      type: "image/jpeg",
    });

  test("isBlobConfigured accepts either spelling", async () => {
    clear();
    const storage = await import("@/lib/storage/index.ts");
    assert.equal(storage.isBlobConfigured(), false);

    env.blob_read_write_token = "vercel_blob_rw_placeholder_store_lower";
    assert.equal(storage.isBlobConfigured(), true, "lowercase token must be recognised");

    delete env.blob_read_write_token;
    env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_placeholder_store_upper";
    assert.equal(storage.isBlobConfigured(), true);
  });

  test("the production storage guard does not fire when only the lowercase token is set", async () => {
    clear();
    env.NODE_ENV = "production";
    env.blob_read_write_token = "vercel_blob_rw_placeholder_store_lower";

    // A file that fails magic-byte validation. Validation runs *after* the
    // storage guard, so reaching the validation error proves the guard let us
    // through — without making a network call to Blob with a fake token.
    const notAnImage = new File([new TextEncoder().encode("plain text")], "notes.txt", {
      type: "text/plain",
    });

    const { storeImages } = await import("@/lib/storage/index.ts");
    const result = await storeImages([notAnImage], "jobs", 4);

    assert.ok("message" in result);
    const { message } = result as { message: string };
    assert.ok(
      !/not available right now/.test(message),
      "must not be refused by the no-token guard when a lowercase token exists",
    );
    assert.match(message, /JPG, PNG, WebP or HEIC/, "expected to reach image validation");
  });

  test("the storage guard still fires when neither spelling is set", async () => {
    clear();
    env.NODE_ENV = "production";

    const { storeImages } = await import("@/lib/storage/index.ts");
    const result = await storeImages([jpeg()], "jobs", 4);
    assert.ok("message" in result);
    assert.match((result as { message: string }).message, /not available right now/);
  });
});
