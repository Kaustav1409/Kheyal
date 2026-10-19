# Kheyal — Screen Flows and UX (Phase A)

Mobile-first. Four core screens (PRD §9) plus the auth screens needed to reach them.

## 1. Design tokens

| Token | Value | Use |
|---|---|---|
| `--ink` | `#27272A` | Primary text, icons |
| `--paper` | `#F8F5EF` | App background (notebook paper) |
| `--lavender` | `#8B80A8` | Primary accent, focus rings, active nav |
| `--peach` | `#E7A18F` | Warm highlight: "Do this next" hero, start-by chip |

Rules:

- Body text is always `--ink` on `--paper` (high contrast). Lavender and peach are **accents** — never used for small body text on paper without a contrast check (WCAG AA ≥ 4.5:1 for text).
- Status is never communicated by colour alone: overdue = icon + label + colour.
- Notebook feel: faint ruled lines / margin rule on cards, generous spacing, rounded corners, soft shadows.
- Motion: subtle (150–250 ms), respects `prefers-reduced-motion`.
- Typography: one clean sans-serif for UI; wordmark "Kheयाl" tested for Devanagari glyph support with a fallback "Kheyal".

## 2. Navigation

```text
Mobile (< 768px)                       Desktop (≥ 768px)
┌───────────────────────────┐          ┌──────┬─────────────────────────┐
│  Kheyal          (avatar) │          │ Logo │                         │
│                           │          │      │                         │
│        screen content     │          │ Next │     screen content      │
│                           │          │ All  │   (max width ~720px)    │
│                           │          │ Add  │                         │
├───────────────────────────┤          │ Set  │                         │
│ Next   All   (+)   Settings│          └──────┴─────────────────────────┘
└───────────────────────────┘
 bottom tab bar, (+) = Add               side rail
```

Routes (Next.js app router): `/login`, `/signup`, `/` (Do this next), `/add`, `/deadlines`, `/settings`. Unauthenticated users are redirected to `/login`.

## 3. Screens

### 0. Login / Sign up

- Email, password (show/hide toggle), submit. Timezone captured silently from the browser on signup.
- Errors inline and friendly: "Email ya password sahi nahi hai."
- After signup → onboarding hint on the home screen: "Pehli deadline add karo 👇".

### 1. Add deadline (`/add`)

```text
┌─────────────────────────────────────┐
│ Kya due hai?                        │
│ ┌─────────────────────────────────┐ │
│ │ DBMS assignment due 25/10 5pm 6h│ │
│ └─────────────────────────────────┘ │
│ e.g. "OS lab record Friday 9am 2h"  │
│            [ Preview ]              │
│ ─────────── or use the form ─────── │
├─────────────────────────────────────┤
│ PREVIEW                             │
│ Title    DBMS assignment     ✎      │
│ Due      Sun, 25 Oct · 5:00 PM ✎    │
│ Effort   ~6 hours            ✎      │
│ Reminders  Fri 5 PM · Sat 5 PM ·    │
│            Sun 11 AM                │
│ ⚠ warnings (if any)                 │
│   [ Edit ]        [ Confirm & save ]│
└─────────────────────────────────────┘
```

Behaviour:

- Two modes: one-line text (default) and structured form (title, subject, date, optional time, effort).
- **Preview is mandatory**; nothing saves until "Confirm & save".
- Every preview field is editable before confirming.
- Warnings are shown plainly, e.g. "Time nahi diya — end of day (11:59 PM) maan liya. Reminders: raat 10:30 aur subah 7:00." / "05/11 ko 5 Nov padha (day/month)."
- Parse failure: "Date samajh nahi aayi. Try: '25 Oct 5pm' ya form use karo."
- On save → success toast + navigate to "Do this next".

### 2. Do this next (`/`, home)

