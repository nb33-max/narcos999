import { Router } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { supabase, cloudinary, uid, now, parseJson, errMsg, isUniqueViolation, shapeProduct, parseOrder } from '../db/supabase.js';
import {
  listStories, listActiveStories, getStory, insertStory, updateStory, deleteStory, toggleStoryLike,
  listPaymentEntries, listActivePaymentEntries, insertPaymentEntry, updatePaymentEntry, deletePaymentEntry,
  listTelegramUsers,
  listNotifications, createNotification, markNotificationsRead, notifyStoryToAll,
  listOrderComments, addOrderComment,
  createTelegramLink, getTelegramUserBySiteUser,
} from '../db/local.js';
import { telegramController, processUpdate, setupWebhook, getWebhookInfo, getBotUsername, sendToChat, notifyOrderStatus } from '../telegram/bot.js';
import { signToken } from '../lib/auth.js';

const router = Router();

function hashPassword(pw) {
  return '$scrypt$' + crypto.scryptSync(pw, 'narcosbay', 64).toString('hex');
}
function verifyPassword(pw, stored) {
  const salt = 'narcosbay';
  const actual = stored.startsWith('$scrypt$') ? stored.slice(8) : stored;
  const candidate = crypto.scryptSync(pw, salt, 64).toString('hex');
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(candidate, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function publicUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

const asyncHandler = (fn) => (req, res) => fn(req, res).catch((e) => {
  res.status(500).json({ error: errMsg(e, 'Internal server error') });
});

// Small, believable review counts for products that have none specified.
const randomReviewCount = () => Math.floor(3 + Math.random() * 28); // 3..30

// Deterministic, believable star ratings seeded from the product slug so each
// product keeps a stable score across requests. Quality tags nudge the score up.
const PREMIUM_TAG = /premium|top shelf|exotic|signature|elite|gold|award|best/i;
const randomRating = (seed = '', tags = []) => {
  let h = 2166136261;
  const s = seed || 'prod';
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let rating = 3.6 + ((h >>> 0) % 1000) / 1000 * 1.2; // 3.6..4.8
  if ((tags || []).some((tag) => PREMIUM_TAG.test(tag))) rating += 0.15;
  return Math.round(Math.min(4.9, rating) * 10) / 10;
};

// ---------- Geo helper ----------
function detectCountry(req) {
  const countryCode = (req.headers['cf-ipcountry'] || req.headers['x-country-code'] || '').toString().toUpperCase();
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket?.remoteAddress || '0.0.0.0';
  const MAP = { DE: 'Germany', NL: 'Netherlands', GB: 'United Kingdom', US: 'United States', ES: 'Spain', FR: 'France', CA: 'Canada', IT: 'Italy', PT: 'Portugal', IE: 'Ireland', CH: 'Switzerland', BE: 'Belgium', AT: 'Austria' };
  const country = MAP[countryCode] || 'Unknown';
  return { country, countryCode, ip };
}

const PRODUCT_SELECT = '*, categories(id, name, slug), product_media(*), product_pricing_tiers(*)';

async function getProduct(id) {
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle();
  if (error || !data) return null;
  return shapeProduct(data);
}

async function getProductBySlug(slug) {
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('slug', slug).limit(1).maybeSingle();
  if (error || !data) return null;
  return shapeProduct(data);
}

// ---------- Auth ----------
router.post('/auth/register', asyncHandler(async (req, res) => {
  const { email, password, full_name } = req.body || {};
  if (!email || !password || !full_name) return res.status(400).json({ error: 'Missing required fields' });
  const id = uid();
  const { data, error } = await supabase.from('users').insert({
    id,
    email: email.toLowerCase(),
    password_hash: hashPassword(password),
    full_name,
    role: 'CUSTOMER',
    status: 'ACTIVE',
    created_at: now(),
  }).select('*').single();
  if (error) {
    if (isUniqueViolation(error)) return res.status(409).json({ error: 'Email already registered' });
    throw error;
  }
  res.status(201).json({ user: publicUser(data) });
}));

router.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const { data: user } = await supabase.from('users').select('*').eq('email', (email || '').toLowerCase()).maybeSingle();
  if (!user || !user.password_hash || !verifyPassword(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (user.status === 'SUSPENDED') return res.status(403).json({ error: 'Account suspended' });
  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
}));

router.get('/auth/me', asyncHandler(async (req, res) => {
  const user = await req.getAuth();
  res.json({ user: publicUser(user) });
}));

router.post('/auth/logout', (req, res) => {
  res.json({ ok: true });
});

// ---------- Google OAuth (config-driven; disabled until GOOGLE_CLIENT_ID is set) ----------
router.get('/auth/config', (req, res) => {
  res.json({ google_client_id: process.env.GOOGLE_CLIENT_ID || null });
});

router.post('/auth/google', asyncHandler(async (req, res) => {
  const { id_token } = req.body || {};
  if (!id_token) return res.status(400).json({ error: 'Missing id_token' });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ error: 'Google sign-in is not configured' });

  let info;
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`);
    if (!r.ok) return res.status(401).json({ error: 'Invalid Google token' });
    info = await r.json();
  } catch {
    return res.status(502).json({ error: 'Unable to verify Google token' });
  }

  if (info.aud !== clientId) return res.status(401).json({ error: 'Google token audience mismatch' });
  const email = (info.email || '').toLowerCase();
  if (!email || !info.email_verified) return res.status(401).json({ error: 'Unverified Google account' });

  let { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  if (!user) {
    const id = uid();
    const { data, error } = await supabase.from('users').insert({
      id,
      email,
      full_name: (info.name || '').trim() || email.split('@')[0],
      role: 'CUSTOMER',
      status: 'ACTIVE',
      created_at: now(),
    }).select('*').single();
    if (error) {
      if (isUniqueViolation(error)) {
        const { data: dup } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
        if (dup) user = dup;
        else throw error;
      } else {
        throw error;
      }
    } else {
      user = data;
    }
  }
  if (user.status === 'SUSPENDED') return res.status(403).json({ error: 'Account suspended' });

  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
}));

// ---------- Health ----------
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: now(), version: '1.0.0' });
});

// ---------- Products ----------
router.get('/products', asyncHandler(async (req, res) => {
  const { category, featured, search, new_arrival, best_seller, sort, min_price, max_price, strain, in_stock, category_id, limit } = req.query;
  let query = supabase.from('products').select(PRODUCT_SELECT);
  query = query.eq('status', 'PUBLISHED').eq('is_hidden', 0);
  if (category) {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', category).maybeSingle();
    if (!cat) return res.json([]);
    query = query.eq('category_id', cat.id);
  }
  if (category_id) query = query.eq('category_id', category_id);
  if (featured === 'true') query = query.eq('featured', 1);
  if (new_arrival === 'true') query = query.eq('new_arrival', 1);
  if (best_seller === 'true') query = query.eq('best_seller', 1);
  if (strain) query = query.eq('strain_type', strain);
  if (in_stock === 'true') query = query.gt('inventory', 0);
  if (min_price) query = query.gte('price', Number(min_price));
  if (max_price) query = query.lte('price', Number(max_price));
  if (search) {
    const like = `%${search}%`;
    query = query.or(`name.ilike.${like},description.ilike.${like},sku.ilike.${like},tags.ilike.${like}`);
  }
  const orderMap = {
    'Price: Low to High': ['price', true],
    'Price: High to Low': ['price', false],
    'Newest Arrivals': ['created_at', false],
    'Highest Rated': ['rating', false],
  };
  const order = orderMap[sort];
  if (order) {
    query = query.order(order[0], { ascending: order[1] });
  } else {
    query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });
  }
  if (limit) {
    const lim = Math.max(1, Math.min(parseInt(limit, 10) || 50, 100));
    query = query.limit(lim);
  }
  const { data, error } = await query;
  if (error) throw error;
  res.json((data || []).map(shapeProduct));
}));

router.get('/products/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;
  let product = await getProduct(id);
  if (!product && id.length !== 36) {
    const bySlug = await getProductBySlug(id);
    if (!bySlug) return res.status(404).json({ error: 'Product not found' });
    return res.json(bySlug);
  }
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
}));

router.post('/products', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const id = uid();
  const { data, error } = await supabase.from('products').insert({
    id,
    name: b.name,
    slug: b.slug || null,
    description: b.description || '',
    short_description: b.short_description || '',
    category_id: b.category_id || null,
    sku: b.sku || '',
    batch_number: b.batch_number || '',
    thc_percent: b.thc_percent ?? null,
    cbd_percent: b.cbd_percent ?? null,
    terpene_percent: b.terpene_percent ?? null,
    strain_type: b.strain_type || null,
    pricing_model: b.pricing_model || 'STANDARD',
    price: b.price ?? null,
    compare_at_price: b.compare_at_price ?? null,
    price_on_request: b.price_on_request ? 1 : 0,
    inventory: b.inventory ?? 0,
    low_stock_threshold: b.low_stock_threshold ?? 5,
    status: b.status || 'PUBLISHED',
    is_hidden: b.is_hidden ? 1 : 0,
    featured: b.featured ? 1 : 0,
    new_arrival: b.new_arrival ? 1 : 0,
    best_seller: b.best_seller ? 1 : 0,
    rating: b.rating ?? randomRating(b.slug || b.name, b.tags),
    review_count: b.review_count ?? randomReviewCount(),
    tags: JSON.stringify(b.tags || []),
    created_at: now(),
    updated_at: now(),
  }).select('id').single();
  if (error) throw error;
  await replaceProductMedia(id, b.media);
  await replaceProductTiers(id, b.pricing_tiers);
  res.status(201).json(await getProduct(id));
}));

router.put('/products/:id', (req, res) => routerUpdateProduct(req, res).catch((e) => res.status(500).json({ error: errMsg(e, 'Failed to update product') })));
router.post('/products/:id', (req, res) => routerUpdateProduct(req, res).catch((e) => res.status(500).json({ error: errMsg(e, 'Failed to update product') })));
router.patch('/products/:id', (req, res) => routerUpdateProduct(req, res).catch((e) => res.status(500).json({ error: errMsg(e, 'Failed to update product') })));

async function replaceProductMedia(productId, mediaArr) {
  const { data: existing } = await supabase.from('product_media').select('cloudinary_public_id').eq('product_id', productId);
  const keepIds = new Set();
  (mediaArr || []).forEach((m) => {
    if (m.cloudinary_public_id && !m.cloudinary_public_id.startsWith('local_')) keepIds.add(m.cloudinary_public_id);
    if (m.public_id && !m.public_id.startsWith('local_')) keepIds.add(m.public_id);
  });
  for (const row of existing || []) {
    if (row.cloudinary_public_id && !keepIds.has(row.cloudinary_public_id)) {
      try { await cloudinary.uploader.destroy(row.cloudinary_public_id); } catch {}
    }
  }
  const { error: delErr } = await supabase.from('product_media').delete().eq('product_id', productId);
  if (delErr) throw delErr;
  const rows = (mediaArr || []).map((m, i) => ({
    id: m.id || uid(),
    product_id: productId,
    media_type: m.media_type || 'image',
    cloudinary_public_id: m.cloudinary_public_id || null,
    secure_url: m.secure_url || '',
    resource_type: m.resource_type || 'image',
    alt_text: m.alt_text || '',
    display_order: m.display_order ?? (i + 1),
    is_primary: m.is_primary ? 1 : 0,
  }));
  if (rows.length) {
    const { error } = await supabase.from('product_media').insert(rows);
    if (error) throw error;
  }
}

async function replaceProductTiers(productId, tiersArr) {
  const { error: delErr } = await supabase.from('product_pricing_tiers').delete().eq('product_id', productId);
  if (delErr) throw delErr;
  const rows = (tiersArr || []).map((t, i) => ({
    id: t.id || uid(),
    product_id: productId,
    quantity: t.quantity,
    unit: t.unit,
    price: t.price,
    display_order: t.display_order ?? (i + 1),
  }));
  if (rows.length) {
    const { error } = await supabase.from('product_pricing_tiers').insert(rows);
    if (error) throw error;
  }
}

async function routerUpdateProduct(req, res) {
  const id = req.params.id;
  const existing = await getProduct(id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  const b = req.body || {};
  const { error } = await supabase.from('products').update({
    name: b.name ?? '',
    slug: b.slug ?? null,
    description: b.description ?? '',
    short_description: b.short_description ?? '',
    category_id: b.category_id ?? null,
    sku: b.sku ?? '',
    batch_number: b.batch_number ?? '',
    thc_percent: b.thc_percent ?? null,
    cbd_percent: b.cbd_percent ?? null,
    terpene_percent: b.terpene_percent ?? null,
    strain_type: b.strain_type ?? null,
    pricing_model: b.pricing_model || 'STANDARD',
    price: b.price ?? null,
    compare_at_price: b.compare_at_price ?? null,
    price_on_request: b.price_on_request ? 1 : 0,
    inventory: b.inventory ?? 0,
    low_stock_threshold: b.low_stock_threshold ?? 5,
    status: b.status || 'PUBLISHED',
    is_hidden: b.is_hidden ? 1 : 0,
    featured: b.featured ? 1 : 0,
    new_arrival: b.new_arrival ? 1 : 0,
    best_seller: b.best_seller ? 1 : 0,
    rating: b.rating ?? existing.rating ?? randomRating(existing.slug || existing.name, existing.tags),
    review_count: b.review_count ?? existing.review_count ?? randomReviewCount(),
    tags: JSON.stringify(b.tags || []),
    updated_at: now(),
  }).eq('id', id);
  if (error) {
    if (isUniqueViolation(error)) return res.status(409).json({ error: 'Product slug already exists' });
    throw error;
  }
  if (Array.isArray(b.media)) await replaceProductMedia(id, b.media);
  if (Array.isArray(b.pricing_tiers)) await replaceProductTiers(id, b.pricing_tiers);
  res.json(await getProduct(id));
}

router.delete('/products/:id', asyncHandler(async (req, res) => {
  const { data: product } = await supabase.from('products').select('*, product_media(cloudinary_public_id)').eq('id', req.params.id).maybeSingle();
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const { data, error } = await supabase.from('products').delete().eq('id', req.params.id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) return res.status(404).json({ error: 'Product not found' });
  for (const m of product.product_media || []) {
    if (m.cloudinary_public_id && !m.cloudinary_public_id.startsWith('local_')) {
      try { await cloudinary.uploader.destroy(m.cloudinary_public_id); } catch {}
    }
  }
  res.json({ ok: true });
}));

// ---------- Categories ----------
router.get('/categories', asyncHandler(async (req, res) => {
  const { data: cats, error } = await supabase.from('categories').select('*').eq('status', 'ACTIVE').order('display_order');
  if (error) throw error;
  const { data: prods } = await supabase.from('products').select('category_id').eq('status', 'PUBLISHED').eq('is_hidden', 0);
  const counts = {};
  (prods || []).forEach((p) => { counts[p.category_id] = (counts[p.category_id] || 0) + 1; });
  res.json((cats || []).map((c) => ({ ...c, product_count: counts[c.id] || 0 })));
}));

router.post('/categories', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const id = uid();
  const { data, error } = await supabase.from('categories').insert({
    id,
    name: b.name,
    slug: b.slug || null,
    description: b.description || '',
    image_url: b.image_url || '',
    cloudinary_id: b.cloudinary_id || null,
    display_order: b.display_order ?? 1,
    status: b.status || 'ACTIVE',
    is_hidden: b.is_hidden ? 1 : 0,
    created_at: now(),
  }).select('*').single();
  if (error) {
    if (isUniqueViolation(error)) return res.status(409).json({ error: 'Category slug already exists' });
    throw error;
  }
  res.status(201).json(data);
}));

router.put('/categories/:id', (req, res) => updateCat(req, res).catch((e) => res.status(500).json({ error: errMsg(e, 'Failed to update category') })));
router.post('/categories/:id', (req, res) => updateCat(req, res).catch((e) => res.status(500).json({ error: errMsg(e, 'Failed to update category') })));
router.patch('/categories/:id', (req, res) => updateCat(req, res).catch((e) => res.status(500).json({ error: errMsg(e, 'Failed to update category') })));

async function updateCat(req, res) {
  const b = req.body || {};
  const { data, error } = await supabase.from('categories').update({
    name: b.name ?? '',
    slug: b.slug ?? null,
    description: b.description ?? '',
    image_url: b.image_url ?? '',
    cloudinary_id: b.cloudinary_id ?? null,
    display_order: b.display_order ?? 1,
    status: b.status || 'ACTIVE',
    is_hidden: b.is_hidden ? 1 : 0,
  }).eq('id', req.params.id).select('*').maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Category not found' });
  res.json(data);
}

router.delete('/categories/:id', asyncHandler(async (req, res) => {
  const { data: cat } = await supabase.from('categories').select('cloudinary_id').eq('id', req.params.id).maybeSingle();
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  const { data, error } = await supabase.from('categories').delete().eq('id', req.params.id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) return res.status(404).json({ error: 'Category not found' });
  if (cat.cloudinary_id && !cat.cloudinary_id.startsWith('local_')) {
    try { await cloudinary.uploader.destroy(cat.cloudinary_id); } catch {}
  }
  res.json({ ok: true });
}));

// ---------- Orders ----------
router.get('/orders', asyncHandler(async (req, res) => {
  const { email } = req.query;
  let query = supabase.from('orders').select('*');
  if (email) query = query.eq('customer_email', email.toLowerCase());
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  res.json((data || []).map(parseOrder));
}));

router.get('/orders/:id', asyncHandler(async (req, res) => {
  const param = req.params.id;
  let row = null;
  const byId = await supabase.from('orders').select('*').eq('id', param).maybeSingle();
  if (byId.data) row = byId.data;
  else {
    const byNum = await supabase.from('orders').select('*').eq('order_number', param).maybeSingle();
    row = byNum.data;
  }
  if (!row) return res.status(404).json({ error: 'Order not found' });
  res.json(parseOrder(row));
}));

router.post('/orders', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const id = uid();
  const orderNumber = 'NB-' + String(100000 + Math.floor(Math.random() * 900000));
  const history = [{ status: 'PENDING', note: 'Order received', at: now() }];
  if (b.payment_note) history.push({ status: 'PENDING', note: 'Payment details: ' + b.payment_note, at: now() });
  const order = {
    id,
    order_number: orderNumber,
    user_id: b.user_id || null,
    customer_name: b.customer_name || '',
    customer_email: (b.customer_email || '').toLowerCase(),
    customer_phone: b.customer_phone || '',
    shipping_address: JSON.stringify(b.shipping_address || {}),
    items: JSON.stringify(b.items || []),
    subtotal: b.subtotal ?? 0,
    discount_amount: b.discount_amount ?? 0,
    discount_code: b.discount_code || null,
    shipping_fee: b.shipping_fee ?? 0,
    tax_amount: b.tax_amount ?? 0,
    total_amount: b.total_amount ?? 0,
    payment_method: b.payment_method || 'CRYPTO',
    payment_status: b.payment_status || 'UNPAID',
    status: 'PENDING',
    tracking_number: b.tracking_number || null,
    history: JSON.stringify(history),
    created_at: now(),
    updated_at: now(),
  };
  const { error } = await supabase.from('orders').insert(order).select('id').single();
  if (error) throw error;
  for (const it of (b.items || [])) {
    const { data: prod } = await supabase.from('products').select('inventory').eq('id', it.product_id).maybeSingle();
    if (prod) {
      const inv = Math.max(0, (prod.inventory || 0) - (it.quantity || 0));
      await supabase.from('products').update({ inventory: inv, updated_at: now() }).eq('id', it.product_id);
    }
  }
  res.status(201).json({ ...order, history, items: b.items || [], shipping_address: b.shipping_address || {} });
}));

router.put('/orders/:id/status', asyncHandler(async (req, res) => {
  const { status, note, tracking_number, payment_status } = req.body || {};
  let row = (await supabase.from('orders').select('*').eq('id', req.params.id).maybeSingle()).data;
  if (!row) row = (await supabase.from('orders').select('*').eq('order_number', req.params.id).maybeSingle()).data;
  if (!row) return res.status(404).json({ error: 'Order not found' });
  const history = parseJson(row.history, []);
  const newStatus = status || row.status;
  const newPayment = payment_status || row.payment_status;
  if (status && status !== row.status) history.push({ status, note: note || `Status changed to ${status}`, at: now() });
  else if (note) history.push({ status: row.status, note, at: now() });
  const { data, error } = await supabase.from('orders').update({
    status: newStatus,
    payment_status: newPayment,
    tracking_number: tracking_number ?? row.tracking_number,
    history: JSON.stringify(history),
    updated_at: now(),
  }).eq('id', row.id).select('*').single();
  if (error) throw error;
  const updated = parseOrder(data);

  // Notify the customer: in-app notification + Telegram (if linked).
  if (row.user_id) {
    const title = `Order ${row.order_number} · ${newStatus}`;
    const body = note || `Your order ${row.order_number} is now ${newStatus}.`;
    try {
      await createNotification({ user_id: row.user_id, type: 'order', title, body, order_id: row.order_number, link: '/account?tab=orders' });
    } catch {}
    try {
      const tg = await getTelegramUserBySiteUser(row.user_id);
      if (tg) await notifyOrderStatus(tg.telegram_id, updated);
    } catch {}
  }

  res.json(updated);
}));

// ---------- Order comments ----------
router.get('/orders/:id/comments', requireAuth, asyncHandler(async (req, res) => {
  let row = (await supabase.from('orders').select('id, user_id, customer_email').eq('id', req.params.id).maybeSingle()).data;
  if (!row) row = (await supabase.from('orders').select('id, user_id, customer_email').eq('order_number', req.params.id).maybeSingle()).data;
  if (!row) return res.status(404).json({ error: 'Order not found' });
  const isAdmin = await isAdmin(req);
  if (!isAdmin && row.user_id !== req.user.id && row.customer_email !== req.user.email) return res.status(403).json({ error: 'Not your order' });
  res.json(await listOrderComments(row.id));
}));

router.post('/orders/:id/comments', requireAdmin, asyncHandler(async (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: 'message is required' });
  let row = (await supabase.from('orders').select('id').eq('id', req.params.id).maybeSingle()).data;
  if (!row) row = (await supabase.from('orders').select('id').eq('order_number', req.params.id).maybeSingle()).data;
  if (!row) return res.status(404).json({ error: 'Order not found' });
  const admin = await req.getAuth();
  const comment = await addOrderComment({ order_id: row.id, author_role: 'admin', author_name: admin?.full_name || 'Admin', message: message.trim() });
  res.status(201).json(comment);
}));

// ---------- Notifications ----------
router.get('/notifications', requireAuth, asyncHandler(async (req, res) => {
  const items = await listNotifications(req.user.id);
  res.json({ items, unread: items.filter((n) => !n.read).length });
}));

router.post('/notifications/read', requireAuth, asyncHandler(async (req, res) => {
  const { ids } = req.body || {};
  await markNotificationsRead(req.user.id, Array.isArray(ids) ? ids : []);
  res.json({ ok: true });
}));

// ---------- Telegram account linking ----------
router.post('/account/telegram-link', requireAuth, asyncHandler(async (req, res) => {
  const tg = await getTelegramUserBySiteUser(req.user.id);
  const username = await getBotUsername();
  if (tg) {
    res.json({ linked: true, telegram_id: tg.telegram_id, username });
    return;
  }
  const token = await createTelegramLink(req.user.id);
  res.json({ linked: false, token, url: username ? `https://t.me/${username}?start=${token}` : null });
}));

