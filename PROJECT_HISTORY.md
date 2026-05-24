# Project History

This file tracks the evolution of the Exam Platform, serving as a shared memory for all AI agents and developers.

## 2026-05-24: Phase 1 Item 2 Profiles (Codex)

### [+] Features & Improvements
- Added authenticated profile surfaces for teachers and students.
- Added `/profile` as the signed-in profile entry point, rendering the teacher or student profile view based on trusted role.
- Added `/teacher/[id]` for authenticated users to view a teacher's public profile and public posts.
- Added `/profile/edit` for name and bio updates through a Server Action in `features/auth/actions.ts`.
- Added profile validation in `lib/validations/profile.ts` using Zod.
- Added student-specific companion routes at `/student/profile` and `/student/profile/edit`.

### [x] Successes
- Implemented profile feature code under `features/auth/` with separate action, types, query helpers, and form/display components.
- Kept Supabase mutations server-side only; the edit form calls the server action and does not call Supabase from the client.
- Added empty-state rendering for teacher public posts and placeholders for student groups/progress.
- Verified `npm run check` passes.
- Smoke-checked protected profile routes locally; unauthenticated access redirects to sign-in.

### [!] Failures/Blockers
- `supabase gen types --project-id ... --schema public,auth --lang typescript` could not complete because no Supabase access token was available in the environment. `types/database.ts` was not generated.
- Next.js route groups cannot define both `app/(teacher)/profile/page.tsx` and `app/(student)/profile/page.tsx` because both resolve to `/profile`. The implementation uses a single role-aware `/profile` route and separate `/student/profile` companion routes to keep the build valid.

### [>] Next Steps
- Phase 2, item 3: implement Groups.
- Re-run Supabase type generation after logging in with `supabase login` or setting `SUPABASE_ACCESS_TOKEN`.

## 📅 2026-05-20: Architecture & Agent Framework Refactor (Manus)

### [+] Features & Improvements
- **Universal Agent Framework**: Created `AGENTS.md` and `PROJECT_HISTORY.md` to coordinate multiple AI agents (Manus, Claude, Codex).
- **Architecture Cleanup**: Consolidated Supabase environment variables. Removed redundant `SUPABASE_URL` and `SUPABASE_ANON_KEY` in favor of `NEXT_PUBLIC_` variants used globally.
- **UI Content Audit**: Removed all mentions of "Admin" from public-facing pages (`app/page.tsx`, `auth-shell.tsx`, `signup/page.tsx`, and `dashboard/page.tsx`).
- **Admin Privacy**: Refactored marketing copy to focus on Students and Teachers, treating Admin as a silent super-user.

### [x] Successes
- Successfully refactored `lib/supabase/admin.ts` and `lib/supabase/auth-client.ts` to use consolidated env vars.
- Cleaned up `.env.example` to reflect the new architecture.
- Verified that the landing page and auth flows no longer expose admin implementation details.

### [!] Failures/Blockers
- None encountered during this refactor.

### [>] Next Steps
- Implement actual Exam/Question management for Teachers.
- Implement Exam taking for Students.
- Create a private Admin dashboard for user management (not linked from public UI).
- Add Row-Level Security (RLS) to protect data based on roles.
