# Pending Tasks

## Immediate Setup Status

- [x] Profile schema and posts alignment are functionally applied in the linked Supabase project per prior verification.
- [x] Production `/auth/callback` redirect was restored in hosted Supabase Auth config per prior verification.
- [!] Remote migration history still needs follow-up because older history reportedly contains remote-only `20260522180510` while local has `20260512180000`.
- [!] Local callback URL `http://localhost:3000/auth/callback` is documented and now present in local `supabase/config.toml`; hosted dashboard config still needs live verification when Supabase access is stable.
- [!] First real admin/bootstrap state is implemented in code but still requires a live Auth Admin API check. After confirming the first admin exists, remove or rotate `ADMIN_SETUP_TOKEN` in deployment environments.
- [!] Legacy AI seed users cannot be identified from repository files alone. Run a live orphan check against `public.users` vs `auth.users`; archive or delete orphaned seed rows after confirming they have no important dependent data.
- [!] Optional security upgrade: move the Supabase organization to Pro or higher to enable leaked-password protection.

---

## Phase 1 — Foundation

**1. auth (complete)**
- Public signup, login, email verification, logout, role assignment.
- All pages under `app/(auth)/` and the Supabase SSR session flow are done.

**2. profiles (complete)**
- Public teacher profile page visible to students.
- Student profile page (name, bio, joined date).
- Implemented with a role-aware `/profile`, `/profile/edit`, `/teacher/[id]`, and student companion routes under `/student/profile` because Next.js route groups cannot define duplicate `/profile` paths.

---

## Phase 2 — Teacher Core

**3. groups (complete)**
- Teacher can create, rename, and delete private groups (e.g. "Class 9", "Alpha").
- Teacher can generate an invite link per group.
- Student follows invite link to join a group.
- Routes: `app/(teacher)/groups/`.
- Feature slice: `features/groups/`.

**4. questions (complete)**
- Teacher question bank CRUD (text-only questions with options and correct answer).
- Teacher dashboard lists all their questions with search and filter.
- Routes: `app/(teacher)/questions/`.
- Feature slice: `features/questions/`.

**5. exams (complete)**
- Teacher creates an exam for a specific group: pick questions, set `starts_at` / `ends_at`.
- Exam state machine enforced in the database (`scheduled → active → closed`).
- Supabase Edge Function or pg_cron job closes exams at `ends_at` and triggers merit calculation.
- Routes: `app/(teacher)/exams/`.
- Feature slice: `features/exams/`.

---

## Phase 3 — Student Core

**6. exam-taking (complete)**
- Student sees upcoming and active exams for their groups.
- Countdown timer; questions are displayed all at once.
- Auto-submit is attempted when the timer reaches zero; database trigger rejects late inserts using database time.
- Routes: `app/(student)/student/exams/` and `app/(student)/student/exams/[id]/`.

**7. merit-list (complete)**
- Ranked leaderboard shown to all group members after exam closes.
- Ranked by score descending; ties broken by `submitted_at` ascending.
- Routes: `app/(student)/student/exams/[id]/merit/` and `app/(teacher)/exams/[id]/merit/`.

**8. progress dashboard (complete)**
- Student sees all previous exams: date, group, score, merit position.
- Routes: `app/(student)/student/progress/`.
- Feature slice: `features/progress/`.

**9. practice (complete)**
- Student retakes only the questions they got wrong: filter `submission_answers` where `is_correct = false`.
- No score or merit generated; purely for self-study.
- Routes: `app/(student)/student/practice/`.
- Feature slice: `features/practice/`.

---

## Phase 4 — Social

**10. posts (complete)**
- Teacher publishes text-only posts visible to authenticated students through the current post RLS model.
- Routes: `app/(teacher)/posts/` (create) and `app/(student)/student/feed/` (read).
- Feature slice: `features/posts/`.

**11. reactions (complete)**
- Students react to teacher posts (like, etc.).
- Feature slice: `features/reactions/`.

**12. comments (complete)**
- Students comment on teacher posts.
- Feature slice: `features/comments/`.

---

## Phase 5 — Public Exams

**13. public-sets (admin) (complete)**
- Hidden super-user route creates named question sets available to students and teachers.
- Routes: `app/(admin)/public-sets/`.

**14. public-exam (student) (complete)**
- Any student can take a public exam set at any time.
- No merit list or leaderboard is generated; only personal score is stored.
- Routes: `app/(student)/student/public-exams/`.
- Feature slice: `features/public-exams/`.

**15. teacher customisation (complete)**
- Teacher copies a published public set into their own question bank and customises those questions for group exams.
- Store `original_id` on copied questions for future analytics.

---

## Ongoing

- Re-run `supabase gen types typescript` from the linked project after applying the 2026-05-29 migrations; `types/database.ts` has been updated locally to match the migration SQL because local Docker is unavailable.
- Build an admin UI over `/api/admin/users/[userId]/role`.
- Add authenticated end-to-end tests for role gates, exam submission, merit visibility, social permissions, and public exam attempts.
- Run `npm run smoke:routes` with a local server for unauthenticated route and signup-role smoke coverage.
- Re-run remote migration list, Supabase advisors, and direct Exams/social/public-exams RLS/cron verification queries after Supabase CLI connectivity is stable.
