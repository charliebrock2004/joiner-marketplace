-- ---------------------------------------------------------------------------
-- Tradezy core marketplace schema
--
-- Conventions:
--   * UUID primary keys via gen_random_uuid() (pgcrypto is built in on PG13+).
--   * Every foreign key states its delete behaviour explicitly.
--   * Enumerated values use CHECK constraints rather than Postgres ENUM types,
--     so adding a value later is a migration, not a type rewrite.
--   * Money is numeric(10,2). Never float.
--   * Timestamps are timestamptz, always UTC.
-- ---------------------------------------------------------------------------

-- ------------------------------------------------------------------ trades --
-- Trades are data, not a hard-coded list, so the marketplace can expand beyond
-- joinery without a schema change.
create table trades (
  id          uuid primary key default gen_random_uuid(),
  slug        text        not null unique,
  name        text        not null,
  description text,
  sort_order  integer     not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

create index trades_active_idx on trades (is_active, sort_order);

-- Job categories are the specific kinds of work within a trade.
create table job_categories (
  id         uuid primary key default gen_random_uuid(),
  trade_id   uuid        not null references trades (id) on delete cascade,
  slug       text        not null,
  name       text        not null,
  blurb      text,
  sort_order integer     not null default 0,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  unique (trade_id, slug)
);

create index job_categories_trade_idx on job_categories (trade_id, is_active, sort_order);

-- ------------------------------------------------------------------- users --
create table users (
  id               uuid primary key default gen_random_uuid(),
  email            text        not null,
  password_hash    text        not null,
  role             text        not null check (role in ('customer', 'tradesperson', 'admin')),
  full_name        text        not null,
  phone            text,
  postcode         text,
  postcode_outward text,
  status           text        not null default 'active'
                     check (status in ('active', 'suspended', 'deleted')),
  suspended_reason text,
  suspended_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Emails are stored lowercased by the application; the index enforces that
-- uniqueness is case-insensitive regardless.
create unique index users_email_key on users (lower(email));
create index users_role_status_idx on users (role, status);
create index users_outward_idx on users (postcode_outward);

-- ---------------------------------------------------------------- sessions --
-- Only a hash of the session token is stored, so a database leak does not hand
-- out live sessions.
create table sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references users (id) on delete cascade,
  token_hash   text        not null unique,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  user_agent   text
);

create index sessions_user_idx on sessions (user_id);
create index sessions_expires_idx on sessions (expires_at);

-- --------------------------------------------------------------- profiles ---
create table customer_profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null unique references users (id) on delete cascade,
  about      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tradesperson_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid        not null unique references users (id) on delete cascade,
  primary_trade_id    uuid        references trades (id) on delete set null,
  -- Experience level is the backbone of the trust model and is always shown.
  experience_level    text        not null default 'other'
                        check (experience_level in ('apprentice', 'qualified', 'experienced', 'other')),
  years_experience    integer     not null default 0 check (years_experience between 0 and 60),
  radius_miles        integer     not null default 10 check (radius_miles between 1 and 100),
  about               text,
  -- Self-declared. Never rendered as a checked credential.
  qualifications      text,
  profile_photo_url   text,
  -- Only an admin may move this past 'unverified'.
  verification_status text        not null default 'unverified'
                        check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  verification_notes  text,
  verified_at         timestamptz,
  verified_by         uuid        references users (id) on delete set null,
  accepting_work      boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index tradesperson_profiles_trade_idx on tradesperson_profiles (primary_trade_id);
create index tradesperson_profiles_verification_idx on tradesperson_profiles (verification_status);

-- Additional trades beyond the primary one.
create table tradesperson_trades (
  profile_id uuid not null references tradesperson_profiles (id) on delete cascade,
  trade_id   uuid not null references trades (id) on delete cascade,
  primary key (profile_id, trade_id)
);

create index tradesperson_trades_trade_idx on tradesperson_trades (trade_id);

-- The specific categories of work someone wants.
create table tradesperson_skills (
  profile_id  uuid not null references tradesperson_profiles (id) on delete cascade,
  category_id uuid not null references job_categories (id) on delete cascade,
  primary key (profile_id, category_id)
);

create index tradesperson_skills_category_idx on tradesperson_skills (category_id);

create table tradesperson_availability (
  profile_id uuid not null references tradesperson_profiles (id) on delete cascade,
  slot       text not null check (slot in ('weekdays', 'evenings', 'weekends', 'occasional', 'full_time')),
  primary key (profile_id, slot)
);

create table portfolio_photos (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid        not null references tradesperson_profiles (id) on delete cascade,
  url        text        not null,
  caption    text,
  sort_order integer     not null default 0,
  created_at timestamptz not null default now()
);

create index portfolio_photos_profile_idx on portfolio_photos (profile_id, sort_order);

-- -------------------------------------------------------------------- jobs --
create table jobs (
  id                       uuid primary key default gen_random_uuid(),
  customer_id              uuid        not null references users (id) on delete cascade,
  trade_id                 uuid        not null references trades (id) on delete restrict,
  category_id              uuid        references job_categories (id) on delete set null,
  title                    text        not null,
  description              text        not null,
  -- Full postcode is private; the outward code is what the marketplace shows.
  postcode                 text        not null,
  postcode_outward         text        not null,
  postcode_area            text        not null,
  budget_band              text        not null default 'unsure',
  preferred_date           text,
  timing                   text        not null default 'flexible',
  status                   text        not null default 'draft'
                             check (status in ('draft', 'open', 'applications', 'accepted',
                                               'in_progress', 'completed', 'cancelled')),
  accepted_tradesperson_id uuid        references users (id) on delete set null,
  accepted_at              timestamptz,
  started_at               timestamptz,
  completed_at             timestamptz,
  cancelled_at             timestamptz,
  cancelled_reason         text,
  -- Admin moderation.
  removed_at               timestamptz,
  removed_by               uuid        references users (id) on delete set null,
  removed_reason           text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- An accepted job must name the tradesperson it was accepted for.
  constraint jobs_accepted_requires_tradesperson
    check (status not in ('accepted', 'in_progress', 'completed')
           or accepted_tradesperson_id is not null)
);

create index jobs_customer_idx on jobs (customer_id, created_at desc);
create index jobs_status_idx on jobs (status, created_at desc);
create index jobs_trade_idx on jobs (trade_id, status);
create index jobs_outward_idx on jobs (postcode_outward, status);
create index jobs_area_idx on jobs (postcode_area, status);
create index jobs_accepted_idx on jobs (accepted_tradesperson_id, status);

create table job_photos (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid        not null references jobs (id) on delete cascade,
  url        text        not null,
  sort_order integer     not null default 0,
  created_at timestamptz not null default now()
);

create index job_photos_job_idx on job_photos (job_id, sort_order);

-- ------------------------------------------------------------ applications --
create table applications (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid        not null references jobs (id) on delete cascade,
  tradesperson_id uuid        not null references users (id) on delete cascade,
  message         text,
  quote_amount    numeric(10, 2) check (quote_amount is null or quote_amount >= 0),
  status          text        not null default 'pending'
                    check (status in ('pending', 'shortlisted', 'accepted', 'declined', 'withdrawn')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- One application per tradesperson per job.
  unique (job_id, tradesperson_id)
);

create index applications_job_idx on applications (job_id, created_at desc);
create index applications_tradesperson_idx on applications (tradesperson_id, created_at desc);
create index applications_status_idx on applications (status);

-- At most one accepted application per job.
create unique index applications_one_accepted_per_job
  on applications (job_id) where status = 'accepted';

-- ----------------------------------------------------------- conversations --
create table conversations (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid        not null references jobs (id) on delete cascade,
  customer_id     uuid        not null references users (id) on delete cascade,
  tradesperson_id uuid        not null references users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz,
  unique (job_id, tradesperson_id)
);

create index conversations_customer_idx on conversations (customer_id, last_message_at desc);
create index conversations_tradesperson_idx on conversations (tradesperson_id, last_message_at desc);
create index conversations_job_idx on conversations (job_id);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid        not null references conversations (id) on delete cascade,
  sender_id       uuid        not null references users (id) on delete cascade,
  body            text        not null,
  read_at         timestamptz,
  -- Admin moderation.
  removed_at      timestamptz,
  removed_by      uuid        references users (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at);
create index messages_unread_idx on messages (conversation_id, read_at) where read_at is null;

-- ----------------------------------------------------------------- reviews --
-- `direction` makes two-way reviews possible later without a schema change;
-- only customer_to_tradesperson is written today.
create table reviews (
  id                uuid primary key default gen_random_uuid(),
  job_id            uuid        not null references jobs (id) on delete cascade,
  reviewer_id       uuid        not null references users (id) on delete cascade,
  subject_id        uuid        not null references users (id) on delete cascade,
  direction         text        not null
                      check (direction in ('customer_to_tradesperson', 'tradesperson_to_customer')),
  rating            integer     not null check (rating between 1 and 5),
  quality           integer     check (quality is null or quality between 1 and 5),
  communication     integer     check (communication is null or communication between 1 and 5),
  reliability       integer     check (reliability is null or reliability between 1 and 5),
  body              text,
  status            text        not null default 'published'
                      check (status in ('published', 'hidden', 'removed')),
  moderated_by      uuid        references users (id) on delete set null,
  moderated_at      timestamptz,
  moderation_reason text,
  created_at        timestamptz not null default now(),
  -- A reviewer gets one review per job per direction. This is what stops
  -- duplicate reviews being stacked on a single completed job.
  unique (job_id, reviewer_id, direction),
  constraint reviews_no_self_review check (reviewer_id <> subject_id)
);

create index reviews_subject_idx on reviews (subject_id, status, created_at desc);
create index reviews_job_idx on reviews (job_id);

-- ----------------------------------------------------------------- reports --
create table reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid        not null references users (id) on delete cascade,
  target_type      text        not null check (target_type in ('user', 'job', 'message', 'review')),
  target_id        uuid        not null,
  reason           text        not null
                     check (reason in ('spam', 'abuse', 'scam', 'inappropriate',
                                       'not_as_described', 'safety', 'other')),
  details          text,
  status           text        not null default 'open'
                     check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolved_by      uuid        references users (id) on delete set null,
  resolved_at      timestamptz,
  resolution_notes text,
  created_at       timestamptz not null default now()
);

create index reports_status_idx on reports (status, created_at desc);
create index reports_target_idx on reports (target_type, target_id);
-- One open report per reporter per target, so a single user cannot flood the
-- moderation queue with the same complaint.
create unique index reports_one_open_per_reporter
  on reports (reporter_id, target_type, target_id) where status in ('open', 'reviewing');

-- ----------------------------------------------------------- admin actions --
-- Append-only audit trail. Never updated or deleted by application code.
create table admin_actions (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid        not null references users (id) on delete restrict,
  action      text        not null,
  target_type text        not null,
  target_id   uuid,
  metadata    jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index admin_actions_admin_idx on admin_actions (admin_id, created_at desc);
create index admin_actions_target_idx on admin_actions (target_type, target_id, created_at desc);
