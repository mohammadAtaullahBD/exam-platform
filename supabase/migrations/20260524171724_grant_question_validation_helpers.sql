grant usage on schema private to authenticated;
grant execute on function private.valid_question_options(jsonb) to authenticated;
grant execute on function private.valid_question_answer(jsonb, text) to authenticated;
