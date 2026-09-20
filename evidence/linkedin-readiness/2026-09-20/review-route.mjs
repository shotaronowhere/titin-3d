/** Bounded first-visit rehearsal; this is implementer evidence, not a human study. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium, expect } from '@playwright/test';
import { waitForReady, clickProjectedLabel } from '../../../test/browser/helpers.js';
const root = new URL('../../../', import.meta.url), out = new URL('.', import.meta.url);
const origin = 'http://127.0.0.1:4174';
const server = spawn(process.execPath, ['scripts/serve_browser_tests.mjs', '--port', '4174'],
  { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
const reviews = [];
try {
  await once(server.stdout, 'data');
  browser = await chromium.launch();
  for (const [width, height, reducedMotion] of [
    [1280, 720, 'no-preference'], [390, 844, 'no-preference'],
    [320, 568, 'reduce'], [640, 360, 'reduce'],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => requests.push(request.url()));
    const visible = async (id) => {
      await expect(page.locator(id)).toBeVisible();
      await expect(page.locator(id)).toBeInViewport({ ratio: 1 });
    };
    const activate = async (id) => { await page.locator(id).scrollIntoViewIfNeeded(); await visible(id); await page.locator(id).focus(); await page.keyboard.press('Enter'); };
    await page.goto(`${origin}/`);
    await waitForReady(page);
    await page.waitForTimeout(1200);
    await visible('.brand-title');
    await visible('#guideToggle');
    await visible('#chapterNext');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const titleFits = await page.locator('.brand-title').evaluate((node) => node.scrollWidth <= node.clientWidth);
    assert.equal(titleFits, true, 'opening subject must not be ellipsized');
    await page.screenshot({ path: new URL(`raw/opening-${width}x${height}.png`, out).pathname });
    // Both disclosure states, navigable without shortcuts or changing chapter.
    const initialGuide = await page.locator('#guideToggle').getAttribute('aria-expanded');
    await activate('#guideToggle');
    await expect(page.locator('#guideToggle')).toHaveAttribute('aria-expanded', initialGuide === 'true' ? 'false' : 'true');
    await activate('#guideToggle');
    await expect(page.locator('#guideToggle')).toHaveAttribute('aria-expanded', initialGuide);
    await activate('#chapterNext');
    await expect(page.locator('#chapterProgress')).toHaveText('Beat 2 of 5');
    await activate('#chapterPrevious');
    await expect(page.locator('#chapterProgress')).toHaveText('Beat 1 of 5');
    await activate('#chapterNext');
    await activate('#chapterNext');
    await expect(page.locator('#chapterProgress')).toHaveText('Beat 3 of 5');
    await visible('#stagePlay');
    await visible('#sl');
    await activate('#stagePlay');
    await expect(page.locator('#sl')).toHaveValue('2400', { timeout: 45000 });
    await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
    await activate('#stagePlay');
    await expect(page.locator('#sl')).toHaveValue('2400', { timeout: 45000 });
    await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
    const length = await page.locator('#sl').inputValue();
    await activate('#guideToggle');
    await expect(page.locator('#sl')).toHaveValue(length);
    // Expanded guide mechanics may require the documented internal scroll region.
    await page.locator('#stagePlay').scrollIntoViewIfNeeded();
    await visible('#stagePlay');
    await activate('#guideToggle');
    await page.screenshot({ path: new URL(`raw/stretch-${width}x${height}.png`, out).pathname });
    // Entering Sources through Research keeps the source link visible and returns focus.
    await activate('#audienceEvidence');
    await activate('#tabSources');
    await visible('#projectRepository');
    await page.screenshot({ path: new URL(`raw/sources-${width}x${height}.png`, out).pathname });
    await activate('#closeEvidence');
    await expect(page.locator('#audienceEvidence')).toBeFocused();
    // Return to the actual opening and use an object to reach its source records.
    await activate('#chapterPrevious');
    await activate('#chapterPrevious');
    // Semantic navigation animates the camera; a screen-coordinate click must
    // use its settled label position, not coordinates sampled during movement.
    await page.waitForFunction(() => !window.titinVisualization.viewer._cameraTransition);
    await clickProjectedLabel(page, 'Titin');
    await activate('#objectInspectorDetailLink');
    await expect(page.locator('#tabEvidence')).toHaveAttribute('aria-selected', 'true');
    await activate('#selectedEvidenceSourcesLink');
    await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'object');
    await visible('#projectRepository');
    await page.locator('#bibliography .source-result summary').first().click();
    await expect(page.locator('#bibliography .source-result').first()).toContainText('Locator');
    await activate('#closeEvidence');
    // A clean new visit then two real state changes provides an unambiguous Back check.
    await page.goto(`${origin}/`);
    await waitForReady(page);
    await activate('#chapterNext');
    await activate('#chapterNext');
    await expect(page.locator('#chapterProgress')).toHaveText('Beat 3 of 5');
    await page.goBack();
    await expect(page.locator('#chapterProgress')).toHaveText('Beat 2 of 5');
    assert.deepEqual(errors, []);
    assert.ok(requests.every((url) => url === `${origin}/`), JSON.stringify(requests));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    reviews.push({ viewport: { width, height }, reduced_motion: reducedMotion,
      opening_title_fits: titleFits, initial_guide_expanded: initialGuide,
      actions: ['fresh load', 'keyboard Next/Previous', 'guide expanded/collapsed',
        'Stretch and replay', 'Research Sources link visible', 'close and focus return',
        'object explanation to source locator', 'browser Back'],
      page_errors: errors, requests, result: 'pass' });
    writeFileSync(new URL('route-review.json', out), JSON.stringify({
      reviewer: 'Codex implementer, automated interaction plus screenshot inspection; no human participant',
      browser: `Chromium ${browser.version()}`,
      html_sha256: createHash('sha256').update(readFileSync(new URL('index.html', root))).digest('hex'),
      reviews,
    }, null, 2) + '\n');
    await context.close();
    console.log(`Reviewed ${width}x${height}, ${reducedMotion}`);
  }
} finally { await browser?.close(); server.kill(); }
