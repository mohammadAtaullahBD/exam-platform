create schema if not exists private;

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null default 'like',
  created_at timestamptz not null default now(),
  constraint reactions_type_check check (type in ('like')),
  constraint reactions_post_user_type_key unique (post_id, user_id, type)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_content_not_blank check (char_length(btrim(content)) > 0),
  constraint comments_content_length check (char_length(content) <= 1000)
);

create index if not exists reactions_post_id_idx
  on public.reactions(post_id);
create index if not exists reactions_user_id_idx
  on public.reactions(user_id);
create index if not exists comments_post_id_idx
  on public.comments(post_id);
create index if not exists comments_user_id_idx
  on public.comments(user_id);
create index if not exists comments_post_created_at_idx
  on public.comments(post_id, created_at asc);

drop trigger if exists comments_touch_updated_at on public.comments;
create trigger comments_touch_updated_at
before update on public.comments
for each row execute function private.touch_updated_at();

alter table public.reactions enable row level security;
alter table public.comments enable row level security;

drop policy if exists "Authenticated users can read reactions" on public.reactions;
create policy "Authenticated users can read reactions"
on public.reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.posts
    where posts.id = reactions.post_id
  )
);

drop policy if exists "Students can create their own reactions" on public.reactions;
create policy "Students can create their own reactions"
on public.reactions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'student'
  and exists (
    select 1
    from public.posts
    where posts.id = reactions.post_id
  )
);

drop policy if exists "Students can delete their own reactions" on public.reactions;
create policy "Students can delete their own reactions"
on public.reactions
for delete
to authenticated
using (
  (
    user_id = (select auth.uid())
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'student'
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Authenticated users can read comments" on public.comments;
create policy "Authenticated users can read comments"
on public.comments
for select
to authenticated
using (
  exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
  )
);

drop policy if exists "Students can create their own comments" on public.comments;
create policy "Students can create their own comments"
on public.comments
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'student'
  and exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
  )
);

drop policy if exists "Students can update their own comments" on public.comments;
create policy "Students can update their own comments"
on public.comments
for update
to authenticated
using (
  user_id = (select auth.uid())
  and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'student'
)
with check (
  user_id = (select auth.uid())
  and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'student'
);

drop policy if exists "Students and admins can delete comments" on public.comments;
create policy "Students and admins can delete comments"
on public.comments
for delete
to authenticated
using (
  (
    user_id = (select auth.uid())
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'student'
  )
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

revoke all on public.reactions from anon;
revoke all on public.comments from anon;
grant select, insert, delete on public.reactions to authenticated;
grant select, insert, update, delete on public.comments to authenticated;
