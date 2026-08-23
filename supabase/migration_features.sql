-- ============================================================
-- NARCOS BAY — feature migration
-- Notifications, order comments, and Telegram account linking.
-- Safe to run multiple times (IF NOT EXISTS).
-- ============================================================

-- 1. Notifications (in-app bell) — one row per user-facing alert
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'order',
  title TEXT NOT NULL,
  body TEXT,
  order_id TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Order comments — admin notes visible to the customer
CREATE TABLE IF NOT EXISTS order_comments (
  id UUID PRIMARY KEY,
  order_id TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'admin',
  author_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Pending Telegram link tokens (t.me/<bot>?start=nb-<token>)
CREATE TABLE IF NOT EXISTS telegram_links (
  token TEXT PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Link site user <-> telegram chat once confirmed via the bot
ALTER TABLE telegram_users ADD COLUMN IF NOT EXISTS site_user_id text REFERENCES users(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_comments_order ON order_comments (order_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_telegram_users_site ON telegram_users (site_user_id);

-- Keep service-key access simple (same as the other migrated tables).
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_links DISABLE ROW LEVEL SECURITY;
