import db from './schema.js';
import crypto from 'crypto';

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function svgUri(text, c1, c2, w = 800, h = 800) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><text x="50%" y="50%" font-family="Georgia,serif" font-size="42" fill="rgba(248,246,242,0.9)" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

const PALETTES = [
  ['#2F3A2F', '#5A6B5A'],
  ['#3E4A3E', '#8B6F47'],
  ['#8B0000', '#2F3A2F'],
  ['#4A554A', '#1E2620'],
  ['#6B4F2A', '#3E4A3E'],
  ['#2C3540', '#7A5C3E'],
];

const CATEGORIES = [
  { name: 'Indica', slug: 'indica', desc: 'Deep relaxation cultivars for evening serenity and full-body calm.', image: svgUri('Indica', '#3E4A3E', '#1E2620') },
  { name: 'Sativa', slug: 'sativa', desc: 'Uplifting, energizing strains crafted for clarity, creativity, and daytime focus.', image: svgUri('Sativa', '#6B4F2A', '#2F3A2F') },
  { name: 'Hybrid', slug: 'hybrid', desc: 'Balanced genetics blending the finest qualities of indica and sativa lineages.', image: svgUri('Hybrid', '#4A554A', '#8B6F47') },
  { name: 'Premium Flower', slug: 'premium-flower', desc: 'Top-shelf hand-trimmed flower from boutique cultivation rooms.', image: svgUri('Premium', '#8B0000', '#2F3A2F') },
  { name: 'Concentrates', slug: 'concentrates', desc: 'Solventless extracts and premium concentrates for the connoisseur.', image: svgUri('Extracts', '#2C3540', '#7A5C3E') },
];

