create schema if not exists private;

alter table public.users
  add column if not exists bio text;

update public.users
set
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now()),
  password_hash = coalesce(password_hash, '');

alter table public.users
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  alter column password_hash drop not null;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, private
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

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists posts_teacher_id_created_at_idx
on public.posts (teacher_id, created_at desc);

alter table public.users enable row level security;
alter table public.posts enable row level security;

drop policy if exists "Admins can read all profiles" on public.users;
drop policy if exists "Admins can read all users" on public.users;
drop policy if exists "Admins can update all profiles" on public.users;
drop policy if exists "Anyone can create users" on public.users;
drop policy if exists "Authenticated users can read teacher profiles" on public.users;
drop policy if exists "Students can read own profile" on public.users;
drop policy if exists "Teachers can read own profile" on public.users;
drop policy if exists "Users can read their own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can update their own non-role profile fields" on public.users;

create policy "Authenticated users can read allowed profiles"
on public.users
for select
to authenticated
using (
  id = (select auth.uid())
  or role = 'teacher'
  or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
);

create policy "Authenticated users can update allowed profile fields"
on public.users
for update
to authenticated
using (
  id = (select auth.uid())
  or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
)
with check (
  (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
  or (
    id = (select auth.uid())
    and role = coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', 'student')
  )
);

drop policy if exists "Authenticated users can read public teacher posts" on public.posts;
create policy "Authenticated users can read public teacher posts"
on public.posts
for select
to authenticated
using (true);

drop policy if exists "Teachers can create their own posts" on public.posts;
create policy "Teachers can create their own posts"
on public.posts
for insert
to authenticated
with check (
  teacher_id = (select auth.uid())
  and (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'teacher'
);

drop policy if exists "Teachers can update their own posts" on public.posts;
create policy "Teachers can update their own posts"
on public.posts
for update
to authenticated
using (
  teacher_id = (select auth.uid())
  and (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'teacher'
)
with check (
  teacher_id = (select auth.uid())
  and (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'teacher'
);

drop policy if exists "Teachers can delete their own posts" on public.posts;
create policy "Teachers can delete their own posts"
on public.posts
for delete
to authenticated
using (
  teacher_id = (select auth.uid())
  and (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'teacher'
);

revoke all on public.users from anon;
revoke insert, update, delete, truncate, references, trigger on public.users from authenticated;
grant select on public.users to authenticated;
grant update (name, bio, updated_at) on public.users to authenticated;

revoke all on public.posts from anon;
grant select, insert, update, delete on public.posts to authenticated;
