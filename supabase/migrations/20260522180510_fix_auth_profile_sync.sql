create schema if not exists private;

create or replace function private.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.users (id, email, name, role, password_hash)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_app_meta_data ->> 'role', 'student'),
    ''
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_auth_user_profile_on_insert on auth.users;
create trigger sync_auth_user_profile_on_insert
after insert on auth.users
for each row
execute function private.sync_auth_user_profile();

drop trigger if exists sync_auth_user_profile_on_update on auth.users;
create trigger sync_auth_user_profile_on_update
after update of email, raw_user_meta_data, raw_app_meta_data on auth.users
for each row
execute function private.sync_auth_user_profile();;
