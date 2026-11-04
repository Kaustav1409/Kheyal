const cron = require('node-cron');
const { runReminderTick } = require('./reminderWorker');

let cronTask = null;

function startScheduler() {
  if (cronTask) {
    return cronTask;
  }

  // Runs every minute to claim and dispatch due reminders
  cronTask = cron.schedule('* * * * *', async () => {
    try {
      const result = await runReminderTick();
      if (result.claimedCount > 0 || result.expiredCount > 0) {
        console.log(`[Scheduler] Claimed: ${result.claimedCount}, Sent: ${result.sentCount}, Expired: ${result.expiredCount}`);
      }
    } catch (err) {
      console.error('[Scheduler] Error during reminder tick:', err.message);
    }
  });

  console.log('✓ Reminder background scheduler started (runs every minute)');
  return cronTask;
}

function stopScheduler() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('✓ Reminder background scheduler stopped');
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
};
