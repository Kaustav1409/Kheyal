# Kheyal — Frontend Screen Specifications

**Design System & Theme:** Notebook-inspired, minimal, warm, calm, student-friendly  
**Color Palette:**
- **Ink:** `#27272A` (Primary text, dark accents)
- **Paper:** `#F8F5EF` (Background, light surfaces)
- **Lavender:** `#8B80A8` (Interactive elements, focus rings, subtle badges)
- **Peach:** `#E7A18F` (Urgency accent, "Do this next" hero highlights, warnings)

---

## Screen 1 — Add Deadline (`/add` or Modal / Drawer)

### Purpose
Fast, frictionless deadline capture via natural language or structured fields.

### Layout & Components
- **Input Mode Selector:** Simple toggle between "One-line" (default) and "Structured Form".
- **One-line Input:** Prominent input field with placeholder:  
  *e.g. "Complete DBMS assignment by 25 October at 5 PM"*
- **Parse Preview Card (Mandatory):**
  - Displays interpreted Title, Subject chip, Due Date/Time, and Effort.
  - Ambiguous date warnings (e.g. *"05/11 ko 5 Nov samjha gaya"*).
  - Date-only warning (e.g. *"Time nahi diya — end of day 11:59 PM maan liya"*).
  - Every field in the preview is directly editable before confirming.
- **Action Buttons:**
  - `Confirm & Save` (Primary button, disabled until parse succeeds).
  - `Cancel` / `Clear`.

---

## Screen 2 — Do This Next (`/`, Home)

### Purpose
Actionable, explainable prioritization view answering: *"What should I work on right now?"*

### Layout & Components
- **Overdue Banner:** Prominently alerts user if any task is overdue (e.g. *"1 overdue · Physics worksheet"*).
- **Hero Card (Top Urgency Task):**
  - Peach accent border/badge: `DO THIS NEXT`.
  - Task title & Subject tag.
  - Due time & relative countdown (e.g. *"Due Sun 5:00 PM · 2 din 7 ghante"*).
  - Estimated effort and calculated suggested start-by time (*"~6h kaam · Start by Sun 9:30 AM"*).
  - Plain-language explanation for ranking: *"Sabse kam spare time (49.5h slack)"*.
  - Primary completion button: `[ ✓ Ho gaya ]`.
  - Undo toast appears for 5 seconds on completion.
- **Up Next List:**
  - Ranks remaining active tasks by slack / due date.
  - Inline prompt for missing effort: `[ Kitne ghante lagenge? ]`.
- **Empty State:**
  - Friendly graphic & copy: *"Sab clear! 🎉 Nayi deadline add karo jab aaye."*

---

## Screen 3 — All Deadlines (`/deadlines`)

### Purpose
Comprehensive view and management of all student deadlines.

### Layout & Components
- **Segmented Control:** `Upcoming` · `Overdue` · `Completed`
- **Deadline Card:**
  - Title, Subject chip, local formatted due date/time, effort badge.
  - Actions: Edit (opens preview sheet), Complete / Reopen, Delete.
- **Delete Confirmation:** Dialog explaining *"Delete karein? Iske pending reminders bhi hat jayenge."*
- **Empty States:** Tailored empty states for each tab with helpful next actions.

---

## Screen 4 — Settings (`/settings`)

### Purpose
User control over notification preferences, account details, and PWA installation.

### Layout & Components
- **Notification Preferences:**
  - Master push toggle.
  - Push status indicator: *(Enabled / Permission Needed / Blocked)*.
  - "Send test notification" button.
- **Quiet Hours:**
  - Toggle & start/end time pickers (default 23:00 to 07:00).
- **Planning Buffer:**
  - Configurable start-by buffer (default 2.0 hours).
- **Account Details:**
  - Display email and detected/configured timezone.
  - Explicit `Log Out` button (revokes session on server).
- **PWA Installation Guidance:**
  - Clear OS-specific installation instructions (Android Chrome, iOS Safari Share → Add to Home Screen).

