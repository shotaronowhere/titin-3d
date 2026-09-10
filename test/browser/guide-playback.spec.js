import { test, expect } from '@playwright/test';
import { failOnPageErrors, waitForReady } from './helpers.js';
failOnPageErrors(test);

test('guide disclosure keeps a running stretch controllable and preserves the fixed comparison scale', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#v=2&depth=learn&step=stretch_spring&sl=2000&drawer=closed&scene=spring&confidence=0');
  await waitForReady(page);
  // Hold animation time while real controls are exercised, so a slow test host
  // cannot complete the sweep between the two disclosure clicks.
  const clockStart = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({ time: clockStart });
  await page.clock.pauseAt(new Date(clockStart.getTime() + 60_000));
  const distance = () => page.evaluate(() => {
    const v = window.titinVisualization.viewer;
    return v.camera.position.distanceTo(v.controls.target);
  });
  const before = await distance();
  await page.locator('#stagePlay').click();
  await expect(page.locator('#stagePlay')).toHaveText('Pause');
  await page.clock.runFor(100);
  await page.locator('#guideToggle').click();
  await expect(page.locator('#guideToggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#stagePlay')).toHaveText('Pause');
  expect(await distance()).toBeCloseTo(before, 4);
  await page.locator('#guideToggle').click();
  await expect(page.locator('#stagePlay')).toHaveText('Pause');
  expect(await distance()).toBeCloseTo(before, 4);
  await page.locator('#stagePlay').click();
  const stopped = await page.locator('#sl').inputValue();
  await page.clock.runFor(250);
  await expect(page.locator('#sl')).toHaveValue(stopped);
  await expect(page.locator('#stagePlay')).not.toHaveText('Pause');
});
