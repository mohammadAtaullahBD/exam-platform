# Changelog

## 2026-05-31

- Added Vercel Speed Insights with `@vercel/speed-insights` and the root Next.js `<SpeedInsights />` component.

## 2026-05-30

- Cleared the remaining cleanup blockers: linked migration list and linked DB lint now pass after pooler recovery, and local `.env.local` no longer contains `ADMIN_SETUP_TOKEN` or legacy duplicate env names.
- Archived the 4 isolated legacy `public.users` orphan profiles into `private.archived_user_profiles`, deleted the orphan profile rows, and validated `users_id_auth_fkey`.
- Added migration `20260530083805_database_time_and_post_length_hardening.sql` for database-time reads and post length hardening.
- Switched exam, progress, and practice state calculations to use Supabase database time through `public.database_now()`.
- Expanded protected-route smoke coverage from 18 to 22 routes.
- Hardened live workflow smoke cleanup and live-state reporting so temporary smoke profile residue is detected without exposing PII.
- Re-ran linked Supabase advisors after the database-time hardening migration; only project-level leaked-password protection remains.
- Added `scripts/archive-orphan-profiles-and-validate-fk.sql.template`, a fail-closed operational template for approved orphan profile cleanup and FK validation.
- Verified linked Supabase DB lint now runs through the current CLI and reports no public-schema errors.
- Re-ran linked Supabase advisors; only project-level leaked-password protection remains.
- Added `npm run smoke:live-workflows` for opt-in live Supabase workflow verification with temporary fixtures and cleanup.
- Added `npm run smoke:static` for static role/security/admin-hidden invariants.
- Expanded `npm run smoke:routes` to cover dynamic protected routes and unauthenticated API gates.
- Added migration `20260530032151_add_users_auth_fk_not_valid.sql` to enforce new `public.users` rows against `auth.users` while existing orphan profiles remain unvalidated.
- Fetched remote migration `20260522180510_fix_auth_profile_sync.sql` and repaired the older migration-history mismatch.
- Added hidden `/admin/users` user-role management for super-users.
- Added `npm run verify:auth-redirects` to verify hosted Supabase Auth callback allow-list behavior with temporary users and cleanup.

## 2026-05-29

- Added student exam-taking routes with countdown, active-window submission, auto-submit attempt, and submission scoring.
- Added merit-list routes for students and teachers.
- Added student progress and wrong-answer practice dashboards.
- Added teacher posts, student feed, reactions, and comments.
- Added hidden public-set management route, student public exam attempts, and teacher public-set question import.
- Added migrations for submissions, social reactions/comments, and public exam sets/attempts.
- Added `npm run smoke:routes` for protected-route and invalid-signup smoke coverage.

## 2026-05-12

- Fixed `/auth/callback` to support Supabase token-fragment verification links (`#access_token` and `#refresh_token`) as well as PKCE `?code=` links.
- Added `/api/auth/sync-profile` so client-processed verification links can still update `public.users` through trusted server code.
- Changed signup to show an immediate in-place success state telling users to verify email before redirecting to `/auth/check-email`.
- Replaced active NextAuth flow with Supabase SSR auth.
- Removed unused NextAuth dependency and route/config files.
- Added public landing page at `/`.
- Added protected `/dashboard` with user info and logout.
- Added `/auth/callback`, `/auth/check-email`, `/auth/verified`, and `/auth/error`.
- Fixed signup UX to redirect to check-email and prevent duplicate submissions.
- Fixed signup architecture to create Auth users plus `public.users` profile records.
- Added first-admin bootstrap and admin role-promotion APIs.
- Added auth/profile migration SQL.
- Backfilled the current real Supabase Auth user into `public.users`.
- Updated environment and project memory documentation.

## Earlier 2026-05-12

- Added custom auth pages for sign in, sign up, and forgot password.
- Added public signup support for `student` and `teacher`.
- Added hydration warning guard for extension-injected body attributes.
- Added Vercel deployment config and `.env.example`.
- Added `/api/health` Supabase keepalive endpoint.
- Added `/project-memory` and `AGENT_RULES.md`.
