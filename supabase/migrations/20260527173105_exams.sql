create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron with schema extensions;
create schema if not exists private;

create or replace function private.exam_state(starts_at timestamptz, ends_at timestamptz)
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select case
    when now() < starts_at then 'scheduled'
    when now() >= starts_at and now() < ends_at then 'active'
    else 'closed'
  end;
$$;

revoke all on function private.exam_state(timestamptz, timestamptz) from public;
grant execute on function private.exam_state(timestamptz, timestamptz) to authenticated;

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exams_title_not_blank check (char_length(btrim(title)) > 0),
  constraint exams_title_length check (char_length(title) <= 120),
  constraint exams_time_order check (starts_at < ends_at),
  constraint exams_closed_after_end check (closed_at is null or closed_at >= ends_at)
);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  sort_order integer not null,
  snapshot_content text not null,
  snapshot_options jsonb not null,
  snapshot_correct_answer text not null,
  created_at timestamptz not null default now(),
  constraint exam_questions_sort_order_check check (sort_order >= 0),
  constraint exam_questions_content_not_blank check (
    char_length(btrim(snapshot_content)) > 0
  ),
  constraint exam_questions_content_length check (char_length(snapshot_content) <= 2000),
  constraint exam_questions_options_valid check (
    private.valid_question_options(snapshot_options)
  ),
  constraint exam_questions_answer_valid check (
    private.valid_question_answer(snapshot_options, snapshot_correct_answer)
  ),
  constraint exam_questions_exam_sort_order_key unique (exam_id, sort_order)
);

create index if not exists exams_group_id_idx on public.exams(group_id);
create index if not exists exams_starts_at_idx on public.exams(starts_at);
create index if not exists exams_ends_at_idx on public.exams(ends_at);
create index if not exists exam_questions_exam_id_idx on public.exam_questions(exam_id);
create index if not exists exam_questions_question_id_idx on public.exam_questions(question_id);

drop trigger if exists exams_touch_updated_at on public.exams;
create trigger exams_touch_updated_at
before update on public.exams
for each row execute function private.touch_updated_at();

create or replace function private.is_exam_teacher(target_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.exams
    join public.groups on groups.id = exams.group_id
    where exams.id = target_exam_id
      and groups.teacher_id = (select auth.uid())
  );
$$;

create or replace function private.is_exam_group_member(target_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.exams
    join public.group_members on group_members.group_id = exams.group_id
    where exams.id = target_exam_id
      and group_members.student_id = (select auth.uid())
  );
$$;

create or replace function private.exam_is_scheduled(target_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.exams
    where id = target_exam_id
      and private.exam_state(starts_at, ends_at) = 'scheduled'
  );
$$;

create or replace function private.close_due_exams()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  closed_count integer;
begin
  update public.exams
  set closed_at = now()
  where closed_at is null
    and ends_at <= now();

  get diagnostics closed_count = row_count;
  return closed_count;
end;
$$;

revoke all on function private.is_exam_teacher(uuid) from public;
revoke all on function private.is_exam_group_member(uuid) from public;
revoke all on function private.exam_is_scheduled(uuid) from public;
revoke all on function private.close_due_exams() from public;
grant execute on function private.is_exam_teacher(uuid) to authenticated;
grant execute on function private.is_exam_group_member(uuid) to authenticated;
grant execute on function private.exam_is_scheduled(uuid) to authenticated;

alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;

drop policy if exists "Teachers can create exams for their groups" on public.exams;
create policy "Teachers can create exams for their groups"
on public.exams
for insert
to authenticated
with check (
  private.is_group_teacher(group_id)
  and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'teacher'
);

drop policy if exists "Teachers and group members can read exams" on public.exams;
create policy "Teachers and group members can read exams"
on public.exams
for select
to authenticated
using (
  private.is_group_teacher(group_id)
  or exists (
    select 1
    from public.group_members
    where group_members.group_id = exams.group_id
      and group_members.student_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Teachers can update scheduled exams" on public.exams;
create policy "Teachers can update scheduled exams"
on public.exams
for update
to authenticated
using (
  (
    private.is_group_teacher(group_id)
    and private.exam_state(starts_at, ends_at) = 'scheduled'
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    private.is_group_teacher(group_id)
    and private.exam_state(starts_at, ends_at) = 'scheduled'
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Teachers can delete scheduled exams" on public.exams;
create policy "Teachers can delete scheduled exams"
on public.exams
for delete
to authenticated
using (
  (
    private.is_group_teacher(group_id)
    and private.exam_state(starts_at, ends_at) = 'scheduled'
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Teachers can add scheduled exam questions" on public.exam_questions;
create policy "Teachers can add scheduled exam questions"
on public.exam_questions
for insert
to authenticated
with check (
  private.is_exam_teacher(exam_id)
  and private.exam_is_scheduled(exam_id)
  and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'teacher'
);

drop policy if exists "Teachers and members can read exam questions" on public.exam_questions;
create policy "Teachers and members can read exam questions"
on public.exam_questions
for select
to authenticated
using (
  private.is_exam_teacher(exam_id)
  or private.is_exam_group_member(exam_id)
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Teachers can update scheduled exam questions" on public.exam_questions;
create policy "Teachers can update scheduled exam questions"
on public.exam_questions
for update
to authenticated
using (
  (
    private.is_exam_teacher(exam_id)
    and private.exam_is_scheduled(exam_id)
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    private.is_exam_teacher(exam_id)
    and private.exam_is_scheduled(exam_id)
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Teachers can delete scheduled exam questions" on public.exam_questions;
create policy "Teachers can delete scheduled exam questions"
on public.exam_questions
for delete
to authenticated
using (
  (
    private.is_exam_teacher(exam_id)
    and private.exam_is_scheduled(exam_id)
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

revoke all on public.exams from anon;
revoke all on public.exam_questions from anon;
grant select, insert, update, delete on public.exams to authenticated;
grant select, insert, update, delete on public.exam_questions to authenticated;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'close-due-exams'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

select cron.schedule(
  'close-due-exams',
  '* * * * *',
  $$select private.close_due_exams();$$
);
