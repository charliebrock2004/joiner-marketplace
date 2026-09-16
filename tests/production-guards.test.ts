import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";

/**
 * Production safety guards.
 *
 * Each of these protects against a failure that would look like success:
 * demo data appearing in the live marketplace, the app booting on an ephemeral
 * database, or photos being written to a disk that does not survive a deploy.
 *
 * They are keyed on the *target* rather than on NODE_ENV, because the command
 * most likely to do damage — pointing a local shell at the production
 * database — runs with NODE_ENV unset.
 */

// @types/node marks NODE_ENV readonly; these tests deliberately simulate
// different runtimes, so they work through a mutable view.
const env = process.env as Record<string, string | undefined>;

const ENV_KEYS = ["NODE_ENV", "VERCEL", "DATABASE_URL", "BLOB_READ_WRITE_TOKEN", "ALLOW_DEMO_SEED"];
const original = Object.fromEntries(ENV_KEYS.map((k) => [k, env[k]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete env[key];
    else env[key] = original[key];
  }
});

describe("demo data cannot reach a remote database", () => {
  test("refuses when DATABASE_URL is set, even with NODE_ENV unset", async () => {
    delete env.NODE_ENV;
    delete env.ALLOW_DEMO_SEED;
    env.DATABASE_URL = "postgres://user:pw@remote.example.com:6543/db";

    const { seedDemoData } = await import("@/lib/db/demo-seed.ts");
    await assert.rejects(
      // The guard runs before any database work, so the argument is never used.
      () => seedDemoData({} as never),
      /Refusing to seed demo data/,
      "running db:demo against production must be refused",
    );
  });

  test("refuses on a deployed runtime", async () => {
    delete env.DATABASE_URL;
    delete env.ALLOW_DEMO_SEED;
    env.VERCEL = "1";

    const { seedDemoData } = await import("@/lib/db/demo-seed.ts");
    await assert.rejects(() => seedDemoData({} as never), /Refusing to seed demo data/);
  });

  test("still permitted against the local database", async () => {
    delete env.NODE_ENV;
    delete env.VERCEL;
    delete env.DATABASE_URL;

    const { seedDemoData } = await import("@/lib/db/demo-seed.ts");
    // It should get past the guard and fail later, on the empty stub database.
    await assert.rejects(
      () => seedDemoData({ query: async () => [] } as never),
      (error: Error) => !/Refusing to seed demo data/.test(error.message),
    );
  });
});

describe("the local database cannot be used in production", () => {
  test("refuses to start without DATABASE_URL when NODE_ENV is production", async () => {
    delete env.DATABASE_URL;
    env.NODE_ENV = "production";

    const { createDatabase } = await import("@/lib/db/client.ts");
    await assert.rejects(() => createDatabase({}), /Refusing to start on the local PGlite/);
  });

  test("refuses on Vercel even if NODE_ENV is unset", async () => {
    delete env.DATABASE_URL;
    delete env.NODE_ENV;
    env.VERCEL = "1";

    const { createDatabase } = await import("@/lib/db/client.ts");
    await assert.rejects(() => createDatabase({}), /Refusing to start on the local PGlite/);
  });
});

describe("photo uploads cannot land on an ephemeral disk in production", () => {
  const jpeg = () =>
    new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00])], "photo.jpg", {
      type: "image/jpeg",
    });

  test("refuses without a Blob token in production", async () => {
    delete env.BLOB_READ_WRITE_TOKEN;
    env.NODE_ENV = "production";

    const { storeImages } = await import("@/lib/storage/index.ts");
    const result = await storeImages([jpeg()], "jobs", 4);
    assert.ok("message" in result, "upload must fail rather than write to local disk");
  });

  test("still writes locally in development", async () => {
    delete env.BLOB_READ_WRITE_TOKEN;
    delete env.NODE_ENV;
    delete env.VERCEL;

    const { storeImages } = await import("@/lib/storage/index.ts");
    const result = await storeImages([jpeg()], "jobs", 4);
    assert.ok("images" in result, "local development must keep working with no cloud account");
  });
});
