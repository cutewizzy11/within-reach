import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, passwordProblem, safeEqual, randomToken, sha256 } from '../src/lib/security.js';

test('hashPassword/verifyPassword round-trip', async () => {
  const hash = await hashPassword('a correct horse battery staple 9');
  assert.ok(await verifyPassword('a correct horse battery staple 9', hash));
  assert.ok(!(await verifyPassword('wrong password entirely here', hash)));
});

test('two hashes of the same password differ (random salt)', async () => {
  const a = await hashPassword('same password used twice here');
  const b = await hashPassword('same password used twice here');
  assert.notEqual(a, b);
});

test('passwordProblem rejects short, common and personal passwords', () => {
  assert.ok(passwordProblem('short1', {}));
  assert.ok(passwordProblem('password1234', {}));
  assert.ok(passwordProblem('janedoe12345678', { name: 'Jane Doe' }));
  assert.equal(passwordProblem('correct horse battery staple 9', {}), null);
});

test('safeEqual is true only for identical strings', () => {
  assert.ok(safeEqual('abc', 'abc'));
  assert.ok(!safeEqual('abc', 'abd'));
  assert.ok(!safeEqual('abc', 'abcd'));
});

test('randomToken produces unique, sufficiently long tokens', () => {
  const a = randomToken(32);
  const b = randomToken(32);
  assert.notEqual(a, b);
  assert.ok(a.length >= 32);
});

test('sha256 is deterministic', () => {
  assert.equal(sha256('x'), sha256('x'));
  assert.notEqual(sha256('x'), sha256('y'));
});
