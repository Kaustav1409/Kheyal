# Kheyal — Product Requirements Document

**Version:** 1.0  
**Date:** 18 October 2026  
**Status:** Planning and setup; implementation not yet verified  
**Product:** Student-focused deadline and productivity workspace  
**Initial release:** Deadline management MVP  
**Stack:** Frontend Next.js + React + TypeScript · Backend Node.js + Express · Database PostgreSQL

Cover tagline: **Plan Smart. Move Forward.**  
Section 19 also records a Hinglish tagline (open: see §20).

Working name only. Domain, social-handle, app-store, and trademark checks are pending.

This file is the markdown source of truth, transcribed from Kheyal PRD v1.0 (18 Oct 2026).

---

## Document control

| Field | Value |
|---|---|
| Product name | Kheyal (working name; availability checks pending) |
| Document | Product Requirements Document (PRD) |
| Version / date | v1.0 / 18 October 2026 |
| Owner | Project owner |
| Status | Planning and setup stage |
| Source basis | Kheyal_Final_Project_Report.docx uploaded for this request |
| Scope of this PRD | Phase A deadline-management MVP; Phase B/C recorded as future scope |

---

## 1. Executive summary

Kheyal is a student-focused productivity workspace intended to help students capture deadlines quickly, receive reliable reminders, and decide what to work on next. The first release is deliberately narrow: deadline capture, reminder delivery, a ranked “Do this next” view, estimated effort, and suggested start-by times. A broader digital notebook and optional AI capabilities remain part of the longer-term vision, but must not delay MVP validation.

Kheyal is being restarted from scratch rather than extending the earlier MindVault AI implementation.

## 2. Problem statement

College students manage assignments, lab submissions, exams, projects, placement preparation, internships, and extracurricular work across notebooks, messaging apps, calendars, and task lists. Information becomes fragmented; writing down a deadline does not guarantee follow-through; and overlapping work makes prioritisation difficult.

## 3. Product vision and hypothesis

**Vision:** give students one dependable place to capture deadlines, see their next useful action, and receive timely, respectful reminders.

**Hypothesis:** If students can quickly capture deadlines, receive useful reminders, and see the most important task first, they may complete more work on time. This is an unproven hypothesis to validate with real users.

## 4. Goals and non-goals

### 4.1 MVP goals

- Make it fast to create a deadline with a title, due date/time, and estimated effort.
- Show a parsed deadline preview and require explicit confirmation before saving.
- Schedule reminders at 48 hours, 24 hours, and 6 hours before the due time.
- Provide an explainable “Do this next” ranking and a suggested start-by time.
- Allow users to view, edit, complete, and delete their own deadlines.
- Deliver push notifications reliably on supported, configured devices, including when the app is not open.
- Protect accounts and user data with authentication, validation, and ownership checks.

### 4.2 Non-goals for Phase A

- Full rich-text note editor, drawing canvas, voice notes, or speech-to-text.
- AI summaries, AI study assistant, semantic search, or AI-generated plans.
- WhatsApp, LMS, email, and calendar integrations.
- Native iOS/Android applications; start with a PWA and consider a wrapper only if users demand it.
- Claiming improved academic outcomes before the product has been tested.

## 5. Target users and use cases

| User group | Needs / context | Priority |
|---|---|---|
| Primary: college students | Assignments, lab records, exams, projects, overlapping deadlines | MVP |
| Secondary: busy learners | Placements, certifications, internships, personal learning goals | Later validation |
| Initial validation group | Five real students using a working prototype for two weeks | MVP validation |

## 6. Product scope and release phases

| Phase | Included scope | Entry / exit condition |
|---|---|---|
| A — Deadline MVP | Account access; manual or natural-language deadline capture; preview and confirm; upcoming/completed/overdue lists; 48h/24h/6h reminders; effort; start-by; ranking; notification preferences | Build first. Exit when end-to-end flow and reminder reliability pass acceptance tests. |
| B — Digital notebook | Rich-text notes, notes linked to tasks, embedded to-do lists, doodling/drawing, voice notes and speech-to-text, timers, templates and themes | Start only after Phase A is validated. |
| C — Intelligent workspace | Smarter extraction, summaries, search, workload-aware suggestions, optional AI assistance | Start only after fundamentals work reliably. |

## 7. Functional requirements

