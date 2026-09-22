import { config } from '../src/config.js';
import { openDb } from '../src/db.js';
import { seedProducts, ensureAdmin } from '../src/seed.js';

const db = openDb(config.dbPath);
console.log(`Seeded ${seedProducts(db)} products into ${config.dbPath}`);

const admin = await ensureAdmin(db, { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
if (admin.created) {
  console.log(`Created admin: ${admin.email}`);
  if (admin.password) console.log(`Generated password (shown once, store it in a password manager): ${admin.password}`);
} else {
  console.log(`Admin already exists: ${admin.email}`);
}
