import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { supabase, now, parseJson, shapeProduct } from '../db/supabase.js';
import {
  upsertTelegramUser, setTelegramUserLang, listTelegramUsers, logBroadcast,
  consumeTelegramLink, setTelegramUserSiteUser,
} from '../db/local.js';
import { tLang, interpolateLang, LANGS } from '../../frontend/src/lib/i18n.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID ? String(process.env.TELEGRAM_ADMIN_ID) : null;

export const telegramController = {
  bot: null,
  status: 'stopped',
  username: null,
  error: null,
  lastStart: null,
};

const PAGE_SIZE = 5;
const state = new Map();

let bot = null;
let webhookRegistered = false;

// Lazily create the bot. In webhook/serverless mode there is no long-polling
// loop; outgoing calls (sendMessage, editMessageText, ...) still work because
// they are plain HTTPS requests to the Telegram API.
function getBot() {
  if (!bot) {
    bot = new TelegramBot(TOKEN);
  }
  return bot;
}

const MENU_KEYS = {
  categories: 'btn_categories',
  featured: 'btn_featured',
  policies: 'btn_policies',
  language: 'btn_language',
  contact: 'btn_contact',
  home: 'btn_home',
};

// ---------- helpers ----------
function getState(chatId) {
  if (!state.has(chatId)) state.set(chatId, { lang: 'EN', stack: [], list: null });
  return state.get(chatId);
}

function norm(s) {
  return (s || '').trim().toLowerCase()
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2500}-\u{25FF}\u{FE0F}\u{200D}]/gu, '')
    .trim();
}

function isLabel(lang, text, key) {
  return norm(text) === norm(tLang(lang, key));
}

async function getSettings() {
  const { data } = await supabase.from('site_settings').select('*').eq('id', 'global_settings').maybeSingle();
  const d = parseJson(data?.data, {});
  return {
    store_name: d.store_name || 'NARCOS BAY',
    tagline: d.tagline || '',
    support_email: d.support_email || '',
    telegram_channel_url: d.telegram_channel_url || '',
    telegram_display_name: d.telegram_display_name || 'Narcos Bay',
    telegram_admin_handle: d.telegram_admin_handle || 'narcosbay',
    currency_code: d.currency_code || 'EUR',
    currency_symbol: d.currency_symbol || '€',
    symbol_position: d.symbol_position || 'before',
    decimal_places: Number(d.decimal_places ?? 2),
    thousand_separator: d.thousand_separator || ',',
    decimal_separator: d.decimal_separator || '.',
  };
}

let settingsCache = null;
async function settings() {
  if (!settingsCache) settingsCache = await getSettings();
  return settingsCache;
}

function fmt(n, s) {
  const neg = n < 0;
  const abs = Math.abs(Number(n) || 0).toFixed(s.decimal_places);
  const [intPart, decPart] = abs.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, s.thousand_separator);
  const num = decPart !== undefined ? `${grouped}${s.decimal_separator}${decPart}` : grouped;
  const body = (s.symbol_position === 'after' ? `${num}${s.currency_symbol}` : `${s.currency_symbol}${num}`);
  return (neg ? '-' : '') + body;
}

async function sendErr(chatId, lang, text) {
  try {
    await sendText(bot, chatId, text || tLang(lang, 'bot_error'), { reply_markup: navKeyboard(lang, true) });
  } catch {}
}

// Send or EDIT the previous bot message in-place so navigation doesn't stack
// new messages. When the previous message is a media/caption message we can't
// text-edit it, so we fall back to sending a fresh message.
async function sendText(bot, chatId, text, opts = {}, force = false) {
  const st = getState(chatId);
  const clean = { parse_mode: 'Markdown', ...opts };
  if (!force && st.msgId && st.msgKind === 'text') {
    try {
      await bot.editMessageText(text, { chat_id: chatId, message_id: st.msgId, ...clean });
      return;
    } catch {}
  }
  const sent = await bot.sendMessage(chatId, text, clean);
  st.msgId = sent.message_id;
  st.msgKind = 'text';
}

