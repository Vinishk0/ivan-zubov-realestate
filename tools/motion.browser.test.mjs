import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from './server.mjs';
import { content } from '../content.mjs';
import { mkdir } from 'node:fs/promises';

let server, browser, base;
const errors = [];
before(async () => {
  server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true,
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] } : {}) });
  await mkdir('artifacts/motion', { recursive: true });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
async function open(options = {}) {
  const context = await browser.newContext(options);
  // Map tiles are an external dependency; geometry/selection remains real and local.
  await context.route('https://tile.openstreetmap.org/**', route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => { errors.push(error.message); console.log('Browser error:', error.message); });
  await page.goto(base, {waitUntil: 'domcontentloaded'});
  await page.locator('.scroll-progress').waitFor({ state: 'attached' });
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}
async function assertFits(page, label) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, label);
}
async function waitSettled(page) {
  await page.waitForFunction(() => !document.getAnimations().some(animation => animation.playState === 'running' && !animation.effect?.target?.matches?.('.hero-slide,.scroll-icon')));
}

test('editorial layout and every dialog work at desktop, tablet and touch widths', async () => {
  for (const width of [1440, 768, 390, 320]) {
    const { context, page } = await open({ viewport: { width, height: 960 }, hasTouch: width < 600 });
    assert.equal(await page.locator('.case-card').count(), 4);
    await waitSettled(page);
    await page.screenshot({ path: `artifacts/motion/hero-${width}.png` });
    await page.locator('#cases').scrollIntoViewIfNeeded();
    await waitSettled(page);
    await assertFits(page, `case grid ${width}`);
    const columns = await page.locator('.case-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns, width <= 700 ? 1 : 2);
    for (const item of content.cases) {
      await page.locator(`[data-case="${item.id}"]`).click();
      await page.locator('#detail-dialog[open]').waitFor();
      assert.match(await page.locator('#dialog-content').innerText(), /Результат/);
      assert.equal(await page.locator('#detail-dialog').evaluate(el => el.scrollWidth > el.clientWidth), false, `dialog ${item.id} at ${width}`);
      await page.keyboard.press('Escape');
      await page.locator('#detail-dialog').waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => document.body.classList.contains('dialog-open')), false);
      assert.equal(await page.locator(`[data-case="${item.id}"]`).evaluate(el => el === document.activeElement), true);
    }
    for (let index = 0; index < content.services.length; index++) {
      await page.locator(`[data-service="${index}"]`).click();
      await page.locator('#detail-dialog[open]').waitFor();
      if (index === 3) assert.match(await page.locator('#dialog-content').innerText(), /Бесплатный подбор предоставляется/);
      await page.locator('#dialog-close').click();
      await page.locator('#detail-dialog').waitFor({ state: 'hidden' });
    }
    if (width < 900) {
      await page.locator('.menu-toggle').click();
      await page.locator('#mobile-nav').waitFor({ state: 'visible' });
      await page.locator('#mobile-nav a[href="#faq"]').click();
      assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
    }
    for (const id of ['about', 'cases', 'services', 'moscow', 'reviews', 'faq', 'request', 'contacts']) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await waitSettled(page);
      await assertFits(page, `${id} at ${width}`);
    }
    const broken = await page.locator('img:not(.leaflet-tile)').evaluateAll(images => images.filter(img => img.complete && !img.naturalWidth).map(img => img.src));
    assert.deepEqual(broken, []);
    await page.locator('#cases').screenshot({ path: `artifacts/motion/cases-${width}.png` });
    await page.locator('#services').screenshot({ path: `artifacts/motion/services-${width}.png` });
    await context.close();
  }
});

