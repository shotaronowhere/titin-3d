# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: final-polish.spec.js >> Final polish 1280: force labels are readable and Large type actually enlarges them
- Location: test/browser/final-polish.spec.js:38:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 6

- Array []
+ Array [
+   Array [
+     "1,900",
+     "0.0",
+   ],
+ ]
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Interactive 3D titin and sarcomere model. Use the pointer to inspect a structure, or Left and Right Arrow to move through structures and Enter to pin an explanation." [ref=e3]:
    - img "Projected sarcomere landmarks, titin termini, and the stage scale bar" [ref=e4]:
      - button "Inspect Z-disc anchor (Z1-Z2 Ig + Z-repeats)" [ref=e7] [cursor=pointer]
      - text: N · Z-disc anchor
      - button "Inspect M-line Ig region (M1-M10)" [ref=e10] [cursor=pointer]
      - text: C · M-band anchor100 nmtitin line ≈2× reading width, not scale
    - status [ref=e12]:
      - generic [ref=e13]: Click or tap a structure to explain it
    - generic:
      - generic:
        - generic [ref=e15]:
          - generic [ref=e16]: Titin across the sarcomere
          - generic [ref=e17]: Research preview · titin in muscle
        - generic [ref=e18]:
          - button "Open Research scope details" [ref=e19] [cursor=pointer]:
            - generic [ref=e20]: Scope details
            - generic [ref=e21]: Human TTN reference sequence · Q8WZ42-1
            - generic [ref=e22]: Upper working-range geometry · 2,400 nm
          - button "Research" [pressed] [ref=e23] [cursor=pointer]
      - status [ref=e24]: "Shared-state notice: URL v2 requires either a semantic scene or a complete custom state; using Overview."
    - generic [ref=e25]:
      - text: "drag: orbit · wheel/pinch: zoom · right-drag: pan"
      - generic [ref=e26]: 1–5 beats · space stretch · x stretch beat · e Research · g Tour · r restart
  - 'complementary "Research: visualization controls and scientific readouts" [ref=e29]':
    - generic [ref=e31]:
      - generic [ref=e32]:
        - heading "Research" [level=1] [ref=e33]
        - generic [ref=e34]: Inspecting the current titin selection
      - generic [ref=e35]:
        - button "Large type" [active] [pressed] [ref=e36] [cursor=pointer]
        - button "Close" [ref=e37] [cursor=pointer]
    - tablist "Research sections" [ref=e38]:
      - tab "Inspect" [ref=e39] [cursor=pointer]
      - tab "Measure" [selected] [ref=e40] [cursor=pointer]
      - tab "Evidence" [ref=e41] [cursor=pointer]
      - tab "Sources & build" [ref=e42] [cursor=pointer]
    - tabpanel "Measure" [ref=e43]:
      - heading "Sarcomere length" [level=2] [ref=e44]
      - generic [ref=e45]: 2400 nm
      - generic [ref=e46]: The current Tour or restored URL state supplies this value.
      - generic [ref=e47]: Sarcomere length controls passive geometry here; it does not set calcium activation or simulate an active-contraction trajectory. The 2,000–2,400 nm interval is this model's declared comparison range, not a universal range for every muscle.
      - heading "Geometry at this length" [level=2] [ref=e48]
      - table [ref=e49]:
        - rowgroup [ref=e50]:
          - row [ref=e51]:
            - cell "Half-sarcomere" [ref=e52]
            - cell "1200.0 nm" [ref=e53]
          - row [ref=e54]:
            - cell "I-band half-width" [ref=e55]
            - cell "400.0 nm" [ref=e56]
          - row [ref=e57]:
            - cell "Thin/thick overlap" [ref=e58]
            - cell "675.0 nm" [ref=e59]
          - row [ref=e60]:
            - cell "d10 spacing" [ref=e61]
            - cell "38.13 nm" [ref=e62]
          - row [ref=e63]:
            - cell "Filament context" [ref=e64]
            - cell "immediate neighbours (1 myosin thick filament + 6 actin thin filaments)" [ref=e65]
          - row [ref=e66]:
            - cell "Thick filaments built" [ref=e67]
            - cell "1" [ref=e68]
          - row [ref=e69]:
            - cell "Thin filaments built" [ref=e70]
            - cell "6" [ref=e71]
          - row [ref=e72]:
            - cell "Representative titin paths built" [ref=e73]
            - cell "1" [ref=e74]
          - row [ref=e75]:
            - cell "Representative titin A-band radius" [ref=e76]
            - cell "7.50 nm · thick-filament periphery · schematic azimuth" [ref=e77]
          - row [ref=e78]:
            - cell "A-band display allocation" [ref=e79]
            - cell "695.0 nm · SCHEMATIC and invariant in the renderer" [ref=e80]
          - row [ref=e81]:
            - cell "C-zone sequence/display derivation" [ref=e82]
            - cell "11 domains × 3.98 nm mean = 43.78 nm · 11 repeats displayed" [ref=e83]
          - row [ref=e84]:
            - cell "Distinct thick-filament spacings" [ref=e85]
            - cell "H 43.17 nm · crown 14.3 nm · L ≈45.54 nm" [ref=e86]
      - heading "Passive force" [level=2] [ref=e87]
      - generic [ref=e88]: Rat/rabbit skeletal-muscle + recombinant-human literature transfer · SD-04 APPROVED WITH LIMITS · approximate passive pN per titin
      - generic [ref=e90]:
        - generic [ref=e91]: "Force evaluation: supported"
        - generic [ref=e92]: 1.3 ± 0.8 pN · supported · model estimate; ± is literature parameter sensitivity, not a confidence interval.
        - generic [ref=e93]: Inside the SD-04-approved supported interval. Approximate passive force per titin only; active force and non-titin passive contributions are excluded.
        - figure "sarcomere length (nm)" [ref=e94]:
          - paragraph [ref=e95]: approximate passive force per titin (pN)
          - group "Approximate passive force per titin across sarcomere length, with supported and extrapolated regimes and parameter sensitivity range." [ref=e96]:
            - text: 1,9000.02,1200.502,3401.02,5601.52,7802.03,0002.5
            - button "Sources for modeled chart point at 2400 nm, 1.3 ± 0.8 pN, supported" [ref=e113] [cursor=pointer]
            - text: 1.3 ± 0.8 pN
        - generic [ref=e115]: "Approximate passive force per titin for a tissue-neutral Q8WZ42-1 reference-sequence model, not a measured or tissue-specific human force. Material values transfer rat/rabbit skeletal-muscle and recombinant-human evidence. The band is one-at-a-time literature parameter sensitivity, not a confidence interval or biological variance. Slack/contact/compression and Ig unfolding/refolding are omitted; force is not evaluated below 2000 nm or at/above 2500 nm. Not claimed: a measured single-molecule force trace for this sarcomere; total passive muscle tension, which includes non-titin contributions; any active or calcium-dependent force; a supported absolute-pN range beyond the exact SD-04-authorized regime."
        - generic [ref=e116]: Added regional length is shown separately from incremental compliance. Absolute regional length is not a compliance share.
        - table [ref=e117]:
          - row [ref=e118]:
            - columnheader "Region" [ref=e119]
            - columnheader "Current extension" [ref=e120]
            - columnheader "Added length from shortest state" [ref=e121]
            - columnheader "Incremental compliance" [ref=e122]
          - row [ref=e123]:
            - cell "Proximal tandem Ig (I-band)" [ref=e124]
            - cell "235.4 nm" [ref=e125]
            - cell "150.9 nm" [ref=e126]
            - cell "25 nm/pN" [ref=e127]
          - row [ref=e128]:
            - cell "N2A I80-UN2A-I81-I82-I83 signaling element" [ref=e129]
            - cell "18.6 nm" [ref=e130]
            - cell "2.4 nm" [ref=e131]
            - cell "2.0 nm/pN" [ref=e132]
          - row [ref=e133]:
            - cell "PEVK entropic spring" [ref=e134]
            - cell "70.0 nm" [ref=e135]
            - cell "64.1 nm" [ref=e136]
            - cell "51 nm/pN" [ref=e137]
          - row [ref=e138]:
            - cell "Distal tandem Ig (I-band)" [ref=e139]
            - cell "50.9 nm" [ref=e140]
            - cell "32.6 nm" [ref=e141]
            - cell "5.5 nm/pN" [ref=e142]
        - generic [ref=e143]:
          - button "Parameters behind this modeled output" [ref=e144] [cursor=pointer]
          - button "Sources for this modeled output" [ref=e145] [cursor=pointer]
        - group [ref=e146]:
          - generic "Equations, parameters, preparation, validity, and transfer audit" [ref=e147] [cursor=pointer]
      - generic [ref=e148]: Regional extension remains a deterministic model output. Quantitative force appears only where the loaded SD-04 decision explicitly authorizes its regime and sensitivity policy.
      - heading "Incremental compliance" [level=2] [ref=e149]
      - generic [ref=e150]: Local slope contribution at the evaluated force. This is distinct from absolute regional extension and added length.
      - generic [ref=e152]:
        - img "Regional incremental compliance across sarcomere length, with unsupported regimes left blank." [ref=e153]: 1,9000.02,120852,3401.7e+22,5602.6e+22,7803.4e+23,0004.3e+2sarcomere length (nm)incremental compliance (nm/pN)
        - generic [ref=e172]:
          - generic [ref=e173]: Proximal tandem Ig (I-band)
          - generic [ref=e175]: N2A I80-UN2A-I81-I82-I83 signaling element
          - generic [ref=e177]: PEVK entropic spring
          - generic [ref=e179]: Distal tandem Ig (I-band)
        - generic [ref=e181]: supported · Inside the SD-04-approved supported interval.
        - generic [ref=e182]:
          - generic [ref=e183]: Proximal tandem Ig (I-band)
          - generic [ref=e185]: 30.1% · 25.3 nm/pN
        - generic [ref=e186]:
          - generic [ref=e187]: N2A I80-UN2A-I81-I82-I83 signaling element
          - generic [ref=e189]: 2.4% · 1.98 nm/pN
        - generic [ref=e190]:
          - generic [ref=e191]: PEVK entropic spring
          - generic [ref=e193]: 61.0% · 51.2 nm/pN
        - generic [ref=e194]:
          - generic [ref=e195]: Distal tandem Ig (I-band)
          - generic [ref=e197]: 6.5% · 5.47 nm/pN
        - generic [ref=e198]: "The share is the local slope contribution to the serial chain at the evaluated force; it is not the absolute regional length or its fraction. Not claimed: a confidence interval or biological population variance; a measured regional compliance trace; a compliance value where force status is not_evaluated."
      - heading "Lattice cross-section" [level=2] [ref=e199]
      - generic [ref=e200]: Looking down the filament axis, drawn flat at one shared scale. Both panels use the same centre and projection, so the change in spacing is a real comparison rather than a change of zoom.
      - generic [ref=e202]:
        - generic [ref=e203]:
          - generic [ref=e204]:
            - img "Current lattice at 2400 nm sarcomere length; d10 38.13 nm" [ref=e205]: d10 38.1 nm
            - generic [ref=e270]:
              - generic [ref=e271]: Current · 2,400 nm
              - generic [ref=e272]: d10 38.13 nm · surface gap 13.4 nm
              - generic [ref=e273]: WITHIN WORKING RANGE
          - generic [ref=e274]:
            - img "Comparison lattice at 2200 nm sarcomere length; d10 39.83 nm" [ref=e275]: d10 39.8 nm
            - generic [ref=e340]:
              - generic [ref=e341]: Reference geometry · 2,200 nm
              - generic [ref=e342]: d10 39.83 nm · surface gap 14.6 nm
              - generic [ref=e343]: WITHIN WORKING RANGE
        - generic [ref=e344]: Δd10 -1.70 nm between 2,400 and 2,200 nm · dashed circles ghost the other state
        - generic [ref=e345]: "MODELED · d10 = sqrt(V_cell / ((2/sqrt(3)) * SL)); d10 ∝ 1/sqrt(SL) (constant-volume idealization) d10(SL) per scaling law; REAL muscle Poisson ratio time-varying (not strictly isovolumetric) Not claimed: time-resolved active contraction; strict biological isovolumetry; directly measured d10 for the scope-ledger construct; a second lattice solver."
      - heading "Legend" [level=2] [ref=e346]
      - generic [ref=e347]:
        - button "Inspect Thick filament (myosin)" [ref=e348] [cursor=pointer]: Thick filament (myosin)
        - button "Inspect Thin filament (actin)" [ref=e350] [cursor=pointer]: Thin filament (actin)
        - button "Inspect Z-disc envelope" [ref=e352] [cursor=pointer]: Z-disc envelope
        - button "Inspect M-band midpoint" [ref=e354] [cursor=pointer]: M-band midpoint
        - button "Inspect Titin" [ref=e356] [cursor=pointer]: Titin
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { failOnPageErrors, setReducedMotion, waitForReady } from './helpers.js';
  3   | 
  4   | failOnPageErrors(test);
  5   | 
  6   | async function open(page, width, height, step = 'stretch_spring') {
  7   |   await page.setViewportSize({ width, height });
  8   |   await setReducedMotion(page);
  9   |   await page.goto(`/index.html#v=2&depth=learn&step=${step}&sl=2400&drawer=closed&confidence=0`);
  10  |   await waitForReady(page);
  11  | }
  12  | 
  13  | async function chartLayout(page) {
  14  |   return page.locator('#forceCurve .force-chart').evaluate((svg) => {
  15  |     const box = svg.getBoundingClientRect();
  16  |     const labels = [...svg.querySelectorAll('text')].map((node) => {
  17  |       const r = node.getBoundingClientRect();
  18  |       const transform = node.getScreenCTM();
  19  |       return { text: node.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom,
  20  |         fontPx: parseFloat(getComputedStyle(node).fontSize) * Math.hypot(transform.c, transform.d) };
  21  |     });
  22  |     const intersections = [];
  23  |     for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
  24  |       const a = labels[i], b = labels[j];
  25  |       if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5
  26  |           && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5) {
  27  |         intersections.push([a.text, b.text]);
  28  |       }
  29  |     }
  30  |     return { minFontPx: Math.min(...labels.map(x => x.fontPx)), intersections,
  31  |       clipped: labels.filter(r => r.left < box.left - 0.5 || r.right > box.right + 0.5
  32  |         || r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5).map(r => r.text),
  33  |       overflow: document.querySelector('#panel').scrollWidth - document.querySelector('#panel').clientWidth };
  34  |   });
  35  | }
  36  | 
  37  | for (const [width, height] of [[1280, 720], [390, 844], [320, 740]]) {
  38  |   test(`Final polish ${width}: force labels are readable and Large type actually enlarges them`, async ({ page }) => {
  39  |     await open(page, width, height);
  40  |     await page.locator('#stageForce').click();
  41  |     await expect(page.locator('.force-axis-title').first()).toContainText('per titin (pN)');
  42  |     await expect(page.locator('.force-figure figcaption')).toContainText('sarcomere length (nm)');
  43  |     const ordinary = await chartLayout(page);
  44  |     expect(ordinary.minFontPx).toBeGreaterThanOrEqual(12);
  45  |     expect(ordinary.clipped).toEqual([]);
  46  |     expect(ordinary.intersections).toEqual([]);
  47  |     expect(ordinary.overflow).toBeLessThanOrEqual(1);
  48  |     const ordinaryText = await page.locator('#mechanicsScope').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  49  |     await page.locator('#textScale').click();
  50  |     await expect(page.locator('#textScale')).toHaveAttribute('aria-pressed', 'true');
  51  |     const large = await chartLayout(page);
  52  |     expect(large.minFontPx).toBeGreaterThan(ordinary.minFontPx);
  53  |     expect(large.clipped).toEqual([]);
> 54  |     expect(large.intersections).toEqual([]);
      |                                 ^ Error: expect(received).toEqual(expected) // deep equality
  55  |     expect(large.overflow).toBeLessThanOrEqual(1);
  56  |     const largeText = await page.locator('#mechanicsScope').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  57  |     expect(largeText).toBeGreaterThan(ordinaryText);
  58  |     await page.locator('#textScale').click();
  59  |     expect((await chartLayout(page)).minFontPx).toBeCloseTo(ordinary.minFontPx, 2);
  60  |   });
  61  | }
  62  | 
  63  | test('Final polish: withdraw the colliding locator while keeping the main model labels', async ({ page }) => {
  64  |   await open(page, 1280, 720, 'meet_sarcomere');
  65  |   await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-locator-layout', 'visible');
  66  |   await page.locator('#chapterNext').click();
  67  |   await expect(page.locator('#oppositeTitinNote')).toBeVisible();
  68  |   await expect(page.locator('#oppositeTitinNote')).toContainText('separate representative path');
  69  |   await page.locator('#chapterNext').click();
  70  |   await expect(page.locator('#oppositeTitinNote')).toBeHidden();
  71  |   await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-locator-layout', 'suppressed:model-proximity');
  72  |   await expect(page.locator('[data-full-sarcomere-locator]')).toHaveCount(0);
  73  |   await expect(page.locator('.terminus-dot')).toHaveCount(2);
  74  |   await expect(page.locator('[data-stretch-comparison] text')).toHaveCount(2);
  75  |   await page.locator('#sl').fill('2000');
  76  |   await expect(page.locator('[data-stretch-comparison] text').first()).toHaveText('I-band');
  77  |   await page.locator('#sl').fill('2400');
  78  |   await page.locator('#chapterNext').click();
  79  |   await page.locator('#chapterNext').click();
  80  |   await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-locator-layout', 'suppressed:model-proximity');
  81  |   await expect(page.locator('[data-full-sarcomere-locator]')).toHaveCount(0);
  82  |   await expect(page.locator('.terminus-dot')).toHaveCount(2);
  83  | });
  84  | 
  85  | test('Final polish: phone Tour retains its locator and explains the opposite path', async ({ page }) => {
  86  |   await open(page, 390, 844, 'follow_titin');
  87  |   await expect(page.locator('#oppositeTitinNote')).toBeVisible();
  88  |   await page.locator('#chapterNext').click();
  89  |   await expect(page.locator('#oppositeTitinNote')).toBeHidden();
  90  |   await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-locator-layout', 'visible');
  91  |   await expect(page.locator('[data-full-sarcomere-locator]')).toHaveCount(1);
  92  | });
  93  | 
  94  | test('Final polish: selected scientific sources precede build identifiers on phone', async ({ page }) => {
  95  |   await open(page, 390, 844, 'knowledge_recap');
  96  |   await page.locator('#chapterInspectEvidence').click();
  97  |   await page.locator('#selectedEvidenceSourcesLink').click();
  98  |   const source = page.locator('#bibliography .source-result summary').first();
  99  |   await expect(source).toBeVisible();
  100 |   const paper = await source.boundingBox();
  101 |   const identity = await page.locator('#buildFingerprint').boundingBox();
  102 |   expect(paper.y + paper.height).toBeLessThan(844);
  103 |   expect(paper.y + paper.height).toBeLessThan(identity.y);
  104 |   await source.click();
  105 |   await expect(page.locator('#bibliography .source-result').first()).toContainText('Locator');
  106 |   await expect(page.locator('#modelFingerprint')).toHaveText(/^[a-f0-9]{64}$/);
  107 | });
  108 | 
  109 | test('Final polish: chart labels fit across supported and extrapolated states', async ({ page }) => {
  110 |   await open(page, 390, 844);
  111 |   for (const length of [2000, 2200, 2450]) {
  112 |     await page.locator('#sl').fill(String(length));
  113 |     await page.locator('#stageForce').click();
  114 |     for (const large of [false, true]) {
  115 |       if (large) await page.locator('#textScale').click();
  116 |       const layout = await chartLayout(page);
  117 |       expect(layout.clipped, `${length} nm, large=${large}`).toEqual([]);
  118 |       expect(layout.intersections, `${length} nm, large=${large}`).toEqual([]);
  119 |     }
  120 |     await expect(page.locator('.force-readout')).toContainText(length === 2450 ? 'extrapolated' : 'supported');
  121 |     await page.locator('#textScale').click();
  122 |     await page.locator('#closeEvidence').click();
  123 |   }
  124 | });
  125 | 
```