# Changelog

## 2026-06-03 Dashboard/Profile Refresh and Social UI Removal

- Removed the active public post UI: `/posts`, `/student/feed`, post/comment/reaction feature slices, and social form validation are no longer part of the app code.
- Removed post/feed links from dashboards and removed post lists from teacher profiles.
- Reworked `/dashboard` into a teacher-focused workspace with metrics for batches, student memberships, question sets, questions, points, scheduled exams, closed exams, next/active exam focus, recent exam context, and direct navigation to teacher workflows.
- Added a `System`/`Light`/`Dark` theme toggle with `System` selected by default.
- Enhanced teacher profile pages with a stronger header, avatar initials, bio, account details, edit/profile actions, and fast links to Batches, Questions, Exams, and Dashboard.
- Updated route and live-workflow smoke scripts so they no longer cover removed social UI workflows.

## 2026-06-02 Batches Workspace

- Added `/batches`, `/batches/new`, and `/batches/[id]` for teacher batch management, with `/groups` redirecting to `/batches`.
- Teachers can create empty batches or add initial existing students while creating, then edit batch details, copy invite links, add existing students by email, update roll/custom identity, remove students, and delete batches from the dedicated batch screen.
- `/batches/[id]` now shows read-only batch details by default, with edit/delete icon actions opening pop-up dialogs, and student records shown in a row/column grid with row edit/delete icons.
- Updated teacher navigation to use `/batches` and shifted visible membership copy from groups to batches while preserving the existing `public.groups` schema.

## 2026-06-02 Copy Fix

- Fixed question-set copy from `/questions` so copied teacher-owned sets preserve valid original-question references, open the new editable `/questions/[id]` form immediately, and public-set copies do the same.
- Rebuilt/restarted the local production server after the stale bundle kept showing the old copy error, and verified in Chrome that copying `Test2` now opens the editable copied form.

## 2026-06-02

- Renamed question source copy from “Own questions” to “My Questions”.
- Reworked teacher `/exams` into a questions-style workspace with recent exam cards and modal create/edit flow.
- Added `/exams/[id]` as the dedicated teacher statistics/results screen with all student results.
- Changed the exam modal's Questions selector to show question sets/public sets, with selected sets expanded into exam snapshots server-side.
- Enabled active-exam postponing/extending from `/exams` while locking batch/question changes, added delete confirmation, and defaulted new exam question filtering to My Questions.
- Added own-question-set copy from `/questions` so teachers can duplicate a set and edit the copy.
- Added unsaved-work leave warnings to the question builder and exam modal.
- Added scheduled exam editing with current-snapshot preservation plus My/Public question-set search in the exam modal.
- Added migration `20260602014148_batch_member_identity.sql` with batch member `roll_number` and optional `student_identity`.
- Updated teacher batch management so roll numbers and custom student identities can be edited from `/groups`.
- Shifted teacher-facing copy from groups to batches on the dashboard, `/groups`, and `/exams` while preserving existing database table names.

## 2026-06-01

- Split `/questions` into saved-set management/search, `/questions/new` blank creation, and `/questions/[id]` editing routes.
- Reworked the question-set builder with responsive Google-Forms-like cards, drag reorder handles, icon actions, hidden-by-default descriptions, visual focused-field formatting controls, default-off required toggles, correct-answer dropdowns, checked three-dot menu toggles, undo/redo, preview, theme controls, and shuffle-option-order settings.
- Updated `/questions` copy to platform language, removed the plus-card and import-card flow, and added own/public/all filtering with public collections copied as teacher-owned editable questions.
- Moved the creator controls into a separate top bar, made preview/theme icon-only, switched the default creator theme back to the site color scheme, and added primary/background theme choices.
- Removed the drag-render style warning by avoiding conflicting border shorthand and non-shorthand inline styles.
- Fixed rich-text placeholder/synchronization in the question builder, duplicate question text/description copying, blank-title defaulting to `Untitled Form`, and optional scale/rating validation for multiple-choice submissions.
- Added manual paragraph grading, teacher grading controls on `/exams/[id]/merit`, and migrations `20260601150149_allow_manual_paragraph_grading.sql`, `20260601153705_grant_question_validation_to_service_role.sql`, and `20260601160118_allow_single_choice_option.sql`.
- Replaced teacher `/questions` with a Google-Forms-like question-set builder/list UI and server-action-backed set mutations.
- Added migration `20260531141254_google_form_question_sets.sql` with `question_sets`, `question_set_questions`, typed question metadata, typed snapshots, JSON responses, and point fields.
- Added question-set validation/types/actions/queries/components for short answer, paragraph, multiple choice, checkboxes, dropdown, linear scale, and rating question items.
- Updated group exams, public exams, progress/practice, and smoke checks for typed question snapshots and responses.
- Adapted teacher public-set import to create an editable teacher-owned question set.
- Confirmed Vercel Speed Insights remains installed and mounted for the next redeployment.
- Promoted the completed Vercel Preview deployment for the question-set commit to Production and re-ran production route smoke on `https://exam.ataullah.dev`.

