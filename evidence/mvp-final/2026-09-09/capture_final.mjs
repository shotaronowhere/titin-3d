// Candidate visual inspection. Core routes use file:// without external requests.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { waitForReady } from '../../../test/browser/helpers.js';
const root = resolve(process.argv[2] || '.');
const out = resolve(import.meta.dirname, process.argv[3] || 'frames');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const frames = [], errors = [], requests = [];
async function capture(page, name) {
  await page.waitForFunction(() => ['resolved', 'hidden'].includes(
    document.querySelector('#scienceOverlay').dataset.labelLayout));
  await page.screenshot({ path: resolve(out, `${name}.png`) });
  const bytes = readFileSync(resolve(out, `${name}.png`));
  const layout = await page.locator('#scienceOverlay').evaluate(node => ({ status: node.dataset.labelLayout,
    locator: node.dataset.locatorLayout, detail: node.dataset.labelLayoutDetail }));
  frames.push({ name, viewport: page.viewportSize(), layout, sha256: createHash('sha256').update(bytes).digest('hex') });
}
try {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    const label = viewport.width === 1280 ? 'desktop' : 'phone';
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (r) => { if (!r.url().startsWith('file:')) requests.push(r.url()); });
    page.setDefaultTimeout(20000);
    await page.goto(pathToFileURL(resolve(root, 'index.html')).href);
    await waitForReady(page);
    for (let beat = 1; beat <= 5; beat++) {
      if (beat > 1) await page.locator('#chapterNext').click();
      await page.waitForFunction(() => document.querySelector('#scienceOverlay').dataset.labelLayout !== undefined);
      await capture(page, `${label}-beat-${beat}`);
      if (beat === 3) {
        await page.locator('#stagePlay').click();
        await page.waitForFunction(() => document.querySelector('#sl').value === '2400');
        await capture(page, `${label}-stretch-endpoint`);
        await page.locator('#stageForce').click();
        await page.waitForFunction(() => document.activeElement?.id === 'passiveForceHeading');
        await capture(page, `${label}-force`);
        await page.locator('#textScale').click();
        await capture(page, `${label}-force-large`);
        await page.locator('#textScale').click();
        await page.locator('#closeEvidence').click();
      }
    }
    await page.locator('#chapterInspectEvidence').click();
    await page.waitForFunction(() => document.activeElement?.id === 'closeEvidence');
    const sourceBox = await page.locator('#selectedEvidenceSourcesLink').boundingBox();
    if (!sourceBox || sourceBox.y < 0 || sourceBox.y + sourceBox.height > viewport.height) throw new Error('Finale source action is outside the viewport');
    await capture(page, `${label}-evidence`);
    await page.locator('#selectedEvidenceSourcesLink').click();
    await page.locator('#bibliography .source-result summary').first().click();
    await capture(page, `${label}-source`);
    await page.locator('#closeEvidence').click();
    await page.locator('#scopeBadge').click();
    await capture(page, `${label}-scope`);
    await page.locator('.research-inventory summary').click();
    await page.locator('#sceneControls [data-scene="architecture"]').click();
    await page.locator('#inspectionWorkbench').evaluate(node => {
      document.querySelector('#panel').scrollTop += node.getBoundingClientRect().top
        - document.querySelector('#drawerTabs').getBoundingClientRect().bottom - 12;
    });
    await capture(page, `${label}-architecture`);
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(resolve(out, 'capture-index.json'), JSON.stringify({ root, activation_method: 'Native Playwright pointer clicks; reduced-motion screenshots. Chromium and Firefox tests separately exercise keyboard and animated Stretch playback.', index_sha256: createHash('sha256').update(readFileSync(resolve(root, 'index.html'))).digest('hex'), manifest_sha256: createHash('sha256').update(readFileSync(resolve(root, 'release/MANIFEST.json'))).digest('hex'), frames, errors, non_file_requests: requests }, null, 2) + '\n');
if (errors.length || requests.length) throw new Error(JSON.stringify({ errors, requests }));
console.log(`Captured ${frames.length} frames; no page errors or non-file requests.`);
