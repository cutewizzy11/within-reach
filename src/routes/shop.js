import { html, raw } from '../lib/html.js';
import { layout, pageHead, CAT_GLYPH } from '../views/layout.js';
import { glyph } from '../views/glyphs.js';
import { money, csrfField, productCard, plate, traitList, stockNote } from '../views/ui.js';
import { NEEDS, CATEGORIES, TRAITS, SORTS, NEED_BY_ID, CATEGORY_BY_ID } from '../catalog.js';
import { parseFilters, listProducts, getProduct, cartLines, totals } from '../models.js';
import { safeNext } from '../lib/validate.js';

const TONES = ['sun', 'sky', 'rose', 'persimmon', 'sage', 'forest'];

/** Checkout progress indicator. `current` is 1 (cart), 2 (details and payment) or 3 (confirmation). */
export function steps(current) {
  const labels = ['Cart', 'Details and payment', 'Confirmation'];
  return html`<ol class="steps" aria-label="Checkout progress">${labels.map((l, i) => html`<li class="${i + 1 < current ? 'done' : ''}" ${i + 1 === current ? raw('aria-current="step"') : ''}><span class="steps__n" aria-hidden="true">${i + 1 < current ? '✓' : i + 1}</span>${l}${i + 1 < current ? html`<span class="sr-only"> (done)</span>` : ''}</li>`)}</ol>`;
}

/** Rebuilds the shop URL from filters, leaving out one value (used for removable filter chips). */
function shopUrl(f, drop = {}) {
  const u = new URLSearchParams();
  if (f.q && drop.kind !== 'q') u.set('q', f.q);
  if (f.cat && drop.kind !== 'cat') u.set('cat', f.cat);
  for (const n of f.needs) if (!(drop.kind === 'need' && drop.value === n)) u.append('need', n);
  for (const t of f.traits) if (!(drop.kind === 'trait' && drop.value === t)) u.append('trait', t);
  if (f.sort !== 'featured') u.set('sort', f.sort);
  const s = u.toString();
  return s ? `/shop?${s}` : '/shop';
}

