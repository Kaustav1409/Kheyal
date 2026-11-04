const { query } = require('../config/db');

async function upsert({ userId, endpoint, p256dh, auth }) {
  const sql = `
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (endpoint)
    DO UPDATE SET user_id = $1, p256dh = $3, auth = $4
    RETURNING id, user_id AS "userId", endpoint, created_at AS "createdAt";
  `;
  const { rows } = await query(sql, [userId, endpoint, p256dh, auth]);
  return rows[0];
}

async function deleteByEndpointAndUser({ endpoint, userId }) {
  const sql = `
    DELETE FROM push_subscriptions
    WHERE endpoint = $1 AND user_id = $2
    RETURNING id;
  `;
  const { rows } = await query(sql, [endpoint, userId]);
  return rows[0] || null;
}

async function deleteByEndpoint(endpoint) {
  const sql = `
    DELETE FROM push_subscriptions
    WHERE endpoint = $1
    RETURNING id;
  `;
  const { rows } = await query(sql, [endpoint]);
  return rows[0] || null;
}

async function findByUserId(userId) {
  const sql = `
    SELECT id, user_id AS "userId", endpoint, p256dh, auth, created_at AS "createdAt"
    FROM push_subscriptions
    WHERE user_id = $1;
  `;
  const { rows } = await query(sql, [userId]);
  return rows;
}

module.exports = {
  upsert,
  deleteByEndpointAndUser,
  deleteByEndpoint,
  findByUserId,
};
