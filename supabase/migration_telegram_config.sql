-- ============================================================
-- NARCOS BAY — Recoverable Telegram bot config
--
-- Stores the *current* bot token/identity so a deleted bot can be
-- replaced from the admin Bot Panel without a code change or redeploy.
-- The backend reads it with the service-role key; `TELEGRAM_BOT_TOKEN`
-- in the environment stays as a fallback.
--
-- HOW TO RUN:
--   Supabase Dashboard -> SQL Editor -> paste this file -> Run.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS telegram_config (
  id TEXT PRIMARY KEY,
  token TEXT,
  username TEXT,
  admin_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- The token is a secret. Enable RLS with NO permissive policy so only the
-- service-role key (used by the backend API) can read/write this table.
ALTER TABLE telegram_config ENABLE ROW LEVEL SECURITY;
