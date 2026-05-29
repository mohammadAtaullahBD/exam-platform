# Deployment

## Vercel Deployment Steps

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

## Production Environment Variables

- `NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_KEY`
- `ADMIN_SETUP_TOKEN` until first admin setup is complete

## Common Issues

- Verification link opens `localhost`: Supabase Auth Site URL or Redirect URLs are wrong.
- Verification link says expired/invalid: request a fresh email link and ensure `/auth/callback` is allow-listed. Supabase may send either `?code=` or `#access_token=` links; the app supports both.
- Signup succeeds but profile is missing: check `SUPABASE_SERVICE_KEY`, `public.users` schema, and migration status.
- Dashboard redirects to login: no Supabase SSR session cookie exists; sign in again or complete verification.
- Promoted user still sees old role: sign out and sign back in to refresh JWT claims.
