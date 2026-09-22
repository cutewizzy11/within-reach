import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  pass_hash     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  prefs         TEXT NOT NULL DEFAULT '',
  comm_pref     TEXT NOT NULL DEFAULT 'email' CHECK (comm_pref IN ('email','sms','phone')),
  phone         TEXT NOT NULL DEFAULT '',
  delivery_notes TEXT NOT NULL DEFAULT '',
  created_at    INTEGER NOT NULL
);

-- Only a SHA-256 of the session token is stored, so a database leak cannot be replayed as cookies.
CREATE TABLE IF NOT EXISTS sessions (
  id_hash    TEXT PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  csrf       TEXT NOT NULL,
  flash      TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  tagline     TEXT NOT NULL,
  easy_read   TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  category    TEXT NOT NULL,
  facts       TEXT NOT NULL DEFAULT '[]',
  glyph       TEXT NOT NULL,
  tone        TEXT NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  featured    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_tags (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('need','trait')),
  value      TEXT NOT NULL,
  PRIMARY KEY (product_id, kind, value)
);

CREATE TABLE IF NOT EXISTS cart_items (
  session_hash TEXT NOT NULL REFERENCES sessions(id_hash) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty          INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 10),
  PRIMARY KEY (session_hash, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY,
  number         TEXT NOT NULL UNIQUE,
  token_hash     TEXT NOT NULL,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email          TEXT NOT NULL,
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL DEFAULT '',
  line1          TEXT NOT NULL,
  line2          TEXT NOT NULL DEFAULT '',
  city           TEXT NOT NULL,
  region         TEXT NOT NULL,
  postal         TEXT NOT NULL,
  country        TEXT NOT NULL,
  comm_pref      TEXT NOT NULL,
  delivery_notes TEXT NOT NULL DEFAULT '',
  easy_open      INTEGER NOT NULL DEFAULT 0,
  leave_in_reach INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','packing','shipped','delivered','cancelled')),
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL,
  tax_cents      INTEGER NOT NULL,
  total_cents    INTEGER NOT NULL,
  created_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id          INTEGER PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  qty         INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id     INTEGER PRIMARY KEY,
  at     INTEGER NOT NULL,
  actor  TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT ''
);
`;

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;');
  db.exec(SCHEMA);
  return db;
}

/** Run fn inside an IMMEDIATE transaction (takes the write lock up front, so stock checks cannot race). */
export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export const now = () => Math.floor(Date.now() / 1000);
