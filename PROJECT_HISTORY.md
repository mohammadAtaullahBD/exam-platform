# Project History

This file tracks the evolution of the Exam Platform, serving as a shared memory for all AI agents and developers.

## 2026-06-01: Google-Forms-Style Question Sets and Speed Insights Redeploy (Codex)

### [+] Features
- Replaced the teacher `/questions` page with a Google-Forms-like question-set workspace.
- Added question-set server actions, queries, validation, and client draft builder components under `features/questions/`.
- Added create/edit/delete set flows, question add/remove/duplicate/move controls, type selector, option editor, answer key, required toggle, points, scale/rating settings, and save actions.
- Added support for short answer, paragraph, multiple choice, checkboxes, dropdown, linear scale, and rating question items. File upload remains intentionally unsupported.
- Adapted public-set import to create a teacher-owned question set from a published public set.
- Added migration `20260531141254_google_form_question_sets.sql` with `public.question_sets`, `public.question_set_questions`, typed question metadata, typed exam/public-set snapshots, JSON answer payloads, and point fields.
- Updated group exam and public exam rendering/scoring for the new question types. Paragraph questions are stored as responses but are unscored until a manual grading workflow exists.
- Confirmed `@vercel/speed-insights` remains installed and `<SpeedInsights />` remains mounted in the root layout for the next Vercel deployment.

### [x] Successes
- Applied `20260531141254_google_form_question_sets.sql` to the linked Supabase project and marked it applied in migration history.
- Regenerated `types/database.ts` from the linked schema with the new question-set and typed-answer fields.
- Kept user mutations in server actions while client components only manage draft interactivity.
- Preserved the restrained Tailwind visual language with full-width builder/list sections and white cards.
- Re-ran `npm run check`; lint, typecheck, and production build passed.
- Re-ran `npm run smoke:static`; static security/schema checks passed.
- Re-ran `npm run smoke:live-workflows`; 47 live workflow checks passed and cleanup completed.
- Re-ran `npm run verify:live-state`; Auth/profile state remains clean with 0 orphan profiles and `adminSetupTokenConfigured: false`.
- Re-ran `npm run smoke:routes` against a local production server; 22 protected-route checks passed.
- Re-ran linked Supabase DB lint; no public-schema errors were found.
- Re-ran linked Supabase advisors during the release pass; the only warning remains project-level `auth_leaked_password_protection`.
- Verified local/remote migration history is aligned through `20260531141254`.

### [!] Failures/Blockers
- A final post-verification `supabase migration list --linked` rerun hit Supabase pooler `ECIRCUITBREAKER`. Per project rule, retries were stopped. The most recent linked migration-list and DB-lint checks before the release pass were clean and aligned through `20260531141254`.
- Browser screenshot automation was not available in this session, so visual verification was limited to build/render checks and route smoke.

### [>] Next Steps
- Re-run linked Supabase migration list and DB lint after the pooler circuit breaker clears.
- Do an authenticated browser pass on `/questions` with a real teacher session after deployment.

## 2026-05-31: Vercel Speed Insights (Codex)

### [+] Features
- Installed `@vercel/speed-insights`.
- Added the Next.js `<SpeedInsights />` component to the root app layout so production deployments can collect Speed Insights metrics.

### [x] Successes
- Verified against Vercel's current Speed Insights package guidance for Next.js.
- Re-ran `npm run check`; lint, typecheck, and production build passed.
- Re-ran `npm run smoke:static`; static role/security/admin-hidden checks passed.

### [>] Next Steps
- Push to GitHub, wait for Vercel Preview, promote to Production, then visit the production site to start collecting data.

## 2026-05-31: Production Deployment Verification (Codex)

### [x] Successes
- Verified Vercel CLI access as the project owner account and linked the local workspace to the existing `exam-platform` Vercel project.
- Confirmed Vercel project settings use the Next.js framework preset, `npm install`, and `npm run vercel-build`.
- Cleaned Vercel project environment variables so only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_KEY` remain for Production/Preview.
- Pushed `codex/complete-remaining-platform` to GitHub, triggering an automatic Vercel Preview deployment.
- Promoted the ready Preview deployment to Production.
- Verified the production domain `https://exam.ataullah.dev` responds and re-ran `npm run smoke:routes` against it; all 22 protected-route checks passed.

### [!] Failures/Blockers
- The branch Preview deployment is protected by Vercel Preview Deployment Protection and returns `401` to unauthenticated smoke tests; production smoke testing succeeded on the public custom domain.

