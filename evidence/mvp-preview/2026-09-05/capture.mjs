// Candidate-specific review frames; run with the existing server on port 8000.
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForReady } from '../../../test/browser/helpers.js';

const root = resolve(import.meta.dirname, '../../..');
const out = resolve(import.meta.dirname, 'frames');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const frames = [];
const errors = [];
async function capture(page, name) {
  await page.screenshot({ path: resolve(out, `${name}.png`) });
  frames.push({ name, url: page.url(), viewport: page.viewportSize() });
}
try {
  for (const [width, height] of [[1280, 720], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8000/');
    await waitForReady(page);
    for (let beat = 1; beat <= 5; beat += 1) {
      await page.waitForFunction(() => document.querySelector('#scienceOverlay').dataset.labelLayout === 'resolved');
      await capture(page, `${width}-beat-${beat}`);
      if (beat === 3) {
        await page.locator('#stagePlay').click();
        await page.waitForFunction(() => document.querySelector('#sl').value === '2400');
        await capture(page, `${width}-stretch-endpoint`);
        await page.locator('#stageForce').click();
        await page.waitForFunction(() => document.activeElement?.id === 'passiveForceHeading');
        await capture(page, `${width}-force`);
        await page.locator('#closeEvidence').click();
      }
      if (beat < 5) await page.locator('#chapterNext').click();
    }
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 640, height: 360 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:8000/');
  await waitForReady(page);
  await capture(page, '640-zoom-equivalent-opening');
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await capture(page, '640-zoom-equivalent-stretch');
  await page.close();
  if (errors.length) throw new Error(JSON.stringify(errors));
  writeFileSync(resolve(import.meta.dirname, 'captures.json'), JSON.stringify({
    index_sha256: createHash('sha256').update(readFileSync(resolve(root, 'index.html'))).digest('hex'),
    reduced_motion: true,
    note: 'Browser software captures, not physical-device or human usability evidence.',
    frames, page_errors: errors,
  }, null, 2) + '\n');
  process.stdout.write(`Captured ${frames.length} candidate frames; no page errors.\n`);
} finally {
  await browser.close();
}
