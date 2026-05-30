# Database Schema

## Current Auth Tables

- `auth.users`: managed by Supabase Auth. Stores credentials, email verification state, identities, and trusted `raw_app_meta_data`.
- `public.users`: application profile table. Stores app-facing user fields only: `id`, `email`, `name`, `bio`, `role`, timestamps, and the legacy `password_hash` column.
- `public.posts`: teacher public text posts. Stores `id`, `teacher_id`, `content`, and `created_at`.
- `public.groups`: private teacher groups. Stores `id`, `teacher_id`, `name`, optional `description`, `invite_token`, and timestamps.
- `public.group_members`: student memberships for private groups. Stores `group_id`, `student_id`, and `joined_at`.
- `public.questions`: teacher/admin-authored question bank. Stores `id`, `author_id`, `content`, JSONB `options`, `correct_answer`, `source`, optional `original_id`, and timestamps.
- `public.exams`: scheduled group exams. Stores `id`, `group_id`, `title`, `starts_at`, `ends_at`, optional `closed_at`, and timestamps.
- `public.exam_questions`: ordered exam question snapshots. Stores `id`, `exam_id`, optional `question_id`, `sort_order`, `snapshot_content`, JSONB `snapshot_options`, `snapshot_correct_answer`, and `created_at`.
- `public.submissions`: one scored submission per student per group exam. Stores `id`, `exam_id`, `student_id`, `score`, `total_questions`, `submitted_at`, and `created_at`.
- `public.submission_answers`: submitted answers for exam question snapshots. Stores `id`, `submission_id`, `exam_question_id`, optional `question_id`, `answer`, `is_correct`, and `created_at`.
- `public.reactions`: student reactions to teacher posts. Stores `id`, `post_id`, `user_id`, `type`, and `created_at`, with one reaction per post/user/type.
- `public.comments`: student comments on teacher posts. Stores `id`, `post_id`, `user_id`, `content`, and timestamps.
- `public.public_exam_sets`: hidden super-user curated public exam sets. Stores `id`, `admin_id`, `title`, `description`, `is_published`, and timestamps.
- `public.public_exam_set_questions`: ordered public set question snapshots. Stores `id`, `set_id`, optional `question_id`, `sort_order`, `snapshot_content`, JSONB `snapshot_options`, `snapshot_correct_answer`, and `created_at`.
- `public.public_exam_attempts`: student attempts for public sets. Stores `id`, `set_id`, `student_id`, `score`, `total_questions`, `submitted_at`, and `created_at`.
- `public.public_exam_attempt_answers`: answers for public set attempts. Stores `id`, `attempt_id`, `set_question_id`, optional `question_id`, `answer`, `is_correct`, and `created_at`.

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

`supabase/migrations/20260522180510_fix_auth_profile_sync.sql` mirrors the remote Auth profile-sync fix:

- Recreates `private.sync_auth_user_profile()`.
- Recreates insert/update triggers on `auth.users` so Auth email, name, and trusted app role changes sync into `public.users`.

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

`supabase/migrations/20260524171724_grant_question_validation_helpers.sql` fixes question inserts:

- Grants authenticated users `USAGE` on the private schema and `EXECUTE` on the two private question validation helpers.
- This is required because `public.questions` check constraints call those helper functions during authenticated inserts and updates.

`supabase/migrations/20260527173105_exams.sql` implements Phase 2 Exams:

- Adds `public.exams` with group scheduling, `closed_at`, FK indexes, timestamps, and time-order constraints.
- Adds `public.exam_questions` with ordered snapshots of selected question content/options/answers.
- Adds private helpers for derived exam state, exam teacher/member checks, scheduled-only mutation checks, and closing due exams.
- Enables RLS and adds policies so teachers can create exams for their own groups, teachers can mutate only scheduled exams, group members can read their exams, and admins remain super-users.
- Adds a `pg_cron` job named `close-due-exams` to run `private.close_due_exams()` every minute.

`supabase/migrations/20260529091256_student_submissions.sql` implements Phase 3 submissions:

- Adds `public.submissions` and `public.submission_answers`.
- Enforces one submission per student per exam.
- Uses a trigger to reject inserts unless database time says the exam is active for that group member.
- Exposes closed-exam submission rows for merit lists while keeping raw answers limited to the owning student, owning teacher after close, or admin.

`supabase/migrations/20260529091306_social_reactions_comments.sql` implements Phase 4 social tables:

- Adds `public.reactions` and `public.comments` with FK indexes and RLS.
- Restricts comment/reaction writes to students acting as themselves.
- Prevents duplicate `like` reactions with a unique `(post_id, user_id, type)` constraint.

`supabase/migrations/20260529091313_public_exam_sets.sql` implements Phase 5 public exams:

- Adds public exam set, set question, attempt, and attempt answer tables.
- Uses question snapshots for public sets and attempts.
- Allows hidden super-users to manage sets, authenticated users to read published sets, and students to read only their own public attempt records.
- Keeps public attempt writes behind server actions and service-role inserts after role checks so scores are not accepted directly from the Data API.

`supabase/migrations/20260530032151_add_users_auth_fk_not_valid.sql` follows up the auth/profile schema:

- Adds the intended `users_id_auth_fkey` from `public.users(id)` to `auth.users(id)` with `on delete cascade`.
- Leaves the FK `NOT VALID` so the 4 known legacy orphan profile rows do not block the migration.
- Enforces the FK for new/updated profile rows; validate it only after orphan profiles are archived or deleted.

## RLS Requirements

- Enable RLS on all public tables.
- Use trusted `app_metadata.role` for admin authorization, never user-editable metadata.
- Students and teachers should access only their own future exam data unless a later schema explicitly grants more.
- Admins can manage app users through trusted server routes.
- Group invite token lookup and membership insertion happen in server actions; client components never call Supabase directly.
- Question mutations happen through server actions; client components do not call Supabase directly.
- Exam mutations happen through server actions; client components do not call Supabase directly.
- Submission and public-attempt scoring happen in server actions after authenticated role checks.
- Direct authenticated clients receive read access only for scored submission/attempt records; service-role writes are guarded by server-side membership/role checks and database triggers.