function navKeyboard(lang, showHome = true) {
  const row = [];
  row.push({ text: '◀️ ' + tLang(lang, 'btn_back'), callback_data: 'nav:back' });
  if (showHome) row.push({ text: '🏠 ' + tLang(lang, 'btn_home'), callback_data: 'nav:home' });
  row.push({ text: '🌐 ' + tLang(lang, 'btn_language'), callback_data: 'nav:lang' });
  return { inline_keyboard: [row] };
}

function mainReplyKeyboard(lang) {
  return {
    keyboard: [
      [{ text: '📂 ' + tLang(lang, 'btn_categories') }, { text: '⭐ ' + tLang(lang, 'btn_featured') }],
      [{ text: '📜 ' + tLang(lang, 'btn_policies') }, { text: '🛒 ' + tLang(lang, 'btn_new_arrivals') }],
      [{ text: '🌐 ' + tLang(lang, 'btn_language') }, { text: '📞 ' + tLang(lang, 'btn_contact') }],
    ],
    resize_keyboard: true,
  };
}

// ---------- product queries ----------
const PRODUCT_SELECT = '*, categories(id, name, slug), product_media(*), product_pricing_tiers(*)';

async function queryCategories() {
  const { data, error } = await supabase.from('categories').select('*').eq('status', 'ACTIVE').eq('is_hidden', 0).order('display_order', { ascending: true });
  if (error || !data?.length) return [];
  const { data: prods, error: pErr } = await supabase.from('products').select('category_id').eq('status', 'PUBLISHED').eq('is_hidden', 0);
  const counts = {};
  (pErr ? [] : prods).forEach((p) => {
    if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1;
  });
  return data.map((c) => ({ ...c, product_count: counts[c.id] || 0 }));
}

async function queryProducts(categoryId, page, featured, newArrival) {
  let q = supabase.from('products').select(PRODUCT_SELECT).eq('status', 'PUBLISHED').eq('is_hidden', 0);
  if (categoryId) q = q.eq('category_id', categoryId);
  if (featured) q = q.eq('featured', 1);
  if (newArrival) q = q.eq('new_arrival', 1);
  q = q.order('featured', { ascending: false }).order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) return [];
  const prods = (data || []).map(shapeProduct);
  const total = prods.length;
  const pageSize = PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.max(0, Math.min(page || 0, pageCount - 1));
  return { items: prods.slice(p * pageSize, (p + 1) * pageSize), page: p, pageCount, total };
}

async function getProductById(id) {
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle();
  if (error || !data) return null;
  return shapeProduct(data);
}

// ---------- renderers ----------
function productCaption(p, lang) {
  const s = settingsCache;
  const price = p.price_on_request
    ? tLang(lang, 'price_on_request')
    : p.pricing_model === 'TIERED' && p.pricing_tiers?.length
      ? p.pricing_tiers.map((t) => `${t.quantity}${t.unit} — ${fmt(t.price, s)}`).join('\n')
      : fmt(p.price, s);
  const lines = [
    `🟢 *${p.name}*`,
    '',
    p.short_description || p.description || '',
    '',
    `💰 ${price}`,
  ];
  if (p.thc_percent != null) lines.push(`🧪 THC ${p.thc_percent}% · CBD ${p.cbd_percent ?? 0}%`);
  if (p.strain_type) lines.push(`🌿 ${p.strain_type}`);
  if (p.rating) lines.push(`⭐ ${p.rating} (${p.review_count || 0})`);
  if (p.inventory <= 0) lines.push(`🚫 ${tLang(lang, 'out_of_stock')}`);
  if (p.tags?.length) lines.push(`# ${p.tags.join(' · ')}`);
  return lines.join('\n');
}

