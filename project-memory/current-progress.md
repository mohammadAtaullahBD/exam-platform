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
- Linked Supabase database aligned for profiles:
  - `public.users.bio` exists.
  - `public.posts` exists with `teacher_id`, `content`, and `created_at`.
  - RLS is enabled on `public.users` and `public.posts`.
  - Profile/post RLS policies were verified and duplicate legacy policies were simplified.
  - Supabase advisors report no remaining profile/posts schema or RLS warnings.
  - `types/database.ts` was regenerated and includes `users.bio` and `posts`.
- Hosted Supabase Auth config restored after local CLI defaults were detected:
  - Production site URL and auth callback redirect are restored.
  - Email confirmations, 8-digit email OTPs, and TOTP MFA are restored.
  - Minimum password length is now 8.
- Phase 2 groups implemented:
  - `public.groups` and `public.group_members` exist with invite tokens, FK indexes, timestamps, and RLS.
  - `/groups` lets teachers create, rename, delete, and share private group invite links.
  - `/student/groups` lists groups a student has joined.
  - `/join/[token]` lets students join a group from an invite link through a Server Action.
  - `features/groups/` contains the group actions, queries, types, and components.
  - `types/database.ts` was regenerated and includes `groups` and `group_members`.
- Phase 2 questions implemented:
  - `public.questions` exists with teacher/admin source tracking, JSONB answer options, answer validation, timestamps, FK indexes, and RLS.
  - `/questions` lets teachers create, edit, delete, search, and filter their question bank.
  - `features/questions/` contains the question actions, queries, types, and components.
  - `types/database.ts` was regenerated and includes `questions`.

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
  - `/groups` redirects unauthenticated users to sign-in.
  - `/student/groups` redirects unauthenticated users to sign-in.
  - `/join/[token]` redirects unauthenticated users to sign-in.
  - `/questions` redirects unauthenticated users to sign-in.

## Note

The in-app browser successfully opened `/profile` during the profiles pass and confirmed the unauthenticated sign-in redirect without an application error. HTTP smoke checks were also used for protected profile routes.

Supabase type generation succeeded after CLI login and created `types/database.ts`. The linked Supabase database was later aligned with `users.bio` and `posts`, types were regenerated again, and RLS/policy verification succeeded after temporary Supabase pooler `ECIRCUITBREAKER` noise.

Supabase leaked-password protection could not be enabled on the current Free plan. Supabase requires Pro or higher for HaveIBeenPwned leaked-password checks.

Browser automation was not exposed as a callable tool during the Groups pass, so HTTP smoke checks were used for the new protected routes.

The Questions migration was applied with `supabase db query` and then marked applied with `supabase migration repair` because `supabase db push --linked` is still blocked by the older remote-only migration `20260522180510`. Supabase advisor and migration-list follow-up checks later hit the same temporary pooler `ECIRCUITBREAKER` authentication block seen in earlier work.
