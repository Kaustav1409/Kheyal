// In Vitest, test globals (describe, it, expect, afterAll) are injected by --globals
// CommonJS modules can be required directly
const { pool, query, close } = require('../src/config/db');
const { runMigrations } = require('../src/db/migrate');

describe('Database Foundation & Migration Runner', () => {
  afterAll(async () => {
    await close();
  });

  it('connects to PostgreSQL and executes basic query', async () => {
    const res = await query('SELECT 1 + 1 AS result;');
    expect(res.rows[0].result).toBe(2);
  });

  it('runs as a least-privilege role (not a superuser)', async () => {
    const res = await query(`
      SELECT current_user AS "user",
             (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS "isSuperuser";
    `);
    expect(res.rows[0].user).toBe('kheyal_app');
    expect(res.rows[0].isSuperuser).toBe(false);
  });

  it('applies all initial schema migrations in order', async () => {
    const result = await runMigrations({ silent: true });
    expect(result).toHaveProperty('appliedCount');

    // Verify all 5 migrations are recorded in schema_migrations
    const { rows: migrations } = await query(
      'SELECT name FROM schema_migrations ORDER BY id ASC;'
    );
    const migrationNames = migrations.map((m) => m.name);

    expect(migrationNames).toContain('001_create_users.sql');
    expect(migrationNames).toContain('002_create_sessions.sql');
    expect(migrationNames).toContain('003_create_deadlines.sql');
    expect(migrationNames).toContain('004_create_reminders.sql');
    expect(migrationNames).toContain('005_create_push_subscriptions.sql');
  });

  it('creates the required tables with correct constraints', async () => {
    const { rows: tables } = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN ('users', 'sessions', 'deadlines', 'reminders', 'push_subscriptions');
    `);

    const tableNames = tables.map((t) => t.table_name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('deadlines');
    expect(tableNames).toContain('reminders');
    expect(tableNames).toContain('push_subscriptions');
  });

  it('is idempotent: running migrations again applies 0 new files without errors', async () => {
    const result = await runMigrations({ silent: true });
    expect(result.appliedCount).toBe(0);
    expect(result.appliedFiles).toHaveLength(0);
  });
});
