# Current Progress

## Completed

- Supabase SSR is now the active auth/session system.
- Removed the unused NextAuth route/config/dependency to avoid competing auth sources.
- Public landing page added at `/`.
- Public signup creates Supabase Auth users, assigns trusted `app_metadata.role`, and upserts `public.users`.
- Signup redirects to `/auth/check-email` with clear next steps.
- Signup also shows an immediate in-place success state telling users to verify email.
- Email verification callback added at `/auth/callback` and supports both PKCE query-code links and token-fragment links.
- `/api/auth/sync-profile` syncs verified browser sessions into `public.users`.
- Success and failure pages added at `/auth/verified` and `/auth/error`.
- Protected starter dashboard added at `/dashboard`.
- Logout button clears Supabase session and returns to `/`.
- Proxy redirects unauthenticated dashboard access to `/signin`.
- First-admin bootstrap and admin role-promotion APIs added.
- Current real Supabase Auth user was backfilled into `public.users`.
- Auth/profile migration SQL added under `supabase/migrations/`.
- Phase 1 profiles implemented:
  - `/profile` renders the signed-in teacher or student profile based on trusted role.
  - `/teacher/[id]` renders an authenticated public teacher profile with public posts and an empty state.
  - `/profile/edit` updates `public.users.name` and `public.users.bio` through a Server Action.
  - `/student/profile` and `/student/profile/edit` exist as student-specific companion routes because route groups cannot duplicate `/profile`.
- Linked Supabase database aligned for profiles:
  - `public.users.bio` exists.
  - `public.posts` exists with `teacher_id`, `content`, and `created_at`.
  - RLS is enabled on `public.users` and `public.posts`.
  - Profile/post RLS policies were verified and duplicate legacy policies were simplified.
  - Supabase advisors report no remaining profile/posts schema or RLS warnings.
  - `types/database.ts` was regenerated and includes `users.bio` and `posts`.
- Hosted Supabase Auth config restored after local CLI defaults were detected:
  - Production site URL and auth callback redirect are restored.
  - Email confirmations, 8-digit email OTPs, and TOTP MFA are restored.
  - Minimum password length is now 8.
- Phase 2 groups implemented:
  - `public.groups` and `public.group_members` exist with invite tokens, FK indexes, timestamps, and RLS.
  - `/groups` lets teachers create, rename, delete, and share private group invite links.
  - `/student/groups` lists groups a student has joined.
  - `/join/[token]` lets students join a group from an invite link through a Server Action.
  - `features/groups/` contains the group actions, queries, types, and components.
  - `types/database.ts` was regenerated and includes `groups` and `group_members`.
- Phase 2 questions implemented:
  - `public.questions` exists with teacher/admin source tracking, JSONB answer options, answer validation, timestamps, FK indexes, and RLS.
  - `/questions` lets teachers create, edit, delete, search, and filter their question bank.
  - `features/questions/` contains the question actions, queries, types, and components.
  - `types/database.ts` was regenerated and includes `questions`.
  - Follow-up migration `20260524171724_grant_question_validation_helpers.sql` grants authenticated users the private validation helper access needed for question inserts.
- Phase 2 exams implemented:
  - `public.exams` and `public.exam_questions` exist with FK indexes, timestamps, RLS, and database-derived scheduled/active/closed state.
  - Exam questions store snapshots of selected question content, options, and correct answer.
  - A `pg_cron` job named `close-due-exams` calls `private.close_due_exams()` every minute to stamp ended exams with `closed_at`.
  - `/exams` lets teachers create group exams from their question bank and list scheduled, active, and closed exams.
  - `features/exams/` contains exam actions, queries, types, and components.
  - `types/database.ts` was regenerated and includes `exams` and `exam_questions`.
- Phase 3 student core implemented:
  - `public.submissions` and `public.submission_answers` are defined in migration SQL with FK indexes, RLS, one-submission-per-student enforcement, and active-window insert trigger.
  - `/student/exams` lists upcoming and active joined-group exams.
  - `/student/exams/[id]` opens active exams, renders all questions, shows a countdown, and submits scored answers through a Server Action.
  - `/student/exams/[id]/merit` and `/exams/[id]/merit` show rankings after close.
  - `/student/progress` shows previous closed exam scores and merit position.
  - `/student/practice` lets students retry questions they previously answered incorrectly without creating scores or merit entries.
- Phase 4 social implemented:
  - `public.reactions` and `public.comments` are defined in migration SQL with FK indexes, RLS, and duplicate reaction prevention.
  - `/posts` lets teachers publish text-only posts.
  - `/student/feed` lets students read posts, react, and comment.
- Phase 5 public exams implemented:
  - `public.public_exam_sets`, `public.public_exam_set_questions`, `public.public_exam_attempts`, and `public.public_exam_attempt_answers` are defined in migration SQL with FK indexes and RLS.
  - Hidden `/public-sets` lets the super-user create published or draft public sets.
  - `/student/public-exams` lets students take published public sets at any time and stores personal scores only.
  - `/questions` lets teachers copy published public set questions into their own question bank with `original_id` preserved.
