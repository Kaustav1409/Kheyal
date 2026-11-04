-- ==============================================================================
-- Kheyal — Pilot Analytics & Quantitative Telemetry SQL Script
-- Run against kheyal_dev or production PostgreSQL to extract pilot performance.
-- ==============================================================================

SET search_path TO kheyal, public;

-- 1. PILOT OVERALL SUMMARY
SELECT
  (SELECT COUNT(*) FROM users) AS total_pilot_students,
  (SELECT COUNT(*) FROM deadlines) AS total_deadlines_created,
  (SELECT COUNT(*) FROM deadlines WHERE status = 'completed') AS total_deadlines_completed,
  (SELECT COUNT(*) FROM deadlines WHERE status = 'active' AND due_at < NOW()) AS total_overdue_deadlines,
  (SELECT COUNT(*) FROM push_subscriptions) AS total_active_push_devices,
  (SELECT COUNT(*) FROM reminders WHERE status = 'sent') AS total_push_reminders_sent;

-- 2. DEADLINE CAPTURE & COMPLETION BREAKDOWN PER STUDENT
SELECT
  u.id AS user_id,
  u.email,
  COUNT(d.id) AS total_deadlines,
  COUNT(CASE WHEN d.status = 'completed' THEN 1 END) AS completed_count,
  COUNT(CASE WHEN d.status = 'active' AND d.due_at >= NOW() THEN 1 END) AS active_upcoming_count,
  COUNT(CASE WHEN d.status = 'active' AND d.due_at < NOW() THEN 1 END) AS active_overdue_count,
  COUNT(p.id) AS push_device_count
FROM users u
LEFT JOIN deadlines d ON u.id = d.user_id
LEFT JOIN push_subscriptions p ON u.id = p.user_id
GROUP BY u.id, u.email
ORDER BY total_deadlines DESC;

-- 3. EFFORT ESTIMATION ADOPTION RATE (Target: >= 60%)
SELECT
  COUNT(*) AS total_deadlines,
  COUNT(CASE WHEN effort_hours IS NOT NULL THEN 1 END) AS deadlines_with_effort,
  COUNT(CASE WHEN effort_hours IS NULL THEN 1 END) AS deadlines_without_effort,
  ROUND(
    (COUNT(CASE WHEN effort_hours IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC) * 100,
    1
  ) AS effort_adoption_percentage,
  ROUND(AVG(effort_hours), 1) AS average_estimated_hours
FROM deadlines;

-- 4. ON-TIME COMPLETION TIMELINESS (Target: >= 75% on-time)
SELECT
  COUNT(*) AS total_completed,
  COUNT(CASE WHEN completed_at <= due_at THEN 1 END) AS completed_before_due,
  COUNT(CASE WHEN completed_at > due_at AND completed_at <= due_at + INTERVAL '2 hours' THEN 1 END) AS completed_within_2h_grace,
  COUNT(CASE WHEN completed_at > due_at + INTERVAL '2 hours' THEN 1 END) AS completed_late,
  ROUND(
    (COUNT(CASE WHEN completed_at <= due_at + INTERVAL '2 hours' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC) * 100,
    1
  ) AS on_time_success_rate_percentage
FROM deadlines
WHERE status = 'completed' AND due_at IS NOT NULL;

-- 5. WEB PUSH REMINDER DELIVERY HEALTH (Target: >= 95% sent)
SELECT
  status,
  COUNT(*) AS reminder_count,
  ROUND(AVG(attempts), 2) AS avg_delivery_attempts
FROM reminders
GROUP BY status
ORDER BY reminder_count DESC;

-- 6. TOP SUBJECTS BY ACTIVITY
SELECT
  COALESCE(subject, 'Unassigned') AS subject_name,
  COUNT(*) AS deadline_count,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_count
FROM deadlines
GROUP BY subject
ORDER BY deadline_count DESC
LIMIT 10;
