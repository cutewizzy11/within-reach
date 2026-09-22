// Shared vocabulary. "Needs" is how people describe what is hard; "traits" is what a product does about it.
// Values here are whitelists: anything coming from a query string is checked against these before it reaches SQL.

export const NEEDS = [
  { id: 'mobility',  label: 'Moving around',          short: 'Mobility',     glyph: 'cane',   tone: 'sun',       blurb: 'Walking, standing, reaching, transferring, using a wheelchair.' },
  { id: 'vision',    label: 'Seeing',                 short: 'Vision',       glyph: 'magnifier', tone: 'sky',    blurb: 'Blind, low vision, light sensitivity.' },
  { id: 'hearing',   label: 'Hearing',                short: 'Hearing',      glyph: 'bell',   tone: 'rose',      blurb: 'Deaf, hard of hearing, tinnitus.' },
  { id: 'dexterity', label: 'Gripping and handling',  short: 'Dexterity',    glyph: 'jar',    tone: 'persimmon', blurb: 'Arthritis, tremor, weak grip, one hand, limited reach.' },
  { id: 'cognitive', label: 'Remembering and focusing', short: 'Cognition',  glyph: 'timer',  tone: 'sage',      blurb: 'Memory, attention, dementia, ADHD, brain injury.' },
  { id: 'speech',    label: 'Communicating',          short: 'Speech',       glyph: 'board',  tone: 'sky',       blurb: 'Non-speaking, limited speech, aphasia.' },
  { id: 'sensory',   label: 'Sensory comfort',        short: 'Sensory',      glyph: 'earmuffs', tone: 'rose',    blurb: 'Autism, sensory processing, noise or touch sensitivity.' },
];

export const CATEGORIES = [
  { id: 'kitchen',   label: 'Kitchen and eating' },
  { id: 'dressing',  label: 'Getting dressed' },
  { id: 'bathroom',  label: 'Bathroom and bathing' },
  { id: 'mobility',  label: 'Walking and reaching' },
  { id: 'home',      label: 'Around the home' },
  { id: 'hearing',   label: 'Alerts and listening' },
  { id: 'vision',    label: 'Reading and labelling' },
  { id: 'tech',      label: 'Tech and voice' },
  { id: 'memory',    label: 'Memory and routine' },
  { id: 'comms',     label: 'Communication' },
  { id: 'calm',      label: 'Calm and comfort' },
];

export const TRAITS = [
  { id: 'one-hand',   label: 'One-handed',           help: 'Can be used with one hand.' },
  { id: 'low-grip',   label: 'No tight grip needed', help: 'Works with a light touch, a press or a whole-hand push.' },
  { id: 'tactile',    label: 'Tactile markings',     help: 'Raised or textured markings you can find by touch.' },
  { id: 'audio',      label: 'Speaks aloud',         help: 'Gives spoken feedback.' },
  { id: 'big-print',  label: 'Large print',          help: 'Large, high-contrast text or symbols.' },
  { id: 'voice',      label: 'Voice control',        help: 'Can be controlled by voice.' },
  { id: 'flash',      label: 'Flashing light alert', help: 'Uses light instead of, or as well as, sound.' },
  { id: 'vibrate',    label: 'Vibrating alert',      help: 'Uses vibration instead of, or as well as, sound.' },
  { id: 'lightweight',label: 'Lightweight',          help: 'Easy to lift and carry.' },
  { id: 'no-setup',   label: 'No setup',             help: 'Ready to use straight from the box.' },
  { id: 'calm',       label: 'Quiet and calm',       help: 'No sudden sounds or bright flashes.' },
  { id: 'pictures',   label: 'Picture-based',        help: 'Uses pictures or symbols, not just words.' },
];

export const TONES = ['sun', 'sky', 'rose', 'persimmon', 'sage', 'forest'];

export const SORTS = [
  { id: 'featured', label: 'Our picks first',  sql: 'featured DESC, name COLLATE NOCASE' },
  { id: 'price-asc', label: 'Price, low to high', sql: 'price_cents ASC, name COLLATE NOCASE' },
  { id: 'price-desc', label: 'Price, high to low', sql: 'price_cents DESC, name COLLATE NOCASE' },
  { id: 'name', label: 'Name, A to Z', sql: 'name COLLATE NOCASE' },
];

export const COMM_PREFS = [
  { id: 'email', label: 'Email only', help: 'We will only write to you. No calls and no texts.' },
  { id: 'sms',   label: 'Text message only', help: 'Short texts about your order. No calls.' },
  { id: 'phone', label: 'A phone call is fine', help: 'We may call if we need to check something.' },
];

export const COUNTRIES = [
  ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['IE', 'Ireland'], ['AU', 'Australia'], ['NZ', 'New Zealand'],
];

export const ORDER_STATUSES = ['received', 'packing', 'shipped', 'delivered', 'cancelled'];

export const STATUS_COPY = {
  received:  'We have your order and will start packing it soon.',
  packing:   'We are packing your order now.',
  shipped:   'Your order is on its way.',
  delivered: 'Your order has been delivered.',
  cancelled: 'This order was cancelled.',
};

export const byId = (list) => new Map(list.map((x) => [x.id, x]));
export const NEED_BY_ID = byId(NEEDS);
export const CATEGORY_BY_ID = byId(CATEGORIES);
export const TRAIT_BY_ID = byId(TRAITS);