async function sendProduct(bot, chatId, p, lang, opts = {}) {
  const mediaItems = (p.media || []).filter((m) => m.secure_url);
  const kb = { ...navKeyboard(lang), inline_keyboard: [...navKeyboard(lang).inline_keyboard] };
  if (opts.list && opts.list.url) kb.inline_keyboard.unshift([{ text: tLang(lang, 'btn_all_products'), callback_data: opts.list.url }]);
  const caption = productCaption(p, lang);
  const st = getState(chatId);
  st.msgId = null;
  st.msgKind = 'media';
  if (mediaItems.length > 1) {
    try {
      const group = mediaItems.slice(0, 10).map((m) => ({
        type: m.media_type === 'video' ? 'video' : 'photo',
        media: m.secure_url,
      }));
      await bot.sendMediaGroup(chatId, group);
    } catch {
      await sendMediaIndividually(bot, chatId, mediaItems);
    }
  } else if (mediaItems.length === 1) {
    await sendMediaIndividually(bot, chatId, mediaItems);
  }
  await sendText(bot, chatId, caption, { reply_markup: kb }, true);
}

async function sendMediaIndividually(bot, chatId, mediaItems) {
  for (const m of mediaItems.slice(0, 10)) {
    try {
      if (m.media_type === 'video') {
        await bot.sendVideo(chatId, m.secure_url);
      } else {
        await bot.sendPhoto(chatId, m.secure_url);
      }
    } catch {}
  }
}

async function renderProductList(bot, chatId, lang, items, page, pageCount, baseCb) {
  if (!items.length) {
    await sendText(bot, chatId, tLang(lang, 'bot_no_products'), { reply_markup: navKeyboard(lang) });
    return;
  }
  const rows = items.map((p) => [{ text: `${p.name} — ${p.price_on_request ? tLang(lang, 'price_on_request') : fmt(p.price, settingsCache)}`, callback_data: `prod:${p.id}` }]);
  const nav = [];
  if (page > 0) nav.push({ text: '⬅️', callback_data: `${baseCb}:${page - 1}` });
  nav.push({ text: `${page + 1}/${pageCount}`, callback_data: 'nav:none' });
  if (page < pageCount - 1) nav.push({ text: '➡️', callback_data: `${baseCb}:${page + 1}` });
  const kb = {
    inline_keyboard: [...rows, nav, [...navKeyboard(lang).inline_keyboard[0]]],
  };
  await sendText(bot, chatId, `${tLang(lang, 'bot_products_found')} (${items.length})`, { reply_markup: kb });
}

// ---------- screens ----------
async function showHome(bot, chatId, lang, fresh = false) {
  const s = settingsCache;
  const text = [
    `🌿 *${s.store_name}*`,
    s.tagline ? `${s.tagline}` : '',
    '',
    tLang(lang, 'bot_welcome'),
    '',
    tLang(lang, 'bot_home_hint'),
  ].filter(Boolean).join('\n');
  await sendText(bot, chatId, text, { reply_markup: mainReplyKeyboard(lang) }, fresh);
}

async function showLanguagePicker(bot, chatId, lang, ask = true) {
  const rows = [];
  for (let i = 0; i < LANGS.length; i += 2) {
    rows.push(LANGS.slice(i, i + 2).map((l) => ({ text: `${l.native} (${l.code})`, callback_data: `lang:${l.code}` })));
  }
  const kb = { inline_keyboard: rows };
  await sendText(bot, chatId, tLang(lang, 'bot_choose_lang'), { reply_markup: kb });
}

async function showCategories(bot, chatId, lang) {
  const cats = await queryCategories();
  if (!cats.length) {
    await sendText(bot, chatId, tLang(lang, 'bot_no_categories'), { reply_markup: navKeyboard(lang) });
    return;
  }
  const rows = cats.map((c) => [{ text: `${c.name} (${c.product_count || 0})`, callback_data: `cat:${c.id}:0` }]);
  const kb = { inline_keyboard: [...rows, [...navKeyboard(lang).inline_keyboard[0]]] };
  await sendText(bot, chatId, `📂 ${tLang(lang, 'btn_categories')}`, { reply_markup: kb });
}

