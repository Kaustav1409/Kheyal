# Kheyal — Decision Log

Every product/engineering decision that shapes the code lives here, so we never "silently invent" behaviour.

**Legend:** ✅ Decided by project owner · 🟡 Proposed engineering default (accepted unless the owner changes it before the relevant milestone) · ⏳ Open

Last updated: 19 Oct 2026 (Milestone 2)

## Authentication and sessions

| ID | Decision | Status |
|---|---|---|
| D-01 | **Opaque session token**, not JWT. On login the server creates 32 random bytes (base64url) and sends them in a cookie. The DB stores only the **SHA-256 hash** in a `sessions` table. Logout / "log out all devices" / account deletion revoke instantly by deleting rows. | ✅ |
| D-02 | **7-day sliding expiry.** Each authenticated request extends `expires_at` to now + 7 days (DB write throttled to at most once per hour per session). | ✅ |
| D-03 | Absolute session cap of **60 days**: after that, log in again even if active. Limits the damage of a stolen cookie. | 🟡 |
| D-04 | **Same-site deployment via proxy.** The browser only talks to the Next.js origin; Next.js rewrites `/api/*` to the Express API. Cookie: `kheyal_session`, `HttpOnly`, `Secure` (production), `SameSite=Lax`, `Path=/`. | ✅ |
| D-05 | **CSRF defence:** SameSite=Lax cookie + every state-changing request (`POST/PATCH/DELETE`) must carry an `Origin` header matching the configured frontend origin, otherwise `403`. | ✅ |
| D-06 | Why SHA-256 (not bcrypt) for session tokens: tokens are 256-bit random values, so brute force is infeasible; a fast hash is correct here. bcrypt is for low-entropy human passwords. | 🟡 |
| D-07 | Passwords: **8–72 bytes** (bcrypt ignores bytes beyond 72, so longer input is rejected rather than silently truncated). bcrypt cost **12**. Emails trimmed and lower-cased before storage. | 🟡 |
| D-08 | Rate limits (`express-rate-limit`, in-memory, single instance): login **10 / 15 min / IP**, signup **5 / hour / IP**. Failed logins return one generic message ("Email or password is incorrect"). | 🟡 |
| D-09 | Signup reveals whether an email is already registered (`409`). Accepted trade-off for usability; mitigated by the signup rate limit. | 🟡 |

## Deadlines, time, and parsing

| ID | Decision | Status |
|---|---|---|
| D-10 | All timestamps stored as `TIMESTAMPTZ` (UTC). The DB pool forces session `TimeZone=UTC`. Display converts to the user's IANA timezone. | 🟡 |
| D-11 | User timezone captured from the browser at signup (`Intl.DateTimeFormat().resolvedOptions().timeZone`), validated as IANA, editable in Settings. Default `Asia/Kolkata`. Server-side timezone maths uses **Luxon**. | 🟡 |
| D-12 | **Date-only deadlines** ("due 25 Oct"): stored with `has_due_time = false` and `due_at = 23:59` local on that date. UI shows "Due 25 Oct · time not set" and states that start-by assumes end of day, with a prompt to add a time. | ✅ |
| D-13 | Natural-language parsing: `chrono-node` **en-GB (day-first)** parser, `forwardDate: true` (a bare "Friday" means the coming Friday). Preview warnings for: time assumed, numeric date where both parts ≤ 12 (e.g. `05/11` → shown as "5 Nov"), date in the past, no date found. Parsing never saves. | 🟡 |
| D-14 | Effort extraction from text: patterns such as `6h`, `6 hrs`, `2.5 hours`, `90 min`. Effort is optional; missing effort is stored as `NULL` (unknown), never guessed. | 🟡 |
| D-15 | `effort_hours` is treated as **hours remaining**. No progress tracking in the MVP; users edit the estimate if partially done. | 🟡 |
| D-16 | **Overdue is derived**, not stored: `status = 'active' AND due_at < now()`. Avoids stale state. | 🟡 |
| D-17 | **Hard delete** a deadline; its reminders are removed by `ON DELETE CASCADE` (so nothing can be sent). Privacy-friendly; accepted loss of metrics for deleted items. | 🟡 |
| D-18 | IDs are **UUIDs** (`gen_random_uuid()`), so IDs cannot be guessed or enumerated. | 🟡 |

## Ranking and start-by

