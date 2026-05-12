# Architecture

## App Structure

- `app/` contains Next.js 16 App Router pages and route handlers.
- `app/(auth)/` contains public sign-in, sign-up, and password-reset UI.
- `app/auth/callback/route.ts` exchanges Supabase email verification codes for SSR cookies.
- `app/auth/check-email`, `app/auth/verified`, and `app/auth/error` provide clear auth lifecycle pages.
- `app/dashboard/page.tsx` is the protected starter dashboard.
- `app/api/auth/signup/route.ts` handles public student/teacher signup.
- `app/api/admin/bootstrap/route.ts` creates the first admin using `ADMIN_SETUP_TOKEN`.
- `app/api/admin/users/[userId]/role/route.ts` lets an existing admin promote/demote users.
- `lib/supabase/` contains browser, server, admin, proxy, and profile helpers.
- `proxy.ts` refreshes Supabase SSR cookies and redirects unauthenticated dashboard visits.

## Runtime Rules

- Use Server Components by default.
- Use Client Components only for browser interactivity such as forms and logout.
- Keep privileged Supabase operations in server-only modules.
- Do not use `middleware.ts`; Next.js 16 uses `proxy.ts`.
- Do not reintroduce NextAuth unless the whole auth architecture is deliberately redesigned.

## Auth Flow

- Supabase Auth is the source of truth for credentials, email verification, and sessions.
- Browser sign-in uses `supabase.auth.signInWithPassword`.
- Signup creates a Supabase Auth user, stores trusted role in `app_metadata.role`, and upserts `public.users`.
- Email links redirect to `/auth/callback`, which calls `exchangeCodeForSession` and then sends users to `/auth/verified`.
- `public.users` is the app profile table; it must not store passwords.