| ID | Requirement | Acceptance intent | Priority |
|---|---|---|---|
| FR-01 | Account registration | A user can create an account with validated details; passwords are hashed and never stored in plaintext. | Must |
| FR-02 | Login and session | A user can log in and access protected features; invalid credentials and expired/invalid authentication are rejected. | Must |
| FR-03 | Deadline capture | A user can enter a deadline using a form or a natural-language line containing title, due date/time, and optional effort. | Must |
| FR-04 | Parse preview | The system returns a preview of interpreted title, due date/time, and effort. It does not save until the user confirms. Ambiguous dates require confirmation. | Must |
| FR-05 | Deadline creation | On confirmation, save the deadline for the authenticated user and generate applicable reminder records. | Must |
| FR-06 | Deadline list | A user can view their upcoming, completed, and overdue deadlines. Results are scoped to the authenticated user. | Must |
| FR-07 | Edit deadline | A user can edit their own deadline. Relevant pending reminders are cancelled/regenerated when due time changes. | Must |
| FR-08 | Complete deadline | A user can mark a task complete. Pending reminders for it are cancelled. | Must |
| FR-09 | Delete deadline | A user can delete their own task; pending reminders are cancelled. | Must |
| FR-10 | Reminder schedule | Default reminders are scheduled at 48h, 24h, and 6h before the due time. Past offsets are skipped rather than sent late unexpectedly. | Must |
| FR-11 | Push subscription | A signed-in user can register and remove a browser/device push subscription. Subscription ownership is enforced. | Must |
| FR-12 | Push delivery | A server-side scheduler claims due reminder rows, sends push messages, tracks status/attempts, and handles expired subscriptions. | Must |
| FR-13 | Do this next | The system returns an actionable ranked list excluding completed tasks; ties in slack use earlier due time. | Must |
| FR-14 | Start-by estimate | The system calculates a suggested start-by time from due time, estimated effort, and a configurable buffer. | Must |
| FR-15 | Preferences | A user can control notification preferences. Quiet-hours policy must be decided before push implementation. | Must |
| FR-16 | Task state and timing | The system records completion and, where implemented, notification-open timestamps for measurement. | Should |
| FR-17 | Health endpoint | A public GET /health returns a safe service-health response without sensitive details. | Must |

## 8. Core business rules

### 8.1 Reminder rules

- Default offsets are 48 hours, 24 hours, and 6 hours before the deadline.
- If an offset is already in the past when a task is created or edited, skip that reminder.
- Completing or deleting a task cancels its pending reminders.
- Changing the due date/time regenerates applicable reminder schedules.
- Use helpful, non-guilt-inducing notification copy. Avoid unnecessary notification noise.
- Open decision: define quiet hours and whether notifications during quiet hours are skipped or moved earlier.
- After server restart, only send missed reminders within a defined short grace window; do not emit stale alerts indefinitely.

### 8.2 Ranking and start-by rules

Slack = hours until due − estimated hours remaining. Smaller slack means less spare time. If slack is similar, use the earlier deadline as a tie-breaker.

Start-by = due time − estimated effort − buffer. Example: due at 5 PM, six hours of effort, and a two-hour buffer yields a suggested start-by time of 9 AM.

- Exclude completed tasks from the actionable ranking.
- Show overdue tasks clearly rather than hiding them.
- If effort is missing, treat it as unknown and rank by due time; ask the user for an estimate.
- Calculate slack dynamically so values do not become stale.
- The start-by value is a suggestion, not a guarantee.

## 9. UX requirements and screens

| Screen | Purpose | Required behaviour |
|---|---|---|
| 1. Add deadline | Fast capture | One-line natural-language input or form; preview title/date/time/effort; explicit confirmation before save; clear parse errors. |
| 2. Do this next | Home / next action | Top actionable task, due time, estimated effort, suggested start-by, completion control. |
| 3. All deadlines | Complete task overview | Upcoming, completed, overdue states; edit/delete; basic filters as needed. |
| 4. Settings | Control and onboarding | Notification preferences, PWA installation guidance, account options; privacy/theme settings can follow later. |

