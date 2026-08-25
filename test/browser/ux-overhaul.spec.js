import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import {
  SC27A_VIEWPORTS,
  boxesCollide,
  clickProjectedLabel,
  chromeCounts,
  failOnPageErrors,
  horizontalOverflow,
  setReducedMotion,
  visibleWordCount,
  waitForReady,
} from './helpers.js';

failOnPageErrors(test);

const consoleErrors = [];
test.beforeEach(({ page }) => {
  consoleErrors.length = 0;
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
});
test.afterEach(() => expect(consoleErrors, 'the page must log no console error').toEqual([]));

async function openTour(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto('/');
  await waitForReady(page);
  await expect(page.locator('#chapterProgress')).toHaveText('Beat 1 of 5');
  await expect(page.locator('#tourProgressMarkers .tour-progress-marker')).toHaveCount(5);
}

async function assertInViewport(locator, viewport) {
  const box = await locator.boundingBox();
  expect(box, 'element has a rendered box').not.toBeNull();
  expect(box.x + box.width).toBeGreaterThan(0);
  expect(box.y + box.height).toBeGreaterThan(0);
  expect(box.x).toBeLessThan(viewport.width);
  expect(box.y).toBeLessThan(viewport.height);
}

async function assertCentreUnobscured(locator) {
  expect(await locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === node || node.contains(hit) || hit?.contains(node);
  })).toBe(true);
}

async function assertContainedBy(child, parent) {
  const [inside, outside] = await Promise.all([child.boundingBox(), parent.boundingBox()]);
  expect(inside, 'contained element has a rendered box').not.toBeNull();
  expect(outside, 'containing element has a rendered box').not.toBeNull();
  expect(inside.x).toBeGreaterThanOrEqual(outside.x - 1);
  expect(inside.y).toBeGreaterThanOrEqual(outside.y - 1);
  expect(inside.x + inside.width).toBeLessThanOrEqual(outside.x + outside.width + 1);
  expect(inside.y + inside.height).toBeLessThanOrEqual(outside.y + outside.height + 1);
}

