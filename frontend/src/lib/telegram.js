export const TELEGRAM_BOT_HANDLE = 'shop_narcos_bot';

export const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_HANDLE}`;

export function telegramBotUrl(settings) {
  return settings?.telegram_bot_url || TELEGRAM_BOT_URL;
}

// Derive the handle from whichever URL is active, so replacing the bot in the
// admin panel updates the label too (no code change needed).
export function telegramBotHandle(settings) {
  const url = String(telegramBotUrl(settings));
  const m = url.match(/t\.me\/([^/?#]+)/i);
  if (m) return m[1];
  return settings?.telegram_bot_handle || TELEGRAM_BOT_HANDLE;
}