### [>] Next Steps
- For future releases, push a branch to GitHub, wait for the Vercel Preview deployment, then merge/promote to Production and run `SMOKE_BASE_URL=https://exam.ataullah.dev npm run smoke:routes`.

## 2026-05-30: Final Blocker Clearance (Codex)

### [x] Successes
- Re-read the mandatory project context and Supabase skill before clearing the remaining blockers.
- Re-ran `npx.cmd supabase migration list --linked`; local and remote migration history are aligned through `20260530083805`.
- Re-ran `npx.cmd supabase db lint --linked --schema public --level warning --fail-on none --output-format json`; no public-schema errors were found.
- Removed `ADMIN_SETUP_TOKEN` from local `.env.local` without printing or committing its value.
- Removed legacy local duplicate env names from `.env.local`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`.
- Re-ran `npm run verify:live-state`; it reports 4 Auth users, 4 profile rows, 0 orphan profiles, no Auth users missing profiles, `adminSetupTokenConfigured: false`, and no legacy duplicate env vars.
- Re-ran Supabase advisors; the only warning remains project-level `auth_leaked_password_protection`.
- Re-ran `npm run smoke:static`, `npm run check`, and `npm run smoke:routes`; all passed.

### [!] Failures/Blockers
- No implementation or cleanup blockers remain. Supabase leaked-password protection remains an optional project-plan/security setting that requires enabling in Supabase Auth settings/plan support.

### [>] Next Steps
- Optionally enable Supabase leaked-password protection if the project plan supports it.

## 2026-05-30: Approved Orphan Profile Cleanup (Codex)

### [x] Successes
- Re-read the mandatory agent context, project memory, and Supabase skill before touching live data.
- Confirmed the project owner approved the recommended archive-then-delete cleanup path.
- Generated a one-use approved SQL file from `scripts/archive-orphan-profiles-and-validate-fk.sql.template` outside the repo and deleted it after execution.
- Archived the 4 isolated legacy `public.users` rows into `private.archived_user_profiles`.
- Deleted only `public.users` rows without a matching `auth.users` row.
- Validated `public.users.users_id_auth_fkey`.
- Postflight `npm run verify:live-state` now reports 4 Auth users, 4 profile rows, `orphanProfileCount: 0`, `authUsersMissingProfileCount: 0`, and `firstAdminExists: true`.
- Direct linked SQL confirmed `users_id_auth_fkey` is validated, 4 archived profile rows exist, and 0 orphan profiles remain.
- Re-ran Supabase advisors successfully; the only warning remains project-level `auth_leaked_password_protection`.
- Re-ran `npm run smoke:static`, `npm run check`, and `npm run smoke:routes`; all passed.

### [!] Failures/Blockers
- A post-cleanup `npx.cmd supabase migration list --linked` rerun hit the Supabase pooler `ECIRCUITBREAKER`; retry loops were stopped per project rule.
- Linked DB lint could not be rerun after cleanup because the pooler circuit breaker was active. The most recent pre-cleanup linked DB lint was clean, and the cleanup did not add public schema objects.
- `ADMIN_SETUP_TOKEN` is still configured locally and should be removed or rotated in local/deployment environments after confirming no more bootstrap operations are needed.

### [>] Next Steps
- Re-run linked migration list and linked DB lint after the Supabase pooler circuit breaker clears.
- Remove or rotate `ADMIN_SETUP_TOKEN` outside committed source control.

## 2026-05-30: Completion Audit Refresh (Codex)

### [x] Successes
- Re-read `AGENTS.md`, `AGENT_RULES.md`, all files in `project-memory/`, `PROJECT_HISTORY.md`, and the local Supabase skill before continuing the active completion goal.
- Spawned read-only subagent audits for Track A cleanup, Tracks B-D implementation, and Track E verification/hardening.
- Track A audit confirmed immediate setup, auth/profile migration history, hosted redirect evidence, first-admin verification, Phase 1 profile completion, Supabase advisors, Exams RLS, and `close-due-exams` cron evidence remain satisfied.
- Tracks B-D audit found no blocking implementation gaps in student exam-taking/merit/progress/practice, social posts/reactions/comments, or public exam set/student/teacher customization workflows.
- Re-ran `npm run smoke:static`; static signup/admin-hidden/client-secret/trusted-role checks passed.
- Re-ran `npm run check`; lint, typecheck, and production build passed.
- Re-ran `npm run smoke:routes` against a local production server; 22 protected routes redirected as expected.
- Re-ran `npm run verify:live-state`; the live project still has 4 dependency-free orphan profile rows, `smokeOrphanProfileCount: 0`, no Auth users missing profiles, and at least one trusted Auth admin.
- Re-ran `npx.cmd supabase migration list --linked`; local and remote migration history are aligned through `20260530083805`.
- Re-ran linked Supabase DB lint; no public-schema errors were found.
- Re-ran linked Supabase advisors; the only warning remains project-level `auth_leaked_password_protection`.

### [!] Failures/Blockers
- Live orphan cleanup and `users_id_auth_fkey` validation still require explicit project-owner approval because they mutate live profile data.
- `ADMIN_SETUP_TOKEN` is still configured locally and should be removed or rotated after confirming no future bootstrap is needed.

### [>] Next Steps
- After explicit approval, archive then delete the 4 isolated legacy profile rows using the fail-closed cleanup template and validate `users_id_auth_fkey`.
- Re-run `npm run verify:live-state`, linked DB lint, linked advisors, and direct FK validation after cleanup.

## 2026-05-30: Database-Time Hardening and Smoke Cleanup Verification (Codex)

### [+] Tooling & Schema
- Added migration `20260530083805_database_time_and_post_length_hardening.sql`.
- Added `public.database_now()` so server-side exam/progress/practice visibility can use database time instead of the Node.js process clock.
- Added a `posts_content_length` database check to match the existing 2000-character post validation.
- Expanded `scripts/smoke-routes.mjs` to cover `/profile/edit`, `/student/profile`, `/student/profile/edit`, and `/teacher/[id]`.
- Hardened `scripts/smoke-live-workflows.mjs` so temporary profile cleanup is re-run after Auth-user deletion and verified before reporting success.
- Extended `scripts/verify-live-state.mjs` with an aggregate `smokeOrphanProfileCount` without printing profile emails or names.
- Corrected the architecture memory tree to reflect current `lib/roles.ts` and `lib/supabase/database-time.ts` helpers.

### [x] Successes
- Ran parallel subagent audits for Phase 3 student core, Phase 4 social, Phase 5 public exams/admin, and Track E test/schema hardening.
- Applied `20260530083805_database_time_and_post_length_hardening.sql` to the linked Supabase project.
- Marked `20260530083805` applied in linked migration history and verified `npx.cmd supabase migration list --linked` shows local/remote alignment.
- Regenerated `types/database.ts`; it now includes `Functions.database_now`.
- Re-ran `npm run check`; lint, typecheck, and production build passed.
- Re-ran `npm run smoke:static`; static security/admin-hidden checks passed.
- Re-ran `npm run smoke:live-workflows`; all 45 live workflow checks passed and cleanup completed.
- Re-ran `npm run verify:live-state` sequentially after live smoke; it returned to the 4-orphan baseline with `smokeOrphanProfileCount: 0`.
- Re-ran `npx.cmd supabase db lint --linked --schema public --level warning --fail-on none --output-format json`; no schema errors were found.
- Re-ran `npm run smoke:routes` against a local production server; 22 protected routes redirected as expected.
- `git diff --check` passed with only line-ending warnings.

### [!] Failures/Blockers
- Live orphan cleanup and `users_id_auth_fkey` validation still require explicit project-owner approval.

### [>] Next Steps
- After explicit approval, use the fail-closed orphan cleanup template to archive/delete the 4 isolated legacy profiles and validate `users_id_auth_fkey`.

## 2026-05-30: Advisor Recheck After Pooler Recovery (Codex)

### [x] Successes
- Re-ran `npx.cmd supabase db advisors --linked --level warn --fail-on none --output-format json` after the earlier pooler `ECIRCUITBREAKER`; it completed successfully.
- The only advisor warning remains the project-level `auth_leaked_password_protection` setting.

### [!] Failures/Blockers
- Live orphan cleanup and `users_id_auth_fkey` validation still require explicit project-owner approval.

### [>] Next Steps
- After explicit approval, use the fail-closed orphan cleanup template to archive/delete the 4 isolated legacy profiles and validate `users_id_auth_fkey`.

## 2026-05-30: Orphan Profile Cleanup Playbook (Codex)

### [+] Tooling & Operations
- Added `scripts/archive-orphan-profiles-and-validate-fk.sql.template`, a fail-closed SQL template for the remaining live-data cleanup: archive orphan `public.users` rows into `private.archived_user_profiles`, delete the archived orphan rows, and validate `users_id_auth_fkey` in one transaction.

### [x] Successes
- Re-read the mandatory agent context and project memory before making the follow-up change.
- Used a sidecar subagent audit to confirm no existing cleanup playbook was present and that a fail-closed SQL template best fits the repository conventions.
- Verified the installed Supabase CLI is `2.102.0`.
- Verified current CLI behavior for `supabase db lint`; linked lint is now supported.
- Ran `npx.cmd supabase db lint --linked --schema public --level warning --fail-on none --output-format json`; it completed with no schema errors.
- Re-ran `npx.cmd supabase db advisors --linked --level warn --fail-on none --output-format json`; the only warning is still the project-level `auth_leaked_password_protection`.
- Ran `npm run verify:live-state`; the 4 orphan profiles remain isolated with zero direct dependent rows, and no Auth users are missing profiles.

### [!] Failures/Blockers
- Live orphan cleanup and FK validation were not executed because deleting or archiving live profile rows still requires explicit project-owner approval.

### [>] Next Steps
- After explicit approval, prepare a reviewed runnable SQL file from the template, remove the fail-closed guard, run it through `npx.cmd supabase db query --linked --file ...`, then re-run `npm run verify:live-state`, linked DB lint, and advisors.

## 2026-05-30: Authenticated Smoke Coverage and Auth FK Follow-up (Codex)

### [+] Tooling & Schema
- Added `scripts/smoke-live-workflows.mjs` and `npm run smoke:live-workflows` for an opt-in live Supabase workflow smoke using temporary Auth/database fixtures with cleanup.
- Added `scripts/smoke-static-invariants.mjs` and `npm run smoke:static` for static architecture/security invariants.
- Expanded `scripts/smoke-routes.mjs` to cover more protected dynamic routes and unauthenticated API gates.
- Added migration `20260530032151_add_users_auth_fk_not_valid.sql` to add the intended `public.users(id) -> auth.users(id)` FK as `NOT VALID`.
- Fetched remote migration `20260522180510_fix_auth_profile_sync.sql` into local migration history.
- Added hidden `/admin/users` role-management UI over Supabase Auth users.

### [x] Successes
- `npm run smoke:live-workflows` passed with 45 checks covering role gating, group exam creation/visibility, active submission, expired submission rejection, merit after close, progress/practice reads, social permissions, admin-only public sets, public exam scoring reads, and teacher public-set import preserving `original_id`.
- `npm run verify:live-state` after the live workflow smoke returned to the baseline 4 Auth users / 8 profile rows, confirming temporary smoke fixtures were cleaned up.
- `npm run verify:live-state` now reports orphan profile roles and dependency counts; the 4 orphan profiles currently have zero direct dependencies in groups, posts, questions, submissions, public exam sets/attempts, reactions, comments, or group memberships.
- `npm run smoke:static` passed, confirming public signup excludes admin, hidden super-user routes are not linked from public/dashboard UI, client components do not reference service secrets/admin clients, and authorization avoids user-editable role metadata.
- Expanded `npm run smoke:routes` passed against a local production server with 17 protected routes plus public/auth/API checks.
- Applied `20260530032151_add_users_auth_fk_not_valid.sql` to the linked Supabase project with `npx.cmd supabase db query --linked --file ...`.
- Marked `20260530032151` as applied in linked migration history with `npx.cmd supabase migration repair --linked --status applied`.
- Direct linked SQL verified `users_id_auth_fkey` now exists and is intentionally unvalidated while 4 legacy orphan profiles remain.
- Verified the live auth/profile schema has the intended `20260512180000` effects, then marked `20260512180000` applied in linked migration history.
- Verified `npx.cmd supabase migration list --linked` now shows all local and remote migrations aligned.
- Re-ran Supabase advisors; the only remaining warning is the project-level `auth_leaked_password_protection`.
- Regenerated linked Supabase types safely through a temp file; `types/database.ts` had no content diff because the new migration only adds an FK.
- `npm run typecheck`, `npm run lint`, and `npm run smoke:static` passed after adding the hidden user-management UI.
- Added `scripts/verify-auth-redirects.mjs` and verified hosted Supabase Auth accepts both `https://exam.ataullah.dev/auth/callback` and `http://localhost:3000/auth/callback`; both temporary Auth users were deleted afterward.

