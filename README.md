# Within Reach

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/cutewizzy11/within-reach)

**Live demo:** https://within-reach-xi.vercel.app (Vercel; demo data resets whenever the serverless function
recycles, see [docs/OPERATIONS.md](docs/OPERATIONS.md)). Prefer your own copy? The button above deploys it on Render.

An accessible e-commerce storefront for adaptive and assistive everyday products — built to be genuinely
usable by people with vision, hearing, mobility, dexterity, speech, cognitive and sensory-processing
differences, not just technically compliant.

Every product is described with an **Access Facts** label (hands needed, effort, weight, setup time, and
more) instead of only marketing copy, so a shopper can tell whether something will work for their body
*before* they buy it. Display settings (text size, contrast, spacing, motion, font, a "calm mode") are
first-class and follow the shopper's account across devices.

This is a demonstration catalogue with 29 fictional products and a no-op "demo" payment method — see
[docs/PAYMENTS.md](docs/PAYMENTS.md) before connecting a real payment provider.

## Stack, and why

Plain Node.js (`node:http`, `node:sqlite`, `node:test`) with **zero runtime dependencies**. No framework,
no bundler, no build step, no client-side JavaScript framework. This is a deliberate choice for an
accessibility-focused project:

- Nothing between the request and the response that could silently change security headers, escaping
  behaviour, or add third-party trackers.
- Server-rendered HTML means every page works with JavaScript fully disabled — a real need for some
  screen-reader and switch-access setups. JS in `public/js/app.js` is progressive enhancement only.
- A small, auditable codebase (see `docs/SECURITY.md`) rather than a large dependency tree.
- Requires Node.js 22.13+ (for stable `node:sqlite`).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit together.

## Quick start

```bash
npm install       # installs nothing (zero deps) but validates package.json / engines
cp .env.example .env
npm run seed      # creates data/withinreach.db, seeds products, creates an admin account
npm start         # http://localhost:3000
```

The seed script prints the admin email and a generated password once — store it in a password manager.
Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` to choose your own instead.

Run the test suite:

```bash
npm test
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — request lifecycle, folder layout, data model.
- [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) — the standard targeted, what was built and why, how to test it.
- [docs/SECURITY.md](docs/SECURITY.md) — threat model, what is and isn't handled, and known trade-offs.
- [docs/PAYMENTS.md](docs/PAYMENTS.md) — how to connect a real, PCI-compliant payment provider.
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — deploying, backups, environment variables.

## Project status

This is a working demonstration, not an audited production system. Read
[docs/SECURITY.md](docs/SECURITY.md) — particularly "Before you take this to production" — before using it
with real customer data or real payments.
