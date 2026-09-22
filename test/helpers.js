import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { openDb } from '../src/db.js';
import { createApp } from '../src/lib/app.js';
import { errorPage } from '../src/views/layout.js';
import { seedProducts, ensureAdmin } from '../src/seed.js';
import { shopRoutes } from '../src/routes/shop.js';
import { accountRoutes } from '../src/routes/account.js';
import { checkoutRoutes } from '../src/routes/checkout.js';
import { adminRoutes } from '../src/routes/admin.js';
import { pageRoutes } from '../src/routes/pages.js';

/** Boots a full in-memory instance on a random port and returns a tiny fetch-like client that keeps cookies. */
export async function startTestServer(configOverrides = {}) {
  const db = openDb(':memory:');
  seedProducts(db);
  const admin = await ensureAdmin(db, { email: 'admin@example.com', password: 'a very good passphrase 12' });

  const config = {
    root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
    isProd: false, port: 0, host: '127.0.0.1', baseUrl: 'http://127.0.0.1',
    dbPath: ':memory:', trustProxy: false, cookieSecure: false, sessionDays: 14,
    currency: 'USD', taxRate: 0, shippingCents: 695, freeShippingOverCents: 7500, maxQtyPerLine: 10, returnDays: 60,
    support: { phone: '', sms: '', email: 'help@example.com', relay: '' },
    ...configOverrides,
  };

  const app = createApp({ config, db });
  app.renderError = errorPage;
  shopRoutes(app); accountRoutes(app); checkoutRoutes(app); adminRoutes(app); pageRoutes(app);

  const server = app.server();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  let cookieJar = new Map();
  const applySetCookie = (res) => {
    const raw = res.headers.getSetCookie?.() ?? [];
    for (const line of raw) {
      const [pair] = line.split(';');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      if (/Max-Age=0/i.test(line)) cookieJar.delete(name);
      else cookieJar.set(name, value);
    }
  };
  const cookieHeader = () => [...cookieJar].map(([k, v]) => `${k}=${v}`).join('; ');

  async function req(method, path, { body, redirect = 'manual' } = {}) {
    const headers = { cookie: cookieHeader() };
    if (body) headers['content-type'] = 'application/x-www-form-urlencoded';
    const res = await fetch(base + path, { method, headers, body, redirect });
    applySetCookie(res);
    return res;
  }

  async function getCsrf(path) {
    const res = await req('GET', path);
    const html = await res.text();
    const m = html.match(/name="_csrf" value="([^"]*)"/);
    return { html, csrf: m?.[1] ?? '' };
  }

  return {
    db, app, server, base, admin,
    get: (path) => req('GET', path),
    post: (path, data) => req('POST', path, { body: new URLSearchParams(data).toString() }),
    getCsrf,
    resetCookies: () => { cookieJar = new Map(); },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
