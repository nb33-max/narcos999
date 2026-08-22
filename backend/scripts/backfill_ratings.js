// One-off: replace placeholder 5.0 ratings on existing products with believable,
// tag-aware ratings. Run with: node scripts/backfill_ratings.js
import { supabase } from '../db/supabase.js';

const PREMIUM_TAG = /premium|top shelf|exotic|signature|elite|gold|award|best/i;
function randomRating(seed = '', tags = []) {
  let h = 2166136261;
  const s = seed || 'prod';
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let rating = 3.6 + (((h >>> 0) % 1000) / 1000) * 1.2;
  if ((tags || []).some((tag) => PREMIUM_TAG.test(tag))) rating += 0.15;
  return Math.round(Math.min(4.9, rating) * 10) / 10;
}

async function main() {
  const { data: products, error } = await supabase.from('products').select('id, slug, name, rating, tags');
  if (error) throw error;

  const updates = [];
  for (const p of products || []) {
    const current = Number(p.rating || 0);
    if (current > 0 && current < 5) continue; // already believable
    let tags = p.tags;
    if (typeof tags === 'string') {
      try { tags = JSON.parse(tags); } catch { tags = []; }
    }
    const rating = randomRating(p.slug || p.name, tags || []);
    updates.push({ id: p.id, rating });
  }

  for (const u of updates) {
    const { error: updErr } = await supabase.from('products').update({ rating: u.rating }).eq('id', u.id);
    if (updErr) throw updErr;
  }
  console.log(`Updated ${updates.length} products (left already-believable ratings untouched).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
