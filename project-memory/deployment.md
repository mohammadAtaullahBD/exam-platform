# Deployment

## Vercel Deployment Steps

Current project:

- Vercel project: `exam-platform`
- Production URL: `https://exam.ataullah.dev`
- Framework preset: Next.js
- Install command: `npm install`
- Build command: `npm run vercel-build`
- Output directory: Next.js default

### First-time setup

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, click **Add New...** then **Project**.
3. Import the repository.
4. Framework preset should be **Next.js**.
5. Install command: `npm install`.
6. Build command: `npm run vercel-build`.
7. Output directory: leave default.
8. Add all required environment variables from `.env.example`.
9. Set Supabase Auth URL configuration:
   - Site URL: production app URL.
   - Redirect URLs: production `/auth/callback` and local `http://localhost:3000/auth/callback`.
10. Apply all migrations in `supabase/migrations/` through the Supabase CLI or SQL Editor.
11. Deploy.

### Release flow

1. Confirm local verification passes:
   - `npm run check`
   - `npm run smoke:static`
   - `npm run verify:live-state`
2. Push the release branch to GitHub.
3. Wait for Vercel to create a Preview deployment.
4. If the Preview deployment is protected, test the public production domain after promotion instead of the protected Preview URL.
5. Merge to the production branch or promote the ready Preview deployment in Vercel.
6. Smoke-test production:
   - PowerShell: `$env:SMOKE_BASE_URL = 'https://exam.ataullah.dev'; npm.cmd run smoke:routes`
   - Bash: `SMOKE_BASE_URL=https://exam.ataullah.dev npm run smoke:routes`
7. For Speed Insights, visit the production site after deployment so Vercel can begin collecting real visitor metrics.

## Production Environment Variables

- `NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_KEY`

Do not set `ADMIN_SETUP_TOKEN` after first admin setup is complete.

## Common Issues

- Verification link opens `localhost`: Supabase Auth Site URL or Redirect URLs are wrong.
- Verification link says expired/invalid: request a fresh email link and ensure `/auth/callback` is allow-listed. Supabase may send either `?code=` or `#access_token=` links; the app supports both.
- Signup succeeds but profile is missing: check `SUPABASE_SERVICE_KEY`, `public.users` schema, and migration status.
- Dashboard redirects to login: no Supabase SSR session cookie exists; sign in again or complete verification.
- Promoted user still sees old role: sign out and sign back in to refresh JWT claims.
