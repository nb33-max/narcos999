import { insertPaymentEntry } from '../db/local.js';

const DEFAULT_ENTRIES = [
  { method: 'CRYPTO', label: 'Bitcoin (BTC)', value: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', hint: 'Network: Bitcoin', display_order: 1 },
  { method: 'CRYPTO', label: 'Ethereum (ETH)', value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', hint: 'Network: ERC-20', display_order: 2 },
  { method: 'CRYPTO', label: 'Monero (XMR)', value: '8BqkC9s6KJqV7g2m4xRwP3tY5zE7nQ9aD2fH4jK6lM8oP0rS1uV3wX5yZ7bC4dE6', hint: 'Network: Monero', display_order: 3 },
  { method: 'CRYPTO', label: 'Tether (USDT)', value: 'TXyK5P2mQ9rV4nB8sD3fG6hJ1kL7zX9cV2bN5', hint: 'Network: TRC-20', display_order: 4 },
  { method: 'WIRE', label: 'SEPA / SWIFT Transfer', value: 'Beneficiary: NARCOS BAY LTD\nIBAN: DE89 3704 0044 0532 0130 00\nBIC: COBADEFFXXX\nReference: please use your order number as the payment reference.', hint: 'Use your order number as reference for faster matching.', display_order: 1 },
  { method: 'PAYPAL', label: 'PayPal Payment', value: 'https://paypal.me/narcosbay', hint: 'Send the total to the link above and note your order number. Funds are confirmed manually by our team.', display_order: 1 },
  { method: 'GIFT', label: 'Apple Gift Card', value: 'Apple', hint: 'Redeemable directly on site', display_order: 1 },
  { method: 'GIFT', label: 'Amazon Gift Card', value: 'Amazon', hint: 'Redeemable directly on site', display_order: 2 },
  { method: 'GIFT', label: 'Google Play Gift Card', value: 'Google', hint: 'Redeemable directly on site', display_order: 3 },
  { method: 'GIFT', label: 'Steam Gift Card', value: 'Steam', hint: 'Redeemable directly on site', display_order: 4 },
  { method: 'GIFT', label: 'Razer Gold Gift Card', value: 'Razer', hint: 'Redeemable directly on site', display_order: 5 },
];

const existing = (await import('../db/local.js')).listActivePaymentEntries();
const count = existing.filter((e) => e.method === 'CRYPTO').length;
if (count > 0) {
  console.log('[seed-features] payment entries already present, skipping.');
} else {
  for (const e of DEFAULT_ENTRIES) insertPaymentEntry(e);
  console.log('[seed-features] inserted ' + DEFAULT_ENTRIES.length + ' default payment entries.');
}

// Seed a couple of demo stories so the rail + popup have content to show.
import { listActiveStories, insertStory } from '../db/local.js';
const stories = listActiveStories();
if (stories.length === 0) {
  const base = 'https://images.unsplash.com/photo-1502643746182-009e3e6b3a8a?w=800&q=80';
  insertStory({
    title: 'New Drop — Midnight Kush Reserve',
    media_url: base,
    media_type: 'image',
    caption: 'Fresh harvest landed. Limited stock, first come first served.',
    link_url: '/product/midnight-kush-reserve',
    expires_at: null,
    active: 1,
    display_order: 1,
  });
  console.log('[seed-features] inserted 1 demo story.');
} else {
  console.log('[seed-features] stories already present, skipping.');
}
