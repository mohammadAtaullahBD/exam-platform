create schema if not exists private;

create table if not exists public.public_exam_sets (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_exam_sets_title_not_blank check (char_length(btrim(title)) > 0),
  constraint public_exam_sets_title_length check (char_length(title) <= 120),
  constraint public_exam_sets_description_length check (
    description is null or char_length(description) <= 1000
  )
);

create table if not exists public.public_exam_set_questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.public_exam_sets(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  sort_order integer not null,
  snapshot_content text not null,
  snapshot_options jsonb not null,
  snapshot_correct_answer text not null,
  created_at timestamptz not null default now(),
  constraint public_exam_set_questions_sort_order_check check (sort_order >= 0),
  constraint public_exam_set_questions_content_not_blank check (
    char_length(btrim(snapshot_content)) > 0
  ),
  constraint public_exam_set_questions_content_length check (
    char_length(snapshot_content) <= 2000
  ),
  constraint public_exam_set_questions_options_valid check (
    private.valid_question_options(snapshot_options)
  ),
  constraint public_exam_set_questions_answer_valid check (
    private.valid_question_answer(snapshot_options, snapshot_correct_answer)
  ),
  constraint public_exam_set_questions_set_sort_order_key unique (set_id, sort_order)
);

create table if not exists public.public_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.public_exam_sets(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  score integer not null default 0,
  total_questions integer not null default 0,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint public_exam_attempts_score_non_negative check (score >= 0),
  constraint public_exam_attempts_total_questions_non_negative check (
    total_questions >= 0
  ),
  constraint public_exam_attempts_score_not_above_total check (
    score <= total_questions
  )
);

create table if not exists public.public_exam_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.public_exam_attempts(id) on delete cascade,
  set_question_id uuid not null references public.public_exam_set_questions(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  answer text not null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now(),
  constraint public_exam_attempt_answers_answer_length check (char_length(answer) <= 160),
  constraint public_exam_attempt_answers_attempt_question_key unique (
    attempt_id,
    set_question_id
  )
);

create index if not exists public_exam_sets_admin_id_idx
  on public.public_exam_sets(admin_id);
create index if not exists public_exam_sets_published_created_at_idx
  on public.public_exam_sets(is_published, created_at desc);
create index if not exists public_exam_set_questions_set_id_idx
  on public.public_exam_set_questions(set_id);
create index if not exists public_exam_set_questions_question_id_idx
  on public.public_exam_set_questions(question_id);
create index if not exists public_exam_attempts_set_id_idx
  on public.public_exam_attempts(set_id);
create index if not exists public_exam_attempts_student_id_idx
  on public.public_exam_attempts(student_id);
create index if not exists public_exam_attempt_answers_attempt_id_idx
  on public.public_exam_attempt_answers(attempt_id);
create index if not exists public_exam_attempt_answers_set_question_id_idx
  on public.public_exam_attempt_answers(set_question_id);
create index if not exists public_exam_attempt_answers_question_id_idx
  on public.public_exam_attempt_answers(question_id);

drop trigger if exists public_exam_sets_touch_updated_at on public.public_exam_sets;
create trigger public_exam_sets_touch_updated_at
before update on public.public_exam_sets
for each row execute function private.touch_updated_at();

create or replace function private.ensure_public_exam_attempt_insert_allowed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.public_exam_sets
    where public_exam_sets.id = new.set_id
      and public_exam_sets.is_published
  ) then
    raise exception 'Public exam set is not available.'
      using errcode = 'check_violation';
  end if;

  new.submitted_at = now();
  new.created_at = coalesce(new.created_at, now());

  return new;
end;
$$;

drop trigger if exists public_exam_attempts_ensure_insert_allowed
  on public.public_exam_attempts;
create trigger public_exam_attempts_ensure_insert_allowed
before insert on public.public_exam_attempts
for each row execute function private.ensure_public_exam_attempt_insert_allowed();

create or replace function private.can_read_public_exam_attempt(target_attempt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.public_exam_attempts
    where public_exam_attempts.id = target_attempt_id
      and (
        public_exam_attempts.student_id = (select auth.uid())
        or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
      )
  );
$$;

revoke all on function private.ensure_public_exam_attempt_insert_allowed() from public;
revoke all on function private.can_read_public_exam_attempt(uuid) from public;
grant execute on function private.can_read_public_exam_attempt(uuid) to authenticated;

alter table public.public_exam_sets enable row level security;
alter table public.public_exam_set_questions enable row level security;
alter table public.public_exam_attempts enable row level security;
alter table public.public_exam_attempt_answers enable row level security;

drop policy if exists "Admins can create public exam sets" on public.public_exam_sets;
create policy "Admins can create public exam sets"
on public.public_exam_sets
for insert
to authenticated
with check (
  admin_id = (select auth.uid())
  and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Authenticated users can read published public exam sets"
  on public.public_exam_sets;
create policy "Authenticated users can read published public exam sets"
on public.public_exam_sets
for select
to authenticated
using (
  is_published
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Admins can update public exam sets" on public.public_exam_sets;
create policy "Admins can update public exam sets"
on public.public_exam_sets
for update
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete public exam sets" on public.public_exam_sets;
create policy "Admins can delete public exam sets"
on public.public_exam_sets
for delete
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can create public exam set questions"
  on public.public_exam_set_questions;
create policy "Admins can create public exam set questions"
on public.public_exam_set_questions
for insert
to authenticated
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Authenticated users can read published public exam questions"
  on public.public_exam_set_questions;
create policy "Authenticated users can read published public exam questions"
on public.public_exam_set_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.public_exam_sets
    where public_exam_sets.id = public_exam_set_questions.set_id
      and (
        public_exam_sets.is_published
        or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
      )
  )
);

drop policy if exists "Admins can update public exam set questions"
  on public.public_exam_set_questions;
create policy "Admins can update public exam set questions"
on public.public_exam_set_questions
for update
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete public exam set questions"
  on public.public_exam_set_questions;
create policy "Admins can delete public exam set questions"
on public.public_exam_set_questions
for delete
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Students can read own public exam attempts"
  on public.public_exam_attempts;
create policy "Students can read own public exam attempts"
on public.public_exam_attempts
for select
to authenticated
using (private.can_read_public_exam_attempt(id));

drop policy if exists "Students can read own public exam answers"
  on public.public_exam_attempt_answers;
create policy "Students can read own public exam answers"
on public.public_exam_attempt_answers
for select
to authenticated
using (private.can_read_public_exam_attempt(attempt_id));

revoke all on public.public_exam_sets from anon;
revoke all on public.public_exam_set_questions from anon;
revoke all on public.public_exam_attempts from anon;
revoke all on public.public_exam_attempt_answers from anon;
grant select, insert, update, delete on public.public_exam_sets to authenticated;
grant select, insert, update, delete on public.public_exam_set_questions to authenticated;
grant select on public.public_exam_attempts to authenticated;
grant select on public.public_exam_attempt_answers to authenticated;