// ---------- Promotions ----------
router.get('/promotions', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data || []);
}));

router.post('/promotions/validate', asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body || {};
  const { data: promo } = await supabase.from('promotions').select('*').eq('code', (code || '').toUpperCase()).maybeSingle();
  if (!promo) return res.json({ valid: false, reason: 'Invalid promotion code' });
  if (promo.status !== 'ACTIVE') return res.json({ valid: false, reason: 'Promotion is no longer active' });
  if (promo.usage_limit !== null && promo.times_used >= promo.usage_limit) return res.json({ valid: false, reason: 'Promotion usage limit reached' });
  const sub = subtotal || 0;
  if (sub < (promo.min_order_amount || 0)) return res.json({ valid: false, reason: `Minimum order of ${promo.min_order_amount} required` });
  let discount = promo.discount_type === 'PERCENTAGE' ? (sub * promo.discount_value) / 100 : promo.discount_value;
  if (promo.max_discount_amount) discount = Math.min(discount, promo.max_discount_amount);
  discount = Math.min(discount, sub);
  res.json({ valid: true, promo, discount });
}));

router.post('/promotions', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const id = uid();
  const { data, error } = await supabase.from('promotions').insert({
    id,
    code: (b.code || '').toUpperCase(),
    description: b.description || '',
    discount_type: b.discount_type || 'PERCENTAGE',
    discount_value: b.discount_value ?? 0,
    min_order_amount: b.min_order_amount ?? 0,
    max_discount_amount: b.max_discount_amount ?? null,
    start_date: b.start_date || null,
    end_date: b.end_date || null,
    usage_limit: b.usage_limit ?? null,
    status: b.status || 'ACTIVE',
    created_at: now(),
  }).select('*').single();
  if (error) {
    if (isUniqueViolation(error)) return res.status(409).json({ error: 'Promotion code already exists' });
    throw error;
  }
  res.status(201).json(data);
}));