## 10. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | Hash passwords with bcrypt; validate inputs with Zod; use parameterized SQL; verify authentication and ownership on every protected operation. |
| Privacy | Keep academic information private; provide a privacy notice and paths to revoke subscriptions and delete user data before public launch. |
| Reliability | Atomic reminder claiming; explicit state transitions; bounded retries; failure logs; duplicate prevention; expired-subscription cleanup. |
| Time handling | Store timestamps in UTC; display in the user's local timezone; define day-first parsing and default-time rules. |
| Usability | Mobile-first responsive interface; clear loading, empty, success, and error states; first-time user should understand the next action. |
| Compatibility | PWA and push behaviour must be tested on actual target devices and browsers; do not assume uniform support. |
| Observability | Track reminder status, attempts, delivery timestamps, and relevant task completion/open events. |
| Maintainability | Document decisions; use Git milestone commits; add automated tests for parsing, ranking, authentication, ownership, and reminder lifecycle. |

## 11. Technical architecture

Confirmed direction: Next.js + React + TypeScript frontend, Node.js + Express API, PostgreSQL database, PWA capability, and Vercel for frontend hosting. **Vite is explicitly rejected.**

| Layer | Technology / choice | Responsibility |
|---|---|---|
| Frontend | Next.js + React + TypeScript | Screens, routing, responsive UI, client interaction; deployed to Vercel. |
| API / business logic | Node.js + Express | Authentication, validation, deadline CRUD, ranking, database access, reminder orchestration. |
| Validation | Zod | Validate request bodies, query parameters, and parsed deadlines. |
| Date parsing | chrono-node plus explicit rules | Interpret natural-language dates; preview and confirm all parses. |
| Database | PostgreSQL | Users, deadlines, reminders, push subscriptions. |
| Database access | pg / node-postgres (proposed) | Parameterized SQL from Express. |
| Authentication | bcrypt + JWT; secure cookie preferred recommendation | Password hashes and protected API access; token storage/expiry still open. |
| Push | web-push + VAPID | Send push notifications to browser push services. |
| Scheduler | node-cron initially, on persistent backend/worker | Find and claim due reminders independently of the browser. |
| Testing | Vitest or Jest; Supertest recommended | Unit tests and API/integration tests; exact runner open. |
| Frontend host | Vercel | Deploy the Next.js frontend. |
| Backend host | Persistent Node.js hosting; provider open | Keep API and scheduler running reliably; avoid sleeping services for production reminders. |
| Database host | Managed PostgreSQL such as Neon or Supabase; provider open | Hosted data, backups, connection management. |

## 12. Architecture and data flow

Browser/PWA → HTTPS → Express API → authentication and ownership checks → Zod validation → PostgreSQL.

After a deadline is confirmed, the API saves it and creates reminder rows. A persistent server-side scheduler atomically claims due reminders and sends them through web-push/VAPID. The service worker displays the push and handles notification clicks to open the task.

**The service worker is not an always-on clock.** Reminder timing must run server-side, independent of the browser.

## 13. Initial data model

| Table | Purpose | Initial fields |
|---|---|---|
| users | Account identity | id, email, password_hash, timezone, created_at |
| deadlines | User task/deadline | id, user_id, title, subject (optional), due_at UTC, effort_hours, status, completed_at, created_at, updated_at |
| reminders | Individual scheduled event and delivery tracking | id, deadline_id, kind (48h/24h/6h), send_at UTC, status, attempts, sent_at, opened_at, error details as appropriate |
| push_subscriptions | Browser/device push endpoint | id, user_id, endpoint, keys, created_at |

Reminders remain separate because each deadline can have multiple independently scheduled events with distinct status, retries, and cancellation history. Enforce referential integrity and ownership through schema constraints and scoped queries.

Reminder status values and transitions are proposed at Step 2 for owner approval.

## 14. Initial API contract

| Method + path | Purpose | Protection / notes |
|---|---|---|
| GET /health | Service health | Public; no sensitive details. |
| POST /auth/signup | Create account | Rate-limited; validate input. |
| POST /auth/login | Authenticate | Rate-limited; secure cookie/token decision. |
| GET /me | Current user | Authenticated. |
| GET/PATCH /me/preferences | Read/update notification preferences | Authenticated. |
| POST /deadlines/parse | Parse line and return preview | Authenticated; must not save. |
| POST /deadlines | Save confirmed deadline and create reminders | Authenticated; ownership enforced. |
| GET /deadlines | List own deadlines by status | Authenticated; scoped to user. |
| GET /deadlines/next | Ranked “Do this next” list | Authenticated; excludes completed tasks. |
| PATCH /deadlines/:id | Edit or complete task | Owner only; update reminder schedule as needed. |
| DELETE /deadlines/:id | Delete own task | Owner only; cancel pending reminders. |
| POST /push/subscribe | Register device/browser subscription | Authenticated; belongs to current user. |
| DELETE /push/subscribe | Remove subscription | Authenticated; owner only. |

