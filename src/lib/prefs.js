// Display preferences. Stored in a plain (non-secret) cookie so the server can render the right
// <html data-*> attributes on first paint, and copied to the user's account so they follow them between devices.
// Every value is checked against this whitelist; nothing from the cookie is ever echoed raw.

export const PREF_OPTIONS = {
  theme:  [['system', 'Match my device'], ['light', 'Light'], ['dark', 'Dark'], ['contrast', 'High contrast, light'], ['contrast-dark', 'High contrast, dark']],
  text:   [['md', 'Standard'], ['lg', 'Large'], ['xl', 'Extra large'], ['xxl', 'Huge']],
  space:  [['normal', 'Standard'], ['relaxed', 'Roomy: more space between lines, words and letters']],
  font:   [['hyper', 'Atkinson Hyperlegible (designed for low vision)'], ['system', 'The font my device uses']],
  motion: [['system', 'Match my device'], ['reduce', 'Reduce: no movement or transitions']],
  calm:   [['off', 'Off'], ['on', 'On: plainer look, fewer colours, no decoration']],
};

export const PREF_LABELS = {
  theme: 'Colour and contrast',
  text: 'Text size',
  space: 'Spacing',
  font: 'Font',
  motion: 'Motion',
  calm: 'Calm mode',
};

export const PREF_DEFAULTS = { theme: 'system', text: 'md', space: 'normal', font: 'hyper', motion: 'system', calm: 'off' };

export function parsePrefs(raw = '') {
  const out = { ...PREF_DEFAULTS };
  if (typeof raw !== 'string' || raw.length > 300) return out;
  let params;
  try { params = new URLSearchParams(raw); } catch { return out; }
  for (const [key, options] of Object.entries(PREF_OPTIONS)) {
    const v = params.get(key);
    if (v && options.some(([id]) => id === v)) out[key] = v;
  }
  return out;
}

export function serializePrefs(prefs) {
  return new URLSearchParams(Object.keys(PREF_DEFAULTS).map((k) => [k, prefs[k]])).toString();
}