// ---------- Messages ----------
router.get('/messages', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  res.json((data || []).map((r) => ({ ...r, replies: parseJson(r.replies, []) })));
}));

router.post('/messages', asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email || !b.subject || !b.message) return res.status(400).json({ error: 'Missing required fields' });
  const id = uid();
  const { data, error } = await supabase.from('contact_messages').insert({
    id,
    name: b.name,
    email: b.email,
    order_number: b.order_number || null,
    category: b.category || 'Product Inquiry',
    subject: b.subject,
    message: b.message,
    status: 'UNREAD',
    replies: '[]',
    created_at: now(),
  }).select('*').single();
  if (error) throw error;
  res.status(201).json(data);
}));

router.post('/messages/:id/reply', asyncHandler(async (req, res) => {
  const { data: row } = await supabase.from('contact_messages').select('*').eq('id', req.params.id).maybeSingle();
  if (!row) return res.status(404).json({ error: 'Message not found' });
  const replies = parseJson(row.replies, []);
  replies.push({ body: (req.body || {}).message || '', by: 'ADMIN', at: now() });
  const { data, error } = await supabase.from('contact_messages').update({ replies: JSON.stringify(replies), status: 'REPLIED' }).eq('id', row.id).select('*').single();
  if (error) throw error;
  res.json(data);
}));