Every route except `/health` is authenticated and scoped to the owner.

## 15. Security, privacy, and reliability

- Never store plaintext passwords; use bcrypt.
- Authenticate every protected route and scope every deadline/subscription operation to the authenticated user.
- Use parameterized SQL and validate API inputs.
- Keep secrets in environment variables; commit `.env.example`, never the real `.env`.
- Use HTTPS in production; restrict CORS to known frontend origins; apply security headers and login/signup rate limits.
- Prefer secure, HttpOnly, SameSite cookies where feasible; deliberately define expiry and CSRF protection.
- Do not leak tokens, passwords, stack traces, or internal details in errors.
- Atomically claim reminder rows before sending; track attempts and delivery outcomes; retry according to a defined policy.
- Remove expired push subscriptions when the push service identifies them as invalid.
- Before public launch, provide a clear privacy notice, subscription revocation, and user-data deletion path.

## 16. Acceptance criteria

| Test area | Minimum acceptance criteria |
|---|---|
| Date parsing | Ambiguous dates require confirmation; day-first dates work; past reminder offsets are skipped. |
| Ranking | Slack formula is correct; earlier due time breaks ties; completed tasks are excluded; overdue tasks remain visible; unknown effort is handled honestly. |
| Authentication | Signup/login work; invalid credentials rejected; invalid/expired auth cannot access protected data. |
| Ownership | User A cannot read, update, delete User B's deadlines or manage their push subscriptions. |
| Reminder lifecycle | Pending reminders cancel after completion; edits regenerate schedules; retries do not create duplicates. |
| Push | A real push arrives on a supported, configured device with app closed; failures are logged and subscriptions can be revoked. |
| API | Validation errors are understandable; unexpected errors do not leak internal details. |
| End-to-end | Sign up → add deadline → confirm preview → view ranking → receive reminder → complete task. |
| Usability | A first-time student can add a deadline and understand the next action without developer help. |

## 17. Success metrics and validation plan

| Metric | Question |
|---|---|
| Deadlines added per user | Is capture quick enough? |
| Reminder delivery rate | Are reminders reliable? |
| Reminder taps | Are notifications useful? |
| Tasks completed on time | Does Kheyal help follow-through? |
| Missed deadlines | Are users still overlooking work? |
| Week-two active use | Do students return without repeated prompting? |
| Qualitative feedback | What is confusing, annoying, or valuable? |

Validation plan: recruit five real students to use a working prototype for two weeks. Gather genuine usage and feedback. Do not treat a small classmate sample as representative, and do not fabricate responses or metrics. Downloads alone are not a success measure.

## 18. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Name collision / availability | Check domains, handles, app stores and relevant trademark registers; keep a fallback name. |
| Backend host sleeps or restarts | Choose persistent hosting; verify uptime/restart behaviour; monitor and test actual reminder delivery. |
| Mobile push variability | Test real target devices, including Samsung devices; document installation, permission and battery-optimisation steps. |
| Notification fatigue | Keep three default reminders, provide controls, and decide quiet hours. |
| Incorrect natural-language dates | Use explicit day-first rules, default-time policy, preview and mandatory confirmation. |
| Duplicate/lost notifications | Atomic claims, explicit state transitions, idempotency, retries, grace window and delivery logs. |
| Cross-user data exposure | Ownership tests with two users and scoped SQL queries. |
| Scope creep | Keep notes, doodling, and AI in later phases. |
| Weak validation evidence | Collect genuine user responses and observed usage results. |
| Previously exposed credentials | Verify rotation of old Resend credentials and secure/archive the old project only after checks. |

## 19. Branding requirements

| Element | Direction |
|---|---|
| Working name | Kheyal; name checks remain outstanding. |
| Wordmark | Kheयाl as a possible mixed-script treatment; test font compatibility and readability. |
| Tagline | Socho. Plan karo. Kar dikhao. |
| Supporting line | Notes, tasks aur deadlines — sab ek jagah. |
| Colours | Ink `#27272A`; Paper `#F8F5EF`; Lavender `#8B80A8`; Peach `#E7A18F`. |
| Tone | Natural Hinglish; helpful rather than guilt-inducing. |
| Visual style | Clean typography, notebook-inspired layouts, subtle accents, mobile-first readability. |

