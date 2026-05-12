# Database Schema

No committed schema or migrations exist yet.

## Expected Direction

The project will likely need:

- `users` or `profiles`: app-facing user profile records linked to Supabase Auth users.
- `exams`: teacher-owned exam definitions.
- `questions`: questions linked to exams or teacher-owned banks.
- `exam_attempts`: student attempts.
- `answers` or `submissions`: submitted responses and grading data.

## RLS Requirements

- Enable RLS on all public tables.
- Students can read/write only their own attempt and progress data.
- Teachers can manage only their own exams/questions/students.
- Admins can see and manage all app data.
- Do not use user-editable metadata for RLS decisions.

## Health Check Dependency

`/api/health` currently queries `users(id)` with `limit(1)`. If the final schema uses `profiles` instead, update the health route and this file together.
