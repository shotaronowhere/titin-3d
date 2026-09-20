import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(pathToFileURL(resolve('index.html')).href);
  await page.waitForFunction(() => window.__titinBoot?.ready === true);
  assert.ok(requests.every((url) => url.startsWith('file:')));
  const initialRequests = [...requests];
  const network = requests.filter((url) => /^https?:/.test(url));
  assert.deepEqual(network, []);
  await page.locator('#audienceEvidence').click();
  await page.locator('#tabSources').click();
  // A user-activated external link still works: intercept only its exact destination.
  await page.context().route('https://github.com/shotaronowhere/titin-3d', (r) => r.fulfill({
    contentType: 'text/html', body: '<title>Repository navigation captured</title>' }));
  const popup = page.waitForEvent('popup');
  await page.locator('#projectRepository').click();
  const repo = await popup;
  await repo.waitForLoadState();
  assert.equal(repo.url(), 'https://github.com/shotaronowhere/titin-3d');
  await repo.close();
  const failure = await browser.newPage({ viewport: { width: 320, height: 568 } });
  await failure.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
      return String(kind).toLowerCase().startsWith('webgl') ? null : original.call(this, kind, ...args);
    };
  });
  await failure.goto(pathToFileURL(resolve('index.html')).href);
  await expect(failure.locator('#err')).toBeVisible();
  for (const link of await failure.locator('#err a').all()) await expect(link).toBeInViewport({ ratio: 1 });
  assert.equal(await failure.locator('#err').evaluate((n) => n.scrollWidth > n.clientWidth), false);
  await failure.screenshot({ path: 'evidence/linkedin-readiness/2026-09-20/raw/recovery-phone.png' });
  writeFileSync('evidence/linkedin-readiness/2026-09-20/offline-review.json', JSON.stringify({
    file_boot: 'pass', initial_requests: initialRequests, startup_http_requests: network,
    repository_click: 'Correct HTTPS popup (exact destination intercepted; remote availability not tested)',
    recovery_viewport: { width: 320, height: 568 }, recovery_links_visible: true,
    recovery_panel_horizontal_overflow: false,
  }, null, 2)+'\n');
  console.log('Offline successful boot has no HTTP requests; repository click and 320px recovery links pass.');
} finally { await browser.close(); }
