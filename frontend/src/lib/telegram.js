export const TELEGRAM_BOT_HANDLE = 'shop_narcos_bot';

export const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_HANDLE}`;

export function telegramBotUrl(settings) {
  return settings?.telegram_bot_url || TELEGRAM_BOT_URL;
}
