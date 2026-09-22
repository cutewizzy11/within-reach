import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { now } from '../db.js';
import { parseCookies, serializeCookie, randomToken, sha256, safeEqual, RateLimiter } from './security.js';
import { parsePrefs, serializePrefs } from './prefs.js';
import { isRaw } from './html.js';

const MAX_BODY = 64 * 1024;
const MIME = {
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ------------------------------------------------------------------------------------------------ headers
function securityHeaders(config) {
  const csp = [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "manifest-src 'self'",
  ];
  if (config.isProd) csp.push('upgrade-insecure-requests');
  const h = {
    'Content-Security-Policy': csp.join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    // same-origin (not no-referrer): no-referrer makes browsers send "Origin: null" on form posts.
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };
  if (config.isProd) h['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains';
  return h;
}

// ------------------------------------------------------------------------------------------------ context
class Ctx {
  constructor(app, req, res) {
    this.app = app;
    this.req = req;
    this.res = res;
    this.id = crypto.randomBytes(6).toString('hex');
    this.method = req.method;
    this.ip = this.#clientIp();
    this.url = new URL(req.url, 'http://x');
    this.path = this.url.pathname;
    this.query = this.url.searchParams;
    this.params = {};
    this.form = null;
    this.cookies = parseCookies(req.headers.cookie);
    this.setCookies = [];
    this.headers = {};
    this._session = undefined;
    this._user = undefined;
    this.title = '';
  }

  #clientIp() {
    if (this.app.config.trustProxy) {
      const xff = String(this.req.headers['x-forwarded-for'] ?? '').split(',').pop()?.trim();
      if (xff) return xff;
    }
    return this.req.socket.remoteAddress ?? 'unknown';
  }

  get config() { return this.app.config; }
  get db() { return this.app.db; }

  // ---- form access (trimmed, control characters removed, NFC-normalised)
  input(name, max = 500) {
    const v = this.form?.get(name);
    if (v == null) return '';
    return v.normalize('NFC').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').trim().slice(0, max);
  }
  has(name) { return this.form?.has(name) ?? false; }

  // ---- session
  get sessionCookieName() { return this.config.cookieSecure ? '__Host-wr_sid' : 'wr_sid'; }

  session() {
    if (this._session !== undefined) return this._session;
    const token = this.cookies[this.sessionCookieName];
    this._session = token && token.length < 100 ? this.app.sessions.load(sha256(token)) : null;
    return this._session;
  }

  requireSession() {
    let s = this.session();
    if (!s) {
      const created = this.app.sessions.create(null);
      this.#setSessionCookie(created.token);
      s = this._session = created.session;
    }
    return s;
  }

  /** Swap in a fresh session id (prevents session fixation) and optionally attach a user. */
  rotateSession(userId) {
    const old = this.session();
    const created = this.app.sessions.create(userId, old?.id_hash);
    this.#setSessionCookie(created.token);
    this._session = created.session;
    this._user = undefined;
    return created.session;
  }

  endSession() {
    const s = this.session();
    if (s) this.app.sessions.destroy(s.id_hash);
    this._session = null;
    this._user = null;
    this.setCookies.push(serializeCookie(this.sessionCookieName, '', { maxAge: 0, httpOnly: true, secure: this.config.cookieSecure }));
  }

  #setSessionCookie(token) {
    this.setCookies.push(serializeCookie(this.sessionCookieName, token, {
      maxAge: this.config.sessionDays * 86400, httpOnly: true, secure: this.config.cookieSecure, sameSite: 'Lax',
    }));
  }

  user() {
    if (this._user !== undefined) return this._user;
    const s = this.session();
    this._user = s?.user_id ? this.db.prepare('SELECT id, email, name, role, prefs, comm_pref, phone, delivery_notes FROM users WHERE id = ?').get(s.user_id) ?? null : null;
    return this._user;
  }

  csrf() { return this.requireSession().csrf; }

  flash(kind, text) {
    const s = this.requireSession();
    this.db.prepare('UPDATE sessions SET flash = ? WHERE id_hash = ?').run(JSON.stringify({ kind, text }), s.id_hash);
  }

  takeFlash() {
    const s = this.session();
    if (!s?.flash) return null;
    this.db.prepare("UPDATE sessions SET flash = '' WHERE id_hash = ?").run(s.id_hash);
    try { return JSON.parse(s.flash); } catch { return null; }
  }

  cartCount() {
    const s = this.session();
    if (!s) return 0;
    return this.db.prepare('SELECT COALESCE(SUM(qty), 0) AS n FROM cart_items WHERE session_hash = ?').get(s.id_hash).n;
  }

  // ---- display preferences
  prefs() {
    if (!this._prefs) {
      const fromCookie = this.cookies.wr_prefs;
      this._prefs = parsePrefs(fromCookie ?? this.user()?.prefs ?? '');
    }
    return this._prefs;
  }
  savePrefs(prefs) {
    this._prefs = prefs;
    this.setCookies.push(serializeCookie('wr_prefs', serializePrefs(prefs), { maxAge: 365 * 86400, sameSite: 'Lax', secure: this.config.cookieSecure }));
  }

  // ---- rate limiting: returns true if allowed, otherwise writes a 429 and returns false
  limit(key, max, windowMs) {
    const r = this.app.limiter.hit(key, max, windowMs);
    if (r.ok) return true;
    this.headers['Retry-After'] = String(r.retryAfter);
    const msg = `Too many attempts from your connection. Please wait ${Math.max(1, Math.ceil(r.retryAfter / 60))} minute(s) and try again.`;
    if (this.app.renderError) this.page(429, this.app.renderError(this, 429, msg)); else this.text(429, msg);
    return false;
  }

  // ---- responses
  send(status, body, contentType, extra = {}) {
    if (this.res.headersSent) return;
    const headers = { ...this.app.secHeaders, 'Content-Type': contentType, 'Cache-Control': 'no-store', ...this.headers, ...extra };
    if (this.setCookies.length) headers['Set-Cookie'] = this.setCookies;
    if (this.method === 'HEAD') { this.res.writeHead(status, headers); this.res.end(); return; }
    this.res.writeHead(status, { ...headers, 'Content-Length': Buffer.byteLength(body) });
    this.res.end(body);
  }
  page(status, view) { this.send(status, isRaw(view) ? view.toString() : String(view), 'text/html; charset=utf-8'); }
  text(status, body) { this.send(status, body, 'text/plain; charset=utf-8'); }
  json(status, data, extra) { this.send(status, JSON.stringify(data, null, 2), 'application/json; charset=utf-8', extra); }
  redirect(location, status = 303) {
    // Never redirect off-site: only same-origin absolute paths. "/\host" is treated as "//host" by browsers, so it is rejected too.
    if (!/^\/(?![/\\])[\x21-\x7E]*$/.test(location)) location = '/';
    this.send(status, '', 'text/plain; charset=utf-8', { Location: location });
  }
}

