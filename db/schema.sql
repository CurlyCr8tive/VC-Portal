-- Verified Consulting — Postgres schema draft (Supabase)
--
-- STATUS: Not yet applied anywhere. No Supabase project exists yet — per the
-- Final PRD, that project must be created under Tenyse's own account/payment
-- method, not the builder's, before this ever gets run. This file exists to
-- satisfy the Week 1 critical-path item "lock the data schema before Week 2's
-- agents start writing into it," and to give Week 3 something real to run
-- through dbdiagram.io for the ERD, per Stef's tip in the build plan.
--
-- Row Level Security: policies are at the bottom, finalized and ready to
-- run. "Ready to run" is not the same as "active" — RLS only does anything
-- once it's applied against a real Supabase project, and none exists yet.
-- These stop being theoretical the moment `supabase db push` (or pasting
-- this file into the SQL editor) runs against Tenyse's own project.
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
-- campaign_milestones — backs campaignSchema.js's `milestones` array
-- (id/text/done/createdAt). A separate table rather than a jsonb column on
-- campaigns so toggling one milestone's `done` state is a single-row
-- update, not a read-modify-write of the whole array.
-- ---------------------------------------------------------------------------
create table campaign_milestones (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  text text not null,
  done boolean not null default false,
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
-- Row Level Security policies — full coverage, ready to run.
--
-- These are the actual enforcement of "a pr_client only ever sees their own
-- data," replacing the mock client-side filtering in the current static
-- build (src/auth.js says this outright: "do not treat requireSession()
-- passing as proof that access control works"). The Express APIs
-- (server/owner-api, server/client-api) check role/client_id in app code
-- too, using the service-role key — that's a UX-friendly 403 with a message,
-- not the actual security boundary. RLS below is what holds even if an
-- Express route has a bug, since Supabase enforces it at the database
-- connection level for any non-service-role key.
--
-- One thing RLS can't do: hide a single COLUMN (e.g. placements.notes when
-- notes_shareable = false) while still exposing the rest of that row — RLS
-- filters rows, not columns. If per-column visibility is still wanted once
-- this is live, that needs a view (e.g. a `placements_for_client` view that
-- omits/nulls the notes column) or Postgres column-level GRANTs, not RLS.
-- Not built here — flagging so it isn't assumed to already work.
-- =============================================================================

alter table profiles enable row level security;
alter table clients enable row level security;
alter table campaigns enable row level security;
alter table campaign_milestones enable row level security;
alter table placements enable row level security;
alter table outlet_rates enable row level security;
alter table review_queue enable row level security;
alter table campaign_notes enable row level security;
alter table errors enable row level security;

-- profiles: everyone can read their own row (needed for the app to look up
-- "am I owner or pr_client, and which client_id"); owners can read all
-- profiles (needed for the owner dashboard's client list).
create policy "read own profile" on profiles
  for select using (id = auth.uid());

create policy "owner reads all profiles" on profiles
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
  );

-- clients: owner full access; a pr_client can only see their own client row.
create policy "owner full access - clients" on clients
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );

create policy "pr_client reads own client" on clients
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'pr_client' and profiles.client_id = clients.id
    )
  );

-- campaigns: owner full access; pr_client read-only, scoped to their client_id.
create policy "owner full access - campaigns" on campaigns
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );

create policy "pr_client scoped access - campaigns" on campaigns
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'pr_client'
        and profiles.client_id = campaigns.client_id
    )
  );

-- campaign_milestones: same scoping as campaigns, joined through campaign_id.
create policy "owner full access - campaign_milestones" on campaign_milestones
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );

create policy "pr_client scoped access - campaign_milestones" on campaign_milestones
  for select using (
    exists (
      select 1 from profiles p
      join campaigns c on c.id = campaign_milestones.campaign_id
      where p.id = auth.uid() and p.role = 'pr_client' and p.client_id = c.client_id
    )
  );

-- placements: owner full access; pr_client read-only, scoped to their client_id.
create policy "owner full access - placements" on placements
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );

create policy "pr_client scoped access - placements" on placements
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'pr_client'
        and profiles.client_id = placements.client_id
    )
  );

-- outlet_rates: internal working data (Agent 2's lookup table) — owner only,
-- no client ever needs to see or query this directly.
create policy "owner full access - outlet_rates" on outlet_rates
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );

-- review_queue: internal triage queue (Agent 1's output before a human
-- confirms it into placements) — owner only. A client should never see an
-- unconfirmed candidate match before Tenyse has reviewed it.
create policy "owner full access - review_queue" on review_queue
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );

-- campaign_notes: both the owner and that campaign's own client can
-- read/write; no client ever sees another client's campaign_notes.
create policy "scoped access - campaign_notes" on campaign_notes
  for all using (
    exists (
      select 1 from profiles p
      join campaigns c on c.id = campaign_notes.campaign_id
      where p.id = auth.uid()
        and (p.role = 'owner' or (p.role = 'pr_client' and p.client_id = c.client_id))
    )
  );

-- errors: internal ops log — owner only.
create policy "owner full access - errors" on errors
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );
