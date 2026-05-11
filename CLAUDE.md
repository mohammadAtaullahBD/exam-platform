@AGENTS.md

# Exam Platform — Project Context

## Stack
- Framework: Next.js 14 (App Router)
- Database: Supabase (PostgreSQL)
- Auth: NextAuth.js + Supabase Auth
- Hosting: Vercel
- Storage: Cloudflare R2
- Email: Resend.com
- Styling: Tailwind CSS

## Folder Structure
/app/api        → all backend API routes
/app/dashboard  → teacher dashboard
/app/exam       → student exam page
/app/leaderboard → per-exam rankings
/app/admin      → admin panel
/components     → reusable UI
/lib/supabase.ts → Supabase client
/lib/auth.ts    → NextAuth config

## User Roles
- student  → takes exams, views own progress
- teacher  → creates questions for own students only
- admin    → sees everything

## Key Rules
- Never expose Supabase service key on the client side
- Use Row-Level Security (RLS) for all teacher/student data isolation
- All API routes must check session role before returning data
- Use server components by default; client components only when needed

## Environment Variables (never commit these)
NEXTAUTH_SECRET
NEXTAUTH_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
RESEND_API_KEY