| ID | Decision | Status |
|---|---|---|
| D-19 | `slack = hours until due − effort_hours`. Sorted ascending. "Similar slack" = same **30-minute bucket**; within a bucket the earlier `due_at` wins. Computed on every request (never stored). | 🟡 |
| D-20 | Unknown effort: sort key = hours until due (i.e. ranked by due time), item flagged `needsEstimate: true` with a prompt. No fabricated estimate. | 🟡 |
| D-21 | `GET /deadlines/next` returns overdue items in a **separate `overdue` list** shown clearly above the ranking; the "Do this next" hero is the top non-overdue item. | 🟡 |
| D-22 | `start-by = due − effort − buffer`. Buffer default **2 hours**, user-configurable **0–24 h** in Settings. Unknown effort → no start-by shown (prompt for estimate). Always labelled a suggestion. | ✅ |

## Reminders and push

| ID | Decision | Status |
|---|---|---|
| D-23 | Timed deadlines: reminders at **48 h, 24 h, 6 h** before `due_at`. | ✅ (PRD) |
| D-24 | Date-only deadlines: exactly **two** reminders — **night before at 22:30** and **morning of at 07:00** (user's local time). | ✅ |
| D-25 | Any reminder whose time is already past at creation/edit is **skipped**, not sent late. | ✅ (PRD) |
| D-26 | **Quiet hours: move earlier.** Default 23:00–07:00 local, per-user editable or disable-able. A reminder inside the window is moved to `quiet_start − 1 min` (e.g. 03:00 → 22:59 previous evening). If the moved time is already past, it is skipped. | ✅ |
| D-27 | Quiet window limited to **≤ 12 hours**, which guarantees two reminders for one deadline can never collapse into the same slot. Changing quiet hours or timezone recalculates pending reminders. | 🟡 |
| D-28 | Scheduler: `node-cron` **every minute**, in the API process (single instance for MVP). Claims rows atomically with `UPDATE … FOR UPDATE SKIP LOCKED`, so even multiple instances would never double-send. | 🟡 |
| D-29 | Retries: max **3 attempts**, backoff **+1 min, +5 min**, only for transient errors (network, HTTP 429, 5xx). HTTP **404/410** from the push service → subscription deleted. | 🟡 |
| D-30 | Grace window **30 minutes**: a pending reminder more than 30 min past its `send_at` (e.g. after downtime) is marked `skipped` (reason `stale`). Never send after the deadline itself has passed. | 🟡 |
| D-31 | A row stuck in `sending` for > 5 min (crash mid-send) returns to `pending` for retry (attempt already counted). | 🟡 |
| D-32 | One reminder fans out to **all** of the user's subscriptions; it counts as `sent` if at least one push service accepts it. | 🟡 |
| D-33 | If the user has notifications disabled or no subscriptions at send time, the reminder is `skipped` with a reason (not retried). | 🟡 |
| D-34 | If a browser endpoint already registered to another account subscribes again, ownership moves to the current user (the browser now belongs to them). The frontend unsubscribes on logout. | 🟡 |

## Engineering

| ID | Decision | Status |
|---|---|---|
| D-35 | Migrations: numbered plain `.sql` files in `backend/migrations/` + a small in-house runner with a `schema_migrations` table; each file runs in a transaction and is checksummed. | ✅ |
| D-36 | Backend tests: **Jest + Supertest**. Reason: the backend is CommonJS, and Jest runs CommonJS with zero config/transforms; Vitest is ESM-first. Frontend test tooling decided in Milestone 7. | 🟡 |
| D-37 | JSON envelope: `{ "success": true, "data": … }` / `{ "success": false, "error": { "code", "message", "fields?" } }`. | 🟡 |
| D-38 | Not-found and not-yours both return **404** for deadlines/subscriptions, so the API never confirms another user's record exists. | 🟡 |
| D-39 | Line endings normalised to LF via `.gitattributes`. | 🟡 |
| D-40 | Frontend styling: CSS Modules + CSS custom properties (design tokens from the brand palette). | 🟡 |

## Still open

| Topic | When it must be decided |
|---|---|
| Backend host and managed PostgreSQL provider (check current pricing/limits) | Milestone 9 |
| Repository visibility (currently public; no secrets committed) | Before any real user data or production secrets |
| Name / domain / handle / trademark checks for "Kheyal" | Before public launch |
| Verify rotation of old Resend credentials from the legacy project | Before public launch |
| Account deletion endpoint and privacy notice | Before public launch (PRD §15) |
