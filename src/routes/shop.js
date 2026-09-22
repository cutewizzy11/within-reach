import { html, raw } from '../lib/html.js';
import { layout, pageHead } from '../views/layout.js';
import { glyph } from '../views/glyphs.js';
import { money, csrfField, productCard, plate, traitList, stockNote, checkbox } from '../views/ui.js';
import { NEEDS, CATEGORIES, TRAITS, SORTS, NEED_BY_ID, CATEGORY_BY_ID } from '../catalog.js';
import { parseFilters, listProducts, getProduct, cartLines, totals } from '../models.js';

export function shopRoutes(app) {
  // ------------------------------------------------------------------------------------- home
  app.get('/', (ctx) => {
    const featured = listProducts(ctx.db, { featuredOnly: true, limit: 6 });
    const sample = featured.find((p) => p.slug === 'rocker-knife') ?? featured[0];
    const heroPlates = featured.slice(0, 3);
    ctx.page(200, layout(ctx, {
      title: 'Everyday things that fit you',
      description: 'An online shop for adaptive and assistive products, described by how they work for your body.',
      main: html`
      <section class="hero" aria-labelledby="hero-h">
        <div class="wrap hero__grid">
          <div class="hero__copy">
            <p class="eyebrow">Adaptive products, described honestly</p>
            <h1 id="hero-h">Everyday things, made to fit <span class="mark">your</span> hands, eyes, ears and pace.</h1>
            <p class="lede">Every product has an <strong>Access Facts</strong> label: how many hands, how much effort, what setup, what senses it needs. No guessing from a glossy photo.</p>
            <p class="hero__cta">
              <a class="btn btn--big" href="#need-finder">Start with what is hard</a>
              <a class="btn btn--big btn--ghost" href="/shop">See everything</a>
            </p>
          </div>
          <div class="hero__art" aria-hidden="true">
            ${heroPlates.map((p, i) => html`<div class="hero__plate hero__plate--${i + 1} plate tone-${p.tone}">${glyph(p.glyph, { size: 120, width: 4.5 })}</div>`)}
          </div>
        </div>
      </section>

      <section class="section" id="need-finder" aria-labelledby="need-h">
        <div class="wrap">
          <h2 id="need-h" class="section__title">What is hard right now?</h2>
          <p class="section__lede">Pick the closest fit. You can add more filters afterwards, and many products help with more than one thing.</p>
          <ul class="need-grid">
            ${NEEDS.map((n) => html`<li><a class="need tone-${n.tone}" href="/shop?need=${n.id}">
              ${glyph(n.glyph, { size: 64, cls: 'need__glyph', width: 5 })}
              <span class="need__label">${n.label}</span>
              <span class="need__blurb">${n.blurb}</span>
            </a></li>`)}
          </ul>
        </div>
      </section>

      <section class="section section--tint" aria-labelledby="facts-demo-h">
        <div class="wrap split">
          <div>
            <h2 id="facts-demo-h" class="section__title">A label that tells you what the product asks of you</h2>
            <p>Most shops list size and colour. We list what matters to your body: the hands and grip it needs, the effort to use it, how long setup takes, and whether it depends on sight or hearing.</p>
            <p>Every product on the site has one, in the same order, so you can compare.</p>
            <p><a class="btn btn--ghost" href="/shop">Browse products</a></p>
          </div>
          ${sample ? factsPanel(sample, { headingLevel: 3, id: 'sample-facts' }) : ''}
        </div>
      </section>

      <section class="section" aria-labelledby="picks-h">
        <div class="wrap">
          <h2 id="picks-h" class="section__title">Our picks</h2>
          <ul class="grid">${featured.map((p) => productCard(p, 3))}</ul>
          <p class="center"><a class="btn" href="/shop">See all products</a></p>
        </div>
      </section>

      <section class="section section--ink" aria-labelledby="promise-h">
        <div class="wrap">
          <h2 id="promise-h" class="section__title">How we shop with you</h2>
          <ul class="promises">
            <li><strong>No time limits.</strong> Your cart and checkout never expire while you are working on them.</li>
            <li><strong>Talk your way.</strong> Text, email, phone or relay. We never make phone calls the only option.</li>
            <li><strong>${ctx.config.returnDays}-day returns.</strong> If it does not work for your body, send it back and we pay the postage.</li>
            <li><strong>Delivery that fits.</strong> Ask for easy-open packaging, “leave within reach”, or contact by text only.</li>
          </ul>
        </div>
      </section>`,
    }));
  });

  // ------------------------------------------------------------------------------------- shop
  app.get('/shop', (ctx) => {
    const f = parseFilters(ctx.query);
    const products = listProducts(ctx.db, f);
    const active = [
      ...f.needs.map((n) => NEED_BY_ID.get(n).short),
      ...(f.cat ? [CATEGORY_BY_ID.get(f.cat).label] : []),
      ...f.traits.map((t) => TRAITS.find((x) => x.id === t).label),
      ...(f.q ? [`“${f.q}”`] : []),
    ];
    ctx.page(200, layout(ctx, {
      title: 'Shop',
      description: 'Browse adaptive and assistive products by what is hard and by how they work.',
      main: html`
      ${pageHead({ title: 'Shop', lede: 'Filter by what is hard, then by how you need the product to work.' })}
      <div class="wrap shop">
        <p class="skip-inline"><a href="#results">Skip to results</a></p>
        <form class="filters" action="/shop" method="get" aria-label="Filter products">
          ${f.q ? html`<p class="filters__q">Searching for <strong>“${f.q}”</strong>. Use the search box at the top of the page to change it.</p><input type="hidden" name="q" value="${f.q}">` : ''}
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
          <div class="field">
            <label for="f-sort">Sort by</label>
            <select id="f-sort" name="sort">${SORTS.map((s) => html`<option value="${s.id}" ${f.sort === s.id ? raw('selected') : ''}>${s.label}</option>`)}</select>
          </div>
          <div class="btn-row">
            <button class="btn" type="submit">Show products</button>
            <a class="btn btn--ghost" href="/shop">Clear filters</a>
          </div>
        </form>

        <div class="results">
          <h2 id="results" tabindex="-1">${products.length} ${products.length === 1 ? 'product' : 'products'}${active.length ? html`<span class="results__for"> for ${active.join(', ')}</span>` : ''}</h2>
          ${products.length
            ? html`<ul class="grid grid--shop">${products.map((p) => productCard(p, 3))}</ul>`
            : html`<div class="empty"><p><strong>Nothing matches all of those.</strong></p><p>Try removing a “Must have” box, or <a href="/shop">clear the filters</a>. If you cannot find what you need, <a href="/help">ask us</a>. We can often source it.</p></div>`}
        </div>
      </div>`,
    }));
  });

  // ------------------------------------------------------------------------------------- product
  app.get('/product/:slug', (ctx) => {
    const p = getProduct(ctx.db, ctx.params.slug);
    if (!p) return ctx.page(404, app.renderError(ctx, 404, 'We could not find that product. It may have been removed.'));
    const related = listProducts(ctx.db, { cat: p.category, sort: 'featured', limit: 4 }).filter((r) => r.id !== p.id).slice(0, 3);
    const maxQty = Math.max(1, Math.min(p.stock, ctx.config.maxQtyPerLine));
    ctx.page(200, layout(ctx, {
      title: p.name,
      description: p.tagline,
      main: html`
      ${pageHead({ title: p.name, lede: p.tagline, crumbs: [['/', 'Home'], ['/shop', 'Shop'], [`/shop?cat=${p.category}`, CATEGORY_BY_ID.get(p.category)?.label ?? 'Products'], [null, p.name]] })}
      <div class="wrap product">
        <div class="product__media">${plate(p, true)}</div>

        <section class="product__buy" aria-labelledby="buy-h">
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
            <button class="btn btn--big" type="submit">Add to cart</button>
          </form>` : ''}
          ${traitList(p.traits)}
          <p class="fineprint">${ctx.config.returnDays}-day returns. If it does not work for your body, send it back and we pay the postage.</p>
        </section>

        <section class="product__easy" aria-labelledby="easy-h">
          <h2 id="easy-h">In plain words</h2>
          <p class="easy" id="easy-text">${p.easy_read}</p>
          <button type="button" class="btn btn--ghost btn--small" data-speak="#easy-text" hidden>Read this aloud</button>
        </section>

        ${factsPanel(p, { headingLevel: 2, id: 'facts' })}

        <section class="product__about" aria-labelledby="about-h">
          <h2 id="about-h">About this product</h2>
          <p>${p.description}</p>
          <h3>Made for people who find these hard</h3>
          <ul class="chips">${p.needs.map((n) => html`<li><a href="/shop?need=${n}">${NEED_BY_ID.get(n)?.label ?? n}</a></li>`)}</ul>
        </section>
      </div>
      ${related.length ? html`<section class="section section--tint" aria-labelledby="rel-h"><div class="wrap"><h2 id="rel-h" class="section__title">More in ${CATEGORY_BY_ID.get(p.category)?.label}</h2><ul class="grid">${related.map((r) => productCard(r, 3))}</ul></div></section>` : ''}`,
    }));
  });

  // ------------------------------------------------------------------------------------- cart
  app.get('/cart', (ctx) => {
    const s = ctx.session();
    const lines = s ? cartLines(ctx.db, s.id_hash) : [];
    const t = totals(lines, ctx.config);
    ctx.page(200, layout(ctx, {
      title: 'Your cart',
      robots: 'noindex',
      main: html`
      ${pageHead({ title: 'Your cart', lede: lines.length ? 'Check what you have chosen. Nothing here expires.' : '' })}
      <div class="wrap cart">
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
            ${summaryRows(t, ctx.config)}
            <a class="btn btn--big btn--block" href="/checkout">Go to checkout</a>
            <p class="fineprint">You do not need an account to check out.</p>
          </aside>`
        : html`<div class="empty"><p><strong>Your cart is empty.</strong></p><p><a class="btn" href="/shop">Browse the shop</a></p></div>`}
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
    const p = readProduct(ctx);
    if (!p) { ctx.flash('error', 'We could not find that product.'); return ctx.redirect('/shop'); }
    if (p.stock <= 0) { ctx.flash('error', `${p.name} is out of stock.`); return ctx.redirect(`/product/${p.slug}`); }
    const s = ctx.requireSession();
    const existing = ctx.db.prepare('SELECT qty FROM cart_items WHERE session_hash = ? AND product_id = ?').get(s.id_hash, p.id)?.qty ?? 0;
    const cap = Math.min(p.stock, ctx.config.maxQtyPerLine);
    const qty = Math.min(existing + readQty(ctx), cap);
    ctx.db.prepare('INSERT INTO cart_items (session_hash, product_id, qty) VALUES (?,?,?) ON CONFLICT(session_hash, product_id) DO UPDATE SET qty = excluded.qty').run(s.id_hash, p.id, qty);
    ctx.flash('ok', qty >= cap && existing + readQty(ctx) > cap ? `Added ${p.name}. That is the most we can send you at once (${cap}).` : `Added ${p.name} to your cart.`);
    ctx.redirect('/cart');
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
  return html`<section class="facts product__facts" aria-labelledby="${id}-h">
    ${raw(`<${h} id="${id}-h" class="facts__title">`)}Access Facts${raw(`</${h}>`)}
    <p class="facts__sub">${p.name}</p>
    <table class="facts__table">
      <caption class="sr-only">Access Facts for ${p.name}</caption>
      <tbody>${p.facts.map(([k, v]) => html`<tr><th scope="row">${k}</th><td>${v}</td></tr>`)}</tbody>
    </table>
    <p class="facts__foot"><strong>Helps with:</strong> ${p.needs.map((n) => NEED_BY_ID.get(n)?.short).filter(Boolean).join(', ')}</p>
  </section>`;
}

export function summaryRows(t, config, { lines = [] } = {}) {
  return html`<dl class="totals">
    <div><dt>Items</dt><dd>${money(t.subtotal, config.currency)}</dd></div>
    <div><dt>Delivery</dt><dd>${t.shipping === 0 ? 'Free' : money(t.shipping, config.currency)}</dd></div>
    ${config.taxRate > 0 ? html`<div><dt>Estimated tax</dt><dd>${money(t.tax, config.currency)}</dd></div>` : ''}
    <div class="totals__grand"><dt>Total</dt><dd>${money(t.total, config.currency)}</dd></div>
  </dl>
  ${t.shipping > 0 ? html`<p class="fineprint">Free delivery on orders over ${money(config.freeShippingOverCents, config.currency)}.</p>` : ''}`;
}
