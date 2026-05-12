# Changelog

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
