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

async function enterStretch(page) {
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await expect(page.locator('#chapterProgress')).toHaveText('Beat 3 of 5');
  await expect(page.locator('#tourMechanics')).toBeVisible();
}

async function expectSpringSweep(page) {
  await expect(page.locator('#stagePlay')).toHaveText('Pause');
  expect(new URL(page.url()).hash).toContain('scene=spring');
  await expect.poll(() => page.evaluate(
    () => window.titinVisualization.currentState().camera_preset,
  )).toBe('view.titin_hero');
}

// The contract is that the sweep starts moving, not that a loaded host reports it
// promptly. In the 2026-09-05 integrated run this poll timed out while its own first
// `#sl` read was still in flight: the read was issued at 11.5 s, the driver did not
// begin resolving the locator until 18.0 s, and it returned "2053" at 22.0 s — the
// page had started and moved, and the 8 s expect budget expired mid-round-trip
// (evidence/mvp-preview/2026-09-05/pause-failure/trace.zip). Give it the same 30 s
// headroom the supported-maximum assertion below already carries. The predicate is
// unchanged, so a sweep that never starts still fails.
async function expectSweepStarted(page) {
  await expect.poll(
    async () => Number(await page.locator('#sl').inputValue()),
    { timeout: 30_000 },
  ).toBeGreaterThan(2000);
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
    const story = document.querySelector('#guidedCard').getBoundingClientRect();
    const label = [...document.querySelectorAll('#scienceOverlay .science-label')]
      .find((node) => node.textContent === 'I-band');
    const labelBox = label?.getBoundingClientRect();
    return {
      width: canvas.width,
      top: header.bottom - canvas.top,
      bottom: story.top - canvas.top,
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
    expect(point.y_px, `${point.id} y below story`).toBeLessThanOrEqual(geometry.bottom);
  }
  expect(geometry.iBandLabel.left).toBeGreaterThanOrEqual(0);
  expect(geometry.iBandLabel.right).toBeLessThanOrEqual(geometry.width);
  expect(geometry.iBandLabel.top).toBeGreaterThanOrEqual(geometry.top);
  expect(geometry.iBandLabel.bottom).toBeLessThanOrEqual(geometry.bottom);
}

test('MVP Stretch opens in the Spring scene and keeps its geometry framed', async ({ page }) => {
  await boot(page);
  await enterStretch(page);
  await page.locator('#sl').fill('2000');
  await page.locator('#stagePlay').click();
  await expectSpringSweep(page);
  expect(new URL(page.url()).hash).toContain('scene=spring');
  await expectGeometryInsideUnobscuredStage(page);
});

test('SC24/27A Stretch replaces a Research close-up before running', async ({ page }) => {
  await boot(page);
  await enterStretch(page);
  await page.locator('#sl').fill('2000');
  await page.locator('#audienceEvidence').click();
  await page.locator('.research-inventory summary').click();
  await page.locator('#sceneControls [data-scene="z_anchor"]').click();
  await page.locator('#closeEvidence').click();
  await page.locator('#stagePlay').click();
  await expectSpringSweep(page);
  await expectGeometryInsideUnobscuredStage(page);
});

test('SC24/27A mobile Stretch reframes before its first length frame', async ({ page }) => {
  await boot(page, PHONE);
  await enterStretch(page);
  await page.locator('#sl').fill('2000');
  await page.locator('#stagePlay').click();
  await expectSpringSweep(page);
  await expectGeometryInsideUnobscuredStage(page);
});

test('SC24/27A Stretch reaches the supported maximum with geometry retained', async ({ page }) => {
  await boot(page);
  await enterStretch(page);
  await page.locator('#sl').fill('2000');
  await page.locator('#stagePlay').click();
  await expectSpringSweep(page);
  // Headless WebGL can throttle requestAnimationFrame substantially while the
  // geometry rebuilds; the semantic endpoint, not wall-clock throughput, is the contract.
  await expect(page.locator('#sl')).toHaveValue('2400', { timeout: 30_000 });
  await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
  await expect(page.locator('#objectAnnouncement')).toContainText('Stretch complete');
  await expectGeometryInsideUnobscuredStage(page);
});

