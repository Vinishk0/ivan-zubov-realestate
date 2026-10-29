import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from './server.mjs';

let server;
let base;
before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); });

test('serves the Russian page and ES modules with correct content types', async () => {
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await page.text(), /Иван Зубов/);
  const html=await (await fetch(base)).text();
  assert.doesNotMatch(html,/id="district-(?:search|options|okrug|empty)"/);
  assert.match(html,/границами 12 административных округов/);
  for (const path of ['/content.mjs', '/okrugs.mjs', '/app.mjs', '/map.mjs', '/motion.mjs']) {
    const module = await fetch(base + path);
    assert.equal(module.status, 200, path);
    assert.match(module.headers.get('content-type'), /javascript/);
  }
});

test('does not serve Git internals, project tools or encoded traversal paths', async () => {
  for (const path of ['/.git/config', '/tools/server.mjs', '/README.md', '/assets/%2e%2e%2f.git%2fconfig']) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
});

test('supports byte-range requests required for video playback', async () => {
  const response = await fetch(`${base}/assets/hero.mp4`, { headers: {Range:'bytes=0-127'} });
  assert.equal(response.status, 206);
  assert.match(response.headers.get('content-range'), /^bytes 0-127\/\d+$/);
  assert.equal((await response.arrayBuffer()).byteLength, 128);
  assert.equal(response.headers.get('content-type'), 'video/mp4');
});

test('rejects invalid video ranges', async () => {
  const response = await fetch(`${base}/assets/hero.mp4`, { headers: {Range:'bytes=999999999-'} });
  assert.equal(response.status, 416);
  assert.match(response.headers.get('content-range'), /^bytes \*\/\d+$/);
});

test('supports HEAD without returning the video body', async () => {
  const response = await fetch(`${base}/assets/hero.mp4`, { method:'HEAD' });
  assert.equal(response.status, 200);
  assert.ok(Number(response.headers.get('content-length')) > 0);
  assert.equal((await response.arrayBuffer()).byteLength, 0);
});
