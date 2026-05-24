# Database Schema

## Current Auth Tables

- `auth.users`: managed by Supabase Auth. Stores credentials, email verification state, identities, and trusted `raw_app_meta_data`.
- `public.users`: application profile table. Stores app-facing user fields only: `id`, `email`, `name`, `bio`, `role`, timestamps, and the legacy `password_hash` column.
- `public.posts`: teacher public text posts. Stores `id`, `teacher_id`, `content`, and `created_at`.
- `public.groups`: private teacher groups. Stores `id`, `teacher_id`, `name`, optional `description`, `invite_token`, and timestamps.
- `public.group_members`: student memberships for private groups. Stores `group_id`, `student_id`, and `joined_at`.
- `public.questions`: teacher/admin-authored question bank. Stores `id`, `author_id`, `content`, JSONB `options`, `correct_answer`, `source`, optional `original_id`, and timestamps.

## Important Split

The app uses both Supabase Auth users and `public.users`, but they are not competing user systems:

- Supabase Auth is the credential/session source of truth.
- `public.users.id` should match `auth.users.id` for real app users.
- AI-created seed rows may exist only in `public.users`; they are not login accounts unless matching `auth.users` rows also exist.
- Newly registered users are created in `auth.users` and now also synced into `public.users`.

## Migration

`supabase/migrations/20260512180000_auth_profiles_and_admin.sql` documents the intended auth/profile schema:

- Keeps `public.users` as the app profile table.
- Adds/normalizes `name`, `created_at`, and `updated_at`.
- Makes `password_hash` nullable and treats it as deprecated.
- Adds a role check for `student`, `teacher`, and `admin`.
- Adds a not-yet-validated FK from `public.users.id` to `auth.users.id` so legacy seed rows do not block migration, while new rows are enforced.
- Adds private trigger helpers to sync Auth user changes into `public.users`.
- Enables RLS and profile/admin policies.

`supabase/migrations/20260524112618_align_profiles_posts_schema.sql` aligns the linked database for Phase 1 profiles:

- Adds `bio` to `public.users`.
- Makes profile timestamps non-null with defaults and treats `password_hash` as nullable legacy data.
- Adds `public.posts` with `teacher_id` referencing `public.users(id)`.
- Adds an index for teacher post lookups by teacher and newest-first creation time.
- Enables RLS and adds policies for authenticated teacher profile/post visibility and own profile updates.

`supabase/migrations/20260524131436_groups.sql` implements Phase 2 Groups:

- Adds `public.groups` with a teacher FK, private invite token, description, and timestamps.
- Adds `public.group_members` with a composite primary key over `group_id` and `student_id`.
- Indexes every FK column used by group lookups.
- Adds private RLS helper functions for group teacher/member checks to avoid recursive policy lookups.
- Enables RLS and adds policies for teacher group CRUD, student membership reads, and membership management.

`supabase/migrations/20260524162029_questions.sql` implements Phase 2 Questions:

- Adds `public.questions` with `author_id` referencing `public.users(id)`.
- Stores answer choices as a validated JSONB array of 2 to 6 unique, non-blank strings.
- Stores `correct_answer` as text and validates that it matches one of the options.
- Tracks `source` as `teacher` or `admin`, with optional `original_id` for copied admin questions later.
- Adds FK/source lookup indexes and `updated_at` maintenance.
- Enables RLS and adds policies so teachers can manage their own teacher-sourced questions while admins retain super-user access.

## RLS Requirements

- Enable RLS on all public tables.
- Use trusted `app_metadata.role` for admin authorization, never user-editable metadata.
- Students and teachers should access only their own future exam data unless a later schema explicitly grants more.
- Admins can manage app users through trusted server routes.
- Group invite token lookup and membership insertion happen in server actions; client components never call Supabase directly.
- Question mutations happen through server actions; client components do not call Supabase directly.
