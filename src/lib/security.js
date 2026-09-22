import crypto from 'node:crypto';

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  // Hash first so that length differences do not leak through timingSafeEqual's length check.
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(ba).digest(), crypto.createHash('sha256').update(bb).digest())
    && ba.length === bb.length;
}

export function parseCookies(header = '') {
  const out = Object.create(null);
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k && !(k in out)) {
      try { out[k] = decodeURIComponent(v); } catch { /* ignore malformed */ }
    }
  }
  return out;
}

export function serializeCookie(name, value, opts = {}) {
  let c = `${name}=${encodeURIComponent(value)}; Path=/`;
  if (opts.maxAge != null) c += `; Max-Age=${Math.floor(opts.maxAge)}`;
  if (opts.httpOnly) c += '; HttpOnly';
  if (opts.secure) c += '; Secure';
  c += `; SameSite=${opts.sameSite ?? 'Lax'}`;
  return c;
}

// ---- Password hashing: scrypt (memory-hard), parameters stored with the hash so they can be raised later.
const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64 };

function scrypt(password, salt, { N, r, p, keylen }) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password.normalize('NFKC'), salt, keylen, { N, r, p, maxmem: 128 * N * r + 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, N, r, p, saltB64, keyB64] = String(stored).split('$');
  if (scheme !== 'scrypt') return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), { N: +N, r: +r, p: +p, keylen: expected.length });
  return crypto.timingSafeEqual(key, expected);
}

// A real hash to verify against when the account does not exist, so response time does not reveal which emails are registered.
let dummy;
export async function dummyVerify(password) {
  dummy ??= await hashPassword('not-a-real-password-just-burning-time');
  await verifyPassword(password, dummy);
  return false;
}

const COMMON = new Set([
  'password', 'password1', 'password12', 'password123', 'password1234', '123456789012', 'qwertyuiopas', 'qwertyuiop12',
  'letmein12345', 'iloveyou1234', 'welcome12345', 'administrator', 'changeme1234', 'withinreach1', '111111111111', '000000000000',
]);

/** NIST 800-63B style: length over composition rules, blocklist of obvious choices, paste and password managers allowed. */
export function passwordProblem(password, { email = '', name = '' } = {}) {
  if (password.length < 12) return 'Use at least 12 characters. A few random words in a row works well and is easy to remember.';
  if (password.length > 128) return 'Use 128 characters or fewer.';
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return 'That password is too easy to guess. Try a few unrelated words instead.';
  const local = email.split('@')[0]?.toLowerCase();
  const nameParts = name.toLowerCase().split(/\s+/).filter((p) => p.length >= 4);
  if ((local && local.length >= 4 && lower.includes(local)) || nameParts.some((p) => lower.includes(p))) {
    return 'Do not use your name or email in your password.';
  }
  return null;
}

// ---- Fixed-window-per-key rate limiter (in-memory; one process). See docs/SECURITY.md for scaling notes.
export class RateLimiter {
  constructor() {
    this.hits = new Map();
    this.timer = setInterval(() => this.sweep(), 60_000);
    this.timer.unref();
  }
  /** @returns {{ok:boolean, retryAfter:number}} */
  hit(key, limit, windowMs) {
    const t = Date.now();
    let e = this.hits.get(key);
    if (!e || e.reset <= t) { e = { count: 0, reset: t + windowMs }; this.hits.set(key, e); }
    e.count++;
    return { ok: e.count <= limit, retryAfter: Math.ceil((e.reset - t) / 1000) };
  }
  sweep() {
    const t = Date.now();
    for (const [k, e] of this.hits) if (e.reset <= t) this.hits.delete(k);
  }
  close() { clearInterval(this.timer); }
}
