SOURCE OF TRUTH
docs/PRD.md (Kheyal PRD v1.0, 18 Oct 2026) is binding: requirements FR-01 to FR-17 (section 7), business rules (8), data model (13), API contract (14), security (15), acceptance criteria (16), open decisions (20), roadmap (21). If I ask for something that conflicts with it, say so and ask which wins. Never invent requirements.

PRODUCT
Kheyal is a student deadline workspace. Tagline: "Plan Smart. Move Forward." Phase A MVP only: one-line deadline capture with preview and explicit confirmation, push reminders at 48h/24h/6h, a ranked "Do this next" list, and a suggested start-by time. Out of scope: notes editor, drawing, voice, AI features, WhatsApp/LMS/email/calendar integrations, native apps, claims of improved grades. Never reuse any MindVault AI code.

LOCKED STACK (no substitutes)
Frontend: Next.js + React + TypeScript in client/ (deployed to Vercel). Vite is rejected. Backend: Node.js + Express in server/; all business logic lives in Express, never in Next.js API routes. Libraries: Zod, pg (node-postgres), bcrypt, JWT, chrono-node, node-cron, web-push (VAPID). Database: PostgreSQL with parameterized SQL only. PWA: manifest + service worker (the service worker is not a clock; reminders are scheduled server-side). Tests: Vitest or Jest + Supertest. Monorepo: client/, server/, docs/. Environment: Windows, D:\PROJECTS\Kheyal. psql is not yet recognised, so PostgreSQL is unverified.

CORE RULES
- Reminders: skip offsets already in the past; completing or deleting cancels pending reminders; editing the due time regenerates them; after a restart send missed reminders only within a short grace window; claim reminder rows atomically; track status and attempts; remove expired push subscriptions.
- Slack = hours until due minus estimated hours remaining. Smaller ranks first; ties go to the earlier due time; exclude completed tasks; show overdue clearly; unknown effort means rank by due time and ask for an estimate; compute on read.
- Start-by = due time minus effort minus buffer. It is a suggestion, not a promise.
- Dates: store UTC, show local; day-first parsing; an explicit default-time rule; ambiguous dates always need confirmation.
- Security: bcrypt, Zod on every input, auth and ownership check on every protected operation, no leaked errors, secrets only in environment variables (commit .env.example, never .env), CORS limited to known origins, rate-limited auth routes.

HOW YOU MUST WORK
1. One roadmap step at a time (PRD section 21). Do only the step I name and stop at its checkpoint. Use ONE agent at a time; start no parallel agents or conversations on this repo.
2. For every task, first produce a short Implementation Plan artifact (files, why, risks) and wait for my approval. Keep a Task List artifact. When done, produce a Walkthrough artifact with proof: test output, command output, and screenshots for UI.
3. Teach: explain each new file, why the technology is used, and one thing I should be able to explain in an interview. If I say "let me write it", give a skeleton with TODOs and review my code.
4. Implement only PRD requirements. No extra libraries, features or integrations: propose, then wait.
5. Write tests for parsing, ranking, reminder lifecycle, authentication, and ownership with two users. Never claim something works unless you ran it and showed the output.
6. Do not state library behaviour, hosting limits or pricing from memory; verify in the current official docs first (including Next.js PWA and web push).
7. Do not use the browser agent to sign in anywhere or enter credentials. Never ask me to paste secrets into chat.
8. Never run destructive commands: rm -rf, git reset --hard, git clean -fd, git push --force, or anything that deletes data. Ask first.
9. Record each decision in docs/decisions.md.

GIT AND GITHUB (after EVERY completed, verified change)
Remote origin = https://github.com/Kaustav1409/Kheyal, branch main. The repo is PUBLIC, so nothing sensitive may ever be pushed.
1. Run git status and git diff --staged. Stage by explicit path.
2. SAFETY CHECK: stop and tell me if any staged file or diff line is .env or .env.* (except .env.example), node_modules, .next, dist or build output, a private key, a database dump, or contains a password, API key, token, JWT secret, VAPID private key, or a database URL with credentials.
3. Run the tests, type-check, lint or build that exist for the changed area. If they fail, do not commit.
4. Commit with Conventional Commits (feat, fix, docs, chore, test, refactor), then git push origin main.
5. Show git status and git log --oneline -3 as proof.
6. When I confirm a checkpoint, create and push an annotated tag named step-NN-name.
Never force-push, rewrite history or use --no-verify. If a push is rejected, authentication fails or there is a conflict: STOP, run git fetch, explain in plain words what differs, and wait for me.

DO NOT DECIDE SILENTLY - ask me (PRD section 20)
Name checks | repo visibility | local vs hosted PostgreSQL | auth storage, expiry and CSRF (Next.js on Vercel and Express elsewhere are cross-site: propose a rewrite proxy or a shared parent domain) | default start-by buffer | quiet-hours rule | CSS approach (CSS Modules + CSS variables recommended) | test runner | backend TypeScript or JavaScript | Next.js router style | backend and database hosting | whether the Hinglish tone and supporting line still apply with the English tagline | old Resend keys rotated and old repo archived.

END every reply with: Changed | Pushed (hash and message, or why not) | How I verify it | What I must be able to explain | Next checkpoint.
