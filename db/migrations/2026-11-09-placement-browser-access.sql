-- Both APIs access placements through service_role. Browser sessions must
-- not bypass client scoping via the view or read private notes on the table.
begin;

revoke all privileges on table public.placements, public.placements_for_client
  from public, anon, authenticated;
grant select, insert, update, delete on table public.placements to service_role;
grant select on table public.placements_for_client to service_role;

commit;
