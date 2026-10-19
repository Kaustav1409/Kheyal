# Kheyal — API Contract (Phase A)

Express API. In production the browser calls it through Next.js at `/api/...` (the proxy strips `/api`), so `POST /api/auth/login` reaches Express as `POST /auth/login`.

## 1. Conventions

| Topic | Rule |
|---|---|
| Format | JSON request and response bodies (`Content-Type: application/json`), body limit 20 kB |
| Success envelope | `{ "success": true, "data": … }` |
| Error envelope | `{ "success": false, "error": { "code": "…", "message": "…", "fields": { … } } }` — `fields` only for validation errors |
| Timestamps | ISO-8601 UTC, e.g. `"2026-10-25T11:30:00.000Z"`. Date-only input: `"2026-10-25"` |
| Auth | `kheyal_session` HttpOnly cookie (set by signup/login) |
| CSRF | `POST`/`PATCH`/`DELETE` must send an `Origin` header equal to the frontend origin, else `403 FORBIDDEN_ORIGIN` |
| Ownership | Records not owned by the caller behave as non-existent → `404` |
| Errors never include | stack traces, SQL, tokens, passwords, internal paths |

### Error codes

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod validation failed (`fields` explains each problem) |
| 400 | `PARSE_FAILED` | Natural-language text has no recognisable date |
| 401 | `UNAUTHENTICATED` | Missing, invalid, or expired session |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password (same message for both) |
| 403 | `FORBIDDEN_ORIGIN` | CSRF origin check failed |
| 404 | `NOT_FOUND` | Unknown route, or record missing / not owned |
| 409 | `EMAIL_TAKEN` | Signup with an existing email |
| 429 | `RATE_LIMITED` | Too many auth attempts |
| 500 | `INTERNAL_ERROR` | Anything unexpected (details only in server logs, sanitised) |

## 2. Public

### `GET /health`

```json
200 { "success": true, "data": { "status": "ok", "database": "ok" } }
503 { "success": false, "error": { "code": "UNAVAILABLE", "message": "Service temporarily unavailable." } }
```

No versions, hostnames, or error details.

## 3. Auth

### `POST /auth/signup` · rate-limited

```json
// request
{ "email": "riya@college.edu", "password": "min 8 chars", "timezone": "Asia/Kolkata" }
// 201 + Set-Cookie: kheyal_session=…
{ "success": true, "data": { "user": { "id": "uuid", "email": "riya@college.edu", "timezone": "Asia/Kolkata" } } }
```

Errors: `400 VALIDATION_ERROR`, `409 EMAIL_TAKEN`, `429 RATE_LIMITED`. Creates default preferences row.

### `POST /auth/login` · rate-limited

```json
{ "email": "riya@college.edu", "password": "…" }
// 200 + Set-Cookie
{ "success": true, "data": { "user": { "id": "uuid", "email": "…", "timezone": "Asia/Kolkata" } } }
```

Errors: `400`, `401 INVALID_CREDENTIALS`, `429`.

### `POST /auth/logout` · authenticated

Deletes the session row and clears the cookie. `204 No Content`.
*(Added to the PRD list — required for a revocable session.)*

## 4. Current user

### `GET /me`

```json
{ "success": true, "data": { "user": { "id": "uuid", "email": "…", "timezone": "Asia/Kolkata", "createdAt": "…" } } }
```

### `GET /me/preferences`

```json
{ "success": true, "data": { "preferences": {
  "notificationsEnabled": true,
  "quietHoursEnabled": true,
  "quietStart": "23:00",
  "quietEnd": "07:00",
  "startByBufferMinutes": 120,
  "timezone": "Asia/Kolkata"
} } }
```

### `PATCH /me/preferences`

Partial body with any of the fields above. Rules: times `HH:MM`, `quietStart ≠ quietEnd`, quiet window ≤ 12 h, buffer 0–1440, timezone must be valid IANA. Changing quiet hours or timezone **recalculates pending reminders**. Returns the full updated preferences.

## 5. Deadlines

### Deadline object (as returned)

```json
{
  "id": "uuid",
  "title": "DBMS assignment",
  "subject": "DBMS",
  "dueAt": "2026-10-25T11:30:00.000Z",
  "hasDueTime": true,
  "effortHours": 6,
  "status": "active",
  "isOverdue": false,
  "completedAt": null,
  "createdAt": "…",
  "updatedAt": "…"
}
```

### `POST /deadlines/parse` · **never writes to the database**

