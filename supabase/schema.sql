-- ============================================================
-- NARCOS BAY — Supabase schema
-- Run this entire script once in the Supabase SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run)
-- ============================================================

-- ---------- 1. Users & Authentication ----------
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text,
  full_name text NOT NULL,
  avatar_url text,
  phone text,
  shipping_address text,
  role text DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN', 'SUPER_ADMIN')),
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at timestamptz DEFAULT now()
);

-- ---------- 2. Categories ----------
CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  image_url text,
  cloudinary_id text,
  display_order integer DEFAULT 1,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'INACTIVE')),
  is_hidden integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ---------- 3. Products ----------
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text,
  description text,
  short_description text,
  category_id text REFERENCES categories(id) ON DELETE SET NULL,
  sku text,
  batch_number text,
  thc_percent double precision,
  cbd_percent double precision,
  terpene_percent double precision,
  strain_type text,
  pricing_model text DEFAULT 'STANDARD' CHECK (pricing_model IN ('STANDARD', 'TIERED')),
  price double precision,
  compare_at_price double precision,
  price_on_request integer DEFAULT 0,
  inventory integer DEFAULT 0,
  low_stock_threshold integer DEFAULT 5,
  status text DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'DRAFT', 'ARCHIVED')),
  is_hidden integer DEFAULT 0,
  featured integer DEFAULT 0,
  new_arrival integer DEFAULT 0,
  best_seller integer DEFAULT 0,
  rating double precision DEFAULT 5.0,
  review_count integer DEFAULT 0,
  tags text DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------- 4. Product Media ----------
CREATE TABLE IF NOT EXISTS product_media (
  id text PRIMARY KEY,
  product_id text REFERENCES products(id) ON DELETE CASCADE,
  media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  cloudinary_public_id text,
  secure_url text NOT NULL,
  resource_type text DEFAULT 'image',
  alt_text text,
  display_order integer DEFAULT 1,
  is_primary integer DEFAULT 0
);

-- ---------- 5. Product Pricing Tiers ----------
CREATE TABLE IF NOT EXISTS product_pricing_tiers (
  id text PRIMARY KEY,
  product_id text REFERENCES products(id) ON DELETE CASCADE,
  quantity double precision NOT NULL,
  unit text NOT NULL,
  price double precision NOT NULL,
  display_order integer DEFAULT 1
);

-- ---------- 6. Orders ----------
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  order_number text UNIQUE NOT NULL,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  shipping_address text NOT NULL,
  items text NOT NULL,
  subtotal double precision NOT NULL,
  discount_amount double precision DEFAULT 0,
  discount_code text,
  shipping_fee double precision DEFAULT 0,
  tax_amount double precision DEFAULT 0,
  total_amount double precision NOT NULL,
  payment_method text NOT NULL,
  payment_status text DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID', 'REFUNDED', 'FAILED')),
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED')),
  tracking_number text,
  history text DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------- 7. Promotions / Coupons ----------
CREATE TABLE IF NOT EXISTS promotions (
  id text PRIMARY KEY,
  code text UNIQUE NOT NULL,
  description text,
  discount_type text CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value double precision NOT NULL,
  min_order_amount double precision DEFAULT 0,
  max_discount_amount double precision,
  start_date text,
  end_date text,
  usage_limit integer,
  times_used integer DEFAULT 0,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'DISABLED')),
  created_at timestamptz DEFAULT now()
);

-- ---------- 8. Customer Inquiries ----------
CREATE TABLE IF NOT EXISTS contact_messages (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  order_number text,
  category text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'READ', 'REPLIED', 'ARCHIVED')),
  replies text DEFAULT '[]',
  internal_notes text,
  created_at timestamptz DEFAULT now()
);

