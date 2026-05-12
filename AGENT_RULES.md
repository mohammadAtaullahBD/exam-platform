# Agent Rules

These rules apply to every AI agent and developer working in this repository.

1. Read every file in `/project-memory` before making changes.
2. Read `AGENTS.md` and the relevant Next.js docs in `node_modules/next/dist/docs/` before editing Next.js code.
3. Keep the existing architecture intact unless the user explicitly asks for a redesign.
4. Keep Vercel deployment compatibility intact. Avoid runtime APIs or packages that do not work in Vercel serverless functions.
5. Never commit real secrets. Use `.env.local` locally and `.env.example` for documentation.
6. Never expose `SUPABASE_SERVICE_KEY` or any secret key to client components.
7. Public signup may create `student` and `teacher` users only. Admin roles must be assigned by trusted admin-only logic.
8. Update `/project-memory` after completing meaningful work, especially architecture, auth, database, deployment, or dependency changes.
9. Document important decisions in `/project-memory/decisions.md`.
10. Run `npm run check` before deployment-oriented commits when time permits.
