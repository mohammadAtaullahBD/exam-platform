# Decisions

## Next.js 16

Use local docs in `node_modules/next/dist/docs/` before editing framework-specific code. This repo uses Next.js 16, where `proxy.ts` replaces the old middleware convention.

## Auth Source of Truth

Use Supabase Auth directly for credentials, sessions, email verification, and logout. The app no longer uses NextAuth.

Email verification is handled in a browser page, not a route handler, because Supabase can send session tokens in the URL fragment and fragments are not sent to servers.

## App Profiles

Use `public.users` as the application profile table linked by `id = auth.users.id`.

- AI seed users in `public.users` are not real login users unless matching Supabase Auth users exist.
- New signup users must exist in both `auth.users` and `public.users`.
- `password_hash` is legacy/deprecated and must not contain real passwords.
- Legacy profile-only users are live data and must not be deleted by automation without explicit project-owner approval. The approved cleanup path should archive isolated orphan profile rows into the private schema before deleting them and validating `users_id_auth_fkey`.
- On 2026-05-30, the project owner approved that cleanup path; the 4 isolated orphan profiles were archived into `private.archived_user_profiles`, deleted from `public.users`, and `users_id_auth_fkey` was validated.

## Roles

Roles are `student`, `teacher`, and `admin`.

- Public signup can create `student` and `teacher` users.
- Public signup cannot create `admin` users.
- Authorization reads trusted Supabase `app_metadata.role`.
- User-editable metadata is not trusted for authorization.

## Admin Creation

The first admin is created with `/api/admin/bootstrap`, guarded by `ADMIN_SETUP_TOKEN`, and only if no Supabase Auth user already has `app_metadata.role = admin`.

After that, admins use `/api/admin/users/[userId]/role` to promote/demote users.

The hidden `/admin/users` route provides a private super-user UI over the same trusted role-management flow. It is not linked from public or role dashboards.

## Question Set Shape

Teachers build Google-Forms-like question sets in `public.question_sets` and `public.question_set_questions`.

- A question set stores the teacher owner, title, optional description, timestamps, source, and optional original set reference.
- Ordered set questions store the prompt, help text, response type, options, settings, answer key, required flag, points, and grading mode.
- Supported response types are `short_answer`, `paragraph`, `multiple_choice`, `checkboxes`, `dropdown`, `linear_scale`, and `rating`. File upload is intentionally not supported.
- Paragraph questions are accepted as responses but are unscored until a manual grading workflow exists.
- `public.questions` remains for legacy/admin/public-set compatibility and keeps source/original tracking for copied admin questions.
- Validation helpers stay in the private schema, with explicit authenticated grants, because table check constraints need to execute during authenticated writes.

## Question Sets

The active teacher questions direction is question sets rather than standalone bank rows.

- The `/questions` UI now targets teacher-owned sets with title/description and ordered question items.
- Intended item fields are content, optional description/help text, `question_type`, options JSON, settings JSON, answer key JSON, `is_required`, points, and grading mode.
- Paragraph items are currently unscored with `grading_mode = none` and `points = 0`.
- Generated Supabase types now include `question_sets` and `question_set_questions`; app mutations persist sets through server actions.

## Exam Snapshots

Teacher-created exams live in `public.exams`, with ordered question rows in `public.exam_questions`.

- Exam state is derived from `starts_at` and `ends_at` using database time; teachers can mutate only scheduled exams.
- `exam_questions` snapshots selected question content, response type, help text, options, settings, answer key, grading mode, points, and required flag so later question-set edits do not rewrite an already assembled exam.
- A `closed_at` timestamp and `private.close_due_exams()` exist for future merit-list processing, while visible state remains derived from the schedule.
- Server-rendered exam, merit, progress, and practice surfaces use authenticated `public.database_now()` to avoid Node.js clock drift when deciding whether an exam is scheduled, active, or closed.

## Submission Scoring

Group exam submissions live in `public.submissions` and `public.submission_answers`.

- One student can submit once per group exam.
- Server actions verify the signed-in student, group membership, and selected answers before using the service-role client to store the scored submission.
- A database trigger rejects late inserts using database time, so client timer drift cannot create valid expired submissions.
- Submitted answers store both a legacy text answer and a JSON response payload.
- Automatic scoring supports multiple choice, dropdown, checkboxes, short answer, linear scale, and rating. Paragraph answers are stored as ungraded responses and do not affect the automatic denominator.
- Merit lists read submission summaries after close; raw answer rows are limited to the owning student, owning teacher after close, or admin.

## Public Exams

Public exam sets use separate set and attempt tables instead of overloading group exams.

- Hidden super-users create public sets and source admin-authored questions.
- Set questions snapshot content, response type, options, settings, answer keys, and scoring metadata so later edits do not alter an existing public set.
- Students can attempt published sets multiple times; no leaderboard is generated.
- Teachers copy published public sets into editable teacher-owned question sets for customization.

## Social Tables

Teacher posts remain in `public.posts`; Phase 4 adds `public.reactions` and `public.comments`.

- The current feed follows existing post RLS and is visible to authenticated students.
- Student reactions are deduplicated by `(post_id, user_id, type)`.
- Comments and reactions are written only through server actions and student-scoped RLS policies.
