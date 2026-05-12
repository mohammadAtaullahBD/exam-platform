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
9. Click **Deploy**.

## Production Environment Variables

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=https://your-project.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

## Future Redeploys

- Commit changes.
- Push to the connected production branch.
- Vercel automatically builds and deploys.
- For manual redeploys, open the Vercel project, go to **Deployments**, select a deployment, then click **Redeploy**.

## Common Issues

- Missing `NEXTAUTH_SECRET`: sign-in/session errors.
- Wrong `NEXTAUTH_URL`: callbacks redirect to the wrong host.
- Missing `SUPABASE_SERVICE_KEY`: signup role assignment and health check fail.
- Health endpoint returns `degraded`: Supabase responded but the `users` table/query is not ready.
- Build fails after Next.js changes: read `node_modules/next/dist/docs/` for Next.js 16 conventions.
