const deadlineRepository = require('../repositories/deadlineRepository');

async function createDeadline(userId, data) {
  return await deadlineRepository.create({
    userId,
    title: data.title,
    subject: data.subject,
    dueAt: data.dueAt,
    hasDueTime: data.hasDueTime !== undefined ? data.hasDueTime : true,
    effortHours: data.effortHours,
  });
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
  return updated;
}

async function deleteDeadline(userId, id) {
  const deleted = await deadlineRepository.deleteByIdAndUser({ id, userId });
  if (!deleted) {
    const error = new Error('Deadline not found');
    error.status = 404;
    throw error;
  }
  return { id: deleted.id, message: 'Deadline deleted successfully' };
}

module.exports = {
  createDeadline,
  getDeadlines,
  getDeadlineById,
  updateDeadline,
  deleteDeadline,
};
