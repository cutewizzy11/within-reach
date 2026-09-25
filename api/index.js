// Vercel entrypoint: wraps the same request handler that src/server.js uses.
//
// Vercel functions are serverless, so there is no long-running process and no durable disk. SQLite lives in
// the function's /tmp, is seeded on cold start, and is per-instance: carts, sessions and orders can vanish
// when Vercel recycles or scales the function. Fine for a demo; use a real host + database for real orders
// (see docs/OPERATIONS.md).
process.env.NODE_ENV ??= 'production';
process.env.DB_PATH ??= '/tmp/withinreach.db';
process.env.TRUST_PROXY ??= '1'; // Vercel's edge sets X-Forwarded-For

// Vercel bundles only the files it can statically trace. The app reads public/ at runtime by computed path,
// which the tracer cannot see, so list every static asset here as a literal. This block never runs.
if (globalThis.__vercelTrace) {
  const { readFileSync } = await import('node:fs');
  for (const f of [
    new URL('../public/css/app.css', import.meta.url),
    new URL('../public/js/app.js', import.meta.url),
    new URL('../public/favicon.svg', import.meta.url),
    new URL('../public/fonts/atkinson-hyperlegible-latin-400-normal.woff2', import.meta.url),
    new URL('../public/fonts/atkinson-hyperlegible-latin-400-italic.woff2', import.meta.url),
    new URL('../public/fonts/atkinson-hyperlegible-latin-700-normal.woff2', import.meta.url),
    new URL('../public/fonts/fraunces-latin-600-normal.woff2', import.meta.url),
    new URL('../public/fonts/fraunces-latin-800-normal.woff2', import.meta.url),
  ]) readFileSync(f);
}

let appPromise;

async function boot() {
  const { config } = await import('../src/config.js');
  const { openDb } = await import('../src/db.js');
  const { createApp } = await import('../src/lib/app.js');
  const { errorPage } = await import('../src/views/layout.js');
  const { seedProducts, ensureAdmin } = await import('../src/seed.js');
  const { shopRoutes } = await import('../src/routes/shop.js');
  const { accountRoutes } = await import('../src/routes/account.js');
  const { checkoutRoutes } = await import('../src/routes/checkout.js');
  const { adminRoutes } = await import('../src/routes/admin.js');
  const { pageRoutes } = await import('../src/routes/pages.js');

  const db = openDb(config.dbPath);
  seedProducts(db);
  const admin = await ensureAdmin(db, { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  if (admin.password) console.log(`Generated admin password for ${admin.email}: ${admin.password}`);

  const app = createApp({ config, db });
  app.renderError = errorPage;
  shopRoutes(app); accountRoutes(app); checkoutRoutes(app); adminRoutes(app); pageRoutes(app);
  return app;
}

export default async function handler(req, res) {
  appPromise ??= boot().catch((err) => { appPromise = undefined; throw err; });
  const app = await appPromise;
  return app.handle(req, res);
}