// ------------------------------------------------------------------------------------------------ session store
function createSessionStore(db, config) {
  const get = db.prepare('SELECT * FROM sessions WHERE id_hash = ? AND expires_at > ?');
  const touch = db.prepare('UPDATE sessions SET last_seen = ?, expires_at = ? WHERE id_hash = ?');
  return {
    load(idHash) {
      const t = now();
      const s = get.get(idHash, t);
      if (!s) return null;
      if (t - s.last_seen > 3600) touch.run(t, t + config.sessionDays * 86400, idHash); // sliding expiry, written at most hourly
      return s;
    },
    create(userId, replaceHash) {
      const token = randomToken(32);
      const idHash = sha256(token);
      const t = now();
      db.prepare('INSERT INTO sessions (id_hash, user_id, csrf, created_at, last_seen, expires_at) VALUES (?,?,?,?,?,?)')
        .run(idHash, userId, randomToken(24), t, t, t + config.sessionDays * 86400);
      if (replaceHash) {
        db.prepare('UPDATE cart_items SET session_hash = ? WHERE session_hash = ?').run(idHash, replaceHash);
        db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(replaceHash);
      }
      return { token, session: get.get(idHash, t) };
    },
    destroy(idHash) { db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(idHash); },
    purgeExpired() { db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now()); },
  };
}

// ------------------------------------------------------------------------------------------------ static files
function createStatic(root) {
  const cache = new Map();
  const versions = new Map();
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel);
    if (rel === '' || rel.length > 200) return null;
    const file = path.resolve(root, rel);
    let entry = null;
    if (file.startsWith(root + path.sep) && !rel.split('/').some((seg) => seg.startsWith('.'))) {
      try {
        const stat = fs.statSync(file);
        if (stat.isFile()) entry = { body: fs.readFileSync(file), type: MIME[path.extname(file)] ?? 'application/octet-stream' };
      } catch { /* not found */ }
    }
    if (entry) cache.set(rel, entry); // never cache misses: that would let random URLs grow memory without bound
    return entry;
  };
  return {
    serve(ctx) {
      let rel;
      try { rel = decodeURIComponent(ctx.path).replace(/^\/+/, ''); } catch { return false; }
      if (rel.includes('\0') || rel.includes('\\')) return false;
      const entry = load(rel);
      if (!entry) return false;
      const long = ctx.query.has('v') || rel.startsWith('fonts/');
      ctx.headers['Cache-Control'] = long ? 'public, max-age=31536000, immutable' : 'public, max-age=300';
      ctx.res.writeHead(200, {
        ...ctx.app.secHeaders, 'Content-Type': entry.type, 'Content-Length': entry.body.length, ...ctx.headers,
      });
      ctx.res.end(ctx.method === 'HEAD' ? undefined : entry.body);
      return true;
    },
    /** Content-hash cache-buster so CSS/JS can be cached forever and still update on deploy. */
    version(rel) {
      if (!versions.has(rel)) {
        const e = load(rel);
        versions.set(rel, e ? crypto.createHash('sha1').update(e.body).digest('hex').slice(0, 8) : '0');
      }
      return versions.get(rel);
    },
  };
}

