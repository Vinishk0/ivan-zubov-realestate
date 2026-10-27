import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createLeadHandler } from '../api/leads.mjs';

const valid = { name: 'Тестовый клиент', intent: 'buy', budget: '15 000 000', contact: '@test_client', consent: 'on', requestId: 'ab123456-1234-4321-abcd-123456789abc' };
const env = { VK_COMMUNITY_TOKEN: 'test-secret', VK_PEER_ID: '12345' };
async function request(handler, body = valid, headers = {}, method = 'POST') {
  const req = Readable.from([JSON.stringify(body)]);
  req.method = method;
  req.headers = { host: 'localhost:4173', 'content-type': 'application/json', origin: 'http://localhost:4173', ...headers };
  req.socket = { remoteAddress: '127.0.0.1' };
  const res = { setHeader() {}, writeHead(code) { this.status = code; }, end(data) { this.body = JSON.parse(data); } };
  await handler(req, res);
  return res;
}
test('sends a validated lead to configured VK recipient, preserving retry ID', async () => {
  const calls = [];
  const handler = createLeadHandler({ env, limiter: new Map(), fetchImpl: async (url, options) => { calls.push({ url, params: options.body }); return { ok: true, json: async () => ({ response: 42 }) }; } });
  assert.equal((await request(handler)).status, 200);
  assert.equal((await request(handler)).body.ok, true);
  assert.equal(calls[0].params.get('peer_id'), '12345');
  assert.equal(calls[0].params.get('random_id'), calls[1].params.get('random_id'));
  assert.match(calls[0].params.get('message'), /Тестовый клиент/);
  assert.match(calls[0].params.get('message'), /15\s000\s000/);
});
test('rejects invalid inputs, oversized bodies, honeypots and foreign origins before VK', async () => {
  const handler = createLeadHandler({ env, limiter: new Map(), fetchImpl: () => { throw new Error('must not call'); } });
  for (const body of [{ ...valid, consent: '' }, { ...valid, budget: '-1' }, { ...valid, contact: '' }, { ...valid, website: 'spam' }, { ...valid, name: 'fake\nadmin' }]) assert.equal((await request(handler, body)).status, 400);
  assert.equal((await request(handler, valid, { origin: 'https://foreign.example' })).status, 403);
  assert.equal((await request(handler, { ...valid, name: 'x'.repeat(5000) })).status, 413);
  assert.equal((await request(handler, valid, {}, 'GET')).status, 405);
});
test('missing configuration and VK failures never report delivery', async () => {
  assert.equal((await request(createLeadHandler({ env: {} }))).status, 503);
  const handler = createLeadHandler({ env, limiter: new Map(), fetchImpl: async () => ({ ok: true, json: async () => ({ error: { error_code: 901 } }) }) });
  const res = await request(handler);
  assert.equal(res.status, 502); assert.equal(res.body.ok, false);
  assert.doesNotMatch(JSON.stringify(res.body), /test-secret/);
});
test('test mode sends only to the test profile with a test label', async () => {
  let params;
  const handler = createLeadHandler({ env: { ...env, VK_RECIPIENT_DOMAIN: 'prostozubov', VK_TEST_MODE: 'true', VK_TEST_RECIPIENT_DOMAIN: 'vinishk0o0' }, limiter: new Map(), fetchImpl: async (_url, options) => { params = options.body; return { ok: true, json: async () => ({ response: 42 }) }; } });
  assert.equal((await request(handler)).status, 200);
  assert.equal(params.get('domain'), 'vinishk0o0');
  assert.equal(params.has('peer_id'), false);
  assert.match(params.get('message'), /^\[ТЕСТ\]/);
  const missingTestRecipient = createLeadHandler({ env: { ...env, VK_TEST_MODE: 'true' } });
  assert.equal((await request(missingTestRecipient)).status, 503);
});
test('production mode supports the configured profile address', async () => {
  let params;
  const handler = createLeadHandler({ env: { VK_COMMUNITY_TOKEN: 'test-secret', VK_RECIPIENT_DOMAIN: 'prostozubov', VK_TEST_MODE: 'false' }, limiter: new Map(), fetchImpl: async (_url, options) => { params = options.body; return { ok: true, json: async () => ({ response: 42 }) }; } });
  assert.equal((await request(handler)).status, 200);
  assert.equal(params.get('domain'), 'prostozubov');
  assert.doesNotMatch(params.get('message'), /^\[ТЕСТ\]/);
});
test('accepts pre-parsed request bodies from Vercel', async () => {
  const handler = createLeadHandler({ env, limiter: new Map(), fetchImpl: async () => ({ ok: true, json: async () => ({ response: 42 }) }) });
  const req = { method: 'POST', body: valid, headers: { host: 'example.test', 'content-type': 'application/json', origin: 'https://example.test' } };
  const res = { writeHead(code) { this.status = code; }, end() {} };
  await handler(req, res);
  assert.equal(res.status, 200);
});
test('throttles repeated submissions and expires throttle window', async () => {
  let time = 1;
  const handler = createLeadHandler({ env, limiter: new Map(), now: () => time, fetchImpl: async () => ({ ok: true, json: async () => ({ response: 1 }) }) });
  for (let i = 0; i < 5; i++) assert.equal((await request(handler)).status, 200);
  assert.equal((await request(handler)).status, 429);
  time += 600001;
  assert.equal((await request(handler)).status, 200);
});
