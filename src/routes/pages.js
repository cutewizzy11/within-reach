import { html } from '../lib/html.js';
import { layout, pageHead } from '../views/layout.js';
import { PHOTO_CREDITS } from '../photo-credits.js';
import { CATEGORY_BY_ID } from '../catalog.js';

export function pageRoutes(app) {
  app.get('/help', (ctx) => {
    const s = ctx.config.support;
    ctx.page(200, layout(ctx, {
      title: 'Help and returns',
      description: 'How to contact us, how returns work, and answers to common questions.',
      main: html`
      ${pageHead({ title: 'Help and returns', lede: 'Reach us however is easiest for you. There is always a way that does not involve a phone call.' })}
      <div class="wrap prose">
        <section aria-labelledby="contact-h">
          <h2 id="contact-h">Contact us</h2>
          <ul>
            ${s.email ? html`<li><strong>Email:</strong> <a href="mailto:${s.email}">${s.email}</a> — we reply within one working day.</li>` : ''}
            ${s.sms ? html`<li><strong>Text message:</strong> <a href="sms:${s.sms}">${s.sms}</a> — texts only, no calls.</li>` : ''}
            ${s.phone ? html`<li><strong>Phone:</strong> <a href="tel:${s.phone}">${s.phone}</a> — Monday to Friday, 9am to 5pm.</li>` : ''}
            ${s.relay ? html`<li><strong>Video relay or interpreter:</strong> ${s.relay}</li>` : ''}
          </ul>
        </section>
        <section aria-labelledby="returns-h">
          <h2 id="returns-h">Returns</h2>
          <p>You have ${ctx.config.returnDays} days from delivery to return anything. If a product does not work for your body, tell us why so we can improve the Access Facts label — then send it back and we pay the postage.</p>
          <ol>
            <li>Contact us using any method above with your order number.</li>
            <li>We email or text a prepaid return label — you do not need a printer; we can post one to you.</li>
            <li>Refunds are issued within 5 working days of the item arriving back with us.</li>
          </ol>
        </section>
        <section aria-labelledby="delivery-h">
          <h2 id="delivery-h">Delivery</h2>
          <p>Standard delivery takes 2 to 4 working days. At checkout you can ask for easy-open packaging and for parcels to be left within reach instead of requiring a signature or doorbell answer.</p>
        </section>
        <section aria-labelledby="faq-h">
          <h2 id="faq-h">Common questions</h2>
          <h3>Do I need an account to buy something?</h3>
          <p>No. You can check out as a guest. An account just saves your details and display settings for next time.</p>
          <h3>Can I change my display settings without an account?</h3>
          <p>Yes — see <a href="/display">display settings</a>. They are saved on your device either way.</p>
          <h3>What does the Access Facts label mean?</h3>
          <p>Every product shows the same set of facts: hands needed, effort to use, weight, and setup time, plus anything else that matters for that product. It is there so you can tell whether something will work for you before you buy it, not after.</p>
        </section>
      </div>`,
    }));
  });

  app.get('/accessibility', (ctx) => ctx.page(200, layout(ctx, {
    title: 'Accessibility statement',
    description: 'How this site is built to be accessible, what standard it targets, and how to report a problem.',
    main: html`
    ${pageHead({ title: 'Accessibility statement' })}
    <div class="wrap prose">
      <p>This site targets <strong>WCAG 2.2 Level AA</strong>. We test with keyboard-only navigation and screen readers (NVDA and VoiceOver), and check colour contrast on every release.</p>
      <h2>What we do</h2>
      <ul>
        <li>Every control has a visible label, not a placeholder standing in for one.</li>
        <li>Colour is never the only way information is shown (stock, errors and status also use text and icons).</li>
        <li>Motion, colour contrast, font, text size and spacing can all be changed on the <a href="/display">display settings</a> page, and are respected everywhere on the site.</li>
        <li>Forms describe errors in plain language, link back to the field, and never clear what you typed.</li>
        <li>Nothing relies on a mouse: every action is reachable and operable by keyboard alone.</li>
        <li>Session and cart never expire while you are actively using the site.</li>
      </ul>
      <h2>Known limitations</h2>
      <p>This is a demonstration build. If you find something that does not work with your assistive technology, please tell us — see below.</p>
      <h2>Report a problem</h2>
      <p>Contact us on the <a href="/help">help page</a>. Please say what you were trying to do, what device and assistive technology you used, and what happened. We aim to respond within 2 working days.</p>
    </div>`,
  })));

  app.get('/privacy', (ctx) => ctx.page(200, layout(ctx, {
    title: 'Privacy and your data',
    description: 'What we collect, why, and how to see, export or delete your data.',
    main: html`
    ${pageHead({ title: 'Privacy and your data' })}
    <div class="wrap prose">
      <h2>What we collect</h2>
      <p>An account (optional): your name, email, a securely hashed password, and the delivery and contact preferences you choose to save. An order (with or without an account): the name, address, phone and email needed to deliver it. Display settings: stored in a cookie on your device, and on your account if you sign in.</p>
      <h2>What we do not do</h2>
      <p>We do not sell your data. We do not use tracking or advertising cookies. We do not share your details with anyone except the courier needed to deliver your order.</p>
      <h2>Your choices</h2>
      <ul>
        <li>Download everything we hold about you from your <a href="/account">account page</a>.</li>
        <li>Delete your account at any time from the same page, once any order in progress has arrived. We keep the order record itself for legal and tax reasons, but remove your name, address and contact details from it.</li>
        <li>Choose how we contact you (email, text, or phone) and we will only use that channel.</li>
      </ul>
      <h2>Cookies</h2>
      <p>We use two kinds of cookie, both strictly necessary: one to remember your session and cart, and one to remember your display settings. Neither is used for tracking or advertising, so no cookie banner is shown.</p>
    </div>`,
  })));

  app.get('/credits', (ctx) => ctx.page(200, layout(ctx, {
    title: 'Photo credits',
    description: 'Who took the product photos, where they come from and under which licence.',
    main: html`
    ${pageHead({ title: 'Photo credits', lede: 'Product photos are openly licensed. Where a photo shows a similar item rather than the exact product, the product page says what it does and does not show.' })}
    <div class="wrap prose">
      <ul>
        ${Object.entries(PHOTO_CREDITS).map(([slug, c]) => html`<li><a href="/product/${slug}">${slug.replace(/-/g, ' ')}</a>: <a href="${c.page}" rel="noopener">“${c.title}”</a> by ${c.author} on ${c.source}, <a href="${c.licenseUrl}" rel="noopener">${c.license}</a>. ${c.note}</li>`)}
      </ul>
      <p>Products without a photo use an illustration until a suitable, correctly licensed photo is found.</p>
    </div>`,
  })));

  // Plain-text, no template layer, per RFC 9116.
  app.get('/.well-known/security.txt', (ctx) => {
    const email = ctx.config.support.email || 'security@example.com';
    ctx.text(200, `Contact: mailto:${email}\nPreferred-Languages: en\nCanonical: ${ctx.config.baseUrl}/.well-known/security.txt\n`);
  });

  app.get('/robots.txt', (ctx) => ctx.text(200, 'User-agent: *\nAllow: /\nDisallow: /account\nDisallow: /cart\nDisallow: /checkout\nDisallow: /admin\n'));
}
