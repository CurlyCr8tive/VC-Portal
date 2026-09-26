-- Agent learning memory — owner feedback that shapes future agent loops.
-- This is product memory, not model training: approved drafts, rejected
-- candidates, AVE overrides, export mappings, and other owner decisions.

create table if not exists agent_learning_events (
  id uuid primary key default gen_random_uuid(),
  agent_type text not null check (agent_type in ('discovery', 'ave', 'writing', 'campaign_outreach', 'coaching', 'canva_export', 'security')),
  lesson_type text not null default 'feedback',
  owner_action text not null check (owner_action in ('approved', 'rejected', 'edited', 'overridden', 'saved', 'copied', 'exported', 'failed', 'confirmed')),
  client_id uuid references clients(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  placement_id uuid references placements(id) on delete set null,
  entity_type text,
  entity_id text,
  input_summary text,
  output_summary text,
  lesson text,
  confidence text not null default 'owner_feedback',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table agent_learning_events enable row level security;

drop policy if exists "owner full access - agent_learning_events" on agent_learning_events;
create policy "owner full access - agent_learning_events" on agent_learning_events
  for all using (is_owner());
