import { test, expect } from '@playwright/test';

import { failOnPageErrors, setReducedMotion, waitForReady } from './helpers.js';

failOnPageErrors(test);

const DESKTOP = { width: 1280, height: 720 };
const PHONE = { width: 375, height: 812 };

async function boot(page, viewport = DESKTOP) {
  await page.setViewportSize(viewport);
  await page.goto('/index.html');
  await waitForReady(page);
}

async function expectSpringSweep(page) {
  await expect(page.locator('[data-scene="spring"]').first())
    .toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#stretchHint')).toBeVisible();
  await expect(page.locator('#stretchHint')).toHaveText('Watch the I-band bracket');
  await expect(page.locator('#stagePlay')).toHaveText('Pause');
  expect(new URL(page.url()).hash).toContain('scene=spring');
  await expect.poll(() => page.evaluate(
    () => window.titinVisualization.currentState().camera_preset,
  )).toBe('view.titin_story');
}

async function framedGeometry(page) {
  return page.evaluate(() => {
    const vis = window.titinVisualization;
    const overlay = vis.showcaseOverlay();
    const records = [
      ...overlay.termini,
      ...overlay.brackets.flatMap((bracket) => [
        { id: `${bracket.id}:start`, anchor_nm: { x: bracket.start_nm, y: 0, z: 0 } },
        { id: `${bracket.id}:end`, anchor_nm: { x: bracket.end_nm, y: 0, z: 0 } },
      ]),
    ];
    const canvas = document.querySelector('#canvas').getBoundingClientRect();
    const header = document.querySelector('#stageHeader').getBoundingClientRect();
    const bar = document.querySelector('#stageBar').getBoundingClientRect();
    const story = document.querySelector('#guidedCard');
    const storyBox = story.hidden || !story.getClientRects().length
      ? null : story.getBoundingClientRect();
    const bottom = Math.min(bar.top, storyBox?.top ?? Infinity) - canvas.top;
    const label = [...document.querySelectorAll('#scienceOverlay .science-label')]
      .find((node) => node.textContent === 'I-band');
    const labelBox = label?.getBoundingClientRect();
    return {
      width: canvas.width,
      top: header.bottom - canvas.top,
      bottom,
      points: vis.projectPresentationAnchors(records),
      iBandLabel: labelBox ? {
        left: labelBox.left - canvas.left, right: labelBox.right - canvas.left,
        top: labelBox.top - canvas.top, bottom: labelBox.bottom - canvas.top,
      } : null,
    };
  });
}

async function expectGeometryInsideUnobscuredStage(page) {
  await expect.poll(async () => (await framedGeometry(page)).iBandLabel).not.toBeNull();
  const geometry = await framedGeometry(page);
  for (const point of geometry.points) {
    expect(point.visible, point.id).toBe(true);
    expect(point.x_px, `${point.id} x`).toBeGreaterThanOrEqual(0);
    expect(point.x_px, `${point.id} x`).toBeLessThanOrEqual(geometry.width);
    expect(point.y_px, `${point.id} y above chrome`).toBeGreaterThanOrEqual(geometry.top);
    expect(point.y_px, `${point.id} y below story/bar`).toBeLessThanOrEqual(geometry.bottom);
  }
  expect(geometry.iBandLabel.left).toBeGreaterThanOrEqual(0);
  expect(geometry.iBandLabel.right).toBeLessThanOrEqual(geometry.width);
  expect(geometry.iBandLabel.top).toBeGreaterThanOrEqual(geometry.top);
  expect(geometry.iBandLabel.bottom).toBeLessThanOrEqual(geometry.bottom);
}

test('SC24 Stretch reframes and announces a chapter-camera start', async ({ page }) => {
  await boot(page);
  await page.locator('#sl').fill('2000');
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await expect(page.locator('#chapterTitle')).toHaveText('See its molecular architecture');
  await page.locator('#stagePlay').click();
  await expectSpringSweep(page);
  await expect(page.locator('#objectAnnouncement')).toContainText(
    'Changed to the Spring scene',
  );
  await expectGeometryInsideUnobscuredStage(page);
});

test('SC24 Stretch reframes a named close-up before running', async ({ page }) => {
  await boot(page);
  await page.locator('#sl').fill('2000');
  await page.locator('#sceneControls [data-scene="z_anchor"]').click();
  await expect(page.locator('#sceneTruth')).toHaveText('Z-anchor');
  await page.locator('#stagePlay').click();
  await expectSpringSweep(page);
  await expectGeometryInsideUnobscuredStage(page);
});

