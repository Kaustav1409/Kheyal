# Kheयाl (Kheyal)

> **"Socho. Plan karo. Kar dikhao."**  
> *Plan Smart. Move Forward.*  
> Notes, tasks aur deadlines — sab ek jagah.

Kheyal is a modern, student-focused productivity and deadline workspace. It is purpose-built to eliminate student deadline panic through low-friction single-line natural language capture, mandatory preview confirmation, dynamic slack-based prioritization ("Do this next"), suggested start-by times, and reliable 48h/24h/6h Web Push reminders.

**Source of Truth:** [`docs/PRD.md`](docs/PRD.md) (v1.0, 18 Oct 2026).

---

## 1. Core Product Capabilities (Phase A MVP)

- **⚡ Screen 1: One-Line Natural Language Capture (`/add`)**
  - Type naturally: e.g. `"Complete DBMS lab assignment by tomorrow 5 PM ~3h"`
  - Day-first date parsing (`05/11` is 5th November, not May 11th).
  - Effort extraction (`~3h`, `2.5 hours`).
  - Mandatory editable **`ParsePreviewCard`** before saving to guarantee zero surprise misparses.
  - Form fallback option for manual entry.
- **🎯 Screen 2: "Do This Next" Intelligence (`/`)**
  - Explanatory urgency reasoning powered by dynamic slack time:  
    $$\text{Slack} = \text{Hours until Due} - \text{Estimated Effort Remaining}$$
  - Smaller slack ranks first; ties go to earlier due dates; overdue tasks surfaced at the top.
  - Honest missing effort handling: asks student for an estimate rather than fabricating numbers.
  - Suggested start-by recommendation ($\text{Start-by} = \text{Due} - \text{Effort} - 2\text{h buffer}$) with clear disclaimer: *"Yeh ek suggestion hai, promise nahi."*
  - One-tap completion with an interactive **5-second undo toast**.
- **📋 Screen 3: All Deadlines (`/deadlines`)**
  - Segmented status tabs (`Upcoming`, `Overdue`, `Completed`).
  - Subject filter dropdown and interactive status toggles.
  - In-place modal editing and delete confirmation dialogs.
- **⚙️ Screen 4: Settings & PWA Integration (`/settings`)**
  - Master Web Push notification toggle with browser permission indicator.
  - Instant "🔔 Send Test Notification" trigger.
  - Quiet hours configuration (23:00 to 07:00).
  - Configurable start-by planning buffer slider (0h to 6h, default 2h).
  - Add-to-Home-Screen installation guidance for Android, iOS, and Desktop.

---

## 2. Locked Architecture & Technology Stack

| Layer | Technology | Key Responsibility |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + React 18 + TypeScript | Screen flows, PWA service worker, responsive notebook design system. |
| **Styling** | CSS Modules + CSS Custom Properties | Zero runtime CSS overhead. Palette: Ink (`#27272A`), Paper (`#F8F5EF`), Lavender (`#8B80A8`), Peach (`#E7A18F`). |
| **API Proxy** | Next.js Edge Rewrites (`client/next.config.js`) | Proxies `/api/:path*` to Express, guaranteeing 100% reliable first-party `HttpOnly` cookie delivery. |
| **Backend API** | Node.js + Express (CommonJS) | Authentication, ownership verification, Zod validation, deadline CRUD, scheduling intelligence. |
| **Database** | PostgreSQL 18 with parameterized SQL only | Strict schema isolation, least-privilege `kheyal_app` role, transaction-wrapped migration runner. |
| **Session Security** | 256-bit crypto tokens + SHA-256 DB hashing | Raw tokens never stored in database or logged; delivered via `HttpOnly`, `SameSite=Lax`, `Secure` cookies with 7-day sliding renewal. |
| **NLP Parsing** | `chrono-node` (en-GB day-first) + Custom Regex | Extracts due date, due time, effort, and flags ambiguous dates with plain English warnings. |
| **Background Scheduler** | `node-cron` + `web-push` (VAPID) | Persistent background worker runs every 60s; atomically claims due rows via `FOR UPDATE SKIP LOCKED`; 15-min restart grace window; dead endpoint auto-pruning (404/410). |
| **Testing** | Vitest + Supertest | Unit, repository, service, worker, and API integration tests. |

---

## 3. Repository Structure

