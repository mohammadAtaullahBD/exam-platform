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
- Vercel Speed Insights is installed and mounted in the root app layout.
- First-admin bootstrap and admin role-promotion APIs added.
- Current real Supabase Auth user was backfilled into `public.users`.
- Auth/profile migration SQL added under `supabase/migrations/`.
- Phase 1 profiles implemented:
  - `/profile` renders the signed-in teacher or student profile based on trusted role.
  - `/teacher/[id]` renders an authenticated teacher profile without any public post/feed section.
  - `/profile/edit` updates `public.users.name` and `public.users.bio` through a Server Action.
  - `/student/profile` and `/student/profile/edit` exist as student-specific companion routes because route groups cannot duplicate `/profile`.
- Linked Supabase database aligned for profiles:
  - `public.users.bio` exists.
  - `public.posts` still exists in the linked database as historical/live schema, but the post/feed product UI and feature code are removed.
  - RLS is enabled on `public.users` and `public.posts`.
  - Profile/post RLS policies were previously verified and duplicate legacy policies were simplified.
  - Supabase advisors previously reported no remaining profile/posts schema or RLS warnings.
  - `types/database.ts` was regenerated and still includes live-schema `users.bio` and `posts`.
- Hosted Supabase Auth config restored after local CLI defaults were detected:
  - Production site URL and auth callback redirect are restored.
  - Email confirmations, 8-digit email OTPs, and TOTP MFA are restored.
  - Minimum password length is now 8.
- Phase 2 groups implemented:
  - `public.groups` and `public.group_members` exist with invite tokens, FK indexes, timestamps, and RLS. Teacher-facing UI calls these private student batches while preserving the existing table names.
  - `public.group_members` now stores `roll_number` and optional `student_identity`; existing members were backfilled by join order and new members receive the next roll automatically.
  - `/batches` lists teacher batch cards, `/batches/new` creates an empty batch or a batch with optional initial existing students, and `/batches/[id]` shows batch details by default with icon-triggered edit/delete dialogs, invite-link copying, add-student dialog, and a row/column student grid with per-student edit/delete dialogs.
  - The old teacher `/groups` route redirects to `/batches` for compatibility.
  - `/student/groups` lists batches a student has joined.
  - `/join/[token]` lets students join a batch from an invite link through a Server Action.
  - `features/groups/` contains the group actions, queries, types, and components.
  - `types/database.ts` was regenerated and includes `groups` and `group_members`.
- Phase 2 questions implemented:
  - `public.questions` exists with teacher/admin source tracking, JSONB answer options, answer validation, timestamps, FK indexes, and RLS.
  - `public.question_sets` and `public.question_set_questions` exist with teacher-owned set titles/descriptions, ordered question items, typed metadata, FK indexes, and RLS.
  - `/questions` lets teachers create, edit, delete, search, and import Google-Forms-like question sets instead of standalone single questions.
  - `features/questions/` contains the question actions, queries, types, and components.
  - `types/database.ts` was regenerated and includes `questions`, `question_sets`, and `question_set_questions`.
  - Follow-up migration `20260524171724_grant_question_validation_helpers.sql` grants authenticated users the private validation helper access needed for question inserts.
- Active question-set UI slice implemented:
  - `/questions` now renders the questions management/search screen, `/questions/new` renders question creation, and `/questions/[id]` renders editing.
  - `/questions` filters question collections by own, public, or all; own is selected by default. Own collections can be edited, deleted, or copied into a new editable set, while public collections can be copied as the teacher's own editable questions. Copy actions open the new `/questions/[id]` editor immediately so teachers can edit, add, or delete copied questions.
  - The builder supports set title/description, question add/remove/duplicate/drag-reorder, short answer, paragraph, multiple choice, checkboxes, dropdown, linear scale, rating, one-option defaults, answer keys, required toggles, shuffle-option-order settings, points, and scale/rating settings.
  - Builder actions use icon buttons for common tasks, question descriptions are hidden until toggled from the three-dot menu, option questions use a correct-answer dropdown, and focused text fields reveal visual bold, italic, underline, link, and clear-format toolbar actions.
  - The three-dot menu uses checked toggle items and closes on outside click; the builder also has a separate top bar with navigation plus icon-only undo, redo, preview, and theme controls.
  - The creator now uses the site default color scheme first, while optional themes pair a primary color with a background color.
  - Rich-text fields now initialize and sync their hidden form values reliably, so placeholders show, duplicate copies question text/description, and failed validations do not silently erase the draft.
  - Optional scale/rating form fields no longer invalidate multiple-choice submissions when those controls are not rendered.
  - The old public-set import card was removed; public question collections are now listed through the source filter and copied from their card action.
  - The drag UI no longer mixes conflicting border shorthand/non-shorthand styles, avoiding the React style warning during reorder rendering.
  - Paragraph questions can be ungraded or manually graded; manual paragraph answers are stored as ungraded responses until the teacher scores them after exam close.
