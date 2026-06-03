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
      private.valid_choice_options(candidate_options, 1, 50)
    when candidate_type in ('short_answer', 'paragraph') then
      private.valid_empty_options(candidate_options)
    when candidate_type in ('linear_scale', 'rating') then
      private.valid_empty_options(candidate_options)
      and private.valid_scale_settings(candidate_type, candidate_settings)
    else false
  end;
$$;

revoke all on function private.valid_question_options_for_type(text, jsonb, jsonb)
  from public;
grant execute on function private.valid_question_options_for_type(text, jsonb, jsonb)
  to authenticated, service_role;
