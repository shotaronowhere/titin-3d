# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mvp-preview.spec.js >> MVP intermediate force labels retain declared precision and a stable control row
- Location: test/browser/mvp-preview.spec.js:134:1

# Error details

```
Error: page.goto: Test ended.
Call log:
  - navigating to "http://127.0.0.1:4173/index.html#v=2&depth=learn&step=stretch_spring&sl=2400&drawer=closed&scene=spring&confidence=0", waiting until "load"

```

# Test source

```ts
  1   | import { readFileSync } from 'node:fs';
  2   | import { test, expect } from '@playwright/test';
  3   | import { failOnPageErrors, waitForReady, setReducedMotion } from './helpers.js';
  4   | 
  5   | failOnPageErrors(test);
  6   | 
  7   | async function boot(page, width = 1280, height = 720) {
  8   |   await page.setViewportSize({ width, height });
> 9   |   await page.goto('/index.html#v=2&depth=learn&step=stretch_spring&sl=2400&drawer=closed&scene=spring&confidence=0');
      |              ^ Error: page.goto: Test ended.
  10  |   await waitForReady(page);
  11  | }
  12  | 
  13  | test('MVP endpoint replay traverses the working range twice without losing the Spring frame', async ({ page }) => {
  14  |   test.setTimeout(90_000);
  15  |   await boot(page);
  16  |   for (let replay = 0; replay < 2; replay += 1) {
  17  |     await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
  18  |     await page.locator('#stagePlay').click();
  19  |     await expect(page.locator('#stagePlay')).toHaveText('Pause');
  20  |     const length = Number(await page.locator('#sl').inputValue());
  21  |     expect(length).toBeGreaterThanOrEqual(2000);
  22  |     expect(length).toBeLessThan(2400);
  23  |     await expect(page.locator('#objectAnnouncement')).toContainText('Replay reset to 2,000 nm');
  24  |     await expect(page.locator('#sl')).toHaveValue('2400', { timeout: 30_000 });
  25  |     await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
  26  |     expect(new URL(page.url()).hash).toContain('scene=spring');
  27  |   }
  28  | });
  29  | 
  30  | test('MVP reduced-motion replay resets before showing the endpoint', async ({ page }) => {
  31  |   await setReducedMotion(page);
  32  |   await boot(page, 390, 844);
  33  |   // Observe real slider writes: an endpoint-only assertion would pass the old no-op.
  34  |   await page.evaluate(() => {
  35  |     window.__previewLengths = [];
  36  |     const input = document.querySelector('#sl');
  37  |     const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  38  |     Object.defineProperty(input, 'value', {
  39  |       get() { return descriptor.get.call(this); },
  40  |       set(value) { window.__previewLengths.push(Number(value)); descriptor.set.call(this, value); },
  41  |     });
  42  |   });
  43  |   await page.locator('#stagePlay').click();
  44  |   await expect(page.locator('#sl')).toHaveValue('2400');
  45  |   await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
  46  |   expect(await page.evaluate(() => window.__previewLengths)).toEqual([2000, 2400]);
  47  | });
  48  | 
  49  | for (const [width, height] of [[1280, 720], [390, 844]]) {
  50  |   test(`MVP ${width}: modeled force opens above the fold with sensitivity explained`, async ({ page }) => {
  51  |     await boot(page, width, height);
  52  |     await expect(page.locator('#stageForce')).toContainText('modeled passive force per titin');
  53  |     await expect(page.locator('#stageForce')).not.toContainText('±');
  54  |     await page.locator('#stageForce').click();
  55  |     await expect(page.locator('#passiveForceHeading')).toBeFocused();
  56  |     const heading = await page.locator('#passiveForceHeading').boundingBox();
  57  |     const tabs = await page.locator('#drawerTabs').boundingBox();
  58  |     expect(heading.y).toBeGreaterThanOrEqual(tabs.y + tabs.height);
  59  |     expect(heading.y + heading.height).toBeLessThan(height);
  60  |     await expect(page.locator('.force-readout')).toContainText('literature parameter sensitivity, not a confidence interval');
  61  |     const readout = await page.locator('.force-readout').boundingBox();
  62  |     const chart = await page.locator('#forceCurve .force-chart').boundingBox();
  63  |     expect(readout.y).toBeGreaterThan(heading.y);
  64  |     expect(readout.y + readout.height).toBeLessThan(height);
  65  |     expect(chart.y).toBeLessThan(height);
  66  |     expect(readout.y + readout.height).toBeLessThanOrEqual(chart.y);
  67  |     await page.locator('#closeEvidence').click();
  68  |     await expect(page.locator('#stageForce')).toBeFocused();
  69  |     await expect(page.locator('#sl')).toHaveValue('2400');
  70  |     await page.locator('#chapterNext').click();
  71  |     await expect(page.locator('#guidedLattice')).toBeHidden();
  72  |     await page.locator('#audienceEvidence').click();
  73  |     await page.locator('#tabMeasure').click();
  74  |     await expect(page.locator('#latticeCrossSection')).not.toBeEmpty();
  75  |     await page.locator('#tabEvidence').click();
  76  |     await expect(page.locator('#notes')).toContainText('1 representative titin path(s)');
  77  |     await expect(page.locator('#notes')).not.toContainText('6 of 42');
  78  |   });
  79  | }
  80  | 
  81  | 
  82  | test('MVP Research scope matches the canonical tissue-neutral construct through both entries', async ({ page }) => {
  83  |   const scope = JSON.parse(readFileSync(new URL('../../data/scientific_scope.json', import.meta.url)));
  84  |   await boot(page);
  85  |   await page.locator('#audienceEvidence').click();
  86  |   await page.locator('#tabInspect').click();
  87  |   await expect(page.locator('#scopeConstructStatement')).toHaveText(scope.public_badge);
  88  |   await expect(page.locator('#scopeDetails')).toContainText('does not simulate calcium activation or active contraction');
  89  |   await expect(page.locator('#scopeDetails')).not.toContainText('Human skeletal-muscle reference construct');
  90  |   await page.locator('#closeEvidence').click();
  91  |   await page.locator('#scopeBadge').click();
  92  |   await expect(page.locator('#scopeDetails')).toBeFocused();
  93  |   await expect(page.locator('#scopeConstructStatement')).toHaveText(scope.public_badge);
  94  | });
  95  | 
  96  | for (const [width, height] of [[1280, 720], [390, 844]]) {
  97  |   test(`MVP ${width}: final evidence action selects titin and exposes the exact source route`, async ({ page }) => {
  98  |     await setReducedMotion(page);
  99  |     await boot(page, width, height);
  100 |     await expect(page.locator('#chapterInspectEvidence')).toBeHidden();
  101 |     // Rehearse the complete route: Measure scrolls the shared Research panel
  102 |     // before the finale opens a different section. Its old offset must not leak.
  103 |     await page.locator('#stageForce').click();
  104 |     await expect(page.locator('#passiveForceHeading')).toBeFocused();
  105 |     await page.locator('#closeEvidence').click();
  106 |     await page.locator('#chapterNext').focus();
  107 |     await page.keyboard.press('Enter');
  108 |     await expect(page.locator('#chapterProgress')).toHaveText('Beat 4 of 5');
  109 |     await page.locator('#chapterNext').click();
```