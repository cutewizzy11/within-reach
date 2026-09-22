import { html, raw } from '../lib/html.js';
import { glyph } from './glyphs.js';

const LOGO = raw(`<svg class="logo" width="44" height="44" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
  <circle class="logo__ring" cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="4"/>
  <path class="logo__hand" d="M14 34c0-8 2-12 5-12 1 0 1 2 1 4V13a2 2 0 0 1 4 0v11l1-9a2 2 0 0 1 4 0v9l1-6a2 2 0 0 1 4 0v10c0 7-4 11-10 11-6 0-10-3-10-9z" fill="currentColor"/>
</svg>`);

const nav = (ctx, href, label, match) => {
  const current = match ? match.test(ctx.path) : ctx.path === href;
  return html`<li><a href="${href}" ${current ? raw('aria-current="page"') : ''}>${label}</a></li>`;
};

/**
 * @param {import('../lib/app.js').Ctx} ctx
 * @param {{title:string, main:any, description?:string, wide?:boolean, robots?:string, bodyClass?:string}} page
 */
export function layout(ctx, { title, main, description = '', robots = '', bodyClass = '' }) {
  const p = ctx.prefs();
  const user = ctx.user();
  const count = ctx.cartCount();
  const flash = ctx.takeFlash();
  const v = (f) => `/${f}?v=${ctx.app.static.version(f)}`;
  const support = ctx.config.support;
  const q = ctx.query.get('q') ?? '';

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
  <header class="site-header">
    <div class="wrap site-header__row">
      <a class="brand" href="/" aria-label="Within Reach, home">${LOGO}<span class="brand__name">Within&nbsp;Reach</span></a>
      <nav class="site-nav" aria-label="Main">
        <ul>
          ${nav(ctx, '/shop', 'Shop', /^\/(shop|product)/)}
          ${nav(ctx, '/help', 'Help')}
          ${nav(ctx, '/display', 'Display settings')}
          ${user ? nav(ctx, '/account', 'My account', /^\/(account|order)/) : nav(ctx, '/login', 'Sign in', /^\/(login|register)/)}
          ${user?.role === 'admin' ? nav(ctx, '/admin', 'Admin', /^\/admin/) : ''}
          <li><a class="cart-link" href="/cart" ${/^\/cart/.test(ctx.path) ? raw('aria-current="page"') : ''}>${glyph('cart', { size: 26, cls: 'cart-link__icon', width: 6 })}<span>Cart<span class="sr-only">, ${count} ${count === 1 ? 'item' : 'items'}</span></span><span class="cart-link__count" aria-hidden="true">${count}</span></a></li>
        </ul>
      </nav>
      <form class="site-search" role="search" action="/shop" method="get">
        <label for="site-q">Search the shop</label>
        <div class="site-search__row">
          <input id="site-q" type="search" name="q" value="${q}" maxlength="80" autocomplete="off" enterkeyhint="search">
          <button class="btn btn--small" type="submit">Search</button>
        </div>
      </form>
    </div>
  </header>

  <div class="live" role="status" aria-live="polite" aria-atomic="true">${flash ? html`<div class="flash flash--${flash.kind === 'error' ? 'error' : 'ok'}"><div class="wrap"><span class="flash__label">${flash.kind === 'error' ? 'Problem:' : 'Done:'}</span> ${flash.text}</div></div>` : ''}</div>

  <main id="main" tabindex="-1">
    ${main}
  </main>

  <footer class="site-footer">
    <div class="wrap footer-grid">
      <section aria-labelledby="ft-help">
        <h2 id="ft-help" class="footer-h">Talk to a person</h2>
        <p>Use whichever way is easiest for you. We never require a phone call.</p>
        <ul class="plain">
          ${support.email ? html`<li>Email: <a href="mailto:${support.email}">${support.email}</a></li>` : ''}
          ${support.sms ? html`<li>Text: <a href="sms:${support.sms}">${support.sms}</a></li>` : ''}
          ${support.phone ? html`<li>Phone: <a href="tel:${support.phone}">${support.phone}</a></li>` : ''}
          ${support.relay ? html`<li>Relay / video: ${support.relay}</li>` : ''}
        </ul>
      </section>
      <nav aria-labelledby="ft-links">
        <h2 id="ft-links" class="footer-h">About this site</h2>
        <ul class="plain">
          <li><a href="/accessibility">Accessibility statement</a></li>
          <li><a href="/privacy">Privacy and your data</a></li>
          <li><a href="/help">Help and returns</a></li>
          <li><a href="/display">Display settings</a></li>
          <li><a href="/.well-known/security.txt">Report a security problem</a></li>
        </ul>
      </nav>
      <section aria-labelledby="ft-demo">
        <h2 id="ft-demo" class="footer-h">Demo store</h2>
        <p>This is a demonstration catalogue. Products are fictional and no payment is taken.</p>
      </section>
    </div>
  </footer>
</body>
</html>`;
}

/** Standard page header used at the top of <main>. */
export function pageHead({ title, lede = '', crumbs = null }) {
  return html`<div class="page-head">
    <div class="wrap">
      ${crumbs ? html`<nav class="crumbs" aria-label="Breadcrumb"><ol>${crumbs.map(([href, label], i) => html`<li>${href ? html`<a href="${href}">${label}</a>` : html`<span aria-current="page">${label}</span>`}</li>`)}</ol></nav>` : ''}
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
    main: html`<div class="wrap prose narrow">
      <h1>${title}</h1>
      <p class="lede">${message}</p>
      <p><a class="btn" href="/shop">Browse the shop</a> <a class="btn btn--ghost" href="/help">Get help</a></p>
    </div>`,
  });
}