### [!] Failures/Blockers
- The new auth FK cannot be validated until the 4 orphan `public.users` rows are archived or deleted.
- Local Supabase database linting still cannot run because no local database is listening on `127.0.0.1:54322`.

### [>] Next Steps
- Archive or delete the 4 isolated orphan profiles after explicit approval, then validate `users_id_auth_fkey`.

## 2026-05-29: Live Supabase Verification Follow-up (Codex)

### [+] Tooling
- Added `scripts/verify-live-state.mjs` and `npm run verify:live-state` for aggregate Auth/profile checks without printing secrets.

### [x] Successes
- Verified `npx.cmd supabase migration list --linked` now completes after the earlier pooler instability.
- Confirmed the three 2026-05-29 migrations are aligned locally/remotely in migration history: `20260529091256`, `20260529091306`, and `20260529091313`.
- Verified the previously known older migration-history mismatch still exists: local-only `20260512180000` and remote-only `20260522180510`.
- Verified the first-admin/bootstrap state through the Auth Admin API: at least one Auth user has trusted `app_metadata.role = admin`.
- Verified all Auth users currently have matching `public.users` profiles.
- Verified the new public tables have RLS enabled and policies present: submissions, submission_answers, reactions, comments, public_exam_sets, public_exam_set_questions, public_exam_attempts, and public_exam_attempt_answers.
- Verified FK/supporting indexes exist for the new tables.
- Verified private helper functions and insert guard triggers exist for submissions and public exam attempts.
- Verified the `close-due-exams` cron job is active on the linked Supabase project with a one-minute schedule.
- Re-ran Supabase advisors successfully:
  - Security advisor reports only `auth_leaked_password_protection` as a project-level warning.
  - Performance advisor reports no issues.

