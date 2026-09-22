# Operations

## Fastest path to a live URL: Render

The repo ships a `render.yaml` (a [Render Blueprint](https://render.com/docs/blueprint-spec)) that deploys
this app with one click — see the "Deploy to Render" button in the README. It provisions a free web
service, sets `HOST=0.0.0.0`, `TRUST_PROXY=1` (safe here because Render, not arbitrary internet traffic, is
what sets `X-Forwarded-For`) and a generated `ADMIN_PASSWORD` secret, and runs `npm run seed && npm start`
on boot. The free tier's disk is ephemeral, so the catalogue and any admin-created orders reset on every
redeploy or restart — fine for a demo, not for real data (see "Database" below for something durable).

Find the generated admin password in the Render dashboard's environment tab, or in the boot logs the first
time it starts. For a non-demo deployment, fork the repo, edit `render.yaml` to point at your fork, and set
your own `ADMIN_EMAIL`/`ADMIN_PASSWORD` values (or a paid plan with a persistent disk, so `DB_PATH` survives
restarts).

## Environment variables

See `.env.example` for the full list with defaults. Highlights:

| Variable | Notes |
|---|---|
| `NODE_ENV` | Set to `production` to enable `Secure`/`__Host-` cookies and HSTS. |
| `PORT`, `HOST` | Defaults to `3000` / `127.0.0.1`. Bind to `0.0.0.0` only behind a reverse proxy. |
| `BASE_URL` | Used in `security.txt`; set to your real public URL. |
| `DB_PATH` | SQLite file path. Defaults to `./data/withinreach.db`. |
| `TRUST_PROXY` | Only set to `1` if a reverse proxy you control sets `X-Forwarded-For`. See SECURITY.md. |
| `TAX_RATE` | Decimal, e.g. `0.08`. Capped at 0.3 server-side as a sanity check. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Read once by `npm run seed`. Leave `ADMIN_PASSWORD` unset to have a strong one generated and printed once. |
| `SUPPORT_PHONE` / `SUPPORT_SMS` / `SUPPORT_EMAIL` / `SUPPORT_RELAY` | Shown on `/help` and the footer. Leave blank to hide that channel — never make phone the only option. |

There is no `.env` loader (no `dotenv` dependency, per the zero-deps policy) — export these in your process
manager (systemd unit, Docker `--env-file`, PM2 ecosystem file, etc.).

## Running it

```bash
npm run seed     # one-time: creates the DB, seeds products, creates the first admin
npm start        # production/foreground
npm run dev      # --watch, for local development
```

`src/server.js` handles `SIGINT`/`SIGTERM` by closing the HTTP server and the database cleanly, with a
5-second hard-exit fallback if something hangs.

## Reverse proxy / TLS

Terminate TLS at a reverse proxy (nginx, Caddy, a cloud load balancer) in front of this app; it speaks
plain HTTP only. Forward `Host` unchanged. If (and only if) your proxy is trusted and sets
`X-Forwarded-For`, set `TRUST_PROXY=1` so rate limiting uses the real client IP.

## Database

SQLite in WAL mode (`src/db.js`) — fine for a single-writer-process deployment of this size. Back up the
three WAL-related files together:

```bash
sqlite3 data/withinreach.db "VACUUM INTO 'backup-$(date +%F).db'"
```

`VACUUM INTO` produces a consistent single-file snapshot even while the app is running, which is simpler
and safer than copying `.db`/`.db-wal`/`.db-shm` directly.

## Scaling beyond one process

This app assumes a single Node process (SQLite, and the in-memory rate limiter and session sweep both
assume one process owns the database file). To run more than one instance:

- Move to a server-based database (Postgres) — `src/db.js` and `src/models.js` are the only files that
  would need to change; the rest of the app talks to `db.prepare(...).get/all/run(...)`, a shape most
  Postgres client wrappers can mimic, or route it through a thin adapter.
- Move the rate limiter (`src/lib/security.js`, `RateLimiter`) to shared storage (Redis, or your proxy's
  own rate limiting).
- Sessions already live in the database, so they work fine across multiple app instances as-is.

## Monitoring

Set `LOG_REQUESTS=1` for structured per-request JSON logs (id, method, path, status, timing — never IPs,
emails or bodies; see `src/lib/app.js`). 500-level errors are always logged with their real message and
stack, separately from that flag. Wire your process manager or a log shipper to capture stdout/stderr.