const PRODUCTS = [
  {
    name: 'Midnight Kush Reserve', slug: 'midnight-kush-reserve', category: 'Indica', sku: 'NB-SKU-0001', batch: 'NB-BT-2024-01',
    desc: 'A rare indica cultivar grown in volcanic soil under low-light conditions, delivering a profoundly calming body high with notes of dark chocolate, earth, and crushed berries. Each harvest is lab-tested and hand-trimmed.',
    short: 'Rare indica reserve with dark chocolate and crushed berry terpenes.',
    thc: 26.4, cbd: 0.3, terpene: 3.2, strain: 'Indica', model: 'TIERED', price: 20,
    inventory: 340, featured: 1, best_seller: 1, new_arrival: 0, rating: 4.9, review_count: 128,
    tags: ['Top Shelf', 'Indica', 'Static Hash'],
    tiers: [[1, 'g', 20], [3.5, 'g', 60], [7, 'g', 110], [14, 'g', 200], [28, 'g', 380], [100, 'g', 1200]],
  },
  {
    name: 'Glacier Freeze Sift', slug: 'glacier-freeze-sift', category: 'Concentrates', sku: 'NB-SKU-0002', batch: 'NB-BT-2024-02',
    desc: 'Triple-filtered full-melt sift extracted through a glacier freeze process, preserving the delicate trichome heads and offering a solventless concentrate of unmatched purity and flavor clarity.',
    short: 'Solventless full-melt sift from glacier freeze extraction.',
    thc: 68.2, cbd: 1.1, terpene: 5.8, strain: 'Hybrid', model: 'TIERED', price: 35,
    inventory: 120, featured: 1, best_seller: 0, new_arrival: 1, rating: 4.8, review_count: 76,
    tags: ['Freeze Sift', 'Top Shelf'],
    tiers: [[1, 'g', 35], [3.5, 'g', 110], [7, 'g', 200], [14, 'g', 380]],
  },
  {
    name: 'Golden Haze Sunrise', slug: 'golden-haze-sunrise', category: 'Sativa', sku: 'NB-SKU-0003', batch: 'NB-BT-2024-03',
    desc: 'An energizing sativa landrace with a citrus-dominant terpene profile. Uplifting cerebral effects with sustained focus, ideal for creative work and daytime pursuits.',
    short: 'Citrus-dominant sativa landrace for daytime clarity.',
    thc: 22.8, cbd: 0.2, terpene: 2.9, strain: 'Sativa', model: 'TIERED', price: 18,
    inventory: 260, featured: 0, best_seller: 1, new_arrival: 0, rating: 4.7, review_count: 94,
    tags: ['Sativa', 'Hybrid'],
    tiers: [[1, 'g', 18], [3.5, 'g', 55], [7, 'g', 100], [14, 'g', 185], [28, 'g', 340], [100, 'g', 1050]],
  },
  {
    name: 'Amber Truffle Runtz', slug: 'amber-truffle-runtz', category: 'Hybrid', sku: 'NB-SKU-0004', batch: 'NB-BT-2024-04',
    desc: 'A sweet hybrid masterpiece combining candy-like terpenes with creamy truffle undertones. Perfectly balanced effects suitable for any occasion.',
    short: 'Sweet candy hybrid with creamy truffle undertones.',
    thc: 24.1, cbd: 0.4, terpene: 3.4, strain: 'Hybrid', model: 'TIERED', price: 22,
    inventory: 18, featured: 1, best_seller: 0, new_arrival: 1, rating: 4.9, review_count: 211,
    tags: ['Hybrid', 'Top Shelf'],
    tiers: [[1, 'g', 22], [3.5, 'g', 68], [7, 'g', 125], [14, 'g', 225], [28, 'g', 420]],
  },
  {
    name: 'Violet Crown Indica', slug: 'violet-crown-indica', category: 'Premium Flower', sku: 'NB-SKU-0005', batch: 'NB-BT-2024-05',
    desc: 'Award-winning premium flower with vivid violet hues and a floral, lavender-forward aroma. Boutique grown in living soil and cured for sixty days.',
    short: 'Award-winning living-soil flower with lavender aromatics.',
    thc: 28.6, cbd: 0.1, terpene: 4.1, strain: 'Indica', model: 'TIERED', price: 26,
    inventory: 0, featured: 1, best_seller: 1, new_arrival: 0, rating: 5.0, review_count: 58,
    tags: ['Top Shelf', 'Indica'],
    tiers: [[1, 'g', 26], [3.5, 'g', 80], [7, 'g', 145], [14, 'g', 260]],
  },
  {
    name: 'Citrus Static Hash', slug: 'citrus-static-hash', category: 'Concentrates', sku: 'NB-SKU-0006', batch: 'NB-BT-2024-06',
    desc: 'Traditional static sieved hash with a vibrant citrus punch. Hand-pressed into silky bricks that crumble at room temperature with resin-rich flavor.',
    short: 'Static-sieved traditional hash with citrus punch.',
    thc: 44.3, cbd: 2.4, terpene: 3.0, strain: 'Sativa', model: 'TIERED', price: 32,
    inventory: 85, featured: 0, best_seller: 0, new_arrival: 1, rating: 4.6, review_count: 39,
    tags: ['Static Hash'],
    tiers: [[1, 'g', 32], [3.5, 'g', 100], [7, 'g', 180]],
  },
  {
    name: 'Emerald Jelly Breath', slug: 'emerald-jelly-breath', category: 'Premium Flower', sku: 'NB-SKU-0007', batch: 'NB-BT-2024-07',
    desc: 'Dense emerald buds coated in jelly-like trichomes. A gassy, doughy aroma profile with euphoric yet relaxing effects. Small-batch and strictly limited.',
    short: 'Dense emerald buds with gassy doughy aromatics.',
    thc: 27.2, cbd: 0.5, terpene: 3.6, strain: 'Hybrid', model: 'TIERED', price: 24,
    inventory: 5, featured: 1, best_seller: 0, new_arrival: 0, rating: 4.8, review_count: 102,
    tags: ['Top Shelf', 'Hybrid'],
    tiers: [[1, 'g', 24], [3.5, 'g', 74], [7, 'g', 135], [14, 'g', 240], [28, 'g', 440]],
  },
  {
    name: 'Desert Bloom Sativa', slug: 'desert-bloom-sativa', category: 'Sativa', sku: 'NB-SKU-0008', batch: 'NB-BT-2024-08',
    desc: 'Sun-grown sativa from high-desert valleys, boasting spicy sage and pine notes. Clean, cerebral energy with a smooth finish.',
    short: 'High-desert sun-grown sativa with sage and pine.',
    thc: 21.5, cbd: 0.6, terpene: 2.4, strain: 'Sativa', model: 'STANDARD', price: 16,
    inventory: 200, featured: 0, best_seller: 0, new_arrival: 0, rating: 4.5, review_count: 33,
    tags: ['Sativa'],
    tiers: [],
  },
];

