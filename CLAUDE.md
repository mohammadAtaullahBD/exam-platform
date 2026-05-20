# Claude Agent Context

This file provides specific context for the Claude AI agent. It supplements the universal framework defined in `AGENTS.md`.

## 📖 Required Reading
1. `AGENTS.md`: Universal collaboration framework.
2. `AGENT_RULES.md`: Core development rules.
3. `PROJECT_HISTORY.md`: Recent activity and status.
4. `/project-memory/`: Detailed project documentation.

## 🛠 Tech Stack
- **Framework**: Next.js 16 App Router
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (`@supabase/ssr`)
- **Styling**: Tailwind CSS 4

## 🔐 Environment Variables
Use these variables for Supabase connection:
- `NEXT_PUBLIC_SUPABASE_URL`: Project URL (Public & Server)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Anon key (Public & Server)
- `SUPABASE_SERVICE_KEY`: Service role key (Server-only secret)
- `ADMIN_SETUP_TOKEN`: Bootstrap secret

## 🏗 Key Architecture Rules
- **Environment**: Do NOT use `SUPABASE_URL` or `SUPABASE_ANON_KEY`. Use the `NEXT_PUBLIC_` variants everywhere.
- **Admin**: Admin is a hidden super-user. Never expose admin details in public UI or marketing.
- **Roles**: `student`, `teacher`, `admin`.
- **Auth**: Use `lib/supabase/` helpers for client/server/admin clients.

## 🔄 Workflow
- Update `PROJECT_HISTORY.md` after every significant change.
- Keep `/project-memory/` updated for long-term documentation.
