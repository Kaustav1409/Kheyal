const { query } = require('../config/db');

async function create({ userId, title, subject = null, dueAt = null, hasDueTime = true, effortHours = null }) {
  const sql = `
    INSERT INTO deadlines (user_id, title, subject, due_at, has_due_time, effort_hours)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING 
      id, 
      user_id, 
      title, 
      subject, 
      due_at AS "dueAt", 
      has_due_time AS "hasDueTime", 
      effort_hours AS "effortHours", 
      status, 
      completed_at AS "completedAt", 
      created_at AS "createdAt", 
      updated_at AS "updatedAt";
  `;
  const { rows } = await query(sql, [
    userId,
    title,
    subject,
    dueAt ? new Date(dueAt).toISOString() : null,
    hasDueTime,
    effortHours,
  ]);
  return rows[0];
}

async function findAllByUser({ userId, status = 'active', subject = null }) {
  const params = [userId];
  const conditions = ['user_id = $1'];

  if (status === 'completed') {
    conditions.push("status = 'completed'");
  } else if (status === 'overdue') {
    conditions.push("status = 'active' AND due_at IS NOT NULL AND due_at < NOW()");
  } else if (status === 'active') {
    conditions.push("status = 'active'");
  }
  // status === 'all' applies no status condition

  if (subject) {
    params.push(`%${subject}%`);
    conditions.push(`subject ILIKE $${params.length}`);
  }

  const sql = `
    SELECT 
      id, 
      user_id, 
      title, 
      subject, 
      due_at AS "dueAt", 
      has_due_time AS "hasDueTime", 
      effort_hours AS "effortHours", 
      status, 
      completed_at AS "completedAt", 
      created_at AS "createdAt", 
      updated_at AS "updatedAt",
      (status = 'active' AND due_at IS NOT NULL AND due_at < NOW()) AS "isOverdue"
    FROM deadlines
    WHERE ${conditions.join(' AND ')}
    ORDER BY (due_at IS NULL) ASC, due_at ASC, created_at DESC;
  `;

  const { rows } = await query(sql, params);
  return rows;
}

async function findByIdAndUser({ id, userId }) {
  const sql = `
    SELECT 
      id, 
      user_id, 
      title, 
      subject, 
      due_at AS "dueAt", 
      has_due_time AS "hasDueTime", 
      effort_hours AS "effortHours", 
      status, 
      completed_at AS "completedAt", 
      created_at AS "createdAt", 
      updated_at AS "updatedAt",
      (status = 'active' AND due_at IS NOT NULL AND due_at < NOW()) AS "isOverdue"
    FROM deadlines
    WHERE id = $1 AND user_id = $2;
  `;
  const { rows } = await query(sql, [id, userId]);
  return rows[0] || null;
}

async function update({ id, userId, fields }) {
  const setClauses = ['updated_at = NOW()'];
  const params = [id, userId];

  if (fields.title !== undefined) {
    params.push(fields.title);
    setClauses.push(`title = $${params.length}`);
  }

  if (fields.subject !== undefined) {
    params.push(fields.subject);
    setClauses.push(`subject = $${params.length}`);
  }

  if (fields.dueAt !== undefined) {
    params.push(fields.dueAt ? new Date(fields.dueAt).toISOString() : null);
    setClauses.push(`due_at = $${params.length}`);
  }

  if (fields.hasDueTime !== undefined) {
    params.push(fields.hasDueTime);
    setClauses.push(`has_due_time = $${params.length}`);
  }

  if (fields.effortHours !== undefined) {
    params.push(fields.effortHours);
    setClauses.push(`effort_hours = $${params.length}`);
  }

  if (fields.status !== undefined) {
    params.push(fields.status);
    setClauses.push(`status = $${params.length}`);
    if (fields.status === 'completed') {
      setClauses.push('completed_at = NOW()');
    } else if (fields.status === 'active') {
      setClauses.push('completed_at = NULL');
    }
  }

  const sql = `
    UPDATE deadlines
    SET ${setClauses.join(', ')}
    WHERE id = $1 AND user_id = $2
    RETURNING 
      id, 
      user_id, 
      title, 
      subject, 
      due_at AS "dueAt", 
      has_due_time AS "hasDueTime", 
      effort_hours AS "effortHours", 
      status, 
      completed_at AS "completedAt", 
      created_at AS "createdAt", 
      updated_at AS "updatedAt",
      (status = 'active' AND due_at IS NOT NULL AND due_at < NOW()) AS "isOverdue";
  `;

  const { rows } = await query(sql, params);
  return rows[0] || null;
}

async function deleteByIdAndUser({ id, userId }) {
  const sql = `
    DELETE FROM deadlines
    WHERE id = $1 AND user_id = $2
    RETURNING id;
  `;
  const { rows } = await query(sql, [id, userId]);
  return rows[0] || null;
}

module.exports = {
  create,
  findAllByUser,
  findByIdAndUser,
  update,
  deleteByIdAndUser,
};
