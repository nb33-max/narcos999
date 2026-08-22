import 'dotenv/config';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

function hashPassword(pw) {
  return '$scrypt$' + crypto.scryptSync(pw, 'narcosbay', 64).toString('hex');
}

const email = (process.argv[2] || '').toLowerCase();
const pw = process.argv[3] || '';

if (!email || !pw) {
  console.log('Usage: node scripts/set-admin-pw.mjs <email> <password>');
  process.exit(1);
}

const { data: user, error } = await supabase.from('users').select('id,email,role').eq('email', email).maybeSingle();
if (error || !user) {
  console.log('ADMIN_USER_NOT_FOUND', email, error?.message || '');
  process.exit(1);
}

const { error: updErr } = await supabase.from('users').update({ password_hash: hashPassword(pw) }).eq('id', user.id);
if (updErr) { console.log('UPDATE_FAILED', updErr.message); process.exit(1); }

console.log('ADMIN_PASSWORD_UPDATED', user.id, user.email, user.role);
