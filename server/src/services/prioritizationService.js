const DEFAULT_BUFFER_HOURS = 2.0;

/**
 * Calculates dynamic slack, start-by time, and ranks tasks for "Do This Next".
 *
 * @param {Array} deadlines - List of deadlines from database
 * @param {object} [options]
 * @param {Date} [options.now] - Current timestamp (default: new Date())
 * @param {number} [options.bufferHours] - Start-by planning buffer (default: 2.0)
 * @returns {object} { rankedDeadlines, overdueCount }
 */
function rankDeadlines(deadlines, options = {}) {
  const now = options.now || new Date();
  const nowTime = now.getTime();
  const bufferHours = options.bufferHours !== undefined ? options.bufferHours : DEFAULT_BUFFER_HOURS;

  // Exclude completed tasks
  const activeDeadlines = deadlines.filter((d) => d.status !== 'completed');

  const processed = activeDeadlines.map((d) => {
    let dueAtTime = null;
    let hoursUntilDue = null;
    let isOverdue = false;
    let slackHours = null;
    let suggestedStartBy = null;
    let isStartByApproximate = false;
    let reason = '';
    const effort = d.effortHours !== null && d.effortHours !== undefined ? Number(d.effortHours) : null;

    if (d.dueAt) {
      const dueDate = new Date(d.dueAt);
      dueAtTime = dueDate.getTime();
      hoursUntilDue = (dueAtTime - nowTime) / (1000 * 60 * 60);
      isOverdue = dueAtTime < nowTime;

      if (!d.hasDueTime) {
        isStartByApproximate = true;
      }

      if (effort !== null && effort > 0) {
        slackHours = Math.round((hoursUntilDue - effort) * 10) / 10;
        const startByMs = dueAtTime - (effort + bufferHours) * 60 * 60 * 1000;
        suggestedStartBy = new Date(startByMs).toISOString();

        if (isOverdue) {
          const overdueHours = Math.round(Math.abs(hoursUntilDue) * 10) / 10;
          reason = `Overdue by ${overdueHours}h — needs immediate attention`;
        } else {
          reason = `Least spare time (${slackHours}h slack)`;
        }
      } else {
        // Unknown effort: rank by due time
        slackHours = Math.round(hoursUntilDue * 10) / 10;
        if (isOverdue) {
          const overdueHours = Math.round(Math.abs(hoursUntilDue) * 10) / 10;
          reason = `Overdue by ${overdueHours}h · add effort estimate`;
        } else {
          const hoursLeft = Math.round(hoursUntilDue * 10) / 10;
          reason = `Due soon (${hoursLeft}h left) · effort estimate needed`;
        }
      }
    } else {
      // Undated task
      slackHours = Infinity;
      reason = 'Undated task';
    }

    return {
      ...d,
      isOverdue,
      slackHours,
      suggestedStartBy,
      isStartByApproximate,
      reason,
      hasEffort: effort !== null,
    };
  });

  // Sorting order:
  // 1. Overdue tasks first (sorted by most overdue: smallest dueAtTime)
  // 2. Active tasks with due dates: sorted by smallest slackHours
  // 3. Tie-breaker: earlier due time
  // 4. Undated tasks last
  processed.sort((a, b) => {
    // Both overdue: earlier due date first
    if (a.isOverdue && b.isOverdue) {
      return (a.dueAt ? new Date(a.dueAt).getTime() : 0) - (b.dueAt ? new Date(b.dueAt).getTime() : 0);
    }
    // One overdue: overdue comes first
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;

    // Both have slack: smaller slack first
    if (a.slackHours !== null && b.slackHours !== null && a.slackHours !== b.slackHours) {
      return a.slackHours - b.slackHours;
    }

    // Tie-breaker: earlier due date
    if (a.dueAt && b.dueAt) {
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    if (a.dueAt && !b.dueAt) return -1;
    if (!a.dueAt && b.dueAt) return 1;

    return 0;
  });

  // Assign urgency rank
  const rankedDeadlines = processed.map((item, index) => ({
    ...item,
    urgencyRank: index + 1,
  }));

  const overdueCount = rankedDeadlines.filter((d) => d.isOverdue).length;

  return {
    rankedDeadlines,
    overdueCount,
  };
}

module.exports = {
  rankDeadlines,
  DEFAULT_BUFFER_HOURS,
};

