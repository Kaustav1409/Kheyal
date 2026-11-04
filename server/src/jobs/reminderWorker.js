const { query } = require('../config/db');
const { webpush } = require('../config/push');
const pushSubscriptionRepository = require('../repositories/pushSubscriptionRepository');

const MAX_ATTEMPTS = 3;
const GRACE_WINDOW_MINUTES = 15;

/**
 * Generates helpful, non-guilt-inducing notification copy in Hinglish per PRD §8.
 */
function formatNotification(reminder, deadline) {
  const titleText = deadline.title || 'Deadline';
  let title = '';
  let body = '';

  switch (reminder.kind) {
    case '48h':
      title = `${titleText} · 2 din baaki`;
      body = deadline.effort_hours
        ? `~${Number(deadline.effort_hours)}h kaam. Aaj thoda shuru karein?`
        : '2 din baaki hain. Aaj plan bana lein?';
      break;
    case '24h':
      title = `Kal due: ${titleText}`;
      body = 'Kal submission hai. Ho jayega 💪';
      break;
    case '6h':
      title = `6 ghante bache: ${titleText}`;
      body = 'Abhi shuru karo toh aaram se ho jayega.';
      break;
    case 'night_before':
      title = `Kal due: ${titleText}`;
      body = 'Time set nahi hai — subah check kar lena.';
      break;
    case 'morning_of':
      title = `Aaj due: ${titleText}`;
      body = 'Aaj ka plan isse shuru karein?';
      break;
    default:
      title = `Reminder: ${titleText}`;
      body = 'Deadline approaching.';
  }

  return {
    title,
    body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: {
      deadlineId: deadline.id || reminder.deadline_id,
      url: '/deadlines',
      kind: reminder.kind,
    },
  };
}

/**
 * Expires reminders that missed the grace window during server restarts.
 */
async function expireMissedReminders(graceMinutes = GRACE_WINDOW_MINUTES) {
  const sql = `
    UPDATE reminders
    SET status = 'skipped', error_details = 'Missed during server downtime; outside grace window'
    WHERE status = 'pending'
      AND send_at < NOW() - ($1 || ' minutes')::INTERVAL
    RETURNING id;
  `;
  const { rows } = await query(sql, [graceMinutes]);
  return rows.length;
}

/**
 * Atomically claims due reminder rows using FOR UPDATE SKIP LOCKED.
 */
async function claimDueReminders(limit = 50, graceMinutes = GRACE_WINDOW_MINUTES) {
  const sql = `
    WITH claimable AS (
      SELECT r.id
      FROM reminders r
      JOIN deadlines d ON r.deadline_id = d.id
      WHERE r.status = 'pending'
        AND r.send_at <= NOW()
        AND r.send_at >= NOW() - ($2 || ' minutes')::INTERVAL
        AND d.status = 'active'
      ORDER BY r.send_at ASC
      LIMIT $1
      FOR UPDATE OF r SKIP LOCKED
    )
    UPDATE reminders r
    SET status = 'processing', attempts = r.attempts + 1
    FROM claimable
    JOIN deadlines d ON claimable.id = d.id -- joining for deadline details
    WHERE r.id = claimable.id
    RETURNING 
      r.id, 
      r.deadline_id, 
      r.kind, 
      r.send_at, 
      r.attempts, 
      d.user_id, 
      d.title, 
      d.subject, 
      d.due_at, 
      d.effort_hours, 
      d.has_due_time;
  `;

  // Note: the RETURNING join above joins d on r.deadline_id
  const properSql = `
    WITH claimable AS (
      SELECT r.id
      FROM reminders r
      JOIN deadlines d ON r.deadline_id = d.id
      WHERE r.status = 'pending'
        AND r.send_at <= NOW()
        AND r.send_at >= NOW() - ($2 || ' minutes')::INTERVAL
        AND d.status = 'active'
      ORDER BY r.send_at ASC
      LIMIT $1
      FOR UPDATE OF r SKIP LOCKED
    )
    UPDATE reminders r
    SET status = 'processing', attempts = r.attempts + 1
    FROM claimable c
    JOIN reminders r2 ON c.id = r2.id
    JOIN deadlines d ON r2.deadline_id = d.id
    WHERE r.id = c.id
    RETURNING 
      r.id, 
      r.deadline_id, 
      r.kind, 
      r.send_at, 
      r.attempts, 
      d.user_id, 
      d.title, 
      d.subject, 
      d.due_at, 
      d.effort_hours, 
      d.has_due_time;
  `;

  const { rows } = await query(properSql, [limit, graceMinutes]);
  return rows;
}

/**
 * Sends web push notifications for a claimed reminder row.
 */
async function processClaimedReminder(claimedReminder) {
  const deadline = {
    id: claimedReminder.deadline_id,
    title: claimedReminder.title,
    subject: claimedReminder.subject,
    effort_hours: claimedReminder.effort_hours,
  };

  const payload = formatNotification(claimedReminder, deadline);
  const payloadString = JSON.stringify(payload);

  const subscriptions = await pushSubscriptionRepository.findByUserId(claimedReminder.user_id);

  if (subscriptions.length === 0) {
    // No active browser subscriptions registered: mark delivered/skipped gracefully
    await query(
      `UPDATE reminders SET status = 'sent', sent_at = NOW(), error_details = 'No active push subscriptions registered' WHERE id = $1;`,
      [claimedReminder.id]
    );
    return { success: true, deliveredDevices: 0 };
  }

  let deliveredDevices = 0;
  let lastError = null;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payloadString
      );
      deliveredDevices++;
    } catch (err) {
      lastError = err;
      // If subscription has expired or is unsubscribed (404/410), prune it from database!
      if (err.statusCode === 404 || err.statusCode === 410) {
        await pushSubscriptionRepository.deleteByEndpoint(sub.endpoint);
      }
    }
  }

  if (deliveredDevices > 0) {
    await query(`UPDATE reminders SET status = 'sent', sent_at = NOW(), error_details = NULL WHERE id = $1;`, [
      claimedReminder.id,
    ]);
    return { success: true, deliveredDevices };
  }

  // If all devices failed: check retry threshold
  if (claimedReminder.attempts >= MAX_ATTEMPTS) {
    await query(
      `UPDATE reminders SET status = 'failed', error_details = $2 WHERE id = $1;`,
      [claimedReminder.id, lastError ? lastError.message : 'All push dispatches failed']
    );
    return { success: false, failedPermanently: true };
  }

  // Reset to pending for retry
  await query(
    `UPDATE reminders SET status = 'pending', error_details = $2 WHERE id = $1;`,
    [claimedReminder.id, `Attempt ${claimedReminder.attempts} failed: ${lastError ? lastError.message : 'Unknown'}`]
  );
  return { success: false, retryScheduled: true };
}

/**
 * Runs one worker execution cycle.
 */
async function runReminderTick() {
  const expiredCount = await expireMissedReminders();
  const claimed = await claimDueReminders();

  let sentCount = 0;
  for (const reminder of claimed) {
    const res = await processClaimedReminder(reminder);
    if (res.success) {
      sentCount++;
    }
  }

  return {
    expiredCount,
    claimedCount: claimed.length,
    sentCount,
  };
}

module.exports = {
  formatNotification,
  expireMissedReminders,
  claimDueReminders,
  processClaimedReminder,
  runReminderTick,
  MAX_ATTEMPTS,
  GRACE_WINDOW_MINUTES,
};
