const { query } = require('../config/db');

async function findByEmail(email) {
  const sql = `
    SELECT id, email, password_hash, timezone, created_at, updated_at
    FROM users
    WHERE email = $1;
  `;
  const { rows } = await query(sql, [email.toLowerCase().trim()]);
  return rows[0] || null;
}

async function findById(id) {
  const sql = `
    SELECT id, email, password_hash, timezone, created_at, updated_at
    FROM users
    WHERE id = $1;
  `;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
}

async function create({ email, passwordHash = null, timezone = 'Asia/Kolkata' }) {
  const sql = `
    INSERT INTO users (email, password_hash, timezone)
    VALUES ($1, $2, $3)
    RETURNING id, email, timezone, created_at, updated_at;
  `;
  const { rows } = await query(sql, [email.toLowerCase().trim(), passwordHash, timezone]);
  return rows[0];
}

async function updateTimezone(id, timezone) {
  const sql = `
    UPDATE users
    SET timezone = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING id, email, timezone, updated_at;
  `;
  const { rows } = await query(sql, [id, timezone]);
  return rows[0] || null;
}

module.exports = {
  findByEmail,
  findById,
  create,
  updateTimezone,
};

