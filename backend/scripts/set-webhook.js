import 'dotenv/config';
import { setupWebhook } from '../telegram/bot.js';

const url = (process.argv[2] || process.env.PUBLIC_BASE_URL || '').trim();
if (!url) {
  console.error('Usage: npm run bot:webhook -- https://yourdomain.com');
  process.exit(1);
}
const res = await setupWebhook(url);
console.log(JSON.stringify(res, null, 2));
process.exit(res.ok ? 0 : 1);
