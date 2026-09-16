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

  const pool = new Pool({
    connectionString,
    // Hosted Postgres (Supabase/Neon) terminates TLS with its own chain.
    ssl: /\blocalhost\b|\b127\.0\.0\.1\b/.test(connectionString)
      ? undefined
      : { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
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
      "DATABASE_URL is not set and the local PGlite fallback is unavailable. " +
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

export function getDb(): Promise<Database> {
  if (!instance) {
    const connectionString = process.env.DATABASE_URL?.trim();
    instance = connectionString
      ? createPgDatabase(connectionString)
      : createPgliteDatabase(LOCAL_DB_DIR);
  }
  return instance;
}

/** Test/CLI helper — builds an isolated database rather than the singleton. */
export function createDatabase(options: { url?: string; dataDir?: string } = {}): Promise<Database> {
  const connectionString = options.url ?? process.env.DATABASE_URL?.trim();
  return connectionString
    ? createPgDatabase(connectionString)
    : createPgliteDatabase(options.dataDir);
}

export function isUsingLocalDatabase(): boolean {
  return !process.env.DATABASE_URL?.trim();
}
