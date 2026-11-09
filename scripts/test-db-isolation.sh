#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
test_dir=$(mktemp -d /tmp/vc-portal-db.XXXXXX)
cleanup() {
  pg_ctl -D "$test_dir/data" -m immediate -w stop >/dev/null 2>&1 || true
  rm -r -- "$test_dir"
}
trap cleanup EXIT

initdb -D "$test_dir/data" -U postgres --auth=trust --no-locale >/dev/null
pg_ctl -D "$test_dir/data" -l "$test_dir/postgres.log" \
  -o "-h '' -k $test_dir" -w start >/dev/null

psql -X -q -v ON_ERROR_STOP=1 -h "$test_dir" -p 5432 -U postgres -d postgres <<'SQL'
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key, email text, raw_user_meta_data jsonb, raw_app_meta_data jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to authenticated;
\i db/schema.sql

-- Simulate existing Supabase grants before applying the release migrations.
grant select on all tables in schema public to anon, authenticated;
\i db/migrations/2026-11-09-trusted-profile-provisioning.sql
\i db/migrations/2026-11-09-placement-browser-access.sql

insert into clients (id, name) values
  ('10000000-0000-4000-8000-000000000001', 'Fixture A'),
  ('10000000-0000-4000-8000-000000000002', 'Fixture B');
insert into auth.users values
  ('20000000-0000-4000-8000-000000000001', 'a@example.test', '{}',
   '{"role":"pr_client","client_id":"10000000-0000-4000-8000-000000000001"}'),
  ('20000000-0000-4000-8000-000000000002', 'b@example.test', '{}',
   '{"role":"pr_client","client_id":"10000000-0000-4000-8000-000000000002"}'),
  ('20000000-0000-4000-8000-000000000003', 'forged@example.test',
   '{"role":"owner","client_id":"10000000-0000-4000-8000-000000000002"}', '{}');

do $$ begin
  if exists (select 1 from profiles where email = 'forged@example.test') then
    raise exception 'User metadata provisioned a forged owner';
  end if;
end $$;

insert into campaigns (client_id, name)
select id, 'Campaign ' || name from clients;
insert into placements (client_id, publication, headline, notes)
select id, 'Fixture outlet', 'Coverage ' || name, 'Owner-only note' from clients;
insert into client_reports (client_id, executive_summary, status)
select id, 'Fixture report', s from clients cross join (values ('draft'), ('approved')) as states(s);

set role authenticated;
do $$
declare i integer; expected uuid;
begin
  for i in 1..2 loop
    perform set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-00000000000' || i, false);
    expected := ('10000000-0000-4000-8000-00000000000' || i)::uuid;
    if (select array_agg(id) from clients) is distinct from array[expected]
      or (select array_agg(client_id) from campaigns) is distinct from array[expected]
      or (select array_agg(client_id) from client_reports) is distinct from array[expected]
      or exists (select 1 from client_reports where status = 'draft') then
      raise exception 'Client % received wrong client data or a draft report', i;
    end if;
    if has_table_privilege(current_user, 'placements', 'SELECT')
      or has_table_privilege(current_user, 'placements_for_client', 'SELECT') then
      raise exception 'Client % can bypass the placements API', i;
    end if;
  end loop;
end $$;
reset role;

set role anon;
do $$ begin
  if has_table_privilege(current_user, 'placements', 'SELECT')
    or has_table_privilege(current_user, 'placements_for_client', 'SELECT') then
    raise exception 'Anonymous browser can read placements';
  end if;
end $$;
reset role;

set role service_role;
do $$ begin
  if (select count(*) from placements_for_client) <> 2
    or exists (select 1 from placements_for_client where notes is not null)
    or (select count(*) from placements where notes = 'Owner-only note') <> 2 then
    raise exception 'API read access or note masking regressed';
  end if;
end $$;
SQL

printf '%s\n' 'Passed: both migrations, forged signup rejection, two-client RLS, draft privacy, and placement grants.'
