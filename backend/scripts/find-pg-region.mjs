import 'dotenv/config';
import pg from 'pg';

const REF = new URL(process.env.SUPABASE_URL).hostname.split('.')[0];
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const regions = ['us-east-1', 'us-west-1', 'eu-central-1', 'eu-west-1', 'ap-southeast-1', 'ap-southeast-2', 'sa-east-1', 'us-east-2', 'eu-west-2', 'eu-west-3', 'ap-northeast-1', 'ap-northeast-2', 'ca-central-1', 'us-west-2', 'eu-north-1', 'eu-south-1', 'ap-southeast-3', 'ap-northeast-3', 'ap-south-1', 'ap-south-2', 'ap-east-1', 'af-south-1', 'me-south-1', 'me-central-1', 'il-central-1'];

async function tryConn(user, password, host, port, dbname) {
  const c = new pg.Client({ host, port, user, password, database: dbname, connectionTimeoutMillis: 10000, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    const r = await c.query('SELECT current_database() AS db, current_user AS usr');
    console.log(`OK ${user}@${host}:${port}/${dbname} -> db=${r.rows[0].db} usr=${r.rows[0].usr}`);
    return c;
  } catch (e) {
    try { await c.end(); } catch {}
    console.log(`FAIL ${user}@${host}:${port}/${dbname} -> ${e.message.slice(0, 120)}`);
    return null;
  }
}

for (const region of regions) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const c = await tryConn(`postgres.${REF}`, SERVICE_KEY, host, 6543, 'postgres');
  if (c) {
    await c.end();
    console.log('MATCHED_REGION=' + region);
    process.exit(0);
  }
}
console.log('NO_REGION_MATCH');
process.exit(1);
