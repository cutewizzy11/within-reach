// Small, explicit validators. Each returns an error message (plain language, says how to fix it) or null.

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export const email = (v) => {
  if (!v) return 'Enter your email address.';
  if (v.length > 254 || !EMAIL.test(v)) return 'Enter an email address like name@example.com.';
  return null;
};

export const required = (v, what, max = 120) => {
  if (!v) return `Enter ${what}.`;
  if (v.length > max) return `Use ${max} characters or fewer for ${what}.`;
  return null;
};

export const optionalMax = (v, what, max) => (v.length > max ? `Use ${max} characters or fewer for ${what}.` : null);

export const phone = (v, { required: req = false } = {}) => {
  if (!v) return req ? 'Enter a phone number for text messages.' : null;
  if (!/^[+()\d][\d\s().+-]{5,24}$/.test(v)) return 'Enter a phone number using digits, spaces and + ( ) - only.';
  return null;
};

export const oneOf = (v, allowed, what) => (allowed.includes(v) ? null : `Choose ${what}.`);

/** Local paths only: blocks open redirects such as //evil.example or /\evil.example. */
export const safeNext = (v) => (typeof v === 'string' && /^\/(?![/\\])[\x21-\x7E]{0,200}$/.test(v) ? v : '');

export function collect(pairs) {
  const errors = {};
  for (const [k, msg] of pairs) if (msg) errors[k] = msg;
  return errors;
}
