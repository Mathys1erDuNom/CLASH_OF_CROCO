import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avatarUrl, cookie, parseCookies, signSession, verifySession } from './auth.ts';

const SECRET = 'x'.repeat(32);

test('session tokens: valid, tampered, expired, wrong secret', () => {
  const t = signSession({ uid: '123456789012345678', exp: 2_000 }, SECRET);
  assert.deepEqual(verifySession(t, SECRET, 1_000), { uid: '123456789012345678', exp: 2_000 });
  assert.equal(verifySession(t, SECRET, 3_000), null); // expired
  assert.equal(verifySession(t, 'y'.repeat(32), 1_000), null); // other secret
  const forged = signSession({ uid: '999999999999999999', exp: 2_000 }, 'attacker'.repeat(4));
  assert.equal(verifySession(t.split('.')[0] + '.' + forged.split('.')[1], SECRET, 1_000), null); // swapped signature
  assert.equal(verifySession('garbage', SECRET), null);
  assert.equal(verifySession(undefined, SECRET), null);
});

test('cookies and avatars', () => {
  assert.deepEqual(parseCookies('a=1; croco_session=abc.def'), { a: '1', croco_session: 'abc.def' });
  assert.match(cookie('s', 'v', 60, true), /HttpOnly; SameSite=Lax; Max-Age=60; Secure$/);
  assert.equal(avatarUrl({ id: '80351110224678912', avatar: 'abc' }), 'https://cdn.discordapp.com/avatars/80351110224678912/abc.png?size=64');
  assert.match(avatarUrl({ id: '80351110224678912', avatar: null }), /embed\/avatars\/\d\.png$/);
});