async function showPolicies(bot, chatId, lang) {
  const kb = {
    inline_keyboard: [
      [{ text: '❓ ' + tLang(lang, 'faq'), callback_data: 'pol:faq' }],
      [{ text: '📄 ' + tLang(lang, 'terms'), callback_data: 'pol:terms' }],
      [{ text: '🔒 ' + tLang(lang, 'privacy'), callback_data: 'pol:privacy' }],
      [{ text: '💳 ' + tLang(lang, 'payment_options'), callback_data: 'pol:payments' }],
      [...navKeyboard(lang).inline_keyboard[0]],
    ],
  };
  await sendText(bot, chatId, `📜 ${tLang(lang, 'btn_policies')} — ${tLang(lang, 'bot_policies_hint')}`, { reply_markup: kb });
}

async function showPolicy(bot, chatId, lang, type) {
  let text = '';
  if (type === 'faq') {
    const lines = [];
    for (let i = 1; i <= 8; i++) {
      const q = tLang(lang, `faq${i}_q`);
      const a = tLang(lang, `faq${i}_a`);
      if (q !== `faq${i}_q` && a !== `faq${i}_a`) lines.push(`*${q}*\n${a}\n`);
    }
    text = lines.join('\n') || tLang(lang, 'bot_no_content');
  } else if (type === 'terms') {
    const lines = [];
    for (let i = 1; i <= 7; i++) {
      const title = tLang(lang, `terms${i}_title`);
      const body = tLang(lang, `terms${i}_body`);
      if (title !== `terms${i}_title` && body !== `terms${i}_body`) lines.push(`*${title}*\n${body}\n`);
    }
    text = lines.join('\n') || tLang(lang, 'bot_no_content');
  } else if (type === 'privacy') {
    const lines = [];
    for (let i = 1; i <= 6; i++) {
      const title = tLang(lang, `priv${i}_title`);
      const body = tLang(lang, `priv${i}_body`);
      if (title !== `priv${i}_title` && body !== `priv${i}_body`) lines.push(`*${title}*\n${body}\n`);
    }
    text = lines.join('\n') || tLang(lang, 'bot_no_content');
  } else {
    const s = settingsCache;
    const lines = [`💳 *${tLang(lang, 'payment_options')}*`, ''];
    for (const [name, key] of [['CRYPTO', 'pay_crypto'], ['PAYPAL', 'pay_paypal'], ['WIRE', 'pay_wire'], ['GIFT', 'pay_gift']]) {
      lines.push(`• ${tLang(lang, key)}: ${tLang(lang, 'pay_info_' + key.replace('pay_', ''))}`);
    }
    lines.push('', s.support_email ? `✉️ ${s.support_email}` : '');
    text = lines.join('\n');
  }
  // Telegram messages cap at 4096 chars — split long policy bodies.
  const kb = { inline_keyboard: [[{ text: '◀️ ' + tLang(lang, 'btn_back'), callback_data: 'pol:list' }], [...navKeyboard(lang).inline_keyboard[0]]] };
  const chunks = text.match(/[\s\S]{1,3500}/g) || [text];
  for (let i = 0; i < chunks.length; i++) {
    const last = i === chunks.length - 1;
    if (i === 0) {
      await sendText(bot, chatId, chunks[i], { reply_markup: last ? kb : undefined });
    } else {
      const sent = await bot.sendMessage(chatId, chunks[i], { parse_mode: 'Markdown', reply_markup: last ? kb : undefined });
      const st = getState(chatId);
      st.msgId = sent.message_id;
      st.msgKind = 'text';
    }
  }
}