// ---------- Settings & CMS ----------
async function getSettingRow(table, key) {
  const { data: row } = await supabase.from(table).select('*').eq('id', key).maybeSingle();
  if (!row) return null;
  return { ...row, data: parseJson(row.data, {}) };
}

router.get('/settings', asyncHandler(async (req, res) => {
  const row = await getSettingRow('site_settings', 'global_settings');
  if (!row) return res.status(404).json({ error: 'Settings not found' });
  res.json(row.data);
}));

router.put('/settings', requireAdmin, asyncHandler(async (req, res) => {
  const { error } = await supabase.from('site_settings').update({ data: JSON.stringify(req.body || {}), updated_at: now() }).eq('id', 'global_settings');
  if (error) throw error;
  res.json(req.body);
}));

router.get('/cms', asyncHandler(async (req, res) => {
  const row = await getSettingRow('homepage_cms', 'global_cms');
  if (!row) return res.status(404).json({ error: 'CMS not found' });
  res.json(row.data);
}));

router.put('/cms', requireAdmin, asyncHandler(async (req, res) => {
  const { error } = await supabase.from('homepage_cms').update({ data: JSON.stringify(req.body || {}), updated_at: now() }).eq('id', 'global_cms');
  if (error) throw error;
  res.json(req.body);
}));

