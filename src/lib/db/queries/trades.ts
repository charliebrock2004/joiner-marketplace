import "server-only";

import { getDb } from "../client.ts";

export type Trade = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type JobCategory = {
  id: string;
  trade_id: string;
  slug: string;
  name: string;
  blurb: string | null;
};

export async function listTrades(): Promise<Trade[]> {
  const db = await getDb();
  return db.query<Trade>(
    "select id, slug, name, description from trades where is_active order by sort_order, name",
  );
}

export async function listCategories(): Promise<JobCategory[]> {
  const db = await getDb();
  return db.query<JobCategory>(
    `select id, trade_id, slug, name, blurb from job_categories
      where is_active order by sort_order, name`,
  );
}

export async function getTradeBySlug(slug: string): Promise<Trade | null> {
  const db = await getDb();
  const [row] = await db.query<Trade>(
    "select id, slug, name, description from trades where slug = $1 and is_active",
    [slug],
  );
  return row ?? null;
}

/** Validates that a category really belongs to the trade it was submitted with. */
export async function categoryBelongsToTrade(
  categoryId: string,
  tradeId: string,
): Promise<boolean> {
  const db = await getDb();
  const rows = await db.query("select 1 from job_categories where id = $1 and trade_id = $2", [
    categoryId,
    tradeId,
  ]);
  return rows.length > 0;
}
