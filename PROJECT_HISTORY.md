# Project History

This file tracks the evolution of the Exam Platform, serving as a shared memory for all AI agents and developers.

## 2026-05-24: Phase 2 Item 3 Groups (Codex)

### [+] Features & Improvements
- Added migration `20260524131436_groups.sql`.
- Added `public.groups` and `public.group_members` with invite tokens, FK indexes, timestamps, and RLS policies.
- Added teacher `/groups` page for creating, renaming, deleting, and sharing invite links for private groups.
- Added student `/student/groups` page for joined groups.
- Added `/join/[token]` invite flow so students can join groups through Server Actions.
- Added `features/groups/` with separate actions, queries, types, and components.
- Added Zod validation in `lib/validations/group.ts`.
- Updated the dashboard to link teachers and students to their group workspace.
- Regenerated `types/database.ts` from the linked Supabase schema.

### [x] Successes
- Applied the Groups migration to the linked Supabase project.
- Marked migration `20260524131436` as applied in remote migration history.
- Verified Supabase advisors report no new Groups schema or RLS warnings.
- Verified `npm run check` passes.
- Smoke-checked the new protected group routes locally:
  - `/groups` redirects unauthenticated users to sign-in.
  - `/student/groups` redirects unauthenticated users to sign-in.
  - `/join/[token]` redirects unauthenticated users to sign-in.

### [!] Failures/Blockers
- Supabase advisors still report project-level leaked password protection is disabled. This remains blocked by the current Free plan and is unrelated to the Groups schema.
- Browser automation was not exposed as a callable tool in this session, so local route smoke checks used HTTP requests instead.

### [>] Next Steps
- Move forward with Phase 2, item 4: Questions.

## 2026-05-24: Auth Security Advisor Follow-up (Codex)

### [x] Successes
- Restored hosted Supabase Auth settings in `supabase/config.toml` after local CLI defaults were detected.
- Pushed the corrected Auth config back to the linked Supabase project:
  - Production site URL restored to `https://exam.ataullah.dev/`.
  - Production auth callback redirect restored.
  - Email confirmation restored.
  - Email OTP length restored to 8 digits.
  - TOTP MFA enrollment/verification restored.
  - Minimum password length raised to 8.

### [!] Failures/Blockers
- Leaked password protection could not be enabled because Supabase returned: "Configuring leaked password protection via HaveIBeenPwned.org is available on Pro Plans and up." The project organization is currently on the Free plan.

### [>] Next Steps
- Upgrade the Supabase organization to Pro or higher if leaked-password protection is required.
- Move forward with Phase 2, item 3: Groups.

## 2026-05-24: Live Database Profile Alignment (Codex)

### [+] Features & Improvements
- Added migration `20260524112618_align_profiles_posts_schema.sql`.
- Aligned the linked Supabase database with the profiles feature by adding `public.users.bio`.
- Created `public.posts` for teacher public text posts with a teacher foreign key and indexed teacher/date lookup.
- Added RLS policies for own-profile reads/updates, authenticated teacher profile reads, and authenticated teacher post reads.
- Regenerated `types/database.ts` from the linked Supabase schema.

### [x] Successes
- Applied the alignment SQL to the linked Supabase project.
- Marked migration `20260524112618` as applied in remote migration history.
- Verified the live column list shows `users.bio` and the `posts` table.
- Verified RLS is enabled on `public.users` and `public.posts`.
- Verified profile/post policies are present in `pg_policies`, then simplified duplicate legacy policies.
- Verified Supabase database advisors report no remaining profile/posts schema or RLS warnings.
- Verified generated types now include `public.users.bio` and `public.posts`.
- Verified `npm run check` passes.

### [!] Failures/Blockers
- Supabase pooler temporarily returned `ECIRCUITBREAKER` after repeated CLI authentication attempts, but later verification queries succeeded.
- Supabase advisors still report project-level leaked password protection is disabled; this is an Auth setting outside the profile schema alignment.
- Older migration history is still not fully aligned with local migration files: local has `20260512180000`, while remote reports `20260522180510`. The new profile alignment migration is aligned locally and remotely.

### [>] Next Steps
- Phase 2, item 3: implement Groups.

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
- `supabase gen types` initially could not complete because no Supabase access token was available in the environment. After CLI login, `types/database.ts` was generated successfully.
- Generated types show the linked Supabase `public` schema currently has `users.name` but does not expose `users.bio` or a `posts` table. The live database should be brought in line with the documented Phase 1/Posts assumptions before manually testing profile bio saves or teacher post lists against Supabase.
- Next.js route groups cannot define both `app/(teacher)/profile/page.tsx` and `app/(student)/profile/page.tsx` because both resolve to `/profile`. The implementation uses a single role-aware `/profile` route and separate `/student/profile` companion routes to keep the build valid.

### [>] Next Steps
- Phase 2, item 3: implement Groups.
- Apply or add the missing database updates for profile `bio` and teacher `posts` if they are absent in the target Supabase project.

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
