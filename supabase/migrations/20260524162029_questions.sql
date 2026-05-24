create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create or replace function private.valid_question_options(candidate jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when jsonb_typeof(candidate) <> 'array' then false
    when jsonb_array_length(candidate) < 2 then false
    when jsonb_array_length(candidate) > 6 then false
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

create or replace function private.valid_question_answer(
  candidate_options jsonb,
  candidate_answer text
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when candidate_answer is null then false
    when char_length(btrim(candidate_answer)) = 0 then false
    when char_length(candidate_answer) > 160 then false
    when jsonb_typeof(candidate_options) <> 'array' then false
    else exists (
      select 1
      from jsonb_array_elements_text(candidate_options) as option(value)
      where btrim(option.value) = btrim(candidate_answer)
    )
  end;
$$;

revoke all on function private.valid_question_options(jsonb) from public;
revoke all on function private.valid_question_answer(jsonb, text) from public;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  options jsonb not null,
  correct_answer text not null,
  source text not null default 'teacher',
  original_id uuid references public.questions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_content_not_blank check (char_length(btrim(content)) > 0),
  constraint questions_content_length check (char_length(content) <= 2000),
  constraint questions_source_check check (source in ('teacher', 'admin')),
  constraint questions_options_valid check (private.valid_question_options(options)),
  constraint questions_answer_valid check (
    private.valid_question_answer(options, correct_answer)
  )
);

create index if not exists questions_author_id_idx on public.questions(author_id);
create index if not exists questions_original_id_idx on public.questions(original_id);
create index if not exists questions_author_source_created_at_idx
  on public.questions(author_id, source, created_at desc);

drop trigger if exists questions_touch_updated_at on public.questions;
create trigger questions_touch_updated_at
before update on public.questions
for each row execute function private.touch_updated_at();

alter table public.questions enable row level security;

drop policy if exists "Teachers and admins can create questions" on public.questions;
create policy "Teachers and admins can create questions"
on public.questions
for insert
to authenticated
with check (
  (
    author_id = (select auth.uid())
    and source = 'teacher'
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'teacher'
  )
  or (
    author_id = (select auth.uid())
    and source = 'admin'
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
);

drop policy if exists "Authors and admins can read questions" on public.questions;
create policy "Authors and admins can read questions"
on public.questions
for select
to authenticated
using (
  author_id = (select auth.uid())
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
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
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'teacher'
  )
  or (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
);

drop policy if exists "Authors and admins can delete questions" on public.questions;
create policy "Authors and admins can delete questions"
on public.questions
for delete
to authenticated
using (
  author_id = (select auth.uid())
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

revoke all on public.questions from anon;
grant select, insert, update, delete on public.questions to authenticated;
