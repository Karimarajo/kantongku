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

-- v6: `last_active_at`, set best-effort (fire-and-forget, non-blocking) from
-- requireSession in server.ts on every authenticated request. `CREATE TABLE IF
-- NOT EXISTS` will NOT add this to a `users` table that already exists — for
-- an existing deployment, run manually against it once instead:
--   ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
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
  last_active_at TIMESTAMPTZ
);

-- v5: Meta Pixel/CAPI + UTM attribution columns below (utm_source .. fbc).
-- `CREATE TABLE IF NOT EXISTS` will NOT add these to an `orders` table that
-- already exists in a running database. For an existing deployment, run this
-- manually against it once instead of relying on this file:
--   ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_source TEXT;
--   ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_medium TEXT;
--   ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
--   ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_content TEXT;
--   ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_term TEXT;
--   ALTER TABLE orders ADD COLUMN IF NOT EXISTS fbclid TEXT;
--   ALTER TABLE orders ADD COLUMN IF NOT EXISTS fbp TEXT;
--   ALTER TABLE orders ADD COLUMN IF NOT EXISTS fbc TEXT;
--
-- Manual payment orders (no payment gateway): QRIS statis ShopeePay or BCA bank
-- transfer, matched by hand against a "kode unik" added to the base price.
--
-- v8: `order_type` distinguishes the main license purchase from a
-- collaborator-seat order (Task 2 revision — collaboration now goes through
-- this SAME manual-payment flow instead of a free stub). For an existing
-- deployment, run manually once instead of relying on this file:
--   ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'license';
--   ALTER TABLE orders ADD CONSTRAINT orders_order_type_check CHECK (order_type IN ('license', 'collaborator'));
--   ALTER TABLE orders ADD COLUMN IF NOT EXISTS collaborator_owner_user_id UUID REFERENCES users(id);
--   ALTER TABLE orders ADD COLUMN IF NOT EXISTS collaborator_email TEXT;
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
  confirmed_by TEXT,
  -- Marketing attribution, captured from the landing page URL/cookies at the
  -- moment the order was created. All nullable — organic (non-ad) traffic
  -- won't have any of these.
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbclid TEXT,
  fbp TEXT,
  fbc TEXT,
  -- 'license' = the main product purchase (unchanged flow). 'collaborator' =
  -- paying for another email to get full access to the buyer's (the owner's)
  -- data — see the `collaborators` table below. Only set for 'collaborator'.
  order_type TEXT NOT NULL DEFAULT 'license' CHECK (order_type IN ('license', 'collaborator')),
  collaborator_owner_user_id UUID REFERENCES users(id),
  collaborator_email TEXT,
  -- v9: Doku Checkout (Non-SNAP) integration — automatic payment alongside
  -- the manual BCA/QRIS flow (which stays fully functional as a fallback).
  -- `confirmed_via` distinguishes an admin's manual click from an automatic
  -- webhook confirmation, for the Admin Console badge. For an existing
  -- deployment, run manually once instead of relying on this file:
  --   ALTER TABLE orders ADD COLUMN IF NOT EXISTS doku_payment_url TEXT;
  --   ALTER TABLE orders ADD COLUMN IF NOT EXISTS doku_token_id TEXT;
  --   ALTER TABLE orders ADD COLUMN IF NOT EXISTS doku_expired_at TIMESTAMPTZ;
  --   ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_via TEXT;
  --   ALTER TABLE orders ADD CONSTRAINT orders_confirmed_via_check CHECK (confirmed_via IN ('manual', 'doku'));
  doku_payment_url TEXT,
  doku_token_id TEXT,
  doku_expired_at TIMESTAMPTZ,
  confirmed_via TEXT CHECK (confirmed_via IN ('manual', 'doku'))
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

