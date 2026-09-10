import crypto from 'crypto';
import { supabase, uid, now } from './supabase.js';

export { uid, now };

const i = (n) => (n === null || n === undefined ? null : n ? 1 : 0);

// ---------- Stories ----------
async function fetchLikesMap() {
  const { data } = await supabase.from('story_likes').select('story_id, liker_key');
  const map = {};
  for (const l of data || []) map[l.story_id] = (map[l.story_id] || 0) + 1;
  return map;
}

async function hydrateStories(rows, viewerKey) {
  const likesMap = await fetchLikesMap();
  let likedSet = new Set();
  if (viewerKey) {
    const { data } = await supabase.from('story_likes').select('story_id').eq('liker_key', viewerKey);
    likedSet = new Set((data || []).map((l) => l.story_id));
  }
  return rows.map((s) => ({
    ...s,
    active: i(s.active),
    likes: likesMap[s.id] || 0,
    liked: viewerKey ? likedSet.has(s.id) : false,
  }));
}

export async function listStories() {
  const { data } = await supabase
    .from('stories')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  return hydrateStories(data || []);
}

export async function listActiveStories(viewerKey = null) {
  const nowIso = now();
  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('active', 1)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  return hydrateStories(data || [], viewerKey);
}

export async function getStory(id) {
  const { data } = await supabase.from('stories').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const [row] = await hydrateStories([data]);
  return row;
}

export async function toggleStoryLike(id, likerKey) {
  const { data: existing } = await supabase
    .from('story_likes')
    .select('liker_key')
    .eq('story_id', id)
    .eq('liker_key', likerKey)
    .maybeSingle();
  if (existing) {
    await supabase.from('story_likes').delete().eq('story_id', id).eq('liker_key', likerKey);
  } else {
    await supabase.from('story_likes').insert({ story_id: id, liker_key: likerKey });
  }
  const { count } = await supabase
    .from('story_likes')
    .select('liker_key', { count: 'exact', head: true })
    .eq('story_id', id);
  return { likes: count || 0, liked: !existing };
}

export async function insertStory(s) {
  const id = s.id || uid();
  const ts = now();
  await supabase.from('stories').insert({
    id,
    title: s.title || 'Untitled',
    media_url: s.media_url || '',
    media_type: s.media_type || 'image',
    caption: s.caption || null,
    link_url: s.link_url || null,
    expires_at: s.expires_at || null,
    active: i(s.active),
    display_order: s.display_order ?? 1,
    created_at: ts,
    updated_at: ts,
  });
  return getStory(id);
}

export async function updateStory(id, s) {
  const cur = await getStory(id);
  if (!cur) return null;
  await supabase
    .from('stories')
    .update({
      title: s.title ?? cur.title,
      media_url: s.media_url ?? cur.media_url,
      media_type: s.media_type ?? cur.media_type,
      caption: s.caption !== undefined ? s.caption : cur.caption,
      link_url: s.link_url !== undefined ? s.link_url : cur.link_url,
      expires_at: s.expires_at !== undefined ? s.expires_at : cur.expires_at,
      active: s.active !== undefined ? i(s.active) : i(cur.active),
      display_order: s.display_order ?? cur.display_order,
      updated_at: now(),
    })
    .eq('id', id);
  return getStory(id);
}

export async function deleteStory(id) {
  await supabase.from('stories').delete().eq('id', id);
  return true;
}

// ---------- Payment method details ----------
export async function listPaymentEntries() {
  const { data } = await supabase
    .from('payment_method_details')
    .select('*')
    .order('method', { ascending: true })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  return (data || []).map((e) => ({ ...e, active: i(e.active) }));
}

export async function listActivePaymentEntries() {
  const { data } = await supabase
    .from('payment_method_details')
    .select('*')
    .eq('active', 1)
    .order('method', { ascending: true })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  return (data || []).map((e) => ({ ...e, active: i(e.active) }));
}

export async function insertPaymentEntry(e) {
  const id = e.id || uid();
  await supabase.from('payment_method_details').insert({
    id,
    method: e.method,
    label: e.label || '',
    value: e.value || '',
    hint: e.hint || null,
    display_order: e.display_order ?? 1,
    active: e.active === 0 ? 0 : 1,
    created_at: now(),
  });
  const { data } = await supabase.from('payment_method_details').select('*').eq('id', id).maybeSingle();
  return data ? { ...data, active: i(data.active) } : null;
}

export async function updatePaymentEntry(id, e) {
  const { data: cur } = await supabase.from('payment_method_details').select('*').eq('id', id).maybeSingle();
  if (!cur) return null;
  await supabase
    .from('payment_method_details')
    .update({
      method: e.method ?? cur.method,
      label: e.label ?? cur.label,
      value: e.value ?? cur.value,
      hint: e.hint !== undefined ? e.hint : cur.hint,
      display_order: e.display_order ?? cur.display_order,
      active: e.active !== undefined ? (e.active ? 1 : 0) : i(cur.active),
    })
    .eq('id', id);
  const { data } = await supabase.from('payment_method_details').select('*').eq('id', id).maybeSingle();
  return data ? { ...data, active: i(data.active) } : null;
}

export async function deletePaymentEntry(id) {
  await supabase.from('payment_method_details').delete().eq('id', id);
  return true;
}

