import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const tables = ['analytics_events', 'categories', 'contact_messages', 'homepage_cms', 'orders', 'product_media', 'product_pricing_tiers', 'products', 'promotions', 'site_access_logs', 'site_access_rules', 'site_settings', 'users', 'visitor_sessions'];
for (const t of tables) {
  const { error } = await supabase.from(t).select('id').limit(1);
  console.log(error ? `MISSING: ${t}` : `ok: ${t}`);
}