-- v6: Landing page view analytics. Public writes via POST /api/track/pageview
-- (no auth — anonymous visitors), read by GET /api/admin/analytics/pageviews
-- (requireAdmin). Geolocation (country/city) is best-effort via ip-api.com —
-- left NULL when the lookup fails/times out or the IP is private/local.
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT, -- 'mobile' | 'desktop' | 'tablet'
  browser TEXT,
  os TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_visited_at ON page_views(visited_at);

-- v6: Customer support / contact form submissions from the landing page
-- (POST /api/support/submit, public). Managed from the Admin Console's
-- "Pesan Masuk" tab (PATCH /api/admin/support/:id/status).
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);

-- v7: admin's reply to a support message (Task 4). One reply per message for
-- now — if multi-reply history is ever needed, split into a
-- support_message_replies table instead, but this app's `support_messages`
-- predates that need. For an existing deployment, run manually once:
--   ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS admin_reply TEXT;
--   ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS admin_reply TEXT;
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

-- v7/v8: Collaboration (Task 2) — an owner account can invite another email
-- to get FULL read/write access to the same user_app_data as if they were
-- the owner (see requireSession in server.ts, which resolves
-- req.effectiveUserId to the owner's id for any active collaborator).
-- `id`/`owner_user_id` are UUID to match `users.id` above (NOT the
-- SERIAL/INTEGER a generic prompt might assume — this schema has always used
-- gen_random_uuid() for user ids).
--
-- v8 revision: activation is NO LONGER a free manual stub — a new invite now
-- goes through the SAME manual-payment order flow as the main license
-- (order_type='collaborator' above, price via COLLABORATOR_PRICE_AMOUNT),
-- confirmed by an admin exactly like a license order. `status` therefore
-- starts at 'pending_payment' (not 'pending') and only reaches 'active' via
-- POST /api/admin/orders/:code/confirm or a free reconnect (disconnected
-- collaborators don't need to pay again). For an existing deployment that
-- already ran the v7 shape of this table, run manually once instead of
-- relying on this file:
--   ALTER TABLE collaborators DROP CONSTRAINT IF EXISTS collaborators_status_check;
--   ALTER TABLE collaborators ALTER COLUMN status SET DEFAULT 'pending_payment';
--   ALTER TABLE collaborators ADD CONSTRAINT collaborators_status_check CHECK (status IN ('pending_payment', 'active', 'revoked'));
--   UPDATE collaborators SET status = 'pending_payment' WHERE status = 'pending';
--   ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMPTZ;
--   ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS disconnected_by TEXT;
--   ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id);
CREATE TABLE IF NOT EXISTS collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'active', 'revoked')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  -- Set on disconnect (owner or admin); cleared again on reconnect.
  disconnected_at TIMESTAMPTZ,
  disconnected_by TEXT CHECK (disconnected_by IN ('owner', 'admin')),
  -- The order that most recently activated this row — proof it was actually
  -- paid for at least once, which is what makes a FREE reconnect legitimate
  -- after a disconnect (no new order needed).
  order_id UUID REFERENCES orders(id),
  UNIQUE (owner_user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_collaborators_email_active ON collaborators(email) WHERE status = 'active';

-- v9: Web Push subscriptions (cicilan-ai-notifikasi Task 5). Kept as its own
-- relational table (unlike Debt/DebtPayment, which the same prompt chose to
-- store inside user_app_data — see the comment on those types in
-- src/types.ts): this is infrastructure/session data, not financial data —
-- the exact same category as `orders`/`collaborators`/`page_views` above,
-- and the server-side reminder-push cron needs to DELETE individual expired
-- rows without rewriting an entire user's JSONB blob.
--
-- `user_id` intentionally stores the OWNER's id (req.effectiveUserId at
-- subscribe time), not the literal logged-in account's id — consistent with
-- every other piece of per-account data in this app: a collaborator has full
-- access to the owner's reminders/debts, so a collaborator's own device
-- subscribing also gets notified when the OWNER's bill/cicilan reminder
-- fires, same as they already see all the owner's other data.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
