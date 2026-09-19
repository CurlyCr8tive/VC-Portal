-- Client messages + shared files
--
-- Adds real backend-backed records for the client portal's Messages and
-- Files pages. File bytes live in Supabase Storage; this table stores the
-- app metadata and client scoping.

create table if not exists client_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  author_id uuid not null references profiles(id),
  author_role text not null check (author_role in ('owner', 'pr_client')),
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists client_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  uploaded_by uuid not null references profiles(id),
  uploaded_by_role text not null check (uploaded_by_role in ('owner', 'pr_client')),
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  storage_bucket text not null default 'client-files',
  storage_path text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists client_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text not null default 'Coverage Report',
  period_label text,
  executive_summary text not null,
  narrative text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'published')),
  approved_at timestamptz,
  approved_by uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_type text not null,
  client_id uuid references clients(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  placement_id uuid references placements(id) on delete set null,
  status text not null check (status in ('success', 'error', 'skipped')),
  provider text,
  input_summary text,
  output_summary text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists client_invites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  email text not null,
  status text not null default 'sent' check (status in ('sent', 'accepted', 'expired', 'failed')),
  sent_by uuid references profiles(id),
  sent_at timestamptz not null default now(),
  accepted_at timestamptz,
  error_message text
);

alter table placements add column if not exists lead_time_override_days integer check (lead_time_override_days is null or lead_time_override_days >= 0);
alter table placements add column if not exists lead_time_source text not null default 'dates'
  check (lead_time_source in ('dates', 'manual', 'sample', 'gmail', 'unknown'));
alter table placements add column if not exists lead_time_notes text;

create or replace view placements_for_client as
select
  id, client_id, campaign_id, publication, headline, article_url, publication_date,
  ave_value, ave_auto_calculated, pitch_sent_date, landed_date,
  lead_time_override_days, lead_time_source, lead_time_notes,
  sentiment_tag, sentiment_confirmed_by_owner, audience_reach,
  case when notes_shareable then notes else null end as notes,
  notes_shareable, source, created_at, created_by
from placements;

alter table client_messages enable row level security;
alter table client_files enable row level security;
alter table client_reports enable row level security;
alter table agent_runs enable row level security;
alter table client_invites enable row level security;

drop policy if exists "owner full access - client_messages" on client_messages;
create policy "owner full access - client_messages" on client_messages
  for all using (is_owner());

drop policy if exists "pr_client scoped access - client_messages" on client_messages;
create policy "pr_client scoped access - client_messages" on client_messages
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'pr_client'
        and profiles.client_id = client_messages.client_id
    )
  );

drop policy if exists "owner full access - client_files" on client_files;
create policy "owner full access - client_files" on client_files
  for all using (is_owner());

drop policy if exists "pr_client scoped access - client_files" on client_files;
create policy "pr_client scoped access - client_files" on client_files
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'pr_client'
        and profiles.client_id = client_files.client_id
    )
  );

drop policy if exists "owner full access - client_reports" on client_reports;
create policy "owner full access - client_reports" on client_reports
  for all using (is_owner());

drop policy if exists "pr_client reads approved client_reports" on client_reports;
create policy "pr_client reads approved client_reports" on client_reports
  for select using (
    status in ('approved', 'published')
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'pr_client'
        and profiles.client_id = client_reports.client_id
    )
  );

drop policy if exists "owner full access - agent_runs" on agent_runs;
create policy "owner full access - agent_runs" on agent_runs
  for all using (is_owner());

drop policy if exists "owner full access - client_invites" on client_invites;
create policy "owner full access - client_invites" on client_invites
  for all using (is_owner());
