import { html, raw } from '../lib/html.js';
import { glyph } from './glyphs.js';
import { braille } from './art.js';
import { CATEGORIES, NEEDS } from '../catalog.js';

const LOGO = raw(`<svg class="logo" width="40" height="40" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
  <circle class="logo__ring" cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="4"/>
  <path class="logo__hand" d="M14 34c0-8 2-12 5-12 1 0 1 2 1 4V13a2 2 0 0 1 4 0v11l1-9a2 2 0 0 1 4 0v9l1-6a2 2 0 0 1 4 0v10c0 7-4 11-10 11-6 0-10-3-10-9z" fill="currentColor"/>
</svg>`);

export const CAT_GLYPH = {
  kitchen: 'cup', dressing: 'sock', bathroom: 'sponge', mobility: 'cane', home: 'lever',
  hearing: 'bell', vision: 'magnifier', tech: 'plug', memory: 'timer', comms: 'board', calm: 'earmuffs',
};

const money0 = (ctx, cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: ctx.config.currency, maximumFractionDigits: 0 }).format(cents / 100);

/**
 * Page shell: a navy rail (brand, account and cart, search, categories, needs) beside the page. On narrow screens the
 * rail folds into a top bar with a scrolling category row. Everything works without JavaScript.
 * @param {import('../lib/app.js').Ctx} ctx
 * @param {{title:string, main:any, description?:string, robots?:string, bodyClass?:string}} page
 */
