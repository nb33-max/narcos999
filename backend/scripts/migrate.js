import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { supabase } from '../db/supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlite = new Database(path.join(__dirname, '..', 'data', 'narcosbay.db'), { readonly: true });

const TABLES = [
  'users',
  'categories',
  'products',
  'product_media',
  'product_pricing_tiers',
  'orders',
  'promotions',
  'contact_messages',
  'site_access_rules',
  'site_access_logs',
  'visitor_sessions',
  'analytics_events',
  'site_settings',
  'homepage_cms',
];

const CHUNK = 500;

async function upsertTable(table) {
  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
  if (!rows.length) {
    console.log(`[migrate] ${table}: 0 rows (skip)`);
    return 0;
  }
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error(`[migrate] ${table} chunk ${i}-${i + chunk.length} FAILED:`, error.message);
      throw error;
    }
    inserted += chunk.length;
  }
  console.log(`[migrate] ${table}: ${inserted} rows upserted`);
  return inserted;
}

async function main() {
  let total = 0;
  for (const t of TABLES) {
    total += await upsertTable(t);
  }
  console.log(`[migrate] Done. ${total} total rows copied from SQLite to Supabase.`);
}

main().catch((e) => {
  console.error('[migrate] FAILED:', e.message || e);
  process.exit(1);
});
