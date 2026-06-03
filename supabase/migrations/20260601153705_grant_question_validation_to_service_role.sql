grant usage on schema private to service_role;

grant execute on function private.valid_choice_options(jsonb, integer, integer)
  to service_role;
grant execute on function private.valid_empty_options(jsonb)
  to service_role;
grant execute on function private.jsonb_int(jsonb, text)
  to service_role;
grant execute on function private.valid_scale_settings(text, jsonb)
  to service_role;
grant execute on function private.valid_question_options_for_type(text, jsonb, jsonb)
  to service_role;
grant execute on function private.valid_answer_key_for_type(text, jsonb, jsonb, jsonb, text)
  to service_role;
