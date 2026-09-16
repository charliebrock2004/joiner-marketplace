import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Marketplace invariants.
 *
 * These run against a real Postgres (PGlite) in a throwaway directory, so they
 * exercise the actual SQL — constraints included — rather than a mock.
 *
 * The rules covered here are the ones that protect the marketplace: who may
 * apply, who may review, who may read a conversation, and what a job status is
 * allowed to do next. A regression in any of them is a security or trust bug,
 * not a cosmetic one.
 */

let dataDir: string;

// getDb() reads this on first use, so it must be set before anything imports.
before(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "tradezy-test-"));
  process.env.LOCAL_DATABASE_DIR = dataDir;
  delete process.env.DATABASE_URL;
});

after(async () => {
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

/* ------------------------------------------------------------ pure logic -- */

describe("postcode matching", () => {
  test("parses full and partial postcodes", async () => {
    const { parsePostcode } = await import("@/lib/geo/postcode.ts");
    assert.deepEqual(parsePostcode("ph7 3ab"), {
      formatted: "PH7 3AB",
      outward: "PH7",
      area: "PH",
    });
    // The inward code must not be swallowed by a greedy outward match.
    assert.equal(parsePostcode("PH73AB")?.outward, "PH7");
    assert.equal(parsePostcode("FK15 9XY")?.outward, "FK15");
    assert.equal(parsePostcode("PH7")?.outward, "PH7");
    assert.equal(parsePostcode("nonsense"), null);
    assert.equal(parsePostcode(""), null);
  });

  test("radius tiers never cross a postcode area", async () => {
    const { parsePostcode, isWithinRadius } = await import("@/lib/geo/postcode.ts");
    const crieff = parsePostcode("PH7 3AB")!;
    const alsoCrieff = parsePostcode("PH7 4HL")!;
    const perth = parsePostcode("PH2 0AA")!;
    const glasgow = parsePostcode("G12 8QQ")!;

    // Same district always matches, even on the smallest radius.
    assert.equal(isWithinRadius(crieff, alsoCrieff, 5), true);
    // Wider area needs a traveller.
    assert.equal(isWithinRadius(crieff, perth, 5), false);
    assert.equal(isWithinRadius(crieff, perth, 20), true);
    // A different postcode area never matches, however far they travel.
    assert.equal(isWithinRadius(crieff, glasgow, 100), false);
  });
});

describe("passwords", () => {
  test("hashes verify, wrong passwords fail, hashes are salted", async () => {
    const { hashPassword, verifyPassword } = await import("@/lib/auth/password.ts");
    const hash = await hashPassword("a-long-enough-password");

    assert.equal(await verifyPassword("a-long-enough-password", hash), true);
    assert.equal(await verifyPassword("a-long-enough-passwore", hash), false);
    assert.equal(await verifyPassword("", hash), false);

    // Same password must not produce the same hash.
    const second = await hashPassword("a-long-enough-password");
    assert.notEqual(hash, second);
  });

  test("malformed or hostile stored hashes are rejected, not thrown on", async () => {
    const { verifyPassword } = await import("@/lib/auth/password.ts");
    for (const bad of ["", "nonsense", "scrypt$1$2$3", "scrypt$99999999$8$1$aaaa$bbbb", "md5$x$y$z$a$b"]) {
      assert.equal(await verifyPassword("anything", bad), false, `should reject: ${bad}`);
    }
  });
});

describe("job status transitions", () => {
  test("only legal moves are allowed", async () => {
    const { canCustomerTransition } = await import("@/lib/db/queries/jobs.ts");

    assert.equal(canCustomerTransition("draft", "open"), true);
    assert.equal(canCustomerTransition("accepted", "in_progress"), true);
    assert.equal(canCustomerTransition("in_progress", "completed"), true);

    // A job must not jump straight to completed — that would unlock reviews
    // for work that was never accepted or started.
    assert.equal(canCustomerTransition("open", "completed"), false);
    assert.equal(canCustomerTransition("draft", "completed"), false);
    assert.equal(canCustomerTransition("applications", "accepted"), false);
    // Terminal states are terminal.
    assert.equal(canCustomerTransition("completed", "in_progress"), false);
    assert.equal(canCustomerTransition("cancelled", "open"), false);
  });
});

/* --------------------------------------------------------------- the db --- */

describe("database invariants", () => {
  let db: Awaited<ReturnType<typeof import("@/lib/db/client.ts").getDb>>;
  let customerId: string;
  let otherCustomerId: string;
  let tradespersonId: string;
  let otherTradespersonId: string;
  let tradeId: string;

  before(async () => {
    const { getDb } = await import("@/lib/db/client.ts");
    const { migrate } = await import("@/lib/db/migrate.ts");
    const { seedReferenceData } = await import("@/lib/db/reference-data.ts");

    db = await getDb();
    await migrate(db);
    await seedReferenceData(db);

    const [trade] = await db.query<{ id: string }>(
      "select id from trades where slug = 'joinery-carpentry'",
    );
    tradeId = trade!.id;

    const makeUser = async (email: string, role: string) => {
      const [row] = await db.query<{ id: string }>(
        `insert into users (email, password_hash, role, full_name, postcode, postcode_outward)
         values ($1, 'x', $2, $3, 'PH7 3AB', 'PH7') returning id`,
        [email, role, email.split("@")[0]],
      );
      return row!.id;
    };

    customerId = await makeUser("c1@example.com", "customer");
    otherCustomerId = await makeUser("c2@example.com", "customer");
    tradespersonId = await makeUser("t1@example.com", "tradesperson");
    otherTradespersonId = await makeUser("t2@example.com", "tradesperson");
  });

  const makeJob = async (ownerId: string, status = "open") => {
    const [row] = await db.query<{ id: string }>(
      `insert into jobs (customer_id, trade_id, title, description, postcode,
                         postcode_outward, postcode_area, status, accepted_tradesperson_id)
       values ($1, $2, 'Test job', 'A description long enough to be valid.', 'PH7 3AB',
               'PH7', 'PH', $3, $4)
       returning id`,
      [
        ownerId,
        tradeId,
        status,
        ["accepted", "in_progress", "completed"].includes(status) ? tradespersonId : null,
      ],
    );
    return row!.id;
  };

  test("emails are unique regardless of case", async () => {
    await assert.rejects(
      db.query(
        `insert into users (email, password_hash, role, full_name) values ($1,'x','customer','Dupe')`,
        ["C1@EXAMPLE.COM"],
      ),
      /unique|duplicate/i,
    );
  });

  test("a tradesperson cannot apply to the same job twice", async () => {
    const { createApplication } = await import("@/lib/db/queries/applications.ts");
    const jobId = await makeJob(customerId);

    const first = await createApplication({ jobId, tradespersonId, message: null, quoteAmount: null });
    assert.equal(first.ok, true);

    const second = await createApplication({ jobId, tradespersonId, message: null, quoteAmount: null });
    assert.equal(second.ok, false);
  });

  test("a customer cannot apply to their own job", async () => {
    const { createApplication } = await import("@/lib/db/queries/applications.ts");
    const jobId = await makeJob(customerId);
    const result = await createApplication({
      jobId,
      tradespersonId: customerId,
      message: null,
      quoteAmount: null,
    });
    assert.equal(result.ok, false);
  });

  test("applications are refused once a job is no longer open", async () => {
    const { createApplication } = await import("@/lib/db/queries/applications.ts");
    const jobId = await makeJob(customerId, "completed");
    const result = await createApplication({ jobId, tradespersonId, message: null, quoteAmount: null });
    assert.equal(result.ok, false);
  });

  test("accepting an applicant declines the others and opens one conversation", async () => {
    const { createApplication, acceptApplication } = await import("@/lib/db/queries/applications.ts");
    const jobId = await makeJob(customerId);

    const a = await createApplication({ jobId, tradespersonId, message: null, quoteAmount: null });
    await createApplication({
      jobId,
      tradespersonId: otherTradespersonId,
      message: null,
      quoteAmount: null,
    });
    assert.equal(a.ok, true);
    if (!a.ok) return;

    const accepted = await acceptApplication(a.id, customerId);
    assert.equal(accepted.ok, true);

    const statuses = await db.query<{ status: string; count: string }>(
      "select status, count(*) as count from applications where job_id = $1 group by status",
      [jobId],
    );
    const byStatus = Object.fromEntries(statuses.map((r) => [r.status, Number(r.count)]));
    assert.equal(byStatus.accepted, 1);
    assert.equal(byStatus.declined, 1);

    const [job] = await db.query<{ status: string; accepted_tradesperson_id: string }>(
      "select status, accepted_tradesperson_id from jobs where id = $1",
      [jobId],
    );
    assert.equal(job!.status, "accepted");
    assert.equal(job!.accepted_tradesperson_id, tradespersonId);

    const conversations = await db.query("select id from conversations where job_id = $1", [jobId]);
    assert.equal(conversations.length, 1);
  });

  test("a different customer cannot accept an application on someone else's job", async () => {
    const { createApplication, acceptApplication } = await import("@/lib/db/queries/applications.ts");
    const jobId = await makeJob(customerId);
    const application = await createApplication({
      jobId,
      tradespersonId,
      message: null,
      quoteAmount: null,
    });
    assert.equal(application.ok, true);
    if (!application.ok) return;

    const result = await acceptApplication(application.id, otherCustomerId);
    assert.equal(result.ok, false);
  });

  test("only the customer of a completed job can review it", async () => {
    const { createReview } = await import("@/lib/db/queries/reviews.ts");

    const openJob = await makeJob(customerId, "open");
    const notComplete = await createReview({
      jobId: openJob,
      reviewerId: customerId,
      rating: 5,
      quality: null,
      communication: null,
      reliability: null,
      body: null,
    });
    assert.equal(notComplete.ok, false, "cannot review an incomplete job");

    const completed = await makeJob(customerId, "completed");
    const wrongReviewer = await createReview({
      jobId: completed,
      reviewerId: otherCustomerId,
      rating: 5,
      quality: null,
      communication: null,
      reliability: null,
      body: null,
    });
    assert.equal(wrongReviewer.ok, false, "cannot review a job you did not post");

    const valid = await createReview({
      jobId: completed,
      reviewerId: customerId,
      rating: 5,
      quality: 5,
      communication: 4,
      reliability: 5,
      body: "Good work",
    });
    assert.equal(valid.ok, true);

    const duplicate = await createReview({
      jobId: completed,
      reviewerId: customerId,
      rating: 1,
      quality: null,
      communication: null,
      reliability: null,
      body: "Changed my mind",
    });
    assert.equal(duplicate.ok, false, "cannot review the same job twice");
  });

  test("ratings outside 1-5 are rejected by the database", async () => {
    const completed = await makeJob(customerId, "completed");
    await assert.rejects(
      db.query(
        `insert into reviews (job_id, reviewer_id, subject_id, direction, rating)
         values ($1, $2, $3, 'customer_to_tradesperson', 9)`,
        [completed, customerId, tradespersonId],
      ),
      /check constraint/i,
    );
  });

  test("only participants can read a conversation", async () => {
    const { getConversation, sendMessage } = await import("@/lib/db/queries/messages.ts");
    const jobId = await makeJob(customerId, "accepted");
    const [conversation] = await db.query<{ id: string }>(
      `insert into conversations (job_id, customer_id, tradesperson_id)
       values ($1, $2, $3) returning id`,
      [jobId, customerId, tradespersonId],
    );
    const conversationId = conversation!.id;

    assert.ok(await getConversation(conversationId, customerId), "customer can read");
    assert.ok(await getConversation(conversationId, tradespersonId), "tradesperson can read");
    assert.equal(
      await getConversation(conversationId, otherTradespersonId),
      null,
      "an outsider must get nothing",
    );

    // And cannot post into it either.
    const blocked = await sendMessage(conversationId, otherCustomerId, "let me in");
    assert.equal(blocked.ok, false);

    const allowed = await sendMessage(conversationId, customerId, "hello");
    assert.equal(allowed.ok, true);
  });

  test("a job scoped read returns nothing for the wrong customer", async () => {
    const { getJobForCustomer } = await import("@/lib/db/queries/jobs.ts");
    const jobId = await makeJob(customerId);
    assert.ok(await getJobForCustomer(jobId, customerId));
    assert.equal(await getJobForCustomer(jobId, otherCustomerId), null);
  });

  test("marketplace excludes other areas, wrong trades and already-applied jobs", async () => {
    const { listMarketplaceJobs } = await import("@/lib/db/queries/jobs.ts");
    const { createApplication } = await import("@/lib/db/queries/applications.ts");

    const local = await makeJob(customerId);
    const [otherTrade] = await db.query<{ id: string }>(
      "select id from trades where slug = 'plumbing'",
    );
    await db.query(
      `insert into jobs (customer_id, trade_id, title, description, postcode,
                         postcode_outward, postcode_area, status)
       values ($1, $2, 'Plumbing job', 'A description long enough to be valid.',
               'PH7 3AB', 'PH7', 'PH', 'open')`,
      [customerId, otherTrade!.id],
    );
    await db.query(
      `insert into jobs (customer_id, trade_id, title, description, postcode,
                         postcode_outward, postcode_area, status)
       values ($1, $2, 'Faraway job', 'A description long enough to be valid.',
               'G12 8QQ', 'G12', 'G', 'open')`,
      [customerId, tradeId],
    );

    const filters = {
      tradeIds: [tradeId],
      outward: "PH7",
      area: "PH",
      radiusMiles: 20,
      tradespersonId: otherTradespersonId,
    };

    let visible = await listMarketplaceJobs(filters);
    const ids = visible.map((job) => job.id);
    assert.ok(ids.includes(local), "a matching local job is visible");
    assert.ok(
      !visible.some((job) => job.title === "Plumbing job"),
      "a different trade is excluded",
    );
    assert.ok(
      !visible.some((job) => job.title === "Faraway job"),
      "a different postcode area is excluded",
    );

    // Applying removes it from the list.
    await createApplication({
      jobId: local,
      tradespersonId: otherTradespersonId,
      message: null,
      quoteAmount: null,
    });
    visible = await listMarketplaceJobs(filters);
    assert.ok(!visible.map((j) => j.id).includes(local), "applied jobs drop out");
  });

  test("the marketplace never selects customer identity or full postcode", async () => {
    const { listMarketplaceJobs } = await import("@/lib/db/queries/jobs.ts");
    await makeJob(customerId);
    const [job] = await listMarketplaceJobs({
      tradeIds: [tradeId],
      outward: "PH7",
      area: "PH",
      radiusMiles: 20,
      tradespersonId: otherTradespersonId,
    });
    assert.ok(job, "expected at least one job");
    const keys = Object.keys(job!);
    for (const leaked of ["customer_id", "customer_name", "postcode", "phone", "email"]) {
      assert.ok(!keys.includes(leaked), `marketplace row must not include ${leaked}`);
    }
  });

  test("verification cannot be set through the profile update path", async () => {
    const { updateProfile, getProfileByUserId } = await import("@/lib/db/queries/profiles.ts");
    await db.query("insert into tradesperson_profiles (user_id) values ($1)", [tradespersonId]);

    await updateProfile(tradespersonId, {
      primaryTradeId: tradeId,
      experienceLevel: "qualified",
      yearsExperience: 5,
      radiusMiles: 20,
      about: "About me, long enough to pass validation.",
      qualifications: "Self declared qualification",
      acceptingWork: true,
      skillIds: [],
      availability: ["weekends"],
    });

    const profile = await getProfileByUserId(tradespersonId);
    assert.equal(
      profile?.verification_status,
      "unverified",
      "a tradesperson must never be able to mark themselves verified",
    );
  });
});