// ---------- Admin guard ----------
async function isAdmin(req) {
  const u = await req.getAuth();
  return u && (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
}
async function requireAdmin(req, res, next) {
  try {
    if (!(await isAdmin(req))) return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch {
    res.status(500).json({ error: 'Auth check failed' });
  }
}

async function requireAuth(req, res, next) {
  try {
    const u = await req.getAuth();
    if (!u) return res.status(401).json({ error: 'Authentication required' });
    req.user = u;
    next();
  } catch {
    res.status(500).json({ error: 'Auth check failed' });
  }
}

// ---------- Stories ----------
router.get('/stories/active', asyncHandler(async (req, res) => {
  res.json(await listActiveStories(typeof req.query.viewer === 'string' ? req.query.viewer : null));
}));

router.get('/stories', requireAdmin, asyncHandler(async (req, res) => {
  res.json(await listStories());
}));

router.post('/stories', requireAdmin, asyncHandler(async (req, res) => {
  const story = await insertStory(req.body || {});
  if (story && story.active) notifyStoryToAll(story);
  res.status(201).json(story);
}));

router.put('/stories/:id', requireAdmin, asyncHandler(async (req, res) => {
  const prev = await getStory(req.params.id);
  if (!prev) return res.status(404).json({ error: 'Story not found' });
  const updated = await updateStory(req.params.id, req.body || {});
  if (updated.active && !prev.active) notifyStoryToAll(updated);
  res.json(updated);
}));

router.delete('/stories/:id', requireAdmin, asyncHandler(async (req, res) => {
  if (!(await getStory(req.params.id))) return res.status(404).json({ error: 'Story not found' });
  await deleteStory(req.params.id);
  res.json({ ok: true });
}));

router.post('/stories/:id/like', requireAdmin, asyncHandler(async (req, res) => {
  const story = await getStory(req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  const likerKey = (req.body || {}).liker_key;
  if (!likerKey || likerKey.length > 120) return res.status(400).json({ error: 'Invalid liker key' });
  res.json(await toggleStoryLike(req.params.id, likerKey));
}));

// ---------- Payment method details (admin-managed, per entry) ----------
function groupPaymentEntries(entries) {
  const grouped = {};
  for (const e of entries) {
    if (!grouped[e.method]) grouped[e.method] = [];
    grouped[e.method].push(e);
  }
  return grouped;
}

router.get('/payment-methods', asyncHandler(async (req, res) => {
  res.json(groupPaymentEntries(await listActivePaymentEntries()));
}));

router.get('/payment-methods/admin', requireAdmin, asyncHandler(async (req, res) => {
  res.json(groupPaymentEntries(await listPaymentEntries()));
}));

router.post('/payment-methods', requireAdmin, asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!['CRYPTO', 'WIRE', 'PAYPAL', 'GIFT'].includes(b.method)) return res.status(400).json({ error: 'Invalid method' });
  if (!b.label || !b.value) return res.status(400).json({ error: 'label and value are required' });
  res.status(201).json(await insertPaymentEntry(b));
}));