async function showContact(bot, chatId, lang) {
  const s = settingsCache;
  const adminHandle = s.telegram_admin_handle || 'narcosbay';
  const adminUrl = `https://t.me/${adminHandle}`;
  const kb = {
    inline_keyboard: [
      [{ text: `✉️ ${tLang(lang, 'contact_admin')} (@${adminHandle})`, url: adminUrl }],
      [{ text: '✈️ ' + tLang(lang, 'join_telegram'), url: s.telegram_channel_url || adminUrl }],
      [...navKeyboard(lang).inline_keyboard[0]],
    ],
  };
  const text = [
    `📞 *${tLang(lang, 'contact_support')}*`,
    '',
    s.support_email ? `✉️ ${s.support_email}` : '',
    `${tLang(lang, 'contact_admin')}: @${adminHandle}`,
    tLang(lang, 'contact_via_telegram'),
  ].filter(Boolean).join('\n');
  await sendText(bot, chatId, text, { reply_markup: kb });
}

// ---------- admin screens ----------
async function isAdmin(chatId) {
  return ADMIN_ID && String(chatId) === ADMIN_ID;
}

async function showAdminPanel(bot, chatId) {
  const users = listTelegramUsers();
  const kb = {
    inline_keyboard: [
      [{ text: '👥 ' + tLang('EN', 'admin_users') + ` (${users.length})`, callback_data: 'adm:users' }],
      [{ text: '📣 ' + tLang('EN', 'admin_broadcast'), callback_data: 'adm:broadcast' }],
      [{ text: '🔄 ' + tLang('EN', 'admin_bot_status'), callback_data: 'adm:status' }],
      [{ text: '🏠 ' + tLang('EN', 'btn_home'), callback_data: 'nav:home' }],
    ],
  };
  await sendText(bot, chatId, `⚙️ *ADMIN PANEL*\n\n👥 ${users.length} bot users registered`, { reply_markup: kb }, true);
}

async function showAdminUsers(bot, chatId) {
  const users = listTelegramUsers();
  if (!users.length) {
    await sendText(bot, chatId, 'No bot users yet.', { reply_markup: navKeyboard('EN') });
    return;
  }
  const lines = users.slice(0, 50).map((u, i) =>
    `${i + 1}. ${u.first_name || ''} ${u.last_name || ''}${u.username ? ` @${u.username}` : ''} — ${u.language || 'EN'} — ${(u.last_active_at || '').slice(0, 16)}`
  );
  await sendText(bot, chatId, '👥 *BOT USERS*\n\n' + lines.join('\n'), { reply_markup: navKeyboard('EN') });
}

