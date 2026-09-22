import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;
const isProd = env.NODE_ENV === 'production';
const port = Number(env.PORT ?? 3000);

export const config = {
  root,
  isProd,
  port,
  host: env.HOST ?? '127.0.0.1',
  baseUrl: env.BASE_URL ?? `http://localhost:${port}`,
  dbPath: env.DB_PATH ?? path.join(root, 'data', 'withinreach.db'),
  // Only honour X-Forwarded-For when explicitly told a trusted proxy sets it.
  trustProxy: env.TRUST_PROXY === '1',
  // In production the session cookie gets the Secure flag and the __Host- prefix.
  cookieSecure: isProd,
  sessionDays: 14,
  currency: env.CURRENCY ?? 'USD',
  taxRate: Math.max(0, Math.min(0.3, Number(env.TAX_RATE ?? 0))),
  shippingCents: 695,
  freeShippingOverCents: 7500,
  maxQtyPerLine: 10,
  returnDays: 60,
  support: {
    phone: env.SUPPORT_PHONE ?? '',
    sms: env.SUPPORT_SMS ?? '',
    email: env.SUPPORT_EMAIL ?? 'help@example.com',
    relay: env.SUPPORT_RELAY ?? '',
  },
};