export function layout(ctx, { title, main, description = '', robots = '', bodyClass = '' }) {
  const p = ctx.prefs();
  const user = ctx.user();
  const count = ctx.cartCount();
  const flash = ctx.takeFlash();
  const v = (f) => `/${f}?v=${ctx.app.static.version(f)}`;
  const support = ctx.config.support;
  const q = ctx.query.get('q') ?? '';
  const activeCat = ctx.query.get('cat') ?? '';
  const activeNeeds = ctx.query.getAll('need');
  const onShop = ctx.path === '/shop';
  const cur = (yes) => (yes ? raw('aria-current="page"') : '');
  const counts = new Map(ctx.db.prepare('SELECT category, COUNT(*) AS n FROM products GROUP BY category').all().map((r) => [r.category, r.n]));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);

  return html`<!doctype html>
<html lang="en" data-theme="${p.theme}" data-text="${p.text}" data-space="${p.space}" data-font="${p.font}" data-motion="${p.motion}" data-calm="${p.calm}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${title} · Within Reach</title>
  ${description ? html`<meta name="description" content="${description}">` : ''}
  ${robots ? html`<meta name="robots" content="${robots}">` : ''}
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${v('css/app.css')}">
  <script src="${v('js/app.js')}" defer></script>
</head>
<body class="${bodyClass}">
  <a class="skip-link" href="#main">Skip to main content</a>
  <div class="shell">
    <header class="rail">
      <a class="brand" href="/" aria-label="Within Reach, home">${LOGO}<span>Within&nbsp;Reach</span></a>

      <nav class="rail__actions" aria-label="Account and cart">
        ${user
          ? html`<a class="rail-btn" href="/account" ${cur(/^\/(account|order)/.test(ctx.path))}>Hi, ${user.name.split(' ')[0]}</a>`
          : html`<a class="rail-btn" href="/login" ${cur(/^\/(login|register)/.test(ctx.path))}>Sign in</a>`}
        <a class="rail-btn rail-btn--cart" href="/cart" ${cur(/^\/cart/.test(ctx.path))}>${glyph('cart', { size: 22, width: 7 })}<span>Cart<span class="sr-only">, ${count} ${count === 1 ? 'item' : 'items'}</span></span><span class="cart-link__count" aria-hidden="true">${count}</span></a>
      </nav>

      <form class="rail__search site-search" role="search" action="/shop" method="get">
        <div class="site-search__row">
          <label for="site-cat" class="sr-only">Search in category</label>
          <select id="site-cat" name="cat">
            <option value="">All categories</option>
            ${CATEGORIES.map((c) => html`<option value="${c.id}" ${activeCat === c.id ? raw('selected') : ''}>${c.label}</option>`)}
          </select>
          <label for="site-q" class="sr-only">Search the shop</label>
          <input id="site-q" type="search" name="q" value="${q}" maxlength="80" autocomplete="off" enterkeyhint="search" placeholder="Search products or needs">
          <button type="submit">${glyph('magnifier', { size: 18, width: 8 })}<span>Search</span></button>
        </div>
      </form>

      <nav class="rail__section rail__cats" aria-labelledby="rail-cats-h">
        <h2 id="rail-cats-h">Shop by category</h2>
        <ul class="rail__list">
          <li><a href="/shop" ${cur(onShop && !activeCat && !activeNeeds.length)}>${glyph('list', { size: 18, cls: 'rail__icon', width: 8 })}All products<span class="rail__count" aria-hidden="true">${total}</span></a></li>
          ${CATEGORIES.map((c) => html`<li><a href="/shop?cat=${c.id}" ${cur(onShop && activeCat === c.id)}>${glyph(CAT_GLYPH[c.id] ?? 'button', { size: 18, cls: 'rail__icon', width: 8 })}${c.label}<span class="rail__count" aria-hidden="true">${counts.get(c.id) ?? 0}</span><span class="sr-only"> (${counts.get(c.id) ?? 0} products)</span></a></li>`)}
        </ul>
      </nav>

      <nav class="rail__section rail__needs" aria-labelledby="rail-needs-h">
        <h2 id="rail-needs-h">Shop by what is hard</h2>
        <ul class="rail__list">
          ${NEEDS.map((n) => html`<li><a href="/shop?need=${n.id}" ${cur(onShop && activeNeeds.length === 1 && activeNeeds[0] === n.id)}>${glyph(n.glyph, { size: 18, cls: 'rail__icon', width: 8 })}${n.label}</a></li>`)}
        </ul>
      </nav>

      <div class="rail__foot"><a href="/display">Display settings</a><a href="/help">Help</a></div>
    </header>

    <div class="stage">
      <div class="promo-strip">
        <ul class="promo-strip__row">
          <li><strong>Free delivery</strong> over ${money0(ctx, ctx.config.freeShippingOverCents)}</li>
          <li><strong>${ctx.config.returnDays}-day returns</strong>, we pay the postage</li>
          <li><strong>Text, email or phone.</strong> Never phone-only</li>
        </ul>
      </div>

      <div class="live" role="status" aria-live="polite" aria-atomic="true">${flash ? html`<div class="flash flash--${flash.kind === 'error' ? 'error' : 'ok'}"><div class="wrap"><span>${flash.kind === 'error' ? 'Problem:' : 'Done:'} ${flash.text}</span>${flash.link ? html`<a href="${flash.link.href}">${flash.link.label}</a>` : ''}</div></div>` : ''}</div>

      <main id="main" tabindex="-1">
        ${main}
      </main>

      <footer class="site-footer">
        <div class="wrap footer-grid">
          <section aria-labelledby="ft-help">
            <h2 id="ft-help" class="footer-h">Talk to a person</h2>
            <p>Use whichever way is easiest for you. We never require a phone call.</p>
            <ul>
              ${support.email ? html`<li>Email: <a href="mailto:${support.email}">${support.email}</a></li>` : ''}
              ${support.sms ? html`<li>Text: <a href="sms:${support.sms}">${support.sms}</a></li>` : ''}
              ${support.phone ? html`<li>Phone: <a href="tel:${support.phone}">${support.phone}</a></li>` : ''}
              ${support.relay ? html`<li>Relay / video: ${support.relay}</li>` : ''}
            </ul>
          </section>
          <nav aria-labelledby="ft-shop">
            <h2 id="ft-shop" class="footer-h">Shop</h2>
            <ul>${CATEGORIES.slice(0, 6).map((c) => html`<li><a href="/shop?cat=${c.id}">${c.label}</a></li>`)}<li><a href="/shop">All products</a></li></ul>
          </nav>
          <nav aria-labelledby="ft-help2">
            <h2 id="ft-help2" class="footer-h">Help</h2>
            <ul>
              <li><a href="/help">Delivery and returns</a></li>
              <li><a href="/display">Display settings</a></li>
              <li><a href="/account">Your account</a></li>
              <li><a href="/cart">Your cart</a></li>
            </ul>
          </nav>
          <nav aria-labelledby="ft-about">
            <h2 id="ft-about" class="footer-h">About</h2>
            <ul>
              <li><a href="/accessibility">Accessibility statement</a></li>
              <li><a href="/privacy">Privacy and your data</a></li>
              <li><a href="/credits">Photo credits</a></li>
              <li><a href="/.well-known/security.txt">Report a security problem</a></li>
            </ul>
          </nav>
        </div>
        <div class="wrap signoff">
          <div>
            <p class="signoff__big">Within reach.</p>
            <p class="signoff__sub">Everyday things that fit you.</p>
          </div>
          <figure class="signoff__braille">${braille('reach')}<figcaption>“Reach”, in braille.</figcaption></figure>
        </div>
        <div class="wrap footer-legal">Demo store: the catalogue is fictional and no payment is ever taken.</div>
      </footer>
    </div>
  </div>
</body>
</html>`;
}

/** Standard page header used at the top of <main>. */
export function pageHead({ title, lede = '', crumbs = null }) {
  return html`<div class="page-head">
    <div class="wrap">
      ${crumbs ? html`<nav class="crumbs" aria-label="Breadcrumb"><ol>${crumbs.map(([href, label]) => html`<li>${href ? html`<a href="${href}">${label}</a>` : html`<span aria-current="page">${label}</span>`}</li>`)}</ol></nav>` : ''}
      <h1>${title}</h1>
      ${lede ? html`<p class="lede">${lede}</p>` : ''}
    </div>
  </div>`;
}

export function errorPage(ctx, status, message) {
  const titles = { 400: 'That request did not look right', 403: 'That did not go through', 404: 'We cannot find that page', 405: 'That is not allowed here', 413: 'That was too much to send', 415: 'That was not understood', 429: 'Please slow down a moment', 500: 'Something went wrong' };
  const title = titles[status] ?? 'Something went wrong';
  return layout(ctx, {
    title,
    robots: 'noindex',
    main: html`<div class="wrap prose">
      <h1>${title}</h1>
      <p class="lede">${message}</p>
      <p class="btn-row"><a class="btn" href="/shop">Browse the shop</a> <a class="btn btn--ghost" href="/help">Get help</a></p>
    </div>`,
  });
}