### [!] Failures/Blockers
- `npm run verify:live-state` found 4 `public.users` profiles without matching Auth users. These are likely legacy/seed rows and should be archived or deleted only after checking dependent data.
- `.env.local` still contains legacy duplicate names: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`. The secret-bearing file was not edited.
- `ADMIN_SETUP_TOKEN` is still configured locally. Rotate or remove it from local/deployment environments after confirming no further bootstrap is needed.
- Authenticated end-to-end role, submission, social, and public-exam workflows were not run because real test sessions were not provided.

### [>] Next Steps
- Decide whether to archive or delete the 4 orphan `public.users` rows after checking for dependent data.
- Confirm hosted Auth redirect URLs directly in the Supabase dashboard if deployment verification is needed.
- Upgrade Supabase to Pro or higher if leaked-password protection is required.
- Run authenticated E2E checks with real student, teacher, and super-user sessions.

## 2026-05-29: Remaining Platform Tracks B-E (Codex Orchestrator)

### [+] Features & Improvements
- Added migration `20260529091256_student_submissions.sql` for group exam submissions and answer snapshots.
- Added migration `20260529091306_social_reactions_comments.sql` for post reactions and comments.
- Added migration `20260529091313_public_exam_sets.sql` for public exam sets, set questions, attempts, and attempt answers.
- Added student exam routes at `/student/exams`, `/student/exams/[id]`, and `/student/exams/[id]/merit`.
- Added teacher merit route at `/exams/[id]/merit`.
- Added student progress and practice routes at `/student/progress` and `/student/practice`.
- Added teacher posts route `/posts` and student feed route `/student/feed`.
- Added hidden super-user public sets route `/public-sets`.
- Added student public exams route `/student/public-exams`.
- Added teacher public set import on `/questions`, preserving `original_id` on copied questions.
- Added `npm run smoke:routes` for unauthenticated protected-route and invalid admin-signup smoke checks.
- Updated dashboard navigation for teacher and student workspaces while keeping hidden super-user routes unlinked.
- Regenerated `types/database.ts` from the linked Supabase schema after applying the 2026-05-29 migrations.

### [x] Successes
- Subagent B implemented student exam-taking, merit, progress, and practice.
- Subagent C implemented posts, reactions, comments, and student feed.
- Subagent D implemented public sets, public exams, and teacher public-set import.
- Subagent E audited the verification surface and identified missing smoke-test coverage.
- Tightened `submission_answers` RLS so group members can see closed-exam submission summaries for merit without seeing other students' raw answers.
- Verified `npm run lint` passes.
- Verified `npm run typecheck` passes.
- Verified `npm run build` passes with network access for Next font fetching.
- Verified `npm run check` passes with network access for Next font fetching.
- Verified `npm run smoke:routes` passes against a local production server: 13 protected routes redirect and invalid admin signup returns 400.
- Applied the three 2026-05-29 migrations to the linked Supabase project with `npx.cmd supabase db query --linked --file ...`.
- Marked the three 2026-05-29 migrations as applied in linked migration history with `npx.cmd supabase migration repair --linked --status applied`.
- Regenerated linked Supabase types with `npx.cmd supabase gen types typescript --linked --schema public`.

### [!] Failures/Blockers
- Earlier post-apply `npx.cmd supabase migration list --linked` verification failed with Supabase temp-role auth failures followed by pooler `ECIRCUITBREAKER`; a later follow-up run succeeded and is documented above.
- Earlier `npx.cmd supabase db advisors --linked --output json` timed out during pooler instability; later follow-up advisor runs succeeded and are documented above.
- `npx.cmd supabase db lint --local --schema public --level warning` could not run because no local Supabase database is listening on `127.0.0.1:54322`.
- Authenticated end-to-end role, submission, social, and public-exam workflows were not run because test sessions were not provided.

### [>] Next Steps
- Run authenticated E2E checks with real student, teacher, and super-user sessions.

## 2026-05-29: Track A Cleanup and Verification (Codex)

### [+] Documentation & Config
- Marked Phase 1 Profiles complete in `project-memory/pending-tasks.md`.
- Converted stale Immediate Setup items into an honest status matrix with live-only blockers called out.
- Removed duplicate `SUPABASE_URL` and `SUPABASE_ANON_KEY` requirements from README/deployment docs.
- Added local `http://localhost:3000/auth/callback` to `supabase/config.toml`.
- Disabled the missing local seed file reference in `supabase/config.toml`.

