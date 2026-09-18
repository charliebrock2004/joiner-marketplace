/**
 * Database access.
 *
 * Two drivers behind one interface:
 *
 *  - `pg` over DATABASE_URL — production (Supabase, Neon, any Postgres).
 *  - PGlite — an in-process build of Postgres used when DATABASE_URL is not
 *    set, so development and tests run with no external service. It speaks the
 *    same SQL, so queries written here behave identically in production.
 *
 * Every query goes through parameterised statements. Never interpolate user
 * input into SQL.
 *
 * This module deliberately omits the `server-only` guard so that CLI scripts
 * and tests can import it directly. The guard lives on the query modules in
 * ./queries, which are what application code imports.
 */

import { readDatabaseUrl } from "../env.ts";

export type QueryParam = string | number | boolean | Date | null | undefined | object;

export interface Database {
  query<T = Record<string, unknown>>(sql: string, params?: QueryParam[]): Promise<T[]>;
  /** Runs `fn` inside a transaction, rolling back if it throws. */
  transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T>;
  /** Executes raw multi-statement SQL. Migrations only — never user input. */
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

/* ------------------------------------------------------------------ pg ---- */

async function createPgDatabase(connectionString: string): Promise<Database> {
  const { Pool } = await import("pg");

  const isLocal = /\blocalhost\b|\b127\.0\.0\.1\b/.test(connectionString);

  /**
   * TLS.
   *
   * The connection carries database credentials and personal data across the
   * public internet, so the certificate chain is verified by default. Turning
   * verification off would let anyone who can intercept the connection read
   * all of it.
   *
   * If the provider's chain is not in node's trust store, supply its CA with
   * DATABASE_SSL_CA rather than disabling the check. DATABASE_SSL_NO_VERIFY
   * exists as a deliberate, documented escape hatch and is logged loudly.
   */
  let ssl: false | { rejectUnauthorized: boolean; ca?: string } = false;
  if (!isLocal) {
    if (process.env.DATABASE_SSL_NO_VERIFY === "true") {
      console.warn(
        "[db] DATABASE_SSL_NO_VERIFY is set — the database certificate is NOT " +
          "being verified. Prefer supplying the provider CA via DATABASE_SSL_CA.",
      );
      ssl = { rejectUnauthorized: false };
    } else {
      const ca = process.env.DATABASE_SSL_CA?.trim();
      ssl = ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
    }
  }

  const pool = new Pool({
    connectionString,
    ssl,
    /**
     * One connection per instance by default.
     *
     * On serverless each instance serves few concurrent requests but many
     * instances exist at once, so a large per-instance pool multiplies into
     * the provider's client limit for no benefit. A transaction pooler is
     * built for exactly this shape.
     */
    max: Number(process.env.DATABASE_POOL_MAX ?? 1),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  pool.on("error", (error) => {
    // A pooled connection dropped while idle. Log it rather than letting an
    // unhandled 'error' event take the process down.
    console.error("[db] idle client error", error.message);
  });

  type PgClient = { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>; release: () => void };

  const wrap = (runner: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }): Database => ({
    async query<T>(sql: string, params: QueryParam[] = []) {
      const result = await runner.query(sql, params);
      return result.rows as T[];
    },
    async transaction<T>(): Promise<T> {
      // A throw satisfies any return type; nesting would silently break
      // rollback semantics, so it is rejected rather than emulated.
      throw new Error("Nested transactions are not supported");
    },
    async exec(sql: string) {
      await runner.query(sql);
    },
    async close() {
      /* the pool owns the lifetime */
    },
  });

  return {
    async query<T>(sql: string, params: QueryParam[] = []) {
      const result = await pool.query(sql, params);
      return result.rows as T[];
    },
    async transaction<T>(fn: (tx: Database) => Promise<T>) {
      const client = (await pool.connect()) as unknown as PgClient;
      try {
        await client.query("begin");
        const result = await fn(wrap(client));
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
    async exec(sql: string) {
      await pool.query(sql);
    },
    async close() {
      await pool.end();
    },
  };
}

/* -------------------------------------------------------------- PGlite ---- */

async function createPgliteDatabase(dataDir: string | undefined): Promise<Database> {
  let PGlite: typeof import("@electric-sql/pglite").PGlite;
  try {
    ({ PGlite } = await import("@electric-sql/pglite"));
  } catch {
    throw new Error(
      "No database connection string found (checked DATABASE_URL and " +
        "database_url) and the local PGlite fallback is unavailable. " +
        "Set DATABASE_URL to a Postgres connection string.",
    );
  }

  const db = dataDir ? new PGlite(dataDir) : new PGlite();
  await db.waitReady;

  const wrap = (runner: typeof db): Database => ({
    async query<T>(sql: string, params: QueryParam[] = []) {
      const result = await runner.query(sql, params);
      return result.rows as T[];
    },
    async transaction<T>(): Promise<T> {
      // A throw satisfies any return type; nesting would silently break
      // rollback semantics, so it is rejected rather than emulated.
      throw new Error("Nested transactions are not supported");
    },
    async exec(sql: string) {
      await runner.exec(sql);
    },
    async close() {
      /* the outer instance owns the lifetime */
    },
  });

  return {
    async query<T>(sql: string, params: QueryParam[] = []) {
      const result = await db.query(sql, params);
      return result.rows as T[];
    },
    async transaction<T>(fn: (tx: Database) => Promise<T>) {
      // PGlite is single-connection, so an explicit BEGIN/COMMIT is the
      // equivalent of pg's dedicated client.
      await db.exec("begin");
      try {
        const result = await fn(wrap(db));
        await db.exec("commit");
        return result;
      } catch (error) {
        await db.exec("rollback").catch(() => {});
        throw error;
      }
    },
    async exec(sql: string) {
      await db.exec(sql);
    },
    async close() {
      await db.close();
    },
  };
}

/* ------------------------------------------------------------ resolver ---- */

let instance: Promise<Database> | null = null;

/** Where PGlite persists in development. Ignored when DATABASE_URL is set. */
export const LOCAL_DB_DIR = process.env.LOCAL_DATABASE_DIR ?? ".data/postgres";

/**
 * True when this process is running as a deployed application rather than a
 * developer machine or a test.
 */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

/**
 * Refuses the local fallback in production.
 *
 * Without this, a missing or misspelled DATABASE_URL would silently boot the
 * app on an in-process database. Every page would render, every signup would
 * appear to work, and all of it would vanish on the next cold start. Failing
 * to start is far better than losing real users' data quietly.
 */
function assertDatabaseConfigured(connectionString: string | undefined): void {
  if (!connectionString && isProductionRuntime()) {
    throw new Error(
      "No database connection string found (checked DATABASE_URL and " +
        "database_url). Refusing to start on the local PGlite fallback " +
        "in production — it is in-process and ephemeral, so all data would be " +
        "lost on the next cold start. Set DATABASE_URL to your Postgres " +
        "connection string.",
    );
  }
}

export async function getDb(): Promise<Database> {
  if (!instance) {
    const connectionString = readDatabaseUrl();
    assertDatabaseConfigured(connectionString);
    instance = connectionString
      ? createPgDatabase(connectionString)
      : createPgliteDatabase(LOCAL_DB_DIR);
  }
  return instance;
}

/** Test/CLI helper — builds an isolated database rather than the singleton. */
export async function createDatabase(
  options: { url?: string; dataDir?: string } = {},
): Promise<Database> {
  const connectionString = options.url ?? readDatabaseUrl();
  assertDatabaseConfigured(connectionString);
  return connectionString
    ? createPgDatabase(connectionString)
    : createPgliteDatabase(options.dataDir);
}

export function isUsingLocalDatabase(): boolean {
  return !readDatabaseUrl();
}