- Dashboard navigation now links role-appropriate teacher/student workspaces while keeping hidden super-user routes unlinked.
- Added `scripts/smoke-routes.mjs` and `npm run smoke:routes` for unauthenticated protected-route and invalid admin-signup smoke coverage.
- Added `scripts/verify-live-state.mjs` and `npm run verify:live-state` for aggregate Auth/profile verification without printing secrets.
- `npm run verify:live-state` now also reports orphan profile role counts and aggregate direct dependency counts.
- Added `scripts/smoke-static-invariants.mjs` and `npm run smoke:static` for public signup, hidden super-user route, client-secret, and trusted-role invariant checks.
- Added `scripts/smoke-live-workflows.mjs` and `npm run smoke:live-workflows` for opt-in live Supabase workflow checks with temporary fixtures and cleanup.
- Added `scripts/verify-auth-redirects.mjs` and `npm run verify:auth-redirects` for hosted Auth callback allow-list verification with temporary users and cleanup.
- Added `scripts/archive-orphan-profiles-and-validate-fk.sql.template`, a fail-closed live-operations template for archiving isolated orphan profiles, deleting those archived rows, and validating `users_id_auth_fkey` after explicit approval.
- Added migration `20260530032151_add_users_auth_fk_not_valid.sql`; linked Supabase initially created `users_id_auth_fkey` as `NOT VALID`, and the FK is now validated after approved orphan cleanup.
- Added migration `20260530083805_database_time_and_post_length_hardening.sql`; linked Supabase now exposes authenticated `public.database_now()` for server-side database-time exam state checks and enforces the app's 2000-character post limit at the database layer.
- Added hidden `/admin/users` for super-users to review Auth users and update trusted roles without exposing admin navigation publicly.
- Fetched `20260522180510_fix_auth_profile_sync.sql` into local migrations and repaired `20260512180000` migration history after verifying live schema equivalence.
- Approved orphan profile cleanup is complete:
  - The 4 isolated legacy `public.users` rows without matching Auth users were archived into `private.archived_user_profiles`.
  - Those orphan profile rows were deleted from `public.users`.
  - `users_id_auth_fkey` was validated.
  - Postflight live state shows 4 Auth users, 4 profile rows, no orphan profiles, no Auth users missing profiles, and the real Auth admin still exists.
- Remaining cleanup blockers are cleared:
  - Linked migration list now succeeds after the temporary pooler circuit breaker.
  - Linked public-schema DB lint now succeeds after the temporary pooler circuit breaker.
  - Local `.env.local` no longer contains `ADMIN_SETUP_TOKEN`.
  - Local `.env.local` no longer contains legacy duplicate env names: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXTAUTH_SECRET`, or `NEXTAUTH_URL`.

## Verified

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run check`
- `npm run verify:live-state`
- `npm run verify:auth-redirects`
- `npm run smoke:static`
- `npm run smoke:live-workflows`
- `npm run smoke:routes` against a local production server, currently covering 22 protected routes.
- `npx tsc --noEmit --incremental false`
- `npx.cmd supabase db lint --linked --schema public --level warning --fail-on none --output-format json`
- `npx.cmd supabase migration list --linked`
- `npx.cmd supabase db advisors --linked --level warn --fail-on none --output-format json`
- `npx.cmd supabase gen types typescript --linked --schema public` regenerated types through a temp file; no `types/database.ts` content diff was produced.
- Hosted Auth accepted both `https://exam.ataullah.dev/auth/callback` and `http://localhost:3000/auth/callback` in temporary signups; the temporary Auth users were deleted.
- Direct linked SQL previously verified `users_id_auth_fkey` existed on `public.users` as intentionally unvalidated before orphan cleanup.
- Direct linked SQL verified `users_id_auth_fkey` is now validated after approved orphan cleanup.
- Direct linked SQL checks confirmed:
  - RLS is enabled and policies exist on submissions, submission_answers, reactions, comments, public_exam_sets, public_exam_set_questions, public_exam_attempts, and public_exam_attempt_answers.
  - FK/supporting indexes exist for the new Phase 3-5 tables.
  - Submission/public-exam guard functions and triggers exist in the linked database.
  - `close-due-exams` is active in `cron.job` with a one-minute schedule.
