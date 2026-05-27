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

## Roles

Roles are `student`, `teacher`, and `admin`.

- Public signup can create `student` and `teacher` users.
- Public signup cannot create `admin` users.
- Authorization reads trusted Supabase `app_metadata.role`.
- User-editable metadata is not trusted for authorization.

## Admin Creation

The first admin is created with `/api/admin/bootstrap`, guarded by `ADMIN_SETUP_TOKEN`, and only if no Supabase Auth user already has `app_metadata.role = admin`.

After that, admins use `/api/admin/users/[userId]/role` to promote/demote users.

## Question Bank Shape

Teacher question bank items live in `public.questions`.

- Options are stored as a validated JSONB array of strings so exam-building can keep the answer set together without a separate option table.
- `correct_answer` stores the matching option text for now; future exam submissions should compare against the stored question snapshot or the row value used when the exam is assembled.
- `source` is `teacher` or `admin`; teacher-created rows use `teacher`, while `original_id` is reserved for future copies of admin-authored questions.
- Validation helpers stay in the private schema, with explicit authenticated grants, because the table check constraints need to execute them during teacher writes.

## Exam Snapshots

Teacher-created exams live in `public.exams`, with ordered question rows in `public.exam_questions`.

- Exam state is derived from `starts_at` and `ends_at` using database time; teachers can mutate only scheduled exams.
- `exam_questions` snapshots selected question content, options, and correct answer so later question-bank edits do not rewrite an already assembled exam.
- A `closed_at` timestamp and `private.close_due_exams()` exist for future merit-list processing, while visible state remains derived from the schedule.