```json
// request
{ "text": "DBMS assignment due 25/10 5pm 6h" }
// 200
{ "success": true, "data": { "preview": {
  "title": "DBMS assignment",
  "subject": null,
  "dueAt": "2026-10-25T11:30:00.000Z",
  "dueDate": "2026-10-25",
  "hasDueTime": true,
  "effortHours": 6,
  "display": { "due": "Sun, 25 Oct 2026, 5:00 PM", "timezone": "Asia/Kolkata" },
  "warnings": [],
  "reminderPreview": [
    { "kind": "48h", "sendAt": "2026-10-23T11:30:00.000Z" },
    { "kind": "24h", "sendAt": "2026-10-24T11:30:00.000Z" },
    { "kind": "6h",  "sendAt": "2026-10-25T05:30:00.000Z" }
  ]
} } }
```

Warning codes: `TIME_ASSUMED` (date only → 23:59, reminders night-before/morning-of), `AMBIGUOUS_NUMERIC_DATE` (e.g. `05/11` read day-first as 5 Nov), `DATE_IN_PAST`, `EFFORT_MISSING`, `REMINDER_SKIPPED` (offset already past), `REMINDER_MOVED_QUIET_HOURS`.
Errors: `400 PARSE_FAILED` with a friendly message, e.g. "Date samajh nahi aayi — try '25 Oct 5pm'".

### `POST /deadlines` · create confirmed deadline

```json
// timed
{ "title": "DBMS assignment", "subject": "DBMS", "dueAt": "2026-10-25T11:30:00.000Z", "effortHours": 6 }
// date-only (server sets 23:59 local, hasDueTime=false)
{ "title": "Lab record", "dueDate": "2026-10-25" }
```

Exactly one of `dueAt` / `dueDate`. `201` with `{ deadline, reminders: [{ kind, sendAt, status }] }`. Deadline + reminders are inserted in **one transaction**.

### `GET /deadlines?status=upcoming|overdue|completed|all`

Default `upcoming` (active, not yet due). Sorted: upcoming/overdue by `dueAt` ascending, completed by `completedAt` descending. Returns `{ deadlines: [...] }`.

### `GET /deadlines/next`

```json
{ "success": true, "data": {
  "now": "2026-10-23T04:00:00.000Z",
  "bufferMinutes": 120,
  "next": { "...deadline": "…", "ranking": { "…": "see below" } },
  "ranked": [ { "...deadline": "…", "ranking": {
      "hoursUntilDue": 55.5,
      "slackHours": 49.5,
      "startBy": "2026-10-25T03:30:00.000Z",
      "startByPassed": false,
      "needsEstimate": false,
      "reason": "Slack 49.5h · due Sun 5:00 PM · ~6h of work"
  } } ],
  "overdue": [ { "...deadline": "…", "ranking": { "hoursOverdue": 3.2 } } ]
} }
```

Completed tasks are excluded. `next` is the first of `ranked` (or `null`). Overdue tasks are listed separately and never hidden.

### `PATCH /deadlines/:id` · owner only

Partial body: `title`, `subject` (or `null`), `dueAt` | `dueDate`, `effortHours` (or `null`), `status: "completed" | "active"`.

| Change | Reminder effect |
|---|---|
| `dueAt` / `dueDate` changed | cancel pending → regenerate |
| `status: "completed"` | set `completedAt`, cancel pending |
| `status: "active"` (reopen) | clear `completedAt`, regenerate future reminders |
| title / subject / effort only | none |

Returns `{ deadline, reminders }`. `404` if not found / not owned.

### `DELETE /deadlines/:id` · owner only

`204`. Reminders are removed with the deadline. `404` if not found / not owned.

## 6. Push

### `GET /push/public-key` · authenticated

`{ "publicKey": "<VAPID public key>" }` — the public key is safe to share; the private key never leaves the server. *(Added to the PRD list so the key has one source of truth.)*

### `POST /push/subscribe`

```json
{ "endpoint": "https://fcm.googleapis.com/…", "keys": { "p256dh": "…", "auth": "…" } }
```

Upsert by endpoint, assigned to the current user (`D-34`). `201`.

### `DELETE /push/subscribe`

`{ "endpoint": "https://…" }` → `204`. Only deletes the caller's own subscription; otherwise `404`.

## 7. Planned later (not Phase A core)

| Endpoint | Purpose | When |
|---|---|---|
| `POST /reminders/:id/opened` | Record notification tap (FR-16, Should) | Milestone 8 |
| `POST /auth/logout-all` | Revoke every session | Milestone 4 or 7 |
| `DELETE /me` | Delete account and all data | Before public launch |
