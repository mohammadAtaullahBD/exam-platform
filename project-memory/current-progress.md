# Current Progress

## Completed

- Supabase SSR is now the active auth/session system.
- Removed the unused NextAuth route/config/dependency to avoid competing auth sources.
- Public landing page added at `/`.
- Public signup creates Supabase Auth users, assigns trusted `app_metadata.role`, and upserts `public.users`.
- Signup redirects to `/auth/check-email` with clear next steps.
- Email verification callback added at `/auth/callback`.
- Success and failure pages added at `/auth/verified` and `/auth/error`.
- Protected starter dashboard added at `/dashboard`.
- Logout button clears Supabase session and returns to `/`.
- Proxy redirects unauthenticated dashboard access to `/signin`.
- First-admin bootstrap and admin role-promotion APIs added.
- Current real Supabase Auth user was backfilled into `public.users`.
- Auth/profile migration SQL added under `supabase/migrations/`.

## Verified

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- HTTP smoke checks:
  - `/` returns 200.
  - `/dashboard` redirects unauthenticated users to `/signin?callbackUrl=%2Fdashboard`.
  - `/auth/check-email` returns 200.
  - `/auth/error` returns 200.
  - `/api/health` returns 200.
  - invalid signup returns 400.
  - bootstrap without `ADMIN_SETUP_TOKEN` returns 503.

## Note

The in-app browser could not open local URLs in this session because the browser reported `ERR_BLOCKED_BY_CLIENT`; HTTP smoke checks were used instead.