router.put('/payment-methods/:id', requireAdmin, asyncHandler(async (req, res) => {
  const updated = await updatePaymentEntry(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Payment entry not found' });
  res.json(updated);
}));

router.delete('/payment-methods/:id', requireAdmin, asyncHandler(async (req, res) => {
  await deletePaymentEntry(req.params.id);
  res.json({ ok: true });
}));

// ---------- Telegram bot (admin dashboard from web) ----------
router.post('/telegram/webhook', asyncHandler(async (req, res) => {
  const result = await processUpdate(req.body || {});
  res.json(result);
}));

router.post('/telegram/set-webhook', requireAdmin, asyncHandler(async (req, res) => {
  const { url } = req.body || {};
  const base = (url || '').trim() || `https://${req.get('host')}`;
  const result = await setupWebhook(base);
  res.json(result);
}));

router.get('/telegram/status', requireAdmin, async (req, res) => {
  try {
    const [users, webhook] = await Promise.all([listTelegramUsers(), getWebhookInfo()]);
    res.json({
      status: telegramController.status,
      username: telegramController.username,
      error: telegramController.error,
      last_start: telegramController.lastStart,
      user_count: users.length,
      webhook,
    });
  } catch (e) {
    res.status(500).json({ error: e?.message });
  }
});

router.get('/telegram/users', requireAdmin, async (req, res) => {
  res.json(await listTelegramUsers());
});

router.post('/telegram/broadcast', requireAdmin, asyncHandler(async (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: 'message is required' });
  const result = await telegramController.broadcast(message.trim());
  res.json(result);
}));