### [x] Successes
- Confirmed Phase 1 Profiles are implemented through `/profile`, `/profile/edit`, `/teacher/[id]`, `/student/profile`, and `/student/profile/edit`.
- Confirmed generated database types include `public.users.bio` and `public.posts`.
- Ran Supabase security advisors with `npx supabase db advisors --linked --output json`; the only warning returned was the existing leaked-password protection warning.

### [!] Failures/Blockers
- `npx supabase migration list --linked` timed out, so remote migration-history alignment still needs follow-up.
- First-admin existence, hosted Auth redirect URLs, and legacy seed-user cleanup require live Supabase/Auth checks.
- `.env.local` still contains legacy variable names, but secret-bearing local env files were not edited.

### [>] Next Steps
- Re-run remote migration list and direct SQL verification after Supabase CLI connectivity is stable.
- Confirm first-admin state through the Auth Admin API without exposing secrets, then remove or rotate `ADMIN_SETUP_TOKEN`.
- Run a live orphan check for `public.users` rows without matching `auth.users` rows before deleting or archiving legacy seed users.

## 2026-05-27: Phase 2 Item 5 Exams (Codex)

### [+] Features & Improvements
- Added migration `20260527173105_exams.sql`.
- Added `public.exams` and `public.exam_questions` with database-derived scheduled/active/closed state.
- Added question snapshots on `exam_questions` so assembled exams stay stable after later question-bank edits.
- Added RLS policies for teacher-managed exams, group-member reads, and scheduled-only teacher mutations.
- Added `private.close_due_exams()` plus a `pg_cron` job named `close-due-exams`.
- Added teacher `/exams` page for creating exams from groups/questions and listing scheduled, active, and closed exams.
- Added `features/exams/` with actions, queries, types, and components.
- Added Zod validation in `lib/validations/exam.ts`.
- Updated the dashboard to link teachers to Exams.
- Regenerated `types/database.ts` from the linked Supabase schema.

