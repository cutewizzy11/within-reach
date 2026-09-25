import { raw } from '../lib/html.js';

// Product illustrations: filled, two-tone drawings on a 120x120 grid.
// Colours come from CSS (see .art in public/css/app.css) so each product takes its tone and themes still work:
//   a = tone colour   b = darker tone   c = lighter tone   k = charcoal   m = metal   w = white   y = yellow
//   st-* = stroked (not filled) shapes, hl = soft highlight line
// They are decorative (aria-hidden): the product name is always next to them. Real photos, when present,
// replace these entirely (see plate() in ui.js).
const A = {
  knife: `<path class="m" d="M12 62h96c-2 24-22 40-48 40S14 86 12 62z"/><path class="c" opacity=".75" d="M20 66h80c-4 16-20 28-40 28S24 82 20 66z"/><path class="hl" d="M22 72c8 14 22 22 38 22"/><rect class="b" x="50" y="48" width="20" height="16" rx="4"/><rect class="a" x="32" y="14" width="56" height="38" rx="17"/><path class="hl" d="M42 26c7-6 20-7 32-2"/>`,
  jar: `<rect class="c" x="28" y="44" width="64" height="64" rx="14"/><rect class="w" opacity=".55" x="35" y="56" width="10" height="42" rx="5"/><rect class="a" x="22" y="22" width="76" height="28" rx="9"/><g class="b"><rect x="31" y="27" width="5" height="18" rx="2"/><rect x="43" y="27" width="5" height="18" rx="2"/><rect x="55" y="27" width="5" height="18" rx="2"/><rect x="67" y="27" width="5" height="18" rx="2"/><rect x="79" y="27" width="5" height="18" rx="2"/></g><path class="hl" d="M30 30h10"/>`,
  scale: `<rect class="m" x="14" y="52" width="92" height="46" rx="14"/><rect class="c" x="22" y="28" width="76" height="32" rx="10"/><rect class="k" x="34" y="66" width="52" height="22" rx="5"/><g class="a"><rect x="40" y="72" width="8" height="10" rx="1.5"/><rect x="52" y="72" width="8" height="10" rx="1.5"/><rect x="64" y="72" width="8" height="10" rx="1.5"/></g><circle class="a" cx="24" cy="80" r="4"/><circle class="a" cx="96" cy="80" r="4"/><path class="hl" d="M30 40h30"/>`,
  kettle: `<rect class="k" x="12" y="100" width="96" height="9" rx="4.5"/><path class="m" d="M26 100V62l10-4v42z"/><path class="a" d="M34 50h46l10 48H24z"/><path class="c" opacity=".5" d="M42 54h10l-4 42H36z"/><ellipse class="b" cx="57" cy="50" rx="23" ry="6"/><circle class="k" cx="57" cy="42" r="5"/><path class="a" d="M86 62l20-16 5 8-19 18z"/><path class="st-k" d="M32 60c-16 0-16 28 0 30" stroke-width="7"/>`,
  spoon: `<ellipse class="m" cx="60" cy="30" rx="20" ry="24"/><ellipse class="c" opacity=".6" cx="53" cy="23" rx="7" ry="11"/><rect class="a" x="49" y="52" width="22" height="58" rx="11"/><g class="b"><rect x="49" y="68" width="22" height="6"/><rect x="49" y="82" width="22" height="6"/><rect x="49" y="96" width="22" height="6"/></g>`,
  hook: `<rect class="a" x="46" y="56" width="28" height="52" rx="14"/><rect class="b" x="46" y="72" width="28" height="6"/><path class="st-m" d="M60 56V30a14 14 0 1 1 14 14" stroke-width="6"/><circle class="w" cx="92" cy="82" r="14"/><g class="k"><circle cx="87" cy="77" r="2.4"/><circle cx="97" cy="77" r="2.4"/><circle cx="87" cy="87" r="2.4"/><circle cx="97" cy="87" r="2.4"/></g>`,
  sock: `<path class="a" d="M40 10h34v42l26 18a16 16 0 0 1-8 32H48c-12 0-17-9-17-19z"/><rect class="b" x="40" y="10" width="34" height="14"/><path class="c" d="M31 88c0 8 5 14 17 14h44a16 16 0 0 0 8-8z" opacity=".85"/><path class="st-k" d="M40 24C24 24 14 40 14 62M74 24c14 0 22 12 22 30" stroke-width="5"/>`,
  laces: `<path class="st-a" d="M20 28L100 92" stroke-width="11"/><path class="st-b" d="M100 28L20 92" stroke-width="11"/><g class="m"><circle cx="20" cy="28" r="7"/><circle cx="100" cy="28" r="7"/><circle cx="20" cy="92" r="7"/><circle cx="100" cy="92" r="7"/></g><rect class="k" x="48" y="48" width="24" height="24" rx="6"/><circle class="w" cx="60" cy="60" r="4.5"/>`,
  cane: `<path class="st-a" d="M36 42a22 22 0 0 1 44 0" stroke-width="14"/><rect class="m" x="76" y="42" width="8" height="58" rx="3"/><rect class="k" x="76" y="62" width="8" height="5"/><rect class="k" x="76" y="78" width="8" height="5"/><rect class="b" x="73" y="98" width="14" height="10" rx="3"/><path class="hl" d="M42 34a16 16 0 0 1 24-8"/>`,
  stool: `<rect class="c" x="26" y="8" width="68" height="28" rx="10"/><rect class="m" x="34" y="34" width="6" height="12"/><rect class="m" x="80" y="34" width="6" height="12"/><rect class="a" x="14" y="42" width="92" height="16" rx="8"/><path class="st-k" d="M28 60l-8 40M92 60l8 40M60 60v40" stroke-width="7"/><g class="b"><rect x="12" y="98" width="16" height="8" rx="4"/><rect x="92" y="98" width="16" height="8" rx="4"/><rect x="52" y="98" width="16" height="8" rx="4"/></g>`,
  sponge: `<path class="st-a" d="M24 108C30 88 40 72 58 56" stroke-width="11"/><rect class="b" x="44" y="20" width="62" height="46" rx="12" transform="rotate(22 75 43)"/><rect class="y" x="44" y="14" width="62" height="38" rx="12" transform="rotate(22 75 33)"/><g class="w" opacity=".75"><circle cx="66" cy="32" r="3.4"/><circle cx="82" cy="26" r="3"/><circle cx="90" cy="42" r="3.6"/><circle cx="74" cy="46" r="2.8"/></g>`,
  bell: `<rect class="w" x="26" y="30" width="68" height="72" rx="16"/><circle class="y" cx="60" cy="58" r="21"/><circle class="w" opacity=".65" cx="60" cy="58" r="10"/><path class="st-y" d="M60 10v9M20 24l7 7M100 24l-7 7" stroke-width="6"/><circle class="a" cx="60" cy="88" r="7"/>`,
  speaker: `<rect class="k" x="18" y="24" width="84" height="78" rx="14"/><circle class="a" cx="40" cy="38" r="4.5"/><circle class="a" cx="56" cy="38" r="4.5"/><circle class="m" cx="60" cy="70" r="23"/><circle class="k" cx="60" cy="70" r="14"/><circle class="m" cx="60" cy="70" r="5"/><path class="st-a" d="M108 58a18 18 0 0 1 0 24" stroke-width="5"/>`,
  watch: `<rect class="k" x="44" y="6" width="32" height="42" rx="8"/><rect class="k" x="44" y="72" width="32" height="42" rx="8"/><rect class="m" x="24" y="28" width="72" height="64" rx="22"/><circle class="w" cx="60" cy="60" r="26"/><g class="a"><rect x="58" y="36" width="4" height="8" rx="2"/><rect x="58" y="76" width="4" height="8" rx="2"/><rect x="36" y="58" width="8" height="4" rx="2"/><rect x="76" y="58" width="8" height="4" rx="2"/></g><path class="st-k" d="M60 60V44M60 60l12 8" stroke-width="4"/>`,
  dots: `<rect class="c" x="16" y="20" width="88" height="80" rx="12"/><g class="a"><circle cx="38" cy="42" r="9"/><circle cx="60" cy="42" r="9"/><circle cx="82" cy="42" r="9"/><circle cx="38" cy="62" r="9"/><circle cx="60" cy="62" r="9"/><circle cx="82" cy="62" r="9"/><circle cx="38" cy="82" r="9"/><circle cx="60" cy="82" r="9"/><circle cx="82" cy="82" r="9"/></g><g class="w" opacity=".65"><circle cx="35" cy="39" r="3"/><circle cx="57" cy="39" r="3"/><circle cx="79" cy="39" r="3"/><circle cx="35" cy="59" r="3"/><circle cx="57" cy="59" r="3"/><circle cx="79" cy="59" r="3"/></g>`,
  notebook: `<rect class="a" x="26" y="10" width="70" height="100" rx="8"/><rect class="w" x="40" y="18" width="48" height="84" rx="4"/><g class="k"><rect x="46" y="34" width="36" height="5"/><rect x="46" y="50" width="36" height="5"/><rect x="46" y="66" width="36" height="5"/><rect x="46" y="82" width="26" height="5"/></g><g class="m"><circle cx="38" cy="26" r="5"/><circle cx="38" cy="44" r="5"/><circle cx="38" cy="62" r="5"/><circle cx="38" cy="80" r="5"/><circle cx="38" cy="96" r="5"/></g>`,
  board: `<rect class="w" x="12" y="16" width="96" height="88" rx="10"/><rect class="c" x="20" y="24" width="26" height="34" rx="5"/><rect class="c" x="47" y="24" width="26" height="34" rx="5"/><rect class="c" x="74" y="24" width="26" height="34" rx="5"/><rect class="c" x="20" y="62" width="26" height="34" rx="5"/><rect class="c" x="47" y="62" width="26" height="34" rx="5"/><rect class="c" x="74" y="62" width="26" height="34" rx="5"/><circle class="a" cx="33" cy="41" r="8"/><rect class="b" x="53" y="33" width="14" height="14" rx="2"/><path class="k" d="M87 33l8 14H79z"/><circle class="k" cx="60" cy="79" r="8"/><rect class="a" x="80" y="72" width="14" height="14" rx="7"/>`,
  button: `<path class="k" d="M16 80v18c0 8 20 12 44 12s44-4 44-12V80z"/><ellipse class="m" cx="60" cy="80" rx="44" ry="13"/><path class="a" d="M26 70c0-16 15-28 34-28s34 12 34 28c0 7-15 13-34 13S26 77 26 70z"/><path class="c" opacity=".55" d="M34 62c4-10 14-16 26-16"/><path class="hl" d="M36 58c4-8 12-12 22-13"/><path class="st-a" d="M104 46a20 20 0 0 1 0 22" stroke-width="5"/>`,
  timer: `<rect class="k" x="50" y="6" width="20" height="9" rx="3"/><circle class="k" cx="60" cy="66" r="45"/><circle class="w" cx="60" cy="66" r="37"/><path class="a" d="M60 66V29A37 37 0 1 1 23 66Z"/><circle class="k" cx="60" cy="66" r="5"/>`,
  pad: `<rect class="a" x="10" y="28" width="100" height="66" rx="18"/><path class="st-c" d="M36 32v58M60 32v58M84 32v58" stroke-width="3.5" opacity=".8"/><path class="st-c" d="M14 60h92" stroke-width="3.5" opacity=".8"/><path class="hl" d="M22 38c8-4 24-4 32-4"/>`,
  earmuffs: `<path class="st-k" d="M28 66V54a32 32 0 0 1 64 0v12" stroke-width="9"/><rect class="a" x="10" y="54" width="30" height="50" rx="15"/><rect class="a" x="80" y="54" width="30" height="50" rx="15"/><rect class="b" x="34" y="62" width="9" height="34" rx="4.5"/><rect class="b" x="77" y="62" width="9" height="34" rx="4.5"/>`,
  plug: `<rect class="m" x="42" y="6" width="9" height="26" rx="2"/><rect class="m" x="69" y="6" width="9" height="26" rx="2"/><rect class="w" x="22" y="28" width="76" height="78" rx="20"/><rect class="k" x="46" y="48" width="8" height="17" rx="2"/><rect class="k" x="66" y="48" width="8" height="17" rx="2"/><circle class="k" cx="60" cy="82" r="6"/><circle class="a" cx="84" cy="44" r="4.5"/>`,
  lever: `<circle class="m" cx="38" cy="60" r="30"/><circle class="c" opacity=".7" cx="30" cy="50" r="11"/><rect class="a" x="40" y="50" width="72" height="21" rx="10.5"/><circle class="b" cx="38" cy="60" r="11"/>`,
  stand: `<rect class="k" x="28" y="8" width="76" height="54" rx="8"/><rect class="w" x="34" y="14" width="64" height="42" rx="3"/><g class="c"><rect x="40" y="22" width="52" height="4"/><rect x="40" y="32" width="52" height="4"/><rect x="40" y="42" width="34" height="4"/></g><path class="st-m" d="M66 62L50 96" stroke-width="7"/><rect class="b" x="22" y="96" width="64" height="11" rx="5.5"/><rect class="a" x="70" y="90" width="18" height="10" rx="3"/>`,
  phone: `<rect class="k" x="8" y="12" width="104" height="26" rx="13"/><rect class="a" x="18" y="40" width="84" height="70" rx="14"/><g class="w"><rect x="30" y="52" width="18" height="12" rx="3"/><rect x="51" y="52" width="18" height="12" rx="3"/><rect x="72" y="52" width="18" height="12" rx="3"/><rect x="30" y="68" width="18" height="12" rx="3"/><rect x="51" y="68" width="18" height="12" rx="3"/><rect x="72" y="68" width="18" height="12" rx="3"/><rect x="30" y="84" width="18" height="12" rx="3"/><rect x="51" y="84" width="18" height="12" rx="3"/><rect x="72" y="84" width="18" height="12" rx="3"/></g>`,
  // Products that ship with a photo still get a fallback so the tile never goes blank if the file is removed.
  grabber: `<path class="st-a" d="M22 108L78 40" stroke-width="9"/><path class="st-k" d="M78 40l20-10M78 40l12 20" stroke-width="7"/><circle class="k" cx="30" cy="98" r="8"/>`,
  pills: `<rect class="w" x="10" y="34" width="100" height="56" rx="12"/><g class="c"><rect x="16" y="40" width="20" height="44" rx="6"/><rect x="38" y="40" width="20" height="44" rx="6"/><rect x="60" y="40" width="20" height="44" rx="6"/><rect x="82" y="40" width="22" height="44" rx="6"/></g><g class="a"><circle cx="26" cy="62" r="6"/><rect x="43" y="55" width="10" height="14" rx="5"/><circle cx="70" cy="62" r="6"/><rect x="88" y="55" width="10" height="14" rx="5"/></g>`,
  clock: `<rect class="k" x="10" y="36" width="100" height="58" rx="14"/><rect class="b" x="18" y="44" width="84" height="42" rx="8"/><g class="c"><rect x="26" y="52" width="10" height="26" rx="2"/><rect x="42" y="52" width="10" height="26" rx="2"/><rect x="68" y="52" width="10" height="26" rx="2"/><rect x="84" y="52" width="10" height="26" rx="2"/></g>`,
  magnifier: `<circle class="c" cx="50" cy="50" r="34"/><circle class="st-k" cx="50" cy="50" r="34" stroke-width="9"/><path class="st-a" d="M76 76l28 28" stroke-width="13"/><path class="hl" d="M32 40c4-8 10-12 18-13"/>`,
};

