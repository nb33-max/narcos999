import 'dotenv/config';
import app from '../app.js';

const PORT = 3111;
const server = app.listen(PORT, async () => {
  console.log('TEST_SERVER_UP', PORT);
  const base = `http://localhost:${PORT}`;
  const get = (p, headers = {}) => fetch(base + p, { headers }).then(async (r) => ({ s: r.status, b: await r.text() }));
  const post = (p, body, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }).then(async (r) => ({ s: r.status, b: await r.text() }));

  const results = {};
  results.health = await get('/api/health');
  results.products = await get('/api/products?limit=1');
  results.storiesActive = await get('/api/stories/active?viewer=test'); // table may be missing pre-migration
  const login = await post('/api/auth/login', { email: 'admin@narcosbay.com', password: process.env.TEST_ADMIN_PW || '' });
  results.login = { s: login.s, hasToken: login.b.includes('"token"'), b: login.b.slice(0, 120) };
  let token = '';
  try { token = JSON.parse(login.b).token || ''; } catch {}
  results.me = await get('/api/auth/me', { Authorization: `Bearer ${token}` });
  results.badToken = await get('/api/auth/me', { Authorization: 'Bearer invalid.token' });
  results.telegramStatus = await get('/api/telegram/status', { Authorization: `Bearer ${token}` });
  results.paymentMethods = await get('/api/payment-methods'); // table may be missing pre-migration

  for (const [k, v] of Object.entries(results)) {
    let label = `${k}: ${v.s}`;
    if (v.s !== 200 && v.s !== 201) label += ` ${v.b.slice(0, 140)}`;
    else label += ` ${v.b.slice(0, 90).replace(/\n/g, ' ')}`;
    console.log(label);
  }
  server.close(() => process.exit(0));
});
setTimeout(() => { console.log('TIMEOUT'); server.close(() => process.exit(1)); }, 20000);
