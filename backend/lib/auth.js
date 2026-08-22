import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET || 'narcosbay-dev-insecure-secret-change-me';

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

export function signToken(userId) {
  const payload = b64url(JSON.stringify({ uid: userId, iat: Date.now() }));
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data && data.uid ? String(data.uid) : null;
  } catch {
    return null;
  }
}
