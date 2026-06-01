begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create or replace function private.valid_choice_options(
  candidate jsonb,
  min_count integer default 2,
  max_count integer default 50
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when candidate is null then false
    when jsonb_typeof(candidate) <> 'array' then false
    when jsonb_array_length(candidate) < min_count then false
    when jsonb_array_length(candidate) > max_count then false
    when exists (
      select 1
      from jsonb_array_elements(candidate) as option(value)
      where jsonb_typeof(option.value) <> 'string'
        or char_length(btrim(option.value #>> '{}')) = 0
        or char_length(option.value #>> '{}') > 160
    ) then false
    when (
      select count(*)
      from jsonb_array_elements_text(candidate) as option(value)
    ) <> (
      select count(distinct lower(btrim(option.value)))
      from jsonb_array_elements_text(candidate) as option(value)
    ) then false
    else true
  end;
$$;

create or replace function private.valid_empty_options(candidate jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select candidate is not null
    and jsonb_typeof(candidate) = 'array'
    and jsonb_array_length(candidate) = 0;
$$;

create or replace function private.jsonb_int(candidate jsonb, key text)
returns integer
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when candidate is null then null
    when jsonb_typeof(candidate) <> 'object' then null
    when (candidate ->> key) ~ '^-?[0-9]+$' then (candidate ->> key)::integer
    else null
  end;
$$;

create or replace function private.valid_scale_settings(
  candidate_type text,
  candidate_settings jsonb
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when candidate_settings is null then false
    when jsonb_typeof(candidate_settings) <> 'object' then false
    when candidate_type = 'linear_scale' then
      private.jsonb_int(candidate_settings, 'min') is not null
      and private.jsonb_int(candidate_settings, 'max') is not null
      and private.jsonb_int(candidate_settings, 'min') >= 0
      and private.jsonb_int(candidate_settings, 'min') < private.jsonb_int(candidate_settings, 'max')
      and private.jsonb_int(candidate_settings, 'max') <= 10
    when candidate_type = 'rating' then
      coalesce(private.jsonb_int(candidate_settings, 'min'), 1) = 1
      and private.jsonb_int(candidate_settings, 'max') is not null
      and private.jsonb_int(candidate_settings, 'max') between 2 and 10
    else false
  end;
$$;

create or replace function private.valid_question_options_for_type(
  candidate_type text,
  candidate_options jsonb,
  candidate_settings jsonb
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when candidate_type in ('multiple_choice', 'checkboxes', 'dropdown') then
      private.valid_choice_options(candidate_options, 2, 50)
    when candidate_type in ('short_answer', 'paragraph') then
      private.valid_empty_options(candidate_options)
    when candidate_type in ('linear_scale', 'rating') then
      private.valid_empty_options(candidate_options)
      and private.valid_scale_settings(candidate_type, candidate_settings)
    else false
  end;
$$;

create or replace function private.valid_answer_key_for_type(
  candidate_type text,
  candidate_options jsonb,
  candidate_settings jsonb,
  candidate_answer_key jsonb,
  candidate_grading_mode text
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when candidate_grading_mode not in ('auto', 'none') then false
    when candidate_answer_key is null then false
    when jsonb_typeof(candidate_answer_key) <> 'object' then false
    when candidate_type = 'paragraph' then candidate_grading_mode = 'none'
    when candidate_grading_mode = 'none' then true
    when candidate_type in ('multiple_choice', 'dropdown') then exists (
      select 1
      from jsonb_array_elements_text(candidate_options) as option(value)
      where btrim(option.value) = btrim(
        coalesce(candidate_answer_key ->> 'answer', candidate_answer_key ->> 'value')
      )
    )
    when candidate_type = 'checkboxes' then
      jsonb_typeof(
        coalesce(candidate_answer_key -> 'answers', candidate_answer_key -> 'values')
      ) = 'array'
      and jsonb_array_length(
        coalesce(candidate_answer_key -> 'answers', candidate_answer_key -> 'values')
      ) > 0
      and (
        select count(*)
        from jsonb_array_elements_text(
          coalesce(candidate_answer_key -> 'answers', candidate_answer_key -> 'values')
        ) as answer(value)
      ) = (
        select count(distinct lower(btrim(answer.value)))
        from jsonb_array_elements_text(
          coalesce(candidate_answer_key -> 'answers', candidate_answer_key -> 'values')
        ) as answer(value)
      )
      and not exists (
        select 1
        from jsonb_array_elements_text(
          coalesce(candidate_answer_key -> 'answers', candidate_answer_key -> 'values')
        ) as answer(value)
        where not exists (
          select 1
          from jsonb_array_elements_text(candidate_options) as option(value)
          where btrim(option.value) = btrim(answer.value)
        )
      )
    when candidate_type = 'short_answer' then
      (
        jsonb_typeof(
          coalesce(candidate_answer_key -> 'answers', candidate_answer_key -> 'values')
        ) = 'array'
        and jsonb_array_length(
          coalesce(candidate_answer_key -> 'answers', candidate_answer_key -> 'values')
        ) > 0
        and not exists (
          select 1
          from jsonb_array_elements(
            coalesce(candidate_answer_key -> 'answers', candidate_answer_key -> 'values')
          ) as answer(value)
          where jsonb_typeof(answer.value) <> 'string'
            or char_length(btrim(answer.value #>> '{}')) = 0
            or char_length(answer.value #>> '{}') > 160
        )
      )
      or (
        char_length(
          btrim(
            coalesce(
              candidate_answer_key ->> 'answer',
              candidate_answer_key ->> 'value',
              ''
            )
          )
        ) > 0
      )
    when candidate_type in ('linear_scale', 'rating') then
      coalesce(
        private.jsonb_int(candidate_answer_key, 'answer'),
        private.jsonb_int(candidate_answer_key, 'value')
      ) is not null
      and coalesce(
        private.jsonb_int(candidate_answer_key, 'answer'),
        private.jsonb_int(candidate_answer_key, 'value')
      ) >= coalesce(
        private.jsonb_int(candidate_settings, 'min'),
        1
      )
      and coalesce(
        private.jsonb_int(candidate_answer_key, 'answer'),
        private.jsonb_int(candidate_answer_key, 'value')
      ) <= private.jsonb_int(candidate_settings, 'max')
    else false
  end;
$$;

revoke all on function private.valid_choice_options(jsonb, integer, integer) from public;
revoke all on function private.valid_empty_options(jsonb) from public;
revoke all on function private.jsonb_int(jsonb, text) from public;
revoke all on function private.valid_scale_settings(text, jsonb) from public;
revoke all on function private.valid_question_options_for_type(text, jsonb, jsonb) from public;
revoke all on function private.valid_answer_key_for_type(text, jsonb, jsonb, jsonb, text) from public;
grant execute on function private.valid_choice_options(jsonb, integer, integer) to authenticated;
grant execute on function private.valid_empty_options(jsonb) to authenticated;
grant execute on function private.jsonb_int(jsonb, text) to authenticated;
grant execute on function private.valid_scale_settings(text, jsonb) to authenticated;
grant execute on function private.valid_question_options_for_type(text, jsonb, jsonb) to authenticated;
grant execute on function private.valid_answer_key_for_type(text, jsonb, jsonb, jsonb, text) to authenticated;

create table if not exists public.question_sets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  source text not null default 'teacher',
  original_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_sets_title_not_blank check (char_length(btrim(title)) > 0),
  constraint question_sets_title_length check (char_length(title) <= 120),
  constraint question_sets_description_length check (
    description is null or char_length(description) <= 1000
  ),
  constraint question_sets_source_check check (source in ('teacher', 'admin'))
);

create index if not exists question_sets_teacher_id_idx
  on public.question_sets(teacher_id);
create index if not exists question_sets_original_id_idx
  on public.question_sets(original_id);
create index if not exists question_sets_teacher_source_created_at_idx
  on public.question_sets(teacher_id, source, created_at desc);

drop trigger if exists question_sets_touch_updated_at on public.question_sets;
create trigger question_sets_touch_updated_at
before update on public.question_sets
for each row execute function private.touch_updated_at();

alter table public.question_sets enable row level security;

drop policy if exists "Teachers and admins can create question sets"
  on public.question_sets;
create policy "Teachers and admins can create question sets"
on public.question_sets
for insert
to authenticated
with check (
  (
    teacher_id = (select auth.uid())
    and source = 'teacher'
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'teacher'
  )
  or (
    teacher_id = (select auth.uid())
    and source = 'admin'
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
);

drop policy if exists "Owners and admins can read question sets"
  on public.question_sets;
create policy "Owners and admins can read question sets"
on public.question_sets
for select
to authenticated
using (
  teacher_id = (select auth.uid())
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Owners and admins can update question sets"
  on public.question_sets;
create policy "Owners and admins can update question sets"
on public.question_sets
for update
to authenticated
using (
  teacher_id = (select auth.uid())
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    teacher_id = (select auth.uid())
    and source = 'teacher'
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'teacher'
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Owners and admins can delete question sets"
  on public.question_sets;
create policy "Owners and admins can delete question sets"
on public.question_sets
for delete
to authenticated
using (
  teacher_id = (select auth.uid())
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

revoke all on public.question_sets from anon;
grant select, insert, update, delete on public.question_sets to authenticated;

create table if not exists public.question_set_questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.question_sets(id) on delete cascade,
  original_question_id uuid references public.questions(id) on delete set null,
  content text not null,
  description text,
  question_type text not null default 'multiple_choice',
  options jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  answer_key jsonb not null default '{}'::jsonb,
  is_required boolean not null default true,
  points integer not null default 1,
  grading_mode text not null default 'auto',
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_set_questions_content_not_blank check (
    char_length(btrim(content)) > 0
  ),
  constraint question_set_questions_content_length check (char_length(content) <= 2000),
  constraint question_set_questions_description_length check (
    description is null or char_length(description) <= 1000
  ),
  constraint question_set_questions_type_check check (
    question_type in (
      'short_answer',
      'paragraph',
      'multiple_choice',
      'checkboxes',
      'dropdown',
      'linear_scale',
      'rating'
    )
  ),
  constraint question_set_questions_sort_order_check check (sort_order >= 0),
  constraint question_set_questions_points_non_negative check (points >= 0),
  constraint question_set_questions_grading_mode_check check (
    grading_mode in ('auto', 'none')
  ),
  constraint question_set_questions_typed_options_valid check (
    private.valid_question_options_for_type(question_type, options, settings)
  ),
  constraint question_set_questions_typed_answer_key_valid check (
    private.valid_answer_key_for_type(
      question_type,
      options,
      settings,
      answer_key,
      grading_mode
    )
  ),
  constraint question_set_questions_paragraph_unscored check (
    question_type <> 'paragraph' or (grading_mode = 'none' and points = 0)
  ),
  constraint question_set_questions_set_sort_order_key unique (set_id, sort_order)
);

create index if not exists question_set_questions_set_id_idx
  on public.question_set_questions(set_id);
create index if not exists question_set_questions_original_question_id_idx
  on public.question_set_questions(original_question_id);
create index if not exists question_set_questions_type_idx
  on public.question_set_questions(question_type);

drop trigger if exists question_set_questions_touch_updated_at
  on public.question_set_questions;
create trigger question_set_questions_touch_updated_at
before update on public.question_set_questions
for each row execute function private.touch_updated_at();

alter table public.question_set_questions enable row level security;

drop policy if exists "Teachers can create question set questions"
  on public.question_set_questions;
create policy "Teachers can create question set questions"
on public.question_set_questions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.question_sets
    where question_sets.id = question_set_questions.set_id
      and question_sets.teacher_id = (select auth.uid())
      and question_sets.source = 'teacher'
  )
  and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'teacher'
);

drop policy if exists "Owners and admins can read question set questions"
  on public.question_set_questions;
create policy "Owners and admins can read question set questions"
on public.question_set_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.question_sets
    where question_sets.id = question_set_questions.set_id
      and question_sets.teacher_id = (select auth.uid())
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Teachers can update question set questions"
  on public.question_set_questions;
create policy "Teachers can update question set questions"
on public.question_set_questions
for update
to authenticated
using (
  exists (
    select 1
    from public.question_sets
    where question_sets.id = question_set_questions.set_id
      and question_sets.teacher_id = (select auth.uid())
      and question_sets.source = 'teacher'
  )
)
with check (
  exists (
    select 1
    from public.question_sets
    where question_sets.id = question_set_questions.set_id
      and question_sets.teacher_id = (select auth.uid())
      and question_sets.source = 'teacher'
  )
);

drop policy if exists "Teachers can delete question set questions"
  on public.question_set_questions;
create policy "Teachers can delete question set questions"
on public.question_set_questions
for delete
to authenticated
using (
  exists (
    select 1
    from public.question_sets
    where question_sets.id = question_set_questions.set_id
      and question_sets.teacher_id = (select auth.uid())
      and question_sets.source = 'teacher'
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

revoke all on public.question_set_questions from anon;
grant select, insert, update, delete on public.question_set_questions to authenticated;

alter table public.questions
  add column if not exists question_set_id uuid references public.question_sets(id) on delete cascade,
  add column if not exists sort_order integer not null default 0,
  add column if not exists question_type text not null default 'multiple_choice',
  add column if not exists description text,
  add column if not exists is_required boolean not null default true,
  add column if not exists points integer not null default 1,
  add column if not exists grading_mode text not null default 'auto',
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists answer_key jsonb not null default '{}'::jsonb;

alter table public.questions
  alter column options set default '[]'::jsonb,
  alter column correct_answer set default '';

with source_groups as (
  select author_id, source
  from public.questions
  where question_set_id is null
  group by author_id, source
),
inserted_sets as (
  insert into public.question_sets (teacher_id, title, description, source)
  select
    author_id,
    case
      when source = 'admin' then 'Migrated admin questions'
      else 'Migrated question bank'
    end,
    'Created automatically from existing standalone questions.',
    source
  from source_groups
  returning id, teacher_id, source
),
ranked_questions as (
  select
    questions.id,
    inserted_sets.id as set_id,
    row_number() over (
      partition by questions.author_id, questions.source
      order by questions.created_at, questions.id
    ) - 1 as next_sort_order
  from public.questions
  join inserted_sets
    on inserted_sets.teacher_id = questions.author_id
   and inserted_sets.source = questions.source
  where questions.question_set_id is null
)
update public.questions
set
  question_set_id = ranked_questions.set_id,
  sort_order = ranked_questions.next_sort_order,
  question_type = 'multiple_choice',
  settings = '{}'::jsonb,
  answer_key = jsonb_build_object('answer', correct_answer),
  grading_mode = 'auto',
  points = 1,
  is_required = true
from ranked_questions
where ranked_questions.id = questions.id;

insert into public.question_set_questions (
  set_id,
  original_question_id,
  content,
  description,
  question_type,
  options,
  settings,
  answer_key,
  is_required,
  points,
  grading_mode,
  sort_order,
  created_at,
  updated_at
)
select
  question_set_id,
  id,
  content,
  description,
  question_type,
  options,
  settings,
  answer_key,
  is_required,
  points,
  grading_mode,
  sort_order,
  created_at,
  updated_at
from public.questions
where question_set_id is not null
on conflict (set_id, sort_order) do nothing;

create index if not exists questions_question_set_id_idx
  on public.questions(question_set_id);
create unique index if not exists questions_question_set_sort_order_idx
  on public.questions(question_set_id, sort_order);
create index if not exists questions_type_idx
  on public.questions(question_type);

alter table public.questions
  drop constraint if exists questions_options_valid,
  drop constraint if exists questions_answer_valid,
  add constraint questions_sort_order_check check (sort_order >= 0),
  add constraint questions_type_check check (
    question_type in (
      'short_answer',
      'paragraph',
      'multiple_choice',
      'checkboxes',
      'dropdown',
      'linear_scale',
      'rating'
    )
  ),
  add constraint questions_description_length check (
    description is null or char_length(description) <= 1000
  ),
  add constraint questions_points_non_negative check (points >= 0),
  add constraint questions_grading_mode_check check (grading_mode in ('auto', 'none')),
  add constraint questions_typed_options_valid check (
    private.valid_question_options_for_type(question_type, options, settings)
  ),
  add constraint questions_typed_answer_key_valid check (
    private.valid_answer_key_for_type(
      question_type,
      options,
      settings,
      answer_key,
      grading_mode
    )
  ),
  add constraint questions_paragraph_unscored check (
    question_type <> 'paragraph' or (grading_mode = 'none' and points = 0)
  );

create or replace function private.is_question_set_owner(target_set_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.question_sets
    where question_sets.id = target_set_id
      and question_sets.teacher_id = (select auth.uid())
  );
$$;

create or replace function private.question_set_source(target_set_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select question_sets.source
  from public.question_sets
  where question_sets.id = target_set_id;
$$;

revoke all on function private.is_question_set_owner(uuid) from public;
revoke all on function private.question_set_source(uuid) from public;
grant execute on function private.is_question_set_owner(uuid) to authenticated;
grant execute on function private.question_set_source(uuid) to authenticated;

drop policy if exists "Teachers and admins can create questions" on public.questions;
create policy "Teachers and admins can create questions"
on public.questions
for insert
to authenticated
with check (
  (
    author_id = (select auth.uid())
    and source = 'teacher'
    and private.is_question_set_owner(question_set_id)
    and private.question_set_source(question_set_id) = 'teacher'
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'teacher'
  )
  or (
    author_id = (select auth.uid())
    and source = 'admin'
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
);

drop policy if exists "Authors and admins can update questions" on public.questions;
create policy "Authors and admins can update questions"
on public.questions
for update
to authenticated
using (
  author_id = (select auth.uid())
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (
    author_id = (select auth.uid())
    and source = 'teacher'
    and private.is_question_set_owner(question_set_id)
    and private.question_set_source(question_set_id) = 'teacher'
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'teacher'
  )
  or (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
);

alter table public.exam_questions
  add column if not exists snapshot_question_type text not null default 'multiple_choice',
  add column if not exists snapshot_description text,
  add column if not exists snapshot_settings jsonb not null default '{}'::jsonb,
  add column if not exists snapshot_answer_key jsonb not null default '{}'::jsonb,
  add column if not exists snapshot_grading_mode text not null default 'auto',
  add column if not exists snapshot_points integer not null default 1,
  add column if not exists snapshot_is_required boolean not null default true,
  add column if not exists source_question_set_id uuid references public.question_sets(id) on delete set null;

alter table public.exam_questions
  alter column snapshot_options set default '[]'::jsonb,
  alter column snapshot_correct_answer set default '';

update public.exam_questions
set
  snapshot_question_type = 'multiple_choice',
  snapshot_settings = '{}'::jsonb,
  snapshot_answer_key = jsonb_build_object('answer', snapshot_correct_answer),
  snapshot_grading_mode = 'auto',
  snapshot_points = 1,
  snapshot_is_required = true
where snapshot_answer_key = '{}'::jsonb;

create index if not exists exam_questions_source_question_set_id_idx
  on public.exam_questions(source_question_set_id);

alter table public.exam_questions
  drop constraint if exists exam_questions_options_valid,
  drop constraint if exists exam_questions_answer_valid,
  add constraint exam_questions_type_check check (
    snapshot_question_type in (
      'short_answer',
      'paragraph',
      'multiple_choice',
      'checkboxes',
      'dropdown',
      'linear_scale',
      'rating'
    )
  ),
  add constraint exam_questions_description_length check (
    snapshot_description is null or char_length(snapshot_description) <= 1000
  ),
  add constraint exam_questions_points_non_negative check (snapshot_points >= 0),
  add constraint exam_questions_grading_mode_check check (
    snapshot_grading_mode in ('auto', 'none')
  ),
  add constraint exam_questions_typed_options_valid check (
    private.valid_question_options_for_type(
      snapshot_question_type,
      snapshot_options,
      snapshot_settings
    )
  ),
  add constraint exam_questions_typed_answer_key_valid check (
    private.valid_answer_key_for_type(
      snapshot_question_type,
      snapshot_options,
      snapshot_settings,
      snapshot_answer_key,
      snapshot_grading_mode
    )
  ),
  add constraint exam_questions_paragraph_unscored check (
    snapshot_question_type <> 'paragraph'
    or (snapshot_grading_mode = 'none' and snapshot_points = 0)
  );

alter table public.submissions
  add column if not exists score_points integer not null default 0,
  add column if not exists total_points integer not null default 0;

update public.submissions
set
  score_points = score,
  total_points = total_questions
where score_points = 0
  and total_points = 0
  and (score <> 0 or total_questions <> 0);

alter table public.submissions
  add constraint submissions_score_points_non_negative check (score_points >= 0),
  add constraint submissions_total_points_non_negative check (total_points >= 0),
  add constraint submissions_score_points_not_above_total check (
    score_points <= total_points
  );

create index if not exists submissions_exam_score_points_submitted_at_idx
  on public.submissions(exam_id, score_points desc, submitted_at asc);

alter table public.submission_answers
  add column if not exists response jsonb not null default '""'::jsonb,
  add column if not exists score_points integer not null default 0,
  add column if not exists max_points integer not null default 1,
  add column if not exists is_gradable boolean not null default true,
  add column if not exists grading_status text not null default 'graded';

update public.submission_answers
set
  response = to_jsonb(answer),
  score_points = case when is_correct then 1 else 0 end,
  max_points = 1,
  is_gradable = true,
  grading_status = 'graded'
where response = '""'::jsonb;

alter table public.submission_answers
  drop constraint if exists submission_answers_answer_length,
  add constraint submission_answers_answer_length check (char_length(answer) <= 2000),
  add constraint submission_answers_score_points_non_negative check (
    score_points >= 0
  ),
  add constraint submission_answers_max_points_non_negative check (max_points >= 0),
  add constraint submission_answers_score_points_not_above_max check (
    score_points <= max_points
  ),
  add constraint submission_answers_grading_status_check check (
    grading_status in ('graded', 'ungraded')
  ),
  add constraint submission_answers_gradable_status_check check (
    is_gradable or grading_status = 'ungraded'
  );

create index if not exists submission_answers_practice_lookup_idx
  on public.submission_answers(submission_id, is_correct, is_gradable)
  where is_correct = false and is_gradable = true;

alter table public.public_exam_set_questions
  add column if not exists snapshot_question_type text not null default 'multiple_choice',
  add column if not exists snapshot_description text,
  add column if not exists snapshot_settings jsonb not null default '{}'::jsonb,
  add column if not exists snapshot_answer_key jsonb not null default '{}'::jsonb,
  add column if not exists snapshot_grading_mode text not null default 'auto',
  add column if not exists snapshot_points integer not null default 1,
  add column if not exists snapshot_is_required boolean not null default true,
  add column if not exists source_question_set_id uuid references public.question_sets(id) on delete set null;

alter table public.public_exam_set_questions
  alter column snapshot_options set default '[]'::jsonb,
  alter column snapshot_correct_answer set default '';

update public.public_exam_set_questions
set
  snapshot_question_type = 'multiple_choice',
  snapshot_settings = '{}'::jsonb,
  snapshot_answer_key = jsonb_build_object('answer', snapshot_correct_answer),
  snapshot_grading_mode = 'auto',
  snapshot_points = 1,
  snapshot_is_required = true
where snapshot_answer_key = '{}'::jsonb;

create index if not exists public_exam_set_questions_source_question_set_id_idx
  on public.public_exam_set_questions(source_question_set_id);

alter table public.public_exam_set_questions
  drop constraint if exists public_exam_set_questions_options_valid,
  drop constraint if exists public_exam_set_questions_answer_valid,
  add constraint public_exam_set_questions_type_check check (
    snapshot_question_type in (
      'short_answer',
      'paragraph',
      'multiple_choice',
      'checkboxes',
      'dropdown',
      'linear_scale',
      'rating'
    )
  ),
  add constraint public_exam_set_questions_description_length check (
    snapshot_description is null or char_length(snapshot_description) <= 1000
  ),
  add constraint public_exam_set_questions_points_non_negative check (
    snapshot_points >= 0
  ),
  add constraint public_exam_set_questions_grading_mode_check check (
    snapshot_grading_mode in ('auto', 'none')
  ),
  add constraint public_exam_set_questions_typed_options_valid check (
    private.valid_question_options_for_type(
      snapshot_question_type,
      snapshot_options,
      snapshot_settings
    )
  ),
  add constraint public_exam_set_questions_typed_answer_key_valid check (
    private.valid_answer_key_for_type(
      snapshot_question_type,
      snapshot_options,
      snapshot_settings,
      snapshot_answer_key,
      snapshot_grading_mode
    )
  ),
  add constraint public_exam_set_questions_paragraph_unscored check (
    snapshot_question_type <> 'paragraph'
    or (snapshot_grading_mode = 'none' and snapshot_points = 0)
  );

alter table public.public_exam_attempts
  add column if not exists score_points integer not null default 0,
  add column if not exists total_points integer not null default 0;

update public.public_exam_attempts
set
  score_points = score,
  total_points = total_questions
where score_points = 0
  and total_points = 0
  and (score <> 0 or total_questions <> 0);

alter table public.public_exam_attempts
  add constraint public_exam_attempts_score_points_non_negative check (
    score_points >= 0
  ),
  add constraint public_exam_attempts_total_points_non_negative check (
    total_points >= 0
  ),
  add constraint public_exam_attempts_score_points_not_above_total check (
    score_points <= total_points
  );

alter table public.public_exam_attempt_answers
  add column if not exists response jsonb not null default '""'::jsonb,
  add column if not exists score_points integer not null default 0,
  add column if not exists max_points integer not null default 1,
  add column if not exists is_gradable boolean not null default true,
  add column if not exists grading_status text not null default 'graded';

update public.public_exam_attempt_answers
set
  response = to_jsonb(answer),
  score_points = case when is_correct then 1 else 0 end,
  max_points = 1,
  is_gradable = true,
  grading_status = 'graded'
where response = '""'::jsonb;

alter table public.public_exam_attempt_answers
  drop constraint if exists public_exam_attempt_answers_answer_length,
  add constraint public_exam_attempt_answers_answer_length check (
    char_length(answer) <= 2000
  ),
  add constraint public_exam_attempt_answers_score_points_non_negative check (
    score_points >= 0
  ),
  add constraint public_exam_attempt_answers_max_points_non_negative check (
    max_points >= 0
  ),
  add constraint public_exam_attempt_answers_score_points_not_above_max check (
    score_points <= max_points
  ),
  add constraint public_exam_attempt_answers_grading_status_check check (
    grading_status in ('graded', 'ungraded')
  ),
  add constraint public_exam_attempt_answers_gradable_status_check check (
    is_gradable or grading_status = 'ungraded'
  );

commit;
