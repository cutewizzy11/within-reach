# Security

## Threat model

A public storefront handling guest and registered-customer PII (name, address, phone, email) and order
history, with no card data ever touching this server (see [PAYMENTS.md](PAYMENTS.md)). Primary risks
considered: account takeover, session hijacking, CSRF, XSS/injection, price/stock manipulation, and
information disclosure (both of other customers' data and of the server's own internals).

## What's implemented

**Passwords.** `scrypt` (N=32768, r=8, p=1, 64-byte output; `src/lib/security.js`), a memory-hard KDF
appropriate for a single-process Node server (bcrypt/argon2 would need a native dependency, which this
project deliberately avoids — see the README). Parameters are stored alongside the hash so they can be
raised later without breaking existing hashes. Policy is length-based (12–128 chars) per NIST 800-63B, plus
a blocklist of obvious passwords and a check against the user's own name/email — not composition rules
("must contain a symbol"), which push people toward predictable substitutions.

**Sessions.** Random 32-byte tokens; only `sha256(token)` is ever stored, so a database read cannot be
replayed as a cookie. Cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production (and `__Host-`-prefixed,
which additionally pins it to the exact host with `Path=/` and no `Domain` attribute — see MDN's cookie
prefix docs). Sessions rotate (new token, old row's cart migrated across) on login, registration and logout,
which closes the standard session-fixation window. `endSession()` on logout deletes the row outright,
including its cart — deliberate, since logout is frequently used on shared/assistive devices.

**CSRF.** Belt and braces: every state-changing route requires (a) a `Sec-Fetch-Site`/`Origin` check that
rejects cross-origin form submission outright, and (b) a per-session token compared with
`crypto.timingSafeEqual` (`src/lib/app.js`, `checkOrigin()` + the CSRF check in `app.handle`). Both must
pass; browsers that don't send `Sec-Fetch-Site` (very old ones) still fall back to the token.

**XSS / injection.** All HTML is produced by one auto-escaping template tag (`src/lib/html.js`) — there is
no second template mechanism to forget to escape. All SQL uses parameterised queries via `node:sqlite`'s
prepared statements (`src/models.js`); the one `LIKE` search escapes `%`/`_`/`\` explicitly. CSP is
locked down to `'self'` for scripts/styles/fonts/connect, `default-src 'none'`, no inline scripts or
styles anywhere in the codebase (`securityHeaders()` in `src/lib/app.js`). A test (`test/templates.test.js`)
statically checks every view for unquoted/single-quoted dynamic HTML attributes, which is the one escaping
mistake the template tag itself can't catch.

**Rate limiting.** In-memory, per-IP-plus-key fixed window (`RateLimiter` in `src/lib/security.js`):
global request cap, plus tighter limits on login (also keyed by attempted email, so guessing one account
is slowed hard even from many IPs is *not* fully solved — see "Known limitations"), registration, checkout
and account deletion.

**Account enumeration.** Login returns the same error and takes roughly the same time whether the email
exists or not (`dummyVerify()` burns a real scrypt hash computation against a dummy account when the email
doesn't match anything). Registration's duplicate-email message is intentionally vague. `/admin` returns
`404`, not `403`, to unauthorised users, so the existence of an admin area isn't confirmed.

**Headers.** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy`,
`Cross-Origin-Resource-Policy`, a restrictive `Permissions-Policy`, and `Strict-Transport-Security` in
production. Responses are `Cache-Control: no-store` by default; only static assets are cached.

**Input handling.** All filter parameters (need/category/trait/sort — `parseFilters` in `src/models.js`)
are checked against fixed whitelists before touching SQL. Redirect targets are validated to be same-origin
relative paths (`safeNext()` in `src/lib/validate.js`, and `ctx.redirect()`'s own belt-and-braces check in
`src/lib/app.js`), closing open-redirect abuse of the post-login `?next=`.

**Concurrency.** Stock is re-checked and decremented inside a SQLite `IMMEDIATE` transaction at the moment
of checkout (`src/routes/checkout.js`), not when added to cart, so two shoppers racing for the last unit
can't both succeed.

**Logging.** Server logs (`console.error`/`console.log` in `src/lib/app.js`) never include IPs, emails,
form bodies or query strings — only a request id, path, status and timing. 500 errors log the real message
server-side; the response to the browser is always a generic message.

## Known limitations / explicit trade-offs

- **Rate limiter is in-memory and per-process.** Fine for a single instance; if you scale to multiple
  processes/machines, move it to a shared store (e.g. Redis) or a reverse-proxy layer, or a determined
  attacker distributing requests across processes will not be slowed.
- **No email verification or MFA.** This is a demonstration app; a production deployment handling real
  orders should add email verification on registration and consider MFA for admin accounts at minimum.
- **No lockout after repeated failed logins beyond rate limiting** — deliberate, since account lockout is
  itself a denial-of-service vector against a known email; rate limiting was judged the better trade-off.
- **Single admin role.** There's no granular permission system; anyone with the `admin` role can see and
  update all orders and stock. Fine for a small operation, not for a larger team.
- **CSP has no `report-uri`/`report-to`.** Add one if you want visibility into blocked violations in
  production.
- **Dependency-free is also a trade-off.** No `npm audit` supply-chain surface, but also no battle-tested
  library doing the CSRF/session/rate-limiting work — this code has not had a third-party security audit.
  Read it (it's small on purpose) before relying on it for anything sensitive.

## Before you take this to production

1. Put a real payment provider behind [docs/PAYMENTS.md](docs/PAYMENTS.md) — this app never should, and
   currently does not, touch card numbers.
2. Set `TRUST_PROXY=1` **only** if you have a reverse proxy you control setting `X-Forwarded-For` — never
   set it if the server is directly internet-facing, or clients can spoof their own rate-limit key.
3. Run behind TLS termination (so `NODE_ENV=production` cookies actually get `Secure`), and set a real
   `BASE_URL`.
4. Move the rate limiter to shared storage if running more than one instance.
5. Add automated dependency-free security scanning of your own additions (this repo has none to scan, but
   yours will grow) and consider a third-party penetration test before handling real payment flows.
6. Back up `data/*.db` — see [docs/OPERATIONS.md](OPERATIONS.md).

## Reporting a vulnerability

See `/.well-known/security.txt` (served by `src/routes/pages.js`, RFC 9116) — it points to the
`SUPPORT_EMAIL` you configure.