function seed() {
  const existing = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
  if (existing > 0) {
    console.log('Database already seeded, skipping seed.');
    return;
  }
  const insertCat = db.prepare(`INSERT INTO categories (id, name, slug, description, image_url, cloudinary_id, display_order, status) VALUES (?,?,?,?,?,?,?,?)`);
  const insertProd = db.prepare(`INSERT INTO products (id, name, slug, description, short_description, category_id, sku, batch_number, thc_percent, cbd_percent, terpene_percent, strain_type, pricing_model, price, inventory, low_stock_threshold, status, featured, new_arrival, best_seller, rating, review_count, tags, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertMedia = db.prepare(`INSERT INTO product_media (id, product_id, media_type, cloudinary_public_id, secure_url, resource_type, alt_text, display_order, is_primary) VALUES (?,?,?,?,?,?,?,?,?)`);
  const insertTier = db.prepare(`INSERT INTO product_pricing_tiers (id, product_id, quantity, unit, price, display_order) VALUES (?,?,?,?,?,?)`);

  const catIds = {};
  CATEGORIES.forEach((c, i) => {
    const id = uid();
    catIds[c.slug] = id;
    insertCat.run(id, c.name, c.slug, c.desc, c.image, 'local_' + c.slug, i + 1, 'ACTIVE');
  });

  PRODUCTS.forEach((p, pi) => {
    const id = uid();
    const palette = PALETTES[pi % PALETTES.length];
    insertProd.run(
      id, p.name, p.slug, p.desc, p.short, catIds[p.category], p.sku, p.batch,
      p.thc, p.cbd, p.terpene, p.strain, p.model, p.price, p.inventory, 5, 'PUBLISHED',
      p.featured, p.new_arrival, p.best_seller, p.rating, p.review_count,
      JSON.stringify(p.tags), now(), now()
    );
    const pImg = svgUri(p.name, palette[0], palette[1]);
    insertMedia.run(uid(), id, 'image', 'local_' + p.slug + '_1', pImg, 'image', p.name + ' primary', 1, 1);
    insertMedia.run(uid(), id, 'image', 'local_' + p.slug + '_2', svgUri(p.name + ' 02', palette[1], palette[0]), 'image', p.name + ' detail', 2, 0);
    if (pi % 3 === 0) {
      insertMedia.run(uid(), id, 'video', 'local_' + p.slug + '_reel', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'video', p.name + ' reel', 3, 0);
    }
    p.tiers.forEach((t, ti) => {
      insertTier.run(uid(), id, t[0], t[1], t[2], ti + 1);
    });
  });

  // Admin user
  const adminId = uid();
  db.prepare(`INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES (?,?,?,?,?,?)`).run(
    adminId, 'admin@narcosbay.com',
    '$scrypt$' + crypto.scryptSync('admin123', 'narcosbay', 64).toString('hex'),
    'Narcos Bay Admin', 'SUPER_ADMIN', 'ACTIVE'
  );

  // Sample customer
  const custId = uid();
  db.prepare(`INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES (?,?,?,?,?,?)`).run(
    custId, 'demo@narcosbay.com',
    '$scrypt$' + crypto.scryptSync('demo123', 'narcosbay', 64).toString('hex'),
    'Demo Customer', 'CUSTOMER', 'ACTIVE'
  );

  // Promotions
  const promos = [
    ['WELCOME10', '10% off your first order', 'PERCENTAGE', 10, 50, 100, 'ACTIVE'],
    ['FIRSTCLASS', 'Free express upgrade on orders over €150', 'PERCENTAGE', 15, 150, 300, 'ACTIVE'],
    ['VIP200', '€20 off premium tiers', 'FIXED', 20, 200, null, 'ACTIVE'],
  ];
  const insertPromo = db.prepare(`INSERT INTO promotions (id, code, description, discount_type, discount_value, min_order_amount, max_discount_amount, status) VALUES (?,?,?,?,?,?,?,?)`);
  promos.forEach((p) => insertPromo.run(uid(), ...p));

  // Sample orders + history
  const insertOrder = db.prepare(`INSERT INTO orders (id, order_number, user_id, customer_name, customer_email, customer_phone, shipping_address, items, subtotal, discount_amount, discount_code, shipping_fee, tax_amount, total_amount, payment_method, payment_status, status, tracking_number, history, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const orderHistory = [
    { status: 'PENDING', note: 'Order received', at: now() },
    { status: 'CONFIRMED', note: 'Payment confirmed via BTC', at: now() },
    { status: 'SHIPPED', note: 'Dispatched with stealth packaging', at: now() },
  ];
  insertOrder.run(uid(), 'NB-100421', custId, 'Demo Customer', 'demo@narcosbay.com', '+44 7000 000000',
    JSON.stringify({ address: '12 Grenville Road', city: 'London', postal_code: 'N7 0AA', country: 'United Kingdom' }),
    JSON.stringify([{ product_id: 'x', name: 'Midnight Kush Reserve', tier: '3.5g', quantity: 2, unit_price: 60, total: 120 }]),
    120, 0, null, 12, 21.6, 153.6, 'CRYPTO', 'PAID', 'SHIPPED', 'NB-TRK-8821',
    JSON.stringify(orderHistory), now(), now());

  // Site access rules default
  db.prepare(`INSERT INTO site_access_rules (id, is_enabled, mode, blocked_countries, allowed_countries, blocked_regions, allowed_regions, restriction_title, restriction_message, support_button_enabled, support_button_url, telegram_button_enabled, telegram_button_url, updated_at) VALUES ('global_access_rules', 0, 'ALLOW_ALL_EXCEPT_BLOCKED', '[]', '[]', '[]', '[]', 'SERVICE NOT AVAILABLE IN YOUR REGION', 'Due to regulatory guidelines, Narcos Bay cannot serve orders to your current jurisdiction.', 1, '/contact', 1, 'https://t.me/narcosbay_official', ?)`).run(now());

  // Site settings
  const settings = {
    store_name: 'NARCOS BAY',
    tagline: 'SHOP THE COLLECTION',
    support_email: 'admin@narcosbay.com',
    telegram_channel_url: 'https://t.me/narcosbay_official',
    telegram_display_name: 'Narcos Bay',
    telegram_cta: 'JOIN TELEGRAM',
    currency_code: 'EUR',
    currency_symbol: '€',
    symbol_position: 'before',
    decimal_places: 2,
    thousand_separator: ',',
    decimal_separator: '.',
    free_shipping_min: 150,
    flat_delivery_fee: 12,
    tax_percent: 9,
    announcement_text: 'Worldwide discreet delivery · Join our Telegram community',
  };
  db.prepare(`INSERT INTO site_settings (id, data, updated_at) VALUES ('global_settings', ?, ?)`).run(JSON.stringify(settings), now());

  // Homepage CMS
  const cms = {
    hero_headline: 'BOTANICAL EXCELLENCE & RARE SPECIMENS',
    hero_subtitle: 'Sourcing the world\u2019s rarest botanical cultivars with uncompromising purity, precision craft, and discreet international delivery.',
    primary_cta_label: 'EXPLORE THE ARCHIVE',
    primary_cta_url: '/shop',
    secondary_cta_label: 'JOIN TELEGRAM',
    secondary_cta_url: 'https://t.me/narcosbay_official',
    announcement_text: 'Worldwide discreet delivery · Join our Telegram community',
    trust_badges: [
      { icon: 'ShieldCheck', title: '100% Authentic Genetics', desc: 'Verified lineage from boutique cultivation rooms' },
      { icon: 'Package', title: 'Vacuum Stealth Packaging', desc: 'Odour-sealed and fully discreet' },
      { icon: 'Lock', title: 'Crypto & Card Payments', desc: 'BTC, XMR, USDT and ETH payments accepted' },
      { icon: 'Headphones', title: '24/7 Admin Support', desc: 'A dedicated advisor for every client' },
    ],
  };
  db.prepare(`INSERT INTO homepage_cms (id, data, updated_at) VALUES ('global_cms', ?, ?)`).run(JSON.stringify(cms), now());

  // Seed a few analytics events so dashboard has data
  const insertEvent = db.prepare(`INSERT INTO analytics_events (id, session_id, visitor_id, event_type, path, entity_name, metadata, country, country_code, device_type, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const countries = [['Germany', 'DE'], ['Netherlands', 'NL'], ['United Kingdom', 'GB'], ['United States', 'US'], ['Spain', 'ES'], ['France', 'FR'], ['Canada', 'CA'], ['Italy', 'IT']];
  const devices = ['Desktop', 'Mobile', 'Mobile', 'Desktop', 'Tablet'];
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Chrome', 'Edge'];
  const paths = ['/shop', '/', '/product/midnight-kush-reserve', '/checkout', '/contact', '/account'];
  for (let i = 0; i < 60; i++) {
    const c = countries[i % countries.length];
    const evt = i % 5 === 0 ? 'pageview' : i % 4 === 0 ? 'cart_add' : i % 3 === 0 ? 'checkout_step' : 'pageview';
    const p = i % 7 === 3 ? '/checkout' : i % 5 === 2 ? '/shop' : paths[i % paths.length];
    insertEvent.run(uid(), 'seed-session-' + (i % 9), 'seed-visitor-' + (i % 6), evt, p,
      evt === 'cart_add' ? 'Midnight Kush Reserve' : null,
      JSON.stringify({ seed: true }), c[0], c[1], devices[i % devices.length], now());
  }
  const sessions = [];
  for (let i = 0; i < 12; i++) {
    const c = countries[i % countries.length];
    sessions.push(['seed-session-' + i, 'seed-visitor-' + (i % 6), c[0], c[1], devices[i % devices.length], browsers[i % browsers.length], 'Desktop', 3 + (i * 4), 1 + (i % 5)]);
  }
  const insertSession = db.prepare(`INSERT INTO visitor_sessions (id, session_id, visitor_id, ip_address, country, country_code, device_type, browser, os, language, page_views, duration_seconds, started_at, last_activity_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  sessions.forEach((s) => insertSession.run(uid(), s[0], s[1], 'ip-' + s[0], s[2], s[3], s[4], s[5], s[6], 'EN', s[7], s[8], now(), now()));

  console.log('Seed complete: ' + CATEGORIES.length + ' categories, ' + PRODUCTS.length + ' products, ' + promos.length + ' promos.');
}

seed();
