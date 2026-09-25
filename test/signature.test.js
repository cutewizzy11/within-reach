import { test } from 'node:test';
import assert from 'node:assert/strict';
import { braille } from '../src/views/art.js';
import { accessStrip } from '../src/views/ui.js';
import { TRAITS } from '../src/catalog.js';
import { startTestServer } from './helpers.js';

const count = (s, re) => (s.match(re) ?? []).length;

test('braille("reach") draws five cells with the correct raised dots (4+2+1+2+3)', () => {
  const svg = braille('reach').toString();
  assert.equal(count(svg, /class="cell"/g), 5);
  assert.equal(count(svg, /class="on"/g), 12);
  assert.match(svg, /aria-hidden="true"/); // decorative; the caption says what it is
});

test('braille ignores characters that are not letters', () => {
  assert.equal(count(braille('a-b 1!').toString(), /class="cell"/g), 2);
});

test('accessStrip shows hands, effort and setup, trimmed to the first phrase of each fact', () => {
  const p = { facts: [['Hands needed', 'One hand, any part of the body'], ['Effort to use', 'Light downward press'], ['Weight', '190 g'], ['Setup', 'Insert batteries (2 min)']] };
  const html = accessStrip(p).toString();
  assert.match(html, /<dd>One hand<\/dd>/);
  assert.match(html, /<dd>Light downward press<\/dd>/);
  assert.match(html, /<dd>Insert batteries<\/dd>/);
  assert.ok(!html.includes('190 g'));
});

test('every trait has a spoken phrase for the sentence search', () => {
  for (const t of TRAITS) assert.ok(t.phrase && t.phrase.length > 2, `${t.id} has no phrase`);
});

test('the sentence search on the home page submits to /shop and returns matching products', async (t) => {
  const s = await startTestServer();
  t.after(s.close);
  const home = await (await s.get('/')).text();
  assert.match(home, /<form class="sentence" action="\/shop" method="get">/);
  assert.match(home, /<label for="ss-need">Find me something for<\/label>/);
  const res = await s.get('/shop?need=vision&trait=tactile');
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /Talking Kitchen Scale/);
  assert.ok(!body.includes('Rocker Knife')); // not a vision product
});
