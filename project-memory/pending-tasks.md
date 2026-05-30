# Pending Tasks

## Immediate Setup Status

- [x] Profile schema and posts alignment are functionally applied in the linked Supabase project per prior verification.
- [x] Production `/auth/callback` redirect was restored in hosted Supabase Auth config per prior verification.
- [x] The 2026-05-29 migrations were applied and later confirmed aligned in linked migration history.
- [x] The intended `public.users(id) -> auth.users(id)` FK now exists live as `NOT VALID`, so new profile rows are enforced while legacy orphans remain.
- [x] Older migration history is now aligned: remote `20260522180510_fix_auth_profile_sync.sql` is present locally and `20260512180000` is marked applied after live schema verification.
- [x] Hosted Supabase Auth accepts both production and local callback URLs; `npm run verify:auth-redirects` tested temporary signups for `https://exam.ataullah.dev/auth/callback` and `http://localhost:3000/auth/callback`, then deleted the temporary Auth users.
- [x] First real admin/bootstrap state was verified through the Auth Admin API without exposing secrets; at least one Auth user has trusted `app_metadata.role = admin`.
- [x] A fail-closed cleanup template now exists at `scripts/archive-orphan-profiles-and-validate-fk.sql.template` for the approved live-data step: archive isolated orphan profiles into `private.archived_user_profiles`, delete those archived rows, and validate `users_id_auth_fkey`.
- [x] Linked Supabase DB lint now runs through the current CLI and reports no public-schema errors.
- [x] Supabase advisors re-ran successfully after the database-time hardening migration; the only warning was project-level leaked-password protection.
- [x] Server-side exam/progress/practice state checks now use linked Supabase database time via `public.database_now()`.
- [x] Live workflow smoke cleanup now verifies temporary profile rows are gone; the latest sequential `npm run verify:live-state` reports `smokeOrphanProfileCount: 0`.
- [x] Protected-route smoke now covers 22 routes, including profile edit/student profile/teacher profile routes.
- [!] `ADMIN_SETUP_TOKEN` is still configured locally. Remove or rotate it in local/deployment environments after confirming no further bootstrap is needed.
- [!] Live orphan check found 4 `public.users` rows without matching Auth users. Current aggregate dependency checks show zero direct dependent rows; archive or delete those legacy/seed rows after explicit approval.
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

- Build richer audit/change history for role-management actions if needed.
- Validate `users_id_auth_fkey` after the 4 orphan profile rows are archived or deleted.
- Clean up or archive the 4 isolated orphan profile rows after explicit approval using the fail-closed SQL template and postflight verification.