// ---------- Analytics ----------
router.post('/analytics/event', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const geo = detectCountry(req);
  const id = uid();
  const sessionId = b.session_id || 'anon';
  const { error: evErr } = await supabase.from('analytics_events').insert({
    id,
    session_id: sessionId,
    visitor_id: b.visitor_id || 'anon',
    user_id: b.user_id || null,
    event_type: b.event_type || 'pageview',
    path: b.path || '/',
    entity_id: b.entity_id || null,
    entity_name: b.entity_name || null,
    metadata: JSON.stringify(b.metadata || {}),
    country: b.country || geo.country,
    country_code: b.country_code || geo.countryCode,
    device_type: b.device_type || 'Desktop',
    created_at: now(),
  });
  if (evErr) throw evErr;

  const { data: session } = await supabase.from('visitor_sessions').select('*').eq('session_id', sessionId).maybeSingle();
  if (session) {
    const views = session.page_views + (b.event_type === 'pageview' ? 1 : 0);
    const started = new Date(session.started_at).getTime();
    const duration = Math.round((Date.now() - started) / 1000);
    await supabase.from('visitor_sessions').update({
      last_activity_at: now(),
      page_views: views,
      duration_seconds: duration,
      user_id: b.user_id || session.user_id,
      user_name: b.user_name || session.user_name,
      user_email: b.user_email || session.user_email,
    }).eq('id', session.id);
  } else {
    await supabase.from('visitor_sessions').insert({
      id: uid(),
      session_id: sessionId,
      visitor_id: b.visitor_id || 'anon',
      user_id: b.user_id || null,
      user_name: b.user_name || null,
      user_email: b.user_email || null,
      ip_address: geo.ip,
      country: b.country || geo.country,
      country_code: b.country_code || geo.countryCode,
      region: b.region || null,
      city: b.city || null,
      device_type: b.device_type || 'Desktop',
      browser: b.browser || 'Unknown',
      os: b.os || 'Unknown',
      referrer: b.referrer || null,
      language: b.language || 'EN',
      started_at: now(),
      last_activity_at: now(),
      duration_seconds: 0,
      page_views: 1,
    });
  }
  res.status(201).json({ ok: true });
}));

router.get('/analytics/overview', asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days || '30', 10);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [ordersRes, allStatusRes, productsRes, customersRes, lowStockRes, unreadRes, eventsRes] = await Promise.all([
    supabase.from('orders').select('total_amount, created_at').gte('created_at', since),
    supabase.from('orders').select('status'),
    supabase.from('products').select('id').eq('status', 'PUBLISHED'),
    supabase.from('users').select('id'),
    supabase.from('products').select('id, inventory, low_stock_threshold').eq('status', 'PUBLISHED'),
    supabase.from('contact_messages').select('id').eq('status', 'UNREAD'),
    supabase.from('analytics_events').select('event_type, visitor_id, device_type, country, country_code, created_at').gte('created_at', since),
  ]);
  const orders = ordersRes.data || [];
  const events = eventsRes.data || [];
  const allStatuses = allStatusRes.data || [];

  const revenue = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const pending = allStatuses.filter((o) => ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(o.status)).length;
  const products = (productsRes.data || []).length;
  const customers = (customersRes.data || []).length;
  const lowStock = (lowStockRes.data || []).filter((p) => (p.inventory || 0) <= (p.low_stock_threshold || 0)).length;
  const unread = (unreadRes.data || []).length;
  const pageviews = events.filter((e) => e.event_type === 'pageview').length;
  const visitors = new Set(events.map((e) => e.visitor_id)).size;

  const timeline = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const dayEvents = events.filter((e) => e.created_at.slice(0, 10) === d);
    const dayOrders = orders.filter((o) => o.created_at.slice(0, 10) === d);
    timeline.push({
      day: d,
      events: dayEvents.length,
      pageviews: dayEvents.filter((e) => e.event_type === 'pageview').length,
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
    });
  }

  const devicesMap = {};
  events.forEach((e) => { devicesMap[e.device_type] = (devicesMap[e.device_type] || 0) + 1; });
  const devices = Object.entries(devicesMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const countriesMap = {};
  events.forEach((e) => {
    const key = e.country + '|' + (e.country_code || '');
    if (!countriesMap[key]) countriesMap[key] = { country: e.country, country_code: e.country_code, visitors: 0 };
    countriesMap[key].visitors += 1;
  });
  const countries = Object.values(countriesMap).sort((a, b) => b.visitors - a.visitors).slice(0, 10);

  res.json({ totals: { revenue, orders: orders.length, products, customers, lowStock, unread, pageviews, visitors }, pending, timeline, devices, countries });
}));

router.get('/analytics/live', asyncHandler(async (req, res) => {
  const { data: events, error } = await supabase
    .from('analytics_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw error;
  const sessionIds = [...new Set((events || []).map((e) => e.session_id).filter(Boolean))];
  let sessions = {};
  if (sessionIds.length) {
    const { data } = await supabase.from('visitor_sessions').select('session_id, country, country_code, device_type').in('session_id', sessionIds);
    sessions = Object.fromEntries((data || []).map((s) => [s.session_id, s]));
  }
  res.json((events || []).map((e) => {
    const s = sessions[e.session_id];
    return {
      ...e,
      country: s?.country || e.country,
      country_code: s?.country_code || e.country_code,
      device_type: s?.device_type || e.device_type,
    };
  }));
}));

router.get('/analytics/visitors', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('visitor_sessions').select('*').order('last_activity_at', { ascending: false }).limit(100);
  if (error) throw error;
  res.json(data || []);
}));