// ---------- message handler ----------
async function handleText(bot, msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const from = msg.from || {};
  const st = getState(chatId);
  const isAdm = await isAdmin(chatId);

  upsertTelegramUser({
    telegram_id: String(chatId),
    first_name: from.first_name || null,
    last_name: from.last_name || null,
    username: from.username || null,
    language: st.lang,
  });

  const lang = st.lang;

  if (isAdm && text === '/admin') return showAdminPanel(bot, chatId);
  if (text.startsWith('/start ')) {
    const tok = text.slice(7).trim();
    if (tok.startsWith('nb-')) {
      const link = await consumeTelegramLink(tok);
      if (link) {
        await setTelegramUserSiteUser(chatId, link.user_id);
        try {
          await bot.sendMessage(chatId, '✅ Account linked. You will now receive your order updates here.', { parse_mode: 'Markdown' });
        } catch {}
      }
    }
  }
  if (text === '/start' || text.startsWith('/start ')) {
    st.stack = [];
    const welcome = tLang(lang, 'bot_welcome_msg');
    if (welcome && welcome !== 'bot_welcome_msg') {
      try { await bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown' }); } catch {}
    }
    st.msgId = null;
    st.msgKind = null;
    await showLanguagePicker(bot, chatId, lang);
    return;
  }
  if (st.awaitingBroadcast) {
    st.awaitingBroadcast = false;
    if (norm(text) === 'cancel') {
      await bot.sendMessage(chatId, 'Broadcast cancelled.', { reply_markup: navKeyboard('EN') });
      return;
    }
    await broadcastMessage(text, chatId);
    return;
  }
  if (isAdm && text.startsWith('/bc ')) {
    return broadcastMessage(text.slice(4).trim(), chatId);
  }
  if (text.startsWith('/')) {
    // unknown command → home
    st.stack = [];
    return showHome(bot, chatId, lang);
  }

  // Main menu / button routing
  if (isLabel(lang, text, MENU_KEYS.home)) {
    st.stack = [];
    return showHome(bot, chatId, lang, true);
  }
  if (isLabel(lang, text, MENU_KEYS.categories)) {
    st.stack.push('home');
    return showCategories(bot, chatId, lang);
  }
  if (isLabel(lang, text, MENU_KEYS.featured)) {
    st.stack.push('home');
    const r = await queryProducts(null, 0, true, false);
    return renderProductList(bot, chatId, lang, r.items, r.page, r.pageCount, 'feat');
  }
  if (isLabel(lang, text, MENU_KEYS.policies)) {
    st.stack.push('home');
    return showPolicies(bot, chatId, lang);
  }
  if (isLabel(lang, text, MENU_KEYS.language)) {
    st.stack.push('home');
    return showLanguagePicker(bot, chatId, lang);
  }
  if (isLabel(lang, text, MENU_KEYS.contact)) {
    st.stack.push('home');
    return showContact(bot, chatId, lang);
  }
  if (isLabel(lang, text, 'btn_new_arrivals')) {
    st.stack.push('home');
    const r = await queryProducts(null, 0, false, true);
    return renderProductList(bot, chatId, lang, r.items, r.page, r.pageCount, 'new');
  }

  // Fallback: treat text as a search query
  if (text.length > 1) {
    st.stack.push('home');
    const like = `%${text}%`;
    const { data, error } = await supabase.from('products')
      .select(PRODUCT_SELECT).eq('status', 'PUBLISHED').eq('is_hidden', 0)
      .or(`name.ilike.${like},description.ilike.${like},tags.ilike.${like}`)
      .order('featured', { ascending: false }).order('created_at', { ascending: false });
    if (!error && data?.length) {
      const items = data.slice(0, PAGE_SIZE).map(shapeProduct);
      await bot.sendMessage(chatId, `🔍 ${tLang(lang, 'search')}: ${text}`);
      return renderProductList(bot, chatId, lang, items, 0, 1, 'srch');
    }
  }
  await sendErr(chatId, lang, tLang(lang, 'bot_unknown'));
}

// ---------- callback handler ----------
async function handleCallback(bot, query) {
  const chatId = query.message?.chat?.id;
  if (!chatId) return;
  const data = query.data || '';
  const st = getState(chatId);
  const lang = st.lang;
  try { await bot.answerCallbackQuery(query.id); } catch {}

  if (data.startsWith('lang:')) {
    const code = data.split(':')[1];
    if (LANGS.some((l) => l.code === code)) {
      st.lang = code;
      setTelegramUserLang(String(chatId), code);
      await showHome(bot, chatId, code, true);
    }
    return;
  }

  if (data === 'nav:back') {
    const prev = st.stack.pop();
    if (prev === 'categories') return showCategories(bot, chatId, lang);
    if (prev === 'policies') return showPolicies(bot, chatId, lang);
    if (prev === 'policy-list') return showPolicies(bot, chatId, lang);
    if (prev === 'contact') return showContact(bot, chatId, lang);
    return showHome(bot, chatId, lang);
  }
  if (data === 'nav:home') {
    st.stack = [];
    return showHome(bot, chatId, lang);
  }
  if (data === 'nav:lang') {
    st.stack.push('home');
    return showLanguagePicker(bot, chatId, lang);
  }
  if (data === 'nav:none') return;

  if (data.startsWith('cat:')) {
    const [, catId, pageStr] = data.split(':');
    const page = Number(pageStr || 0);
    const r = await queryProducts(catId, page, false, false);
    st.stack = st.stack.length ? st.stack : ['home'];
    return renderProductList(bot, chatId, lang, r.items, r.page, r.pageCount, `cat:${catId}`);
  }

  if (data.startsWith('feat:') || data.startsWith('new:') || data.startsWith('srch:')) {
    const [kind, pageStr] = data.split(':');
    const page = Number(pageStr || 0);
    const r = await queryProducts(null, page, kind === 'feat', kind === 'new');
    return renderProductList(bot, chatId, lang, r.items, r.page, r.pageCount, kind);
  }

  if (data.startsWith('prod:')) {
    const id = data.split(':')[1];
    const p = await getProductById(id);
    if (!p) return sendErr(bot, chatId, lang, tLang(lang, 'bot_product_gone'));
    st.stack.push('home');
    return sendProduct(bot, chatId, p, lang);
  }

  if (data === 'pol:list') {
    st.stack.push('home');
    return showPolicies(bot, chatId, lang);
  }
  if (data.startsWith('pol:')) {
    const type = data.split(':')[1];
    if (type === 'payments' || type === 'faq' || type === 'terms' || type === 'privacy') {
      st.stack.push('policy-list');
      return showPolicy(bot, chatId, lang, type);
    }
    return showPolicies(bot, chatId, lang);
  }

  // admin callbacks
  if (data.startsWith('adm:') && (await isAdmin(chatId))) {
    const action = data.split(':')[1];
    if (action === 'users') return showAdminUsers(bot, chatId);
    if (action === 'broadcast') {
      st.awaitingBroadcast = true;
      await bot.sendMessage(chatId, '📣 Send the message you want to broadcast to all bot users (or type *cancel*).', { parse_mode: 'Markdown', reply_markup: navKeyboard('EN') });
      return;
    }
    if (action === 'status') {
      await bot.sendMessage(chatId, `🔄 *BOT STATUS*\n\n• Running: ${telegramController.status === 'running'}\n• Username: @${telegramController.username || '?'}\n• Started: ${telegramController.lastStart || 'never'}`, { parse_mode: 'Markdown', reply_markup: navKeyboard('EN') });
      return;
    }
  }
}

// ---------- broadcast ----------
async function broadcastMessage(text, fromChatId) {
  const users = await listTelegramUsers();
  if (!text) return;
  const b = getBot();
  let sent = 0;
  let failed = 0;
  for (const u of users) {
    try {
      await b.sendMessage(u.telegram_id, text);
      sent++;
    } catch {
      failed++;
    }
  }
  const status = failed === 0 ? 'SENT' : sent === 0 ? 'FAILED' : 'PARTIAL';
  await logBroadcast(text, sent, status);
  const report = `📣 Broadcast sent: ${sent} delivered${failed ? `, ${failed} failed` : ''}.`;
  if (fromChatId) {
    try { await b.sendMessage(fromChatId, report); } catch {}
  }
  return { sent, failed };
}

// ---------- startup (long-polling, local dev only) ----------
export async function startTelegramBot() {
  telegramController.lastStart = now();
  if (!TOKEN) {
    telegramController.status = 'disabled';
    telegramController.error = 'TELEGRAM_BOT_TOKEN missing in backend/.env';
    console.error('[telegram] ' + telegramController.error);
    return telegramController;
  }
  if (telegramController.bot) {
    try { telegramController.bot.stopPolling(); } catch {}
  }
  settingsCache = await getSettings();
  bot = new TelegramBot(TOKEN, { polling: { params: { timeout: 30 } } });
  telegramController.bot = bot;
  telegramController.status = 'starting';
  try {
    const me = await bot.getMe();
    telegramController.username = me.username;
    telegramController.status = 'running';
    telegramController.error = null;
    console.log(`[telegram] Bot @${me.username} online, polling.`);
  } catch (e) {
    telegramController.status = 'error';
    telegramController.error = e?.message || 'getMe failed';
    console.error('[telegram] ' + telegramController.error);
    return telegramController;
  }

  bot.on('message', (msg) => handleText(bot, msg).catch((e) => console.error('[telegram] message handler:', e?.message)));
  bot.on('callback_query', (query) => handleCallback(bot, query).catch((e) => console.error('[telegram] callback handler:', e?.message)));
  bot.on('polling_error', (e) => {
    telegramController.error = e?.message || 'polling error';
    console.error('[telegram] polling error:', e?.message);
  });
  return telegramController;
}

// ---------- webhook mode (serverless / Vercel) ----------
// Register the webhook with Telegram. Call once per environment, e.g. via the
// "npm run bot:webhook -- <public_base_url>" script after deploying.
export async function setupWebhook(url) {
  if (!TOKEN) return { ok: false, error: 'TELEGRAM_BOT_TOKEN missing' };
  const b = getBot();
  const clean = String(url || '').replace(/\/+$/, '');
  if (!clean) {
    try {
      await b.deleteWebHook();
      webhookRegistered = false;
      return { ok: true, url: '' };
    } catch (e) {
      return { ok: false, error: e?.message };
    }
  }
  if (!clean.startsWith('https://')) return { ok: false, error: 'Webhook URL must be https' };
  const webhookUrl = `${clean}/api/telegram/webhook`;
  try {
    await b.setWebHook(webhookUrl);
    webhookRegistered = true;
    const me = await b.getMe();
    telegramController.username = me.username;
    telegramController.status = 'running';
    telegramController.error = null;
    telegramController.lastStart = now();
    return { ok: true, url: webhookUrl, username: me.username };
  } catch (e) {
    telegramController.status = 'error';
    telegramController.error = e?.message || 'setWebHook failed';
    return { ok: false, error: telegramController.error };
  }
}

// Process a single Telegram update pushed by the webhook. This mirrors the
// message/callback handlers that run under long-polling in local dev.
export async function processUpdate(update) {
  if (!TOKEN) return { ok: false, error: 'TELEGRAM_BOT_TOKEN missing' };
  const b = getBot();
  if (!settingsCache) settingsCache = await getSettings();
  if (!webhookRegistered) {
    telegramController.status = 'running';
    telegramController.lastStart = telegramController.lastStart || now();
  }
  try {
    if (update?.message) {
      await handleText(b, update.message);
    } else if (update?.callback_query) {
      await handleCallback(b, update.callback_query);
    }
    return { ok: true };
  } catch (e) {
    console.error('[telegram] webhook handler:', e?.message);
    return { ok: false, error: e?.message };
  }
}

// Expose broadcast for the web admin panel.
telegramController.broadcast = broadcastMessage;
telegramController.getUsers = listTelegramUsers;

// ---------- Web-facing helpers (admin panel + order notifications) ----------
export async function getBotUsername() {
  if (telegramController.username) return telegramController.username;
  try {
    const me = await getBot().getMe();
    telegramController.username = me.username;
    return me.username;
  } catch {
    return null;
  }
}

export async function getWebhookInfo() {
  if (!TOKEN) return { ok: false, error: 'TELEGRAM_BOT_TOKEN missing' };
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
    const j = await r.json();
    return j.ok ? { ok: true, ...(j.result || {}) } : { ok: false, error: j.description };
  } catch (e) {
    return { ok: false, error: e?.message };
  }
}

export async function sendToChat(chatId, text) {
  if (!TOKEN || !chatId || !text) return { ok: false };
  try {
    await getBot().sendMessage(String(chatId), text, { parse_mode: 'Markdown' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message };
  }
}

export function notifyOrderStatus(chatId, order) {
  const lines = [
    `📦 *Order ${order.order_number}*`,
    `Status: *${order.status}*`,
  ];
  if (order.tracking_number) lines.push(`Tracking: \`${order.tracking_number}\``);
  lines.push('', '🔔 Check your orders on the site for full details.');
  return sendToChat(chatId, lines.join('\n'));
}