test('rapid review/FAQ/map changes resolve to the last chosen state; theme persists', async () => {
  const { context, page } = await open({ viewport: { width: 1280, height: 900 } });
  await page.locator('#reviews').scrollIntoViewIfNeeded();
  await waitSettled(page);
  await page.locator('#review-next').evaluate(el => { el.click(); el.click(); el.click(); });
  await page.waitForFunction(() => document.querySelector('#review-count').textContent.startsWith('04'));
  assert.equal(await page.locator('#review-name').innerText(), content.reviews[3].name);
  await page.locator('#review-read').click();
  assert.match(await page.locator('#dialog-content').innerText(), /117623714/);
  await page.keyboard.press('Escape');
  await page.locator('#detail-dialog').waitFor({ state: 'hidden' });
  const faq = page.locator('.faq-item').first();
  await faq.locator('summary').click();
  await waitSettled(page);
  assert.equal(await faq.getAttribute('open'), '');
  await faq.locator('summary').evaluate(el => { el.click(); el.click(); el.click(); });
  await waitSettled(page);
  assert.equal(await faq.getAttribute('open'), null);
  await faq.locator('summary').focus();
  await page.keyboard.press('Enter');
  await waitSettled(page);
  assert.equal(await faq.getAttribute('open'), '');
  assert.equal(await faq.evaluate(el => el.style.height), '');
  await page.locator('.map-pin').first().waitFor({ state: 'attached' });
  assert.equal(await page.locator('.map-pin').count(), 12);
  await page.locator('.map-pin[data-okrug="sao"]').evaluate(el => el.click());
  await page.locator('.map-pin[data-okrug="svao"]').evaluate(el => el.click());
  await page.waitForFunction(() => document.querySelector('#district-kicker').textContent.includes('СВАО'));
  assert.equal(await page.locator('.map-pin[aria-pressed=true]').getAttribute('data-okrug'), 'svao');
  await page.locator('#map-reset').click();
  await page.locator('#theme-select').selectOption('sage');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'sage');
  await page.reload();
  await page.locator('.scroll-progress').waitFor({ state: 'attached' });
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'sage');
  await context.close();
});

test('slideshow zoom really pauses, stops offscreen and respects reduced motion changes', async () => {
  const { context, page } = await open({ viewport: { width: 1440, height: 960 } });
  await page.waitForTimeout(1700);
  const zoomTime = () => page.locator('.hero-slide.is-active').evaluate(el => el.getAnimations().find(a => a.animationName === 'cover-depth')?.currentTime);
  assert.ok(await zoomTime() > 0);
  await page.locator('#slideshow-toggle').click();
  await page.waitForTimeout(100);
  const paused = await zoomTime();
  await page.waitForTimeout(150);
  assert.equal(await zoomTime(), paused);
  await page.locator('#slideshow-toggle').click();
  await page.locator('#faq').scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  const offscreen = await zoomTime();
  await page.waitForTimeout(150);
  assert.equal(await zoomTime(), offscreen);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.faq-item summary').first().click();
  await page.locator('[data-case="school-apartment"]').click();
  await page.keyboard.press('Escape');
  await page.locator('#detail-dialog').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0);
  await context.close();
});

test('form focus, validation, failure, retry and successful submission (mock delivery)', async () => {
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true });
  let deliveries = 0;
  await context.route('**/api/leads', async route => {
    deliveries++;
    await route.fulfill({ status: deliveries === 1 ? 503 : 200, contentType: 'application/json', body: JSON.stringify(deliveries === 1 ? { ok: false, message: 'Тестовая ошибка доставки' } : { ok: true }) });
  });
  await page.locator('#request').scrollIntoViewIfNeeded();
  await page.locator('#lead-form button[type=submit]').click();
  assert.equal(deliveries, 0, 'native validation prevents an incomplete submission');
  await page.locator('[name="name"]').fill('Тестовый клиент');
  await page.locator('[name="budget"]').fill('7000000');
  await page.locator('[name="contact"]').fill('@motion_test');
  await page.locator('[name="consent"]').check();
  await page.locator('#lead-form button[type=submit]').click();
  await page.waitForFunction(() => document.querySelector('#lead-form').dataset.state === 'error');
  assert.match(await page.locator('#lead-status').innerText(), /Тестовая ошибка/);
  assert.equal(await page.locator('#lead-form button[type=submit]').isEnabled(), true);
  await page.locator('#lead-form button[type=submit]').click();
  await page.waitForFunction(() => document.querySelector('#lead-form').dataset.state === 'success');
  assert.match(await page.locator('#lead-status').innerText(), /Заявка доставлена/);
  assert.equal(deliveries, 2);
  assert.equal(await page.locator('#lead-form').getAttribute('aria-busy'), null);
  await page.screenshot({ path: 'artifacts/motion/form-success.png' });
  await context.close();
});

test('static first screen remains visible with JavaScript disabled; no runtime errors', async () => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(base);
  assert.equal(await page.locator('h1').isVisible(), true);
  assert.equal(await page.locator('.about-copy h2').isVisible(), true);
  assert.equal(await page.locator('.hero-slide.is-active').evaluate(el => getComputedStyle(el).opacity), '1');
  await assertFits(page, 'without JavaScript');
  await context.close();
  assert.deepEqual(errors, []);
});
