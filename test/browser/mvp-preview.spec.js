import { readFileSync } from 'node:fs';
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
    const readout = await page.locator('.force-readout').boundingBox();
    const chart = await page.locator('#forceCurve .force-chart').boundingBox();
    expect(readout.y).toBeGreaterThan(heading.y);
    expect(readout.y + readout.height).toBeLessThan(height);
    expect(chart.y).toBeLessThan(height);
    expect(readout.y + readout.height).toBeLessThanOrEqual(chart.y);
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


test('MVP Research scope matches the canonical tissue-neutral construct through both entries', async ({ page }) => {
  const scope = JSON.parse(readFileSync(new URL('../../data/scientific_scope.json', import.meta.url)));
  await boot(page);
  await page.locator('#audienceEvidence').click();
  await page.locator('#tabInspect').click();
  await expect(page.locator('#scopeConstructStatement')).toHaveText(scope.public_badge);
  await expect(page.locator('#scopeDetails')).toContainText('does not simulate calcium activation or active contraction');
  await expect(page.locator('#scopeDetails')).not.toContainText('Human skeletal-muscle reference construct');
  await page.locator('#closeEvidence').click();
  await page.locator('#scopeBadge').click();
  await expect(page.locator('#scopeDetails')).toBeFocused();
  await expect(page.locator('#scopeConstructStatement')).toHaveText(scope.public_badge);
});

for (const [width, height] of [[1280, 720], [390, 844]]) {
  test(`MVP ${width}: final evidence action selects titin and exposes the exact source route`, async ({ page }) => {
    await setReducedMotion(page);
    await boot(page, width, height);
    await expect(page.locator('#chapterInspectEvidence')).toBeHidden();
    await page.locator('#chapterNext').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#chapterProgress')).toHaveText('Beat 4 of 5');
    await page.locator('#chapterNext').click();
    const button = page.locator('#chapterInspectEvidence');
    await expect(button).toBeVisible();
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tabEvidence')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#selectedEvidence')).toContainText('Titin');
    const sources = page.locator('#selectedEvidenceSourcesLink');
    const box = await sources.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThan(height);
    await sources.click();
    await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'object');
    await page.locator('#bibliography .source-result summary').first().click();
    await expect(page.locator('#bibliography .source-result').first()).toContainText('Locator');
    await page.locator('#closeEvidence').click();
    await expect(button).toBeFocused();
    await page.locator('#chapterNext').click();
    await expect(page.locator('#chapterProgress')).toHaveText('Beat 1 of 5');
    await expect(button).toBeHidden();
  });
}


test('MVP intermediate force labels retain declared precision and a stable control row', async ({ page }) => {
  await boot(page);
  await page.locator('#sl').fill('2200');
  await expect(page.locator('#stageForce b')).toHaveText('≈0.5 pN');
  const initial = await page.locator('#guidedCard').boundingBox();
  for (const length of [2000, 2250, 2267, 2300, 2399, 2400]) {
    await page.locator('#sl').fill(String(length));
    await expect.poll(() => new URL(page.url()).hash).toContain(`sl=${length}`);
    await expect(page.locator('#stageForce b')).toHaveText(/^≈(?:0\.\d{1,2}|1(?:\.\d)?) pN$/);
    const card = await page.locator('#guidedCard').boundingBox();
    expect(Math.abs(card.height - initial.height)).toBeLessThan(1);
  }
});
