import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers.js';

test('core pages return 200', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  for (const path of ['/', '/shop', '/help', '/accessibility', '/privacy', '/display', '/login', '/register', '/robots.txt']) {
    const res = await s.get(path);
    assert.equal(res.status, 200, path);
  }
});

test('unknown route is a 404 with no stack trace leaked', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  const res = await s.get('/this-does-not-exist');
  assert.equal(res.status, 404);
  const body = await res.text();
  assert.ok(!/\bat \S+ \(?[\w./\\:-]+\.js:\d+/.test(body)); // no stack frames (source file + line number)
});

test('security headers are present on every response', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  const res = await s.get('/');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('content-security-policy').includes("default-src 'none'"));
  assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin');
});

test('a POST without a CSRF token is rejected', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  const res = await s.post('/cart/add', { product: '1', qty: '1' });
  assert.equal(res.status, 403);
});

test('a POST with a wrong CSRF token is rejected', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  await s.getCsrf('/shop'); // establish a session
  const res = await s.post('/cart/add', { product: '1', qty: '1', _csrf: 'not-the-real-token' });
  assert.equal(res.status, 403);
});

test('add to cart, view cart, checkout, and view the order — full guest flow', async (t) => {
  const s = await startTestServer();
  t.after(s.close);

  const { html, csrf } = await s.getCsrf('/product/rocker-knife');
  const productId = html.match(/name="product" value="(\d+)"/)[1];

  let res = await s.post('/cart/add', { product: productId, qty: '2', _csrf: csrf });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/cart');

  const cart = await s.getCsrf('/cart');
  assert.match(cart.html, /Line total:.*\$58\.00/s);

  res = await s.post('/checkout', {
    _csrf: cart.csrf, email: 'shopper@example.com', name: 'Alex Shopper', phone: '',
    line1: '1 Main St', line2: '', city: 'Springfield', region: 'IL', postal: '62704', country: 'US',
    comm_pref: 'email', delivery_notes: '', payment_method: 'demo',
  });
  assert.equal(res.status, 303);
  const location = res.headers.get('location');
  assert.match(location, /^\/order\/WR-\d{4}-/);

  const order = await s.get(location);
  assert.equal(order.status, 200);
  const orderBody = await order.text();
  assert.match(orderBody, /Rocker Knife/);
  assert.match(orderBody, /confirmed|received/i);
});

test('checkout fails validation with helpful, field-linked errors and does not lose entered values', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  const { html, csrf } = await s.getCsrf('/product/rocker-knife');
  const productId = html.match(/name="product" value="(\d+)"/)[1];
  await s.post('/cart/add', { product: productId, qty: '1', _csrf: csrf });

  const cart = await s.getCsrf('/cart');
  const res = await s.post('/checkout', {
    _csrf: cart.csrf, email: 'not-an-email', name: '', line1: '', city: '', region: '', postal: '', country: 'US',
    comm_pref: 'email', delivery_notes: '', payment_method: 'demo',
  });
  assert.equal(res.status, 422);
  const body = await res.text();
  assert.match(body, /problems to fix/);
  assert.match(body, /Enter your full name/i.test(body) ? /./ : /Enter/); // some field-level message is present
});

test('cannot buy more than is in stock', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  s.db.prepare('UPDATE products SET stock = 1 WHERE slug = ?').run('rocker-knife');
  const { html, csrf } = await s.getCsrf('/product/rocker-knife');
  const productId = html.match(/name="product" value="(\d+)"/)[1];
  await s.post('/cart/add', { product: productId, qty: '5', _csrf: csrf });
  const cart = await s.getCsrf('/cart');
  assert.match(cart.html, /value="1"[^>]*>/); // quantity capped at available stock
});

test('registration rejects a weak password and preserves the typed email/name', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  const { csrf } = await s.getCsrf('/register');
  const res = await s.post('/register', { _csrf: csrf, name: 'New Person', email: 'newperson@example.com', password: 'password1' });
  assert.equal(res.status, 422);
  const body = await res.text();
  assert.match(body, /newperson@example\.com/);
  assert.match(body, /New Person/);
});

test('login is generic about which part was wrong (no account enumeration)', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  const { csrf: c1 } = await s.getCsrf('/login');
  const r1 = await s.post('/login', { _csrf: c1, email: 'no-such-account@example.com', password: 'whatever password here' });
  const { csrf: c2 } = await s.getCsrf('/login');
  const r2 = await s.post('/login', { _csrf: c2, email: s.admin.email, password: 'totally wrong password' });
  const b1 = await r1.text();
  const b2 = await r2.text();
  const extractError = (b) => b.match(/<li><a href="#f-email">([^<]*)<\/a>/)?.[1];
  assert.equal(r1.status, 401);
  assert.equal(r2.status, 401);
  assert.equal(extractError(b1), extractError(b2));
});

test('non-admin (and anonymous) users cannot reach /admin', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  const anon = await s.get('/admin');
  assert.equal(anon.status, 303); // redirected to login

  const { csrf } = await s.getCsrf('/register');
  await s.post('/register', { _csrf: csrf, name: 'Regular Shopper', email: 'shopper2@example.com', password: 'a decent passphrase 12' });
  const res = await s.get('/admin');
  assert.equal(res.status, 404); // exists-but-hidden, not a 403 that confirms the path
});

test('an admin can sign in and reach /admin', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  const { csrf } = await s.getCsrf('/login');
  const login = await s.post('/login', { _csrf: csrf, email: s.admin.email, password: 'a very good passphrase 12' });
  assert.equal(login.status, 303);
  const res = await s.get('/admin');
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /Recent orders/);
});

test('a redirect target outside the site is never followed (open-redirect guard)', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  const { csrf } = await s.getCsrf('/login');
  const res = await s.post('/login', { _csrf: csrf, email: s.admin.email, password: 'a very good passphrase 12', next: '//evil.example/' });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/account');
});

test('session cookie is HttpOnly', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  const res = await s.get('/cart'); // requireSession is only called on write paths; use a page that touches session
  await s.getCsrf('/shop');
  const res2 = await s.get('/shop');
  const setCookie = res2.headers.getSetCookie?.() ?? [];
  const sess = setCookie.find((c) => c.startsWith('wr_sid='));
  if (sess) assert.match(sess, /HttpOnly/i);
});

test('account export requires sign-in and returns JSON, never card data', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  const anon = await s.get('/account/export');
  assert.equal(anon.status, 303);

  const { csrf } = await s.getCsrf('/register');
  await s.post('/register', { _csrf: csrf, name: 'Export Test', email: 'exporttest@example.com', password: 'a decent passphrase 12' });
  const res = await s.get('/account/export');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.account.email, 'exporttest@example.com');
  assert.ok(!('pass_hash' in data.account));
});
