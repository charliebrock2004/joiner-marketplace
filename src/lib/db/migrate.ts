import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { Database } from "./client.ts";

/**
 * Migration runner.
 *
 * Migrations are plain .sql files applied in filename order and recorded in
 * `schema_migrations`, so re-running is a no-op. Each file runs inside a
 * transaction: a failure leaves the database untouched rather than half
 * migrated.
 *
 * This reads from the filesystem, so it is driven by the CLI (`npm run
 * db:migrate`) and by the local development auto-migrate. It is never invoked
 * from a request handler in production.
 */

const MIGRATIONS_DIR = path.join(process.cwd(), "src", "lib", "db", "migrations");

async function ensureMigrationsTable(db: Database): Promise<void> {
  await db.exec(`
    create table if not exists schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

export async function pendingMigrations(db: Database): Promise<string[]> {
  await ensureMigrationsTable(db);
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const applied = await db.query<{ name: string }>("select name from schema_migrations");
  const appliedNames = new Set(applied.map((row) => row.name));
  return files.filter((file) => !appliedNames.has(file));
}

export async function migrate(
  db: Database,
  log: (message: string) => void = () => {},
): Promise<string[]> {
  const pending = await pendingMigrations(db);

  for (const file of pending) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    log(`applying ${file}`);
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query("insert into schema_migrations (name) values ($1)", [file]);
    });
  }

  return pending;
}