### [x] Successes
- Applied the Exams migration to the linked Supabase project through `supabase db query`.
- Marked migration `20260527173105` as applied in remote migration history.
- Verified remote migration list shows the Exams migration aligned locally and remotely.
- Verified `npm run check` passes.
- Smoke-checked `/exams` locally in the in-app browser:
  - `/exams` redirects unauthenticated users to `/signin?callbackUrl=%2Fexams`.

### [!] Failures/Blockers
- Follow-up remote RLS/cron verification queries and the security advisor were blocked by the Supabase pooler `ECIRCUITBREAKER` temporary authentication block after the migration, migration-list check, type generation, and performance advisor succeeded.
- Supabase performance advisors reported no warnings for the new schema before the pooler block.

### [>] Next Steps
- Re-run Supabase security advisors and direct verification queries after the pooler circuit breaker clears.
- Move forward with Phase 3, item 6: exam-taking.

## 2026-05-24: Questions Create Permission Fix (Codex)

### [+] Features & Improvements
- Added migration `20260524171724_grant_question_validation_helpers.sql`.
- Added server-side logging for question mutation failures so future database errors are diagnosable from local logs.

### [x] Successes
- Fixed teacher question creation by granting authenticated users access to the private validation helper functions used by `public.questions` check constraints.
- Applied the grant SQL in Supabase Studio because CLI connections were temporarily blocked by the Supabase pooler circuit breaker.
- Marked migration `20260524171724` as applied in remote migration history.
- Verified the real `/questions` form creates a question successfully in Chrome.
- Deleted the temporary verification question afterward, returning the question bank to 0 test rows.

