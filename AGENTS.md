# Universal Agent Collaboration Framework

This repository is designed to be worked on by multiple AI agents (Claude-code, Codex, Manus, etc.) and human developers. To ensure consistency and progress, all contributors MUST follow these rules.

## 🚀 Entry Point
Before starting any task, every agent MUST read:
1. `AGENT_RULES.md`: Core development rules and constraints.
2. `/project-memory/`: Full project context and history.
3. `PROJECT_HISTORY.md`: Recent activity and task status.

## 🤖 Agent-Specific Configs
If your agent uses a specific configuration file, it should reference this file:
- **Claude**: `CLAUDE.md`
- **Other Agents**: Create your own `AGENT_NAME.md` if needed, but keep the core logic in `AGENT_RULES.md`.

## 📜 Project History Tracking
All agents MUST update `PROJECT_HISTORY.md` after completing a task. This file tracks:
- [x] **Successes**: What was successfully implemented.
- [!] **Failures/Blockers**: What didn't work and why.
- [>] **Next Steps**: What should be done next.
- [+] **Features**: New features added.

## 🛠 Architecture Standards
- **Supabase**: Use `@supabase/ssr` for auth and data.
- **Environment**: Only use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Supabase connection (no duplicate server-side vars).
- **Admin**: Admin is a super-user. No admin implementation details or marketing should be exposed to the public UI.
- **Roles**: `student`, `teacher`, `admin`. Public signup is restricted to `student` and `teacher`.

## 🔄 Collaboration Workflow
1. **Audit**: Read `PROJECT_HISTORY.md` and `/project-memory/`.
2. **Execute**: Perform the task following `AGENT_RULES.md`.
3. **Document**: Update `PROJECT_HISTORY.md` and relevant files in `/project-memory/`.
4. **Commit**: Use descriptive commit messages.
