const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const { pool } = require('./config/db');
const { startScheduler, stopScheduler } = require('./jobs/scheduler');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`✓ Kheyal backend server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  if (process.env.NODE_ENV !== 'test') {
    startScheduler();
  }
});

// Graceful shutdown handling
async function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  stopScheduler();
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await pool.end();
      console.log('PostgreSQL connection pool closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error closing database pool:', err.message);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;

