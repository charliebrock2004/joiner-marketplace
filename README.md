# Tradezy

A local marketplace connecting people who need trade work done with
tradespeople who have spare capacity.

Launching in Perthshire — Perth, Crieff, Auchterarder, Dunblane, Kinross,
Pitlochry, Blairgowrie and Scone — starting with joinery and carpentry.

## What this is

A working marketplace, not a landing page. Customers create accounts, post
jobs and choose who does them; tradespeople create profiles, see matching local
jobs, apply, message the customer and build a reputation from completed work.

The trades taxonomy is data, not code. Joinery is where the network is being
built first, but nine trades ship seeded and adding another is a row, not a
release.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Server Components, Server Actions, deploys to Vercel |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) | |
| Database | Postgres via `pg`, raw SQL + hand-written migrations | No ORM lock-in or codegen step |
| Dev/test database | PGlite | Real Postgres in-process, so the app runs with zero configuration |
| Auth | scrypt (`node:crypto`) + DB-backed sessions | No dependency, full control over RBAC |
| Styling | Tailwind CSS v4 | Design tokens defined once in `globals.css` |
| Validation | Zod 4 | One schema for client hints and server enforcement |
| Tests | `node:test` against PGlite | Real SQL, no framework |

Runtime dependencies: `next`, `react`, `react-dom`, `zod`, `pg`,
`@vercel/blob`, `server-only`.

## Getting started

```bash
npm install
npm run db:demo   # migrate + reference data + demo accounts
npm run dev
```

No database server needed. With `DATABASE_URL` unset the app uses PGlite, an
in-process build of Postgres stored in `.data/postgres`, running the same SQL
that runs in production.

Demo accounts (development only, password `tradezy-demo-pw`):

| Email | Role |
| --- | --- |
| `customer@example.com` | Customer with open jobs |
| `joiner@example.com` | Qualified joiner |
| `apprentice@example.com` | Apprentice |
| `admin@example.com` | Admin |

**One gotcha:** PGlite is single-writer. Stop the dev server before running
`db:*` commands, or the two processes will hold different views of the same
directory.

```bash
npm run dev         npm run build       npm run start
npm run lint        npm run typecheck   npm test
npm run db:migrate  npm run db:seed     npm run db:demo
npm run db:status   npm run db:reset
```

## Deploying

1. Create a Postgres database (Supabase, Neon, Vercel Postgres) and set
   `DATABASE_URL` to its **pooled** connection string.
2. Create a Vercel Blob store — `BLOB_READ_WRITE_TOKEN` is then set for you.
   Without it, uploaded photos are written to a filesystem that does not
   survive a deploy.
3. Set `NEXT_PUBLIC_SITE_URL` to your real domain.
4. Run the migrations against it once: `DATABASE_URL=... npm run db:seed`.
   This applies the schema and the trades taxonomy. It does **not** create
   demo data.
5. Create your admin account: sign up normally, then promote the row —
   `update users set role = 'admin' where email = '...';`

Every variable is documented in `.env.example`.

`npm run db:demo` refuses to run in production, and `db:reset` refuses to touch
a remote database, unless explicitly overridden. Demo reviews and verification
states must never reach real customers.

## Architecture

```
src/
  app/
    (auth)/{login,signup}     Authentication
    dashboard/                Customer and tradesperson areas (role-aware)
    jobs/                     Tradesperson marketplace
    tradespeople/[id]         Public profile
    admin/                    Moderation, verification, reports, audit log
    api/uploads/[...path]     Local photo serving (development only)
  components/{ui,site,forms,marketing,marketplace,admin,auth}
  lib/
    auth/        password hashing, sessions, guards
    db/
      client.ts      pg + PGlite behind one interface
      migrations/    plain .sql, applied in order
      queries/       all data access, each scoped by viewer
    actions/     Server Actions — every mutation starts with a guard
    geo/         postcode parsing and radius tiers
    storage/     Vercel Blob + local disk behind one interface
    validation/  Zod schemas
tests/           node:test suite
```

### Authorisation

Guards live in `lib/auth/guards.ts` and are called by every page, action and
route handler that touches protected data. Hiding a link is never the control.

Reads are additionally scoped in SQL: `getJobForCustomer(jobId, customerId)`
has no variant that trusts the caller to have checked ownership first, and
`getConversation` returns nothing unless the viewer is one of the two
participants. Knowing a UUID is not enough to reach anything.

### The trust model

- **Experience level is always shown.** Apprentice, qualified, experienced or
  other skilled worker. Nobody is flattened into a generic "tradesperson".
- **Verified means an admin checked something.** `verification_status` is
  writable only from the admin module; the tradesperson-facing profile update
  cannot touch it, and there is a test asserting that. Everything else renders
  as "Not yet verified".
- **Qualifications are labelled self-declared** until that happens.
- **Reviews require a completed job.** The subject is read from the job row,
  never submitted by the client, and a unique index allows one review per
  reviewer per job per direction. `direction` means tradesperson-to-customer
  reviews need no migration later.

### What the database enforces

Not just the application: case-insensitive unique emails; one application per
tradesperson per job; at most one accepted application per job; one review per
reviewer per job per direction; no self-reviews; ratings 1–5; an accepted job
must name its tradesperson; one open report per reporter per target.

### Privacy

The marketplace listing never selects the customer's name, email, phone or full
postcode — those columns are not in the query, so they cannot leak through a
serialisation mistake. A tradesperson sees the outward code ("PH7") until they
are chosen, then the full postcode. There is a test asserting the marketplace
row shape.

### Location matching

Deterministic and tiered by postcode: the same outward code always matches, the
wider postal area matches for anyone travelling 10+ miles, and a different
postcode area never matches.

This is a deliberate limitation. True mileage needs a postcode centroid dataset
(ONS publishes one); inventing coordinates would produce confidently wrong
matches. Nothing in the UI claims more precision than this gives.

## Not built yet

Payments, subscriptions, AI matching, native apps, push/email notifications,
automated payouts, nationwide coverage, recommendation algorithms. Two-way
reviews are modelled but only customer-to-tradesperson is written.

Known trade-off: adding auth to the header made the marketing pages render
per-request rather than statically. Next's fix for this (Partial Prerendering)
is experimental in this version, and shipping experimental APIs in a product
you are launching is not worth the TTFB.
