-- Adds the Supabase Auth -> public.profiles bridge for client invites.
--
-- Safe to run more than once. Run in Supabase SQL Editor after db/schema.sql.
-- Only administrator-controlled app metadata may establish authorization.
-- Owner API invitations provision profiles explicitly after creating the user.

create or replace function public.handle_new_app_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  app_role text := new.raw_app_meta_data->>'role';
  app_client_id uuid := nullif(new.raw_app_meta_data->>'client_id', '')::uuid;
begin
  if app_role is null or app_role not in ('owner', 'pr_client', 'coaching_mentee') then
    return new;
  end if;

  insert into public.profiles (id, role, name, email, client_id)
  values (
    new.id,
    app_role,
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'client_name', ''),
      new.email
    ),
    new.email,
    case when app_role in ('pr_client', 'coaching_mentee') then app_client_id else null end
  )
  on conflict (id) do update set
    role = excluded.role,
    name = excluded.name,
    email = excluded.email,
    client_id = excluded.client_id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_app_user();
