-- Supabase Auth is the source of truth for credentials.
-- public.users is the application profile table linked to auth.users by id.

create schema if not exists private;

alter table public.users
  add column if not exists name text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.users
  alter column email set not null,
  alter column role set not null,
  alter column role set default 'student',
  alter column password_hash drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_role_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_role_check
      check (role in ('student', 'teacher', 'admin'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_id_auth_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_id_auth_fkey
      foreign key (id) references auth.users(id) on delete cascade not valid;
  end if;
end $$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
before update on public.users
for each row
execute function private.touch_updated_at();

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
    password_hash = '',
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
execute function private.sync_auth_user_profile();

alter table public.users enable row level security;

drop policy if exists "Users can read their own profile" on public.users;
create policy "Users can read their own profile"
on public.users
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can update their own non-role profile fields" on public.users;
create policy "Users can update their own non-role profile fields"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'student')
);

drop policy if exists "Admins can read all profiles" on public.users;
create policy "Admins can read all profiles"
on public.users
for select
to authenticated
using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

drop policy if exists "Admins can update all profiles" on public.users;
create policy "Admins can update all profiles"
on public.users
for update
to authenticated
using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
with check (true);

grant usage on schema public to anon, authenticated;
grant select, update on public.users to authenticated;
