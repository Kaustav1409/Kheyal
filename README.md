# Kheyal

> **Socho. Plan karo. Kar dikhao.**  
> Notes, tasks aur deadlines — sab ek jagah.

Kheyal is a student-focused deadline and productivity workspace. The Phase A (MVP) release delivers fast deadline capture, natural-language parsing with preview confirmation, reliable push reminders (48h / 24h / 6h, plus night-before / morning-of for date-only deadlines), an explainable ranked "Do this next" task view based on urgency slack, and suggested start-by times.

Source of truth: [`docs/PRD.md`](docs/PRD.md) (v1.0, 18 Oct 2026).

---

## Current Status

- **Active Milestone:** Milestone 1 (Clean Setup & Architecture Baseline) — **Completed**
- **Next Milestone:** Milestone 2 (PostgreSQL Foundation & Migrations)

| Component | Stack | Status |
|---|---|---|
| **Frontend** | Next.js + React + TypeScript in `client/` (PWA, Vercel) | Clean baseline established |
| **Backend** | Node.js + Express in `server/` (CommonJS) | Clean baseline established |
| **Database** | PostgreSQL 18.6 (`kheyal_dev`, role `kheyal_app`) | Installed & verified locally |
| **Specs & Docs** | PRD, Architecture, Database Schema, API Contract | Documented in `docs/` |

---

## Stack (Locked)

- **Frontend:** Next.js, React, TypeScript, CSS Modules, CSS Variables, Service Worker / PWA.
- **Backend:** Node.js, Express, JavaScript (CommonJS), node-postgres (`pg`), Zod, bcrypt, chrono-node, node-cron, web-push (VAPID).
- **Database:** PostgreSQL with parameterized SQL only.
- **Testing:** Supertest, Vitest / Jest.

---

## Repository Structure

```text
Kheyal/
├── client/          # Next.js frontend application (PWA)
├── server/          # Express API server & background scheduler
├── docs/            # Product requirements, architecture, DB schema, API contract
├── .env.example     # Environment template with safe placeholders
├── .gitignore       # Strict rules blocking secrets, builds, and dependencies
└── README.md
```

---

## Security & Secrets Policy

This repository is **public**. Never commit `.env` files, actual passwords, database connection strings with credentials, private keys, or VAPID secrets. All configuration must be supplied via local environment variables based on `.env.example`.
