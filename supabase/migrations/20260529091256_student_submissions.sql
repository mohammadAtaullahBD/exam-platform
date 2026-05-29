create schema if not exists private;

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  score integer not null default 0,
  total_questions integer not null default 0,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint submissions_score_non_negative check (score >= 0),
  constraint submissions_total_questions_non_negative check (total_questions >= 0),
  constraint submissions_score_not_above_total check (score <= total_questions),
  constraint submissions_exam_student_key unique (exam_id, student_id)
);

create table if not exists public.submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  exam_question_id uuid not null references public.exam_questions(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  answer text not null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now(),
  constraint submission_answers_answer_length check (char_length(answer) <= 160),
  constraint submission_answers_submission_exam_question_key unique (
    submission_id,
    exam_question_id
  )
);

create index if not exists submissions_exam_id_idx
  on public.submissions(exam_id);
create index if not exists submissions_student_id_idx
  on public.submissions(student_id);
create index if not exists submissions_exam_score_submitted_at_idx
  on public.submissions(exam_id, score desc, submitted_at asc);
create index if not exists submission_answers_submission_id_idx
  on public.submission_answers(submission_id);
create index if not exists submission_answers_exam_question_id_idx
  on public.submission_answers(exam_question_id);
create index if not exists submission_answers_question_id_idx
  on public.submission_answers(question_id);
create index if not exists submission_answers_wrong_lookup_idx
  on public.submission_answers(submission_id, is_correct)
  where is_correct = false;

create or replace function private.ensure_submission_insert_allowed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.exams
    join public.group_members
      on group_members.group_id = exams.group_id
    where exams.id = new.exam_id
      and group_members.student_id = new.student_id
      and private.exam_state(exams.starts_at, exams.ends_at) = 'active'
  ) then
    raise exception 'Exam is not active for this student.'
      using errcode = 'check_violation';
  end if;

  new.submitted_at = now();
  new.created_at = coalesce(new.created_at, now());

  return new;
end;
$$;

drop trigger if exists submissions_ensure_insert_allowed on public.submissions;
create trigger submissions_ensure_insert_allowed
before insert on public.submissions
for each row execute function private.ensure_submission_insert_allowed();

create or replace function private.can_read_submission(target_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.submissions
    join public.exams on exams.id = submissions.exam_id
    join public.groups on groups.id = exams.group_id
    where submissions.id = target_submission_id
      and (
        submissions.student_id = (select auth.uid())
        or (
          private.exam_state(exams.starts_at, exams.ends_at) = 'closed'
          and (
            groups.teacher_id = (select auth.uid())
            or exists (
              select 1
              from public.group_members
              where group_members.group_id = exams.group_id
                and group_members.student_id = (select auth.uid())
            )
          )
        )
        or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
      )
  );
$$;

create or replace function private.can_read_submission_answer(
  target_submission_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.submissions
    join public.exams on exams.id = submissions.exam_id
    join public.groups on groups.id = exams.group_id
    where submissions.id = target_submission_id
      and (
        submissions.student_id = (select auth.uid())
        or (
          groups.teacher_id = (select auth.uid())
          and private.exam_state(exams.starts_at, exams.ends_at) = 'closed'
        )
        or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
      )
  );
$$;

revoke all on function private.ensure_submission_insert_allowed() from public;
revoke all on function private.can_read_submission(uuid) from public;
revoke all on function private.can_read_submission_answer(uuid) from public;
grant execute on function private.can_read_submission(uuid) to authenticated;
grant execute on function private.can_read_submission_answer(uuid) to authenticated;

alter table public.submissions enable row level security;
alter table public.submission_answers enable row level security;

drop policy if exists "Allowed users can read submissions" on public.submissions;
create policy "Allowed users can read submissions"
on public.submissions
for select
to authenticated
using (private.can_read_submission(id));

drop policy if exists "Allowed users can read submission answers" on public.submission_answers;
create policy "Allowed users can read submission answers"
on public.submission_answers
for select
to authenticated
using (private.can_read_submission_answer(submission_id));

revoke all on public.submissions from anon;
revoke all on public.submission_answers from anon;
grant select on public.submissions to authenticated;
grant select on public.submission_answers to authenticated;
