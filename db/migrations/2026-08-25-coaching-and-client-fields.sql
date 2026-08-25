-- Incremental migration — brings a project already running the Aug 14
-- baseline schema (9 tables, recursive "owner" RLS policies) up to the
-- current db/schema.sql. NOT the full schema.sql — that file assumes a
-- brand-new project and will error on "relation already exists" if run
-- against a project that already has the base 9 tables.
--
-- Safe to run more than once: every ADD COLUMN/CREATE TABLE uses
-- IF NOT EXISTS, and every policy is dropped before being recreated.
--
-- Tested end-to-end against a local Postgres seeded with the exact Aug 14
-- baseline (via git show) before being handed off — confirmed it applies
-- cleanly and that the RLS recursion bug is actually fixed under real
-- (non-superuser, non-bypassrls) row security enforcement, not just
-- "looks right."
--
-- Run this in the Supabase Dashboard's SQL Editor for the project, top to
-- bottom, in one go.

-- ---------------------------------------------------------------------------
-- 1. Client profile fields
-- ---------------------------------------------------------------------------
alter table clients add column if not exists status text not null default 'unconfirmed'
  check (status in ('active', 'past', 'unconfirmed'));
alter table clients add column if not exists engagement_type text not null default 'pr'
  check (engagement_type in ('pr', 'coaching', 'pr_and_coaching'));
alter table clients add column if not exists contact_email text;
alter table clients add column if not exists industry text;
alter table clients add column if not exists engagement_start_date date;
alter table clients add column if not exists notes text;

-- ---------------------------------------------------------------------------
-- 2. Campaign duration/budget
-- ---------------------------------------------------------------------------
alter table campaigns add column if not exists duration text;
alter table campaigns add column if not exists budget numeric(12, 2);

-- ---------------------------------------------------------------------------
-- 3. Placement audience_reach + the client-facing notes-privacy view
-- ---------------------------------------------------------------------------
alter table placements add column if not exists audience_reach bigint;

create or replace view placements_for_client as
select
  id, client_id, campaign_id, publication, headline, article_url, publication_date,
  ave_value, ave_auto_calculated, pitch_sent_date, landed_date,
  sentiment_tag, sentiment_confirmed_by_owner, audience_reach,
  case when notes_shareable then notes else null end as notes,
  notes_shareable, source, created_at, created_by
from placements;

-- ---------------------------------------------------------------------------
-- 4. Coaching Program tables
-- ---------------------------------------------------------------------------
create table if not exists coaching_phases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  phase_number integer not null,
  name text not null,
  weeks text,
  vaam text not null check (vaam in ('V', 'A_AUTHORITY', 'A_ALIGNMENT', 'M', 'NOT_APPLICABLE')),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'complete')),
  goal text,
  deliverables jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists coaching_homework (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references coaching_phases(id) on delete cascade,
  type text not null check (type in ('action', 'reflection', 'standing')),
  text text not null,
  due_date date,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'complete')),
  response text,
  created_at timestamptz not null default now()
);

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  description text,
  scores jsonb not null default '{}'::jsonb,
  decision_status text not null default 'pressure_testing' check (decision_status in ('pursuing', 'pressure_testing', 'declined')),
  write_up text,
  created_at timestamptz not null default now()
);

create table if not exists coaching_resources (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  kind text not null check (kind in ('resource', 'checklist')),
  title text not null,
  content text,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  completed boolean,
  created_at timestamptz not null default now()
);

alter table coaching_phases enable row level security;
alter table coaching_homework enable row level security;
alter table opportunities enable row level security;
alter table coaching_resources enable row level security;

-- ---------------------------------------------------------------------------
-- 5. is_owner() — fixes the RLS recursion bug (infinite recursion detected
-- in policy for relation profiles) found testing an UPDATE on clients.
-- ---------------------------------------------------------------------------
create or replace function is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$;

-- ---------------------------------------------------------------------------
-- 6. Swap every recursive "owner" policy to use is_owner() instead.
-- Drop-then-create so this is safe to re-run.
-- ---------------------------------------------------------------------------
drop policy if exists "owner reads all profiles" on profiles;
create policy "owner reads all profiles" on profiles
  for select using (is_owner());

drop policy if exists "owner full access - clients" on clients;
create policy "owner full access - clients" on clients
  for all using (is_owner());

drop policy if exists "owner full access - campaigns" on campaigns;
create policy "owner full access - campaigns" on campaigns
  for all using (is_owner());

drop policy if exists "owner full access - campaign_milestones" on campaign_milestones;
create policy "owner full access - campaign_milestones" on campaign_milestones
  for all using (is_owner());

drop policy if exists "owner full access - placements" on placements;
create policy "owner full access - placements" on placements
  for all using (is_owner());

drop policy if exists "owner full access - outlet_rates" on outlet_rates;
create policy "owner full access - outlet_rates" on outlet_rates
  for all using (is_owner());

drop policy if exists "owner full access - review_queue" on review_queue;
create policy "owner full access - review_queue" on review_queue
  for all using (is_owner());

drop policy if exists "owner full access - errors" on errors;
create policy "owner full access - errors" on errors
  for all using (is_owner());

-- ---------------------------------------------------------------------------
-- 7. RLS policies for the 4 new Coaching Program tables.
-- ---------------------------------------------------------------------------
drop policy if exists "owner full access - coaching_phases" on coaching_phases;
create policy "owner full access - coaching_phases" on coaching_phases
  for all using (is_owner());

drop policy if exists "pr_client scoped access - coaching_phases" on coaching_phases;
create policy "pr_client scoped access - coaching_phases" on coaching_phases
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'pr_client'
        and profiles.client_id = coaching_phases.client_id
    )
  );

drop policy if exists "owner full access - coaching_homework" on coaching_homework;
create policy "owner full access - coaching_homework" on coaching_homework
  for all using (is_owner());

drop policy if exists "pr_client scoped access - coaching_homework" on coaching_homework;
create policy "pr_client scoped access - coaching_homework" on coaching_homework
  for all using (
    exists (
      select 1 from profiles p
      join coaching_phases ph on ph.id = coaching_homework.phase_id
      where p.id = auth.uid() and p.role = 'pr_client' and p.client_id = ph.client_id
    )
  );

drop policy if exists "owner full access - opportunities" on opportunities;
create policy "owner full access - opportunities" on opportunities
  for all using (is_owner());

drop policy if exists "pr_client scoped access - opportunities" on opportunities;
create policy "pr_client scoped access - opportunities" on opportunities
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'pr_client'
        and profiles.client_id = opportunities.client_id
    )
  );

drop policy if exists "owner full access - coaching_resources" on coaching_resources;
create policy "owner full access - coaching_resources" on coaching_resources
  for all using (is_owner());

drop policy if exists "pr_client scoped access - coaching_resources" on coaching_resources;
create policy "pr_client scoped access - coaching_resources" on coaching_resources
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'pr_client'
        and profiles.client_id = coaching_resources.client_id
    )
  );
