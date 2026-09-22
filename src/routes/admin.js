import { html, raw } from '../lib/html.js';
import { layout, pageHead } from '../views/layout.js';
import { csrfField, money, select, field, errorSummary } from '../views/ui.js';
import { ORDER_STATUSES } from '../catalog.js';
import { HttpError } from '../lib/app.js';
import { now } from '../db.js';

function requireAdmin(ctx) {
  const u = ctx.user();
  if (!u) { ctx.redirect('/login?next=/admin'); return null; }
  if (u.role !== 'admin') throw new HttpError(404, 'Page not found.'); // 404, not 403: do not reveal the area exists
  return u;
}

export function adminRoutes(app) {
  app.get('/admin', (ctx) => {
    const u = requireAdmin(ctx); if (!u) return;
    const orders = ctx.db.prepare('SELECT number, name, status, total_cents, created_at FROM orders ORDER BY created_at DESC LIMIT 50').all();
    const lowStock = ctx.db.prepare('SELECT slug, name, stock FROM products WHERE stock <= 5 ORDER BY stock ASC').all();
    ctx.page(200, layout(ctx, {
      title: 'Admin',
      robots: 'noindex',
      main: html`
      ${pageHead({ title: 'Admin', lede: `Signed in as ${u.email}` })}
      <div class="wrap admin">
        <section aria-labelledby="low-h">
          <h2 id="low-h">Low stock</h2>
          ${lowStock.length ? html`<ul class="plain">${lowStock.map((p) => html`<li><a href="/admin/product/${p.slug}">${p.name}</a> — ${p.stock} left</li>`)}</ul>` : html`<p>Nothing is low on stock.</p>`}
        </section>
        <section aria-labelledby="orders-h">
          <h2 id="orders-h">Recent orders</h2>
          <table class="admin-table">
            <caption class="sr-only">Recent orders</caption>
            <thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Status</th><th scope="col">Total</th><th scope="col">Placed</th></tr></thead>
            <tbody>${orders.map((o) => html`<tr>
              <td><a href="/admin/order/${o.number}">${o.number}</a></td>
              <td>${o.name}</td>
              <td>${o.status}</td>
              <td>${money(o.total_cents)}</td>
              <td>${new Date(o.created_at * 1000).toLocaleDateString('en-GB')}</td>
            </tr>`)}</tbody>
          </table>
        </section>
      </div>`,
    }));
  });

  app.get('/admin/order/:number', (ctx) => {
    const u = requireAdmin(ctx); if (!u) return;
    const order = ctx.db.prepare('SELECT * FROM orders WHERE number = ?').get(ctx.params.number);
    if (!order) throw new HttpError(404, 'Order not found.');
    const items = ctx.db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    ctx.page(200, layout(ctx, {
      title: `Admin · Order ${order.number}`,
      robots: 'noindex',
      main: html`
      ${pageHead({ title: `Order ${order.number}`, crumbs: [['/admin', 'Admin'], [null, order.number]] })}
      <div class="wrap admin narrow">
        <p>${order.name} · ${order.email}${order.phone ? html` · ${order.phone}` : ''}</p>
        <p>${order.line1}${order.line2 ? html`, ${order.line2}` : ''}, ${order.city}, ${order.region} ${order.postal}, ${order.country}</p>
        ${order.delivery_notes ? html`<p><strong>Delivery notes:</strong> ${order.delivery_notes}</p>` : ''}
        <ul class="summary-lines">${items.map((it) => html`<li><span>${it.name} × ${it.qty}</span><span>${money(it.price_cents * it.qty)}</span></li>`)}</ul>
        <p><strong>Total: ${money(order.total_cents)}</strong></p>
        <form method="post" action="/admin/order/${order.number}/status" class="field field--inline">
          ${csrfField(ctx)}
          ${select({ name: 'status', label: 'Status', options: ORDER_STATUSES.map((s) => [s, s]), value: order.status })}
          <button class="btn" type="submit">Update status</button>
        </form>
      </div>`,
    }));
  });

  app.post('/admin/order/:number/status', (ctx) => {
    const u = requireAdmin(ctx); if (!u) return;
    const order = ctx.db.prepare('SELECT id FROM orders WHERE number = ?').get(ctx.params.number);
    if (!order) throw new HttpError(404, 'Order not found.');
    const status = ctx.input('status', 20);
    if (!ORDER_STATUSES.includes(status)) throw new HttpError(400, 'Not a valid status.');
    ctx.db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, order.id);
    ctx.db.prepare("INSERT INTO audit_log (at, actor, action, detail) VALUES (?,?,'order_status',?)").run(now(), `user:${u.id}`, `${ctx.params.number} -> ${status}`);
    ctx.flash('ok', `Order ${ctx.params.number} marked as ${status}.`);
    ctx.redirect(`/admin/order/${ctx.params.number}`);
  });

  app.get('/admin/product/:slug', (ctx) => {
    const u = requireAdmin(ctx); if (!u) return;
    const p = ctx.db.prepare('SELECT * FROM products WHERE slug = ?').get(ctx.params.slug);
    if (!p) throw new HttpError(404, 'Product not found.');
    ctx.page(200, layout(ctx, {
      title: `Admin · ${p.name}`,
      robots: 'noindex',
      main: html`
      ${pageHead({ title: p.name, crumbs: [['/admin', 'Admin'], [null, p.name]] })}
      <div class="wrap admin narrow">
        <form method="post" action="/admin/product/${p.slug}/stock" class="field field--inline">
          ${csrfField(ctx)}
          ${field({ name: 'stock', label: 'Stock on hand', type: 'number', value: p.stock, min: 0, max: 100000, inputmode: 'numeric' })}
          <button class="btn" type="submit">Update stock</button>
        </form>
      </div>`,
    }));
  });

  app.post('/admin/product/:slug/stock', (ctx) => {
    const u = requireAdmin(ctx); if (!u) return;
    const p = ctx.db.prepare('SELECT id FROM products WHERE slug = ?').get(ctx.params.slug);
    if (!p) throw new HttpError(404, 'Product not found.');
    const stock = Number.parseInt(ctx.input('stock', 8), 10);
    if (!Number.isInteger(stock) || stock < 0 || stock > 100000) throw new HttpError(400, 'Stock must be a whole number.');
    ctx.db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(stock, p.id);
    ctx.flash('ok', 'Stock updated.');
    ctx.redirect(`/admin/product/${ctx.params.slug}`);
  });
}