test('SC24 mobile Stretch reframes before its first length frame', async ({ page }) => {
  await boot(page, PHONE);
  await page.locator('#sl').fill('2000');
  await page.locator('#stageMore').click();
  await page.locator('#moreSceneControls [data-scene="architecture"]').click();
  await page.locator('#stagePlay').click();
  await expectSpringSweep(page);
  await expectGeometryInsideUnobscuredStage(page);
});

test('SC24 Stretch reaches the supported maximum with geometry and bracket retained',
  async ({ page }) => {
    await boot(page);
    await page.locator('#sl').fill('2000');
    await page.locator('#stagePlay').click();
    await expectSpringSweep(page);
    await expectGeometryInsideUnobscuredStage(page);
    await expect(page.locator('#sl')).toHaveValue('2400', { timeout: 5_000 });
    await expect(page.locator('#stretchHint')).toBeHidden();
    await expect(page.locator('#stagePlay')).toHaveText(/Stretch/);
    await expect(page.locator('#objectAnnouncement')).toContainText('Stretch complete');
    await expectGeometryInsideUnobscuredStage(page);
  });

test('SC24 Pause freezes the sweep and Reset restores its exact start', async ({ page }) => {
  await boot(page);
  await page.locator('#sl').fill('2000');
  await page.locator('#stagePlay').click();
  await expect(page.locator('#stretchHint')).toBeVisible();
  await expect.poll(async () => Number(await page.locator('#sl').inputValue()))
    .toBeGreaterThan(2000);
  await page.locator('#stagePlay').click();
  const paused = await page.locator('#sl').inputValue();
  expect(Number(paused)).toBeGreaterThan(2000);
  expect(Number(paused)).toBeLessThan(2400);
  await page.waitForTimeout(300);
  await expect(page.locator('#sl')).toHaveValue(paused);
  await expect(page.locator('#stageReset')).toBeEnabled();
  await page.locator('#stageReset').click();
  await expect(page.locator('#sl')).toHaveValue('2000');
  await expect(page.locator('#stageReset')).toBeDisabled();
  await expect(page.locator('#sceneTruth')).toHaveText('Spring');
});

test('SC24 leaving Spring invalidates Reset without stale camera or scene state', async ({ page }) => {
  await boot(page);
  await page.locator('#sl').fill('2000');
  await page.locator('#stagePlay').click();
  await expect.poll(async () => Number(await page.locator('#sl').inputValue()))
    .toBeGreaterThan(2000);
  await page.locator('#stagePlay').click();
  await expect(page.locator('#stageReset')).toBeEnabled();
  await page.locator('#sceneControls [data-scene="lattice"]').click();
  await expect(page.locator('#stageReset')).toBeDisabled();
  await expect(page.locator('#sceneTruth')).toHaveText('Lattice');
  await expect.poll(() => page.evaluate(
    () => window.titinVisualization.currentState().camera_preset,
  )).toBe('closeup.lattice');
  expect(new URL(page.url()).hash).toContain('scene=lattice');
});

test('SC24 Explore Stretch keeps its teaching bracket and truthful Spring state', async ({ page }) => {
  await boot(page);
  await page.locator('#sl').fill('2000');
  await page.locator('#audienceEvidence').click();
  await page.locator('#closeEvidence').click();
  await page.locator('#stagePlay').click();
  // Confidence display is a top-level shared field, so Explore reports the
  // scene it is actually showing rather than a blanket Custom.
  await expect(page.locator('#sceneTruth')).toHaveText('Spring');
  await expect(page.locator('#stretchHint')).toBeVisible();
  const params = new URLSearchParams(new URL(page.url()).hash.slice(1));
  expect(params.get('scene')).toBe('spring');
  expect(params.get('depth')).toBe('explore');
  expect(params.get('confidence')).toBe('1');
  await expectGeometryInsideUnobscuredStage(page);
});

test('SC24 reduced motion lands on the same Spring maximum without tweening', async ({ page }) => {
  await setReducedMotion(page, true);
  await boot(page);
  await page.locator('#sceneControls [data-scene="z_anchor"]').click();
  await page.locator('#stagePlay').click();
  await expect(page.locator('#sl')).toHaveValue('2400');
  await expect(page.locator('#sceneTruth')).toHaveText('Spring');
  await expect(page.locator('#stretchHint')).toBeHidden();
  await expect(page.locator('#objectAnnouncement')).toContainText('Stretch complete');
  await expectGeometryInsideUnobscuredStage(page);
});
