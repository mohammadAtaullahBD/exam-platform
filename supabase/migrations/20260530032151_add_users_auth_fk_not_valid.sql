do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_id_auth_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_id_auth_fkey
      foreign key (id) references auth.users(id) on delete cascade not valid;
  end if;
end $$;
