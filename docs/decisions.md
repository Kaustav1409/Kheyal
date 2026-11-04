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
| D-05 | Quiet-hours rule for push reminders | Whether reminders scheduled to fire between 23:00–07:00 are held or shifted earlier. | Open | — |
| D-06 | CSS approach | CSS Modules + CSS variables (PRD-recommended). | Open | — |
| D-07 | Test runner | Vitest vs Jest. Supertest confirmed for API integration tests. | Open | — |
| D-09 | Next.js router style | App Router vs Pages Router. | Open | — |
| D-10 | Backend and database hosting | Platform for persistent deployment (Railway, Render, Fly.io, etc.). | Open | — |
| D-12 | Old Resend keys rotated + old repo archived | Rotation and archiving confirmation. | Open | — |
| D-13 | Repository visibility | The GitHub repo is currently **public**. Must remain free of any real credentials or secret values. | Open | — |

---

## Decided

| ID | Decision | Date | Rationale / Specification | Decided by |
|----|----------|------|---------------------------|------------|
| D-02 | Local PostgreSQL setup | 2026-11-04 | PostgreSQL 18.6 installed at `C:\Program Files\PostgreSQL\18\bin\psql.exe`. Local database `kheyal_dev` with dedicated least-privilege role `kheyal_app` will be used for development. | Project Owner (Clean-slate directive) |
| D-03 | Auth storage, expiry, and CSRF mitigation | 2026-11-04 | Database-backed sessions. Cryptographically secure random session tokens. Stored only as cryptographic hashes in the PostgreSQL `sessions` table. Sent to browser via HttpOnly, SameSite, Secure persistent cookies with 7-day sliding expiry renewed on activity. Explicit revocation on logout. No raw tokens in database; no tokens in localStorage. | Project Owner (Clean-slate directive §5A) |
| D-08 | Backend language | 2026-11-04 | Node.js + Express using CommonJS JavaScript initially. | Project Owner (Clean-slate directive §3) |
| D-11 | Brand tagline and tone | 2026-11-04 | Tagline: **"Socho. Plan karo. Kar dikhao."** Supporting line: **"Notes, tasks aur deadlines — sab ek jagah."** Tone: natural, student-friendly, non-guilt-inducing Hinglish. | Project Owner (Clean-slate directive §1) |

---

## How to add an entry

1. Add a row to the table above with the next `D-NN` ID.
2. Set status to **Open**.
3. When decided: move the row to **Decided**, fill in the date, rationale, and who decided.
4. Commit with `docs: record decision D-NN …`.
