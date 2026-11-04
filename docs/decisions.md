# Kheyal — Architecture Decision Log

Source of truth: `docs/PRD.md` (v1.0, 18 Oct 2026).  
Recording requirement: AGENTS.md (master prompt, CORE RULES §9) and PRD §10 (maintainability).  
Format: one row per decision; status is **Open**, **Decided**, or **Deferred**.

---

## Open decisions (PRD §20)

| ID | Decision | Options / Notes | Status | Decided by |
|----|----------|-----------------|--------|------------|
| D-01 | Working name — domain, social handle, and trademark check | "Kheyal" is the current working name. No check done yet. | Open | — |
| D-04 | Default start-by buffer | How many hours/minutes to subtract from (due − effort) for suggested start-by time. Default 2h proposed in PRD. | Open | — |
| D-05 | Quiet-hours rule for push reminders | Whether reminders scheduled to fire between 23:00–07:00 are held or shifted earlier. Default 23:00 to 07:00. | Open | — |
| D-12 | Old Resend keys rotated + old repo archived | Rotation and archiving confirmation. | Open | — |
| D-13 | Repository visibility | The GitHub repo is currently **public**. Must remain free of any real credentials or secret values. | Open | — |

---

## Decided

| ID | Decision | Date | Rationale / Specification | Decided by |
|----|----------|------|---------------------------|------------|
| D-02 | Local PostgreSQL setup | 2026-11-04 | PostgreSQL 18.6 installed at `C:\Program Files\PostgreSQL\18\bin\psql.exe`. Local database `kheyal_dev` with dedicated least-privilege role `kheyal_app` will be used for development. | Project Owner (Clean-slate directive) |
| D-03 | Auth storage, expiry, and CSRF mitigation | 2026-11-04 | Database-backed sessions. Cryptographically secure random session tokens. Stored only as cryptographic hashes in the PostgreSQL `sessions` table. Sent to browser via HttpOnly, SameSite, Secure persistent cookies with 7-day sliding expiry renewed on activity. Explicit revocation on logout. No raw tokens in database; no tokens in localStorage. Same-origin rewrite proxy (`/api/:path*`) configured in `next.config.js`. | Project Owner (Clean-slate directive §5A) |
| D-06 | CSS approach | 2026-11-04 | CSS Modules + CSS Custom Properties (CSS variables). Notebook color palette: Ink (`#27272A`), Paper (`#F8F5EF`), Lavender (`#8B80A8`), Peach (`#E7A18F`). No external CSS frameworks. | Project Owner (PRD-recommended) |
| D-07 | Test runner | 2026-11-04 | Vitest with `--globals` and Supertest for fast, native ESM/CommonJS backend testing. 57 passing tests across 5 test suites. | Project Owner |
| D-08 | Backend language | 2026-11-04 | Node.js + Express using CommonJS JavaScript initially. | Project Owner (Clean-slate directive §3) |
| D-09 | Next.js router style | 2026-11-04 | Next.js App Router with TypeScript and React 18 in `client/src/app/`. | Project Owner |
| D-10 | Backend and database hosting | 2026-11-05 | Frontend: Vercel with Next.js App Router. Backend: Persistent Node.js hosting (Render / Railway / VPS) so `node-cron` reminder scheduler runs 24/7 without sleeping. Database: Managed PostgreSQL (Neon / Supabase) with SSL support. Same-origin rewrite proxy on Vercel routes `/api/:path*` to the persistent backend, preserving HttpOnly session cookies. | Project Owner (Milestone 9) |
| D-11 | Brand tagline and tone | 2026-11-04 | Tagline: **"Socho. Plan karo. Kar dikhao."** Supporting line: **"Notes, tasks aur deadlines — sab ek jagah."** Tone: natural, student-friendly, non-guilt-inducing Hinglish. | Project Owner (Clean-slate directive §1) |

---

## How to add an entry

1. Add a row to the table above with the next `D-NN` ID.
2. Set status to **Open**.
3. When decided: move the row to **Decided**, fill in the date, rationale, and who decided.
4. Commit with `docs: record decision D-NN …`.