Cover page also uses the English tagline “Plan Smart. Move Forward.” Whether Hinglish still applies is an open decision (§20).

## 20. Open decisions

Do not decide these silently. Ask the owner when the relevant step is reached.

| Decision | Current status / required action |
|---|---|
| Name and brand availability | Open: verify domain, handles, app stores, relevant trademarks. |
| Repository visibility | Current GitHub repository is public; report recommends private until security baseline is checked. Reassess before adding real secrets/data. |
| PostgreSQL local setup | Open: install/verify local PostgreSQL or choose a hosted development database; verify connectivity. |
| Authentication storage/expiry | Open: decide secure cookie/JWT storage, expiry and CSRF protection. |
| Default start-by buffer | Open: choose a default and make it configurable if appropriate. |
| Quiet hours | Open: decide whether reminders are skipped or moved earlier during quiet hours. |
| CSS approach | Open: CSS Modules + CSS variables are recommended, not final. |
| Test runner | Open: Vitest or Jest; Supertest recommended for API tests. |
| Backend language | Open: JavaScript or TypeScript for Express. |
| Next.js router style | Open. |
| Hosting providers | Open: choose persistent backend/worker and managed PostgreSQL after checking current pricing and limits. |
| Hinglish tone vs English tagline | Open. |
| Legacy project safety | Open: verify old Resend keys were rotated and old repository was safely archived. |

## 21. Delivery roadmap

| Step | Milestone | Exit checkpoint |
|---|---|---|
| 1 | Setup | Tool versions verified; repo structure and secure `.gitignore`; clean Git status; first commit pushed. |
| 2 | Design | Four screen flows, ER model, initial SQL and API contract documented. |
| 3 | Backend skeleton | Express health route and PostgreSQL test query work. |
| 4 | Authentication | Signup/login work; unauthenticated requests cannot access protected data. |
| 5 | Deadlines API | CRUD and ownership enforcement pass two-user tests. |
| 6 | Deadline logic | Parsing, preview, reminders, start-by and ranking edge-case tests pass. |
| 7 | Frontend | Login, deadline capture/confirmation, and ranked list work on a phone browser. |
| 8 | Push notifications | Real reminder arrives on a supported configured device with app closed. |
| 9 | Deployment | Live deadline creates successfully and a real reminder arrives. |
| 10 | Validation | Five real students use the product for two weeks; decisions follow observed behaviour. |

Work **one step at a time** and stop at the checkpoint.

## 22. Current status and immediate next actions

- GitHub repository: https://github.com/Kaustav1409/Kheyal (public, `main`).
- Local clone: `D:\PROJECTS\Kheyal`.
- PostgreSQL is not yet verified: `psql` may be missing from PATH.
- Next: complete Step 1 (`client/`, `server/`, `docs/`), first clean setup commit, then resolve PostgreSQL before database-dependent APIs.
- Keep the codebase separate from MindVault AI; do not reuse V1/V2 implementation.

## 23. Glossary

| Term | Meaning |
|---|---|
| PWA | Progressive Web App; web application installable on supported devices. |
| Service worker | Browser-managed script for push events and notification interaction; not an always-running scheduler. |
| VAPID | Keys used by the server to identify itself when sending web push. |
| JWT | Signed token representing authentication claims; expiry and storage must be configured securely. |
| Slack | Hours until due minus estimated hours remaining. |
| Start-by | Suggested start time calculated from due time, estimated effort and buffer. |
| UTC | Universal time standard used to store timestamps consistently. |
| Vertical slice | A feature implemented end-to-end across database, API, UI, and tests. |

## 24. Assumptions and limitations

This PRD is based on the uploaded Kheyal Final Project Report, consolidated report v4 dated 18 October 2026. It preserves the report's distinction between decided choices, recommendations, open decisions, and planned-but-unimplemented work. It does not claim that the app, database, reminders, or deployment have been built or tested.

Hosting prices/free-tier limits, push compatibility, brand availability, and trademark status require verification when those decisions are made. Next.js + React + TypeScript is the current frontend direction; Vite is not part of this plan.
