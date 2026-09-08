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
  // A 30 s wait is only usable if the enclosing test can hold it. On the host that
  // produced the original failure the boot and setup alone reached 11.5 s, so a 30 s
  // poll inside the 60 s default would fail on the test budget instead — a worse and
  // far less diagnosable failure than the one being fixed. Raise the ceiling for the
  // tests that wait this way; it is a ceiling, not a duration, and the fast path is
  // unaffected. `setTimeout` sets rather than raises, so a caller that already asked
  // for more must not be cut back down to 90 s by calling this helper.
  test.setTimeout(Math.max(90_000, test.info().timeout));
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
  // Two long waits in one route: the sweep has to start, and then the resumed sweep has
  // to reach the endpoint. Budget for both rather than for one.
  test.setTimeout(120_000);
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


async function comparisonCamera(page) {
  return page.evaluate(() => window.titinVisualization.projectPresentationAnchors([
    { id: 'fixed-z', anchor_nm: { x: 0, y: 0, z: 0 } },
    { id: 'fixed-m', anchor_nm: { x: 1200, y: 0, z: 0 } },
  ]).flatMap((point) => [point.x_px, point.y_px]));
}
async function settledCamera(page) {
  await page.evaluate(() => { window.__stableCamera = null; });
  await page.waitForFunction(() => {
    const points = window.titinVisualization.projectPresentationAnchors([
      { id: 'fixed-z', anchor_nm: { x: 0, y: 0, z: 0 } },
      { id: 'fixed-m', anchor_nm: { x: 1200, y: 0, z: 0 } },
    ]).flatMap((point) => [point.x_px, point.y_px]);
    const signature = points.map((v) => v.toFixed(3)).join(':');
    const previous = window.__stableCamera;
    const count = previous?.signature === signature ? previous.count + 1 : 0;
    window.__stableCamera = { signature, count };
    return count >= 8;
  });
  return comparisonCamera(page);
}
async function expectSameCamera(page, baseline) {
  await expect.poll(async () => {
    const actual = await comparisonCamera(page);
    return Math.max(...actual.map((v, i) => Math.abs(v - baseline[i])));
  }).toBeLessThan(1);
}
for (const viewport of [DESKTOP, { width: 390, height: 844 }]) {
  test(`MVP ${viewport.width}: Stretch comparison frame is established on entry and retained through interaction`, async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, viewport);
    await enterStretch(page);
    await expect(page.locator('#sl')).toHaveValue('2200');
    await page.locator('#sl').fill('2000');
    await expect.poll(() => new URL(page.url()).hash).toContain('sl=2000');
    const baseline = await settledCamera(page);
    await expectGeometryInsideUnobscuredStage(page);
    await page.locator('#stagePlay').click();
    await expect(page.locator('#stagePlay')).toHaveText('Pause');
    await expectSameCamera(page, baseline);
    await page.locator('#stagePlay').click();
    await expectSameCamera(page, baseline);
    await page.locator('#stagePlay').click();
    await expect(page.locator('#sl')).toHaveValue('2400', { timeout: 30_000 });
    await expectSameCamera(page, baseline);
    await setReducedMotion(page);
    await page.locator('#stagePlay').click();
    await expect(page.locator('#sl')).toHaveValue('2400');
    await expectSameCamera(page, baseline);
    await page.locator('#sl').fill('2200');
    await expectSameCamera(page, baseline);
    await page.locator('#audienceEvidence').click();
    await page.locator('#closeEvidence').click();
    await settledCamera(page);
    await expectSameCamera(page, baseline);
  });
}

test('MVP direct Stretch entry and history preserve length, while manual camera remains Custom', async ({ page }) => {
  await setReducedMotion(page);
  await boot(page);
  await enterStretch(page);
  await page.locator('#sl').fill('2250');
  await expect.poll(() => new URL(page.url()).hash).toContain('sl=2250');
  const url = page.url();
  const baseline = await settledCamera(page);
  await page.locator('#chapterNext').click();
  await page.goBack();
  await expect(page.locator('#chapterProgress')).toHaveText('Beat 3 of 5');
  await expect(page.locator('#sl')).toHaveValue('2250');
  await settledCamera(page);
  await expectSameCamera(page, baseline);
  await page.goto(url);
  await waitForReady(page);
  await settledCamera(page);
  expect(await page.evaluate(() => window.titinVisualization.currentState().camera_preset)).toBe('view.titin_hero');
  await expectSameCamera(page, baseline);
  await expect(page.locator('#sl')).toHaveValue('2250');
  // Real orbit gesture; a click alone must not claim a manual camera change.
  await page.mouse.move(950, 310);
  await page.mouse.down();
  await page.mouse.move(1040, 350, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('#objectAnnouncement')).toContainText('Camera adjusted manually');
  const custom = await settledCamera(page);
  expect(Math.max(...custom.map((v, i) => Math.abs(v - baseline[i])))).toBeGreaterThan(1);
  await page.locator('#sl').fill('2300');
  await expectSameCamera(page, custom);
});
