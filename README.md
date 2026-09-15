# Joinly

A local marketplace connecting people who need **small joinery jobs** done with
joiners, apprentices and skilled tradespeople who have **spare capacity**.

Launching in Perthshire: Perth, Crieff, Auchterarder, Dunblane, Kinross,
Pitlochry, Blairgowrie and Scone.

## What this version is

This is **V1 — a demand-validation MVP**, not the full marketplace.

It is a public, launchable website that does three things for real:

1. Explains the proposition clearly to someone arriving from a Facebook group.
2. Takes **job submissions** from customers (including photos).
3. Takes **registrations** from joiners, and **waiting-list** sign-ups from
   anyone outside the launch area.

Matching is done **by hand** behind the scenes. That is a deliberate product
decision: prove that real customers post real jobs and real joiners want them
before building accounts, messaging, quoting and payments.

Everything on the site that isn't real is labelled as not real. There is no
fake dashboard, no invented statistics presented as fact, and no claim that any
joiner has been verified — because none has been yet.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Static marketing pages plus server routes for form handling, deploys to Vercel with no config |
| Language | TypeScript (strict) | `noUncheckedIndexedAccess` on |
| Styling | Tailwind CSS v4 | Design tokens defined once in `globals.css` |
| Validation | Zod 4 | One schema drives both client hints and server enforcement |
| Runtime deps | `next`, `react`, `react-dom`, `zod` | That's the whole list |

## Getting started

```bash
npm install
cp .env.example .env.local   # optional for local development
npm run dev
```

In development, submissions are written to `.data/submissions.jsonl` (with any
photos beside it) and logged to the console, so the forms work end to end with
no third-party account. `.data/` is gitignored.

```bash
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Before you deploy

Set the environment variables in `.env.example` on Vercel. **At minimum you
must configure one durable destination for submissions** — either the Resend
email variables or a webhook URL.

If you deploy without either, the forms return a clear error instead of
pretending to have accepted the job. That is intentional: silently losing a
customer's first submission is the worst thing this site could do.

## Architecture

```
src/
  app/                     Routes. Every page is statically rendered.
    api/{jobs,joiners,waitlist}/   Submission endpoints
    opengraph-image.tsx    The Facebook share card
  components/
    forms/                 The three forms + shared submit hook
    marketing/             Homepage sections
    site/                  Header, footer, logo, structured data
    ui/                    Button, Field, Badge, Icon, Section, OptionCards
  lib/
    api/                   Shared submission handler (parse → limit → validate → store)
    config/site.ts         Brand, URL, contact details
    content/               Categories, launch towns, FAQs — the editable content
    security/              Rate limiting, upload validation
    submissions/           Delivery pipeline (see below)
    validation/            Zod schemas
```

### The submission pipeline

The one piece of architecture worth keeping when the real marketplace is built.

```
Route handler → handleSubmission() → createSubmission() → [sinks]
```

A **sink** is anything that can durably accept a submission. Today there are
four: `email` (Resend), `webhook` (signed, generic), `file` and `console` (both
development only). Adding Postgres later means writing one more sink — the
forms, validation and API routes do not change.

Two rules hold the pipeline honest:

- A sink is **durable** or it isn't. Console logging isn't. The local file sink
  is durable in development but not in production, because serverless
  filesystems are ephemeral.
- A submission is only reported as successful if **at least one durable sink
  accepted it**. Otherwise the visitor gets a 503 or 502 and an honest message.

### Security

| Control | Where |
| --- | --- |
| Server-side validation on every field | `lib/validation`, enforced in `lib/api/submission-handler.ts` |
| Rate limiting (8 per 15 min per IP, per form) | `lib/security/rate-limit.ts` |
| Honeypot field | `honeypotSchema`, silently discards bot submissions |
| Upload validation by **magic bytes**, not filename or MIME | `lib/security/uploads.ts` |
| Filenames regenerated on upload (no path traversal) | `lib/security/uploads.ts` |
| URL scheme restricted to http/https (blocks `javascript:`) | `lib/validation/joiner.ts` |
| CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy | `next.config.ts` |
| No IP addresses stored on submission records | `lib/api/submission-handler.ts` |

Photos are never published to a public URL. They are attached to the
notification email and, in development, written to `.data/`.

### SEO

Per-page titles and descriptions, canonical URLs, `sitemap.xml`, `robots.txt`,
Open Graph and Twitter cards, a generated share image, and JSON-LD for
Organization, WebSite and FAQPage. The FAQ structured data is generated from
the same array the page renders, so the two cannot drift.

## Deliberately not built in V1

Accounts and login · messaging · quoting · payments and escrow · reviews and
ratings · identity, qualification or insurance verification · automated
matching · an admin dashboard · native apps · analytics.

Each of these is a real requirement for the marketplace and each is a reason to
wait for evidence. The schema sketch below is where they start.

## The path to the real marketplace

The V1 forms already collect, in validated and normalised form, most of what
the first real tables will need:

| V1 today | Becomes |
| --- | --- |
| Job submission | `jobs` + `job_photos` |
| Joiner registration | `users` + `worker_profiles` + `worker_skills` |
| `experienceLevel` | The trust model's backbone — drives what a profile is allowed to claim |
| `qualifications` (self-declared) | `qualifications` with a `verification_status`, never displayed as checked until it is |
| Waiting list | `area_demand`, which decides where to expand |

The trust model is the part to get right, and it is already reflected in the
copy: experience level is shown honestly, reviews will only be possible on jobs
actually completed through the platform, and no badge claims a check that
hasn't happened.

## Content you can edit without touching components

- `src/lib/config/site.ts` — name, URL, contact email, region
- `src/lib/content/categories.ts` — the eight job categories
- `src/lib/content/towns.ts` — launch towns and covered postcode areas
- `src/lib/content/faqs.ts` — the FAQ (feeds both the page and its structured data)
