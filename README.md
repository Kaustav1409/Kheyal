# Kheyal

> **Socho. Plan karo. Kar dikhao.**
> Notes, tasks aur deadlines — sab ek jagah.

Kheyal is a student-focused productivity workspace. The first release (Phase A) is a focused **deadline-management MVP**: quick deadline capture, reliable reminders (48h / 24h / 6h), a ranked "Do this next" view, estimated effort, and suggested start-by times.

> "Kheyal" is a working name. Domain, social-handle, app-store, and trademark availability have **not** been verified.

## Status

Milestone 1 (setup and baseline) — done. Milestone 2 (design and contracts) — documented in [`docs/`](docs/).

| Area | State |
|---|---|
| Backend (Express) | `GET /health` works locally |
| Database (PostgreSQL 18) | Local `kheyal_dev` reachable via least-privilege role `kheyal_app`; schema designed, not yet migrated |
| Frontend (Next.js) | Not started |
| Auth, deadlines, reminders, push | Not started |

## Tech stack

- **Frontend:** Next.js + React + TypeScript (planned; hosted on Vercel). Vite is intentionally not used.
- **Backend:** Node.js + Express (CommonJS), Zod, bcrypt, chrono-node, web-push, node-cron.
- **Database:** PostgreSQL via `pg` (node-postgres), parameterized SQL only.

## Repository layout

```text
Kheyal/
├── backend/
│   ├── scripts/db/
│   │   ├── create-app-role.sql   # one-time DB bootstrap (run as postgres)
│   │   └── check-connection.js   # read-only connectivity diagnostic
│   ├── src/server.js             # Express entry point
│   ├── .env.example              # placeholder config template (committed)
│   └── package.json
├── docs/
│   ├── decisions.md              # every decision, decided vs proposed vs open
│   ├── architecture.md           # components, layers, flows, reminder lifecycle
│   ├── database.md               # ER diagram, draft DDL, migrations
│   ├── api-contract.md           # endpoints, payloads, error codes
│   └── screens.md                # screen flows, UX states, notification copy
├── .gitattributes
├── .gitignore
└── README.md
```

## Local development setup (Windows)

All commands below are **PowerShell**.

### Prerequisites

- Node.js 22+ and npm
- Git
- PostgreSQL 18 (Windows service running on `localhost:5432`)

`psql` is not on PATH by default; the examples call it by full path.

### 1. Install backend dependencies

Working directory: `D:\PROJECTS\Kheyal\backend`

```powershell
npm install
```

### 2. Create the database (once)

Working directory: `D:\PROJECTS\Kheyal`

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -d postgres -c "CREATE DATABASE kheyal_dev;"
```

### 3. Create the least-privilege app role (once)

Working directory: `D:\PROJECTS\Kheyal`

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -d kheyal_dev -f backend/scripts/db/create-app-role.sql
```

You will be prompted for the `postgres` password, then asked to choose a password for `kheyal_app`. The application **never** connects as `postgres`.

### 4. Configure environment variables

Working directory: `D:\PROJECTS\Kheyal\backend`

```powershell
Copy-Item .env.example .env
```

Open `backend/.env` and set `PGPASSWORD` to the `kheyal_app` password. `.env` is git-ignored — never commit it.

### 5. Verify the database connection

Working directory: `D:\PROJECTS\Kheyal\backend`

```powershell
npm run db:check
```

Expected: `✓ Connected to PostgreSQL`, user `kheyal_app`, schema `kheyal`, and `✓ Not a superuser`.

### 6. Run the API

Working directory: `D:\PROJECTS\Kheyal\backend`

```powershell
npm run dev
```

Then open <http://localhost:5000/health>.

## Backend scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the API with auto-restart (nodemon) |
| `npm start` | Start the API with plain Node |
| `npm run db:check` | Read-only PostgreSQL connectivity check |

## Security notes

- Secrets live only in `backend/.env` (git-ignored). `backend/.env.example` contains placeholders only.
- The app uses the non-superuser `kheyal_app` role, limited to `kheyal_dev` and its own `kheyal` schema.
- Never paste passwords, tokens, or keys into issues, commits, or chat.
