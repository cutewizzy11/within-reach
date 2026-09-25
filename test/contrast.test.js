import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../public/css/app.css', import.meta.url), 'utf8');

function tokens(block) {
  const out = {};
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2];
  return out;
}
const block = (re) => {
  const m = css.match(re);
  assert.ok(m, `CSS block not found: ${re}`);
  return m[1];
};

const THEMES = {
  light: tokens(block(/:root \{([^}]*)\}/)),
  dark: tokens(block(/:root\[data-theme="dark"\] \{([^}]*)\}/)),
  contrast: tokens(block(/:root\[data-theme="contrast"\] \{([^}]*)\}/)),
  'contrast-dark': tokens(block(/:root\[data-theme="contrast-dark"\] \{([^}]*)\}/)),
};

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground token, background token, minimum ratio]. 4.5 = normal text (AA), 3 = large text / UI components / icons.
const TEXT = [
  ['ink', 'bg'], ['ink', 'surface'], ['ink', 'surface-2'], ['ink-soft', 'bg'], ['ink-soft', 'surface'],
  ['link', 'bg'], ['link', 'surface'], ['link-visited', 'surface'],
  ['brand-ink', 'brand'], ['brand', 'surface'], ['brand', 'brand-soft'],
  ['cta-ink', 'cta'], ['hdr-ink', 'hdr-bg'], ['banner-ink', 'banner-bg'],
  ['error', 'surface'], ['error', 'error-bg'], ['ok', 'ok-bg'], ['warn', 'warn-bg'], ['warn', 'surface'],
].map(([f, b]) => [f, b, 4.5]);
const UI = [['focus', 'surface'], ['focus', 'bg'], ['hdr-focus', 'hdr-bg'], ['line-strong', 'surface'], ['cta-edge', 'surface']].map(([f, b]) => [f, b, 3]);
const TONES = ['sun', 'sky', 'rose', 'persimmon', 'sage', 'forest'];
const TONE_PAIRS = TONES.flatMap((t) => [[`t-${t}-fg`, `t-${t}-bg`, 4.5], ['ink', `t-${t}-bg`, 4.5], ['ink-soft', `t-${t}-bg`, 4.5]]);

for (const [name, t] of Object.entries(THEMES)) {
  test(`contrast: ${name} theme meets WCAG AA for text, UI and product tiles`, () => {
    const failures = [];
    for (const [f, b, min] of [...TEXT, ...UI, ...TONE_PAIRS]) {
      assert.ok(t[f] && t[b], `${name}: missing token ${f} or ${b}`);
      const r = ratio(t[f], t[b]);
      if (r < min) failures.push(`${f} ${t[f]} on ${b} ${t[b]} = ${r.toFixed(2)} (needs ${min})`);
    }
    assert.deepEqual(failures, []);
  });
}

test('contrast: the OS-dark (system) block matches the explicit dark theme, so the two cannot drift', () => {
  const media = tokens(block(/@media \(prefers-color-scheme: dark\) \{ :root:not\([^{]*\{([^}]*)\}/));
  assert.deepEqual(media, THEMES.dark);
});
