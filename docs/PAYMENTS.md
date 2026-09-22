# Payments

**This application never receives, stores, transmits or logs a card number, CVV or expiry date.** The
shipped `demo` provider (`src/payments.js`) takes no money at all — it exists only so the checkout flow can
be exercised end to end in the demo. Do not deploy this as-is and expect to get paid.

## Why there's no payment code here

Handling card numbers directly puts your whole server in **PCI DSS SAQ D** scope — the most demanding tier,
requiring a formal audit. Routing payment through a hosted page or drop-in widget from a PCI Level 1
provider (Stripe, Adyen, Braintree, etc.) instead keeps this server in the much lighter **SAQ A** scope,
because card data never touches it. That trade-off is why `payments.js` is a small adapter interface rather
than a payment form.

## Integrating a real provider

1. **Pick a hosted/redirect or drop-in-iframe integration** (Stripe Checkout, Stripe Elements/Payment
   Element, Adyen Drop-in, Braintree Drop-in). Avoid any integration that has you POST raw card fields to
   your own server.
2. Implement the provider interface in `src/payments.js`:
   ```js
   export function getPaymentProvider(config) {
     return {
       name: 'stripe',
       methods: [{ id: 'card', label: 'Card', help: 'You will enter your card on a secure Stripe page.' }],
       async begin(order, ctx) {
         // Create a Checkout Session (server-side, using your secret key from an env var — never commit it).
         // Return { redirectTo: session.url } and send the shopper there instead of straight to /order/:number.
       },
     };
   }
   ```
3. In `src/routes/checkout.js`, after the order is created, call `provider.begin(order, ctx)`. If it
   returns `redirectTo`, redirect there instead of `/order/:number`.
4. Add a webhook route (e.g. `POST /webhooks/stripe`) that verifies the provider's signature (using their
   SDK/secret, from an env var) and marks the order paid — **never** trust the redirect-back URL alone to
   confirm payment; always confirm via a server-to-server webhook.
5. Store the provider's own reference (`payment_intent_id` etc.), not card data, against the order. Add a
   column for it in `src/db.js` if you need to look orders up by it.
6. Keep secret keys in environment variables (extend `.env.example`), never in source control.

## What stays true either way

- Card data still never touches your database, your logs, or your CSP (which is why `connect-src` in
  `securityHeaders()` will need the provider's domain added once you integrate one, e.g.
  `connect-src 'self' https://api.stripe.com` and a `script-src`/`frame-src` entry for the drop-in
  widget's own domain).
- Refunds should go through the provider's API/dashboard, triggered from your admin area or theirs — this
  app's `/admin` intentionally has no "refund" button, since that's provider-specific.
