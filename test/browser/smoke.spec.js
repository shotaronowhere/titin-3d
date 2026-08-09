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
  await cleanBoot(page, '/index.html');
  for (const id of ['modelFingerprint', 'appRevision', 'buildInputsFingerprint']) {
    await expect(page.locator(`#${id}`)).not.toHaveText('—');
  }
});

test('committed standalone opens from file:// and reaches its ready marker', async ({ page }) => {
  await cleanBoot(page, pathToFileURL(resolve('index.html')).href);
});

test('SC19 desktop authority: pending scope and a claim source are visibly inspectable', async ({ page }) => {
  await setReviewViewport(page, 'desktop');
  await cleanBoot(page, '/index.html');
  await expect(page.locator('#scopeIdentity'))
    .toHaveText(/Human TTN reference sequence.*Q8WZ42-1.*review pending/i);
  await expect(page.locator('#scopeDecisions')).toHaveText(/5 pending.*0 approved.*0 deferred/i);

  await page.locator('#audienceEvidence').click();
  await expect(page.locator('#scientificDecisionStatus'))
    .toHaveText(/SD-01 pending.*SD-02 pending.*SD-03 pending.*SD-04 pending.*SD-05 pending/i);
  await expect(page.locator('#chapterEvidenceTitle')).not.toHaveText('—');
  await expect(page.locator('#chapterSources a').first()).toBeVisible();

  await page.locator('#tabMeasure').click();
  await expect(page.locator('#mechanicsScope'))
    .toHaveText(/rat psoas.*SD-04 pending/i);
});

for (const viewport of Object.keys(VIEWPORTS)) {
  test(`${viewport}: Evidence, Measure, and Sources open their named tab and return focus`, async ({ page }) => {
    await setReviewViewport(page, viewport);
    await cleanBoot(page, '/index.html');
    for (const [entry, tab] of [
      ['audienceEvidence', 'tabEvidence'],
      ['stageMeasureLink', 'tabMeasure'],
      ['stageSourcesLink', 'tabSources'],
    ]) {
      await page.locator(`#${entry}`).click();
      await expect(page.locator(`#${tab}`)).toHaveAttribute('aria-selected', 'true');
      await page.locator('#closeEvidence').click();
      await expect(page.locator(`#${entry}`)).toBeFocused();
    }
  });
}

test('visible source links and every selected-row state use declared readable foregrounds', async ({ page }) => {
  await setReviewViewport(page, 'desktop');
  await cleanBoot(page, '/index.html');
  await page.locator('#stageSourcesLink').click();
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
  const pevk = page.locator('.extension-row[data-region="PEVK"]');
  await expect(pevk).toBeVisible();
  await pevk.click();
  for (const state of ['selected', 'hovered', 'focused', 'disabled']) {
    if (state === 'hovered') await pevk.hover();
    if (state === 'focused') await pevk.focus();
    if (state === 'disabled') await pevk.evaluate((button) => { button.disabled = true; });
    const foreground = await computedStyle(pevk, 'color');
    const stateBackground = await effectiveBackground(pevk);
    expect(contrastRatio(foreground, stateBackground), state).toBeGreaterThanOrEqual(4.5);
  }
});

test('region and close-up navigation never leave a false wide-view pressed state', async ({ page }) => {
  await cleanBoot(page, '/index.html');
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await expect(page.locator('.extension-row[data-region="PEVK"]'))
    .toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#views [aria-pressed="true"]')).toHaveCount(0);
  await page.locator('.extension-row[data-region="prox_Ig"]').click();
  await expect(page.locator('#views [aria-pressed="true"]')).toHaveCount(0);

  await page.locator('#audienceEvidence').click();
  await page.locator('#tabInspect').click();
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