export const ART_NAMES = Object.keys(A);

export function art(name, cls = 'art') {
  return raw(`<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${A[name] ?? A.button}</svg>`);
}

// Braille: standard six-dot cells (dot numbers 1-3 down the left column, 4-6 down the right). Used as a brand motif:
// the home hero background and the footer sign-off spell out "reach". Decorative, so aria-hidden; the caption says what it is.
const BRAILLE = {
  a: [1], b: [1, 2], c: [1, 4], d: [1, 4, 5], e: [1, 5], f: [1, 2, 4], g: [1, 2, 4, 5], h: [1, 2, 5], i: [2, 4], j: [2, 4, 5],
  k: [1, 3], l: [1, 2, 3], m: [1, 3, 4], n: [1, 3, 4, 5], o: [1, 3, 5], p: [1, 2, 3, 4], q: [1, 2, 3, 4, 5], r: [1, 2, 3, 5],
  s: [2, 3, 4], t: [2, 3, 4, 5], u: [1, 3, 6], v: [1, 2, 3, 6], w: [2, 4, 5, 6], x: [1, 3, 4, 6], y: [1, 3, 4, 5, 6], z: [1, 3, 5, 6],
};
const DOT_POS = { 1: [0, 0], 2: [0, 1], 3: [0, 2], 4: [1, 0], 5: [1, 1], 6: [1, 2] };

export function braille(word, cls = 'braille') {
  const letters = [...String(word).toLowerCase()].filter((c) => BRAILLE[c]);
  const cellW = 34;
  const w = letters.length * cellW;
  const cells = letters.map((ch, i) => {
    const raised = new Set(BRAILLE[ch]);
    const dots = Object.entries(DOT_POS).map(([n, [cx, cy]]) => {
      const x = i * cellW + 8 + cx * 14;
      const y = 8 + cy * 14;
      return raised.has(Number(n)) ? `<circle class="on" cx="${x}" cy="${y}" r="5"/>` : `<circle class="off" cx="${x}" cy="${y}" r="1.8"/>`;
    }).join('');
    return `<g class="cell">${dots}</g>`;
  }).join('');
  return raw(`<svg class="${cls}" viewBox="0 0 ${w} 44" width="${w}" height="44" aria-hidden="true" focusable="false">${cells}</svg>`);
}
