// Auto-escaping HTML template tag.
//
//   html`<p title="${userInput}">${userInput}</p>`
//
// Every interpolated value is escaped unless it is a Raw (produced by html`` or raw()).
// RULE: attributes in templates must always be double-quoted. test/templates.test.js enforces this.

class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
export const esc = (v) => String(v).replace(/[&<>"'`]/g, (c) => ESC[c]);

function render(v) {
  if (v == null || v === false || v === true) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new Raw(out);
}

/** Mark a string as already-safe. Only ever use on static markup that you wrote. */
export const raw = (s) => new Raw(String(s));
export const isRaw = (v) => v instanceof Raw;
