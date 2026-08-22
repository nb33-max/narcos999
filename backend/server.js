import app from './app.js';
import { startTelegramBot } from './telegram/bot.js';

const PORT = process.env.PORT || 3001;

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection (server continues):', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception (server continues):', err?.message || err);
});

app.listen(PORT, () => {
  console.log(`NARCOS BAY backend listening on http://localhost:${PORT}`);
});

startTelegramBot().then((c) => {
  console.log(`[telegram] status=${c.status}${c.username ? ' @' + c.username : ''}${c.error ? ' · ' + c.error : ''}`);
});
