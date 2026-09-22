# Architecture

## Folder layout

```
src/
  server.js          entrypoint: opens the DB, wires routes, starts listening, handles shutdown
  config.js           reads process.env once, with safe defaults
  db.js                SQLite schema (DDL) + connection helper + tx() wrapper
  catalog.js           whitelists: needs, categories, traits, sort orders, countries, comm preferences
  models.js            all SQL queries (products, cart, totals) — the only file that touches SQL beyond db.js
  seed-data.js         the 29 demo products (fictional)
  seed.js              seeding + first-admin-creation logic, called by server.js and scripts/seed.js
  payments.js          the payment provider interface + the no-op demo provider (see docs/PAYMENTS.md)
  lib/
    app.js             tiny HTTP framework: router, request Context, sessions, CSRF, rate limiting, static files
    html.js             auto-escaping template tag used by every view
    security.js          password hashing, tokens, cookie helpers, timing-safe compare, rate limiter
    validate.js           field validators, each returning a plain-language error string or null
    prefs.js               display-preference (theme/text size/spacing/motion) parsing, whitelisted
  views/
    layout.js            <html> shell, header, footer, error page
    ui.js                 reusable form controls, product card, Access Facts panel, money formatting
    glyphs.js              hand-drawn SVG pictograms used instead of stock icons/photos
  routes/
    shop.js                home, shop listing + filters, product page, cart
    checkout.js             checkout form, order placement, order status page
    account.js                register, login, logout, account page, display settings
    admin.js                   minimal admin area: order list/status, stock editing
    pages.js                    help, accessibility statement, privacy, robots.txt, security.txt
public/
  css/app.css            the entire design system (tokens, components) — see docs/ACCESSIBILITY.md
  js/app.js                progressive-enhancement only; every feature works without it
  fonts/                    Atkinson Hyperlegible + Fraunces, self-hosted (no third-party font requests)
test/                     node:test suite — templates, security primitives, models, full HTTP flows
scripts/seed.js          CLI wrapper around src/seed.js
```

## Request lifecycle

1. `src/lib/app.js`'s `createApp()` builds an `http.Server`. Every request gets a `Ctx` (`src/lib/app.js`)
   wrapping the request/response, cookies, session, form body and helpers.
2. Global rate limit, then static file serving (GET only, outside `/admin`), then route matching.
3. POST requests: same-origin check (`Sec-Fetch-Site` / `Origin`), then the body is read and parsed as
   `application/x-www-form-urlencoded` (capped at 64KB), then the CSRF token is checked against the
   session before the handler runs.
4. Handlers call `ctx.page()`/`ctx.json()`/`ctx.redirect()`. Errors thrown as `HttpError` get their status
   and message rendered via `errorPage()`; anything else becomes a generic 500 (the real error is logged
   server-side only).

There is no client-side router and no API layer distinct from the page routes: forms POST directly to the
route that handles them, and the response is either a redirect (`303 See Other`, so refreshing the result
page never resubmits the form) or a re-rendered page with errors.

## Data model

SQLite (`node:sqlite`, WAL mode, foreign keys on). See `src/db.js` for the full DDL. Key points:

- **Sessions are opaque tokens.** Only `sha256(token)` is stored (`sessions.id_hash`); a stolen database
  backup cannot be replayed as a cookie. The cookie itself is `HttpOnly`, `SameSite=Lax`, and `Secure` +
  `__Host-`-prefixed in production.
- **Cart lives server-side**, keyed by session hash, not in a cookie — so it survives across tabs/devices
  once signed in, and is capped server-side (`maxQtyPerLine`, and to available stock).
- **Stock is decremented inside an `IMMEDIATE` transaction** at checkout, after re-reading current stock,
  so two shoppers cannot both buy the last unit (`src/routes/checkout.js`).
- **Money is integer cents** everywhere, never floats.
- **Orders keep a hashed guest-access token** (`orders.token_hash`) so a shopper without an account can
  still view their own order confirmation from a cookie, without the order being guessable or enumerable.
- **Deleting an account anonymises past orders** rather than deleting them outright, to preserve records
  needed for returns/tax while removing personal data (`src/routes/account.js`, `/account/delete`).

## The template layer

`src/lib/html.js` exports a tagged template `html` that HTML-escapes every interpolated value by default
(`raw()` opts out, and is used only on static markup the code itself wrote). This is the only templating
mechanism in the app — there's no separate template language, so there's exactly one place output escaping
can go wrong, and it's covered by `test/templates.test.js`, including a lint-style check that no view
concatenates a dynamic value into an unquoted or single-quoted HTML attribute.

## Adding a product

Real catalogues should replace `src/seed-data.js` with an import script (CSV, another database, whatever
you already use) that calls `seedProducts()` in `src/seed.js`, or write directly to the `products` /
`product_tags` tables. Keep the `facts` array's label order consistent across products — the whole point of
the Access Facts panel is that shoppers can compare products at a glance.
