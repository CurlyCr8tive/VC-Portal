-- Verified Consulting — Postgres schema draft (Supabase)
--
-- STATUS: Not yet applied anywhere. No Supabase project exists yet — per the
-- Final PRD, that project must be created under Tenyse's own account/payment
-- method, not the builder's, before this ever gets run. This file exists to
-- satisfy the Week 1 critical-path item "lock the data schema before Week 2's
-- agents start writing into it," and to give Week 3 something real to run
-- through dbdiagram.io for the ERD, per Stef's tip in the build plan.
--
-- Row Level Security: policies are drafted at the bottom, commented out.
-- They are NOT active — RLS is explicitly Week 3 ("Architecture Up") scope,
-- not Week 2. They're included now so the schema and its access model are
-- designed together, rather than RLS being bolted on after the fact.
--
-- Field names below map directly to the Final PRD's "Press Placement Data
-- Model" table and "Agent Architecture" section — every column has a
-- one-line reason, not just a name.

-- ---------------------------------------------------------------------------
-- profiles — one row per authenticated user, linked 1:1 to Supabase auth.users
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  -- Role naming matches the PRD's reserved field exactly: owner / pr_client /
  -- coaching_mentee. coaching_mentee has no onboarding flow or gated page yet
  -- — the 90-day coaching program is explicit future scope, not this build.
  -- A check constraint (not a Postgres enum) so adding a role later is a
  -- one-line ALTER, not a migration that touches an enum type.
  role text not null check (role in ('owner', 'pr_client', 'coaching_mentee')),
  name text not null,
  email text not null unique,
  -- Only set when role = 'pr_client'. A pr_client profile with a null
  -- client_id is invalid data, but Postgres can't express "required only
  -- when X" as a single constraint without a trigger — enforce this at the
  -- application layer (Express) for now, revisit if it becomes a real bug
  -- source.
  client_id uuid references clients(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- clients — Tenyse's own clients (the PR clients, e.g. VeganHood)
-- ---------------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Discovery Agent match criteria: client name, company name, key executive
  -- names/aliases. Stored as jsonb rather than separate columns since the
  -- exact shape isn't finalized until real keyword tuning happens in Week 3.
  keyword_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

alter table profiles add constraint profiles_client_id_fkey
  foreign key (client_id) references clients(id);

-- ---------------------------------------------------------------------------
-- campaigns — confirmed 7/31 as core to Tenyse's actual mental model.
-- AVE, progress, and notes all live at this level, not at the client level.
-- ---------------------------------------------------------------------------
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  start_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- placements — the core record. Field list matches the PRD's Press
-- Placement Data Model table one-to-one.
-- ---------------------------------------------------------------------------
create table placements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  -- Nullable for now: a placement discovered before its campaign exists (or
  -- during the transition from the current no-campaign mock data) needs
  -- somewhere to live. Once real campaign framing is confirmed with Tenyse,
  -- consider making this required.
  campaign_id uuid references campaigns(id),

  publication text not null,
  headline text not null, -- auto-extracted from article_url where possible; always manually editable
  article_url text,
  publication_date date,

  ave_value numeric(12, 2),
  ave_auto_calculated boolean not null default false, -- true if Agent 2 set this, false if Tenyse entered it manually

  pitch_sent_date date,
  landed_date date,
  -- Lead time itself is intentionally NOT a stored column — see
  -- src/calculations.js in the actual app for why (derived values are
  -- computed on read so they can't drift out of sync with their source
  -- dates). The same principle applies here: compute lead time in the
  -- query/API layer from pitch_sent_date and landed_date, don't duplicate it
  -- into a column.

  sentiment_tag text check (sentiment_tag in ('positive', 'neutral', 'negative')),
  sentiment_confirmed_by_owner boolean not null default false,

  notes text, -- owner-only by default; not shown to a client unless notes_shareable is true
  notes_shareable boolean not null default false,

  source text not null default 'manual' check (source in ('manual', 'discovery_agent')),

  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- ---------------------------------------------------------------------------
-- outlet_rates — Agent 2's (AVE Calculation) seed/lookup table.
-- Empty until real per-outlet rate examples arrive from Tenyse — see the
-- PRD's Required Access table ("Per-outlet rate examples — Not yet raised").
-- ---------------------------------------------------------------------------
create table outlet_rates (
  id uuid primary key default gen_random_uuid(),
  outlet_name text not null unique,
  rate_estimate numeric(12, 2) not null,
  multiplier numeric(6, 2) not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

-- ---------------------------------------------------------------------------
-- review_queue — Agent 1's (Mentions Discovery) output. Candidate matches
-- land here with status 'pending', never directly in placements. Rejected
-- rows are kept (not deleted) so the same false positive doesn't resurface —
-- this is the fix for the Google Alerts same-name problem named in the PRD.
-- ---------------------------------------------------------------------------
create table review_queue (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  publication text,
  headline text,
  article_url text,
  matched_on text, -- e.g. "VeganHood + Harlem" — the keyword/context match that surfaced this row
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  discovered_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id)
);

-- ---------------------------------------------------------------------------
-- campaign_notes — the client/owner notes thread, scoped to a campaign
-- (confirmed 8/1 navigation placement). Distinct from placements.notes,
-- which is Tenyse's private working notes on a specific placement.
-- ---------------------------------------------------------------------------
create table campaign_notes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  author_id uuid not null references profiles(id),
  author_role text not null check (author_role in ('owner', 'pr_client')),
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- errors — per the build plan's "dedicated errors table... surfaced in a
-- simple owner-side panel." One row per agent failure; nothing writes here
-- yet because no agent runs in production yet.
-- ---------------------------------------------------------------------------
create table errors (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null, -- e.g. 'mentions_discovery', 'ave_calculation', 'pr_kit_design'
  occurred_at timestamptz not null default now(),
  error_detail text not null,
  resolved boolean not null default false,
  resolved_at timestamptz
);

-- =============================================================================
-- DRAFT Row Level Security policies — NOT ACTIVE. Commented out on purpose.
-- Apply these in Week 3 once the Supabase project exists and profiles/roles
-- are real, not mock. Left here so access control is designed alongside the
-- schema instead of retrofitted.
-- =============================================================================

-- alter table clients enable row level security;
-- alter table campaigns enable row level security;
-- alter table placements enable row level security;
-- alter table review_queue enable row level security;
-- alter table campaign_notes enable row level security;

-- Owners (and eventually contractors) see everything.
-- create policy "owner full access - clients" on clients
--   for all using (
--     exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
--   );

-- A pr_client only ever sees rows tied to their own client_id — this is the
-- actual enforcement of "scoped to their own data only," not the mock
-- client-side filtering that exists in the current static build.
-- create policy "pr_client scoped access - campaigns" on campaigns
--   for select using (
--     exists (
--       select 1 from profiles
--       where profiles.id = auth.uid()
--         and profiles.role = 'pr_client'
--         and profiles.client_id = campaigns.client_id
--     )
--   );

-- create policy "pr_client scoped access - placements" on placements
--   for select using (
--     exists (
--       select 1 from profiles
--       where profiles.id = auth.uid()
--         and profiles.role = 'pr_client'
--         and profiles.client_id = placements.client_id
--     )
--   );

-- Notes on a campaign: both the owner and that campaign's own client can
-- read/write; no client ever sees another client's campaign_notes.
-- create policy "pr_client scoped access - campaign_notes" on campaign_notes
--   for all using (
--     exists (
--       select 1 from profiles p
--       join campaigns c on c.id = campaign_notes.campaign_id
--       where p.id = auth.uid()
--         and (p.role = 'owner' or (p.role = 'pr_client' and p.client_id = c.client_id))
--     )
--   );