- HTTP smoke checks:
  - `/` returns 200.
  - `/dashboard` redirects unauthenticated users to `/signin?callbackUrl=%2Fdashboard`.
  - `/auth/check-email` returns 200.
  - `/auth/error` returns 200.
  - `/api/health` returns 200.
  - invalid signup returns 400.
  - bootstrap without `ADMIN_SETUP_TOKEN` returns 503.
  - `/profile` redirects unauthenticated users to `/signin?callbackUrl=%2Fprofile`.
  - `/profile/edit` redirects unauthenticated users to `/signin?callbackUrl=%2Fprofile%2Fedit`.
  - `/student/profile` redirects unauthenticated users to sign-in.
  - `/student/profile/edit` redirects unauthenticated users to sign-in.
  - `/teacher/[id]` redirects unauthenticated users to sign-in.
  - `/groups` redirects unauthenticated users to sign-in.
  - `/student/groups` redirects unauthenticated users to sign-in.
  - `/join/[token]` redirects unauthenticated users to sign-in.
  - `/questions` redirects unauthenticated users to sign-in.
  - `/exams` redirects unauthenticated users to `/signin?callbackUrl=%2Fexams`.
  - `/posts` redirects unauthenticated users to sign-in.
  - `/student/exams` redirects unauthenticated users to sign-in.
  - `/student/progress` redirects unauthenticated users to sign-in.
  - `/student/practice` redirects unauthenticated users to sign-in.
  - `/student/feed` redirects unauthenticated users to sign-in.
  - `/student/public-exams` redirects unauthenticated users to sign-in.
  - `/student/exams/[id]` redirects unauthenticated users to sign-in.
  - `/student/exams/[id]/merit` redirects unauthenticated users to sign-in.
  - `/exams/[id]/merit` redirects unauthenticated users to sign-in.
  - `/public-sets` redirects unauthenticated users to sign-in.
  - `/admin/users` redirects unauthenticated users to sign-in.
  - unauthenticated sync-profile and role-promotion API calls return 401.
  - bootstrap without a valid setup token returns 401 or 503 depending local token configuration.
  - A teacher can create a question through `/questions`; a temporary verification question was deleted afterward.

## Note

The in-app browser successfully opened `/profile` during the profiles pass and confirmed the unauthenticated sign-in redirect without an application error. HTTP smoke checks were also used for protected profile routes.

Supabase type generation succeeded after CLI login and created `types/database.ts`. The linked Supabase database was later aligned with `users.bio` and `posts`, types were regenerated again, and RLS/policy verification succeeded after temporary Supabase pooler `ECIRCUITBREAKER` noise.

Supabase leaked-password protection could not be enabled on the current Free plan. Supabase requires Pro or higher for HaveIBeenPwned leaked-password checks.

Browser automation was not exposed as a callable tool during the Groups pass, so HTTP smoke checks were used for the new protected routes.

The Questions migration was applied with `supabase db query` and then marked applied with `supabase migration repair` because `supabase db push --linked` is still blocked by the older remote-only migration `20260522180510`. Supabase advisor and migration-list follow-up checks later hit the same temporary pooler `ECIRCUITBREAKER` authentication block seen in earlier work.

Question creation initially failed because the `public.questions` check constraints called private validation helpers that only `postgres` could execute. The follow-up grant migration was applied in Supabase Studio and marked in remote migration history after the CLI hit `ECIRCUITBREAKER`.

The Exams migration was applied with `supabase db query` and then marked applied with `supabase migration repair`, following the established workflow for this project. Migration list verification and type generation succeeded, and performance advisors reported no warnings. Later security advisor and direct verification queries hit the recurring Supabase pooler `ECIRCUITBREAKER` temporary authentication block.

The 2026-05-29 migrations were applied to the linked Supabase project with `npx.cmd supabase db query --linked --file ...` and marked applied with `npx.cmd supabase migration repair --linked --status applied 20260529091256 20260529091306 20260529091313`. `types/database.ts` was regenerated from the linked schema afterward. A post-repair `npx.cmd supabase migration list --linked` initially failed with temp-role auth failures followed by pooler `ECIRCUITBREAKER`, so retry loops were stopped per project rule. Later follow-up work fetched the remote `20260522180510` migration locally, verified `20260512180000` live effects, repaired history, and confirmed current migration history is aligned locally/remotely through `20260530083805`.

Live Auth/profile verification with `npm run verify:live-state` now confirms 4 Auth users, 4 profile rows, at least one Auth admin, no Auth users missing profiles, 0 orphan `public.users` profiles, `adminSetupTokenConfigured: false`, and no legacy duplicate env names in `.env.local`.

Supabase advisors run successfully with the installed CLI (`2.102.0`). The full linked advisor run after the database-time hardening migration reports only `auth_leaked_password_protection`; performance advisors previously reported no issues. After applying `20260530083805_database_time_and_post_length_hardening.sql`, migration list, linked DB lint, and linked advisors all succeeded. After applying `20260530032151_add_users_auth_fk_not_valid.sql`, direct SQL verified the FK exists, migration history was aligned, and linked types were regenerated with no content diff. Linked DB lint now works through the current CLI and reports no public-schema errors; local Docker/Supabase remains unavailable for local-only linting. After approved orphan cleanup, direct SQL verified the FK is validated and 0 orphan profiles remain. A later post-cleanup rerun confirmed linked migration list and linked DB lint are both successful again after the temporary pooler circuit breaker cleared.