for (const viewport of SC27A_VIEWPORTS) {
  test(`SC27A Tour shell obeys its viewport contract at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await openTour(page, viewport);

    const counts = await chromeCounts(page);
    expect(counts.visibleIds).toEqual([
      'scopeBadge', 'audienceEvidence', 'chapterPrevious', 'chapterNext',
    ]);
    expect(counts.visible).toBeLessThanOrEqual(4);
    expect(counts.tabbable).toBeLessThanOrEqual(3);
    expect(await horizontalOverflow(page)).toEqual({ document: 0, body: 0, canvas: 0 });
    expect(await visibleWordCount(page)).toBeLessThanOrEqual(110);
    if (viewport.width <= 767 || (viewport.height > viewport.width && viewport.width <= 1024)) {
      const compactScope = page.locator('#scopeCompact');
      await expect(compactScope).toHaveText('Human TTN Q8WZ42-1 · 2,200 nm');
      expect(await compactScope.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
        'compact scope label must not be visually truncated').toBe(true);
    }

    const card = page.locator('#guidedCard');
    const body = page.locator('#guidedCardBody');
    await assertInViewport(card, viewport);
    expect(await body.evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
    await assertCentreUnobscured(page.locator('#chapterNext'));
    await expect(page.getByRole('button', { name: /^Next:/ })).toHaveCount(1);

    const header = page.locator('#stageHeader');
    expect(await boxesCollide(header, card)).toBe(false);
    const hint = page.locator('#inspectHint');
    if (await hint.isVisible()) {
      expect(await boxesCollide(header, hint)).toBe(false);
      expect(await boxesCollide(card, hint)).toBe(false);
    }

    await expect(page.locator('#scienceOverlay .identity-label')).toHaveText([
      'Titin', 'Myosin', 'Actin',
    ]);
    for (const label of await page.locator('#scienceOverlay .identity-label').all()) {
      await assertInViewport(label, viewport);
    }

    // Beat 3 is the densest Tour state and must obey the same responsive
    // contract rather than inheriting credit from the sparse cold open.
    await page.locator('#chapterNext').click();
    await page.locator('#chapterNext').click();
    await expect(page.locator('#chapterProgress')).toHaveText('Beat 3 of 5');
    await expect(page.locator('#tourMechanics')).toBeVisible();
    await assertInViewport(page.locator('#guidedCard'), viewport);
    await assertInViewport(page.locator('#chapterNext'), viewport);
    await assertCentreUnobscured(page.locator('#chapterNext'));
    await assertContainedBy(page.locator('#stageForce'), page.locator('#guidedCard'));
    expect(await page.locator('#guidedCardBody')
      .evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
    expect(await horizontalOverflow(page)).toEqual({ document: 0, body: 0, canvas: 0 });

    const focusTargets = await page.locator(
      'button:visible, input:visible, select:visible, textarea:visible, a[href]:visible',
    ).all();
    for (const target of focusTargets) {
      if (await target.isDisabled()) continue;
      await target.focus();
      await assertInViewport(target, viewport);
      expect((await horizontalOverflow(page)).document).toBeLessThanOrEqual(1);
      expect((await horizontalOverflow(page)).canvas).toBe(0);
    }
  });
}

test('SC27A has one five-beat route, contextual mechanics, and a truthful Replay', async ({ page }) => {
  await openTour(page, { width: 1280, height: 720 });
  const stageComposition = await page.locator('#canvas').evaluate((node) => {
    const canvas = node.querySelector('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return {
      backgroundImage: getComputedStyle(node).backgroundImage,
      webglAlpha: gl.getContextAttributes().alpha,
      canvasBackground: getComputedStyle(canvas).backgroundColor,
    };
  });
  expect(stageComposition.backgroundImage).toContain('rgb(14, 17, 22)');
  expect(stageComposition.backgroundImage).toContain('rgb(8, 11, 15)');
  expect(stageComposition.webglAlpha).toBe(true);
  expect(stageComposition.canvasBackground).toBe('rgba(0, 0, 0, 0)');
  const expected = [
    ['Beat 1 of 5', 'Meet the sarcomere'],
    ['Beat 2 of 5', 'Follow one giant molecule'],
    ['Beat 3 of 5', 'Build and stretch the spring'],
    ['Beat 4 of 5', 'Scaffold the thick filament'],
    ['Beat 5 of 5', 'What do we know?'],
  ];

  for (const [index, [progress, title]] of expected.entries()) {
    await expect(page.locator('#chapterProgress')).toHaveText(progress);
    await expect(page.locator('#chapterTitle')).toHaveText(title);
    if (index === 2) await expect(page.locator('#tourMechanics')).toBeVisible();
    else await expect(page.locator('#tourMechanics')).toBeHidden();
    const counts = await chromeCounts(page);
    expect(counts.visible).toBeLessThanOrEqual(index === 2 ? 7 : 4);
    if (index < expected.length - 1) await page.locator('#chapterNext').click();
  }

  await expect(page.locator('#chapterNext')).toHaveText('Replay');
  await expect(page.locator('#tourEvidenceRecap .evidence-chip')).toHaveCount(5);
  await expect(page.locator('#tourEvidenceRecap .tour-evidence-definition')).toHaveCount(5);
  await expect(page.locator('#tourEvidenceRecap .evidence-chip[role="status"]')).toHaveCount(0);
  for (const definition of await page.locator('#tourEvidenceRecap .tour-evidence-definition').all()) {
    await expect(definition).not.toBeEmpty();
  }
  await page.locator('#chapterNext').click();
  await expect(page.locator('#chapterProgress')).toHaveText('Beat 1 of 5');
  await expect(page.locator('#chapterPrevious')).toBeDisabled();
});

test('SC27A Research defaults and contextual routes preserve the Tour return point', async ({ page }) => {
  await openTour(page, { width: 1280, height: 720 });
  await page.locator('#audienceEvidence').click();
  await expect(page.locator('#panel')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#tabInspect')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#panelInspect')).toBeVisible();
  await expect(page.locator('.research-inventory')).not.toHaveAttribute('open', '');
  expect(await visibleWordCount(page, '#panel')).toBeLessThanOrEqual(220);
  const panelWidth = (await page.locator('#panel').boundingBox()).width;
  expect(panelWidth).toBeGreaterThanOrEqual(380);
  expect(panelWidth).toBeLessThanOrEqual(440);
  await expect(page.locator('#canvas canvas')).toBeVisible();
  await page.locator('#closeEvidence').click();
  await expect(page.locator('#audienceEvidence')).toBeFocused();
  await expect(page.locator('#chapterProgress')).toHaveText('Beat 1 of 5');

  await page.locator('#scopeBadge').click();
  await expect(page.locator('#tabInspect')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#scopeDetails')).toBeFocused();
  await page.locator('#closeEvidence').click();

  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await expect(page.locator('#tourMechanics')).toBeVisible();
  await page.locator('#stageForce').click();
  await expect(page.locator('#tabMeasure')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#panelMeasure')).toBeVisible();
});

test('SC27A object explanation reaches contextual Evidence and Sources', async ({ page }) => {
  await openTour(page, { width: 1280, height: 720 });
  await page.evaluate(() => {
    window.__sc27aOverlayClicks = 0;
    document.addEventListener('click', (event) => {
      if (event.composedPath().includes(document.querySelector('#scienceOverlay'))) {
        window.__sc27aOverlayClicks += 1;
      }
    }, true);
  });
  await clickProjectedLabel(page, 'Titin');
  expect(await page.evaluate(() => window.__sc27aOverlayClicks)).toBe(1);
  await expect(page.locator('#objectInspector')).toBeVisible();
  await expect(page.locator('#objectInspectorName')).not.toBeEmpty();
  await expect(page.locator('#objectInspectorLay')).not.toBeEmpty();
  await expect(page.locator('#objectInspectorEvidence .evidence-chip')).toHaveCount(1);
  await page.locator('#objectInspectorDetailLink').click();
  await expect(page.locator('#tabEvidence')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#selectedEvidence')).toBeVisible();
  await expect(page.locator('#selectedEvidence .evidence-chip')).toContainText('scientific class:');
  await page.locator('#selectedEvidenceSourcesLink').click();
  await expect(page.locator('#tabSources')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#bibliography')).not.toBeEmpty();
  await expect(page.locator('#modelFingerprint')).toHaveText(/^[a-f0-9]{64}$/);
});

test('SC27A mobile Research is one full-screen scroll sheet and leaves no stage target active', async ({ page }) => {
  const viewport = { width: 375, height: 812 };
  await openTour(page, viewport);
  await page.locator('#audienceEvidence').click();
  const panel = page.locator('#panel');
  await expect(panel).toBeVisible();
  expect(await panel.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.left === 0 && rect.top === 0
      && Math.abs(rect.width - innerWidth) <= 1 && Math.abs(rect.height - innerHeight) <= 1;
  })).toBe(true);
  await expect(page.locator('#canvas')).toHaveCSS('visibility', 'hidden');
  const scrollContainers = await page.evaluate(() => [...document.querySelectorAll('*')]
    .filter((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && node.scrollHeight > node.clientHeight + 1
        && ['auto', 'scroll'].includes(style.overflowY);
    }).map((node) => node.id || node.tagName));
  expect(scrollContainers).toEqual(['panel']);

  for (const control of await panel.locator('button:visible, input:visible, a[href]:visible').all()) {
    if (await control.isDisabled()) continue;
    await control.focus();
    await assertInViewport(control, viewport);
    expect((await horizontalOverflow(page)).document).toBeLessThanOrEqual(1);
  }
  await page.locator('#closeEvidence').click();
  await expect(page.locator('#audienceEvidence')).toBeFocused();
  await expect(page.locator('#canvas')).toHaveCSS('visibility', 'visible');
});

test('SC27A 200% browser-zoom layout equivalent preserves the Tour route', async ({ page }) => {
  const viewport = { width: 640, height: 360 };
  await openTour(page, viewport);
  expect(await horizontalOverflow(page)).toEqual({ document: 0, body: 0, canvas: 0 });
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').scrollIntoViewIfNeeded();
  await assertInViewport(page.locator('#chapterNext'), viewport);
  await assertCentreUnobscured(page.locator('#chapterNext'));
  expect(await page.locator('#guidedCardBody')
    .evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
  expect(await horizontalOverflow(page)).toEqual({ document: 0, body: 0, canvas: 0 });
});

for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 720 }]) {
  test(`SC27A automated accessibility has no WCAG finding at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await setReducedMotion(page, true);
    await openTour(page, viewport);
    const scan = async (state) => {
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(results.violations, state).toEqual([]);
    };
    await scan('cold open');
    await page.locator('#chapterNext').click();
    await expect(page.locator('#chapterProgress')).toHaveText('Beat 2 of 5');
    expect(await page.locator('#guidedCard').evaluate((node) => getComputedStyle(node).transitionDuration))
      .toMatch(/^(0s|0ms)(, (0s|0ms))*$/);
    await page.locator('#chapterNext').click();
    await scan('beat 3 mechanics');
    await page.locator('#chapterNext').click();
    await page.locator('#chapterNext').click();
    await scan('beat 5 evidence recap');
    await page.locator('#audienceEvidence').click();
    await scan('Research workbench');
  });
}
