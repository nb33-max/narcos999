import 'dotenv/config';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[supabase] Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in backend/.env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export { cloudinary };

export const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();

export function parseJson(s, fallback) {
  if (s === null || s === undefined) return fallback;
  try { const v = JSON.parse(s); return v ?? fallback; } catch { return fallback; }
}

export function errMsg(e, fallback) {
  if (!e) return fallback;
  return e.message || e.error_description || e.details || fallback;
}

export function isUniqueViolation(e) {
  return Boolean(e && e.code === '23505');
}

// Deliver every video as MP4 so it plays everywhere (site + Telegram bot).
// Cloudinary transcodes .mov/.webm/.m4v sources on the fly with f_mp4.
export function normalizeMediaUrl(url, mediaType) {
  if (!url) return url;
  const isVideo = mediaType === 'video' || /\/video\/upload\//.test(url) || /\.(mp4|mov|webm|m4v|avi|mkv)(\?|$)/i.test(url);
  if (!isVideo) return url;
  const m = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/)(.*)$/);
  if (m) {
    return `${m[1]}f_mp4/${m[2]}`.replace(/\.(mov|webm|m4v|avi|mkv)(\?|$)/i, '.mp4$2');
  }
  return url.replace(/\.(mov|webm|m4v)(\?|$)/i, '.mp4$2');
}

export function shapeProduct(r) {
  if (!r) return null;
  const { categories, product_media, product_pricing_tiers, ...rest } = r;
  return {
    ...rest,
    category: categories || null,
    category_name: categories ? categories.name : null,
    category_slug: categories ? categories.slug : null,
    media: (Array.isArray(product_media) ? product_media : []).slice().sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((m) => ({ ...m, secure_url: normalizeMediaUrl(m.secure_url, m.media_type) })),
    pricing_tiers: (Array.isArray(product_pricing_tiers) ? product_pricing_tiers : []).slice().sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
    tags: parseJson(r.tags, []),
  };
}

export function parseOrder(r) {
  if (!r) return r;
  return {
    ...r,
    items: parseJson(r.items, []),
    history: parseJson(r.history, []),
    shipping_address: parseJson(r.shipping_address, {}),
  };
}
