-- Verified Consulting — Postgres schema (Supabase)
--
-- STATUS (Aug 14): Applied and verified against a real Supabase project —
-- all 9 tables exist, RLS is confirmed enabled on every one (checked via
-- pg_tables.rowsecurity, not just assumed from this file). That project is
-- TEMPORARY, though: created under the builder's own account with Stef's
-- explicit sign-off, per the Aug 10 Slack conversation, specifically
-- because Tenyse's own Supabase account/payment method (the PRD's Account
-- Ownership requirement) still didn't exist by the Week 3 deadline. No real
-- data lives in it. Once Tenyse creates her own project, this file gets
-- re-run fresh against it (a clean re-apply, not a migration — there's
-- nothing real to carry over) and the temporary project gets disabled.
--
-- Row Level Security: policies are at the bottom and are now ACTIVE, not
-- just drafted — confirmed live in the verification above.
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
  -- No inline `references clients(id)` here on purpose — clients doesn't
  -- exist yet at this point in the script (profiles/clients reference each
  -- other both ways: clients.created_by -> profiles, profiles.client_id ->
  -- clients). The FK is added below via ALTER TABLE once clients exists.
  client_id uuid,
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

-- Client profile fields — status/engagement type/contact/industry/notes.
-- Added to match src/clientSchema.js (localStorage), which already had all
-- of these; the real table was missing them entirely until now.
alter table clients add column status text not null default 'unconfirmed'
  check (status in ('active', 'past', 'unconfirmed'));
alter table clients add column engagement_type text not null default 'pr'
  check (engagement_type in ('pr', 'coaching', 'pr_and_coaching'));
alter table clients add column contact_email text;
alter table clients add column industry text;
alter table clients add column engagement_start_date date;
alter table clients add column notes text;

-- ---------------------------------------------------------------------------
-- campaigns — confirmed 7/31 as core to Tenyse's actual mental model.
-- AVE, progress, and notes all live at this level, not at the client level.
-- ---------------------------------------------------------------------------
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  start_date date,
  -- Free text ("6 weeks", "Q4", "ongoing") rather than a computed end_date —
  -- Tenyse describes campaign length loosely, not always as a fixed date
  -- range; forcing an end_date would mean fabricating one for anything
  -- open-ended.
  duration text,
  -- Advertising/media spend tied to the campaign, distinct from AVE (which
  -- values placements *earned*, not spent).
  budget numeric(12, 2),
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
-- coaching_phases — backs src/coachingPhaseSchema.js. One row per phase per
-- client (not templated at the DB level — see that file's PROGRAM_TEMPLATE
-- comment: weeks/VAAM/deliverables match the standard 6-phase shape, but
-- goal is real per-client content Tenyse writes herself, never hardcoded).
-- ---------------------------------------------------------------------------
create table coaching_phases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  phase_number integer not null,
  name text not null,
  weeks text,
  vaam text not null check (vaam in ('V', 'A_AUTHORITY', 'A_ALIGNMENT', 'M')),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'complete')),
  goal text,
  deliverables jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- coaching_homework — a separate table (not a jsonb column on
-- coaching_phases) for the same reason as campaign_milestones: marking one
-- item complete, or a client submitting a reflection response, should be a
-- single-row update, not a read-modify-write of the whole phase.
-- ---------------------------------------------------------------------------
create table coaching_homework (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references coaching_phases(id) on delete cascade,
  type text not null check (type in ('action', 'reflection', 'standing')),
  text text not null,
  due_date date, -- always null for type = 'standing' — a standing instruction has no due date, it's always active
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'complete')),
  response text, -- the client's answer to a reflection prompt; unused for action/standing items
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- opportunities — backs src/opportunitySchema.js. Standalone, linked to a
-- client but deliberately not nested under a phase (see that file's header
-- comment: an opportunity can land at any point across the 90 days, not
-- just during the Partnership Roadmap phase).
-- ---------------------------------------------------------------------------
create table opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  description text,
  -- 1–5 per criterion (audienceFit/brandValues/credibility/revenuePotential/
  -- visibilityValue), or null if not yet scored — jsonb rather than five
  -- columns since scoring is done incrementally, not all at once.
  scores jsonb not null default '{}'::jsonb,
  decision_status text not null default 'pressure_testing' check (decision_status in ('pursuing', 'pressure_testing', 'declined')),
  write_up text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- coaching_resources — backs src/coachingResourceSchema.js. One shape for