### [!] Failures/Blockers
- `npx supabase db query --linked` still hit `ECIRCUITBREAKER` during the first apply attempt, so Supabase Studio was used for the remote SQL.

### [>] Next Steps
- Continue with Phase 2, item 5: Exams.

## 2026-05-24: Phase 2 Item 4 Questions (Codex)

### [+] Features & Improvements
- Added migration `20260524162029_questions.sql`.
- Added `public.questions` with teacher/admin source tracking, JSONB options, answer validation, FK indexes, timestamps, and RLS policies.
- Added teacher `/questions` page for question bank CRUD.
- Added search and source filtering for the teacher question dashboard.
- Added `features/questions/` with separate actions, queries, types, and components.
- Added Zod validation in `lib/validations/question.ts`.
- Updated the dashboard to link teachers to their question bank.
- Regenerated `types/database.ts` from the linked Supabase schema.

### [x] Successes
- Applied the Questions migration to the linked Supabase project through `supabase db query`.
- Marked migration `20260524162029` as applied in remote migration history after `db push` was blocked by the existing missing remote migration `20260522180510`.
- Verified `npm run check` passes.
- Smoke-checked the new protected `/questions` route locally:
  - `/questions` redirects unauthenticated users to `/signin?callbackUrl=%2Fquestions`.
  - The in-app browser opens `/questions` and lands on the sign-in page without an application error.

### [!] Failures/Blockers
- `supabase db push --linked` is still blocked by the pre-existing remote-only migration `20260522180510`.
- Supabase migration-list/advisor follow-up checks hit the pooler `ECIRCUITBREAKER` temporary authentication block after the migration and type generation succeeded.
- Supabase leaked-password protection remains disabled on the Free plan and is unrelated to the Questions schema.

### [>] Next Steps
- Move forward with Phase 2, item 5: Exams.
- Re-run Supabase advisors after the pooler circuit breaker clears.

## 2026-05-24: Phase 2 Item 3 Groups (Codex)

### [+] Features & Improvements
- Added migration `20260524131436_groups.sql`.
- Added `public.groups` and `public.group_members` with invite tokens, FK indexes, timestamps, and RLS policies.
- Added teacher `/groups` page for creating, renaming, deleting, and sharing invite links for private groups.
- Added student `/student/groups` page for joined groups.
- Added `/join/[token]` invite flow so students can join groups through Server Actions.
- Added `features/groups/` with separate actions, queries, types, and components.
- Added Zod validation in `lib/validations/group.ts`.
- Updated the dashboard to link teachers and students to their group workspace.
- Regenerated `types/database.ts` from the linked Supabase schema.

### [x] Successes
- Applied the Groups migration to the linked Supabase project.
- Marked migration `20260524131436` as applied in remote migration history.
- Verified Supabase advisors report no new Groups schema or RLS warnings.
- Verified `npm run check` passes.
- Smoke-checked the new protected group routes locally:
  - `/groups` redirects unauthenticated users to sign-in.
  - `/student/groups` redirects unauthenticated users to sign-in.
  - `/join/[token]` redirects unauthenticated users to sign-in.

### [!] Failures/Blockers
- Supabase advisors still report project-level leaked password protection is disabled. This remains blocked by the current Free plan and is unrelated to the Groups schema.
- Browser automation was not exposed as a callable tool in this session, so local route smoke checks used HTTP requests instead.

### [>] Next Steps
- Move forward with Phase 2, item 4: Questions.

## 2026-05-24: Auth Security Advisor Follow-up (Codex)

### [x] Successes
- Restored hosted Supabase Auth settings in `supabase/config.toml` after local CLI defaults were detected.
- Pushed the corrected Auth config back to the linked Supabase project:
  - Production site URL restored to `https://exam.ataullah.dev/`.
  - Production auth callback redirect restored.
  - Email confirmation restored.
  - Email OTP length restored to 8 digits.
  - TOTP MFA enrollment/verification restored.
  - Minimum password length raised to 8.

### [!] Failures/Blockers
- Leaked password protection could not be enabled because Supabase returned: "Configuring leaked password protection via HaveIBeenPwned.org is available on Pro Plans and up." The project organization is currently on the Free plan.

### [>] Next Steps
- Upgrade the Supabase organization to Pro or higher if leaked-password protection is required.
- Move forward with Phase 2, item 3: Groups.

## 2026-05-24: Live Database Profile Alignment (Codex)

