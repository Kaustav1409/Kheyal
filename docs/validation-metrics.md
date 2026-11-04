# Kheyal — Validation Metrics & Evaluation Rubric

This document defines the quantitative telemetry targets, qualitative evaluation rubrics, and the decision thresholds used to evaluate the 14-day student pilot according to PRD §16, §17, and §20.

---

## 1. Quantitative Success Metrics (PRD §17)

| Metric | Target Benchmark | How It Is Measured | Success Criteria |
|---|---|---|---|
| **M-01: Capture Velocity** | $\ge 4$ deadlines / student / week | Count of rows in `deadlines` table created per user per week. | Capturing assignments is fast and low-friction enough that students do not fall back to WhatsApp or paper notes. |
| **M-02: Effort Estimation Ratio** | $\ge 60\%$ tasks have effort | Ratio of deadlines with `effort_hours IS NOT NULL`. | Evaluates whether students understand and use effort estimation (`~3h`) for slack math. |
| **M-03: Reminder Delivery Rate** | $\ge 95\%$ successful delivery | Ratio of `reminders.status = 'sent'` vs `failed`. | Guarantees the server-side `node-cron` worker and VAPID push infrastructure deliver reliably. |
| **M-04: On-Time Completion Rate** | $\ge 75\%$ completed on time | Ratio of completed deadlines where `completed_at <= due_at + interval '2 hours'`. | Validates that dynamic slack ranking and start-by suggestions help students finish before deadlines. |
| **M-05: Overdue Rate** | $\le 15\%$ active tasks overdue | Count of active deadlines where `due_at < NOW()`. | Measures whether students are keeping control of their commitments. |
| **M-06: Week-Two Retention** | $\ge 80\%$ (4 out of 5 students) | Students with at least 1 deadline creation or completion event during Days 8–14. | Confirms organic utility without developer hand-holding. |

---

## 2. Qualitative Evaluation Dimensions

Evaluated during Day 3, Day 7, and Day 14 student interviews on a 1–5 scale:

1. **Cognitive Relief (Panic Reduction):**
   - *Question:* "Did having a single 'Do this next' card reduce your anxiety when multiple assignments were due in the same week?"
   - *Benchmark:* Average score $\ge 4.0 / 5.0$.
2. **Notification Tone (Non-Guilt-Inducing):**
   - *Question:* "Did the reminder copy ('Bacha hua samay: 24 ghante', 'Sab nipta diya') feel supportive rather than guilt-inducing or spammy?"
   - *Benchmark:* Average score $\ge 4.5 / 5.0$.
3. **Start-By Time Realism:**
   - *Question:* "Was the suggested start-by time realistic, or did it feel like an impossible demand?"
   - *Benchmark:* Average score $\ge 3.8 / 5.0$.
4. **Capture Speed:**
   - *Question:* "How fast does adding a deadline feel compared to your previous system?"
   - *Benchmark:* 5/5 students state it is faster or equal to typing a WhatsApp message.

---

## 3. Decision Framework for Roadmap Evolution (PRD §20)

Observed pilot behavior directly triggers roadmap adjustments for Phase B:

```text
┌─────────────────────────────────────────────────────────┐
│              Observed Pilot Telemetry                   │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┼──────────────────┐
         ▼                 ▼                  ▼
    Effort Ratio       Ambiguity         Quiet Hours
      < 50%?          Warnings >15%?     Complaints?
         │                 │                  │
         ▼                 ▼                  ▼
 Add smart 1.5h      Expand Hinglish    Shift evening
 default prompt      colloquial regex   window to 21:30
```

1. **If Effort Estimation is Skipped ($M\text{-}02 < 50\%$):**
   - *Observed Issue:* Students omit `~2h` when typing quickly.
   - *Roadmap Action:* Introduce a gentle default effort prompt (e.g. "Default 1.5h estimate applied — click to edit") or auto-suggest typical effort based on subject.
2. **If Ambiguous Date Warnings are Frequent ($>15\%$ of captures):**
   - *Observed Issue:* Students type colloquial phrases not caught by day-first chrono (e.g. "kal raat tak", "parso sham").
   - *Roadmap Action:* Extend custom chrono-node pre-parser dictionary with common student Hinglish idioms.
3. **If Quiet Hours Suppress Morning Deadlines:**
   - *Observed Issue:* Reminders scheduled for 23:00–07:00 arrive at 07:00 when an assignment is due at 08:00 AM.
   - *Roadmap Action:* Adjust quiet-hours rule to dispatch evening reminders earlier (at 21:30) rather than deferring to morning.
4. **If Retention Exceeds 80% ($M\text{-}06 \ge 80\%$):**
   - *Conclusion:* Core MVP loop (one-line capture + preview confirmation + 48h/24h/6h push + slack ranking) is fully validated. Proceed to Phase B public student onboarding!
