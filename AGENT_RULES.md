# Agent Rules

These rules apply to every AI agent and developer working in this repository.

1. **Mandatory Audit**: Before starting any task, read `AGENTS.md`, `PROJECT_HISTORY.md`, and every file in `/project-memory/`.
2. **History Tracking**: After completing work, update `PROJECT_HISTORY.md` and relevant `/project-memory/` files. Document successes, failures, and next steps.
3. **Admin Privacy**: Admin is a hidden super-user. No admin implementation details, marketing, or UI should be exposed to public users.
4. **Environment Consistency**: Only use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Supabase connections. Do not use duplicate server-side variables.
5. **Secret Protection**: Never commit real secrets. Use `.env.example` for documentation. Never expose `SUPABASE_SERVICE_KEY` or `ADMIN_SETUP_TOKEN` to client components.
6. **Role Restriction**: Public signup may create `student` and `teacher` users only. Admin roles must be assigned via server-side APIs.
7. **Auth Source of Truth**: Supabase Auth is the source of truth for credentials and sessions. `public.users` is only for application profiles.
8. **Bootstrap Protocol**: The first admin is created via `/api/admin/bootstrap` using `ADMIN_SETUP_TOKEN`. Subsequent role changes use admin-only server routes.
9. **Decision Logging**: Document all significant architectural or technical decisions in `/project-memory/decisions.md`.
10. **Standard Stack**: Follow the existing Next.js 16 App Router, Supabase SSR, and Tailwind CSS 4 architecture.