### [+] Features & Improvements
- Added migration `20260524112618_align_profiles_posts_schema.sql`.
- Aligned the linked Supabase database with the profiles feature by adding `public.users.bio`.
- Created `public.posts` for teacher public text posts with a teacher foreign key and indexed teacher/date lookup.
- Added RLS policies for own-profile reads/updates, authenticated teacher profile reads, and authenticated teacher post reads.
- Regenerated `types/database.ts` from the linked Supabase schema.

### [x] Successes
- Applied the alignment SQL to the linked Supabase project.
- Marked migration `20260524112618` as applied in remote migration history.
- Verified the live column list shows `users.bio` and the `posts` table.
- Verified RLS is enabled on `public.users` and `public.posts`.
- Verified profile/post policies are present in `pg_policies`, then simplified duplicate legacy policies.
- Verified Supabase database advisors report no remaining profile/posts schema or RLS warnings.
- Verified generated types now include `public.users.bio` and `public.posts`.
- Verified `npm run check` passes.

### [!] Failures/Blockers
- Supabase pooler temporarily returned `ECIRCUITBREAKER` after repeated CLI authentication attempts, but later verification queries succeeded.
- Supabase advisors still report project-level leaked password protection is disabled; this is an Auth setting outside the profile schema alignment.
- Older migration history is still not fully aligned with local migration files: local has `20260512180000`, while remote reports `20260522180510`. The new profile alignment migration is aligned locally and remotely.

### [>] Next Steps
- Phase 2, item 3: implement Groups.

## 2026-05-24: Phase 1 Item 2 Profiles (Codex)

### [+] Features & Improvements
- Added authenticated profile surfaces for teachers and students.
- Added `/profile` as the signed-in profile entry point, rendering the teacher or student profile view based on trusted role.
- Added `/teacher/[id]` for authenticated users to view a teacher's public profile and public posts.
- Added `/profile/edit` for name and bio updates through a Server Action in `features/auth/actions.ts`.
- Added profile validation in `lib/validations/profile.ts` using Zod.
- Added student-specific companion routes at `/student/profile` and `/student/profile/edit`.

### [x] Successes
- Implemented profile feature code under `features/auth/` with separate action, types, query helpers, and form/display components.
- Kept Supabase mutations server-side only; the edit form calls the server action and does not call Supabase from the client.
- Added empty-state rendering for teacher public posts and placeholders for student groups/progress.
- Verified `npm run check` passes.
- Smoke-checked protected profile routes locally; unauthenticated access redirects to sign-in.

### [!] Failures/Blockers
- `supabase gen types` initially could not complete because no Supabase access token was available in the environment. After CLI login, `types/database.ts` was generated successfully.
- Generated types show the linked Supabase `public` schema currently has `users.name` but does not expose `users.bio` or a `posts` table. The live database should be brought in line with the documented Phase 1/Posts assumptions before manually testing profile bio saves or teacher post lists against Supabase.
- Next.js route groups cannot define both `app/(teacher)/profile/page.tsx` and `app/(student)/profile/page.tsx` because both resolve to `/profile`. The implementation uses a single role-aware `/profile` route and separate `/student/profile` companion routes to keep the build valid.

### [>] Next Steps
- Phase 2, item 3: implement Groups.
- Apply or add the missing database updates for profile `bio` and teacher `posts` if they are absent in the target Supabase project.

## 📅 2026-05-20: Architecture & Agent Framework Refactor (Manus)

### [+] Features & Improvements
- **Universal Agent Framework**: Created `AGENTS.md` and `PROJECT_HISTORY.md` to coordinate multiple AI agents (Manus, Claude, Codex).
- **Architecture Cleanup**: Consolidated Supabase environment variables. Removed redundant `SUPABASE_URL` and `SUPABASE_ANON_KEY` in favor of `NEXT_PUBLIC_` variants used globally.
- **UI Content Audit**: Removed all mentions of "Admin" from public-facing pages (`app/page.tsx`, `auth-shell.tsx`, `signup/page.tsx`, and `dashboard/page.tsx`).
- **Admin Privacy**: Refactored marketing copy to focus on Students and Teachers, treating Admin as a silent super-user.

### [x] Successes
- Successfully refactored `lib/supabase/admin.ts` and `lib/supabase/auth-client.ts` to use consolidated env vars.
- Cleaned up `.env.example` to reflect the new architecture.
- Verified that the landing page and auth flows no longer expose admin implementation details.

### [!] Failures/Blockers
- None encountered during this refactor.

### [>] Next Steps
- Implement actual Exam/Question management for Teachers.
- Implement Exam taking for Students.
- Create a private Admin dashboard for user management (not linked from public UI).
- Add Row-Level Security (RLS) to protect data based on roles.
