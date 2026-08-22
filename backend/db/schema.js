import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'narcosbay.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  shipping_address TEXT,
  role TEXT DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN', 'SUPER_ADMIN')),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  image_url TEXT,
  cloudinary_id TEXT,
  display_order INTEGER DEFAULT 1,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'INACTIVE')),
  is_hidden INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 3. Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  short_description TEXT,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  sku TEXT,
  batch_number TEXT,
  thc_percent REAL,
  cbd_percent REAL,
  terpene_percent REAL,
  strain_type TEXT,
  pricing_model TEXT DEFAULT 'STANDARD' CHECK (pricing_model IN ('STANDARD', 'TIERED')),
  price REAL,
  compare_at_price REAL,
  price_on_request INTEGER DEFAULT 0,
  inventory INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  status TEXT DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'DRAFT', 'ARCHIVED')),
  is_hidden INTEGER DEFAULT 0,
  featured INTEGER DEFAULT 0,
  new_arrival INTEGER DEFAULT 0,
  best_seller INTEGER DEFAULT 0,
  rating REAL DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. Product Media
CREATE TABLE IF NOT EXISTS product_media (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  cloudinary_public_id TEXT,
  secure_url TEXT NOT NULL,
  resource_type TEXT DEFAULT 'image',
  alt_text TEXT,
  display_order INTEGER DEFAULT 1,
  is_primary INTEGER DEFAULT 0
);

-- 5. Product Pricing Tiers
CREATE TABLE IF NOT EXISTS product_pricing_tiers (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  price REAL NOT NULL,
  display_order INTEGER DEFAULT 1
);

-- 6. Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address TEXT NOT NULL,
  items TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  discount_code TEXT,
  shipping_fee REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID', 'REFUNDED', 'FAILED')),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED')),
  tracking_number TEXT,
  history TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 7. Promotions / Coupons
CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value REAL NOT NULL,
  min_order_amount REAL DEFAULT 0,
  max_discount_amount REAL,
  start_date TEXT,
  end_date TEXT,
  usage_limit INTEGER,
  times_used INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'DISABLED')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 8. Customer Inquiries
CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  order_number TEXT,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'READ', 'REPLIED', 'ARCHIVED')),
  replies TEXT DEFAULT '[]',
  internal_notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 9. Site Access & Geo-Blocking Configuration
CREATE TABLE IF NOT EXISTS site_access_rules (
  id TEXT PRIMARY KEY DEFAULT 'global_access_rules',
  is_enabled INTEGER DEFAULT 0,
  mode TEXT DEFAULT 'ALLOW_ALL_EXCEPT_BLOCKED' CHECK (mode IN ('ALLOW_ALL_EXCEPT_BLOCKED', 'BLOCK_ALL_EXCEPT_ALLOWED')),
  blocked_countries TEXT DEFAULT '[]',
  allowed_countries TEXT DEFAULT '[]',
  blocked_regions TEXT DEFAULT '[]',
  allowed_regions TEXT DEFAULT '[]',
  restriction_title TEXT DEFAULT 'SERVICE NOT AVAILABLE IN YOUR REGION',
  restriction_message TEXT DEFAULT 'Due to regulatory guidelines, Narcos Bay cannot serve orders to your current jurisdiction.',
  support_button_enabled INTEGER DEFAULT 1,
  support_button_url TEXT DEFAULT '/contact',
  telegram_button_enabled INTEGER DEFAULT 1,
  telegram_button_url TEXT DEFAULT 'https://t.me/narcosbay_official',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 10. Access Audit Logs
CREATE TABLE IF NOT EXISTS site_access_logs (
  id TEXT PRIMARY KEY,
  ip_address TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT NOT NULL,
  region TEXT,
  city TEXT,
  path TEXT NOT NULL,
  action TEXT CHECK (action IN ('ALLOWED', 'BLOCKED')),
  reason TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 11. Visitor Analytics Sessions & Live Events
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id TEXT PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  visitor_id TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  user_email TEXT,
  ip_address TEXT,
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  referrer TEXT,
  language TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  last_activity_at TEXT DEFAULT (datetime('now')),
  duration_seconds INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL,
  path TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  metadata TEXT,
  country TEXT,
  country_code TEXT,
  device_type TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 12. Global Settings & Homepage CMS
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY DEFAULT 'global_settings',
  data TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS homepage_cms (
  id TEXT PRIMARY KEY DEFAULT 'global_cms',
  data TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 13. Stories (admin-created, site-wide, expiring)
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  link_url TEXT,
  expires_at TEXT,
  active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 14. Admin-managed payment method details (per-entry)
CREATE TABLE IF NOT EXISTS payment_method_details (
  id TEXT PRIMARY KEY,
  method TEXT NOT NULL CHECK (method IN ('CRYPTO', 'WIRE', 'PAYPAL', 'GIFT')),
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  hint TEXT,
  display_order INTEGER DEFAULT 1,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 15. Telegram bot users & broadcasts
CREATE TABLE IF NOT EXISTS telegram_users (
  id TEXT PRIMARY KEY,
  telegram_id TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  language TEXT DEFAULT 'EN',
  last_active_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS telegram_broadcasts (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  sent_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'SENT' CHECK (status IN ('SENT', 'PARTIAL', 'FAILED')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS story_likes (
  story_id TEXT NOT NULL,
  liker_key TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (story_id, liker_key)
);
`);

export default db;