```text
Kheyal/
├── client/                        # Next.js 14 Frontend Application
│   ├── public/
│   │   ├── manifest.json          # PWA Manifest (standalone display)
│   │   ├── sw.js                  # Service Worker (push events & click routing)
│   │   └── icons/                 # Notebook-themed PWA icons (192x192, 512x512)
│   ├── src/
│   │   ├── app/                   # App Router: /, /add, /deadlines, /settings, /login, /signup
│   │   ├── components/            # HeroTaskCard, DeadlineCard, ParsePreviewCard, Toast, Skeleton, Navbar
│   │   ├── context/               # AuthContext (user, login, signup, logout)
│   │   ├── lib/                   # api.ts, pwa.ts, dateUtils.ts
│   │   └── styles/                # variables.css (tokens), globals.css
│   ├── next.config.js             # Same-origin API rewrite proxy
│   └── tsconfig.json              # Strict TypeScript config
│
├── server/                        # Express API & Background Reminder Worker
│   ├── src/
│   │   ├── config/                # db.js (PostgreSQL pool & SSL), push.js (VAPID config)
│   │   ├── controllers/           # auth, deadlines, push controllers
│   │   ├── db/                    # migrate.js (custom transaction runner), migrations/ (001-005)
│   │   ├── jobs/                  # reminderWorker.js (atomic claiming), scheduler.js (node-cron)
│   │   ├── middleware/            # auth.js (requireAuth session validation), errorHandler.js, validate.js
│   │   ├── repositories/          # user, session, deadline, reminder, pushSubscription repositories
│   │   ├── routes/                # health, auth, deadline, push routers
│   │   ├── services/              # deadlineService, parsingService, reminderScheduleService
│   │   └── validators/            # Zod validation schemas
│   ├── scripts/                   # setup-db.sql, pilot-metrics.sql
│   └── tests/                     # Vitest test suites (63 tests across 6 suites)
│
└── docs/                          # Comprehensive Engineering & Product Documentation
    ├── PRD.md                     # Binding product requirements (v1.0)
    ├── architecture.md            # System architecture & component responsibilities
    ├── database.md                # PostgreSQL schema & entity relationships
    ├── api-contract.md            # REST API endpoints & request/response contracts
    ├── screens.md                 # UI/UX specifications for Screens 1–4
    ├── decisions.md               # Architecture Decision Log (D-01 to D-13)
    ├── deployment.md              # Production runbook (Vercel + Render + Neon/Supabase)
    ├── pilot-protocol.md          # 2-week validation pilot protocol with 5 students
    ├── validation-metrics.md      # Quantitative benchmarks & roadmap decision thresholds
    └── user-interviews.md         # Structured student interview question guides
```

---

## 4. Local Development Quickstart

### Prerequisites
- Node.js $\ge$ v20.x and npm $\ge$ 10.x
- PostgreSQL $\ge$ 16 (Local instance or cloud connection string)

### 1. Database Setup
```bash
# Connect to PostgreSQL as superuser and create least-privilege role & dev database
psql -U postgres -f server/scripts/setup-db.sql
```

### 2. Backend Setup & Migrations
```bash
cd server
cp .env.example .env
npm install

# Run database migrations
npm run migrate

# Run test suite (63 tests)
npm test

# Start Express API server & reminder scheduler (port 5000)
npm start
```

### 3. Frontend Setup
```bash
cd ../client
cp .env.example .env.local
npm install

# Build static production bundle
npm run build

# Start Next.js client (port 3000)
npm run dev
```

Open **`http://localhost:3000`** in your browser!

---

## 5. Verified Milestone Roadmap

| Step | Milestone | Description | Git Tag | Commit | Status |
|---|---|---|---|---|---|
| **01** | **Setup** | Architecture baseline, clean git structure, toolchain inspection | `step-01-setup` | `76e22f3` | ✅ Verified |
| **02** | **Database** | PostgreSQL migrations, least-privilege role, transaction runner | `step-02-database` | `8851f37` | ✅ Verified |
| **03** | **Auth** | Database-backed sessions, 256-bit crypto tokens, HttpOnly cookies | `step-03-auth` | `d581889` | ✅ Verified |
| **04** | **Deadlines** | Scoped CRUD APIs, Zod validators, two-user ownership isolation | `step-04-deadlines` | `704f950` | ✅ Verified |
| **05** | **Intelligence** | Day-first chrono parsing, slack ranking, start-by math, schedules | `step-05-intelligence` | `48deef1` | ✅ Verified |
| **06** | **Reminders** | Background worker, `SKIP LOCKED` atomic claiming, VAPID Web Push | `step-06-reminders` | `2bc870e` | ✅ Verified |
| **07** | **Frontend** | Next.js 14 App Router, notebook design system, Screens 1–4 | `step-07-frontend` | `9528ac1` | ✅ Verified |
| **08** | **PWA** | Manifest, service worker push/click handlers, device install | `step-08-pwa` | `5e473d7` | ✅ Verified |
| **09** | **Deployment** | Vercel proxy, cloud PostgreSQL SSL, deploy scripts, runbook | `step-09-deployment` | `ca19fe1` | ✅ Verified |
| **10** | **Validation** | 2-week pilot protocol (5 students), metrics SQL, interview guides | `step-10-validation` | *(Current)* | ✅ Verified |

---

## 6. License & Security Notice

- Public repository: **Zero real credentials, passwords, or keys may ever be committed.**
- Environment templates (`.env.example`) contain safe documentation placeholders only.
- Designed & built from scratch for students with ❤️.
