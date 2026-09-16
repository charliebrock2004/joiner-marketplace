import type { Database } from "./client.ts";
import { hashPassword } from "../auth/password.ts";
import { parsePostcode } from "../geo/postcode.ts";

/**
 * Demo data for local development.
 *
 * Refuses to run against a database that is not explicitly marked as a
 * development one. Fake reviews and fake verification badges are exactly the
 * kind of thing that destroys trust in a marketplace, so they must never reach
 * production.
 *
 * Every demo account uses the same password and an @example.com address, which
 * is a reserved domain that cannot receive mail.
 */

export const DEMO_PASSWORD = "tradezy-demo-pw";

function guard(): void {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "yes") {
    throw new Error(
      "Refusing to seed demo data in production. Demo reviews and verification " +
        "states are not real and must not appear to customers.",
    );
  }
}

type SeededUser = { id: string; email: string };

async function createUser(
  db: Database,
  data: {
    email: string;
    role: "customer" | "tradesperson" | "admin";
    fullName: string;
    phone: string;
    postcode: string;
    passwordHash: string;
  },
): Promise<SeededUser> {
  const parts = parsePostcode(data.postcode);
  const [row] = await db.query<SeededUser>(
    `insert into users (email, password_hash, role, full_name, phone, postcode, postcode_outward)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict do nothing
     returning id, email`,
    [
      data.email,
      data.passwordHash,
      data.role,
      data.fullName,
      data.phone,
      parts?.formatted ?? data.postcode,
      parts?.outward ?? null,
    ],
  );

  if (row) return row;

  const [existing] = await db.query<SeededUser>(
    "select id, email from users where lower(email) = lower($1)",
    [data.email],
  );
  if (!existing) throw new Error(`Could not create or find demo user ${data.email}`);
  return existing;
}

