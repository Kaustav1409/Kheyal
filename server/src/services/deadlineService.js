const deadlineRepository = require('../repositories/deadlineRepository');
const reminderScheduleService = require('./reminderScheduleService');
const prioritizationService = require('./prioritizationService');

async function createDeadline(userId, data) {
  const deadline = await deadlineRepository.create({
    userId,
    title: data.title,
    subject: data.subject,
    dueAt: data.dueAt,
    hasDueTime: data.hasDueTime !== undefined ? data.hasDueTime : true,
    effortHours: data.effortHours,
  });

  const reminders = await reminderScheduleService.scheduleForDeadline(deadline);

  return {
    deadline,
    remindersScheduled: reminders.length,
  };
}

async function getDeadlines(userId, { status = 'active', subject = null } = {}) {
  return await deadlineRepository.findAllByUser({
    userId,
    status,
    subject,
  });
}

async function getDeadlineById(userId, id) {
  const deadline = await deadlineRepository.findByIdAndUser({ id, userId });
  if (!deadline) {
    const error = new Error('Deadline not found');
    error.status = 404;
    throw error;
  }
  return deadline;
}

async function updateDeadline(userId, id, data) {
  const updated = await deadlineRepository.update({
    id,
    userId,
    fields: data,
  });
  if (!updated) {
    const error = new Error('Deadline not found');
    error.status = 404;
    throw error;
  }

  // Reminder lifecycle updates
  if (data.status === 'completed') {
    await reminderScheduleService.cancelForDeadline(id);
  } else if (data.status === 'active') {
    await reminderScheduleService.scheduleForDeadline(updated);
  } else if (data.dueAt !== undefined || data.hasDueTime !== undefined) {
    await reminderScheduleService.rescheduleForDeadline(updated);
  }

  return updated;
}

async function deleteDeadline(userId, id) {
  await reminderScheduleService.cancelForDeadline(id);
  const deleted = await deadlineRepository.deleteByIdAndUser({ id, userId });
  if (!deleted) {
    const error = new Error('Deadline not found');
    error.status = 404;
    throw error;
  }
  return { id: deleted.id, message: 'Deadline deleted successfully' };
}

async function getRankedNext(userId, options = {}) {
  const activeDeadlines = await deadlineRepository.findAllByUser({
    userId,
    status: 'active',
  });
  return prioritizationService.rankDeadlines(activeDeadlines, options);
}

module.exports = {
  createDeadline,
  getDeadlines,
  getDeadlineById,
  updateDeadline,
  deleteDeadline,
  getRankedNext,
};
