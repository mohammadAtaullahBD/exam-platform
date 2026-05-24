create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  invite_token text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint groups_name_not_blank check (char_length(btrim(name)) > 0),
  constraint groups_name_length check (char_length(name) <= 80),
  constraint groups_description_length check (
    description is null or char_length(description) <= 500
  ),
  constraint groups_invite_token_key unique (invite_token)
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, student_id)
);

create index if not exists groups_teacher_id_idx on public.groups(teacher_id);
create index if not exists group_members_group_id_idx on public.group_members(group_id);
create index if not exists group_members_student_id_idx on public.group_members(student_id);

create trigger groups_touch_updated_at
before update on public.groups
for each row execute function private.touch_updated_at();

create or replace function private.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and student_id = (select auth.uid())
  );
$$;

create or replace function private.is_group_teacher(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.groups
    where id = target_group_id
      and teacher_id = (select auth.uid())
  );
$$;

revoke all on function private.is_group_member(uuid) from public;
revoke all on function private.is_group_teacher(uuid) from public;
grant execute on function private.is_group_member(uuid) to authenticated;
grant execute on function private.is_group_teacher(uuid) to authenticated;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "Teachers can create their own groups" on public.groups;
create policy "Teachers can create their own groups"
on public.groups
for insert
to authenticated
with check (
  teacher_id = (select auth.uid())
  and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'teacher'
);

drop policy if exists "Teachers and members can read groups" on public.groups;
create policy "Teachers and members can read groups"
on public.groups
for select
to authenticated
using (
  teacher_id = (select auth.uid())
  or private.is_group_member(id)
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Teachers can update their own groups" on public.groups;
create policy "Teachers can update their own groups"
on public.groups
for update
to authenticated
using (
  teacher_id = (select auth.uid())
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  teacher_id = (select auth.uid())
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Teachers can delete their own groups" on public.groups;
create policy "Teachers can delete their own groups"
on public.groups
for delete
to authenticated
using (
  teacher_id = (select auth.uid())
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Students can join groups" on public.group_members;
create policy "Students can join groups"
on public.group_members
for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'student'
);

drop policy if exists "Teachers and students can read memberships" on public.group_members;
create policy "Teachers and students can read memberships"
on public.group_members
for select
to authenticated
using (
  student_id = (select auth.uid())
  or private.is_group_teacher(group_id)
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Teachers and students can delete memberships" on public.group_members;
create policy "Teachers and students can delete memberships"
on public.group_members
for delete
to authenticated
using (
  student_id = (select auth.uid())
  or private.is_group_teacher(group_id)
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

revoke all on public.groups from anon;
revoke all on public.group_members from anon;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, delete on public.group_members to authenticated;
