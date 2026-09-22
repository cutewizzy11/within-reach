# Accessibility

Target: **WCAG 2.2 Level AA**, with several AAA-level choices made deliberately (contrast, no time limits).
This document is both a statement of what was built and a checklist for reviewing changes.

## Structural / semantic

- One `<h1>` per page; heading levels never skip (`views/layout.js` `pageHead()`, product cards accept a
  `headingLevel` so they nest correctly whether shown on the home page, shop grid or related-products rail).
- Landmarks: `<header>`, `<nav aria-label="…">` (there are several `<nav>`s, each labelled so they're
  distinguishable), `<main id="main" tabindex="-1">`, `<footer>`. A skip link (`.skip-link`) is the first
  focusable element on every page and jumps to `#main`.
- Breadcrumbs (`<nav aria-label="Breadcrumb">`) use `aria-current="page"` on the current item, not a styled
  span pretending to be a link.

## Forms

- Every field has a **visible, persistent `<label>`** — never a placeholder standing in for one
  (`views/ui.js` `field()`, `select()`, `radios()`, `checkbox()`).
- Hints and errors are linked to their field with `aria-describedby`, and errors also set
  `aria-invalid="true"`.
- Radio/checkbox groups are `<fieldset>`/`<legend>`, not divs with a bold label (`radios()` in `ui.js`).
- On a failed submit: the page re-renders (not a client-side-only error), **nothing the user typed is
  lost**, an error summary lists every problem in plain language and links to each field (`errorSummary()`
  in `ui.js`), and (progressive enhancement, `public/js/app.js`) focus moves to that summary so a
  screen-reader or keyboard user isn't left at the top of the page unaware anything happened.
- Errors are written as complete sentences telling you what to do ("Enter an email address like
  name@example.com"), not "Invalid input" or a field name alone.
- No field is auto-submitted, no page reloads without user action, and forms never silently clear on error.

## Colour, contrast, motion — all user-controllable

`/display` (`src/routes/account.js`, `src/lib/prefs.js`) exposes, as real controls (not a single "dark
mode" toggle):

| Setting | Options |
|---|---|
| Colour and contrast | System, light, dark, high-contrast light, high-contrast dark |
| Text size | Standard, large, extra large, huge |
| Spacing | Standard, or roomy (wider line/word/letter spacing) |
| Font | Atkinson Hyperlegible (designed for low vision) or the device's own font |
| Motion | System, or fully reduced (no animation/transitions) |
| Calm mode | Off, or a plainer look with fewer decorative elements |

These are plain HTML `data-*` attributes on `<html>` (`views/layout.js`), driven entirely by CSS custom
properties in `public/css/app.css` — there is no per-component dark-mode CSS to keep in sync, and every one
of these also honours the matching OS-level media feature (`prefers-color-scheme`,
`prefers-reduced-motion`) when set to "System". Settings are stored in a cookie (works with no account) and,
once signed in, on the account so they follow the shopper to another device.

All body text meets **7:1** contrast in the default theme (AAA), and the high-contrast themes use pure
black/white with fully saturated accent colours for anyone who needs more.

## Perceivability without colour or sound

- Stock status, form errors and order status are always paired with text and/or an icon, never colour alone.
- Pictograms (`views/glyphs.js`) are decorative and `aria-hidden="true"` — the product name/label is always
  present as real text next to them, so nothing is conveyed by the icon alone.
- Product images are hand-drawn line pictograms rather than photographs: no reliance on photo detail that's
  hard to make out at low vision, and no informative content is ever "baked into" an image with no text
  alternative.

## Reading level and plain language

Every product has an `easy_read` one-to-two sentence plain-language summary (aim: ~9–11 year reading age),
shown prominently above the full description (`product__easy` in `src/routes/shop.js`). Error messages,
button labels and page copy avoid jargon and idiom throughout.

## Time, sessions, and no dead ends

- Sessions last 14 days and slide forward on use — nothing expires mid-task. Cart contents are never lost.
- Rate limiting responds with a plain-language wait time, not a bare "429".
- No CAPTCHAs anywhere in the flow.

## Communication choice

Checkout and the account page ask **how** to be contacted (email / text / phone) and the footer always
offers a non-phone contact method — a deaf or non-speaking shopper is never required to make a phone call
to get help or complete an order. Delivery preferences (`easy_open`, `leave_in_reach`) and free-text
delivery notes are first-class checkout fields, not an afterthought.

## Testing this was built against

- Keyboard only: tab through every page, confirm visible focus (`:focus-visible` in `app.css`) and that
  nothing requires a mouse (drag interactions, hover-only menus).
- Screen readers: NVDA + Firefox, VoiceOver + Safari, spot-checked on the shop filters, checkout form and
  the Access Facts table (which uses a real `<table>` with `<th scope="row">`, not a styled grid).
- Zoom to 400% / text-only zoom to 200%: layouts are CSS Grid/Flexbox with wrapping, not fixed widths.
- `prefers-reduced-motion` and `prefers-color-scheme` at the OS level, then overridden via `/display`.
- Automated: `test/templates.test.js` checks the escaping/attribute-quoting invariants that everything
  else depends on. There is no automated axe/Lighthouse run in this repo yet — see "Known limitations"
  below.

## Known limitations

- No automated accessibility-scanner (axe-core / Lighthouse CI) is wired into `npm test` yet. Recommended
  next step: add `@axe-core/playwright` (or similar) against the rendered pages in CI.
- Sign language / video relay support (`support.relay` in config) is a text description, not an embedded
  video relay widget.
- Only English is implemented; there's no `lang` switching or translated content.

If you find something that doesn't work with your assistive technology, the `/accessibility` page in the
running app has a live "report a problem" pointer to `/help`.
