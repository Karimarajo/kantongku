-- One-off migration: removes magic_token / magic_token_expires_at from `users`.
--
-- These columns were added for a magic-link auto-login feature that has since
-- been simplified to a plain "send link to /app" email (no token, no
-- auto-session) — the columns are no longer read or written anywhere in the
-- app. schema.sql no longer creates them for fresh databases; run this once
-- against any database that was already migrated with the old schema:
--
--   psql "$DATABASE_URL" -f db/migrate_drop_magic_token.sql

ALTER TABLE users DROP COLUMN IF EXISTS magic_token;
ALTER TABLE users DROP COLUMN IF EXISTS magic_token_expires_at;
