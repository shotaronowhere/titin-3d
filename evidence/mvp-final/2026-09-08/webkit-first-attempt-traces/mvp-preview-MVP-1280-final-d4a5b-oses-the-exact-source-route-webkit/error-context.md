# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mvp-preview.spec.js >> MVP 1280: final evidence action selects titin and exposes the exact source route
- Location: test/browser/mvp-preview.spec.js:97:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: expect(locator).toBeHidden() failed

Locator:  locator('#chapterInspectEvidence')
Expected: hidden
Received: undefined

Call log:
  - Expect "toBeHidden" with timeout 8000ms
  - waiting for locator('#chapterInspectEvidence')
  - 

```

# Page snapshot

```yaml
- region "Interactive 3D titin and sarcomere model. Use the pointer to inspect a structure, or Left and Right Arrow to move through structures and Enter to pin an explanation." [ref=e3]:
  - img "Projected sarcomere landmarks, titin termini, and the stage scale bar" [ref=e4]:
    - generic [ref=e12]: Z-disc · N-terminus
    - generic [ref=e13]: M-line · C-terminus
    - generic [ref=e14]: Z-disc
    - generic [ref=e15]: I-band
    - generic [ref=e16]: A-band
    - generic [ref=e17]:
      - generic [ref=e19]: I-band · extensible
      - generic [ref=e21]: A-band span · fixed in this model
    - button "Inspect Z-disc anchor (Z1-Z2 Ig + Z-repeats)" [ref=e24] [cursor=pointer]
    - generic [ref=e25] [cursor=pointer]: N · Z-disc anchor
    - button "Inspect M-line Ig region (M1-M10)" [ref=e28] [cursor=pointer]
    - generic [ref=e29] [cursor=pointer]: C · M-band anchor
    - generic [ref=e31]: 200 nm
    - generic [ref=e32]: titin line ≈2.3× reading width, not scale
  - status [ref=e33]:
    - generic [ref=e34]: Click or tap a structure to explain it
  - generic:
    - generic:
      - generic [ref=e36]:
        - generic [ref=e37]: Titin across the sarcomere
        - generic [ref=e38]: Research preview · titin in muscle
      - generic [ref=e39]:
        - button "Open Research scope details" [ref=e40] [cursor=pointer]:
          - generic [ref=e41]: Scope details
          - generic [ref=e42]: Human TTN reference sequence · Q8WZ42-1
          - generic [ref=e43]: Upper working-range geometry · 2,400 nm
        - button "Research" [ref=e44] [cursor=pointer]
    - region [ref=e45]:
      - generic [ref=e46]: Beat 3 of 5
      - paragraph [ref=e55]: How is titin built, and what changes during stretch?
      - heading "Build and stretch the spring" [level=1] [ref=e56]
      - generic [ref=e57]:
        - paragraph [ref=e58]: During stretch, folded-domain chains straighten and flexible I-band segments extend while titin’s A-band span stays fixed in this model and predicted passive force rises.
        - status [ref=e59]: Framing the spring and scaffold for stretch while preserving your current sarcomere length.
        - region "Stretch demonstration" [ref=e60]:
          - generic [ref=e61]: Sarcomere length
          - slider "Sarcomere length in nanometres" [ref=e62] [cursor=pointer]: "2400"
          - generic [ref=e63]: The green track segment marks the supported working range from 2000 to 2400 nanometres.
          - status [ref=e64]: 2,400 nm
          - 'button "Replay stretch: reset to the working-range minimum and stretch again" [ref=e65] [cursor=pointer]': ↻ Replay stretch
          - button "≈1.3 pN · supported · modeled passive force per titin" [ref=e66] [cursor=pointer]
        - generic [ref=e67]:
          - 'button "Previous: Follow one giant molecule" [ref=e68] [cursor=pointer]': Previous
          - 'button "Next: Scaffold the thick filament" [ref=e69] [cursor=pointer]': Next
  - generic [ref=e70]:
    - text: "drag: orbit · wheel/pinch: zoom · right-drag: pan"
    - generic [ref=e71]: 1–5 beats · space stretch · x stretch beat · e Research · g Tour · r restart
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
  9   |   await page.goto('/index.html#v=2&depth=learn&step=stretch_spring&sl=2400&drawer=closed&scene=spring&confidence=0');
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
> 100 |     await expect(page.locator('#chapterInspectEvidence')).toBeHidden();
      |                                                           ^ Error: expect(locator).toBeHidden() failed
  101 |     // Rehearse the complete route: Measure scrolls the shared Research panel
  102 |     // before the finale opens a different section. Its old offset must not leak.
  103 |     await page.locator('#stageForce').click();
  104 |     await expect(page.locator('#passiveForceHeading')).toBeFocused();
  105 |     await page.locator('#closeEvidence').click();
  106 |     await page.locator('#chapterNext').focus();
  107 |     await page.keyboard.press('Enter');
  108 |     await expect(page.locator('#chapterProgress')).toHaveText('Beat 4 of 5');
  109 |     await page.locator('#chapterNext').click();
  110 |     const button = page.locator('#chapterInspectEvidence');
  111 |     await expect(button).toBeVisible();
  112 |     await button.focus();
  113 |     await page.keyboard.press('Enter');
  114 |     await expect(page.locator('#tabEvidence')).toHaveAttribute('aria-selected', 'true');
  115 |     await expect(page.locator('#closeEvidence')).toBeFocused();
  116 |     await expect(page.locator('#selectedEvidence')).toContainText('Titin');
  117 |     const sources = page.locator('#selectedEvidenceSourcesLink');
  118 |     const box = await sources.boundingBox();
  119 |     expect(box.y).toBeGreaterThanOrEqual(0);
  120 |     expect(box.y + box.height).toBeLessThan(height);
  121 |     await sources.click();
  122 |     await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'object');
  123 |     await page.locator('#bibliography .source-result summary').first().click();
  124 |     await expect(page.locator('#bibliography .source-result').first()).toContainText('Locator');
  125 |     await page.locator('#closeEvidence').click();
  126 |     await expect(button).toBeFocused();
  127 |     await page.locator('#chapterNext').click();
  128 |     await expect(page.locator('#chapterProgress')).toHaveText('Beat 1 of 5');
  129 |     await expect(button).toBeHidden();
  130 |   });
  131 | }
  132 | 
  133 | 
  134 | test('MVP intermediate force labels retain declared precision and a stable control row', async ({ page }) => {
  135 |   await boot(page);
  136 |   await page.locator('#sl').fill('2200');
  137 |   await expect(page.locator('#stageForce b')).toHaveText('≈0.5 pN');
  138 |   const initial = await page.locator('#guidedCard').boundingBox();
  139 |   for (const length of [2000, 2250, 2267, 2300, 2399, 2400]) {
  140 |     await page.locator('#sl').fill(String(length));
  141 |     await expect.poll(() => new URL(page.url()).hash).toContain(`sl=${length}`);
  142 |     await expect(page.locator('#stageForce b')).toHaveText(/^≈(?:0\.\d{1,2}|1(?:\.\d)?) pN$/);
  143 |     const card = await page.locator('#guidedCard').boundingBox();
  144 |     expect(Math.abs(card.height - initial.height)).toBeLessThan(1);
  145 |   }
  146 | });
  147 | 
```