router.get('/analytics/visitor-profile/:id', asyncHandler(async (req, res) => {
  const param = req.params.id;
  const byId = await supabase.from('visitor_sessions').select('*').eq('id', param).maybeSingle();
  const session = byId.data || (await supabase.from('visitor_sessions').select('*').eq('session_id', param).maybeSingle()).data;
  if (!session) return res.status(404).json({ error: 'Visitor session not found' });
  const { data: events } = await supabase.from('analytics_events').select('*').eq('session_id', session.session_id).order('created_at', { ascending: true });
  res.json({ session, events: events || [] });
}));

// ---------- Availability / Geo-blocking ----------
async function getRules() {
  const { data: row } = await supabase.from('site_access_rules').select('*').eq('id', 'global_access_rules').maybeSingle();
  if (!row) return null;
  ['blocked_countries', 'allowed_countries', 'blocked_regions', 'allowed_regions'].forEach((k) => {
    row[k] = parseJson(row[k], []);
  });
  return row;
}

function evaluate(rules, countryCode, country, region) {
  if (!rules.is_enabled) return { allowed: true, reason: 'Geo-blocking disabled' };
  const cc = (countryCode || '').toUpperCase();
  const blocked = rules.blocked_countries.includes(cc);
  const allowed = rules.allowed_countries.includes(cc);
  const blockedRegion = (rules.blocked_regions || []).some((r) => (country + ' ' + region).toLowerCase().includes(String(r).toLowerCase()));
  if (rules.mode === 'ALLOW_ALL_EXCEPT_BLOCKED') {
    if (blocked) return { allowed: false, reason: `Country ${cc} is blocked` };
    if (blockedRegion) return { allowed: false, reason: `Region matches blocked rule` };
    return { allowed: true, reason: 'Allowed' };
  }
  if (allowed) return { allowed: true, reason: 'Country explicitly allowed' };
  return { allowed: false, reason: `Country ${cc} not in allow-list` };
}

router.get('/availability/check', asyncHandler(async (req, res) => {
  const geo = detectCountry(req);
  const rules = await getRules();
  const result = rules ? evaluate(rules, geo.countryCode, geo.country, '') : { allowed: true, reason: 'Geo-blocking disabled' };
  const id = uid();
  await supabase.from('site_access_logs').insert({
    id,
    ip_address: geo.ip,
    country: geo.country,
    country_code: geo.countryCode,
    region: '',
    city: '',
    path: req.query.path || '/',
    action: result.allowed ? 'ALLOWED' : 'BLOCKED',
    reason: result.reason,
    user_agent: req.headers['user-agent'] || '',
    created_at: now(),
  });
  res.json({ ...geo, ...result });
}));

router.get('/availability/rules', asyncHandler(async (req, res) => {
  res.json(await getRules());
}));

router.put('/availability/rules', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const fields = {
    is_enabled: b.is_enabled ? 1 : 0,
    mode: b.mode || 'ALLOW_ALL_EXCEPT_BLOCKED',
    blocked_countries: JSON.stringify(b.blocked_countries || []),
    allowed_countries: JSON.stringify(b.allowed_countries || []),
    blocked_regions: JSON.stringify(b.blocked_regions || []),
    allowed_regions: JSON.stringify(b.allowed_regions || []),
    restriction_title: b.restriction_title || '',
    restriction_message: b.restriction_message || '',
    support_button_enabled: b.support_button_enabled ? 1 : 0,
    support_button_url: b.support_button_url || '/contact',
    telegram_button_enabled: b.telegram_button_enabled ? 1 : 0,
    telegram_button_url: b.telegram_button_url || '',
    updated_at: now(),
  };
  const { data, error } = await supabase.from('site_access_rules').update(fields).eq('id', 'global_access_rules').select('*').single();
  if (error) throw error;
  ['blocked_countries', 'allowed_countries', 'blocked_regions', 'allowed_regions'].forEach((k) => {
    data[k] = parseJson(data[k], []);
  });
  res.json(data);
}));

router.get('/availability/logs', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('site_access_logs').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  res.json(data || []);
}));

// ---------- Media ----------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/media/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const isVideo = req.file.mimetype.startsWith('video');
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ resource_type: isVideo ? 'video' : 'auto' }, (err, r) => (err ? reject(err) : resolve(r)));
    stream.end(req.file.buffer);
  });
  res.status(201).json({
    secure_url: result.secure_url,
    public_id: result.public_id,
    media_type: isVideo ? 'video' : 'image',
    resource_type: result.resource_type,
  });
}));

router.post('/media/cloudinary/delete', asyncHandler(async (req, res) => {
  const { public_id } = req.body || {};
  if (!public_id || String(public_id).startsWith('local_')) return res.json({ ok: true });
  try { await cloudinary.uploader.destroy(public_id); } catch {}
  res.json({ ok: true });
}));

// Signed direct-to-Cloudinary upload (bypasses Vercel's ~4.5MB body limit
// for large product videos). The browser uploads straight to Cloudinary
// using these params; the existing /media/upload endpoint is untouched.
router.post('/media/sign', requireAdmin, asyncHandler(async (req, res) => {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) return res.status(500).json({ error: 'Cloudinary not configured' });
  const folder = 'narcosbay';
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(toSign + api_secret).digest('hex');
  res.json({ cloud_name, api_key, timestamp, signature, folder });
}));

export default router;