-- both the resource library and the missing-assets checklist, distinguished
-- by `kind` — see that file's header comment for why they're one table.
-- ---------------------------------------------------------------------------
create table coaching_resources (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  kind text not null check (kind in ('resource', 'checklist')),
  title text not null,
  content text,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  -- Null (not false) for kind = 'resource' — "not done" would misrepresent
  -- something that was never a task in the first place.
  completed boolean,
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

-- is_owner() — SECURITY DEFINER helper, fixes the RLS recursion bug found
-- while testing an UPDATE on `clients`: a policy on `profiles` that queries
-- `profiles` again inside its own USING clause (the "owner reads all
-- profiles" policy below, checking role via a self-join) triggers Postgres
-- to re-evaluate RLS on that inner query too, which re-triggers the same
-- policy, infinitely — "infinite recursion detected in policy for relation
-- profiles". SECURITY DEFINER runs this function as its owner (bypassing
-- RLS internally, deliberately, for this one narrow lookup) instead of as
-- the calling user, so the inner lookup never re-enters RLS and the cycle
-- can't start. Every "owner full access" / "owner reads all" policy below
-- now calls this instead of repeating the recursive exists(...) inline —
-- was 8 separate copies of the same bug, so fixing it once here.
create or replace function is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$;

alter table profiles enable row level security;
alter table clients enable row level security;
alter table campaigns enable row level security;
alter table campaign_milestones enable row level security;
alter table placements enable row level security;
alter table outlet_rates enable row level security;
alter table review_queue enable row level security;
alter table campaign_notes enable row level security;
alter table coaching_phases enable row level security;
alter table coaching_homework enable row level security;
alter table opportunities enable row level security;
alter table coaching_resources enable row level security;
alter table errors enable row level security;

-- profiles: everyone can read their own row (needed for the app to look up
-- "am I owner or pr_client, and which client_id"); owners can read all
-- profiles (needed for the owner dashboard's client list).
create policy "read own profile" on profiles
  for select using (id = auth.uid());

create policy "owner reads all profiles" on profiles
  for select using (is_owner());

-- clients: owner full access; a pr_client can only see their own client row.
create policy "owner full access - clients" on clients
  for all using (is_owner());

create policy "pr_client reads own client" on clients
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'pr_client' and profiles.client_id = clients.id
    )
  );

-- campaigns: owner full access; pr_client read-only, scoped to their client_id.
create policy "owner full access - campaigns" on campaigns
  for all using (is_owner());

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
  for all using (is_owner());

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
  for all using (is_owner());

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
  for all using (is_owner());

-- review_queue: internal triage queue (Agent 1's output before a human
-- confirms it into placements) — owner only. A client should never see an
-- unconfirmed candidate match before Tenyse has reviewed it.
create policy "owner full access - review_queue" on review_queue
  for all using (is_owner());

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

-- coaching_phases: owner full access; pr_client read-only, scoped to their
-- own client_id — a client sees their own program's phases, not another
-- client's.
create policy "owner full access - coaching_phases" on coaching_phases
  for all using (is_owner());

create policy "pr_client scoped access - coaching_phases" on coaching_phases
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'pr_client'
        and profiles.client_id = coaching_phases.client_id
    )
  );

-- coaching_homework: owner full access; pr_client can read AND update their
-- own homework (checking off an action item, answering a reflection) —
-- unlike most client-facing tables this needs `for all`, not read-only, per
-- src/client/components/CoachingProgramView.js already letting a client
-- mark homework complete / submit a reflection response themselves.
create policy "owner full access - coaching_homework" on coaching_homework
  for all using (is_owner());

create policy "pr_client scoped access - coaching_homework" on coaching_homework
  for all using (
    exists (
      select 1 from profiles p
      join coaching_phases ph on ph.id = coaching_homework.phase_id
      where p.id = auth.uid() and p.role = 'pr_client' and p.client_id = ph.client_id
    )
  );

-- opportunities: owner full access; pr_client can read their own AND create
-- new ones (the "Send to Tenyse" flow in CoachingProgramView.js), but
-- scoring/decision_status stays effectively owner-controlled at the app
-- layer — RLS can't restrict which columns a role writes, only which rows.
create policy "owner full access - opportunities" on opportunities
  for all using (is_owner());

create policy "pr_client scoped access - opportunities" on opportunities
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'pr_client'
        and profiles.client_id = opportunities.client_id
    )
  );

-- coaching_resources: owner full access; pr_client read-only — the resource
-- library and asset checklist are Tenyse's content for the client to read,
-- not something the client edits.
create policy "owner full access - coaching_resources" on coaching_resources
  for all using (is_owner());

create policy "pr_client scoped access - coaching_resources" on coaching_resources
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'pr_client'
        and profiles.client_id = coaching_resources.client_id
    )
  );

-- errors: internal ops log — owner only.
create policy "owner full access - errors" on errors
  for all using (is_owner());
