import type { Database } from "./client.ts";

/**
 * Reference data: the trades taxonomy and the job categories inside each.
 *
 * This is real production data, not demo content — the marketplace cannot
 * function without it. It is idempotent, so re-running only fills gaps and
 * updates labels; it never deletes a trade that jobs may reference.
 *
 * Joinery leads because that is where the network is being built first, but
 * nothing in the schema or the UI is hard-coded to it.
 */

export type TradeSeed = {
  slug: string;
  name: string;
  description: string;
  categories: { slug: string; name: string; blurb: string }[];
};

export const TRADES: TradeSeed[] = [
  {
    slug: "joinery-carpentry",
    name: "Joinery & carpentry",
    description: "Doors, flooring, shelving, skirting and general work in timber",
    categories: [
      { slug: "doors", name: "Doors", blurb: "Hanging, trimming, sticking doors and handles" },
      { slug: "flooring", name: "Flooring", blurb: "Laminate, engineered wood and LVT" },
      { slug: "skirting-architrave", name: "Skirting & architrave", blurb: "Fitting, replacing and making good" },
      { slug: "shelving", name: "Shelving & storage", blurb: "Alcove shelves, floating shelves, cupboards" },
      { slug: "flat-pack", name: "Flat-pack assembly", blurb: "Wardrobes, units and furniture built properly" },
      { slug: "repairs", name: "Repairs", blurb: "Sticking windows, rotten frames, small fixes" },
      { slug: "loft", name: "Attic & loft work", blurb: "Loft hatches, ladders, boarding out" },
      { slug: "general-joinery", name: "General joinery", blurb: "Bespoke small jobs and anything else in timber" },
    ],
  },
  {
    slug: "building",
    name: "Building",
    description: "Brickwork, plastering, groundwork and structural jobs",
    categories: [
      { slug: "brickwork", name: "Brickwork & stonework", blurb: "Walls, repointing, repairs" },
      { slug: "plastering", name: "Plastering", blurb: "Skimming, patching, rendering" },
      { slug: "tiling", name: "Tiling", blurb: "Walls and floors" },
      { slug: "general-building", name: "General building", blurb: "Anything else on the tools" },
    ],
  },
  {
    slug: "electrical",
    name: "Electrical",
    description: "Sockets, lighting, consumer units and testing",
    categories: [
      { slug: "sockets-switches", name: "Sockets & switches", blurb: "Adding, moving, replacing" },
      { slug: "lighting", name: "Lighting", blurb: "Indoor and outdoor lighting" },
      { slug: "consumer-unit", name: "Consumer units", blurb: "Fuse boards and upgrades" },
      { slug: "electrical-testing", name: "Testing & certificates", blurb: "EICR and safety checks" },
      { slug: "general-electrical", name: "General electrical", blurb: "Other electrical work" },
    ],
  },
  {
    slug: "plumbing",
    name: "Plumbing & heating",
    description: "Leaks, bathrooms, radiators and boilers",
    categories: [
      { slug: "leaks-repairs", name: "Leaks & repairs", blurb: "Dripping taps, burst pipes, blockages" },
      { slug: "bathrooms", name: "Bathrooms", blurb: "Suites, showers, basins" },
      { slug: "radiators", name: "Radiators & heating", blurb: "Fitting, moving, balancing" },
      { slug: "general-plumbing", name: "General plumbing", blurb: "Other plumbing work" },
    ],
  },
  {
    slug: "roofing",
    name: "Roofing",
    description: "Tiles, flat roofs, gutters and leaks",
    categories: [
      { slug: "roof-repairs", name: "Roof repairs", blurb: "Slipped tiles, leaks, flashing" },
      { slug: "gutters", name: "Gutters & downpipes", blurb: "Clearing, repairing, replacing" },
      { slug: "flat-roofing", name: "Flat roofing", blurb: "Felt, EPDM, GRP" },
      { slug: "general-roofing", name: "General roofing", blurb: "Other roofing work" },
    ],
  },
  {
    slug: "painting-decorating",
    name: "Painting & decorating",
    description: "Interior and exterior painting, wallpapering",
    categories: [
      { slug: "interior-painting", name: "Interior painting", blurb: "Rooms, ceilings, woodwork" },
      { slug: "exterior-painting", name: "Exterior painting", blurb: "Render, woodwork, fascias" },
      { slug: "wallpapering", name: "Wallpapering", blurb: "Hanging and stripping" },
      { slug: "general-decorating", name: "General decorating", blurb: "Other decorating work" },
    ],
  },
  {
    slug: "landscaping",
    name: "Landscaping & gardening",
    description: "Fencing, decking, paving and garden work",
    categories: [
      { slug: "fencing", name: "Fencing & gates", blurb: "Panels, posts, gates" },
      { slug: "decking", name: "Decking", blurb: "Building and repairing" },
      { slug: "paving", name: "Paving & patios", blurb: "Slabs, blocks, paths" },
      { slug: "garden-maintenance", name: "Garden maintenance", blurb: "Clearance, hedges, turfing" },
    ],
  },
  {
    slug: "handyman",
    name: "Handyman",
    description: "Small mixed jobs around the house",
    categories: [
      { slug: "odd-jobs", name: "Odd jobs", blurb: "The list on the fridge door" },
      { slug: "mounting", name: "Mounting & fixing", blurb: "TVs, shelves, blinds, curtain poles" },
      { slug: "assembly", name: "Assembly", blurb: "Furniture and equipment" },
    ],
  },
  {
    slug: "other",
    name: "Other trade",
    description: "Anything that does not fit the categories above",
    categories: [{ slug: "other-work", name: "Other work", blurb: "Tell us what you need" }],
  },
];

/**
 * Inserts or updates the taxonomy. Safe to run on every deploy and safe to run
 * against production.
 */
export async function seedReferenceData(db: Database): Promise<{ trades: number; categories: number }> {
  let categoryCount = 0;

  for (const [index, trade] of TRADES.entries()) {
    const [row] = await db.query<{ id: string }>(
      `insert into trades (slug, name, description, sort_order)
       values ($1, $2, $3, $4)
       on conflict (slug) do update
         set name = excluded.name,
             description = excluded.description,
             sort_order = excluded.sort_order
       returning id`,
      [trade.slug, trade.name, trade.description, index],
    );
    if (!row) throw new Error(`Failed to upsert trade ${trade.slug}`);

    for (const [categoryIndex, category] of trade.categories.entries()) {
      await db.query(
        `insert into job_categories (trade_id, slug, name, blurb, sort_order)
         values ($1, $2, $3, $4, $5)
         on conflict (trade_id, slug) do update
           set name = excluded.name,
               blurb = excluded.blurb,
               sort_order = excluded.sort_order`,
        [row.id, category.slug, category.name, category.blurb, categoryIndex],
      );
      categoryCount += 1;
    }
  }

  return { trades: TRADES.length, categories: categoryCount };
}