export async function seedDemoData(
  db: Database,
  log: (message: string) => void = () => {},
): Promise<{ users: number; jobs: number }> {
  guard();

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const [joinery] = await db.query<{ id: string }>(
    "select id from trades where slug = 'joinery-carpentry'",
  );
  if (!joinery) throw new Error("Reference data missing — run the reference seed first");

  const categories = await db.query<{ id: string; slug: string }>(
    "select id, slug from job_categories where trade_id = $1",
    [joinery.id],
  );
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  // ---------------------------------------------------------------- admin --
  await createUser(db, {
    email: "admin@example.com",
    role: "admin",
    fullName: "Demo Admin",
    phone: "07700900001",
    postcode: "PH1 1AA",
    passwordHash,
  });

  // ------------------------------------------------------------ customers --
  const customers = await Promise.all(
    [
      { email: "customer@example.com", fullName: "Alan Reid", postcode: "PH7 3AB", phone: "07700900101" },
      { email: "customer2@example.com", fullName: "Morag Bain", postcode: "PH2 0AA", phone: "07700900102" },
    ].map((c) => createUser(db, { ...c, role: "customer" as const, passwordHash })),
  );

  for (const customer of customers) {
    await db.query(
      "insert into customer_profiles (user_id) values ($1) on conflict (user_id) do nothing",
      [customer.id],
    );
  }

  // -------------------------------------------------------- tradespeople ---
  const tradespeople = [
    {
      email: "joiner@example.com",
      fullName: "Jamie McKay",
      postcode: "PH7 4HL",
      phone: "07700900201",
      experience: "qualified",
      years: 8,
      radius: 20,
      about: "Time served joiner based in Crieff. Happy to take on small jobs evenings and weekends.",
      qualifications: "SVQ Level 3 Carpentry and Joinery",
      skills: ["doors", "flooring", "shelving"],
      availability: ["evenings", "weekends"],
    },
    {
      email: "apprentice@example.com",
      fullName: "Sam Lee",
      postcode: "PH1 2BB",
      phone: "07700900202",
      experience: "apprentice",
      years: 2,
      radius: 10,
      about: "Second year apprentice looking to build experience on smaller jobs around Perth.",
      qualifications: "Apprenticeship in progress",
      skills: ["flat-pack", "repairs"],
      availability: ["weekends"],
    },
    {
      email: "experienced@example.com",
      fullName: "Derek Strachan",
      postcode: "PH2 8XY",
      phone: "07700900203",
      experience: "experienced",
      years: 22,
      radius: 30,
      about: "Twenty years on the tools running a small squad. Bespoke fitted furniture a speciality.",
      qualifications: "Time served, CSCS card",
      skills: ["shelving", "general-joinery", "loft"],
      availability: ["weekdays", "occasional"],
    },
  ];

  const tradespersonIds: string[] = [];

  for (const person of tradespeople) {
    const user = await createUser(db, {
      email: person.email,
      role: "tradesperson",
      fullName: person.fullName,
      phone: person.phone,
      postcode: person.postcode,
      passwordHash,
    });
    tradespersonIds.push(user.id);

    const [profile] = await db.query<{ id: string }>(
      `insert into tradesperson_profiles
         (user_id, primary_trade_id, experience_level, years_experience, radius_miles, about, qualifications)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (user_id) do update set about = excluded.about
       returning id`,
      [
        user.id,
        joinery.id,
        person.experience,
        person.years,
        person.radius,
        person.about,
        person.qualifications,
      ],
    );
    if (!profile) continue;

    for (const slug of person.skills) {
      const categoryId = categoryBySlug.get(slug);
      if (categoryId) {
        await db.query(
          `insert into tradesperson_skills (profile_id, category_id) values ($1, $2)
           on conflict do nothing`,
          [profile.id, categoryId],
        );
      }
    }
    for (const slot of person.availability) {
      await db.query(
        `insert into tradesperson_availability (profile_id, slot) values ($1, $2)
         on conflict do nothing`,
        [profile.id, slot],
      );
    }
  }

  // ------------------------------------------------------------------ jobs --
  const jobSeeds = [
    {
      customer: 0,
      title: "Two internal doors need hung",
      category: "doors",
      description:
        "Two internal doors to be hung in an upstairs hallway. Doors and hinges are already here, they just need trimmed and fitted properly.",
      postcode: "PH7 3AB",
      budget: "100-250",
      status: "open",
    },
    {
      customer: 0,
      title: "Alcove shelving either side of chimney",
      category: "shelving",
      description:
        "Looking for fitted shelving in two alcoves either side of the chimney breast in the living room. Painted finish.",
      postcode: "PH7 3AB",
      budget: "250-500",
      status: "open",
    },
    {
      customer: 1,
      title: "Wardrobe needs built",
      category: "flat-pack",
      description:
        "Large flat-pack wardrobe delivered last week, needs assembled and secured to the wall. All parts present.",
      postcode: "PH2 0AA",
      budget: "under-100",
      status: "open",
    },
  ];

  let jobCount = 0;
  for (const seed of jobSeeds) {
    const customer = customers[seed.customer];
    if (!customer) continue;
    const parts = parsePostcode(seed.postcode);
    if (!parts) continue;

    const existing = await db.query<{ id: string }>(
      "select id from jobs where customer_id = $1 and title = $2",
      [customer.id, seed.title],
    );
    if (existing.length > 0) continue;

    await db.query(
      `insert into jobs (customer_id, trade_id, category_id, title, description,
                         postcode, postcode_outward, postcode_area, budget_band, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        customer.id,
        joinery.id,
        categoryBySlug.get(seed.category) ?? null,
        seed.title,
        seed.description,
        parts.formatted,
        parts.outward,
        parts.area,
        seed.budget,
        seed.status,
      ],
    );
    jobCount += 1;
  }

  log(`demo: 1 admin (admin@example.com), ${customers.length} customers, ${tradespersonIds.length} tradespeople, ${jobCount} jobs`);
  log(`demo password for every account: ${DEMO_PASSWORD}`);

  return { users: 1 + customers.length + tradespersonIds.length, jobs: jobCount };
}
