-- =============================================================================
-- Kheyal: one-time database bootstrap (run as the PostgreSQL superuser)
-- =============================================================================
-- Purpose
--   Create a least-privilege login role `kheyal_app` that the Express backend
--   uses instead of the `postgres` superuser, plus a dedicated `kheyal` schema
--   owned by that role. Application tables (created later by migrations) live
--   in this schema.
--
-- Why not just use `postgres`?
--   `postgres` is a superuser: it can read every database, create/drop roles,
--   and bypass all permission checks. If the app's credentials ever leaked, an
--   attacker would control the whole server. `kheyal_app` can only connect to
--   `kheyal_dev` and manage objects inside its own schema.
--
-- Safety
--   * Contains NO passwords. The password is typed interactively at the end
--     via `\password`, which sends only a hash to the server.
--   * Idempotent: safe to run more than once.
--
-- Usage (PowerShell, from D:\PROJECTS\Kheyal):
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -d kheyal_dev -f backend/scripts/db/create-app-role.sql
--
-- Decision note (development):
--   For the MVP, `kheyal_app` owns its schema so it can run migrations.
--   Before production we may split this into a migration role (DDL) and a
--   runtime role (data access only). See docs/database.md once written.
-- =============================================================================

\set ON_ERROR_STOP on

-- Guard: this script must run inside the kheyal_dev database.
SELECT current_database() = 'kheyal_dev' AS in_kheyal_dev \gset
\if :in_kheyal_dev
\else
  \echo 'ERROR: connect to kheyal_dev (use -d kheyal_dev) and run again.'
  \quit
\endif

-- 1. Create the login role if it does not already exist.
--    Explicitly deny every elevated capability.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kheyal_app') THEN
    CREATE ROLE kheyal_app
      LOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS
      CONNECTION LIMIT 20;
  END IF;
END
$$;

-- 2. Only explicitly granted roles may connect to kheyal_dev.
REVOKE CONNECT, TEMPORARY ON DATABASE kheyal_dev FROM PUBLIC;
GRANT CONNECT ON DATABASE kheyal_dev TO kheyal_app;

-- 3. Dedicated schema owned by the app role (tables will be created here).
CREATE SCHEMA IF NOT EXISTS kheyal AUTHORIZATION kheyal_app;

-- 4. Make unqualified table names resolve to the kheyal schema for this role.
ALTER ROLE kheyal_app IN DATABASE kheyal_dev SET search_path = kheyal;

-- 5. Show the result for verification.
\echo ''
\echo 'Role summary (all "f" except rolcanlogin is expected):'
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin, rolconnlimit
FROM pg_roles
WHERE rolname = 'kheyal_app';

\echo 'Schema owner:'
SELECT nspname AS schema, pg_get_userbyid(nspowner) AS owner
FROM pg_namespace
WHERE nspname = 'kheyal';

-- 6. Set (or reset) the password interactively. Nothing is echoed or logged.
\echo ''
\echo 'Now choose a password for kheyal_app (you will type it twice).'
\echo 'Use a long, unique password. You will put it ONLY in backend/.env.'
\password kheyal_app

\echo ''
\echo 'Done. kheyal_app is ready.'