- Phase 2 exams implemented:
  - `public.exams` and `public.exam_questions` exist with FK indexes, timestamps, RLS, and database-derived scheduled/active/closed state.
  - Exam questions store snapshots of selected question content, type, description, options, settings, answer key, required flag, and points.
  - A `pg_cron` job named `close-due-exams` calls `private.close_due_exams()` every minute to stamp ended exams with `closed_at`.
  - `/exams` now renders a questions-style workspace: teachers open a modal to create exams, choose a student batch, schedule start/end times, search My/Public question sets, preserve current scheduled-exam snapshots while editing, and view recent exams as cards. New exams default the question source filter to My Questions.
  - Exam creation/editing expands selected teacher-owned question sets and published public sets into ordered immutable `exam_questions` snapshots on the server.
  - `/exams/[id]` is the dedicated teacher statistics/results screen with all student rows for the exam.
  - Teachers can fully edit scheduled exams. Active exams can be postponed or extended while batch and questions remain locked. Closed exams remain statistics/result surfaces.
  - Scheduled/active exam deletion asks for confirmation and server-side deletion is refused after any student submission exists.
  - Question builder and exam modal surfaces warn before discarding unsaved teacher work.
  - The exam detail route derives teacher statistics from existing memberships/submissions: taken count, absent count, average score, max points, ungraded manual answers, and per-student results with roll/custom identity labels where available.
  - `features/exams/` contains exam actions, queries, types, and components.
  - `types/database.ts` was regenerated and includes `exams` and `exam_questions`.
- Phase 3 student core implemented:
  - `public.submissions` and `public.submission_answers` are defined in migration SQL with FK indexes, RLS, one-submission-per-student enforcement, and active-window insert trigger.
  - `/student/exams` lists upcoming and active joined-group exams.
  - `/student/exams/[id]` opens active exams, renders all questions, shows a countdown, and submits scored answers through a Server Action.
  - `/student/exams/[id]/merit` and `/exams/[id]/merit` show rankings after close.
  - `/student/progress` shows previous closed exam scores and merit position.
  - `/student/practice` lets students retry questions they previously answered incorrectly without creating scores or merit entries.
  - Teachers can manually grade paragraph answers from `/exams/[id]/merit` after exam close, and submission point totals are refreshed after each saved grade.
- Phase 4 social retired from active product UI:
  - The live database still contains historical `public.posts`, `public.reactions`, and `public.comments` tables.
  - `/posts`, `/student/feed`, and the post/comment/reaction feature slices have been removed from the app.
  - Teacher profiles and dashboards no longer render or link to post/feed surfaces.
- Phase 5 public exams implemented:
  - `public.public_exam_sets`, `public.public_exam_set_questions`, `public.public_exam_attempts`, and `public.public_exam_attempt_answers` are defined in migration SQL with FK indexes and RLS.
  - Hidden `/public-sets` lets the super-user create published or draft public sets.
  - `/student/public-exams` lets students take published public sets at any time and stores personal scores only.
  - `/questions` lets teachers copy published public set questions into their own question bank with `original_id` preserved.
