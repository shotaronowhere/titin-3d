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

function linkTabKey(page, backwards = false) {
  // macOS WebKit follows Safari's default Option-Tab navigation for native links.
  // Plain Tab may visit only form fields; do not change the user's browser preferences.
  const option = process.platform === 'darwin'
    && page.context().browser().browserType().name() === 'webkit' ? 'Alt+' : '';
  return `${option}${backwards ? 'Shift+' : ''}Tab`;
}

async function expectReadableKeyboardLink(page, link) {
  await expect(link).toBeVisible();
  expect(contrastRatio(await computedStyle(link, 'color'),
    await effectiveBackground(link))).toBeGreaterThanOrEqual(4.5);
  await expect(link).toHaveCSS('text-decoration-line', 'underline');
  await link.focus();
  await page.keyboard.press(linkTabKey(page));
  await page.keyboard.press(linkTabKey(page, true));
  await expect(link).toBeFocused();
  expect(await link.evaluate((node) => node.matches(':focus-visible'))).toBe(true);
  expect(await computedStyle(link, 'outline-style')).not.toBe('none');
  expect(parseFloat(await computedStyle(link, 'outline-width'))).toBeGreaterThanOrEqual(2);
  expect(contrastRatio(await computedStyle(link, 'outline-color'),
    await effectiveBackground(link))).toBeGreaterThanOrEqual(3);
}

async function expectRecoveryLinks(page) {
  const diagram = page.getByRole('link', { name: 'View static stretch diagram' });
  const explanation = page.getByRole('link', { name: 'Read the project explanation', exact: true });
  await expect(diagram).toHaveAttribute('href',
    'https://shotaronowhere.github.io/titin-3d/release/fallback/extension.svg');
  await expect(explanation).toHaveAttribute('href', 'https://github.com/shotaronowhere/titin-3d');
  for (const link of [diagram, explanation]) await expectReadableKeyboardLink(page, link);
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
  test(`${viewport}: project repository is visible on entering Sources and keyboard accessible`, async ({ page }) => {
    await setReviewViewport(page, viewport);
    await cleanBoot(page, '/index.html');
    await page.locator('#audienceEvidence').click();
    // Start from keyboard focus: Safari does not focus a button on pointer click.
    await page.locator('#tabSources').focus();
    await page.keyboard.press('Enter');
    const link = page.locator('#projectRepository');
    await expect(link).toHaveAttribute('href', 'https://github.com/shotaronowhere/titin-3d');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    // Check before focusing/scrolling: the link must appear in the initial panel view.
    await expect(link).toBeInViewport({ ratio: 1 });
    await page.keyboard.press(linkTabKey(page));
    await expect(link).toBeFocused();
    await expectReadableKeyboardLink(page, link);
  });

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
  await expect(page.locator('#views [aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('#views [data-view="titin_hero"]')).toHaveAttribute('aria-pressed', 'true');

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
  await page.clock.install();
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
  await expectRecoveryLinks(page);
  const diagnostic = await page.locator('#errMessage').textContent();
  expect(diagnostic).toMatch(/WebGL is unavailable/);
  await page.clock.runFor(7000);
  await expect(page.locator('#errMessage')).toHaveText(diagnostic);
  await expectRecoveryLinks(page);
});

test('a blocked source module preserves recovery links in the classic-script diagnostic', async ({ page }) => {
  await page.clock.install();
  await page.route('**/src/api/TitinVisualization.js', (route) => route.abort('failed'));
  await page.goto('/source.html');
  await page.clock.runFor(7000);
  await expect(page.locator('#err')).toBeVisible();
  await expect(page.locator('#err')).toContainText('The visualization did not start.');
  await expect(page.locator('#err')).toContainText('module did not finish');
  await expectRecoveryLinks(page);
  expect(await page.evaluate(() => window.__titinBoot.ready)).toBe(false);
});

test('the pinned axe foundation reports no critical WCAG A/AA violation', async ({ page }) => {
  await cleanBoot(page, '/index.html');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.filter((violation) => violation.impact === 'critical')).toEqual([]);
});
