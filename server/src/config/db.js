const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'kheyal_dev',
      user: process.env.DB_USER || 'kheyal_app',
      password: process.env.DB_PASSWORD || 'kheyal_dev_secret',
    };

const pool = new Pool({
  ...connectionConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL === 'true') {
    console.log('Executed query', { text, duration, rows: res.rowCount });
  }
  return res;
}

async function getClient() {
  return await pool.connect();
}

async function close() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  close,
};

