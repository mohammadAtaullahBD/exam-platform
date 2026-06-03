create schema if not exists private;

alter table public.group_members
  add column if not exists roll_number integer,
  add column if not exists student_identity text;

with ranked_members as (
  select
    group_id,
    student_id,
    row_number() over (
      partition by group_id
      order by joined_at asc, student_id asc
    ) as next_roll_number
  from public.group_members
)
update public.group_members members
set roll_number = ranked_members.next_roll_number
from ranked_members
where members.group_id = ranked_members.group_id
  and members.student_id = ranked_members.student_id
  and members.roll_number is null;

alter table public.group_members
  alter column roll_number set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'group_members_roll_number_positive'
      and conrelid = 'public.group_members'::regclass
  ) then
    alter table public.group_members
      add constraint group_members_roll_number_positive
      check (roll_number > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'group_members_student_identity_length'
      and conrelid = 'public.group_members'::regclass
  ) then
    alter table public.group_members
      add constraint group_members_student_identity_length
      check (
        student_identity is null
        or (
          char_length(btrim(student_identity)) > 0
          and char_length(student_identity) <= 80
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'group_members_group_roll_number_key'
      and conrelid = 'public.group_members'::regclass
  ) then
    alter table public.group_members
      add constraint group_members_group_roll_number_key
      unique (group_id, roll_number);
  end if;
end $$;

create index if not exists group_members_group_roll_number_idx
  on public.group_members(group_id, roll_number);

create or replace function private.assign_group_member_roll_number()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.roll_number is null then
    select coalesce(max(group_members.roll_number), 0) + 1
    into new.roll_number
    from public.group_members
    where group_members.group_id = new.group_id;
  end if;

  if new.student_identity is not null then
    new.student_identity = nullif(btrim(new.student_identity), '');
  end if;

  return new;
end;
$$;

drop trigger if exists group_members_assign_roll_number on public.group_members;
create trigger group_members_assign_roll_number
before insert on public.group_members
for each row execute function private.assign_group_member_roll_number();

revoke all on function private.assign_group_member_roll_number() from public;

drop policy if exists "Teachers can update batch member identity" on public.group_members;
create policy "Teachers can update batch member identity"
on public.group_members
for update
to authenticated
using (
  private.is_group_teacher(group_id)
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  private.is_group_teacher(group_id)
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

revoke update on public.group_members from authenticated;
grant update (roll_number, student_identity) on public.group_members to authenticated;
