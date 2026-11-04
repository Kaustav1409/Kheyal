# Kheyal — Production Deployment & Operations Runbook

This guide details the step-by-step production deployment for **Kheyal** ("Plan Smart. Move Forward. / Socho. Plan karo. Kar dikhao.") adhering strictly to PRD §11, §12, §15, and Decision D-10.

---

## 1. System Architecture Overview

```text
┌────────────────────────────────┐
│  Client Device / Browser (PWA) │
└──────────────┬─────────────────┘
               │ HTTPS (Same-Origin)
               ▼
┌────────────────────────────────┐
│   Vercel Edge (Next.js 14)     │
│   https://kheyal.vercel.app    │
└──────────────┬─────────────────┘
               │ Internal Reverse Proxy: /api/:path* -> BACKEND_URL
               ▼
┌────────────────────────────────┐       Scheduled Tasks (node-cron)
│  Persistent Backend (Express)  │ ────► Atomic Claiming (SKIP LOCKED)
│  Render / Railway / VPS        │ ────► VAPID Web Push Delivery
└──────────────┬─────────────────┘
               │ TLS Encrypted (DATABASE_SSL=true)
               ▼
┌────────────────────────────────┐
│  Managed PostgreSQL 18 / 16    │
│  Neon / Supabase / Railway     │
└────────────────────────────────┘
```

> [!IMPORTANT]
> **Why the Backend Must Run on a Persistent Host:**
> PRD §11 and §12 explicitly mandate that reminder scheduling runs independently of browser clients. Serverless functions (like Vercel Serverless or AWS Lambda) go to sleep after request execution and cannot run continuous background cron ticks. The backend **must** be deployed to a persistent runtime (e.g. Render Web Service, Railway, Fly.io, or a Linux VPS) so `node-cron` checks for due reminders every 60 seconds without interruption.

---

## 2. Step-by-Step Deployment Guide

### Part 1: Provisioning Cloud PostgreSQL (Neon / Supabase)

1. **Create Database:**
   - Go to [Neon Console](https://console.neon.tech/) or [Supabase](https://supabase.com/).
   - Create a new project named `kheyal-prod`.
   - Copy the connection string (with pooled connection or direct connection).
   - Format: `postgresql://user:password@ep-sample-123.us-east-2.aws.neon.tech/neondb?sslmode=require`

2. **Verify Database Connectivity Locally (Optional):**
   ```bash
   DATABASE_URL="your-neon-connection-string" npm run migrate
   ```
   All 5 migration files (`001` through `005`) will be applied within an atomic transaction.

---

### Part 2: Generating Production VAPID Keys

Web Push requires server identification keys:
```bash
npx web-push generate-vapid-keys
```
Output will contain:
- **Public Key:** Base64 URL-encoded public key.
- **Private Key:** Base64 URL-encoded private key (Keep private! Never commit!).

---

### Part 3: Deploying Express Backend (Render / Railway)

#### On Render (Recommended for Simple Setup):
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Select your GitHub repository: `https://github.com/Kaustav1409/Kheyal`.
4. Configure service details:
   - **Name:** `kheyal-api`
   - **Region:** Singapore / Frankfurt / Oregon (nearest to target students)
   - **Root Directory:** `server`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm run deploy` *(Note: `npm run deploy` runs `npm run migrate` before starting Express!)*
5. Configure **Environment Variables** in Render Dashboard:
   | Variable | Value / Description |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `5000` (or `10000` on Render) |
   | `DATABASE_URL` | `postgresql://user:pass@ep-sample.neon.tech/neondb?sslmode=require` |
   | `DATABASE_SSL` | `true` |
   | `SESSION_SECRET` | 64-character random hex string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
   | `FRONTEND_ORIGIN` | `https://kheyal.vercel.app` (your Vercel frontend URL) |
   | `VAPID_PUBLIC_KEY` | Your production VAPID public key |
   | `VAPID_PRIVATE_KEY` | Your production VAPID private key |
   | `VAPID_SUBJECT` | `mailto:support@kheyal.app` |
6. Click **Create Web Service**.
7. Once deployed, note your service URL (e.g. `https://kheyal-api.onrender.com`).
8. Verify health endpoint: `curl https://kheyal-api.onrender.com/health` $\rightarrow$ `{"status":"ok",...}`.

---

### Part 4: Deploying Next.js Frontend (Vercel)

1. Log in to [Vercel Dashboard](https://vercel.com/).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your GitHub repository: `https://github.com/Kaustav1409/Kheyal`.
4. Configure project settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** Click "Edit" and choose `client`
5. Configure **Environment Variables**:
   | Variable | Value |
   |---|---|
   | `BACKEND_URL` | `https://kheyal-api.onrender.com` (your deployed backend URL, without trailing slash) |
6. Click **Deploy**.
7. Vercel will compile static routes, bundle assets, and deploy to a production URL (e.g. `https://kheyal.vercel.app`).

---

## 3. Smoke Testing & Verification Checklist

Complete the following verification steps on production:

| Step | Test Action | Expected Result |
|---|---|---|
| 1 | Navigate to `https://kheyal.vercel.app/` | Redirects to `/login` with clean notebook aesthetic. |
| 2 | Open `/signup` and create account | Account created, automatic timezone detected, redirected to `/`. |
| 3 | Inspect Cookies in DevTools | `kheyal_session` cookie present with `HttpOnly`, `SameSite=Lax`, and `Secure` flags. |
| 4 | Open `/add` and type: `"DBMS Project by tomorrow 5 PM ~3h"` | Instant preview card renders title, subject, due time, and effort. |
| 5 | Click **Confirm & Save Deadline** | Redirected to `/`, top card shows `#1 DO THIS NEXT` with peach border and slack countdown. |
| 6 | Open `/settings` and toggle **Browser Push Notifications** | Native browser permission prompt appears; toggle turns active. |
| 7 | Click **Send Test Notification** | Native system push notification displays with title, sound/vibration, and icon. |
| 8 | Click the notification | Window focuses and opens `/settings`. |
| 9 | Click **✓ Ho gaya! Mark as Done** on home card | Task marked completed; 5-second undo toast appears; clicking Undo restores task. |
| 10 | Open `/deadlines` | Tabs (`Upcoming`, `Overdue`, `Completed`) display accurate lists with subject filter. |

---

## 4. Security & Maintenance Rules

- **Zero Secrets in Git:** Never commit any `.env` file to the GitHub repository. All keys are managed strictly via the Vercel and Render/Railway dashboards.
- **Database Backups:** Enable automated daily backups in Neon/Supabase console.
- **Log Hygiene:** Ensure `DEBUG_SQL` is set to `false` in production so queries with user input are not printed to logs.
