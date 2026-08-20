-- One-off migration: removes the Doku Checkout (Non-SNAP) integration
-- columns from `orders`.
--
-- Task 2: the Doku integration (automatic VA/QRIS/e-wallet/card payment) has
-- been fully removed — the app is back to 100% manual, admin-confirmed QRIS
-- statis payment. schema.sql no longer creates these columns for fresh
-- databases; run this once against any database that already ran the v9
-- shape of schema.sql (i.e. was ever deployed with the Doku integration):
--
--   psql "$DATABASE_URL" -f db/migrate_drop_doku_columns.sql

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_confirmed_via_check;
ALTER TABLE orders DROP COLUMN IF EXISTS confirmed_via;
ALTER TABLE orders DROP COLUMN IF EXISTS doku_payment_url;
ALTER TABLE orders DROP COLUMN IF EXISTS doku_token_id;
ALTER TABLE orders DROP COLUMN IF EXISTS doku_expired_at;
