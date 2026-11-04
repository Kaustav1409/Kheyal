# Kheyal — Database Schema and Migration Design

**Source of Truth:** [`docs/PRD.md`](PRD.md) and [`docs/architecture.md`](architecture.md)  
**Database Engine:** PostgreSQL 18  
**Access Layer:** `pg` (node-postgres) with parameterized queries only  
**Application Role:** `kheyal_app` (least-privilege)  
**Timezone Standard:** All database timestamps stored in UTC (`TIMESTAMPTZ`)

---

## 1. Schema Overview

```text
┌─────────────────┐       ┌─────────────────┐
│      users      │◄──────│    sessions     │
└────────┬────────┘       └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌──────────────────────┐
│    deadlines    │◄──────│  push_subscriptions  │
└────────┬────────┘       └──────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│    reminders    │
└─────────────────┘
```

---

## 2. Table Specifications

### A. `users`
Stores student accounts and local preferences.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique user identifier |
| `email` | `VARCHAR(255)` | `NOT NULL UNIQUE` | User email address (lowercased) |
| `password_hash` | `VARCHAR(255)` | `NULL` | Bcrypt password hash (nullable for OAuth accounts) |
| `timezone` | `VARCHAR(64)` | `NOT NULL DEFAULT 'Asia/Kolkata'` | IANA timezone string for reminder rendering |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Account creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Account last update timestamp |

### B. `sessions`
Database-backed session storage implementing 7-day sliding expiry.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique session record ID |
| `user_id` | `UUID` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | Associated user |
| `token_hash` | `CHAR(64)` | `NOT NULL UNIQUE` | SHA-256 hash of the 256-bit session token |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Rolling expiration timestamp (now + 7 days) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Session establishment timestamp |
| `last_activity_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Timestamp of last qualifying authenticated request |
| `revoked_at` | `TIMESTAMPTZ` | `NULL` | Explicit logout/revocation timestamp |

**Indexes:**
- `CREATE INDEX idx_sessions_token_hash ON sessions(token_hash) WHERE revoked_at IS NULL;`
- `CREATE INDEX idx_sessions_user_id ON sessions(user_id);`

### C. `deadlines`
Core academic and personal deadline records.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique deadline ID |
| `user_id` | `UUID` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | Task owner |
| `title` | `VARCHAR(255)` | `NOT NULL` | Task title (e.g. "DBMS Assignment 3") |
| `subject` | `VARCHAR(100)` | `NULL` | Subject or course tag (e.g. "Database Systems") |
| `due_at` | `TIMESTAMPTZ` | `NULL` | UTC due timestamp (for date-only tasks: 23:59 local in UTC) |
| `has_due_time` | `BOOLEAN` | `NOT NULL DEFAULT true` | `true` = explicit time set; `false` = date-only; `NULL` due_at = undated |
| `effort_hours` | `NUMERIC(4, 1)` | `NULL CHECK (effort_hours > 0)` | Estimated completion effort in hours |
| `status` | `VARCHAR(20)` | `NOT NULL DEFAULT 'active'` | State: `'active'`, `'completed'` |
| `completed_at` | `TIMESTAMPTZ` | `NULL` | Timestamp when marked completed |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Last update timestamp |

**Indexes:**
- `CREATE INDEX idx_deadlines_user_status ON deadlines(user_id, status);`
- `CREATE INDEX idx_deadlines_user_due_at ON deadlines(user_id, due_at);`

### D. `reminders`
Individually scheduled notification events.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique reminder ID |
| `deadline_id` | `UUID` | `NOT NULL REFERENCES deadlines(id) ON DELETE CASCADE` | Associated deadline |
| `kind` | `VARCHAR(20)` | `NOT NULL` | `'48h'`, `'24h'`, `'6h'`, `'night_before'`, `'morning_of'` |
| `send_at` | `TIMESTAMPTZ` | `NOT NULL` | Scheduled UTC dispatch timestamp |
| `status` | `VARCHAR(20)` | `NOT NULL DEFAULT 'pending'` | `'pending'`, `'processing'`, `'sent'`, `'failed'`, `'cancelled'`, `'skipped'` |
| `attempts` | `INTEGER` | `NOT NULL DEFAULT 0` | Dispatch attempt count |
| `sent_at` | `TIMESTAMPTZ` | `NULL` | Actual delivery timestamp |
| `error_details` | `TEXT` | `NULL` | Error log if dispatch failed |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp |

**Indexes:**
- `CREATE INDEX idx_reminders_claimable ON reminders(send_at, status) WHERE status = 'pending';`
- `CREATE INDEX idx_reminders_deadline_id ON reminders(deadline_id);`

### E. `push_subscriptions`
Web Push browser client registrations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique subscription ID |
| `user_id` | `UUID` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | Subscribed user |
| `endpoint` | `TEXT` | `NOT NULL UNIQUE` | Browser push service endpoint URL |
| `p256dh` | `TEXT` | `NOT NULL` | Client public encryption key |
| `auth` | `TEXT` | `NOT NULL` | Client authentication secret |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Registration timestamp |

**Indexes:**
- `CREATE INDEX idx_push_subs_user_id ON push_subscriptions(user_id);`

### F. `schema_migrations`
Tracks executed database migrations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` | Migration run order |
| `name` | `VARCHAR(255)` | `NOT NULL UNIQUE` | Migration filename (e.g. `001_create_users.sql`) |
| `applied_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Execution timestamp |

---

## 3. Migration Runner Design

Migrations reside in `server/migrations/` as numbered SQL files:
1. `001_create_users.sql`
2. `002_create_sessions.sql`
3. `003_create_deadlines.sql`
4. `004_create_reminders.sql`
5. `005_create_push_subscriptions.sql`

The migration runner:
- Connects using `pg.Pool`.
- Creates `schema_migrations` if missing.
- Reads files in sorted lexicographical order.
- Executes each unapplied migration inside an isolated `BEGIN ... COMMIT` transaction.
- Aborts safely on failure and outputs detailed diagnostic context.

---

## 4. Least-Privilege Application Role (`kheyal_app`)

To prevent unauthorized schema modification or data corruption:
- Application queries run as `kheyal_app`.
- Permissions granted: `SELECT`, `INSERT`, `UPDATE`, `DELETE` on all tables, and `USAGE, SELECT` on all sequences.
- DDL operations (`CREATE`, `ALTER`, `DROP`) are executed only by the migration runner during deployment or setup.

