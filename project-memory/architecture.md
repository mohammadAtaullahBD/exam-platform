# Architecture

## App Structure

- `app/` contains App Router pages and route handlers.
- `app/(auth)/` contains auth UI routes and shared auth components.
- `app/api/auth/[...nextauth]/route.ts` exposes NextAuth handlers.
- `app/api/auth/signup/route.ts` handles public student/teacher signup.
- `app/api/health/route.ts` is a lightweight Supabase keepalive endpoint.
- `lib/roles.ts` defines role types and validation.
- `lib/auth.ts` defines NextAuth configuration and server helpers.
- `lib/supabase/` contains browser, server, admin, and proxy Supabase clients.
- `proxy.ts` refreshes Supabase SSR cookies using the Next.js 16 proxy convention.

## Runtime Rules

- Use Server Components by default.
- Use Client Components only for browser interactivity such as forms.
- Keep privileged Supabase operations in server-only modules.
- Do not use `middleware.ts`; Next.js 16 uses `proxy.ts`.

## Auth Flow

- Sign in uses NextAuth Credentials provider and Supabase password auth.
- Session role is read from Supabase `app_metadata.role`.
- Public signup allows `student` and `teacher` only.
- Admin role assignment must happen through trusted admin-only logic.
