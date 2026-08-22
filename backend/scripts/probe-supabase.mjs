import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const tables = ['stories', 'story_likes', 'telegram_users', 'telegram_broadcasts', 'payment_method_details', 'products', 'users', 'orders'];
for (const t of tables) {
  const { data, error } = await supabase.from(t).select('*').limit(1);
  if (error) {
    console.log(`TABLE ${t}: MISSING (${error.message})`);
  } else {
    console.log(`TABLE ${t}: exists (rows sample: ${JSON.stringify(data)})`);
  }
}
