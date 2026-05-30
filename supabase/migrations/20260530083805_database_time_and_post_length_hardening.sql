create or replace function public.database_now()
returns timestamptz
language sql
stable
set search_path = pg_catalog, pg_temp
as $$
  select now();
$$;

revoke all on function public.database_now() from public;
grant execute on function public.database_now() to authenticated;

alter table public.posts
  drop constraint if exists posts_content_length;

alter table public.posts
  add constraint posts_content_length check (char_length(content) <= 2000) not valid;

do $$
begin
  if exists (
    select 1
    from public.posts
    where char_length(content) > 2000
  ) then
    raise notice 'posts_content_length left not valid because existing rows exceed 2000 characters.';
  else
    alter table public.posts validate constraint posts_content_length;
  end if;
end
$$;
