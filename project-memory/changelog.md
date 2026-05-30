# Changelog

## 2026-05-30

- Added `npm run smoke:live-workflows` for opt-in live Supabase workflow verification with temporary fixtures and cleanup.
- Added `npm run smoke:static` for static role/security/admin-hidden invariants.
- Expanded `npm run smoke:routes` to cover dynamic protected routes and unauthenticated API gates.
- Added migration `20260530032151_add_users_auth_fk_not_valid.sql` to enforce new `public.users` rows against `auth.users` while existing orphan profiles remain unvalidated.

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
