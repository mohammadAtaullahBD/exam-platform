# Pending Tasks

- Apply `supabase/migrations/20260512180000_auth_profiles_and_admin.sql` to the Supabase project.
- In Supabase Auth settings, add production and local `/auth/callback` redirect URLs.
- Create the first real admin using `/api/admin/bootstrap`, then remove or rotate `ADMIN_SETUP_TOKEN`.
- Build an admin UI over `/api/admin/users/[userId]/role`.
- Decide whether to delete or archive legacy AI seed users in `public.users`.
- Design and implement the database schema for exams, questions, attempts, submissions, and teacher/student relationships.
- Create Supabase RLS policies for future exam data isolation.
- Add actual student, teacher, and admin dashboard workflows.
- Add automated tests for signup, verification callback, protected route redirects, logout, and admin promotion.