export function shopRoutes(app) {
  // ------------------------------------------------------------------------------------- home
  app.get('/', (ctx) => {
    const all = listProducts(ctx.db);
    const featured = all.filter((p) => p.featured).slice(0, 8);
    const more = all.filter((p) => !p.featured).slice(0, 4);
    const sample = all.find((p) => p.slug === 'rocker-knife') ?? all[0];
    const freeOver = money(ctx.config.freeShippingOverCents, ctx.config.currency).replace('.00', '');
    ctx.page(200, layout(ctx, {
      title: 'Everyday things that fit you',
      description: 'An online shop for adaptive and assistive products, described by how they work for your body.',
      main: html`
      <div class="wrap home-top">
        <section class="banner" aria-labelledby="hero-h">
          <p class="eyebrow">Adaptive products, honestly described</p>
          <h1 id="hero-h">Everyday things that fit you</h1>
          <p>Every product has an <strong>Access Facts</strong> label: hands needed, effort, setup time and what senses it depends on. You know it will work for your body before you buy.</p>
          <p class="btn-row"><a class="btn btn--buy btn--big" href="/shop">Shop all ${all.length} products</a><a class="btn btn--ghost btn--big" href="#needs">Find what helps</a></p>
        </section>
        <div class="side-tiles">
          <a class="side-tile side-tile--accent" href="/help"><strong>Free delivery over ${freeOver}</strong><span>${ctx.config.returnDays}-day returns, and we pay the postage.</span></a>
          <a class="side-tile" href="/display"><strong>Make this site fit you</strong><span>Text size, contrast, spacing, motion and a calm mode.</span></a>
        </div>
      </div>

      <div class="wrap">
        <section class="section" aria-labelledby="cats-h">
          <div class="section__head"><h2 id="cats-h">Shop by category</h2></div>
          <ul class="cat-tiles">
            ${CATEGORIES.map((c, i) => html`<li><a class="cat-tile tone-${TONES[i % TONES.length]}" href="/shop?cat=${c.id}"><span class="cat-tile__icon">${glyph(CAT_GLYPH[c.id] ?? 'button', { size: 34, width: 5 })}</span>${c.label}</a></li>`)}
          </ul>
        </section>

        <section class="section" aria-labelledby="picks-h">
          <div class="section__head"><h2 id="picks-h">Editor's picks</h2><a class="section__more" href="/shop">See all products</a></div>
          <ul class="grid">${featured.map((p) => productCard(ctx, p, 3))}</ul>
        </section>

        <section class="section" id="needs" aria-labelledby="need-h">
          <div class="section__head"><h2 id="need-h">Shop by what is hard</h2></div>
          <ul class="need-grid">
            ${NEEDS.map((n) => html`<li><a class="need tone-${n.tone}" href="/shop?need=${n.id}">
              ${glyph(n.glyph, { size: 44, cls: 'need__glyph', width: 5 })}
              <span class="need__label">${n.label}</span>
              <span class="need__blurb">${n.blurb}</span>
              <span class="need__arrow" aria-hidden="true">Shop ${n.short.toLowerCase()} →</span>
            </a></li>`)}
          </ul>
        </section>

        <section class="section" aria-labelledby="facts-demo-h">
          <div class="panel split">
            <div>
              <p class="eyebrow">What makes us different</p>
              <h2 id="facts-demo-h">A label that says what the product asks of you</h2>
              <p>Most shops list size and colour. We list what matters to your body, in the same order on every product, so you can compare at a glance.</p>
              <p><a class="btn" href="/shop">Browse products</a></p>
            </div>
            ${sample ? factsPanel(sample, { headingLevel: 3, id: 'sample-facts' }) : ''}
          </div>
        </section>

        ${more.length ? html`<section class="section" aria-labelledby="more-h">
          <div class="section__head"><h2 id="more-h">More to explore</h2><a class="section__more" href="/shop">See all products</a></div>
          <ul class="grid">${more.map((p) => productCard(ctx, p, 3))}</ul>
        </section>` : ''}

        <ul class="trust">
          <li>${glyph('truck', { size: 32, cls: 'trust__icon', width: 5 })}<span><strong>Free delivery over ${freeOver}</strong>Easy-open packaging on request.</span></li>
          <li>${glyph('returns', { size: 32, cls: 'trust__icon', width: 5 })}<span><strong>${ctx.config.returnDays}-day returns</strong>Doesn't work for your body? Send it back, we pay.</span></li>
          <li>${glyph('chat', { size: 32, cls: 'trust__icon', width: 5 })}<span><strong>Talk your way</strong>Text, email, phone or relay. Never phone-only.</span></li>
          <li>${glyph('list', { size: 32, cls: 'trust__icon', width: 5 })}<span><strong>No time limits</strong>Your cart and checkout never expire.</span></li>
        </ul>
      </div>`,
    }));
  });

  // ------------------------------------------------------------------------------------- shop
  app.get('/shop', (ctx) => {
    const f = parseFilters(ctx.query);
    const products = listProducts(ctx.db, f);
    const chips = [
      ...f.needs.map((n) => ({ label: NEED_BY_ID.get(n).label, url: shopUrl(f, { kind: 'need', value: n }) })),
      ...(f.cat ? [{ label: CATEGORY_BY_ID.get(f.cat).label, url: shopUrl(f, { kind: 'cat' }) }] : []),
      ...f.traits.map((t) => ({ label: TRAITS.find((x) => x.id === t).label, url: shopUrl(f, { kind: 'trait', value: t }) })),
      ...(f.q ? [{ label: `“${f.q}”`, url: shopUrl(f, { kind: 'q' }) }] : []),
    ];
    const heading = f.cat ? CATEGORY_BY_ID.get(f.cat).label : f.q ? `Results for “${f.q}”` : 'All products';
    ctx.page(200, layout(ctx, {
      title: heading,
      description: 'Browse adaptive and assistive products by what is hard and by how they work.',
      main: html`
      <div class="wrap">
        <div class="page-head"><nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><span aria-current="page">Shop</span></li></ol></nav></div>
        <p class="skip-inline"><a href="#results">Skip to results</a></p>
        <div class="shop">
          <form class="filters-wrap" id="filters-form" action="/shop" method="get" aria-label="Filter products">
            <details class="filters" open data-filters>
              <summary>Filters</summary>
              ${f.q ? html`<input type="hidden" name="q" value="${f.q}">` : ''}
              <fieldset class="choice-group">
                <legend>What is hard?</legend>
                ${NEEDS.map((n) => html`<div class="choice"><input type="checkbox" id="need-${n.id}" name="need" value="${n.id}" ${f.needs.includes(n.id) ? raw('checked') : ''}><label for="need-${n.id}">${n.label}</label></div>`)}
              </fieldset>
              <fieldset class="choice-group">
                <legend>Must have</legend>
                ${TRAITS.map((t) => html`<div class="choice"><input type="checkbox" id="trait-${t.id}" name="trait" value="${t.id}" ${f.traits.includes(t.id) ? raw('checked') : ''} aria-describedby="trait-${t.id}-h"><label for="trait-${t.id}">${t.label}</label><p class="hint" id="trait-${t.id}-h">${t.help}</p></div>`)}
              </fieldset>
              <div class="field">
                <label for="f-cat">Type of product</label>
                <select id="f-cat" name="cat">
                  <option value="">All types</option>
                  ${CATEGORIES.map((c) => html`<option value="${c.id}" ${f.cat === c.id ? raw('selected') : ''}>${c.label}</option>`)}
                </select>
              </div>
              <div class="btn-row">
                <button class="btn" type="submit">Show products</button>
                <a class="btn btn--quiet" href="/shop">Clear all</a>
              </div>
            </details>
          </form>

          <div class="results">
            <div class="toolbar">
              <h1 id="results" tabindex="-1">${heading}<span class="results__for"> · ${products.length} ${products.length === 1 ? 'product' : 'products'}</span></h1>
              <div class="toolbar__sort">
                <div class="field">
                  <label for="f-sort">Sort by</label>
                  <select id="f-sort" name="sort" form="filters-form">${SORTS.map((s) => html`<option value="${s.id}" ${f.sort === s.id ? raw('selected') : ''}>${s.label}</option>`)}</select>
                </div>
                <button class="btn btn--ghost btn--small" type="submit" form="filters-form">Apply</button>
              </div>
            </div>
            ${chips.length ? html`<div class="active-filters" aria-label="Active filters">${chips.map((c) => html`<a class="chip chip--active" href="${c.url}">${c.label}<span aria-hidden="true"> ×</span><span class="sr-only"> (remove filter)</span></a>`)}</div>` : ''}
            ${products.length
              ? html`<ul class="grid grid--shop">${products.map((p) => productCard(ctx, p, 2))}</ul>`
              : html`<div class="empty"><p><strong>Nothing matches all of those.</strong></p><p>Try removing a filter above, or <a href="/shop">clear them all</a>. If you cannot find what you need, <a href="/help">ask us</a>. We can often source it.</p></div>`}
          </div>
        </div>
      </div>`,
    }));
  });

  // ------------------------------------------------------------------------------------- product
  app.get('/product/:slug', (ctx) => {
    const p = getProduct(ctx.db, ctx.params.slug);
    if (!p) return ctx.page(404, app.renderError(ctx, 404, 'We could not find that product. It may have been removed.'));
    const related = listProducts(ctx.db, { cat: p.category, sort: 'featured', limit: 5 }).filter((r) => r.id !== p.id).slice(0, 4);
    const maxQty = Math.max(1, Math.min(p.stock, ctx.config.maxQtyPerLine));
    const cat = CATEGORY_BY_ID.get(p.category);
    const freeOver = money(ctx.config.freeShippingOverCents, ctx.config.currency).replace('.00', '');
    ctx.page(200, layout(ctx, {
      title: p.name,
      description: p.tagline,
      main: html`
      <div class="wrap">
        <div class="page-head"><nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/shop">Shop</a></li><li><a href="/shop?cat=${p.category}">${cat?.label ?? 'Products'}</a></li><li><span aria-current="page">${p.name}</span></li></ol></nav></div>
        <div class="product">
          <div class="product__media">${plate(p)}</div>

          <div class="product__info">
            <a class="product__catlink" href="/shop?cat=${p.category}">${cat?.label ?? ''}</a>
            <h1>${p.name}</h1>
            <p class="product__tagline">${p.tagline}</p>
            ${traitList(p.traits)}
            <section class="easy" aria-labelledby="easy-h">
              <h2 id="easy-h">In plain words</h2>
              <p id="easy-text">${p.easy_read}</p>
              <button type="button" class="btn btn--ghost btn--small" data-speak="#easy-text" hidden>Read this aloud</button>
            </section>
            <section aria-labelledby="about-h">
              <h2 id="about-h">About this product</h2>
              <p>${p.description}</p>
              <h3>Helps with</h3>
              <ul class="chips">${p.needs.map((n) => html`<li><a href="/shop?need=${n}">${NEED_BY_ID.get(n)?.label ?? n}</a></li>`)}</ul>
            </section>
          </div>

          <aside class="product__buy" aria-labelledby="buy-h">
            <div class="buybox">
              <h2 id="buy-h" class="sr-only">Buy ${p.name}</h2>
              <p class="price price--big">${money(p.price_cents)}</p>
              ${stockNote(p)}
              ${p.stock > 0 ? html`<form action="/cart/add" method="post" class="buy-form">
                ${csrfField(ctx)}
                <input type="hidden" name="product" value="${p.id}">
                <div class="field field--inline">
                  <label for="f-qty">Quantity</label>
                  <input id="f-qty" name="qty" type="number" value="1" min="1" max="${maxQty}" inputmode="numeric" autocomplete="off">
                </div>
                <button class="btn btn--buy btn--big btn--block" type="submit">Add to cart</button>
              </form>` : ''}
              <ul class="buybox__list">
                <li>${glyph('truck', { size: 20, width: 6 })}<span>Free delivery over ${freeOver}. Easy-open packaging on request.</span></li>
                <li>${glyph('returns', { size: 20, width: 6 })}<span>${ctx.config.returnDays}-day returns. If it does not work for your body, we pay the postage.</span></li>
                <li>${glyph('chat', { size: 20, width: 6 })}<span>Questions? Text, email or phone. <a href="/help">Get help</a>.</span></li>
              </ul>
            </div>
          </aside>
        </div>

        <div class="product__lower">
          ${factsPanel(p, { headingLevel: 2, id: 'facts' })}
        </div>

        ${related.length ? html`<section class="section" aria-labelledby="rel-h"><div class="section__head"><h2 id="rel-h">More in ${cat?.label}</h2><a class="section__more" href="/shop?cat=${p.category}">See all</a></div><ul class="grid">${related.map((r) => productCard(ctx, r, 3))}</ul></section>` : ''}
      </div>`,
    }));
  });

  // ------------------------------------------------------------------------------------- cart
  app.get('/cart', (ctx) => {
    const s = ctx.session();
    const lines = s ? cartLines(ctx.db, s.id_hash) : [];
    const t = totals(lines, ctx.config);
    const remaining = Math.max(0, ctx.config.freeShippingOverCents - t.subtotal);
    const pct = Math.min(100, Math.round((t.subtotal / ctx.config.freeShippingOverCents) * 100));
    ctx.page(200, layout(ctx, {
      title: 'Your cart',
      robots: 'noindex',
      main: html`
      <div class="wrap">
        <div class="page-head"><h1>Your cart</h1></div>
        ${lines.length ? steps(1) : ''}
        <div class="cart">
          ${lines.length ? html`
            <ul class="cart-lines">
              ${lines.map((l) => html`<li class="cart-line">
                ${plate(l)}
                <div class="cart-line__info">
                  <h2 class="cart-line__name"><a href="/product/${l.slug}">${l.name}</a></h2>
                  <p class="price">${money(l.price_cents)} each</p>
                  <p class="cart-line__total">Line total: <strong>${money(l.lineCents)}</strong></p>
                </div>
                <div class="cart-line__actions">
                  <form action="/cart/update" method="post" class="qty-form">
                    ${csrfField(ctx)}
                    <input type="hidden" name="product" value="${l.id}">
                    <div class="field field--inline">
                      <label for="qty-${l.id}">Quantity <span class="sr-only">of ${l.name}</span></label>
                      <input id="qty-${l.id}" name="qty" type="number" min="0" max="${Math.max(1, Math.min(l.stock, ctx.config.maxQtyPerLine))}" value="${l.qty}" inputmode="numeric" autocomplete="off">
                    </div>
                    <button class="btn btn--ghost btn--small" type="submit">Update<span class="sr-only"> quantity of ${l.name}</span></button>
                  </form>
                  <form action="/cart/remove" method="post">
                    ${csrfField(ctx)}
                    <input type="hidden" name="product" value="${l.id}">
                    <button class="btn btn--quiet btn--small" type="submit">Remove<span class="sr-only"> ${l.name} from cart</span></button>
                  </form>
                </div>
              </li>`)}
            </ul>
            <aside class="summary" aria-labelledby="sum-h">
              <h2 id="sum-h">Order summary</h2>
              <div class="ship-meter">
                <progress class="ship-meter__bar" max="100" value="${pct}" aria-label="Progress to free delivery">${pct}%</progress>
                <p>${remaining === 0 ? html`<strong>You have free delivery.</strong>` : html`Add <strong>${money(remaining, ctx.config.currency)}</strong> more for free delivery.`}</p>
              </div>
              ${summaryRows(t, ctx.config)}
              <a class="btn btn--buy btn--big btn--block" href="/checkout">Go to checkout</a>
              <p class="fineprint">You do not need an account to check out.</p>
            </aside>`
          : html`<div class="empty"><p><strong>Your cart is empty.</strong></p><p><a class="btn" href="/shop">Browse the shop</a></p></div>`}
        </div>
      </div>`,
    }));
  });

  const readProduct = (ctx) => {
    const id = Number.parseInt(ctx.input('product', 12), 10);
    return Number.isInteger(id) ? ctx.db.prepare('SELECT * FROM products WHERE id = ?').get(id) : null;
  };
  const readQty = (ctx, min = 1) => {
    const n = Number.parseInt(ctx.input('qty', 4), 10);
    if (!Number.isInteger(n)) return min;
    return Math.min(Math.max(n, min), ctx.config.maxQtyPerLine);
  };

  app.post('/cart/add', (ctx) => {
    const next = safeNext(ctx.input('next', 200));
    const p = readProduct(ctx);
    if (!p) { ctx.flash('error', 'We could not find that product.'); return ctx.redirect('/shop'); }
    if (p.stock <= 0) { ctx.flash('error', `${p.name} is out of stock.`); return ctx.redirect(next || `/product/${p.slug}`); }
    const s = ctx.requireSession();
    const existing = ctx.db.prepare('SELECT qty FROM cart_items WHERE session_hash = ? AND product_id = ?').get(s.id_hash, p.id)?.qty ?? 0;
    const cap = Math.min(p.stock, ctx.config.maxQtyPerLine);
    const want = existing + readQty(ctx);
    const qty = Math.min(want, cap);
    ctx.db.prepare('INSERT INTO cart_items (session_hash, product_id, qty) VALUES (?,?,?) ON CONFLICT(session_hash, product_id) DO UPDATE SET qty = excluded.qty').run(s.id_hash, p.id, qty);
    ctx.flash('ok', want > cap ? `Added ${p.name}. That is the most we can send you at once (${cap}).` : `Added ${p.name} to your cart.`, { href: '/cart', label: 'View cart and check out' });
    ctx.redirect(next || '/cart');
  });

  app.post('/cart/update', (ctx) => {
    const p = readProduct(ctx);
    const s = ctx.requireSession();
    if (p) {
      const qty = readQty(ctx, 0);
      if (qty === 0) {
        ctx.db.prepare('DELETE FROM cart_items WHERE session_hash = ? AND product_id = ?').run(s.id_hash, p.id);
        ctx.flash('ok', `Removed ${p.name} from your cart.`);
      } else {
        const capped = Math.min(qty, p.stock, ctx.config.maxQtyPerLine);
        if (capped > 0) ctx.db.prepare('UPDATE cart_items SET qty = ? WHERE session_hash = ? AND product_id = ?').run(capped, s.id_hash, p.id);
        ctx.flash('ok', capped < qty ? `Updated ${p.name}. We only have ${p.stock} in stock.` : `Updated ${p.name} to ${capped}.`);
      }
    }
    ctx.redirect('/cart');
  });

  app.post('/cart/remove', (ctx) => {
    const p = readProduct(ctx);
    const s = ctx.requireSession();
    if (p) {
      ctx.db.prepare('DELETE FROM cart_items WHERE session_hash = ? AND product_id = ?').run(s.id_hash, p.id);
      ctx.flash('ok', `Removed ${p.name} from your cart.`);
    }
    ctx.redirect('/cart');
  });
}

