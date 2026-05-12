# Current Progress

## Completed

- Supabase dependencies installed.
- Supabase agent skills installed under `.agents/skills`.
- Supabase browser, server, admin, auth, and proxy clients added.
- NextAuth route and configuration added.
- Role model added: `student`, `teacher`, `admin`.
- Custom sign in, sign up, forgot password, and forget-password redirect pages added.
- Public signup supports `student` and `teacher`.
- Admin creation is intentionally not public.
- Vercel-focused environment template and build config added.
- Health check API route added at `/api/health`.
- Project memory system and future agent rules added.

## Verified

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Run `npm run check` before production deployment.
