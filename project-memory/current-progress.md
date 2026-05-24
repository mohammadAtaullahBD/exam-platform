# Current Progress

## Completed

- Supabase SSR is now the active auth/session system.
- Removed the unused NextAuth route/config/dependency to avoid competing auth sources.
- Public landing page added at `/`.
- Public signup creates Supabase Auth users, assigns trusted `app_metadata.role`, and upserts `public.users`.
- Signup redirects to `/auth/check-email` with clear next steps.
- Signup also shows an immediate in-place success state telling users to verify email.
- Email verification callback added at `/auth/callback` and supports both PKCE query-code links and token-fragment links.
- `/api/auth/sync-profile` syncs verified browser sessions into `public.users`.
- Success and failure pages added at `/auth/verified` and `/auth/error`.
- Protected starter dashboard added at `/dashboard`.
- Logout button clears Supabase session and returns to `/`.
- Proxy redirects unauthenticated dashboard access to `/signin`.
- First-admin bootstrap and admin role-promotion APIs added.
- Current real Supabase Auth user was backfilled into `public.users`.
- Auth/profile migration SQL added under `supabase/migrations/`.
- Phase 1 profiles implemented:
  - `/profile` renders the signed-in teacher or student profile based on trusted role.
  - `/teacher/[id]` renders an authenticated public teacher profile with public posts and an empty state.
  - `/profile/edit` updates `public.users.name` and `public.users.bio` through a Server Action.
  - `/student/profile` and `/student/profile/edit` exist as student-specific companion routes because route groups cannot duplicate `/profile`.

## Verified

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run check`
- HTTP smoke checks:
  - `/` returns 200.
  - `/dashboard` redirects unauthenticated users to `/signin?callbackUrl=%2Fdashboard`.
  - `/auth/check-email` returns 200.
  - `/auth/error` returns 200.
  - `/api/health` returns 200.
  - invalid signup returns 400.
  - bootstrap without `ADMIN_SETUP_TOKEN` returns 503.
  - `/profile` redirects unauthenticated users to `/signin?callbackUrl=%2Fprofile`.
  - `/profile/edit` redirects unauthenticated users to `/signin?callbackUrl=%2Fprofile%2Fedit`.
  - `/student/profile` redirects unauthenticated users to sign-in.
  - `/teacher/[id]` redirects unauthenticated users to sign-in.

## Note

The in-app browser successfully opened `/profile` during the profiles pass and confirmed the unauthenticated sign-in redirect without an application error. HTTP smoke checks were also used for protected profile routes.

Supabase type generation was attempted with the CLI, but it failed because no Supabase access token was available in the environment.
