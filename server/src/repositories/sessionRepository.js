const { query } = require('../config/db');

async function create({ userId, tokenHash, expiresAt }) {
  const sql = `
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id, user_id, expires_at, created_at, last_activity_at;
  `;
  const { rows } = await query(sql, [userId, tokenHash, expiresAt]);
  return rows[0];
}

async function findActiveByTokenHash(tokenHash) {
  const sql = `
    SELECT 
      s.id AS session_id,
      s.user_id,
      s.expires_at,
      s.last_activity_at,
      s.created_at AS session_created_at,
      u.id AS user_id,
      u.email,
      u.timezone,
      u.created_at AS user_created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = $1
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW();
  `;
  const { rows } = await query(sql, [tokenHash]);
  return rows[0] || null;
}

async function renew(sessionId, newExpiresAt) {
  const sql = `
    UPDATE sessions
    SET expires_at = $2, last_activity_at = NOW()
    WHERE id = $1 AND revoked_at IS NULL
    RETURNING id, expires_at, last_activity_at;
  `;
  const { rows } = await query(sql, [sessionId, newExpiresAt]);
  return rows[0] || null;
}

async function revoke(sessionId) {
  const sql = `
    UPDATE sessions
    SET revoked_at = NOW()
    WHERE id = $1 AND revoked_at IS NULL
    RETURNING id, revoked_at;
  `;
  const { rows } = await query(sql, [sessionId]);
  return rows[0] || null;
}

async function revokeAllForUser(userId) {
  const sql = `
    UPDATE sessions
    SET revoked_at = NOW()
    WHERE user_id = $1 AND revoked_at IS NULL
    RETURNING id;
  `;
  const { rows } = await query(sql, [userId]);
  return rows;
}

module.exports = {
  create,
  findActiveByTokenHash,
  renew,
  revoke,
  revokeAllForUser,
};
