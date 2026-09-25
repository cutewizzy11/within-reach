import { html, raw } from '../lib/html.js';
import { glyph } from './glyphs.js';
import { art } from './art.js';
import { TRAIT_BY_ID, CATEGORY_BY_ID } from '../catalog.js';

export function money(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export const csrfField = (ctx) => html`<input type="hidden" name="_csrf" value="${ctx.csrf()}">`;

/** Error summary: shown above the form, links to each invalid field. main.js moves focus here on load. */
export function errorSummary(errors, labels = {}) {
  const keys = Object.keys(errors);
  if (!keys.length) return '';
  return html`<div class="error-summary" role="alert" tabindex="-1" data-error-summary>
    <h2 class="error-summary__title">There ${keys.length === 1 ? 'is 1 problem' : `are ${keys.length} problems`} to fix</h2>
    <ul>${keys.map((k) => html`<li><a href="#f-${k}">${errors[k]}</a></li>`)}</ul>
  </div>`;
}

/**
 * One labelled form control. Label is always visible and above the field (never placeholder-only),
 * hint and error are tied to the input with aria-describedby.
 */
export function field({ name, label, type = 'text', value = '', hint = '', error = '', required = false, autocomplete, inputmode, maxlength, rows, pattern, min, max, optional = false, spellcheck }) {
  const id = `f-${name}`;
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ');
  const common = html`id="${id}" name="${name}" ${required ? raw('required') : ''} ${error ? raw('aria-invalid="true"') : ''} ${describedBy ? html`aria-describedby="${describedBy}"` : ''} ${autocomplete ? html`autocomplete="${autocomplete}"` : ''}`;
  const control = type === 'textarea'
    ? html`<textarea ${common} rows="${rows ?? 4}" ${maxlength ? html`maxlength="${maxlength}"` : ''}>${value}</textarea>`
    : html`<input ${common} type="${type}" value="${value}" ${inputmode ? html`inputmode="${inputmode}"` : ''} ${maxlength ? html`maxlength="${maxlength}"` : ''} ${pattern ? html`pattern="${pattern}"` : ''} ${min != null ? html`min="${min}"` : ''} ${max != null ? html`max="${max}"` : ''} ${spellcheck === false ? raw('spellcheck="false"') : ''} ${type === 'email' || type === 'password' ? raw('autocapitalize="none"') : ''}>`;
  return html`<div class="field ${error ? 'field--error' : ''}">
    <label for="${id}">${label}${optional ? html` <span class="optional">(optional)</span>` : ''}</label>
    ${hint ? html`<p class="hint" id="${id}-hint">${hint}</p>` : ''}
    ${error ? html`<p class="error-text" id="${id}-err"><span class="sr-only">Error: </span>${error}</p>` : ''}
    ${control}
  </div>`;
}

export function select({ name, label, options, value = '', error = '', hint = '', autocomplete, required }) {
  const id = `f-${name}`;
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ');
  return html`<div class="field ${error ? 'field--error' : ''}">
    <label for="${id}">${label}</label>
    ${hint ? html`<p class="hint" id="${id}-hint">${hint}</p>` : ''}
    ${error ? html`<p class="error-text" id="${id}-err"><span class="sr-only">Error: </span>${error}</p>` : ''}
    <select id="${id}" name="${name}" ${required ? raw('required') : ''} ${error ? raw('aria-invalid="true"') : ''} ${describedBy ? html`aria-describedby="${describedBy}"` : ''} ${autocomplete ? html`autocomplete="${autocomplete}"` : ''}>
      ${options.map(([v, l]) => html`<option value="${v}" ${v === value ? raw('selected') : ''}>${l}</option>`)}
    </select>
  </div>`;
}

/** Radio group as a fieldset+legend. Each option can carry help text linked with aria-describedby. */
export function radios({ name, legend, options, value = '', error = '', hint = '' }) {
  const gid = `f-${name}`;
  return html`<fieldset class="choice-group ${error ? 'field--error' : ''}" id="${gid}" ${error || hint ? html`aria-describedby="${[hint && `${gid}-hint`, error && `${gid}-err`].filter(Boolean).join(' ')}"` : ''}>
    <legend>${legend}</legend>
    ${hint ? html`<p class="hint" id="${gid}-hint">${hint}</p>` : ''}
    ${error ? html`<p class="error-text" id="${gid}-err"><span class="sr-only">Error: </span>${error}</p>` : ''}
    ${options.map((o) => html`<div class="choice">
      <input type="radio" id="${gid}-${o.id}" name="${name}" value="${o.id}" ${o.id === value ? raw('checked') : ''} ${o.help ? html`aria-describedby="${gid}-${o.id}-help"` : ''}>
      <label for="${gid}-${o.id}">${o.label}</label>
      ${o.help ? html`<p class="hint" id="${gid}-${o.id}-help">${o.help}</p>` : ''}
    </div>`)}
  </fieldset>`;
}

export function checkbox({ name, label, help = '', checked = false, value = '1' }) {
  const id = `f-${name}`;
  return html`<div class="choice">
    <input type="checkbox" id="${id}" name="${name}" value="${value}" ${checked ? raw('checked') : ''} ${help ? html`aria-describedby="${id}-help"` : ''}>
    <label for="${id}">${label}</label>
    ${help ? html`<p class="hint" id="${id}-help">${help}</p>` : ''}
  </div>`;
}

export const traitList = (traits, limit = 99) => html`<ul class="traits" aria-label="Access features">
  ${traits.slice(0, limit).map((t) => html`<li>${glyph('check', { size: 16, cls: 'tick', width: 10 })}<span>${TRAIT_BY_ID.get(t)?.label ?? t}</span></li>`)}
</ul>`;

/**
 * Studio-style product tile. If a product has a real photo (products.image, a path under /public), it is layered
 * over the illustrated fallback. The image is decorative (alt="") because the product name always sits next to it.
 */
export const plate = (p) => (p.image
  ? html`<div class="plate plate--photo"><img src="${p.image}" alt="" loading="lazy"></div>`
  : html`<div class="plate tone-${p.tone}"><span class="plate__floor" aria-hidden="true"></span><span class="plate__art">${art(p.glyph)}</span></div>`);

export function stockNote(p) {
  if (p.stock <= 0) return html`<p class="stock stock--out">Out of stock. <a href="/help">Ask us to tell you when it is back.</a></p>`;
  if (p.stock <= 5) return html`<p class="stock stock--low">Only ${p.stock} left in stock.</p>`;
  return html`<p class="stock stock--in">In stock. Ships within 2 working days.</p>`;
}

/** Corner ribbon on a card: out of stock beats low stock beats editor's pick. */
function cardRibbon(p) {
  if (p.stock <= 0) return html`<span class="ribbon ribbon--out">Out of stock</span>`;
  if (p.stock <= 5) return html`<span class="ribbon ribbon--low">Only ${p.stock} left</span>`;
  if (p.featured) return html`<span class="ribbon ribbon--pick">Editor's pick</span>`;
  return '';
}

/** Product card with an add-to-cart button that returns you to the page you were on (no detour to the cart). */
export function productCard(ctx, p, headingLevel = 3) {
  const h = `h${headingLevel}`;
  const cat = CATEGORY_BY_ID.get(p.category)?.label ?? '';
  const here = `${ctx.path}${ctx.url.search}`.slice(0, 200);
  return html`<li class="card">
    <a class="card__media" href="/product/${p.slug}" tabindex="-1" aria-hidden="true">${plate(p)}${cardRibbon(p)}</a>
    <div class="card__body">
      <p class="card__cat">${cat}</p>
      ${raw(`<${h} class="card__title">`)}<a href="/product/${p.slug}">${p.name}</a>${raw(`</${h}>`)}
      <p class="card__tag">${p.tagline}</p>
      ${traitList(p.traits, 3)}
      <div class="card__foot">
        <p class="price">${money(p.price_cents)}</p>
        ${p.stock > 0 ? html`<form action="/cart/add" method="post" class="quick-add">
          ${csrfField(ctx)}
          <input type="hidden" name="product" value="${p.id}">
          <input type="hidden" name="qty" value="1">
          <input type="hidden" name="next" value="${here}">
          <button class="btn btn--buy btn--small" type="submit">Add to cart<span class="sr-only">: ${p.name}</span></button>
        </form>` : html`<a class="btn btn--ghost btn--small" href="/product/${p.slug}">See details</a>`}
      </div>
    </div>
  </li>`;
}
