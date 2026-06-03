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
    when candidate_grading_mode not in ('auto', 'manual', 'none') then false
    when candidate_answer_key is null then false
    when jsonb_typeof(candidate_answer_key) <> 'object' then false
    when candidate_type = 'paragraph' then candidate_grading_mode in ('manual', 'none')
    when candidate_grading_mode = 'manual' then false
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

revoke all on function private.valid_answer_key_for_type(text, jsonb, jsonb, jsonb, text) from public;
grant execute on function private.valid_answer_key_for_type(text, jsonb, jsonb, jsonb, text) to authenticated;

alter table public.question_set_questions
  drop constraint if exists question_set_questions_grading_mode_check,
  drop constraint if exists question_set_questions_manual_only_paragraph,
  drop constraint if exists question_set_questions_paragraph_unscored;

alter table public.question_set_questions
  add constraint question_set_questions_grading_mode_check check (
    grading_mode in ('auto', 'manual', 'none')
  ),
  add constraint question_set_questions_manual_only_paragraph check (
    grading_mode <> 'manual' or question_type = 'paragraph'
  ),
  add constraint question_set_questions_paragraph_unscored check (
    question_type <> 'paragraph'
    or (
      (grading_mode = 'none' and points = 0)
      or (grading_mode = 'manual' and points > 0)
    )
  );

alter table public.questions
  drop constraint if exists questions_grading_mode_check,
  drop constraint if exists questions_manual_only_paragraph,
  drop constraint if exists questions_paragraph_unscored;

alter table public.questions
  add constraint questions_grading_mode_check check (
    grading_mode in ('auto', 'manual', 'none')
  ),
  add constraint questions_manual_only_paragraph check (
    grading_mode <> 'manual' or question_type = 'paragraph'
  ),
  add constraint questions_paragraph_unscored check (
    question_type <> 'paragraph'
    or (
      (grading_mode = 'none' and points = 0)
      or (grading_mode = 'manual' and points > 0)
    )
  );

alter table public.exam_questions
  drop constraint if exists exam_questions_grading_mode_check,
  drop constraint if exists exam_questions_manual_only_paragraph,
  drop constraint if exists exam_questions_paragraph_unscored;

alter table public.exam_questions
  add constraint exam_questions_grading_mode_check check (
    snapshot_grading_mode in ('auto', 'manual', 'none')
  ),
  add constraint exam_questions_manual_only_paragraph check (
    snapshot_grading_mode <> 'manual' or snapshot_question_type = 'paragraph'
  ),
  add constraint exam_questions_paragraph_unscored check (
    snapshot_question_type <> 'paragraph'
    or (
      (snapshot_grading_mode = 'none' and snapshot_points = 0)
      or (snapshot_grading_mode = 'manual' and snapshot_points > 0)
    )
  );

alter table public.public_exam_set_questions
  drop constraint if exists public_exam_set_questions_grading_mode_check,
  drop constraint if exists public_exam_set_questions_manual_only_paragraph,
  drop constraint if exists public_exam_set_questions_paragraph_unscored;

alter table public.public_exam_set_questions
  add constraint public_exam_set_questions_grading_mode_check check (
    snapshot_grading_mode in ('auto', 'manual', 'none')
  ),
  add constraint public_exam_set_questions_manual_only_paragraph check (
    snapshot_grading_mode <> 'manual' or snapshot_question_type = 'paragraph'
  ),
  add constraint public_exam_set_questions_paragraph_unscored check (
    snapshot_question_type <> 'paragraph'
    or (
      (snapshot_grading_mode = 'none' and snapshot_points = 0)
      or (snapshot_grading_mode = 'manual' and snapshot_points > 0)
    )
  );
