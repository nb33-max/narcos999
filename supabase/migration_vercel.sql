-- ============================================================
-- NARCOS BAY — Vercel migration
-- Creates the 5 tables that previously lived in local SQLite so
-- they now live in Supabase Postgres (required for serverless).
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → paste this file → Run.
-- It is safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================

-- 1. Stories (site-wide, admin-created, expiring)
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image',
  caption TEXT,
  link_url TEXT,
  expires_at TIMESTAMPTZ,
  active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Story likes
CREATE TABLE IF NOT EXISTS story_likes (
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  liker_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (story_id, liker_key)
);

-- 3. Telegram bot users
CREATE TABLE IF NOT EXISTS telegram_users (
  id TEXT PRIMARY KEY,
  telegram_id TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  language TEXT DEFAULT 'EN',
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Telegram broadcast log
CREATE TABLE IF NOT EXISTS telegram_broadcasts (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  sent_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'SENT',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Admin-managed payment method details (per entry)
CREATE TABLE IF NOT EXISTS payment_method_details (
  id TEXT PRIMARY KEY,
  method TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  hint TEXT,
  display_order INTEGER DEFAULT 1,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Seed: current data carried over from the SQLite database
-- ============================================================

INSERT INTO stories (id, title, media_url, media_type, caption, link_url, expires_at, active, display_order, created_at, updated_at) VALUES
('ef2f518f-5c68-475d-a125-0c1544fb5f17', ' California orange 🍊 ', 'https://res.cloudinary.com/qej6tg6f/video/upload/v1787400387/xdag71j3s21tyvvj8bww.mp4', 'image', 'Frutatech x Billy the dry🧑🌾🤠 Semi dry (no presse)', NULL, NULL, 1, 1, '2026-08-22T12:07:16.686Z', '2026-08-22T12:07:16.686Z'),
('13946eca-84e2-449b-91e1-729782f4163b', 'JUVENTUS 🏍️', 'https://res.cloudinary.com/qej6tg6f/video/upload/v1787416657/yyyvp4o7qm14arwbisv0.mp4', 'image', 'Goal 🚀', NULL, NULL, 1, 1, '2026-08-22T16:38:03.722Z', '2026-08-22T16:38:03.722Z'),
('fd097e47-0f43-4d3b-b2cf-b8cebba95722', 'TOP AAA ✅', 'https://res.cloudinary.com/qej6tg6f/video/upload/v1787417729/g1pgodcvtyn3t5stce6n.mp4', 'image', 'Contact to buy', NULL, NULL, 1, 1, '2026-08-22T16:55:47.122Z', '2026-08-22T16:55:47.122Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO telegram_users (id, telegram_id, first_name, last_name, username, language, last_active_at, created_at) VALUES
('870eef10-f7ae-4fe0-aaf4-b10f8d084d2c', '999000111', 'Flow Tester', NULL, 'flow_tester', 'EN', '2026-08-22T16:23:24.463Z', '2026-08-22T02:40:07.028Z'),
('882d8603-8d54-4992-b0a6-c66d8670a64d', '8953152983', 'Park', 'Smith', 'narcosbay', 'EN', '2026-08-22T16:32:45.360Z', '2026-08-22T02:51:40.803Z')
ON CONFLICT (telegram_id) DO NOTHING;

INSERT INTO payment_method_details (id, method, label, value, hint, display_order, active, created_at) VALUES
('47ac2026-9711-4ac5-90aa-bea4ebe1a7b9', 'CRYPTO', 'Bitcoin (BTC)', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'Network: Bitcoin', 1, 1, '2026-08-22T02:30:57.607Z'),
('12944290-b271-4f9d-8436-c9c3b5fb8003', 'CRYPTO', 'Ethereum (ETH)', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'Network: ERC-20', 2, 1, '2026-08-22T02:30:57.610Z'),
('39547b42-9460-4c98-acf1-74a713c40f94', 'CRYPTO', 'Monero (XMR)', '8BqkC9s6KJqV7g2m4xRwP3tY5zE7nQ9aD2fH4jK6lM8oP0rS1uV3wX5yZ7bC4dE6', 'Network: Monero', 3, 1, '2026-08-22T02:30:57.610Z'),
('05ff6689-f9e6-42ac-8eb3-c9036a79a968', 'CRYPTO', 'Tether (USDT)', 'TXyK5P2mQ9rV4nB8sD3fG6hJ1kL7zX9cV2bN5', 'Network: TRC-20', 4, 1, '2026-08-22T02:30:57.610Z'),
('d61b440f-1a26-45b1-aa80-931665ece745', 'WIRE', 'SEPA / SWIFT Transfer', 'Beneficiary: NARCOS BAY LTD
IBAN: DE89 3704 0044 0532 0130 00
BIC: COBADEFFXXX
Reference: please use your order number as the payment reference.', 'Use your order number as reference for faster matching.', 1, 1, '2026-08-22T02:30:57.610Z'),
('de97e11d-a75e-4959-a7cc-814e82816d26', 'PAYPAL', 'PayPal Payment', 'https://paypal.me/narcosbay', 'Send the total to the link above and note your order number. Funds are confirmed manually by our team.', 1, 1, '2026-08-22T02:30:57.610Z'),
('e63b4e70-8e61-4e04-af21-ef0ec747a766', 'GIFT', 'Apple Gift Card', 'Apple', 'Redeemable directly on site', 1, 1, '2026-08-22T02:30:57.610Z'),
('c0b6e965-ee59-46d2-87bd-0daac5782a08', 'GIFT', 'Amazon Gift Card', 'Amazon', 'Redeemable directly on site', 2, 1, '2026-08-22T02:30:57.611Z'),
('0c119feb-326b-4d90-9f09-34e34dc0f966', 'GIFT', 'Google Play Gift Card', 'Google', 'Redeemable directly on site', 3, 1, '2026-08-22T02:30:57.611Z'),
('28b9f7b4-dd1d-4d43-9ecc-b1cb2bafa8cc', 'GIFT', 'Steam Gift Card', 'Steam', 'Redeemable directly on site', 4, 1, '2026-08-22T02:30:57.611Z'),
('7a322517-7b93-4174-86b9-446725c46a96', 'GIFT', 'Razer Gold Gift Card', 'Razer', 'Redeemable directly on site', 5, 1, '2026-08-22T02:30:57.611Z')
ON CONFLICT (id) DO NOTHING;