// ---------- Telegram users ----------
export async function upsertTelegramUser(u) {
  const telegramId = String(u.telegram_id);
  const { data: existing } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  const data = {
    first_name: u.first_name || null,
    last_name: u.last_name || null,
    username: u.username || null,
    language: u.language || existing?.language || 'EN',
    last_active_at: now(),
  };
  if (existing) {
    await supabase.from('telegram_users').update(data).eq('telegram_id', telegramId);
  } else {
    await supabase.from('telegram_users').insert({ id: uid(), telegram_id: telegramId, ...data, created_at: now() });
  }
  const { data: row } = await supabase.from('telegram_users').select('*').eq('telegram_id', telegramId).maybeSingle();
  return row;
}

export async function setTelegramUserLang(telegramId, lang) {
  await supabase.from('telegram_users').update({ language: lang }).eq('telegram_id', String(telegramId));
}

export async function listTelegramUsers() {
  const { data } = await supabase.from('telegram_users').select('*').order('last_active_at', { ascending: false });
  return data || [];
}

// ---------- Telegram broadcasts ----------
export async function logBroadcast(message, sentCount, status) {
  const id = uid();
  await supabase.from('telegram_broadcasts').insert({
    id,
    message,
    sent_count: sentCount,
    status,
    created_at: now(),
  });
  const { data } = await supabase.from('telegram_broadcasts').select('*').eq('id', id).maybeSingle();
  return data;
}

export async function listBroadcasts() {
  const { data } = await supabase.from('telegram_broadcasts').select('*').order('created_at', { ascending: false }).limit(100);
  return data || [];
}

// ---------- Telegram bot config (recoverable identity) ----------
// Single row (id='bot') holding the active bot token/identity so a deleted
// bot can be replaced at runtime. Falls back to env vars when absent.
export async function getTelegramConfig() {
  const { data, error } = await supabase.from('telegram_config').select('*').eq('id', 'bot').maybeSingle();
  if (error) return null;
  return data || null;
}

export async function saveTelegramConfig({ token, username, admin_id }) {
  const row = {
    id: 'bot',
    token: token || null,
    username: username || null,
    admin_id: admin_id === null || admin_id === undefined ? null : String(admin_id),
    updated_at: now(),
  };
  const { data, error } = await supabase.from('telegram_config').upsert(row, { onConflict: 'id' }).select('*').single();
  if (error) throw error;
  return data;
}

// ---------- Notifications (in-app) ----------
export async function listNotifications(userId, limit = 50) {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function countUnreadNotifications(userId) {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  return count || 0;
}

export async function createNotification(n) {
  const id = n.id || uid();
  await supabase.from('notifications').insert({
    id,
    user_id: n.user_id,
    type: n.type || 'order',
    title: n.title || 'Notification',
    body: n.body || null,
    order_id: n.order_id || null,
    link: n.link || null,
    read: false,
    created_at: now(),
  });
  const { data } = await supabase.from('notifications').select('*').eq('id', id).maybeSingle();
  return data;
}

export async function listAllUserIds() {
  const { data } = await supabase.from('users').select('id');
  return (data || []).map((u) => u.id);
}

export async function notifyStoryToAll(story) {
  if (!story) return;
  const ids = await listAllUserIds();
  if (!ids.length) return { sent: 0 };
  const title = story.title || 'New story';
  const body = [story.caption, story.link_url].filter(Boolean).join(' · ') || null;
  let sent = 0;
  for (const userId of ids) {
    try {
      await createNotification({ user_id: userId, type: 'story', title, body, link: null });
      sent += 1;
    } catch {}
  }
  return { sent };
}

export async function markNotificationsRead(userId, ids) {
  const q = supabase.from('notifications').update({ read: true }).eq('user_id', userId);
  if (ids && ids.length) await q.in('id', ids);
  else await q.eq('read', false);
  return true;
}

// ---------- Order comments ----------
export async function listOrderComments(orderId) {
  const { data } = await supabase
    .from('order_comments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function addOrderComment(c) {
  const id = uid();
  await supabase.from('order_comments').insert({
    id,
    order_id: c.order_id,
    author_role: c.author_role || 'admin',
    author_name: c.author_name || null,
    message: c.message || '',
    created_at: now(),
  });
  const { data } = await supabase.from('order_comments').select('*').eq('id', id).maybeSingle();
  return data;
}

// ---------- Telegram account linking ----------
export async function createTelegramLink(userId) {
  const token = 'nb-' + crypto.randomBytes(12).toString('hex');
  await supabase.from('telegram_links').insert({ token, user_id: userId, created_at: now() });
  return token;
}

export async function consumeTelegramLink(token) {
  const { data } = await supabase.from('telegram_links').select('*').eq('token', token).maybeSingle();
  if (data) await supabase.from('telegram_links').delete().eq('token', token);
  return data;
}

export async function getTelegramUserBySiteUser(userId) {
  const { data } = await supabase.from('telegram_users').select('*').eq('site_user_id', userId).maybeSingle();
  return data || null;
}

export async function setTelegramUserSiteUser(telegramId, userId) {
  await supabase.from('telegram_users').update({ site_user_id: userId }).eq('telegram_id', String(telegramId));
}
