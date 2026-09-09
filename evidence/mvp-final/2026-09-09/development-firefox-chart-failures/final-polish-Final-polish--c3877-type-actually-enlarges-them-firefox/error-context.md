# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: final-polish.spec.js >> Final polish 320: force labels are readable and Large type actually enlarges them
- Location: test/browser/final-polish.spec.js:38:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 18

- Array []
+ Array [
+   Array [
+     "1,900",
+     "0.0",
+   ],
+   Array [
+     "2,340",
+     "2,560",
+   ],
+   Array [
+     "2,560",
+     "2,780",
+   ],
+   Array [
+     "2,780",
+     "3,000",
+   ],
+ ]
```

# Page snapshot

```yaml
- 'complementary "Research: visualization controls and scientific readouts" [ref=e4]':
  - generic [ref=e6]:
    - generic [ref=e7]:
      - heading "Research" [level=1] [ref=e8]
      - generic [ref=e9]: Inspecting the current titin selection
    - generic [ref=e10]:
      - button "Large type" [active] [pressed] [ref=e11] [cursor=pointer]
      - button "Close" [ref=e12] [cursor=pointer]
  - tablist "Research sections" [ref=e13]:
    - tab "Inspect" [ref=e14] [cursor=pointer]
    - tab "Measure" [selected] [ref=e15] [cursor=pointer]
    - tab "Evidence" [ref=e16] [cursor=pointer]
    - tab "Sources & build" [ref=e17] [cursor=pointer]
  - tabpanel "Measure" [ref=e18]:
    - heading "Sarcomere length" [level=2] [ref=e19]
    - generic [ref=e20]: 2400 nm
    - generic [ref=e21]: The current Tour or restored URL state supplies this value.
    - generic [ref=e22]: Sarcomere length controls passive geometry here; it does not set calcium activation or simulate an active-contraction trajectory. The 2,000–2,400 nm interval is this model's declared comparison range, not a universal range for every muscle.
    - heading "Geometry at this length" [level=2] [ref=e23]
    - table [ref=e24]:
      - rowgroup [ref=e25]:
        - row [ref=e26]:
          - cell "Half-sarcomere" [ref=e27]
          - cell "1200.0 nm" [ref=e28]
        - row [ref=e29]:
          - cell "I-band half-width" [ref=e30]
          - cell "400.0 nm" [ref=e31]
        - row [ref=e32]:
          - cell "Thin/thick overlap" [ref=e33]
          - cell "675.0 nm" [ref=e34]
        - row [ref=e35]:
          - cell "d10 spacing" [ref=e36]
          - cell "38.13 nm" [ref=e37]
        - row [ref=e38]:
          - cell "Filament context" [ref=e39]
          - cell "immediate neighbours (1 myosin thick filament + 6 actin thin filaments)" [ref=e40]
        - row [ref=e41]:
          - cell "Thick filaments built" [ref=e42]
          - cell "1" [ref=e43]
        - row [ref=e44]:
          - cell "Thin filaments built" [ref=e45]
          - cell "6" [ref=e46]
        - row [ref=e47]:
          - cell "Representative titin paths built" [ref=e48]
          - cell "1" [ref=e49]
        - row [ref=e50]:
          - cell "Representative titin A-band radius" [ref=e51]
          - cell "7.50 nm · thick-filament periphery · schematic azimuth" [ref=e52]
        - row [ref=e53]:
          - cell "A-band display allocation" [ref=e54]
          - cell "695.0 nm · SCHEMATIC and invariant in the renderer" [ref=e55]
        - row [ref=e56]:
          - cell "C-zone sequence/display derivation" [ref=e57]
          - cell "11 domains × 3.98 nm mean = 43.78 nm · 11 repeats displayed" [ref=e58]
        - row [ref=e59]:
          - cell "Distinct thick-filament spacings" [ref=e60]
          - cell "H 43.17 nm · crown 14.3 nm · L ≈45.54 nm" [ref=e61]
    - heading "Passive force" [level=2] [ref=e62]
    - generic [ref=e63]: Rat/rabbit skeletal-muscle + recombinant-human literature transfer · SD-04 APPROVED WITH LIMITS · approximate passive pN per titin
    - generic [ref=e65]:
      - generic [ref=e66]: "Force evaluation: supported"
      - generic [ref=e67]: 1.3 ± 0.8 pN · supported · model estimate; ± is literature parameter sensitivity, not a confidence interval.
      - generic [ref=e68]: Inside the SD-04-approved supported interval. Approximate passive force per titin only; active force and non-titin passive contributions are excluded.
      - figure "sarcomere length (nm)" [ref=e69]:
        - paragraph [ref=e70]: approximate passive force per titin (pN)
        - group "Approximate passive force per titin across sarcomere length, with supported and extrapolated regimes and parameter sensitivity range." [ref=e71]:
          - text: 1,9000.02,1200.502,3401.02,5601.52,7802.03,0002.5
          - button "Sources for modeled chart point at 2400 nm, 1.3 ± 0.8 pN, supported" [ref=e88] [cursor=pointer]
          - text: 1.3 ± 0.8 pN
      - generic [ref=e90]: "Approximate passive force per titin for a tissue-neutral Q8WZ42-1 reference-sequence model, not a measured or tissue-specific human force. Material values transfer rat/rabbit skeletal-muscle and recombinant-human evidence. The band is one-at-a-time literature parameter sensitivity, not a confidence interval or biological variance. Slack/contact/compression and Ig unfolding/refolding are omitted; force is not evaluated below 2000 nm or at/above 2500 nm. Not claimed: a measured single-molecule force trace for this sarcomere; total passive muscle tension, which includes non-titin contributions; any active or calcium-dependent force; a supported absolute-pN range beyond the exact SD-04-authorized regime."
      - generic [ref=e91]: Added regional length is shown separately from incremental compliance. Absolute regional length is not a compliance share.
      - table [ref=e92]:
        - row [ref=e93]:
          - columnheader "Region" [ref=e94]
          - columnheader "Current extension" [ref=e95]
          - columnheader "Added length from shortest state" [ref=e96]
          - columnheader "Incremental compliance" [ref=e97]
        - row [ref=e98]:
          - cell "Proximal tandem Ig (I-band)" [ref=e99]
          - cell "235.4 nm" [ref=e100]
          - cell "150.9 nm" [ref=e101]
          - cell "25 nm/pN" [ref=e102]
        - row [ref=e103]:
          - cell "N2A I80-UN2A-I81-I82-I83 signaling element" [ref=e104]
          - cell "18.6 nm" [ref=e105]
          - cell "2.4 nm" [ref=e106]
          - cell "2.0 nm/pN" [ref=e107]
        - row [ref=e108]:
          - cell "PEVK entropic spring" [ref=e109]
          - cell "70.0 nm" [ref=e110]
          - cell "64.1 nm" [ref=e111]
          - cell "51 nm/pN" [ref=e112]
        - row [ref=e113]:
          - cell "Distal tandem Ig (I-band)" [ref=e114]
          - cell "50.9 nm" [ref=e115]
          - cell "32.6 nm" [ref=e116]
          - cell "5.5 nm/pN" [ref=e117]
      - generic [ref=e118]:
        - button "Parameters behind this modeled output" [ref=e119] [cursor=pointer]
        - button "Sources for this modeled output" [ref=e120] [cursor=pointer]
      - group [ref=e121]:
        - generic "Equations, parameters, preparation, validity, and transfer audit" [ref=e122] [cursor=pointer]
    - generic [ref=e123]: Regional extension remains a deterministic model output. Quantitative force appears only where the loaded SD-04 decision explicitly authorizes its regime and sensitivity policy.
    - heading "Incremental compliance" [level=2] [ref=e124]
    - generic [ref=e125]: Local slope contribution at the evaluated force. This is distinct from absolute regional extension and added length.
    - generic [ref=e127]:
      - img "Regional incremental compliance across sarcomere length, with unsupported regimes left blank." [ref=e128]: 1,9000.02,120852,3401.7e+22,5602.6e+22,7803.4e+23,0004.3e+2sarcomere length (nm)incremental compliance (nm/pN)
      - generic [ref=e147]:
        - generic [ref=e148]: Proximal tandem Ig (I-band)
        - generic [ref=e150]: N2A I80-UN2A-I81-I82-I83 signaling element
        - generic [ref=e152]: PEVK entropic spring
        - generic [ref=e154]: Distal tandem Ig (I-band)
      - generic [ref=e156]: supported · Inside the SD-04-approved supported interval.
      - generic [ref=e157]:
        - generic [ref=e158]: Proximal tandem Ig (I-band)
        - generic [ref=e160]: 30.1% · 25.3 nm/pN
      - generic [ref=e161]:
        - generic [ref=e162]: N2A I80-UN2A-I81-I82-I83 signaling element
        - generic [ref=e164]: 2.4% · 1.98 nm/pN
      - generic [ref=e165]:
        - generic [ref=e166]: PEVK entropic spring
        - generic [ref=e168]: 61.0% · 51.2 nm/pN
      - generic [ref=e169]:
        - generic [ref=e170]: Distal tandem Ig (I-band)
        - generic [ref=e172]: 6.5% · 5.47 nm/pN
      - generic [ref=e173]: "The share is the local slope contribution to the serial chain at the evaluated force; it is not the absolute regional length or its fraction. Not claimed: a confidence interval or biological population variance; a measured regional compliance trace; a compliance value where force status is not_evaluated."
    - heading "Lattice cross-section" [level=2] [ref=e174]
    - generic [ref=e175]: Looking down the filament axis, drawn flat at one shared scale. Both panels use the same centre and projection, so the change in spacing is a real comparison rather than a change of zoom.
    - generic [ref=e177]:
      - generic [ref=e178]:
        - generic [ref=e179]:
          - img "Current lattice at 2400 nm sarcomere length; d10 38.13 nm" [ref=e180]: d10 38.1 nm
          - generic [ref=e245]:
            - generic [ref=e246]: Current · 2,400 nm
            - generic [ref=e247]: d10 38.13 nm · surface gap 13.4 nm
            - generic [ref=e248]: WITHIN WORKING RANGE
        - generic [ref=e249]:
          - img "Comparison lattice at 2200 nm sarcomere length; d10 39.83 nm" [ref=e250]: d10 39.8 nm
          - generic [ref=e315]:
            - generic [ref=e316]: Reference geometry · 2,200 nm
            - generic [ref=e317]: d10 39.83 nm · surface gap 14.6 nm
            - generic [ref=e318]: WITHIN WORKING RANGE
      - generic [ref=e319]: Δd10 -1.70 nm between 2,400 and 2,200 nm · dashed circles ghost the other state
      - generic [ref=e320]: "MODELED · d10 = sqrt(V_cell / ((2/sqrt(3)) * SL)); d10 ∝ 1/sqrt(SL) (constant-volume idealization) d10(SL) per scaling law; REAL muscle Poisson ratio time-varying (not strictly isovolumetric) Not claimed: time-resolved active contraction; strict biological isovolumetry; directly measured d10 for the scope-ledger construct; a second lattice solver."
    - heading "Legend" [level=2] [ref=e321]
    - generic [ref=e322]:
      - button "Inspect Thick filament (myosin)" [ref=e323] [cursor=pointer]: Thick filament (myosin)
      - button "Inspect Thin filament (actin)" [ref=e325] [cursor=pointer]: Thin filament (actin)
      - button "Inspect Z-disc envelope" [ref=e327] [cursor=pointer]: Z-disc envelope
      - button "Inspect M-band midpoint" [ref=e329] [cursor=pointer]: M-band midpoint
      - button "Inspect Titin" [ref=e331] [cursor=pointer]: Titin
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