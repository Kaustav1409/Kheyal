# Kheyal — Student Pilot Protocol (14-Day Validation)

This protocol outlines the execution framework for the **two-week real-world validation pilot** with 5 students, adhering strictly to PRD §16, §17, §20, and §21.

---

## 1. Pilot Objectives

The primary goal of this pilot is to evaluate Kheyal's core hypothesis in the wild:
> *Does a low-friction one-line deadline capture combined with dynamic slack prioritization and non-annoying push reminders reduce student deadline panic and improve follow-through?*

Specifically, the pilot verifies:
1. **Capture Speed:** Can students capture incoming assignments in under 15 seconds without developer assistance?
2. **Push Reliability:** Do reminders arrive on time at 48h, 24h, and 6h offsets when the browser is closed?
3. **Prioritization Clarity:** Does the "Do this next" hero card effectively guide students to the single most critical task?
4. **Organic Retention:** Do students return to the app daily without external reminders from the team?

---

## 2. Participant Selection Matrix

We recruit **5 active university/college students** representing diverse platforms and academic workloads:

| ID | Academic Program | Primary Device | Browser / OS | Typical Deadlines / Week |
|---|---|---|---|---|
| **S-01** | B.Tech Computer Science (3rd yr) | Android Phone | Chrome (Android 14) | 5–8 lab submissions & projects |
| **S-02** | B.Tech Electrical Engg (2nd yr) | iPhone + MacBook | Safari (iOS 17 PWA) | 4–6 assignments & quizzes |
| **S-03** | B.Sc Mathematics (Final yr) | Windows Laptop | Chrome (Windows 11) | 3–5 problem sets & seminars |
| **S-04** | MBA / Management (1st yr) | Android Phone + Laptop | Chrome & Edge | 6–10 case studies & presentations |
| **S-05** | B.Des / Architecture (2nd yr) | iPad + iPhone | Safari (iOS 17 PWA) | 3–4 studio submissions |

*Requirement:* Participants must have genuine coursework deadlines occurring during the 14-day observation window. No simulated or artificial tasks are used.

---

## 3. Onboarding Protocol (Day 0)

Every participant undergoes a 10-minute guided onboarding session:

### Step 1: Account Creation
- Open `https://kheyal.vercel.app/signup` (or local staging).
- Enter college email and secure password. Timezone is auto-detected.

### Step 2: Progressive Web App (PWA) Installation
- **Android:** Tap browser menu (⋮) $\rightarrow$ **"Install app"** or **"Add to Home screen"**.
- **iOS (iPhone/iPad):** Tap Share ($\uparrow$) $\rightarrow$ scroll down $\rightarrow$ **"Add to Home Screen"** *(mandatory for iOS 16.4+ Web Push support)*.
- **Desktop:** Click the install icon ($\oplus$) in the browser address bar.

### Step 3: Push Notification Enablement
- Open **Settings** screen.
- Toggle **Browser Push Notifications** $\rightarrow$ Tap **Allow**.
- Tap **"🔔 Send Test Notification"** to confirm desktop/mobile native alerts are working.

### Step 4: First Deadline Capture
- Student inputs 2–3 real deadlines currently on their plate using natural language:
  - Example: `"DBMS Lab Assignment by Friday 5 PM ~3h"`
  - Example: `"Maths Quiz on Monday 10am ~1h"`
- Student verifies the **`ParsePreviewCard`** and clicks **"Confirm & Save Deadline"**.

---

## 4. 14-Day Timeline & Touchpoints

```text
Day 0          Day 3             Day 7                Day 14
  │              │                 │                    │
  ▼              ▼                 ▼                    ▼
Onboarding   Initial Pulse     Mid-Pilot Pulse      Exit Interview
Setup &      Capture Friction  Reminder Tone &      Follow-Through &
First Tasks  & UI Feedback     Slack Prioritization Quantitative Telemetry
```

- **Days 1–3:** Observation of natural capture habit.
  - *Touchpoint:* Day 3 check-in (10-min phone call / chat). Focus on parsing friction and empty states.
- **Days 4–7:** First reminder wave (48h/24h/6h alerts arriving).
  - *Touchpoint:* Day 7 mid-pilot review. Focus on notification helpfulness and quiet-hours behavior.
- **Days 8–13:** Autonomous usage. Zero prompting from the research team.
- **Day 14:** Conclusion.
  - *Touchpoint:* Day 14 structured exit interview & SQL telemetry extraction.

---

## 5. Support & Bug Escalation SLA

- A dedicated WhatsApp / Telegram group or DM channel is maintained for pilot participants.
- Critical bugs (e.g. notification delivery failure, authentication loop, parse failure) must be acknowledged within 2 hours and hotfixed within 12 hours.
