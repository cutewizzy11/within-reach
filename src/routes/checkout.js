import { html, raw } from '../lib/html.js';
import { layout, pageHead } from '../views/layout.js';
import { field, select, radios, checkbox, csrfField, errorSummary, money } from '../views/ui.js';
import { summaryRows, steps } from './shop.js';
import { COMM_PREFS, COUNTRIES, STATUS_COPY } from '../catalog.js';
import { cartLines, totals } from '../models.js';
import { getPaymentProvider } from '../payments.js';
import { randomToken, sha256, serializeCookie } from '../lib/security.js';
import * as v from '../lib/validate.js';
import { tx, now } from '../db.js';

const orderNumber = () => `WR-${new Date().getFullYear()}-${randomToken(5).replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase()}`;

function checkoutValues(ctx) {
  const u = ctx.user();
  return {
    email: u?.email ?? '', name: u?.name ?? '', phone: u?.phone ?? '',
    line1: '', line2: '', city: '', region: '', postal: '', country: 'US',
    comm_pref: u?.comm_pref ?? 'email', delivery_notes: u?.delivery_notes ?? '',
    easy_open: false, leave_in_reach: false, payment_method: 'demo',
  };
}

export function checkoutRoutes(app) {
  const provider = getPaymentProvider(app.config);

  const checkoutPage = (ctx, { values, errors = {}, status = 200 } = {}) => {
    const s = ctx.session();
    const lines = s ? cartLines(ctx.db, s.id_hash) : [];
    if (!lines.length) return ctx.redirect('/cart');
    const t = totals(lines, ctx.config);
    const val = values ?? checkoutValues(ctx);
    ctx.page(status, layout(ctx, {
      title: 'Checkout',
      robots: 'noindex',
      main: html`
      ${pageHead({ title: 'Checkout' })}
      <div class="wrap">${steps(2)}</div>
      <div class="wrap checkout">
        ${errorSummary(errors)}
        <form method="post" action="/checkout" novalidate class="checkout__form stack">
          ${csrfField(ctx)}
          <fieldset class="group">
            <legend>Contact</legend>
            ${field({ name: 'email', label: 'Email address', type: 'email', value: val.email, error: errors.email, required: true, autocomplete: 'email', maxlength: 254, hint: 'We send your order confirmation here.' })}
            ${field({ name: 'phone', label: 'Phone number', type: 'tel', value: val.phone, error: errors.phone, autocomplete: 'tel', inputmode: 'tel', maxlength: 25, optional: true })}
            ${radios({ name: 'comm_pref', legend: 'How should we contact you if there is a problem with your order?', options: COMM_PREFS, value: val.comm_pref, error: errors.comm_pref })}
          </fieldset>

          <fieldset class="group">
            <legend>Delivery address</legend>
            ${field({ name: 'name', label: 'Full name', value: val.name, error: errors.name, required: true, autocomplete: 'name', maxlength: 80 })}
            ${field({ name: 'line1', label: 'Address line 1', value: val.line1, error: errors.line1, required: true, autocomplete: 'address-line1', maxlength: 120 })}
            ${field({ name: 'line2', label: 'Address line 2', value: val.line2, error: errors.line2, optional: true, autocomplete: 'address-line2', maxlength: 120 })}
            ${field({ name: 'city', label: 'Town or city', value: val.city, error: errors.city, required: true, autocomplete: 'address-level2', maxlength: 80 })}
            ${field({ name: 'region', label: 'State, county or region', value: val.region, error: errors.region, required: true, autocomplete: 'address-level1', maxlength: 80 })}
            ${field({ name: 'postal', label: 'Postal code', value: val.postal, error: errors.postal, required: true, autocomplete: 'postal-code', maxlength: 20 })}
            ${select({ name: 'country', label: 'Country', options: COUNTRIES, value: val.country, error: errors.country, autocomplete: 'country', required: true })}
          </fieldset>

          <fieldset class="group">
            <legend>Delivery preferences</legend>
            ${checkbox({ name: 'easy_open', label: 'Please use easy-open packaging', help: 'No tape that needs cutting, and a pull tab where possible.', checked: !!val.easy_open })}
            ${checkbox({ name: 'leave_in_reach', label: 'Leave the parcel somewhere I can reach it, do not ring the bell', help: 'Good if reaching the door or hearing the bell is hard.', checked: !!val.leave_in_reach })}
            ${field({ name: 'delivery_notes', label: 'Anything else the courier should know', type: 'textarea', value: val.delivery_notes, error: errors.delivery_notes, optional: true, maxlength: 500, rows: 3 })}
          </fieldset>

          <fieldset class="group">
            <legend>Payment</legend>
            ${radios({ name: 'payment_method', legend: 'Choose how to pay', options: provider.methods, value: val.payment_method, error: errors.payment_method })}
            <p class="hint">This is a demonstration store. No real payment is taken and no card details are ever asked for.</p>
          </fieldset>

          <button class="btn btn--buy btn--big" type="submit">Place order — ${money(t.total, ctx.config.currency)}</button>
        </form>

        <aside class="summary" aria-labelledby="sum-h">
          <h2 id="sum-h">Order summary</h2>
          <ul class="summary-lines">${lines.map((l) => html`<li><span>${l.name} × ${l.qty}</span><span>${money(l.lineCents)}</span></li>`)}</ul>
          ${summaryRows(t, ctx.config)}
          <p><a href="/cart">Edit cart</a></p>
        </aside>
      </div>`,
    }));
  };

  app.get('/checkout', checkoutPage);

  app.post('/checkout', (ctx) => {
    if (!ctx.limit(`checkout:${ctx.ip}`, 20, 900_000)) return;
    const s = ctx.session();
    const lines = s ? cartLines(ctx.db, s.id_hash) : [];
    if (!lines.length) return ctx.redirect('/cart');

    const values = {
      email: ctx.input('email', 254).toLowerCase(), name: ctx.input('name', 80), phone: ctx.input('phone', 25),
      line1: ctx.input('line1', 120), line2: ctx.input('line2', 120), city: ctx.input('city', 80),
      region: ctx.input('region', 80), postal: ctx.input('postal', 20), country: ctx.input('country', 2).toUpperCase(),
      comm_pref: ctx.input('comm_pref', 10), delivery_notes: ctx.input('delivery_notes', 500),
      easy_open: ctx.has('easy_open'), leave_in_reach: ctx.has('leave_in_reach'),
      payment_method: ctx.input('payment_method', 20),
    };
    const errors = v.collect([
      ['email', v.email(values.email)],
      ['name', v.required(values.name, 'your full name', 80)],
      ['line1', v.required(values.line1, 'your address', 120)],
      ['city', v.required(values.city, 'your town or city', 80)],
      ['region', v.required(values.region, 'your state, county or region', 80)],
      ['postal', v.required(values.postal, 'your postal code', 20)],
      ['country', v.oneOf(values.country, COUNTRIES.map((c) => c[0]), 'your country')],
      ['comm_pref', v.oneOf(values.comm_pref, COMM_PREFS.map((c) => c.id), 'how we should contact you')],
      ['phone', v.phone(values.phone, { required: ['sms', 'phone'].includes(values.comm_pref) })],
      ['payment_method', v.oneOf(values.payment_method, provider.methods.map((m) => m.id), 'how to pay')],
    ]);
    if (Object.keys(errors).length) return checkoutPage(ctx, { values, errors, status: 422 });

    // Re-read stock and prices inside the write lock, right before committing, so two shoppers cannot both buy the last unit.
    let order;
    try {
      order = tx(ctx.db, () => {
        const fresh = cartLines(ctx.db, s.id_hash);
        if (!fresh.length) throw new CheckoutFailure('Your cart is empty.');
        for (const l of fresh) {
          if (l.qty > l.stock) throw new CheckoutFailure(`Sorry, ${l.name} only has ${l.stock} left in stock. Please update your cart.`);
        }
        const t = totals(fresh, ctx.config);
        const number = orderNumber();
        const token = randomToken(20);
        const user = ctx.user();
        const orderId = ctx.db.prepare(`INSERT INTO orders
          (number, token_hash, user_id, email, name, phone, line1, line2, city, region, postal, country, comm_pref, delivery_notes, easy_open, leave_in_reach, payment_method, subtotal_cents, shipping_cents, tax_cents, total_cents, created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
          number, sha256(token), user?.id ?? null, values.email, values.name, values.phone, values.line1, values.line2, values.city, values.region, values.postal, values.country,
          values.comm_pref, values.delivery_notes, values.easy_open ? 1 : 0, values.leave_in_reach ? 1 : 0, values.payment_method,
          t.subtotal, t.shipping, t.tax, t.total, now(),
        ).lastInsertRowid;
        for (const l of fresh) {
          ctx.db.prepare('INSERT INTO order_items (order_id, product_id, name, price_cents, qty) VALUES (?,?,?,?,?)').run(orderId, l.id, l.name, l.price_cents, l.qty);
          ctx.db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(l.qty, l.id);
        }
        ctx.db.prepare('DELETE FROM cart_items WHERE session_hash = ?').run(s.id_hash);
        return { id: orderId, number, token };
      });
    } catch (e) {
      if (e instanceof CheckoutFailure) { ctx.flash('error', e.message); return ctx.redirect('/cart'); }
      throw e;
    }

    // A per-order token cookie lets a guest (no account) view their order confirmation later.
    ctx.setCookies.push(serializeCookie(`wr_ord_${order.number}`, order.token, { maxAge: 30 * 86400, httpOnly: true, secure: ctx.config.cookieSecure, sameSite: 'Lax' }));
    ctx.flash('ok', 'Thank you. Your order is confirmed.');
    ctx.redirect(`/order/${order.number}`);
  });

  class CheckoutFailure extends Error {}

  // ------------------------------------------------------------------------------------- order status
  app.get('/order/:number', (ctx) => {
    const order = ctx.db.prepare('SELECT * FROM orders WHERE number = ?').get(ctx.params.number);
    if (!order) return ctx.page(404, app.renderError(ctx, 404, 'We could not find that order.'));
    const user = ctx.user();
    const ownsAsUser = user && order.user_id === user.id;
    const guestToken = ctx.cookies[`wr_ord_${order.number}`];
    const ownsAsGuest = guestToken && sha256(guestToken) === order.token_hash;
    if (!ownsAsUser && !ownsAsGuest) return ctx.page(404, app.renderError(ctx, 404, 'We could not find that order.'));

    const items = ctx.db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    ctx.page(200, layout(ctx, {
      title: `Order ${order.number}`,
      robots: 'noindex',
      main: html`
      ${pageHead({ title: `Order ${order.number}`, lede: STATUS_COPY[order.status] })}
      <div class="wrap">${steps(3)}</div>
      <div class="wrap order">
        <ol class="progress" aria-label="Order progress">
          ${['received', 'packing', 'shipped', 'delivered'].map((st, i, arr) => {
            const idx = arr.indexOf(order.status);
            const state = order.status === 'cancelled' ? '' : i <= idx ? 'progress__step--done' : '';
            return html`<li class="progress__step ${state}"><span class="progress__dot" aria-hidden="true"></span>${st[0].toUpperCase()}${st.slice(1)}</li>`;
          })}
        </ol>
        ${order.status === 'cancelled' ? html`<p class="badge badge--out">Cancelled</p>` : ''}

        <section aria-labelledby="items-h">
          <h2 id="items-h">Items</h2>
          <ul class="summary-lines">${items.map((it) => html`<li><span>${it.name} × ${it.qty}</span><span>${money(it.price_cents * it.qty)}</span></li>`)}</ul>
          <dl class="totals">
            <div><dt>Items</dt><dd>${money(order.subtotal_cents)}</dd></div>
            <div><dt>Delivery</dt><dd>${order.shipping_cents === 0 ? 'Free' : money(order.shipping_cents)}</dd></div>
            ${order.tax_cents > 0 ? html`<div><dt>Tax</dt><dd>${money(order.tax_cents)}</dd></div>` : ''}
            <div class="totals__grand"><dt>Total</dt><dd>${money(order.total_cents)}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="del-h">
          <h2 id="del-h">Delivery to</h2>
          <p>${order.name}<br>${order.line1}${order.line2 ? html`<br>${order.line2}` : ''}<br>${order.city}, ${order.region} ${order.postal}<br>${order.country}</p>
          ${order.easy_open ? html`<p>✓ Easy-open packaging requested</p>` : ''}
          ${order.leave_in_reach ? html`<p>✓ Leave in reach, do not ring bell</p>` : ''}
        </section>

        <p><a class="btn btn--ghost" href="/shop">Continue shopping</a> <a class="btn btn--ghost" href="/help">Need help with this order?</a></p>
      </div>`,
    }));
  });
}
