import { test, expect } from '@playwright/test';
import { failOnPageErrors, waitForReady, setReducedMotion } from './helpers.js';

failOnPageErrors(test);

async function boot(page, width = 1280, height = 720) {
  await page.setViewportSize({ width, height });
  await page.goto('/index.html#v=2&depth=learn&step=stretch_spring&sl=2400&drawer=closed&scene=spring&confidence=0');
  await waitForReady(page);
}

test('MVP endpoint replay traverses the working range twice without losing the Spring frame', async ({ page }) => {
  test.setTimeout(90_000);
  await boot(page);
  for (let replay = 0; replay < 2; replay += 1) {
    await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
    await page.locator('#stagePlay').click();
    await expect(page.locator('#stagePlay')).toHaveText('Pause');
    const length = Number(await page.locator('#sl').inputValue());
    expect(length).toBeGreaterThanOrEqual(2000);
    expect(length).toBeLessThan(2400);
    await expect(page.locator('#objectAnnouncement')).toContainText('Replay reset to 2,000 nm');
    await expect(page.locator('#sl')).toHaveValue('2400', { timeout: 30_000 });
    await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
    expect(new URL(page.url()).hash).toContain('scene=spring');
  }
});

test('MVP reduced-motion replay resets before showing the endpoint', async ({ page }) => {
  await setReducedMotion(page);
  await boot(page, 390, 844);
  // Observe real slider writes: an endpoint-only assertion would pass the old no-op.
  await page.evaluate(() => {
    window.__previewLengths = [];
    const input = document.querySelector('#sl');
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(input, 'value', {
      get() { return descriptor.get.call(this); },
      set(value) { window.__previewLengths.push(Number(value)); descriptor.set.call(this, value); },
    });
  });
  await page.locator('#stagePlay').click();
  await expect(page.locator('#sl')).toHaveValue('2400');
  await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
  expect(await page.evaluate(() => window.__previewLengths)).toEqual([2000, 2400]);
});

for (const [width, height] of [[1280, 720], [390, 844]]) {
  test(`MVP ${width}: modeled force opens above the fold with sensitivity explained`, async ({ page }) => {
    await boot(page, width, height);
    await expect(page.locator('#stageForce')).toContainText('modeled passive force per titin');
    await expect(page.locator('#stageForce')).not.toContainText('±');
    await page.locator('#stageForce').click();
    await expect(page.locator('#passiveForceHeading')).toBeFocused();
    const heading = await page.locator('#passiveForceHeading').boundingBox();
    const tabs = await page.locator('#drawerTabs').boundingBox();
    expect(heading.y).toBeGreaterThanOrEqual(tabs.y + tabs.height);
    expect(heading.y + heading.height).toBeLessThan(height);
    await expect(page.locator('.force-readout')).toContainText('literature parameter sensitivity, not a confidence interval');
    await page.locator('#closeEvidence').click();
    await expect(page.locator('#stageForce')).toBeFocused();
    await expect(page.locator('#sl')).toHaveValue('2400');
    await page.locator('#chapterNext').click();
    await expect(page.locator('#guidedLattice')).toBeHidden();
    await page.locator('#audienceEvidence').click();
    await page.locator('#tabMeasure').click();
    await expect(page.locator('#latticeCrossSection')).not.toBeEmpty();
    await page.locator('#tabEvidence').click();
    await expect(page.locator('#notes')).toContainText('1 representative titin path(s)');
    await expect(page.locator('#notes')).not.toContainText('6 of 42');
  });
}
