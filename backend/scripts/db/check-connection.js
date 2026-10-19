/**
 * Kheyal — database connectivity check (Milestone 1).
 *
 * Usage (PowerShell, from D:\PROJECTS\Kheyal\backend):
 *   npm run db:check
 *
 * What it does:
 *   1. Loads backend/.env.
 *   2. Confirms the required PG* variables are present (prints NAMES only).
 *   3. Opens ONE connection with node-postgres and runs read-only queries.
 *   4. Warns if the app is connecting as a superuser.
 *   5. Closes the connection and exits with code 0 (ok) or 1 (failed).
 *
 * It never prints the password and never modifies the database.
 * This is a standalone diagnostic; the app's real connection pool will be
 * added in Milestone 3 (src/config/db.js).
 */
require("dotenv").config({ quiet: true });
const { Client } = require("pg");

const REQUIRED_VARS = ["PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD"];

async function main() {
  const missing = REQUIRED_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`✗ Missing environment variables in backend/.env: ${missing.join(", ")}`);
    console.error("  Copy backend/.env.example to backend/.env and fill them in.");
    process.exit(1);
  }

  if (process.env.PGPASSWORD.startsWith("replace-with")) {
    console.error("✗ PGPASSWORD in backend/.env is still the placeholder value.");
    process.exit(1);
  }

  const client = new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();

    const { rows } = await client.query(`
      SELECT
        current_user                         AS "user",
        current_database()                   AS "database",
        current_schema()                     AS "schema",
        current_setting('server_version')    AS "serverVersion",
        current_setting('TimeZone')          AS "sessionTimeZone",
        now()                                AS "serverTime",
        (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS "isSuperuser"
    `);
    const info = rows[0];

    console.log("✓ Connected to PostgreSQL");
    console.log(`  user:            ${info.user}`);
    console.log(`  database:        ${info.database}`);
    console.log(`  schema:          ${info.schema}`);
    console.log(`  server version:  ${info.serverVersion}`);
    console.log(`  session TZ:      ${info.sessionTimeZone}`);
    console.log(`  server time:     ${info.serverTime.toISOString()} (UTC)`);

    if (info.isSuperuser) {
      console.warn("⚠ Connected as a SUPERUSER. Use the kheyal_app role instead.");
      process.exitCode = 1;
    } else {
      console.log("✓ Not a superuser (least privilege OK)");
    }

    if (info.schema !== "kheyal") {
      console.warn(`⚠ Expected schema "kheyal" but got "${info.schema}". Check search_path.`);
      process.exitCode = 1;
    }
  } catch (err) {
    // pg error messages do not contain the password; still, print only safe fields.
    console.error("✗ Database connection failed");
    console.error(`  code:    ${err.code ?? "n/a"}`);
    console.error(`  message: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
