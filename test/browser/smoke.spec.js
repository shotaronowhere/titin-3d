import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  VIEWPORTS, computedStyle, contrastRatio, effectiveBackground, setReviewViewport, waitForReady,
} from './helpers.js';

async function cleanBoot(page, url) {
  const failures = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });
  const response = await page.goto(url);
  if (response) expect(response.ok()).toBe(true);
  await waitForReady(page);
  expect(failures).toEqual([]);
}

test('source and standalone pages boot without module, console, or WebGL errors', async ({ page }) => {
  await cleanBoot(page, '/source.html');
  for (const button of await page.locator('.research-actions button').all()) {
    await expect(button).toBeDisabled();
  }
  await expect(page.locator('#researchExportStatus')).toContainText(
    'unavailable in source mode because no candidate input manifest is embedded',
  );
  await expect(page.locator('#reproductionWorksheet')).toContainText(
    'Source mode has no candidate manifest and will not invent input checksums',
  );
  await expect(page.locator('#copyViewLink')).toBeEnabled();
  await cleanBoot(page, '/index.html');
  for (const id of ['modelFingerprint', 'appRevision', 'buildInputsFingerprint']) {
    await expect(page.locator(`#${id}`)).not.toHaveText('—');
  }
});

test('committed standalone opens from file:// and reaches its ready marker', async ({ page }) => {
  await cleanBoot(page, pathToFileURL(resolve('index.html')).href);
});

test('SC20 desktop authority: consumed rulings and a claim source are visibly inspectable', async ({ page }) => {
  await setReviewViewport(page, 'desktop');
  await cleanBoot(page, '/index.html');
  await expect(page.locator('#scopeIdentity'))
    .toHaveText('Human TTN reference sequence · Q8WZ42-1');
  await expect(page.locator('#scopeBadge'))
    .toHaveAttribute('title', /Q8WZ42-1.*citation-reviewed SC-20/i);
  await expect(page.locator('#scopeDecisions')).toHaveText(/0 pending.*4 approved.*1 deferred/i);

  await page.locator('#audienceEvidence').click();
  await expect(page.locator('#scientificDecisionStatus'))
    .toHaveText(/SD-01 approved.*SD-02 deferred.*SD-03 approved.*SD-04 approved.*SD-05 approved.*AI adjudication.*independent human review not performed/i);
  await page.locator('#tabEvidence').click();
  await expect(page.locator('#chapterEvidenceTitle')).not.toHaveText('—');
  await expect(page.locator('#chapterSources a').first()).toBeVisible();

  await page.locator('#tabMeasure').click();
  await expect(page.locator('#mechanicsScope'))
    .toHaveText(/rat\/rabbit.*SD-04 approved with limits.*approximate passive pN per titin/i);
});

for (const viewport of Object.keys(VIEWPORTS)) {
  test(`${viewport}: Research tabs open in order and return focus to the invoker`, async ({ page }) => {
    await setReviewViewport(page, viewport);
    await cleanBoot(page, '/index.html');
    await page.locator('#audienceEvidence').click();
    await expect(page.locator('#tabInspect')).toHaveAttribute('aria-selected', 'true');
    for (const tab of ['tabMeasure', 'tabEvidence', 'tabSources']) {
      await page.locator(`#${tab}`).click();
      await expect(page.locator(`#${tab}`)).toHaveAttribute('aria-selected', 'true');
    }
    await page.locator('#closeEvidence').click();
    await expect(page.locator('#audienceEvidence')).toBeFocused();
  });
}

test('visible source links and contextual Stretch states use declared readable foregrounds', async ({ page }) => {
  await setReviewViewport(page, 'desktop');
  await cleanBoot(page, '/index.html');
  await page.locator('#audienceEvidence').click();
  await page.locator('#tabSources').click();
  const foregrounds = await page.locator('#bibliography a').evaluateAll((nodes) => nodes
    .filter((node) => node.getClientRects().length > 0)
    .map((node) => getComputedStyle(node).color));
  expect(foregrounds.length).toBeGreaterThan(0);
  const background = await effectiveBackground(page.locator('#panel'));
  for (const foreground of foregrounds) {
    expect(foreground).not.toBe('rgb(0, 0, 238)');
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  }

  await page.locator('#closeEvidence').click();
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  const stretch = page.locator('#stagePlay');
  await expect(stretch).toBeVisible();
  await stretch.evaluate((button) => {
    button.classList.add('on');
    button.setAttribute('aria-pressed', 'true');
  });
  for (const state of ['active', 'hovered', 'focused', 'disabled']) {
    if (state === 'hovered') await stretch.hover();
    if (state === 'focused') await stretch.focus();
    if (state === 'disabled') await stretch.evaluate((button) => { button.disabled = true; });
    const [foreground, stateBackground] = await stretch.evaluate((node) => {
      const style = getComputedStyle(node);
      return [style.color, style.backgroundColor];
    });
    expect(contrastRatio(foreground, stateBackground),
      `${state}: ${foreground} on ${stateBackground}`)
      .toBeGreaterThanOrEqual(4.5);
  }
});

test('region and close-up navigation never leave a false wide-view pressed state', async ({ page }) => {
  await cleanBoot(page, '/index.html');
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await expect(page.locator('#chapterTitle')).toHaveText('Build and stretch the spring');
  await expect(page.locator('#views [aria-pressed="true"]')).toHaveCount(0);

  await page.locator('#audienceEvidence').click();
  const inventory = page.locator('.research-inventory');
  if (!(await inventory.evaluate((node) => node.open))) await inventory.locator('summary').click();
  await expect(page.locator('#regions [data-region="PEVK"]'))
    .toHaveAttribute('aria-pressed', 'true');
  await page.locator('#regions [data-region="prox_Ig"]').click();
  await expect(page.locator('#views [aria-pressed="true"]')).toHaveCount(0);

  await page.locator('#scales button[data-scale="context"]').click();
  await page.locator('#closeups button').first().click();
  await expect(page.locator('#views [aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('#closeups [aria-pressed="true"]')).toHaveCount(1);
});

test('a missing WebGL context produces an actionable static-fallback message', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(kind, ...args) {
      if (String(kind).toLowerCase().startsWith('webgl')) return null;
      return original.call(this, kind, ...args);
    };
  });
  await page.goto('/index.html');
  await expect(page.locator('#err')).toBeVisible();
  await expect(page.locator('#err')).toContainText('release/fallback/');
});

test('the pinned axe foundation reports no critical WCAG A/AA violation', async ({ page }) => {
  await cleanBoot(page, '/index.html');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((violation) => violation.impact === 'critical')).toEqual([]);
});
