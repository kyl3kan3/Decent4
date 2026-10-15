import test from 'node:test';
import assert from 'node:assert/strict';
import { createHealthAuth } from '../health-auth.mjs';

async function check(authenticate, path = '/api/context-aware/health-context') {
  let status;
  let continued = false;
  const req = { path, headers: { 'x-user-id': '370' } };
  const res = { status: value => { status = value; return res; }, json: value => value };
  await createHealthAuth(authenticate)(req, res, () => { continued = true; });
  return { status, continued, req };
}
test('unconfigured or unavailable verifier fails closed', async () => {
  assert.equal((await check()).status, 503);
  assert.equal((await check(async () => { throw Error('backend down'); })).status, 503);
});
test('x-user-id alone never authenticates', async () => {
  const result = await check(async () => null);
  assert.equal(result.status, 401);
  assert.equal(result.continued, false);
});
test('verified session identity overrides a forged header', async () => {
  const result = await check(async () => ({ id: 42 }));
  assert.equal(result.continued, true);
  assert.equal(result.req.userId, 42);
});
test('malformed identity is rejected; health probe remains public', async () => {
  assert.equal((await check(async () => ({ id: '42' }))).status, 401);
  assert.equal((await check(undefined, '/health')).continued, true);
});
