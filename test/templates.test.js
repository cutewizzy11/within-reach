import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { html, esc, raw } from '../src/lib/html.js';

test('html`` escapes interpolated values by default', () => {
  const evil = '<script>alert(1)</script>';
  const out = html`<p>${evil}</p>`.toString();
  assert.ok(!out.includes('<script>'));
  assert.ok(out.includes('&lt;script&gt;'));
});

test('html`` escapes quotes so attribute injection is not possible', () => {
  const evil = '" onmouseover="alert(1)';
  const out = html`<input value="${evil}">`.toString();
  assert.ok(!out.includes('" onmouseover='));
  assert.ok(out.includes('&quot;'));
});

test('raw() bypasses escaping — only ever used on static markup in this codebase', () => {
  const out = html`<div>${raw('<b>bold</b>')}</div>`.toString();
  assert.ok(out.includes('<b>bold</b>'));
});

test('arrays of nodes are flattened and each item escaped', () => {
  const out = html`<ul>${['<a>', '<b>'].map((x) => html`<li>${x}</li>`)}</ul>`.toString();
  assert.ok(out.includes('&lt;a&gt;'));
  assert.ok(out.includes('&lt;b&gt;'));
});

test('false/null/undefined render as nothing, not the string "false"', () => {
  const out = html`<p>${false}${null}${undefined}</p>`.toString();
  assert.equal(out, '<p></p>');
});

test('every view file interpolates attribute values inside double quotes', () => {
  // A single-quoted or unquoted dynamic attribute would let `"` in user input break out of it.
  const files = fs.readdirSync(new URL('../src/views/', import.meta.url)).filter((f) => f.endsWith('.js'))
    .concat(fs.readdirSync(new URL('../src/routes/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => `../routes/${f}`));
  for (const rel of files) {
    const full = new URL(rel.startsWith('../') ? rel : rel, new URL('../src/views/', import.meta.url));
    const src = fs.readFileSync(full, 'utf8');
    // Look for `word=${...}` or `word='${...}'` without surrounding double quotes.
    const bad = src.match(/\s[a-zA-Z-]+=\$\{/g) || [];
    assert.deepEqual(bad, [], `${rel} has an unquoted dynamic attribute: ${bad.join(', ')}`);
    const badSingle = src.match(/\s[a-zA-Z-]+='\$\{/g) || [];
    assert.deepEqual(badSingle, [], `${rel} has a single-quoted dynamic attribute: ${badSingle.join(', ')}`);
  }
});
