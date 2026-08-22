import 'dotenv/config';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const uid = () => crypto.randomUUID();

const stories = [
  { id: 'ef2f518f-5c68-475d-a125-0c1544fb5f17', title: ' California orange 🍊 ', media_url: 'https://res.cloudinary.com/qej6tg6f/video/upload/v1787400387/xdag71j3s21tyvvj8bww.mp4', media_type: 'image', caption: 'Frutatech x Billy the dry🧑🌾🤠 Semi dry (no presse)', link_url: null, expires_at: null, active: 1, display_order: 1, created_at: '2026-08-22T12:07:16.686Z', updated_at: '2026-08-22T12:07:16.686Z' },
  { id: '13946eca-84e2-449b-91e1-729782f4163b', title: 'JUVENTUS 🏍️', media_url: 'https://res.cloudinary.com/qej6tg6f/video/upload/v1787416657/yyyvp4o7qm14arwbisv0.mp4', media_type: 'image', caption: 'Goal 🚀', link_url: null, expires_at: null, active: 1, display_order: 1, created_at: '2026-08-22T16:38:03.722Z', updated_at: '2026-08-22T16:38:03.722Z' },
  { id: 'fd097e47-0f43-4d3b-b2cf-b8cebba95722', title: 'TOP AAA ✅', media_url: 'https://res.cloudinary.com/qej6tg6f/video/upload/v1787417729/g1pgodcvtyn3t5stce6n.mp4', media_type: 'image', caption: 'Contact to buy', link_url: null, expires_at: null, active: 1, display_order: 1, created_at: '2026-08-22T16:55:47.122Z', updated_at: '2026-08-22T16:55:47.122Z' },
];

const users = [
  { id: '870eef10-f7ae-4fe0-aaf4-b10f8d084d2c', telegram_id: '999000111', first_name: 'Flow Tester', last_name: null, username: 'flow_tester', language: 'EN', last_active_at: '2026-08-22T16:23:24.463Z', created_at: '2026-08-22T02:40:07.028Z' },
  { id: '882d8603-8d54-4992-b0a6-c66d8670a64d', telegram_id: '8953152983', first_name: 'Park', last_name: 'Smith', username: 'narcosbay', language: 'EN', last_active_at: '2026-08-22T16:32:45.360Z', created_at: '2026-08-22T02:51:40.803Z' },
];

const payments = [
  { id: '47ac2026-9711-4ac5-90aa-bea4ebe1a7b9', method: 'CRYPTO', label: 'Bitcoin (BTC)', value: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', hint: 'Network: Bitcoin', display_order: 1, active: 1, created_at: '2026-08-22T02:30:57.607Z' },
  { id: '12944290-b271-4f9d-8436-c9c3b5fb8003', method: 'CRYPTO', label: 'Ethereum (ETH)', value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', hint: 'Network: ERC-20', display_order: 2, active: 1, created_at: '2026-08-22T02:30:57.610Z' },
  { id: '39547b42-9460-4c98-acf1-74a713c40f94', method: 'CRYPTO', label: 'Monero (XMR)', value: '8BqkC9s6KJqV7g2m4xRwP3tY5zE7nQ9aD2fH4jK6lM8oP0rS1uV3wX5yZ7bC4dE6', hint: 'Network: Monero', display_order: 3, active: 1, created_at: '2026-08-22T02:30:57.610Z' },
  { id: '05ff6689-f9e6-42ac-8eb3-c9036a79a968', method: 'CRYPTO', label: 'Tether (USDT)', value: 'TXyK5P2mQ9rV4nB8sD3fG6hJ1kL7zX9cV2bN5', hint: 'Network: TRC-20', display_order: 4, active: 1, created_at: '2026-08-22T02:30:57.610Z' },
  { id: 'd61b440f-1a26-45b1-aa80-931665ece745', method: 'WIRE', label: 'SEPA / SWIFT Transfer', value: 'Beneficiary: NARCOS BAY LTD\nIBAN: DE89 3704 0044 0532 0130 00\nBIC: COBADEFFXXX\nReference: please use your order number as the payment reference.', hint: 'Use your order number as reference for faster matching.', display_order: 1, active: 1, created_at: '2026-08-22T02:30:57.610Z' },
  { id: 'de97e11d-a75e-4959-a7cc-814e82816d26', method: 'PAYPAL', label: 'PayPal Payment', value: 'https://paypal.me/narcosbay', hint: 'Send the total to the link above and note your order number. Funds are confirmed manually by our team.', display_order: 1, active: 1, created_at: '2026-08-22T02:30:57.610Z' },
  { id: 'e63b4e70-8e61-4e04-af21-ef0ec747a766', method: 'GIFT', label: 'Apple Gift Card', value: 'Apple', hint: 'Redeemable directly on site', display_order: 1, active: 1, created_at: '2026-08-22T02:30:57.610Z' },
  { id: 'c0b6e965-ee59-46d2-87bd-0daac5782a08', method: 'GIFT', label: 'Amazon Gift Card', value: 'Amazon', hint: 'Redeemable directly on site', display_order: 2, active: 1, created_at: '2026-08-22T02:30:57.611Z' },
  { id: '0c119feb-326b-4d90-9f09-34e34dc0f966', method: 'GIFT', label: 'Google Play Gift Card', value: 'Google', hint: 'Redeemable directly on site', display_order: 3, active: 1, created_at: '2026-08-22T02:30:57.611Z' },
  { id: '28b9f7b4-dd1d-4d43-9ecc-b1cb2bafa8cc', method: 'GIFT', label: 'Steam Gift Card', value: 'Steam', hint: 'Redeemable directly on site', display_order: 4, active: 1, created_at: '2026-08-22T02:30:57.611Z' },
  { id: '7a322517-7b93-4174-86b9-446725c46a96', method: 'GIFT', label: 'Razer Gold Gift Card', value: 'Razer', hint: 'Redeemable directly on site', display_order: 5, active: 1, created_at: '2026-08-22T02:30:57.611Z' },
];

async function seed(table, rows) {
  const { error } = await supabase.from(table).insert(rows);
  console.log(table, error ? 'ERROR: ' + error.message : `ok (${rows.length})`);
}

await seed('stories', stories);
await seed('telegram_users', users);
await seed('payment_method_details', payments);
