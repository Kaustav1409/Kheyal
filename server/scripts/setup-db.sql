-- Kheyal Database and Least-Privilege Role Setup
-- Execute in psql as PostgreSQL superuser (postgres)
-- Example: & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -f server\scripts\setup-db.sql

-- 1. Create development database if not exists
SELECT 'CREATE DATABASE kheyal_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kheyal_dev')\gexec

-- 2. Create application role if not exists with password
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kheyal_app') THEN
      CREATE ROLE kheyal_app WITH LOGIN PASSWORD 'kheyal_dev_secret' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
   ELSE
      ALTER ROLE kheyal_app WITH PASSWORD 'kheyal_dev_secret';
   END IF;
END
$do$;

-- 3. Connect to kheyal_dev and configure permissions
\c kheyal_dev

-- Restrict database connection
REVOKE CONNECT, TEMPORARY ON DATABASE kheyal_dev FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE kheyal_dev TO kheyal_app;

-- Ensure schema kheyal exists and is owned by kheyal_app
CREATE SCHEMA IF NOT EXISTS kheyal AUTHORIZATION kheyal_app;
ALTER ROLE kheyal_app IN DATABASE kheyal_dev SET search_path = kheyal, public;

-- Grant permissions on schema kheyal
GRANT ALL PRIVILEGES ON SCHEMA kheyal TO kheyal_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA kheyal TO kheyal_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA kheyal TO kheyal_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA kheyal GRANT ALL ON TABLES TO kheyal_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA kheyal GRANT ALL ON SEQUENCES TO kheyal_app;

-- Also grant schema public permissions to prevent schema fallback errors
GRANT USAGE, CREATE ON SCHEMA public TO kheyal_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kheyal_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kheyal_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kheyal_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kheyal_app;

\echo ''
\echo '✓ Database kheyal_dev and role kheyal_app successfully configured!'
