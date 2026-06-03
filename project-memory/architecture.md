# Architecture

## App Structure

- `app/` contains Next.js 16 App Router pages and route handlers.
- `app/(auth)/` contains public sign-in, sign-up, and password-reset UI.
- `app/auth/callback/page.tsx` handles Supabase email verification links in the browser so both PKCE `?code=` links and implicit `#access_token=` links work.
- `app/auth/check-email`, `app/auth/verified`, and `app/auth/error` provide clear auth lifecycle pages.
- `app/dashboard/page.tsx` is the protected starter dashboard.
- `app/api/auth/signup/route.ts` handles public student/teacher signup.
- `app/api/admin/bootstrap/route.ts` creates the first admin using `ADMIN_SETUP_TOKEN`.
- `app/api/admin/users/[userId]/role/route.ts` lets an existing admin promote/demote users.
- `app/(admin)/admin/users/page.tsx` is a hidden super-user surface for reviewing Auth users and updating trusted roles.
- `lib/supabase/` contains browser, server, admin, proxy, and profile helpers.
- `proxy.ts` refreshes Supabase SSR cookies and redirects unauthenticated dashboard visits.

## Runtime Rules

- Use Server Components by default.
- Use Client Components only for browser interactivity such as forms and logout.
- Keep privileged Supabase operations in server-only modules.
- Do not use `middleware.ts`; Next.js 16 uses `proxy.ts`.
- Do not reintroduce NextAuth unless the whole auth architecture is deliberately redesigned.

## Auth Flow

- Supabase Auth is the source of truth for credentials, email verification, and sessions.
- Browser sign-in uses `supabase.auth.signInWithPassword`.
- Signup creates a Supabase Auth user, stores trusted role in `app_metadata.role`, and upserts `public.users`.
- Email links redirect to `/auth/callback`, which exchanges PKCE codes or sets token-fragment sessions, syncs the profile through `/api/auth/sync-profile`, and then sends users to `/auth/verified`.
- `public.users` is the app profile table; it must not store passwords.

---

## Feature Architecture

### Folder Structure

All new feature code follows this layout:

```
src/
├── app/
│   ├── (auth)/
│   ├── (admin)/
│   ├── (teacher)/
│   ├── (student)/
│   └── api/
│       ├── auth/
│       ├── groups/
│       ├── exams/
│       ├── questions/
│       └── public-exams/
│
├── features/              # One folder per feature slice
│   ├── auth/
│   ├── groups/
│   ├── exams/
│   │   └── components/
│   │       ├── ExamTimer.tsx
│   │       ├── QuestionCard.tsx
│   │       └── MeritList.tsx
│   ├── questions/
│   ├── progress/
│   └── practice/
│
├── lib/                   # Shared utilities only — no feature logic
│   ├── supabase/
│   │   ├── client.ts      # Browser client
│   │   ├── server.ts      # Server client (cookies)
│   │   ├── admin.ts       # Service role client (admin only)
│   │   └── database-time.ts # Database clock helper
│   ├── roles.ts           # Shared role parsing helpers
│   ├── validations/       # Zod schemas
│   └── utils.ts
│
├── components/            # Shared UI only — no feature logic
│   ├── ui/
│   └── layout/
│
└── types/
    └── database.ts        # Generated from: supabase gen types typescript
```

### Feature Slice Rules

- Each feature lives entirely in its own `features/X/` folder and owns its components, hooks, server actions, and types.
- `features/X` may only import from `lib/` and `components/`. Features never import from each other.
- If two features need the same data shape, it belongs in `types/database.ts`, not duplicated in both features.
- One file, one responsibility: `ExamTimer.tsx` only renders the countdown; `useExamTimer.ts` only manages the logic; `actions.ts` only contains server actions.

### Mutations: Server Actions over API Routes

- Use `features/X/actions.ts` server actions for all mutations triggered by users.
- Use `app/api/` routes only for externally called endpoints (webhooks, health checks, cron pings).

---

## Database Schema

### Core Tables

**profiles** — extends `auth.users` via trigger; same `id`
- `id uuid PK`, `role text` (admin | teacher | student), `name text`, `bio text`, `created_at timestamptz`

**groups** — teacher's private student groups (e.g. "Class 9", "Alpha")
- `id uuid PK`, `teacher_id uuid FK → profiles`, `name text`, `description text`, `created_at timestamptz`

**group_members** — students enrolled in a group
- `group_id uuid FK → groups`, `student_id uuid FK → profiles`, `joined_at timestamptz`, `roll_number int`, `student_identity text`

**question_sets** — Google-Forms-like teacher question sets
- `id uuid PK`, `teacher_id uuid FK → profiles`, `title text`, `description text`, `source text`, `original_id uuid`, `created_at timestamptz`, `updated_at timestamptz`

**question_set_questions** — ordered items inside a teacher question set
- `id uuid PK`, `set_id uuid FK → question_sets`, `content text`, `description text`, `question_type text`, `options jsonb`, `settings jsonb`, `answer_key jsonb`, `is_required bool`, `points numeric`, `grading_mode text`, `sort_order int`

