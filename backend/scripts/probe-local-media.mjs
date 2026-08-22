import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { data: media } = await supabase.from('product_media').select('id, product_id, secure_url, cloudinary_public_id, media_type');
const localMedia = (media || []).filter((m) => !/^https?:/.test(m.secure_url || '') || (m.cloudinary_public_id || '').startsWith('local_'));
console.log('total media rows:', media?.length);
console.log('local/non-http media rows:', localMedia.length);
localMedia.slice(0, 5).forEach((m) => console.log('  ', m.id, m.secure_url, m.cloudinary_public_id, m.media_type));

const { data: cats } = await supabase.from('categories').select('id, name, image_url, cloudinary_id');
const localCats = (cats || []).filter((c) => c.image_url && !/^https?:/.test(c.image_url));
console.log('categories total:', cats?.length, '| local image cats:', localCats.length);
localCats.slice(0, 5).forEach((c) => console.log('  cat:', c.name, c.image_url, c.cloudinary_id));
