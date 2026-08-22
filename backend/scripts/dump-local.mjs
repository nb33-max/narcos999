import db from '../db/schema.js';

function dumpTable(table) {
  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  console.log(`\n-- ${table} (${rows.length} rows)`);
  return rows;
}

const out = {
  stories: dumpTable('stories'),
  story_likes: dumpTable('story_likes'),
  telegram_users: dumpTable('telegram_users'),
  telegram_broadcasts: dumpTable('telegram_broadcasts'),
  payment_method_details: dumpTable('payment_method_details'),
};
console.log('\nJSON_DUMP_START');
console.log(JSON.stringify(out));
