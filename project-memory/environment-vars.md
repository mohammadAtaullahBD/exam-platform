# Environment Variables

Copy `.env.example` to `.env.local` for local development.

## Required Locally and on Vercel

- `NEXT_PUBLIC_SITE_URL`: public app origin, for example `http://localhost:3000` locally or `https://your-project.vercel.app` in production.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL, used for both client and server-side connection.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key, used for both client and server-side connection.
- `SUPABASE_SERVICE_KEY`: secret server-only key for admin operations, profile sync, bootstrap, and promotion.

## Admin Setup

- `ADMIN_SETUP_TOKEN`: long random secret used only by `/api/admin/bootstrap` while creating the first admin.
- Remove or rotate `ADMIN_SETUP_TOKEN` after the first real admin exists.

## Optional / Future

- `RESEND_API_KEY`: required when email sending is implemented.

## Security Rules

- Never commit `.env.local`.
- Never expose `SUPABASE_SERVICE_KEY` or `ADMIN_SETUP_TOKEN` in client components or `NEXT_PUBLIC_` variables.
- Rotate leaked keys immediately in the Supabase dashboard.
- Do NOT use duplicate `SUPABASE_URL` or `SUPABASE_ANON_KEY` variables. Use the `NEXT_PUBLIC_` variants everywhere.
