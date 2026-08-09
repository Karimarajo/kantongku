-- KantongKu database schema
-- Run this once against the target PostgreSQL database:
--   psql "$DATABASE_URL" -f db/schema.sql
--
-- NOTE: `orders` changed shape between v3 (Midtrans) and v4 (manual QRIS/BCA
-- payment) in a way `CREATE TABLE IF NOT EXISTS` can't migrate automatically.
-- If you already ran the old v3 schema against this database and it has no
-- real order rows yet, drop it first: `DROP TABLE IF EXISTS orders;` — then
-- re-run this file.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  google_id TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_session_id UUID,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  magic_token TEXT,
  magic_token_expires_at TIMESTAMPTZ
);

-- Migrating an already-provisioned database: CREATE TABLE IF NOT EXISTS above
-- won't add columns to an existing table, so add them explicitly (no-op on a
-- fresh database where the table was just created with them already).
ALTER TABLE users ADD COLUMN IF NOT EXISTS magic_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS magic_token_expires_at TIMESTAMPTZ;

-- Manual payment orders (no payment gateway): QRIS statis ShopeePay or BCA bank
-- transfer, matched by hand against a "kode unik" added to the base price.
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('qris_shopee', 'transfer_bca')),
  base_amount NUMERIC NOT NULL,
  unique_code SMALLINT NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settlement', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
-- Helps the "find a free unique_code" check in POST /api/payment/create.
CREATE INDEX IF NOT EXISTS idx_orders_pending_unique_code ON orders (unique_code) WHERE status = 'pending';

-- Per-account application state (pockets, transactions, budgets, categories,
-- notifications, reminders, profile, settings) stored as a single JSON blob so
-- it follows the account across devices instead of living in browser
-- localStorage. The whole object is overwritten on every save from the client.
CREATE TABLE IF NOT EXISTS user_app_data (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
