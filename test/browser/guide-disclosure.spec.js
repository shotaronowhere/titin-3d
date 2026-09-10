import { test, expect } from '@playwright/test';
import { failOnPageErrors, setReducedMotion, waitForReady } from './helpers.js';

failOnPageErrors(test);

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 1024 }]) {
  test(`mobile guide preserves space, navigation and stretch controls at ${viewport.width}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    await setReducedMotion(page);
    await page.goto('/');
    await waitForReady(page);
    const toggle = page.locator('#guideToggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#guidedCardBody')).toBeHidden();
    await page.locator('#chapterNext').click();
    await page.locator('#chapterNext').click();
    await expect(page.locator('#chapterProgress')).toHaveText('Beat 3 of 5');
    const collapsed = await page.locator('#guidedCard').boundingBox();
    expect(collapsed.height).toBeLessThan(viewport.height * 0.55);
    await expect(page.locator('#sl')).toBeVisible();
    await expect(page.locator('#stagePlay')).toBeVisible();
    await expect(page.locator('#stageForce')).toBeVisible();
    await expect(page.locator('#inspectHint')).toBeVisible();
    await expect(page.locator('.scale-bar')).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#inspectHint')).toBeVisible();
    await expect(page.locator('#chapterSummary')).toBeVisible();
    const crowdedLabels = await page.evaluate(() => {
      const model = document.querySelector('[data-model-protection]').getBoundingClientRect();
      return [...document.querySelectorAll('.terminus-label')].filter(node => {
        if (getComputedStyle(node).visibility === 'hidden') return false;
        const box = node.getBoundingClientRect();
        return Math.min(box.right, model.right) > Math.max(box.left, model.left)
          && Math.min(box.bottom, model.bottom) > Math.max(box.top, model.top);
      }).map(node => node.textContent);
    });
    expect(crowdedLabels).toEqual([]);
    const explanation = page.locator('#guideContent');
    if (await explanation.evaluate(node => node.scrollHeight > node.clientHeight + 1)) {
      await explanation.focus();
      await explanation.press('End');
      await expect.poll(() => explanation.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    }
    const expanded = await page.locator('#guidedCard').boundingBox();
    expect(expanded.height).toBeGreaterThan(collapsed.height);
    expect(expanded.y).toBeGreaterThan(100);
    // The guide header/navigation stay fixed; explanation and mechanics share a scroller.
    for (const id of ['guideToggle', 'sl', 'stagePlay', 'chapterNext']) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      const box = await page.locator(`#${id}`).boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    await toggle.press('Enter');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.locator('#sl').fill('2000');
    const comparison = page.locator('[data-stretch-comparison]');
    await expect(page.locator('#stageExtensionReadout')).toHaveText('I-band +0 nm');
    const startBar = await comparison.locator('path[stroke="#ff7797"]').boundingBox();
    await page.locator('#stagePlay').click();
    await expect(page.locator('#sl')).toHaveValue('2400');
    await expect(page.locator('#stageExtensionReadout')).toHaveText('I-band +200 nm');
    const endBar = await comparison.locator('path[stroke="#ff7797"]').boundingBox();
    expect(endBar.width).toBeGreaterThan(startBar.width + 20);
    const diagram = await comparison.boundingBox();
    expect(diagram.y + diagram.height).toBeLessThan(collapsed.y);
    await page.locator('#audienceEvidence').click();
    await page.locator('#closeEvidence').click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.locator('#chapterNext').click();
    await expect(page.locator('#tourMechanics')).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}

test('desktop guide is keyboard collapsible and retains the explicit choice after resize', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await waitForReady(page);
  const toggle = page.locator('#guideToggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.focus();
  await toggle.press('Space');
  await expect(page.locator('#guidedCardBody')).toBeHidden();
  await page.locator('#chapterNext').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await page.locator('#chapterNext').click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

async function settledPose(page) {
  await page.evaluate(() => { window.__guidePose = null; });
  await page.waitForFunction(() => {
    const viewer = window.titinVisualization.viewer;
    const pose = [...viewer.camera.position.toArray(), ...viewer.controls.target.toArray()];
    const key = pose.map(value => value.toFixed(5)).join(':');
    const last = window.__guidePose;
    window.__guidePose = { key, count: last?.key === key ? last.count + 1 : 0 };
    return window.__guidePose.count >= 5;
  });
  return page.evaluate(() => {
    const viewer = window.titinVisualization.viewer;
    return [...viewer.camera.position.toArray(), ...viewer.controls.target.toArray()];
  });
}

async function expectSamePose(page, pose) {
  const actual = await settledPose(page);
  expect(Math.max(...actual.map((value, index) => Math.abs(value - pose[index])))).toBeLessThan(0.001);
}

test('manual orbit survives disclosure, resize, and Research; explicit navigation restores automatic framing', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await setReducedMotion(page);
  await page.goto('/#v=2&depth=learn&step=stretch_spring&sl=2200&drawer=closed&scene=spring&confidence=0');
  await waitForReady(page);
  await settledPose(page);
  await page.mouse.move(330, 240);
  await page.mouse.down();
  await page.mouse.move(285, 215, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.titinVisualization.isCameraManuallyAdjusted())).toBe(true);
  const manual = await settledPose(page);
  await page.locator('#guideToggle').click();
  await expectSamePose(page, manual);
  await page.locator('#guideToggle').click();
  await expectSamePose(page, manual);
  await page.setViewportSize({ width: 844, height: 390 });
  await expectSamePose(page, manual);
  await page.locator('#audienceEvidence').click();
  await page.locator('#closeEvidence').click();
  await expectSamePose(page, manual);
  await page.locator('#chapterNext').click();
  await expect.poll(() => page.evaluate(() => window.titinVisualization.isCameraManuallyAdjusted())).toBe(false);
  expect(await settledPose(page)).not.toEqual(manual);
});

for (const viewport of [{width:844,height:390},{width:640,height:360}]) {
  test(`short landscape ${viewport.width}: stage and controls stay on screen while the guide scrolls`, async ({page}) => {
    await page.setViewportSize(viewport);
    await setReducedMotion(page);
    await page.goto('/#v=2&depth=learn&step=stretch_spring&sl=2200&drawer=closed&scene=spring&confidence=0');
    await waitForReady(page);
    const canvas = await page.locator('#canvas').boundingBox();
    const card = await page.locator('#guidedCard').boundingBox();
    expect(card.x).toBeGreaterThanOrEqual(canvas.x + canvas.width);
    for (const id of ['guideToggle','sl','stagePlay','stageForce','chapterNext']) {
      const box = await page.locator(`#${id}`).boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    await page.locator('#guideToggle').click();
    const content = page.locator('#guideContent');
    expect(await content.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
    await content.focus();
    await content.press('End');
    await expect.poll(() => content.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    await expect(page.locator('#stagePlay')).toBeInViewport();
    await expect(page.locator('#guideToggle')).toBeInViewport();
    await expect(page.locator('#chapterNext')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height);
    await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-label-layout', /^(resolved|suppressed:compact-stage)$/);
  });
}

test('inspection invitation avoids the stretch bars and molecular span in both guide states', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await setReducedMotion(page);
  await page.goto('/#v=2&depth=learn&step=stretch_spring&sl=2400&drawer=closed&scene=spring&confidence=0');
  await waitForReady(page);
  for (const expanded of [false,true]) {
    if (expanded) await page.locator('#guideToggle').click();
    await expect(page.locator('#inspectHint')).toBeVisible();
    await expect(page.locator('[data-stretch-comparison]')).toHaveCount(1);
    await expect(page.locator('[data-model-protection]')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => {
      const hint = document.querySelector('#inspectHint').getBoundingClientRect();
      return [...document.querySelectorAll('[data-stretch-comparison] path, [data-model-protection]')].some(node => {
        const rect = node.getBoundingClientRect();
        const half = (Number(node.getAttribute('stroke-width')) || 1.2) / 2;
        return hint.left < rect.right + half && hint.right > rect.left - half
          && hint.top < rect.bottom + half && hint.bottom > rect.top - half;
      });
    })).toBe(false);
  }
});

test('auto-collapse moves focus from guide content to its disclosure button', async ({page}) => {
  await page.setViewportSize({width:1280,height:720});
  await setReducedMotion(page);
  await page.goto('/');
  await waitForReady(page);
  await page.locator('#guideContent').focus();
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('#guidedCardBody')).toBeHidden();
  await expect(page.locator('#guideToggle')).toBeFocused();
});