export function factsPanel(p, { headingLevel = 2, id = 'facts' } = {}) {
  const h = `h${headingLevel}`;
  return html`<section class="facts" aria-labelledby="${id}-h">
    ${raw(`<${h} id="${id}-h" class="facts__title">`)}Access Facts${raw(`</${h}>`)}
    <p class="facts__sub">${p.name}</p>
    <table class="facts__table">
      <caption class="sr-only">Access Facts for ${p.name}</caption>
      <tbody>${p.facts.map(([k, v]) => html`<tr><th scope="row">${k}</th><td>${v}</td></tr>`)}</tbody>
    </table>
    <p class="facts__foot"><strong>Helps with:</strong> ${p.needs.map((n) => NEED_BY_ID.get(n)?.short).filter(Boolean).join(', ')}</p>
  </section>`;
}

export function summaryRows(t, config) {
  return html`<dl class="totals">
    <div><dt>Items</dt><dd>${money(t.subtotal, config.currency)}</dd></div>
    <div><dt>Delivery</dt><dd>${t.shipping === 0 ? 'Free' : money(t.shipping, config.currency)}</dd></div>
    ${config.taxRate > 0 ? html`<div><dt>Estimated tax</dt><dd>${money(t.tax, config.currency)}</dd></div>` : ''}
    <div class="totals__grand"><dt>Total</dt><dd>${money(t.total, config.currency)}</dd></div>
  </dl>`;
}
