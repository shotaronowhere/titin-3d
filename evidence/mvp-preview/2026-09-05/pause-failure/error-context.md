# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stretch.spec.js >> SC24/27A Pause freezes the sweep at an exact slider value
- Location: test/browser/stretch.spec.js:123:1

# Error details

```
Error: Timeout 8000ms exceeded while waiting on the predicate
```

# Test source

```ts
  29  | }
  30  | 
  31  | async function framedGeometry(page) {
  32  |   return page.evaluate(() => {
  33  |     const vis = window.titinVisualization;
  34  |     const overlay = vis.showcaseOverlay();
  35  |     const records = [
  36  |       ...overlay.termini,
  37  |       ...overlay.brackets.flatMap((bracket) => [
  38  |         { id: `${bracket.id}:start`, anchor_nm: { x: bracket.start_nm, y: 0, z: 0 } },
  39  |         { id: `${bracket.id}:end`, anchor_nm: { x: bracket.end_nm, y: 0, z: 0 } },
  40  |       ]),
  41  |     ];
  42  |     const canvas = document.querySelector('#canvas').getBoundingClientRect();
  43  |     const header = document.querySelector('#stageHeader').getBoundingClientRect();
  44  |     const story = document.querySelector('#guidedCard').getBoundingClientRect();
  45  |     const label = [...document.querySelectorAll('#scienceOverlay .science-label')]
  46  |       .find((node) => node.textContent === 'I-band');
  47  |     const labelBox = label?.getBoundingClientRect();
  48  |     return {
  49  |       width: canvas.width,
  50  |       top: header.bottom - canvas.top,
  51  |       bottom: story.top - canvas.top,
  52  |       points: vis.projectPresentationAnchors(records),
  53  |       iBandLabel: labelBox ? {
  54  |         left: labelBox.left - canvas.left, right: labelBox.right - canvas.left,
  55  |         top: labelBox.top - canvas.top, bottom: labelBox.bottom - canvas.top,
  56  |       } : null,
  57  |     };
  58  |   });
  59  | }
  60  | 
  61  | async function expectGeometryInsideUnobscuredStage(page) {
  62  |   await expect.poll(async () => (await framedGeometry(page)).iBandLabel).not.toBeNull();
  63  |   const geometry = await framedGeometry(page);
  64  |   for (const point of geometry.points) {
  65  |     expect(point.visible, point.id).toBe(true);
  66  |     expect(point.x_px, `${point.id} x`).toBeGreaterThanOrEqual(0);
  67  |     expect(point.x_px, `${point.id} x`).toBeLessThanOrEqual(geometry.width);
  68  |     expect(point.y_px, `${point.id} y above chrome`).toBeGreaterThanOrEqual(geometry.top);
  69  |     expect(point.y_px, `${point.id} y below story`).toBeLessThanOrEqual(geometry.bottom);
  70  |   }
  71  |   expect(geometry.iBandLabel.left).toBeGreaterThanOrEqual(0);
  72  |   expect(geometry.iBandLabel.right).toBeLessThanOrEqual(geometry.width);
  73  |   expect(geometry.iBandLabel.top).toBeGreaterThanOrEqual(geometry.top);
  74  |   expect(geometry.iBandLabel.bottom).toBeLessThanOrEqual(geometry.bottom);
  75  | }
  76  | 
  77  | test('MVP Stretch opens in the Spring scene and keeps its geometry framed', async ({ page }) => {
  78  |   await boot(page);
  79  |   await enterStretch(page);
  80  |   await page.locator('#sl').fill('2000');
  81  |   await page.locator('#stagePlay').click();
  82  |   await expectSpringSweep(page);
  83  |   expect(new URL(page.url()).hash).toContain('scene=spring');
  84  |   await expectGeometryInsideUnobscuredStage(page);
  85  | });
  86  | 
  87  | test('SC24/27A Stretch replaces a Research close-up before running', async ({ page }) => {
  88  |   await boot(page);
  89  |   await enterStretch(page);
  90  |   await page.locator('#sl').fill('2000');
  91  |   await page.locator('#audienceEvidence').click();
  92  |   await page.locator('.research-inventory summary').click();
  93  |   await page.locator('#sceneControls [data-scene="z_anchor"]').click();
  94  |   await page.locator('#closeEvidence').click();
  95  |   await page.locator('#stagePlay').click();
  96  |   await expectSpringSweep(page);
  97  |   await expectGeometryInsideUnobscuredStage(page);
  98  | });
  99  | 
  100 | test('SC24/27A mobile Stretch reframes before its first length frame', async ({ page }) => {
  101 |   await boot(page, PHONE);
  102 |   await enterStretch(page);
  103 |   await page.locator('#sl').fill('2000');
  104 |   await page.locator('#stagePlay').click();
  105 |   await expectSpringSweep(page);
  106 |   await expectGeometryInsideUnobscuredStage(page);
  107 | });
  108 | 
  109 | test('SC24/27A Stretch reaches the supported maximum with geometry retained', async ({ page }) => {
  110 |   await boot(page);
  111 |   await enterStretch(page);
  112 |   await page.locator('#sl').fill('2000');
  113 |   await page.locator('#stagePlay').click();
  114 |   await expectSpringSweep(page);
  115 |   // Headless WebGL can throttle requestAnimationFrame substantially while the
  116 |   // geometry rebuilds; the semantic endpoint, not wall-clock throughput, is the contract.
  117 |   await expect(page.locator('#sl')).toHaveValue('2400', { timeout: 30_000 });
  118 |   await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
  119 |   await expect(page.locator('#objectAnnouncement')).toContainText('Stretch complete');
  120 |   await expectGeometryInsideUnobscuredStage(page);
  121 | });
  122 | 
  123 | test('SC24/27A Pause freezes the sweep at an exact slider value', async ({ page }) => {
  124 |   await boot(page);
  125 |   await enterStretch(page);
  126 |   await page.locator('#sl').fill('2000');
  127 |   await page.locator('#stagePlay').click();
  128 |   await expect.poll(async () => Number(await page.locator('#sl').inputValue()))
> 129 |     .toBeGreaterThan(2000);
      |      ^ Error: Timeout 8000ms exceeded while waiting on the predicate
  130 |   await page.locator('#stagePlay').click();
  131 |   const paused = await page.locator('#sl').inputValue();
  132 |   expect(Number(paused)).toBeLessThan(2400);
  133 |   await page.waitForTimeout(300);
  134 |   await expect(page.locator('#sl')).toHaveValue(paused);
  135 |   await page.locator('#sl').fill('2000');
  136 |   await expect(page.locator('#sl')).toHaveValue('2000');
  137 | });
  138 | 
  139 | test('SC24/27A leaving Stretch stops mechanics without stale state', async ({ page }) => {
  140 |   await boot(page);
  141 |   await enterStretch(page);
  142 |   await page.locator('#sl').fill('2000');
  143 |   await page.locator('#stagePlay').click();
  144 |   await expect.poll(async () => Number(await page.locator('#sl').inputValue()))
  145 |     .toBeGreaterThan(2000);
  146 |   await page.locator('#chapterNext').click();
  147 |   await expect(page.locator('#chapterProgress')).toHaveText('Beat 4 of 5');
  148 |   await expect(page.locator('#tourMechanics')).toBeHidden();
  149 |   const stopped = await page.locator('#sl').inputValue();
  150 |   await page.waitForTimeout(300);
  151 |   await expect(page.locator('#sl')).toHaveValue(stopped);
  152 | });
  153 | 
  154 | test('SC24/27A Research round-trip retains the Stretch teaching state', async ({ page }) => {
  155 |   await boot(page);
  156 |   await enterStretch(page);
  157 |   await page.locator('#sl').fill('2000');
  158 |   await page.locator('#audienceEvidence').click();
  159 |   await page.locator('#closeEvidence').click();
  160 |   await page.locator('#stagePlay').click();
  161 |   await expectSpringSweep(page);
  162 |   await expect(page.locator('#chapterProgress')).toHaveText('Beat 3 of 5');
  163 |   await expectGeometryInsideUnobscuredStage(page);
  164 | });
  165 | 
  166 | test('SC24 reduced motion lands on the same Spring maximum without tweening', async ({ page }) => {
  167 |   await setReducedMotion(page, true);
  168 |   await boot(page);
  169 |   await enterStretch(page);
  170 |   await page.locator('#sl').fill('2000');
  171 |   await page.locator('#stagePlay').click();
  172 |   await expect(page.locator('#sl')).toHaveValue('2400');
  173 |   await expect(page.locator('#stagePlay')).toHaveText(/Replay stretch/);
  174 |   await expect(page.locator('#objectAnnouncement')).toContainText('Stretch complete');
  175 |   await expectGeometryInsideUnobscuredStage(page);
  176 | });
  177 | 
```