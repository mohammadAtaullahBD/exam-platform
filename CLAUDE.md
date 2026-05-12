@AGENTS.md

# Exam Platform - Project Context

## Stack

- Framework: Next.js 16 App Router
- Database: Supabase PostgreSQL
- Auth: Supabase Auth with `@supabase/ssr`
- Hosting: Vercel
- Email: Supabase Auth email templates for verification
- Styling: Tailwind CSS

## Current Auth Model

- Supabase Auth stores credentials, email verification state, and sessions.
- `public.users` is the application profile table linked by `id = auth.users.id`.
- Public signup may create `student` and `teacher` accounts only.
- Admin roles are assigned by trusted server routes only.
- Do not reintroduce NextAuth without a deliberate architecture change.

## Key Routes

- `/` public landing page
- `/signin` and `/signup` public auth pages
- `/auth/callback` Supabase email verification callback
- `/auth/check-email`, `/auth/verified`, `/auth/error` lifecycle pages
- `/dashboard` protected starter dashboard
- `/api/admin/bootstrap` first-admin setup
- `/api/admin/users/[userId]/role` admin-only role updates

## Key Rules

- Never expose Supabase service key or `ADMIN_SETUP_TOKEN` on the client side.
- Use Row-Level Security for public tables.
- Use trusted `app_metadata.role`, not user-editable metadata, for authorization.
- Use server components by default; client components only when needed.
- Read `/project-memory` before changing architecture, auth, database, or deployment behavior.

## Environment Variables

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `ADMIN_SETUP_TOKEN`
- `RESEND_API_KEY` optional/future