// ------------------------------------------------------------------------------------------------ app
export function createApp({ config, db }) {
  const routes = [];
  const app = {
    config,
    db,
    limiter: new RateLimiter(),
    secHeaders: securityHeaders(config),
    sessions: createSessionStore(db, config),
    static: createStatic(path.join(config.root, 'public')),
    renderError: null, // set by server.js
    route(method, pattern, handler) {
      const keys = [];
      const rx = new RegExp('^' + pattern.replace(/:([a-z]+)/gi, (_, k) => { keys.push(k); return '([A-Za-z0-9_-]+)'; }) + '/?$');
      routes.push({ method, rx, keys, handler });
    },
    get(p, h) { this.route('GET', p, h); },
    post(p, h) { this.route('POST', p, h); },
  };

  async function readForm(ctx) {
    const type = String(ctx.req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    if (type !== 'application/x-www-form-urlencoded') throw new HttpError(415, 'Unsupported form encoding.');
    const declared = Number(ctx.req.headers['content-length'] ?? 0);
    if (declared > MAX_BODY) throw new HttpError(413, 'That form is too large.');
    const chunks = [];
    let size = 0;
    for await (const chunk of ctx.req) {
      size += chunk.length;
      if (size > MAX_BODY) { ctx.req.destroy(); throw new HttpError(413, 'That form is too large.'); }
      chunks.push(chunk);
    }
    ctx.form = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
  }

  function checkOrigin(ctx) {
    const site = ctx.req.headers['sec-fetch-site'];
    if (site && site !== 'same-origin' && site !== 'none') throw new HttpError(403, 'Cross-site form submissions are not allowed.');
    const origin = ctx.req.headers.origin;
    if (origin && origin !== 'null') {
      let host;
      try { host = new URL(origin).host; } catch { throw new HttpError(403, 'Bad origin.'); }
      if (host !== ctx.req.headers.host) throw new HttpError(403, 'Cross-site form submissions are not allowed.');
    }
  }

  app.handle = async (req, res) => {
    const ctx = new Ctx(app, req, res);
    const started = process.hrtime.bigint();
    try {
      if (req.headers.host === undefined) throw new HttpError(400, 'Missing Host header.');
      if (!ctx.limit(`g:${ctx.ip}`, 600, 60_000)) return;

      const method = req.method === 'HEAD' ? 'GET' : req.method;
      if (!['GET', 'POST'].includes(method)) {
        ctx.headers.Allow = 'GET, HEAD, POST';
        throw new HttpError(405, 'Method not allowed.');
      }

      if (method === 'GET' && !ctx.path.startsWith('/admin') && app.static.serve(ctx)) return;

      let matched = null;
      let pathMatched = false;
      for (const r of routes) {
        const m = r.rx.exec(ctx.path);
        if (!m) continue;
        pathMatched = true;
        if (r.method !== method) continue;
        matched = r;
        ctx.params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
        break;
      }
      if (!matched) throw new HttpError(pathMatched ? 405 : 404, pathMatched ? 'Method not allowed.' : 'Page not found.');

      if (method === 'POST') {
        checkOrigin(ctx);
        await readForm(ctx);
        const sess = ctx.session();
        if (!sess || !safeEqual(ctx.form.get('_csrf') ?? '', sess.csrf)) {
          throw new HttpError(403, 'This page has expired, so nothing was changed. Go back, refresh the page and try again.');
        }
      }
      await matched.handler(ctx);
    } catch (err) {
      if (res.headersSent) { res.destroy(); return; }
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(JSON.stringify({ level: 'error', id: ctx.id, path: ctx.path, msg: err.message, stack: err.stack }));
      const message = err instanceof HttpError ? err.message : 'Something went wrong on our side. Nothing has been lost, and we have been told. Please try again.';
      try { app.renderError ? ctx.page(status, app.renderError(ctx, status, message)) : ctx.text(status, message); } catch { ctx.text(status, message); }
    } finally {
      if (process.env.LOG_REQUESTS === '1') {
        // No IPs, emails, query strings or bodies are logged.
        console.log(JSON.stringify({ level: 'info', id: ctx.id, m: req.method, p: ctx.path, s: res.statusCode, ms: Number(process.hrtime.bigint() - started) / 1e6 }));
      }
    }
  };

  app.server = () => {
    const server = http.createServer({ maxHeaderSize: 16 * 1024 }, (req, res) => { app.handle(req, res); });
    server.headersTimeout = 10_000;
    server.requestTimeout = 20_000;
    server.keepAliveTimeout = 5_000;
    server.on('close', () => app.limiter.close());
    return server;
  };

  return app;
}
