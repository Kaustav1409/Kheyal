const reminderRepository = require('../repositories/reminderRepository');

/**
 * Calculates reminder dispatch schedules based on PRD §8 rules:
 * - Explicit time: 48h, 24h, 6h before dueAt.
 * - Date-only: Night before (22:30 local) and morning of (07:00 local).
 * - Undated: No reminders.
 * - Filters out offsets in the past.
 */
function calculateReminders(deadline, { now = new Date() } = {}) {
  if (!deadline || !deadline.dueAt) {
    return [];
  }

  const dueDate = new Date(deadline.dueAt);
  const nowTime = now.getTime();
  const reminders = [];

  if (deadline.hasDueTime) {
    // Case 1: Deadline with explicit date and time
    // 48h, 24h, 6h before
    const offsets = [
      { kind: '48h', ms: 48 * 60 * 60 * 1000 },
      { kind: '24h', ms: 24 * 60 * 60 * 1000 },
      { kind: '6h', ms: 6 * 60 * 60 * 1000 },
    ];

    for (const offset of offsets) {
      const sendAt = new Date(dueDate.getTime() - offset.ms);
      if (sendAt.getTime() > nowTime) {
        reminders.push({
          deadlineId: deadline.id,
          kind: offset.kind,
          sendAt,
          status: 'pending',
        });
      }
    }
  } else {
    // Case 2: Date-only deadline (due date at 23:59 local)
    // Exactly two reminders:
    // 1. Night before: 22:30 local time on the day before
    const nightBefore = new Date(dueDate);
    nightBefore.setDate(nightBefore.getDate() - 1);
    nightBefore.setHours(22, 30, 0, 0);

    if (nightBefore.getTime() > nowTime) {
      reminders.push({
        deadlineId: deadline.id,
        kind: 'night_before',
        sendAt: nightBefore,
        status: 'pending',
      });
    }

    // 2. Morning of deadline: 07:00 local time on the day of the deadline
    const morningOf = new Date(dueDate);
    morningOf.setHours(7, 0, 0, 0);

    if (morningOf.getTime() > nowTime) {
      reminders.push({
        deadlineId: deadline.id,
        kind: 'morning_of',
        sendAt: morningOf,
        status: 'pending',
      });
    }
  }

  return reminders;
}

async function scheduleForDeadline(deadline, options = {}) {
  const remindersToCreate = calculateReminders(deadline, options);
  if (remindersToCreate.length === 0) {
    return [];
  }
  return await reminderRepository.createMany(remindersToCreate);
}

async function cancelForDeadline(deadlineId) {
  return await reminderRepository.cancelPendingByDeadlineId(deadlineId);
}

async function rescheduleForDeadline(deadline, options = {}) {
  // Cancel previous pending reminders
  await cancelForDeadline(deadline.id);
  // Schedule new reminders for upcoming offsets
  return await scheduleForDeadline(deadline, options);
}

module.exports = {
  calculateReminders,
  scheduleForDeadline,
  cancelForDeadline,
  rescheduleForDeadline,
};