```text
┌─────────────────────────────────────┐
│ ⚠ 1 overdue · Physics worksheet  ›  │  ← only if overdue exist
├─────────────────────────────────────┤
│ DO THIS NEXT                  (peach)│
│ DBMS assignment                     │
│ Due Sun 5:00 PM · 2 din 7 ghante    │
│ ~6h kaam · Start by Sun 9:30 AM*    │
│ Why: sabse kam spare time (49.5h)   │
│            [ ✓ Ho gaya ]            │
├─────────────────────────────────────┤
│ Up next                             │
│ 2  OS lab record   Fri 9 AM · 2h    │
│ 3  Essay draft     Mon · no estimate│
│                    [ add estimate ] │
└─────────────────────────────────────┘
* "Suggestion — buffer 2h. Settings mein badlo."
```

- Hero card = top ranked non-overdue task, with due time, time remaining, effort, start-by, a short **reason** (explainable ranking) and a completion button.
- Start-by already passed → "Start-by nikal gaya — abhi shuru karna best rahega" (no guilt).
- Unknown effort → no start-by; inline "Kitne ghante lagenge?" prompt.
- Date-only → "Due Sun 25 Oct · time not set" + "add time" link.
- Completing calls the API immediately and shows a 5-second "Undo" toast; Undo reopens the task (`PATCH status: "active"`), which regenerates its future reminders.
- Empty state: "Sab clear! 🎉 Nayi deadline add karo jab aaye." + Add button.

### 3. All deadlines (`/deadlines`)

- Segmented control: **Upcoming · Overdue · Completed**.
- Cards: title, subject chip, due (local), effort, overdue badge (icon + "Overdue" + colour).
- Actions per card: Complete / Reopen, Edit (sheet with the same form + preview), Delete (confirm dialog: "Delete karein? Iske reminders bhi hat jayenge.").
- Empty states per tab: Upcoming "Koi upcoming deadline nahi." · Overdue "Kuch overdue nahi — badhiya!" · Completed "Abhi tak kuch complete nahi hua — pehla tick jaldi!".

### 4. Settings (`/settings`)

| Section | Contents |
|---|---|
| Notifications | Master toggle; push status (Not supported / Permission needed / Enabled on this device / Blocked — how to fix); "Enable on this device"; "Remove this device"; test notification button |
| Quiet hours | Toggle, start/end time pickers (default 23:00–07:00), explanation "Is time ke reminders pehle bhej denge." |
| Planning | Start-by buffer (0–24 h, default 2 h) |
| Account | Email (read-only), timezone (auto-detected, editable), Log out |
| Install app | Per-platform PWA guidance: Android Chrome ("Add to Home screen"), iOS Safari (Share → Add to Home Screen, iOS 16.4+ for push), desktop; Samsung battery-optimisation tip |

## 4. Universal states

Every data view has: **loading** (skeleton cards, not spinners everywhere), **empty** (friendly + next action), **error** (plain message + Retry; never raw error text), **success** (short toast). Forms show field-level errors from the API's `fields` object.

## 5. Notification copy (respectful, Hinglish)

| Kind | Title | Body |
|---|---|---|
| 48h | DBMS assignment · 2 din baaki | Due Sun 5:00 PM · ~6h kaam. Aaj thoda shuru karein? |
| 24h | Kal due: DBMS assignment | Suggested start: 9:30 AM. Ho jayega 💪 |
| 6h | 6 ghante bache: DBMS assignment | Abhi shuru karo toh aaram se ho jayega. |
| night_before | Kal due: Lab record | Time set nahi hai — subah check kar lena. |
| morning_of | Aaj due: Lab record | Aaj ka plan isse shuru karein? |

Copy rules: no shaming words ("late", "failed", "lazy"); one notification per reminder; tapping opens the task; titles ≤ 50 chars.

## 6. Accessibility checklist

- All interactive elements keyboard-reachable with visible lavender focus ring.
- Touch targets ≥ 44 × 44 px.
- Semantic HTML (`<main>`, `<nav>`, `<button>`, labelled inputs), one `<h1>` per screen.
- Times shown in words where helpful ("2 din 7 ghante") with exact time also visible.
- Unique, descriptive `id`s on interactive elements for testing.
