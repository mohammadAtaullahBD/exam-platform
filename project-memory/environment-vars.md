# Environment Variables

Copy `.env.example` to `.env.local` for local development.

## Required Locally and on Vercel

- `NEXTAUTH_SECRET`: strong random secret for NextAuth JWT/session signing.
- `NEXTAUTH_URL`: local URL in development, production Vercel URL in production.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL, safe for browser use.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key, safe for browser use.
- `SUPABASE_URL`: same Supabase project URL for server-side code.
- `SUPABASE_ANON_KEY`: publishable/anon key for server-side compatibility.
- `SUPABASE_SERVICE_KEY`: secret server-only key for admin operations and health checks.

## Optional / Future

- `RESEND_API_KEY`: required when email sending is implemented.

## Security Rules

- Never commit `.env.local`.
- Never expose `SUPABASE_SERVICE_KEY` in client components or `NEXT_PUBLIC_` variables.
- Rotate leaked keys immediately in the Supabase dashboard.
