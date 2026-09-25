import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEED_BY_ID, TRAIT_BY_ID, CATEGORY_BY_ID, SORTS } from './catalog.js';

const PHOTO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'img', 'products');
const photoCache = new Map();

/** A photo dropped in as public/img/products/<slug>.(webp|jpg|jpeg|png|avif) is picked up with no database change. */
export function photoFor(slug, explicit = '') {
  if (explicit) return explicit;
  if (!photoCache.has(slug)) {
    const ext = ['webp', 'jpg', 'jpeg', 'png', 'avif'].find((e) => fs.existsSync(path.join(PHOTO_DIR, `${slug}.${e}`)));
    photoCache.set(slug, ext ? `/img/products/${slug}.${ext}` : '');
  }
  return photoCache.get(slug);
}

function hydrate(db, rows) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  const tags = db.prepare(`SELECT product_id, kind, value FROM product_tags WHERE product_id IN (${ids.map(() => '?').join(',')})`).all(...ids);
  const byProduct = new Map(rows.map((r) => [r.id, { needs: [], traits: [] }]));
  for (const t of tags) byProduct.get(t.product_id)[t.kind === 'need' ? 'needs' : 'traits'].push(t.value);
  return rows.map((r) => ({ ...r, ...byProduct.get(r.id), facts: JSON.parse(r.facts), image: photoFor(r.slug, r.image) }));
}

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Filter values are checked against the catalogue whitelists before they get anywhere near SQL,
 * and all values are bound parameters regardless.
 */
export function parseFilters(query) {
  const q = (query.get('q') ?? '').normalize('NFC').replace(/[\x00-\x1f]/g, ' ').trim().slice(0, 80);
  const needs = query.getAll('need').filter((n) => NEED_BY_ID.has(n)).slice(0, 7);
  const traits = query.getAll('trait').filter((t) => TRAIT_BY_ID.has(t)).slice(0, 12);
  const cat = CATEGORY_BY_ID.has(query.get('cat')) ? query.get('cat') : '';
  const sort = SORTS.some((s) => s.id === query.get('sort')) ? query.get('sort') : 'featured';
  return { q, needs: [...new Set(needs)], traits: [...new Set(traits)], cat, sort };
}

export function listProducts(db, f = {}) {
  const where = [];
  const args = [];
  if (f.q) {
    where.push("(name LIKE ? ESCAPE '\\' OR tagline LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
    const like = `%${escapeLike(f.q)}%`;
    args.push(like, like, like);
  }
  if (f.cat) { where.push('category = ?'); args.push(f.cat); }
  if (f.needs?.length) {
    where.push(`EXISTS (SELECT 1 FROM product_tags t WHERE t.product_id = products.id AND t.kind = 'need' AND t.value IN (${f.needs.map(() => '?').join(',')}))`);
    args.push(...f.needs);
  }
  for (const trait of f.traits ?? []) {
    where.push("EXISTS (SELECT 1 FROM product_tags t WHERE t.product_id = products.id AND t.kind = 'trait' AND t.value = ?)");
    args.push(trait);
  }
  if (f.featuredOnly) where.push('featured = 1');
  const order = (SORTS.find((s) => s.id === f.sort) ?? SORTS[0]).sql; // from a fixed list, never from user text
  const sql = `SELECT * FROM products ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order} ${f.limit ? 'LIMIT ' + Number(f.limit) : ''}`;
  return hydrate(db, db.prepare(sql).all(...args));
}

export function getProduct(db, slug) {
  const row = db.prepare('SELECT * FROM products WHERE slug = ?').get(slug);
  return row ? hydrate(db, [row])[0] : null;
}

export function getProductsById(db, ids) {
  if (!ids.length) return [];
  return hydrate(db, db.prepare(`SELECT * FROM products WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids));
}

export function cartLines(db, sessionHash) {
  const rows = db.prepare(`SELECT p.*, c.qty FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.session_hash = ? ORDER BY p.name COLLATE NOCASE`).all(sessionHash);
  return rows.map((r) => ({ ...r, facts: JSON.parse(r.facts), image: photoFor(r.slug, r.image), lineCents: r.price_cents * r.qty }));
}

export function totals(lines, config) {
  const subtotal = lines.reduce((n, l) => n + l.lineCents, 0);
  const shipping = subtotal === 0 || subtotal >= config.freeShippingOverCents ? 0 : config.shippingCents;
  const tax = Math.round((subtotal + shipping) * config.taxRate);
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}