-- ---------- 9. Site Access & Geo-Blocking ----------
CREATE TABLE IF NOT EXISTS site_access_rules (
  id text PRIMARY KEY DEFAULT 'global_access_rules',
  is_enabled integer DEFAULT 0,
  mode text DEFAULT 'ALLOW_ALL_EXCEPT_BLOCKED' CHECK (mode IN ('ALLOW_ALL_EXCEPT_BLOCKED', 'BLOCK_ALL_EXCEPT_ALLOWED')),
  blocked_countries text DEFAULT '[]',
  allowed_countries text DEFAULT '[]',
  blocked_regions text DEFAULT '[]',
  allowed_regions text DEFAULT '[]',
  restriction_title text DEFAULT 'SERVICE NOT AVAILABLE IN YOUR REGION',
  restriction_message text DEFAULT 'Due to regulatory guidelines, Narcos Bay cannot serve orders to your current jurisdiction.',
  support_button_enabled integer DEFAULT 1,
  support_button_url text DEFAULT '/contact',
  telegram_button_enabled integer DEFAULT 1,
  telegram_button_url text DEFAULT 'https://t.me/narcosbay_official',
  updated_at timestamptz DEFAULT now()
);

-- ---------- 10. Access Audit Logs ----------
CREATE TABLE IF NOT EXISTS site_access_logs (
  id text PRIMARY KEY,
  ip_address text NOT NULL,
  country text NOT NULL,
  country_code text NOT NULL,
  region text,
  city text,
  path text NOT NULL,
  action text CHECK (action IN ('ALLOWED', 'BLOCKED')),
  reason text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- ---------- 11. Visitor Analytics ----------
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id text PRIMARY KEY,
  session_id text UNIQUE NOT NULL,
  visitor_id text NOT NULL,
  user_id text,
  user_name text,
  user_email text,
  ip_address text,
  country text,
  country_code text,
  region text,
  city text,
  device_type text,
  browser text,
  os text,
  referrer text,
  language text,
  started_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  duration_seconds integer DEFAULT 0,
  page_views integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id text PRIMARY KEY,
  session_id text NOT NULL,
  visitor_id text NOT NULL,
  user_id text,
  event_type text NOT NULL,
  path text NOT NULL,
  entity_id text,
  entity_name text,
  metadata text,
  country text,
  country_code text,
  device_type text,
  created_at timestamptz DEFAULT now()
);

-- ---------- 12. Global Settings & Homepage CMS ----------
CREATE TABLE IF NOT EXISTS site_settings (
  id text PRIMARY KEY DEFAULT 'global_settings',
  data text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS homepage_cms (
  id text PRIMARY KEY DEFAULT 'global_cms',
  data text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- ---------- 13. Recoverable Telegram bot config (token is a secret) ----------
CREATE TABLE IF NOT EXISTS telegram_config (
  id text PRIMARY KEY DEFAULT 'bot',
  token text,
  username text,
  admin_id text,
  updated_at timestamptz DEFAULT now()
);

-- ---------- Indexes ----------
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_media_product ON product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_tiers_product ON product_pricing_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session ON visitor_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON contact_messages(created_at);

-- ---------- Seed rows for settings / CMS / geo rules ----------
INSERT INTO site_settings (id, data, updated_at) VALUES ('global_settings', '{}', now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO homepage_cms (id, data, updated_at) VALUES ('global_cms', '{}', now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO site_access_rules (id) VALUES ('global_access_rules') ON CONFLICT (id) DO NOTHING;

-- ---------- Permissions ----------
-- The backend talks to Supabase with the service / publishable key.
-- These grants let that key read/write the tables without RLS friction.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_access_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_cms ENABLE ROW LEVEL SECURITY;
-- telegram_config holds the bot token: RLS on, and deliberately NO anon
-- policy, so only the service-role key used by the backend can access it.
ALTER TABLE telegram_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "full_anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_anon" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_anon" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_anon" ON product_media FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_anon" ON product_pricing_tiers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_anon" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_anon" ON promotions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_anon" ON contact_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_anon" ON site_access_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_anon" ON site_access_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_anon" ON visitor_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_anon" ON analytics_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_anon" ON site_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_anon" ON homepage_cms FOR ALL USING (true) WITH CHECK (true);
