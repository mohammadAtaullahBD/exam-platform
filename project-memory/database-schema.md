# Database Schema

## Current Auth Tables

- `auth.users`: managed by Supabase Auth. Stores credentials, email verification state, identities, and trusted `raw_app_meta_data`.
- `public.users`: application profile table. Stores app-facing user fields only: `id`, `email`, `name`, `role`, timestamps, and the legacy `password_hash` column.

## Important Split

The app uses both Supabase Auth users and `public.users`, but they are not competing user systems:

- Supabase Auth is the credential/session source of truth.
- `public.users.id` should match `auth.users.id` for real app users.
- AI-created seed rows may exist only in `public.users`; they are not login accounts unless matching `auth.users` rows also exist.
- Newly registered users are created in `auth.users` and now also synced into `public.users`.

## Migration

`supabase/migrations/20260512180000_auth_profiles_and_admin.sql` documents the intended production schema:

- Keeps `public.users` as the app profile table.
- Adds/normalizes `name`, `created_at`, and `updated_at`.
- Makes `password_hash` nullable and treats it as deprecated.
- Adds a role check for `student`, `teacher`, and `admin`.
- Adds a not-yet-validated FK from `public.users.id` to `auth.users.id` so legacy seed rows do not block migration, while new rows are enforced.
- Adds private trigger helpers to sync Auth user changes into `public.users`.
- Enables RLS and profile/admin policies.

## RLS Requirements

- Enable RLS on all public tables.
- Use trusted `app_metadata.role` for admin authorization, never user-editable metadata.
- Students and teachers should access only their own future exam data unless a later schema explicitly grants more.
- Admins can manage app users through trusted server routes.