**questions** — legacy/admin compatibility question rows
- `id uuid PK`, `author_id uuid FK → profiles`, `question_set_id uuid FK → question_sets`, `content text`, `question_type text`, `options jsonb`, `settings jsonb`, `answer_key jsonb`, `correct_answer text`, `source text`, `original_id uuid`, `created_at timestamptz`

**exams** — scheduled for a specific group
- `id uuid PK`, `group_id uuid FK → groups`, `title text`, `starts_at timestamptz`, `ends_at timestamptz`

**exam_questions** — ordered exam question snapshots
- `exam_id uuid FK → exams`, `question_id uuid FK → questions`, `source_question_set_id uuid FK → question_sets`, `sort_order int`, snapshot content/type/options/settings/answer-key/points/required fields

**submissions** — one per student per exam
- `id uuid PK`, `exam_id uuid FK → exams`, `student_id uuid FK → profiles`, `score int`, `total_questions int`, `score_points numeric`, `max_points numeric`, `submitted_at timestamptz`

**submission_answers** — one row per question per submission
- `id uuid PK`, `submission_id uuid FK → submissions`, `exam_question_id uuid FK → exam_questions`, `question_id uuid FK → questions`, `answer text`, `response jsonb`, `is_correct bool`, `score_points numeric`, `max_points numeric`, `is_gradable bool`, `grading_status text`

**posts** — retired social table retained in the live schema
- `id uuid PK`, `teacher_id uuid FK → profiles`, `content text`, `created_at timestamptz`

**reactions** — retired social table retained in the live schema
- `id uuid PK`, `post_id uuid FK → posts`, `user_id uuid FK → profiles`, `type text`

**comments** — retired social table retained in the live schema
- `id uuid PK`, `post_id uuid FK → posts`, `user_id uuid FK → profiles`, `content text`, `created_at timestamptz`

**public_exam_sets** — admin-curated question sets; any student can attempt
- `id uuid PK`, `admin_id uuid FK → profiles`, `title text`, `description text`, `is_published bool`

**public_exam_set_questions** — ordered public set question snapshots
- `id uuid PK`, `set_id uuid FK → public_exam_sets`, `question_id uuid FK → questions`, `source_question_set_id uuid FK → question_sets`, `sort_order int`, snapshot content/type/options/settings/answer-key/points/required fields

**public_exam_attempts** — personal student attempts for public sets
- `id uuid PK`, `set_id uuid FK → public_exam_sets`, `student_id uuid FK → profiles`, `score int`, `total_questions int`, `score_points numeric`, `max_points numeric`, `submitted_at timestamptz`

**public_exam_attempt_answers** — answers for public set attempts
- `id uuid PK`, `attempt_id uuid FK → public_exam_attempts`, `set_question_id uuid FK → public_exam_set_questions`, `question_id uuid FK → questions`, `answer text`, `response jsonb`, `is_correct bool`, `score_points numeric`, `max_points numeric`, `is_gradable bool`, `grading_status text`

### Index Every Foreign Key

Postgres does not auto-index FK columns. Every `_id` FK column above needs a corresponding `CREATE INDEX`. Missing FK indexes cause slow JOINs and slow `ON DELETE CASCADE` operations.

### Types Flow Outward

Generate `types/database.ts` with `supabase gen types typescript` after every schema change. Feature types extend these generated types; never redefine a table shape manually.

---

## Exam State Machine

An exam has three states: `scheduled → active → closed`.

- State is derived from `starts_at` / `ends_at` compared to `now()` in the database, not in JavaScript.
- A Supabase Edge Function or pg_cron job fires at `ends_at` to mark the exam closed and trigger merit list calculation.
- Students may only submit answers while state is `active`.
- Merit list is visible only after state is `closed`.

---

## Security Model

- RLS is the enforcement layer for all data access. Every table in the `public` schema must have RLS enabled before it is exposed through the Data API.
- Role authorization reads `auth.jwt() -> 'app_metadata' ->> 'role'`. Never read `user_metadata` for authorization — it is user-editable.
- Wrap `auth.uid()` in a subquery in RLS policies (`(select auth.uid())`) so it is evaluated once per query, not once per row.
- Index every column referenced in a `USING` clause of an RLS policy.
- Views in exposed schemas bypass RLS by default. Use `WITH (security_invoker = true)` or keep views in a private schema.

---

## User Roles and Their Surfaces

### Admin (hidden super-user)
- Creates public exam question sets for all teachers to use or customise.
- Manages user roles via server-only API routes.
- Admin implementation details must never appear in public UI or marketing copy.

### Teacher
- Creates private student batches (stored in `public.groups`, e.g. "Class 9", "Tukhor").
- Manages batch member roll numbers and optional custom student identity labels.
- Manages personal question sets with typed questions, answer keys, and scoring metadata.
- Builds exams from their own questions or customised admin public sets.
- Uses the dashboard, batches, questions, exams, and profile surfaces for active teaching work.

### Student
- Joins a teacher's private group via invite link.
- Takes scheduled exams; sees a merit list after the exam closes.
- Accesses a personal progress dashboard: previous exam scores and merit positions.
- Practices questions they previously answered incorrectly (filter `submission_answers` where `is_correct = false`).
- Can take admin public exam sets at any time; no merit list is generated for public sets.
- Uses batches, scheduled exams, progress, practice, and public exams for active student work.