## 2026-05-31

- Added Vercel Speed Insights with `@vercel/speed-insights` and the root Next.js `<SpeedInsights />` component.

## 2026-05-30

- Cleared the remaining cleanup blockers: linked migration list and linked DB lint now pass after pooler recovery, and local `.env.local` no longer contains `ADMIN_SETUP_TOKEN` or legacy duplicate env names.
- Archived the 4 isolated legacy `public.users` orphan profiles into `private.archived_user_profiles`, deleted the orphan profile rows, and validated `users_id_auth_fkey`.
- Added migration `20260530083805_database_time_and_post_length_hardening.sql` for database-time reads and post length hardening.
- Switched exam, progress, and practice state calculations to use Supabase database time through `public.database_now()`.
- Expanded protected-route smoke coverage from 18 to 22 routes.
- Hardened live workflow smoke cleanup and live-state reporting so temporary smoke profile residue is detected without exposing PII.
- Re-ran linked Supabase advisors after the database-time hardening migration; only project-level leaked-password protection remains.
- Added `scripts/archive-orphan-profiles-and-validate-fk.sql.template`, a fail-closed operational template for approved orphan profile cleanup and FK validation.
- Verified linked Supabase DB lint now runs through the current CLI and reports no public-schema errors.
- Re-ran linked Supabase advisors; only project-level leaked-password protection remains.
- Added `npm run smoke:live-workflows` for opt-in live Supabase workflow verification with temporary fixtures and cleanup.
- Added `npm run smoke:static` for static role/security/admin-hidden invariants.
- Expanded `npm run smoke:routes` to cover dynamic protected routes and unauthenticated API gates.
- Added migration `20260530032151_add_users_auth_fk_not_valid.sql` to enforce new `public.users` rows against `auth.users` while existing orphan profiles remain unvalidated.
- Fetched remote migration `20260522180510_fix_auth_profile_sync.sql` and repaired the older migration-history mismatch.
- Added hidden `/admin/users` user-role management for super-users.
- Added `npm run verify:auth-redirects` to verify hosted Supabase Auth callback allow-list behavior with temporary users and cleanup.

## 2026-05-29

- Added student exam-taking routes with countdown, active-window submission, auto-submit attempt, and submission scoring.
- Added merit-list routes for students and teachers.
- Added student progress and wrong-answer practice dashboards.
- Added teacher posts, student feed, reactions, and comments.
- Added hidden public-set management route, student public exam attempts, and teacher public-set question import.
- Added migrations for submissions, social reactions/comments, and public exam sets/attempts.
- Added `npm run smoke:routes` for protected-route and invalid-signup smoke coverage.

## 2026-05-12

- Fixed `/auth/callback` to support Supabase token-fragment verification links (`#access_token` and `#refresh_token`) as well as PKCE `?code=` links.
- Added `/api/auth/sync-profile` so client-processed verification links can still update `public.users` through trusted server code.
- Changed signup to show an immediate in-place success state telling users to verify email before redirecting to `/auth/check-email`.
- Replaced active NextAuth flow with Supabase SSR auth.
- Removed unused NextAuth dependency and route/config files.
- Added public landing page at `/`.
- Added protected `/dashboard` with user info and logout.
- Added `/auth/callback`, `/auth/check-email`, `/auth/verified`, and `/auth/error`.
- Fixed signup UX to redirect to check-email and prevent duplicate submissions.
- Fixed signup architecture to create Auth users plus `public.users` profile records.
- Added first-admin bootstrap and admin role-promotion APIs.
- Added auth/profile migration SQL.
- Backfilled the current real Supabase Auth user into `public.users`.
- Updated environment and project memory documentation.

## Earlier 2026-05-12

- Added custom auth pages for sign in, sign up, and forgot password.
- Added public signup support for `student` and `teacher`.
- Added hydration warning guard for extension-injected body attributes.
- Added Vercel deployment config and `.env.example`.
- Added `/api/health` Supabase keepalive endpoint.
- Added `/project-memory` and `AGENT_RULES.md`.