- Dashboard navigation now links role-appropriate teacher/student workspaces while keeping hidden super-user routes unlinked, and it no longer links to posts/feed.
- `/dashboard` now renders a richer teacher workspace with batch, student-membership, question, exam, next/active exam, and recent-exam context plus a default-system theme toggle.
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
- `npm run smoke:routes` against a local production server, currently covering 25 protected routes after removing `/posts` and `/student/feed`.
- `npx tsc --noEmit --incremental false`
- `npx.cmd supabase db lint --linked --schema public --level warning --fail-on none --output-format json`
- `npx.cmd supabase migration list --linked`
- `npx.cmd supabase db advisors --linked --level warn --fail-on none --output-format json`
- `npx.cmd supabase gen types typescript --linked --schema public` regenerated types through a temp file before the latest batch-member migration; after `20260602014148`, linked type generation timed out during pooler instability and should be rerun.
- `20260531141254_google_form_question_sets.sql` was applied to the linked Supabase project and marked applied in migration history.
- `20260601150149_allow_manual_paragraph_grading.sql`, `20260601153705_grant_question_validation_to_service_role.sql`, and `20260601160118_allow_single_choice_option.sql` were applied to the linked Supabase project and marked applied in migration history.
- `types/database.ts` was regenerated from the linked schema after the question-set migration.
- After the question-set migration, linked migration list and linked DB lint passed, and `npm run smoke:live-workflows` passed with 47 checks.
- After the manual paragraph grading and single-choice-option migrations, linked migration list and linked DB lint passed, `npm run check` passed, `npm run smoke:static` passed, `npm run smoke:routes` passed against local production, `npm run smoke:live-workflows` passed with 47 checks, and linked Supabase advisors reported only `auth_leaked_password_protection`.
- After `20260602014148_batch_member_identity.sql`, migration repair succeeded and linked advisors still reported only the known `auth_leaked_password_protection` warning. Post-apply linked migration-list and DB-lint checks hit Supabase pooler `ECIRCUITBREAKER`, and linked type generation timed out during the same instability; rerun those after the pooler clears.
- Authenticated local question UI smoke with a temporary teacher session rendered management, `/questions/new`, `/questions/[id]`, one-option defaults, shuffle settings, and edit/manual paragraph views, then cleaned up temporary fixtures.
- Authenticated local question UI smoke also passed with the project owner's provided teacher account.
- Live teacher-account save verification created a temporary rich-text one-option question set with shuffle enabled, read it back, and cleaned it up successfully.
- Browser-level verification with the teacher account reproduced the reported two-question create failure, then passed after the fix: placeholders visible, duplicate copied question and description, both questions stayed `multiple_choice`, create succeeded, Supabase readback found both rows, and cleanup deleted the temporary set.
- Live Supabase copy smoke verified that teacher-owned question sets with null `original_question_id` values can be copied into a new editable question set and cleaned up afterward.
- A focused diagnostic against the real `Test2` question set copied all 3 questions successfully after restarting the stale local `next start -p 3000` process that had been serving the old action bundle.
- `npm run smoke:routes` now covers `/batches`, `/batches/new`, and `/batches/[id]`; unauthenticated route checks passed for 27 protected routes, and `/groups` redirects to `/batches`.
- Live Supabase batch smoke verified temporary batch create, add existing student, roll auto-assignment, member identity update, member removal, and cleanup.
- Authenticated Chrome UI verification covered `/batches` card/list access, `/batches/new` empty batch creation, redirect to `/batches/[id]`, student add/update/remove, batch delete, and live database cleanup.
- Authenticated Chrome UI verification for `/batches/02b52da4-dd79-4036-ab51-30507a91f38b` confirmed the detail page is read-only by default, the batch edit/delete dialogs open correctly, the delete warning offers Delete and Cancel, and student rows expose edit/delete modal actions.
- When a later local browser view still showed the older form-style page, the issue was traced to `next start` serving a stale `.next` bundle on port 3000; the app was rebuilt and the production server was restarted so `/batches/[id]` serves the current read-only detail implementation.
- `npm run smoke:routes` now covers `/questions/new`, `/questions/[id]`, and `/exams/[id]`, increasing protected-route coverage to 25 routes.
- After the dashboard/profile refresh, production build route output confirms `/posts` and `/student/feed` are no longer compiled app routes.
- A later linked Supabase advisor run completed with only the known `auth_leaked_password_protection` warning.
- Vercel successfully built commit `8024da2` as a Preview deployment, that deployment was promoted to Production, and `npm run smoke:routes` passed against `https://exam.ataullah.dev`.
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
  - `/batches` redirects unauthenticated users to sign-in.
  - `/batches/new` redirects unauthenticated users to sign-in.
  - `/batches/[id]` redirects unauthenticated users to sign-in.
  - `/groups` redirects to `/batches`.
  - `/student/groups` redirects unauthenticated users to sign-in.
  - `/join/[token]` redirects unauthenticated users to sign-in.
  - `/questions` redirects unauthenticated users to sign-in.
  - `/exams` redirects unauthenticated users to `/signin?callbackUrl=%2Fexams`.
  - `/student/exams` redirects unauthenticated users to sign-in.
  - `/student/progress` redirects unauthenticated users to sign-in.
  - `/student/practice` redirects unauthenticated users to sign-in.
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

After applying `20260531141254_google_form_question_sets.sql`, linked migration list and linked DB lint succeeded. A later Supabase advisor run succeeded with only the known leaked-password-protection warning. A final post-verification `supabase migration list --linked` rerun hit pooler `ECIRCUITBREAKER`; retry loops were stopped per project rule, and linked migration list/DB lint should be rerun after the pooler clears.

After applying `20260601150149_allow_manual_paragraph_grading.sql`, `20260601153705_grant_question_validation_to_service_role.sql`, and `20260601160118_allow_single_choice_option.sql`, linked migration list and linked DB lint succeeded. Linked advisors still report only the known leaked-password-protection warning.
