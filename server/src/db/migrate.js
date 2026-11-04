const fs = require('fs');
const path = require('path');
const { getClient, pool } = require('../config/db');

async function runMigrations({ silent = false } = {}) {
  const log = silent ? () => {} : console.log;
  const errorLog = silent ? () => {} : console.error;

  const client = await getClient();
  try {
    // 1. Ensure schema_migrations ledger exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const { rows: appliedRows } = await client.query(
      'SELECT name FROM schema_migrations ORDER BY id ASC;'
    );
    const appliedSet = new Set(appliedRows.map((r) => r.name));

    // 3. Read migration files from server/migrations
    const migrationsDir = path.resolve(__dirname, '../../migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found: ${migrationsDir}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    const pending = files.filter((f) => !appliedSet.has(f));

    if (pending.length === 0) {
      log('Database is up to date. No pending migrations.');
      return { appliedCount: 0, appliedFiles: [] };
    }

    log(`Found ${pending.length} pending migration(s). Executing...`);

    const appliedFiles = [];

    // 4. Run each pending migration inside an isolated transaction
    for (const filename of pending) {
      const filePath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN;');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1);',
          [filename]
        );
        await client.query('COMMIT;');
        log(`✓ Applied migration: ${filename}`);
        appliedFiles.push(filename);
      } catch (err) {
        await client.query('ROLLBACK;');
        errorLog(`✗ Migration failed in ${filename}:`, err.message);
        throw err;
      }
    }

    log(`Successfully applied ${appliedFiles.length} migration(s).`);
    return { appliedCount: appliedFiles.length, appliedFiles };
  } finally {
    client.release();
  }
}

// Support direct CLI invocation
if (require.main === module) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Migration process aborted:', err.message);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { runMigrations };

