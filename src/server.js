import { config } from './config.js';
import { openDb } from './db.js';
import { createApp } from './lib/app.js';
import { errorPage } from './views/layout.js';
import { seedProducts } from './seed.js';
import { shopRoutes } from './routes/shop.js';
import { accountRoutes } from './routes/account.js';
import { checkoutRoutes } from './routes/checkout.js';
import { adminRoutes } from './routes/admin.js';
import { pageRoutes } from './routes/pages.js';

const db = openDb(config.dbPath);
if (db.prepare('SELECT COUNT(*) AS n FROM products').get().n === 0) {
  console.log(`No products found — seeding the demo catalogue into ${config.dbPath}`);
  seedProducts(db);
}

const app = createApp({ config, db });
app.renderError = errorPage;

shopRoutes(app);
accountRoutes(app);
checkoutRoutes(app);
adminRoutes(app);
pageRoutes(app);

setInterval(() => app.sessions.purgeExpired(), 3600_000).unref();

const server = app.server();
server.listen(config.port, config.host, () => {
  console.log(`Within Reach listening on http://${config.host}:${config.port} (${config.isProd ? 'production' : 'development'})`);
});

function shutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down...`);
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
