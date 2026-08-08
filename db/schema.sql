-- KantongKu database schema
-- Run this once against the target PostgreSQL database:
--   psql "$DATABASE_URL" -f db/schema.sql

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
  activated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  midtrans_order_id TEXT UNIQUE NOT NULL,
  amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settlement', 'expire', 'cancel', 'deny')),
  raw_notification JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Per-account application state (pockets, transactions, budgets, categories,
-- notifications, reminders, profile, settings) stored as a single JSON blob so
-- it follows the account across devices instead of living in browser
-- localStorage. The whole object is overwritten on every save from the client.
CREATE TABLE IF NOT EXISTS user_app_data (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
