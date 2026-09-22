import { PRODUCTS } from './seed-data.js';
import { tx, now } from './db.js';
import { hashPassword, passwordProblem, randomToken } from './lib/security.js';

export function seedProducts(db) {
  const upsert = db.prepare(`
    INSERT INTO products (slug, name, tagline, easy_read, description, price_cents, category, facts, glyph, tone, stock, featured)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(slug) DO UPDATE SET name=excluded.name, tagline=excluded.tagline, easy_read=excluded.easy_read,
      description=excluded.description, price_cents=excluded.price_cents, category=excluded.category, facts=excluded.facts,
      glyph=excluded.glyph, tone=excluded.tone, featured=excluded.featured`);
  const idOf = db.prepare('SELECT id FROM products WHERE slug = ?');
  const clearTags = db.prepare('DELETE FROM product_tags WHERE product_id = ?');
  const addTag = db.prepare('INSERT OR IGNORE INTO product_tags (product_id, kind, value) VALUES (?,?,?)');

  tx(db, () => {
    for (const p of PRODUCTS) {
      upsert.run(p.slug, p.name, p.tagline, p.easy, p.description, p.price, p.category, JSON.stringify(p.facts), p.glyph, p.tone, p.stock, p.featured);
      const { id } = idOf.get(p.slug);
      clearTags.run(id);
      for (const n of p.needs) addTag.run(id, 'need', n);
      for (const t of p.traits) addTag.run(id, 'trait', t);
    }
  });
  return PRODUCTS.length;
}

/** Creates an admin if none exists. Returns {created, email, password?}; a generated password is returned only once. */
export async function ensureAdmin(db, { email, password } = {}) {
  const existing = db.prepare("SELECT email FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existing) return { created: false, email: existing.email };
  email = (email || 'admin@example.com').toLowerCase();
  let generated = false;
  if (!password) { password = randomToken(18); generated = true; }
  const problem = passwordProblem(password, { email });
  if (problem) throw new Error(`ADMIN_PASSWORD rejected: ${problem}`);
  db.prepare("INSERT INTO users (email, name, pass_hash, role, created_at) VALUES (?,?,?,'admin',?)")
    .run(email, 'Shop admin', await hashPassword(password), now());
  return { created: true, email, password: generated ? password : undefined };
}
