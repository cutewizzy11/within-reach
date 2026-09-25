import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { seedProducts } from '../src/seed.js';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { photoFor, listProducts, getProduct, parseFilters, totals } from '../src/models.js';

function db() { const d = openDb(':memory:'); seedProducts(d); return d; }

test('seed loads the expected number of products, all with facts and needs', () => {
  const d = db();
  const all = listProducts(d);
  assert.ok(all.length >= 20);
  for (const p of all) {
    assert.ok(Array.isArray(p.facts) && p.facts.length > 0, `${p.slug} has no facts`);
    assert.ok(p.needs.length > 0, `${p.slug} has no needs`);
  }
});

test('parseFilters ignores unknown need/trait/category values (whitelist)', () => {
  const q = new URLSearchParams('need=vision&need=totally-made-up&trait=nope&cat=bogus&sort=bogus');
  const f = parseFilters(q);
  assert.deepEqual(f.needs, ['vision']);
  assert.deepEqual(f.traits, []);
  assert.equal(f.cat, '');
  assert.equal(f.sort, 'featured');
});

test('listProducts filters by need', () => {
  const d = db();
  const results = listProducts(d, { needs: ['hearing'] });
  assert.ok(results.length > 0);
  for (const p of results) assert.ok(p.needs.includes('hearing'));
});

test('listProducts search matches name/tagline/description, case-insensitively', () => {
  const d = db();
  const results = listProducts(d, { q: 'JAR' });
  assert.ok(results.some((p) => p.slug === 'palm-press-jar-opener'));
});

test('search input containing SQL LIKE wildcards is treated literally', () => {
  const d = db();
  // "%" should not match everything; escapeLike neutralises it.
  const results = listProducts(d, { q: '%' });
  assert.equal(results.length, 0);
});

test('getProduct returns null for unknown slug', () => {
  const d = db();
  assert.equal(getProduct(d, 'does-not-exist'), null);
});

test('totals: free shipping over the threshold, shipping charged below it', () => {
  const config = { shippingCents: 695, freeShippingOverCents: 7500, taxRate: 0 };
  const cheap = totals([{ lineCents: 1000 }], config);
  assert.equal(cheap.shipping, 695);
  const big = totals([{ lineCents: 8000 }], config);
  assert.equal(big.shipping, 0);
  const empty = totals([], config);
  assert.equal(empty.shipping, 0);
});

test('totals: tax is applied to subtotal + shipping', () => {
  const config = { shippingCents: 500, freeShippingOverCents: 999999, taxRate: 0.1 };
  const t = totals([{ lineCents: 1000 }], config);
  assert.equal(t.tax, Math.round((1000 + 500) * 0.1));
  assert.equal(t.total, 1000 + 500 + t.tax);
});

test('photoFor picks up a photo dropped in by slug, prefers an explicit path, and returns empty when there is none', () => {
  const dir = fileURLToPath(new URL('../public/img/products/', import.meta.url));
  const file = dir + 'zz-test-photo.webp';
  fs.writeFileSync(file, 'x');
  try {
    assert.equal(photoFor('zz-test-photo'), '/img/products/zz-test-photo.webp');
  } finally { fs.unlinkSync(file); }
  assert.equal(photoFor('zz-no-such-photo'), '');
  assert.equal(photoFor('zz-no-such-photo', '/img/custom.jpg'), '/img/custom.jpg');
});

test('every product photo has a recorded credit and licence, and every credit has a photo', async () => {
  const { PHOTO_CREDITS } = await import('../src/photo-credits.js');
  const dir = fileURLToPath(new URL('../public/img/products/', import.meta.url));
  const photos = fs.readdirSync(dir).filter((f) => /.(webp|jpe?g|png|avif)$/i.test(f)).sort();
  const credited = Object.values(PHOTO_CREDITS).map((c) => c.file).sort();
  assert.deepEqual(photos, credited);
  for (const [slug, c] of Object.entries(PHOTO_CREDITS)) {
    assert.ok(c.file.startsWith(slug + '.'), slug + ': file name must be the product slug');
    for (const k of ['author', 'source', 'page', 'license', 'licenseUrl']) assert.ok(c[k], slug + ': missing ' + k);
  }
});
