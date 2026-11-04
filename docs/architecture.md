# Kheyal — System Architecture

**Product:** Kheyal  
**Tagline:** Socho. Plan karo. Kar dikhao.  
**Supporting line:** Notes, tasks aur deadlines — sab ek jagah.  
**Source of Truth:** [`docs/PRD.md`](PRD.md) and [`docs/decisions.md`](decisions.md)

---

## 1. High-Level System Architecture

Kheyal is built as a cleanly decoupled monorepo comprising a Next.js frontend, a Node.js Express backend, and a PostgreSQL relational database.

```text
┌────────────────────────────────────────────────────────┐
│                   Next.js Client (PWA)                │
│                 (Deployed to Vercel)                   │
│                                                        │
│  - App Router pages & responsive layouts               │
│  - Notebook Design System (Ink, Paper, Lavender, Peach)│
│  - Natural-language deadline capture with preview      │
│  - Prioritized "Do this next" & "All deadlines" views  │
│  - Service Worker (Push events, notifications, cache)  │
└───────────────────────────┬────────────────────────────┘
                            │
               HTTPS / JSON API Requests
               (HttpOnly Session Cookies)
                            │
┌───────────────────────────▼────────────────────────────┐
│                  Express Backend (API)                 │
│                 (Persistent Node.js)                   │
│                                                        │
│  - Authentication & Database-backed Session Engine     │
│  - Zod Request Validation & Ownership Enforcement      │
│  - Natural-Language Parsing (chrono-node + heuristics) │
│  - Prioritization Engine (Slack & Start-by calculation)│
│  - Background Scheduler (node-cron + Web Push / VAPID) │
└───────────────────────────┬────────────────────────────┘
                            │
             Parameterized SQL via pg.Pool
             (Least-privilege role: kheyal_app)
                            │
┌───────────────────────────▼────────────────────────────┐
│                    PostgreSQL 18                       │
│                                                        │
│  - users (accounts, password hashes, timezones)        │
│  - sessions (hashed tokens, 7-day sliding expiry)      │
│  - deadlines (tasks, UTC due timestamps, effort)       │
│  - reminders (48h/24h/6h, lifecycle status, attempts) │
│  - push_subscriptions (browser VAPID endpoints)       │
└────────────────────────────────────────────────────────┘
```

---

## 2. Separation of Responsibilities

### Client (`client/`)
- Pure client-side UI rendering, forms, and optimistic interaction states.
- Service Worker registration, push subscription negotiation with the browser, and notification click handling.
- **Strict Rule:** No database queries and no business logic duplication inside Next.js API routes. All application data flows through the Express API.

### Server (`server/`)
- All business logic lives in Express.
- Authentication, authorization, and ownership checks on every protected route.
- Parsing deadline text into structured preview objects (does not save until explicit confirmation).
- Dynamic calculation of urgency slack and suggested start-by times.
- Background worker for atomic claiming (`FOR UPDATE SKIP LOCKED`) and dispatch of push notifications via web-push.
- PostgreSQL database access exclusively using parameterized queries.

---

## 3. Core Engine Specifications

### A. Authentication & Session Architecture (D-03)
1. **Registration/Login:** Passwords hashed with `bcrypt` (salt rounds >= 10). Plaintext passwords are never logged or stored.
2. **Session Generation:** On successful authentication, the server generates a cryptographically secure 256-bit random session token (`crypto.randomBytes(32).toString('hex')`).
3. **Database Storage:** The server computes `SHA-256(token)` and stores only the resulting hash in the `sessions` table alongside `user_id`, `created_at`, `last_activity_at`, and `expires_at` (now + 7 days).
4. **Cookie Delivery:** The raw token is sent to the client in an `HttpOnly`, `SameSite=Lax` (or `None` with `Secure` in production cross-site scenarios), `Secure` persistent cookie. LocalStorage is never used for session credentials.
5. **Sliding Expiration:** Qualifying user requests refresh `expires_at` to maintain a rolling 7-day window.
6. **Revocation:** Logout explicitly revokes the session row in PostgreSQL (`revoked_at = NOW()`), immediately invalidating the session server-side.
7. **Google OAuth:** Backend verifies the Google OAuth ID token, matches/links the account by verified email, and provisions a database-backed session.

### B. Natural-Language Deadline Parsing (chrono-node)
- Day-first date parsing (e.g., `05/11` is 5th November, not 11th May).
- Local timezone awareness supplied by the client.
- Ambiguous dates produce explicit parsing warnings requiring user selection.
- Preview contract: The parser returns interpreted `title`, `subject`, `due_at`, `has_due_time`, and `effort_hours`. It **never** writes to the database until the user explicitly confirms the preview.

### C. Prioritization Engine ("Do This Next")
Urgency is determined by dynamic slack calculation computed on read:

$$\text{slack} = \text{hours until due} - \text{estimated hours remaining}$$

Rules:
1. **Lower slack ranks first** (least spare time).
2. **Tie-breaker:** Earlier due time.
3. **Completed tasks** are excluded from the ranking.
4. **Overdue tasks** remain prominently displayed with an overdue indicator.
5. **Unknown effort:** Tasks without effort estimates are ranked by due time and display an inline prompt requesting an estimate.
6. **Date-only deadlines:** Interpreted as due at 23:59 local time for slack calculation, with a clear visual notice that the time is unset.

### D. Suggested Start-By Engine
Suggested start time guides student preparation:

$$\text{start-by} = \text{due time} - \text{estimated effort} - \text{buffer}$$

- Default buffer: 2 hours (configurable in user settings).
- Date-only deadlines compute start-by based on 23:59 EOD and flag the result as approximate.
- Presented clearly as a recommendation, not a promise.

### E. Reminder System & Web Push Lifecycle
Reminders are scheduled server-side:
- **Explicit time deadline:** Exactly 3 reminders: 48h, 24h, and 6h prior to due time.
- **Date-only deadline:** Exactly 2 reminders: Night before at 22:30 local time, and morning of deadline at 07:00 local time.
- **Undated tasks:** No reminders scheduled.
- **Lifecycle Rules:**
  - Offsets falling in the past at task creation/edit time are skipped.
  - Completing or deleting a task marks pending reminders cancelled (`cancelled`).
  - Rescheduling a task cancels existing pending reminders and regenerates new ones.
  - Scheduler restarts check a short grace window (e.g. 15 minutes); reminders older than the grace window are expired to prevent flood.
  - Push delivery claims rows atomically (`FOR UPDATE SKIP LOCKED`) and records delivery timestamp, attempts, and error details.
  - Unregistered or expired push endpoints (HTTP 404/410 from web-push) are automatically cleaned up from `push_subscriptions`.

---

## 4. Security Principles

1. **Authentication on every private route:** Enforced via `requireAuth` middleware validating the hashed session token.
2. **Tenant/Ownership Isolation:** Every SQL query operating on user data explicitly binds `WHERE user_id = $auth_user_id` or verifies parent deadline ownership.
3. **Strict Parameterization:** No dynamic string concatenation in SQL queries.
4. **Zod Validation:** All query parameters, path parameters, and request bodies pass strict schema validation.
5. **Least-Privilege Database Role:** Application connects via `kheyal_app`, with permissions restricted to CRUD on application tables and sequences. The `postgres` superuser is never used for runtime traffic.
6. **Public Repository Hygiene:** No credentials, API keys, private keys, or `.env` files are ever committed to version control.

