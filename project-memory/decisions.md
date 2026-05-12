# Decisions

## Next.js 16

Use local docs in `node_modules/next/dist/docs/` before editing framework-specific code. This repo uses Next.js 16, where `proxy.ts` replaces the old middleware convention.

## Roles

Roles are `student`, `teacher`, and `admin`.

- Public signup can create `student` and `teacher` users.
- Public signup cannot create `admin` users.
- Authorization reads trusted Supabase `app_metadata.role`.
- User-editable metadata is not trusted for authorization.

## Supabase Clients

- Browser client uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Server/admin clients are server-only.
- `SUPABASE_SERVICE_KEY` is only used in server route handlers or server-only modules.

## Deployment

The deployment target is Vercel. `vercel.json` pins the framework and build/install commands without adding platform-specific cron behavior.
