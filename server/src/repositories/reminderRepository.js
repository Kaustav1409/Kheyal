const { query } = require('../config/db');

async function createMany(reminders) {
  if (!reminders || reminders.length === 0) {
    return [];
  }

  const values = [];
  const rowsClauses = [];

  reminders.forEach((r, index) => {
    const offset = index * 4;
    values.push(r.deadlineId, r.kind, new Date(r.sendAt).toISOString(), r.status || 'pending');
    rowsClauses.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
  });

  const sql = `
    INSERT INTO reminders (deadline_id, kind, send_at, status)
    VALUES ${rowsClauses.join(', ')}
    RETURNING id, deadline_id AS "deadlineId", kind, send_at AS "sendAt", status, attempts, created_at AS "createdAt";
  `;

  const { rows } = await query(sql, values);
  return rows;
}

async function cancelPendingByDeadlineId(deadlineId) {
  const sql = `
    UPDATE reminders
    SET status = 'cancelled'
    WHERE deadline_id = $1 AND status = 'pending'
    RETURNING id, deadline_id AS "deadlineId", kind, send_at AS "sendAt", status;
  `;
  const { rows } = await query(sql, [deadlineId]);
  return rows;
}

async function findByDeadlineId(deadlineId) {
  const sql = `
    SELECT 
      id, 
      deadline_id AS "deadlineId", 
      kind, 
      send_at AS "sendAt", 
      status, 
      attempts, 
      sent_at AS "sentAt", 
      error_details AS "errorDetails", 
      created_at AS "createdAt"
    FROM reminders
    WHERE deadline_id = $1
    ORDER BY send_at ASC;
  `;
  const { rows } = await query(sql, [deadlineId]);
  return rows;
}

async function deleteByDeadlineId(deadlineId) {
  const sql = `
    DELETE FROM reminders
    WHERE deadline_id = $1
    RETURNING id;
  `;
  const { rows } = await query(sql, [deadlineId]);
  return rows;
}

module.exports = {
  createMany,
  cancelPendingByDeadlineId,
  findByDeadlineId,
  deleteByDeadlineId,
};

