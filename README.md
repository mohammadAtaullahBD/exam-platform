# Exam Platform

A Next.js 16 exam platform for students, teachers, and admins. The project is prepared for Vercel deployment and uses Supabase for auth/database foundations.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Before changing code, read:

- `AGENTS.md`
- `AGENT_RULES.md`
- every file in `/project-memory`

## Useful Scripts

```bash
npm run dev          # local development
npm run lint         # eslint
npm run typecheck    # TypeScript checks
npm run build        # production build
npm run check        # lint + typecheck + build
npm run start        # serve production build locally
```

## Environment Setup Guide

1. Copy `.env.example` to `.env.local`.
2. Add your Supabase values.
3. Never commit `.env.local`.

Required variables:

- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_SETUP_TOKEN`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

Generate a strong `ADMIN_SETUP_TOKEN` with:

```bash
openssl rand -base64 32
```

On Windows PowerShell, use:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Vercel Deployment Guide

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Open Vercel.
3. Click **Add New...**.
4. Click **Project**.
5. Import the repository.
6. Confirm framework preset is **Next.js**.
7. Use these settings:
   - Install Command: `npm install`
   - Build Command: `npm run vercel-build`
   - Output Directory: leave default
8. Add the required environment variables in **Project Settings > Environment Variables**.
9. Set `NEXT_PUBLIC_SITE_URL` to the production URL, for example `https://your-project.vercel.app`.
10. In Supabase Auth URL Configuration, allow `https://your-project.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`.
11. Apply `supabase/migrations/20260512180000_auth_profiles_and_admin.sql`.
12. Click **Deploy**.

## Vercel Settings

Use the defaults unless the project changes substantially:

- Framework Preset: `Next.js`
- Node.js Version: Vercel default LTS is fine
- Build Command: `npm run vercel-build`
- Install Command: `npm install`
- Root Directory: repository root

`vercel.json` exists to keep build/install behavior explicit.

## Redeploying Updates

For normal updates:

1. Commit changes.
2. Push to the connected production branch.
3. Vercel deploys automatically.

For manual redeploy:

1. Open the Vercel project.
2. Go to **Deployments**.
3. Pick a deployment.
4. Click **Redeploy**.

## Supabase Keepalive Cron Guide

The keepalive endpoint is:

```text
https://your-project.vercel.app/api/health
```

Supabase free/inactive projects can pause after inactivity. Running a lightweight request every 5 days keeps the project warm. Five days is safer than seven because it leaves buffer for cron delays, failed attempts, time zone confusion, or temporary downtime.

### cron-job.org Setup

1. Go to `https://cron-job.org`.
2. Create an account or sign in.
3. Click **Create cronjob**.
4. Set **Title** to `Exam Platform Supabase Keepalive`.
5. Set **URL** to `https://your-project.vercel.app/api/health`.
6. Set **Schedule** to every 5 days.
7. Set **Request method** to `GET`.
8. Keep authentication disabled unless you later add a secret to the endpoint.
9. Save the cron job.
10. Click **Run now** or **Test run**.

### Verify Keepalive

The endpoint should return JSON like:

```json
{
  "status": "alive",
  "time": "2026-05-12T00:00:00.000Z"
}
```

If it returns `degraded`, Supabase was reached but the lightweight `users` table query failed. Create/update the app-facing `users` table or update `/app/api/health/route.ts` to query the final profile table.

## Maintenance Guide

- Run `npm run check` before production deployments.
- Keep `.env.example` in sync when adding environment variables.
- Update `/project-memory` after meaningful changes.
- Keep server-only Supabase operations out of Client Components.
- Keep role authorization based on trusted `app_metadata`.
- Review Supabase RLS policies before exposing new tables.

## Future Developer Onboarding

1. Read `AGENTS.md`.
2. Read `AGENT_RULES.md`.
3. Read every file in `/project-memory`.
4. Install dependencies with `npm install`.
5. Configure `.env.local`.
6. Run `npm run check`.
7. Start development with `npm run dev`.

## Common Deployment Issues

- **Verification redirects to localhost:** update Supabase Auth Site URL and Redirect URLs.
- **Signup role assignment fails:** check `SUPABASE_SERVICE_KEY`.
- **Health endpoint returns degraded:** check that the queried table exists and is accessible.
- **Build errors after framework changes:** read `node_modules/next/dist/docs/` for Next.js 16 behavior.
- **Secrets appear in the browser:** remove any secret from `NEXT_PUBLIC_` variables and rotate it.
