/**
 * Database CLI.
 *
 *   npm run db:migrate   apply pending migrations
 *   npm run db:seed      apply migrations + reference data
 *   npm run db:demo      the above + demo data (development only)
 *   npm run db:reset     drop everything and rebuild (development only)
 *   npm run db:status    show applied/pending migrations
 *
 * Runs against DATABASE_URL when set, otherwise the local PGlite database.
 */
import { createDatabase, LOCAL_DB_DIR } from "../src/lib/db/client.ts";
import { migrate, pendingMigrations } from "../src/lib/db/migrate.ts";
import { seedReferenceData } from "../src/lib/db/reference-data.ts";
import { seedDemoData } from "../src/lib/db/demo-seed.ts";

const command = process.argv[2] ?? "migrate";
const usingLocal = !process.env.DATABASE_URL?.trim();
const log = (message: string) => console.log(`  ${message}`);

function assertLocalOnly(action: string): void {
  if (!usingLocal && process.env.ALLOW_DESTRUCTIVE_DB !== "yes") {
    throw new Error(
      `Refusing to ${action} a remote database. Set ALLOW_DESTRUCTIVE_DB=yes if you really mean it.`,
    );
  }
}

const db = await createDatabase({ dataDir: usingLocal ? LOCAL_DB_DIR : undefined });

console.log(`\ndatabase: ${usingLocal ? `local PGlite (${LOCAL_DB_DIR})` : "DATABASE_URL"}`);

try {
  switch (command) {
    case "status": {
      const pending = await pendingMigrations(db);
      const applied = await db.query<{ name: string; applied_at: string }>(
        "select name, applied_at from schema_migrations order by name",
      );
      console.log(`\napplied (${applied.length}):`);
      for (const row of applied) log(`${row.name}`);
      console.log(`\npending (${pending.length}):`);
      for (const name of pending) log(name);
      break;
    }

    case "reset": {
      assertLocalOnly("reset");
      console.log("\ndropping public schema");
      await db.exec("drop schema public cascade; create schema public;");
      const applied = await migrate(db, log);
      console.log(`applied ${applied.length} migration(s)`);
      const reference = await seedReferenceData(db);
      console.log(`reference data: ${reference.trades} trades, ${reference.categories} categories`);
      break;
    }

    case "migrate": {
      const applied = await migrate(db, log);
      console.log(applied.length ? `\napplied ${applied.length} migration(s)` : "\nup to date");
      break;
    }

    case "seed": {
      await migrate(db, log);
      const reference = await seedReferenceData(db);
      console.log(`\nreference data: ${reference.trades} trades, ${reference.categories} categories`);
      break;
    }

    case "demo": {
      await migrate(db, log);
      const reference = await seedReferenceData(db);
      console.log(`\nreference data: ${reference.trades} trades, ${reference.categories} categories`);
      const demo = await seedDemoData(db, log);
      console.log(`demo data: ${demo.users} users, ${demo.jobs} jobs`);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exitCode = 1;
  }
} finally {
  await db.close();
}

console.log("");