test('SC24/27A Pause freezes the sweep at an exact slider value', async ({ page }) => {
  await boot(page);
  await enterStretch(page);
  await page.locator('#sl').fill('2000');
  await page.locator('#stagePlay').click();
  await expectSweepStarted(page);
  await page.locator('#stagePlay').click();
  const paused = await page.locator('#sl').inputValue();
  expect(Number(paused)).toBeLessThan(2400);
  await page.waitForTimeout(300);
  await expect(page.locator('#sl')).toHaveValue(paused);
  await page.locator('#sl').fill('2000');
  await expect(page.locator('#sl')).toHaveValue('2000');
});

test('SC24/27A resuming a paused stretch continues instead of resetting', async ({ page }) => {
  test.setTimeout(90_000);
  await boot(page);
  await enterStretch(page);
  await page.locator('#sl').fill('2000');
  await page.locator('#stagePlay').click();
  await expectSweepStarted(page);
  await page.locator('#stagePlay').click();
  const paused = Number(await page.locator('#sl').inputValue());
  expect(paused).toBeGreaterThan(2000);
  expect(paused).toBeLessThan(2400);
  // Only an explicit endpoint replay resets to the working minimum, so no frame of
  // the resumed sweep may write a length below the paused one. Record every write:
  // reading the endpoint alone would also pass a reset that raced back up to 2,400.
  await page.evaluate(() => {
    window.__resumeLengths = [];
    const input = document.querySelector('#sl');
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(input, 'value', {
      get() { return descriptor.get.call(this); },
      set(value) { window.__resumeLengths.push(Number(value)); descriptor.set.call(this, value); },
    });
  });
  await page.locator('#stagePlay').click();
  await expect(page.locator('#objectAnnouncement')).not.toContainText('Replay reset');
  await expect(page.locator('#sl')).toHaveValue('2400', { timeout: 30_000 });
  const resumed = await page.evaluate(() => window.__resumeLengths);
  expect(resumed.length).toBeGreaterThan(0);
  expect(Math.min(...resumed)).toBeGreaterThanOrEqual(paused);
  await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
});

test('SC24/27A leaving Stretch stops mechanics without stale state', async ({ page }) => {
  await boot(page);
  await enterStretch(page);
  await page.locator('#sl').fill('2000');
  await page.locator('#stagePlay').click();
  await expectSweepStarted(page);
  await page.locator('#chapterNext').click();
  await expect(page.locator('#chapterProgress')).toHaveText('Beat 4 of 5');
  await expect(page.locator('#tourMechanics')).toBeHidden();
  const stopped = await page.locator('#sl').inputValue();
  await page.waitForTimeout(300);
  await expect(page.locator('#sl')).toHaveValue(stopped);
});

test('SC24/27A Research round-trip retains the Stretch teaching state', async ({ page }) => {
  await boot(page);
  await enterStretch(page);
  await page.locator('#sl').fill('2000');
  await page.locator('#audienceEvidence').click();
  await page.locator('#closeEvidence').click();
  await page.locator('#stagePlay').click();
  await expectSpringSweep(page);
  await expect(page.locator('#chapterProgress')).toHaveText('Beat 3 of 5');
  await expectGeometryInsideUnobscuredStage(page);
});

test('SC24 reduced motion lands on the same Spring maximum without tweening', async ({ page }) => {
  await setReducedMotion(page, true);
  await boot(page);
  await enterStretch(page);
  await page.locator('#sl').fill('2000');
  await page.locator('#stagePlay').click();
  await expect(page.locator('#sl')).toHaveValue('2400');
  await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
  await expect(page.locator('#objectAnnouncement')).toContainText('Stretch complete');
  await expectGeometryInsideUnobscuredStage(page);
});
