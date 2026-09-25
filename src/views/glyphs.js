import { raw } from '../lib/html.js';

// Hand-drawn pictograms on a 96x96 grid, stroke only, so they inherit `color`.
// They are decorative: the product name is always next to them, so they are aria-hidden.
const G = {
  cup: '<path d="M22 34h44v24a16 16 0 0 1-16 16H38a16 16 0 0 1-16-16z"/><path d="M66 40h6a8 8 0 0 1 0 16h-6"/><path d="M34 20c0 5 6 5 6 10M46 20c0 5 6 5 6 10"/>',
  jar: '<rect x="26" y="34" width="44" height="44" rx="8"/><rect x="22" y="18" width="52" height="16" rx="5"/><path d="M38 18v16M48 18v16M58 18v16"/>',
  knife: '<path d="M12 64h72C80 50 66 40 48 40 30 40 16 50 12 64z"/><path d="M30 40c0-9 6-16 15-16h14"/>',
  scale: '<rect x="16" y="28" width="64" height="50" rx="10"/><path d="M30 50a18 18 0 0 1 36 0"/><path d="M48 50l8-8"/><path d="M34 66h28"/>',
  kettle: '<path d="M26 44h40l4 32H22z"/><path d="M28 44c0-12 8-20 18-20s18 8 18 20"/><path d="M70 50h8c6 0 6 14 0 14h-8"/><path d="M42 24V16h8v8"/>',
  spoon: '<ellipse cx="48" cy="26" rx="13" ry="17"/><path d="M48 43v41"/><path d="M40 60h16M40 68h16"/>',
  hook: '<path d="M32 84V32a14 14 0 0 1 28 0v8"/><path d="M60 40l-9 9"/><circle cx="60" cy="62" r="7"/><path d="M60 69v15"/>',
  sock: '<path d="M32 14h28v34l20 12a11 11 0 0 1-5 20H44c-9 0-12-7-12-14z"/><path d="M32 26h28"/>',
  laces: '<path d="M22 24l52 44M74 24L22 68"/><circle cx="22" cy="24" r="5"/><circle cx="74" cy="24" r="5"/><circle cx="22" cy="68" r="5"/><circle cx="74" cy="68" r="5"/>',
  grabber: '<path d="M18 80L66 32"/><path d="M66 32l14-8M66 32l8 14"/><path d="M80 24l4 8M74 46l8 2"/><circle cx="20" cy="78" r="5"/>',
  cane: '<path d="M60 84V32a15 15 0 0 0-30 0"/><path d="M30 32h-8"/><path d="M52 60h16"/>',
  stool: '<rect x="18" y="34" width="60" height="12" rx="6"/><path d="M26 46l-6 34M70 46l6 34M48 46v34"/>',
  sponge: '<rect x="32" y="12" width="32" height="32" rx="9"/><path d="M48 44v40"/><circle cx="42" cy="24" r="2.5"/><circle cx="54" cy="30" r="2.5"/><circle cx="46" cy="36" r="2.5"/>',
  pills: '<rect x="12" y="28" width="72" height="40" rx="9"/><path d="M36 28v40M60 28v40"/><circle cx="24" cy="48" r="4"/><rect x="42" y="42" width="12" height="12" rx="3"/><path d="M66 44h12v8H66z"/>',
  bell: '<path d="M30 68V44a18 18 0 0 1 36 0v24z"/><path d="M22 68h52"/><path d="M42 76a6 6 0 0 0 12 0"/><path d="M12 22l7 6M84 22l-7 6M48 8v9"/>',
  clock: '<circle cx="48" cy="50" r="26"/><path d="M48 34v16l10 6"/><path d="M14 40v20M8 44v12M82 40v20M88 44v12"/>',
  speaker: '<path d="M14 38h16l20-16v52L30 58H14z"/><path d="M62 36a16 16 0 0 1 0 24M70 26a30 30 0 0 1 0 44"/>',
  watch: '<rect x="28" y="26" width="40" height="44" rx="11"/><path d="M34 26l4-14h20l4 14M34 70l4 14h20l4-14"/><path d="M48 38v11l8 5"/>',
  magnifier: '<circle cx="40" cy="40" r="23"/><path d="M57 57l25 25"/><path d="M30 40h20M40 30v20"/>',
  dots: '<circle cx="34" cy="26" r="7" fill="currentColor"/><circle cx="62" cy="26" r="7"/><circle cx="34" cy="48" r="7"/><circle cx="62" cy="48" r="7" fill="currentColor"/><circle cx="34" cy="70" r="7" fill="currentColor"/><circle cx="62" cy="70" r="7"/>',
  notebook: '<rect x="22" y="12" width="52" height="72" rx="6"/><path d="M36 12v72M46 32h18M46 44h18M46 56h11"/>',
  board: '<rect x="12" y="20" width="72" height="56" rx="7"/><path d="M48 20v56M12 48h72"/><circle cx="30" cy="34" r="7"/><path d="M60 28h14v14H60zM24 58l12 10M36 58L24 68M60 62h14"/>',
  button: '<circle cx="48" cy="54" r="27"/><circle cx="48" cy="54" r="14"/><path d="M30 20c11-8 25-8 36 0"/><path d="M22 30c17-14 35-14 52 0"/>',
  timer: '<circle cx="48" cy="52" r="28"/><path d="M48 52V30"/><path d="M48 52a22 22 0 0 1 22 0"/><path d="M38 14h20M48 14v8"/>',
  pad: '<rect x="12" y="28" width="72" height="42" rx="13"/><path d="M28 38v22M40 38v22M52 38v22M64 38v22"/>',
  earmuffs: '<path d="M22 56V44a26 26 0 0 1 52 0v12"/><rect x="12" y="52" width="18" height="28" rx="9"/><rect x="66" y="52" width="18" height="28" rx="9"/>',
  plug: '<rect x="24" y="34" width="48" height="42" rx="11"/><path d="M40 34V16M56 34V16"/><path d="M40 55h16"/>',
  lever: '<circle cx="30" cy="48" r="17"/><path d="M30 41h44a7 7 0 0 1 0 14H30"/>',
  keyboard: '<rect x="8" y="28" width="80" height="42" rx="7"/><path d="M20 42h4M32 42h4M44 42h4M56 42h4M68 42h4M24 56h48"/>',
  stand: '<path d="M16 80h64"/><path d="M26 80l14-52h36l-9 52"/><path d="M46 44h22"/>',
  phone: '<rect x="26" y="10" width="44" height="76" rx="11"/><rect x="36" y="22" width="24" height="16" rx="3"/><circle cx="48" cy="66" r="7"/>',
  truck: '<path d="M8 24h48v36H8z"/><path d="M56 36h16l12 14v10H56z"/><circle cx="26" cy="66" r="7"/><circle cx="70" cy="66" r="7"/>',
  returns: '<path d="M20 40h44a16 16 0 0 1 0 32H30"/><path d="M34 26L20 40l14 14"/>',
  list: '<path d="M14 28h68M14 48h68M14 68h44"/>',
  chat: '<path d="M12 20h72v46H44L26 82V66H12z"/><path d="M28 38h40M28 50h24"/>',
  check: '<path d="M20 50l20 20 38-42"/>',
  cart: '<path d="M10 16h14l10 44h44l8-30H30"/><circle cx="40" cy="76" r="6"/><circle cx="72" cy="76" r="6"/>',
};

export const GLYPH_NAMES = Object.keys(G);

export function glyph(name, { size = 96, cls = 'glyph', width = 5 } = {}) {
  const body = G[name] ?? G.button;
  return raw(`<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`);
}
