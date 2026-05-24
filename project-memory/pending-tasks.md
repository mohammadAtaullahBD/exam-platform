# Pending Tasks

## Immediate Setup (do before writing feature code)

- Apply `supabase/migrations/20260512180000_auth_profiles_and_admin.sql` to the Supabase project.
- In Supabase Auth settings, add production and local `/auth/callback` redirect URLs.
- Create the first real admin using `/api/admin/bootstrap`, then remove or rotate `ADMIN_SETUP_TOKEN`.
- Decide whether to delete or archive legacy AI seed users in `public.users`.
- Optional security upgrade: move the Supabase organization to Pro or higher to enable leaked-password protection.

---

## Phase 1 — Foundation

**1. auth (complete)**
- Public signup, login, email verification, logout, role assignment.
- All pages under `app/(auth)/` and the Supabase SSR session flow are done.

**2. profiles**
- Public teacher profile page visible to students.
- Student profile page (name, bio, joined date).
- Route group: `app/(teacher)/profile/` and `app/(student)/profile/`.

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

**5. exams**
- Teacher creates an exam for a specific group: pick questions, set `starts_at` / `ends_at`.
- Exam state machine enforced in the database (`scheduled → active → closed`).
- Supabase Edge Function or pg_cron job closes exams at `ends_at` and triggers merit calculation.
- Routes: `app/(teacher)/exams/`.
- Feature slice: `features/exams/`.

---

## Phase 3 — Student Core

**6. exam-taking**
- Student sees upcoming and active exams for their groups.
- Countdown timer; questions displayed one at a time or all at once (decide before building).
- Auto-submit when timer reaches zero.
- Routes: `app/(student)/exams/[id]/`.

**7. merit-list**
- Ranked leaderboard shown to all group members after exam closes.
- Ranked by score descending; ties broken by `submitted_at` ascending.
- Routes: `app/(student)/exams/[id]/merit/` and same for teacher view.

**8. progress dashboard**
- Student sees all previous exams: date, group, score, merit position.
- Routes: `app/(student)/progress/`.
- Feature slice: `features/progress/`.

**9. practice**
- Student retakes only the questions they got wrong: filter `submission_answers` where `is_correct = false`.
- No score or merit generated; purely for self-study.
- Routes: `app/(student)/practice/`.
- Feature slice: `features/practice/`.

---

## Phase 4 — Social

**10. posts**
- Teacher publishes text-only posts visible to all followers.
- Routes: `app/(teacher)/posts/` (create) and `app/(student)/feed/` (read).
- Feature slice: `features/posts/`.

**11. reactions**
- Students react to teacher posts (like, etc.).
- Feature slice: `features/reactions/`.

**12. comments**
- Students comment on teacher posts.
- Feature slice: `features/comments/`.

---

## Phase 5 — Public Exams

**13. public-sets (admin)**
- Admin creates named question sets available to all teachers.
- Routes: `app/(admin)/public-sets/`.

**14. public-exam (student)**
- Any student can take a public exam set at any time.
- No merit list or leaderboard is generated; only personal score is stored.
- Routes: `app/(student)/public-exams/`.
- Feature slice: `features/public-exams/`.

**15. teacher customisation**
- Teacher copies an admin public set into their own question bank and customises it for a specific group exam.
- Store `original_id` on copied questions for future analytics.

---

## Ongoing

- Add RLS policies for each new table before exposing it through the Data API.
- Index every FK column after each migration (`CREATE INDEX` on every `_id` column).
- Run `supabase gen types typescript` after every schema change and commit the updated `types/database.ts`.
- Build an admin UI over `/api/admin/users/[userId]/role`.
- Add automated tests for signup, verification callback, protected route redirects, logout, and admin promotion.
