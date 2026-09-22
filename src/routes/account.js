import { html, raw } from '../lib/html.js';
import { layout, pageHead } from '../views/layout.js';
import { field, radios, csrfField, errorSummary, money } from '../views/ui.js';
import { COMM_PREFS, STATUS_COPY } from '../catalog.js';
import { PREF_OPTIONS, PREF_LABELS, parsePrefs, serializePrefs } from '../lib/prefs.js';
import { hashPassword, verifyPassword, dummyVerify, passwordProblem } from '../lib/security.js';
import * as v from '../lib/validate.js';
import { now } from '../db.js';

const passwordToggle = (id) => html`<button type="button" class="btn btn--quiet btn--small" data-toggle-password="${id}" aria-pressed="false" hidden>Show password</button>`;

export function accountRoutes(app) {
  // ------------------------------------------------------------------------------------- register
  const registerPage = (ctx, { values = {}, errors = {}, status = 200 } = {}) => ctx.page(status, layout(ctx, {
    title: 'Create an account',
    robots: 'noindex',
    main: html`
      ${pageHead({ title: 'Create an account', lede: 'Optional. You can check out without one. An account saves your delivery details and display settings.' })}
      <div class="wrap narrow">
        ${errorSummary(errors)}
        <form method="post" action="/register" novalidate class="stack">
          ${csrfField(ctx)}
          ${field({ name: 'name', label: 'Your name', value: values.name ?? '', error: errors.name, required: true, autocomplete: 'name', maxlength: 80 })}
          ${field({ name: 'email', label: 'Email address', type: 'email', value: values.email ?? '', error: errors.email, required: true, autocomplete: 'email', maxlength: 254, spellcheck: false })}
          ${field({ name: 'password', label: 'Password', type: 'password', error: errors.password, required: true, autocomplete: 'new-password', maxlength: 128, hint: 'At least 12 characters. A few random words works well. You can paste from a password manager.' })}
          ${passwordToggle('f-password')}
          <button class="btn btn--big" type="submit">Create account</button>
        </form>
        <p>Already have an account? <a href="/login">Sign in</a>.</p>
      </div>`,
  }));

  app.get('/register', (ctx) => (ctx.user() ? ctx.redirect('/account') : registerPage(ctx)));

  app.post('/register', async (ctx) => {
    if (!ctx.limit(`reg:${ctx.ip}`, 10, 3600_000)) return;
    const values = { name: ctx.input('name', 80), email: ctx.input('email', 254).toLowerCase() };
    const password = ctx.form.get('password') ?? ''; // never trimmed or normalised
    const errors = v.collect([
      ['name', v.required(values.name, 'your name', 80)],
      ['email', v.email(values.email)],
      ['password', password ? passwordProblem(password, values) : 'Choose a password.'],
    ]);
    if (Object.keys(errors).length) return registerPage(ctx, { values, errors, status: 422 });

    const hash = await hashPassword(password);
    let id;
    try {
      const prefs = serializePrefs(ctx.prefs());
      id = ctx.db.prepare('INSERT INTO users (email, name, pass_hash, prefs, created_at) VALUES (?,?,?,?,?)').run(values.email, values.name, hash, prefs, now()).lastInsertRowid;
    } catch (e) {
      if (!String(e.message).includes('UNIQUE')) throw e;
      // Deliberately vague. See docs/SECURITY.md "Account enumeration" for the trade-off.
      return registerPage(ctx, { values, errors: { email: 'We could not create an account with those details. If you already have one, sign in instead.' }, status: 422 });
    }
    ctx.rotateSession(Number(id));
    ctx.flash('ok', `Welcome, ${values.name}. Your account is ready.`);
    ctx.redirect('/account');
  });

  // ------------------------------------------------------------------------------------- login
  const loginPage = (ctx, { values = {}, error = '', status = 200, next = '' } = {}) => ctx.page(status, layout(ctx, {
    title: 'Sign in',
    robots: 'noindex',
    main: html`
      ${pageHead({ title: 'Sign in' })}
      <div class="wrap narrow">
        ${error ? errorSummary({ email: error }) : ''}
        <form method="post" action="/login" novalidate class="stack">
          ${csrfField(ctx)}
          <input type="hidden" name="next" value="${next}">
          ${field({ name: 'email', label: 'Email address', type: 'email', value: values.email ?? '', required: true, autocomplete: 'username', maxlength: 254, spellcheck: false })}
          ${field({ name: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'current-password', maxlength: 128 })}
          ${passwordToggle('f-password')}
          <button class="btn btn--big" type="submit">Sign in</button>
        </form>
        <p>New here? <a href="/register">Create an account</a>, or <a href="/shop">carry on without one</a>.</p>
      </div>`,
  }));

  app.get('/login', (ctx) => (ctx.user() ? ctx.redirect('/account') : loginPage(ctx, { next: v.safeNext(ctx.query.get('next') ?? '') })));

  app.post('/login', async (ctx) => {
    const emailIn = ctx.input('email', 254).toLowerCase();
    const next = v.safeNext(ctx.input('next', 200));
    // Two limiters: per source address, and per (address, account) so one person guessing at one account is slowed hard.
    if (!ctx.limit(`login:${ctx.ip}`, 30, 900_000) || !ctx.limit(`login:${ctx.ip}:${emailIn}`, 8, 900_000)) return;
    const password = ctx.form.get('password') ?? '';
    const user = password.length <= 128 ? ctx.db.prepare('SELECT id, pass_hash, prefs FROM users WHERE email = ?').get(emailIn) : null;
    const ok = user ? await verifyPassword(password, user.pass_hash) : await dummyVerify(password);
    if (!user || !ok) return loginPage(ctx, { values: { email: emailIn }, error: 'That email and password do not match. Check both and try again.', status: 401, next });

    const hadPrefs = ctx.cookies.wr_prefs;
    ctx.rotateSession(user.id);
    if (!hadPrefs && user.prefs) ctx.savePrefs(parsePrefs(user.prefs)); // bring saved display settings to this device
    ctx.db.prepare("INSERT INTO audit_log (at, actor, action) VALUES (?,?,'login')").run(now(), `user:${user.id}`);
    ctx.redirect(next || '/account');
  });

  app.post('/logout', (ctx) => {
    ctx.endSession(); // also deletes the cart: safe on shared computers
    ctx.flash('ok', 'You are signed out.');
    ctx.redirect('/');
  });

  // ------------------------------------------------------------------------------------- account
  const needUser = (ctx) => {
    const u = ctx.user();
    if (!u) { ctx.redirect('/login?next=/account'); return null; }
    return u;
  };

  const accountPage = (ctx, { values, errors = {}, status = 200 } = {}) => {
    const u = ctx.user();
    const val = values ?? { name: u.name, phone: u.phone, comm_pref: u.comm_pref, delivery_notes: u.delivery_notes };
    const orders = ctx.db.prepare('SELECT number, status, total_cents, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(u.id);
    ctx.page(status, layout(ctx, {
      title: 'My account',
      robots: 'noindex',
      main: html`
      ${pageHead({ title: 'My account', lede: `Signed in as ${u.email}` })}
      <div class="wrap account">
        <section aria-labelledby="orders-h">
          <h2 id="orders-h">Your orders</h2>
          ${orders.length ? html`<ul class="order-list">${orders.map((o) => html`<li>
            <a href="/order/${o.number}">Order ${o.number}</a>
            <span>${new Date(o.created_at * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span>${money(o.total_cents)}</span>
            <span class="badge">${o.status}</span>
          </li>`)}</ul>` : html`<p>No orders yet. <a href="/shop">Browse the shop</a>.</p>`}
        </section>

        <section aria-labelledby="prof-h">
          <h2 id="prof-h">Delivery and contact defaults</h2>
          <p class="hint">We fill these in at checkout so you do not have to type them each time.</p>
          ${errorSummary(errors)}
          <form method="post" action="/account" novalidate class="stack">
            ${csrfField(ctx)}
            ${field({ name: 'name', label: 'Your name', value: val.name, error: errors.name, required: true, autocomplete: 'name', maxlength: 80 })}
            ${field({ name: 'phone', label: 'Mobile or phone number', type: 'tel', value: val.phone, error: errors.phone, autocomplete: 'tel', optional: true, inputmode: 'tel', maxlength: 25, hint: 'Only needed if you choose text messages or calls below.' })}
            ${radios({ name: 'comm_pref', legend: 'How should we contact you about orders?', options: COMM_PREFS, value: val.comm_pref, error: errors.comm_pref })}
            ${field({ name: 'delivery_notes', label: 'Delivery notes', type: 'textarea', value: val.delivery_notes, error: errors.delivery_notes, optional: true, maxlength: 500, rows: 4, hint: 'For example: “Please leave the parcel inside the porch”, or “I am deaf, so knock loudly and wave at the window.”' })}
            <button class="btn" type="submit">Save changes</button>
          </form>
        </section>

        <section aria-labelledby="disp-h">
          <h2 id="disp-h">Display settings</h2>
          <p>Text size, colours, spacing and motion are saved to your account so they follow you to other devices.</p>
          <p><a class="btn btn--ghost" href="/display">Change display settings</a></p>
        </section>

        <section aria-labelledby="data-h">
          <h2 id="data-h">Your data</h2>
          <p><a class="btn btn--ghost" href="/account/export">Download everything we hold about you (JSON)</a></p>
          <details class="danger-zone" ${errors.password ? raw('open') : ''}>
            <summary>Delete my account</summary>
            <p>This removes your account, saved details and display settings. Past orders are kept for tax records with your name, contact details and address removed. You cannot delete while an order is on its way.</p>
            <form method="post" action="/account/delete" class="stack">
              ${csrfField(ctx)}
              ${field({ name: 'password', label: 'Confirm with your password', type: 'password', autocomplete: 'current-password', required: true, maxlength: 128, error: errors.password })}
              <button class="btn btn--danger" type="submit">Delete my account for good</button>
            </form>
          </details>
        </section>

        <form method="post" action="/logout">${csrfField(ctx)}<button class="btn btn--ghost" type="submit">Sign out</button></form>
      </div>`,
    }));
  };

  app.get('/account', (ctx) => { if (needUser(ctx)) accountPage(ctx); });

  app.post('/account', (ctx) => {
    const u = needUser(ctx); if (!u) return;
    const values = { name: ctx.input('name', 80), phone: ctx.input('phone', 25), comm_pref: ctx.input('comm_pref', 10), delivery_notes: ctx.input('delivery_notes', 500) };
    const errors = v.collect([
      ['name', v.required(values.name, 'your name', 80)],
      ['phone', v.phone(values.phone, { required: ['sms', 'phone'].includes(values.comm_pref) })],
      ['comm_pref', v.oneOf(values.comm_pref, COMM_PREFS.map((c) => c.id), 'how we should contact you')],
    ]);
    if (Object.keys(errors).length) return accountPage(ctx, { values, errors, status: 422 });
    ctx.db.prepare('UPDATE users SET name = ?, phone = ?, comm_pref = ?, delivery_notes = ? WHERE id = ?').run(values.name, values.phone, values.comm_pref, values.delivery_notes, u.id);
    ctx.flash('ok', 'Your details are saved.');
    ctx.redirect('/account');
  });

  app.get('/account/export', (ctx) => {
    const u = needUser(ctx); if (!u) return;
    const orders = ctx.db.prepare('SELECT * FROM orders WHERE user_id = ?').all(u.id).map(({ token_hash, ...o }) => ({ ...o, items: ctx.db.prepare('SELECT name, price_cents, qty FROM order_items WHERE order_id = ?').all(o.id) }));
    ctx.json(200, { exported_at: new Date().toISOString(), account: u, orders }, { 'Content-Disposition': 'attachment; filename="my-within-reach-data.json"' });
  });

  app.post('/account/delete', async (ctx) => {
    if (!ctx.limit(`del:${ctx.ip}`, 5, 900_000)) return;
    const u = needUser(ctx); if (!u) return;
    const row = ctx.db.prepare('SELECT pass_hash FROM users WHERE id = ?').get(u.id);
    const ok = await verifyPassword(ctx.form.get('password') ?? '', row.pass_hash);
    if (!ok) return accountPage(ctx, { errors: { password: 'That password is not right.' }, status: 403 });
    const open = ctx.db.prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id = ? AND status IN ('received','packing','shipped')").get(u.id).n;
    if (open) { ctx.flash('error', 'You have an order that is not delivered yet. Please wait until it arrives, or contact us to delete sooner.'); return ctx.redirect('/account'); }
    ctx.db.prepare("UPDATE orders SET name='Deleted customer', email='', phone='', line1='[removed]', line2='', city='', postal='', delivery_notes='', user_id=NULL WHERE user_id = ?").run(u.id);
    ctx.db.prepare('DELETE FROM users WHERE id = ?').run(u.id); // sessions cascade
    ctx.endSession();
    ctx.flash('ok', 'Your account has been deleted.');
    ctx.redirect('/');
  });

  // ------------------------------------------------------------------------------------- display settings
  const displayPage = (ctx) => {
    const p = ctx.prefs();
    ctx.page(200, layout(ctx, {
      title: 'Display settings',
      description: 'Change text size, colours, spacing and motion.',
      main: html`
      ${pageHead({ title: 'Display settings', lede: 'Make this site comfortable for your eyes and brain. Changes show straight away, and you can save them to keep them.' })}
      <div class="wrap display">
        <form method="post" action="/display" class="stack" data-prefs-form>
          ${csrfField(ctx)}
          ${Object.entries(PREF_OPTIONS).map(([key, options]) => radios({
            name: key, legend: PREF_LABELS[key], value: p[key],
            options: options.map(([id, label]) => ({ id, label })),
          }))}
          <div class="btn-row">
            <button class="btn btn--big" type="submit">Save my settings</button>
            <button class="btn btn--ghost" type="submit" name="reset" value="1">Back to standard</button>
          </div>
          <p class="hint">Saved on this device${ctx.user() ? ' and on your account' : ''}. ${ctx.user() ? '' : html`<a href="/register">Create an account</a> to have them follow you to other devices.`}</p>
        </form>
        <aside class="preview" aria-labelledby="pv-h">
          <h2 id="pv-h">Preview</h2>
          <p>Here is a sentence to read, so you can check the size and spacing feel right. Adaptive tools should fit the person, not the other way round.</p>
          <p><a href="/shop">This is what a link looks like</a> <button type="button" class="btn btn--small">and a button</button></p>
        </aside>
      </div>`,
    }));
  };

  app.get('/display', displayPage);

  app.post('/display', (ctx) => {
    let prefs;
    if (ctx.has('reset')) prefs = parsePrefs('');
    else {
      const q = new URLSearchParams();
      for (const key of Object.keys(PREF_OPTIONS)) q.set(key, ctx.input(key, 20));
      prefs = parsePrefs(q.toString());
    }
    ctx.savePrefs(prefs);
    const u = ctx.user();
    if (u) ctx.db.prepare('UPDATE users SET prefs = ? WHERE id = ?').run(serializePrefs(prefs), u.id);
    ctx.flash('ok', ctx.has('reset') ? 'Display settings are back to standard.' : 'Your display settings are saved.');
    ctx.redirect('/display');
  });
}
