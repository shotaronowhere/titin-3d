# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: final-polish.spec.js >> Final polish: chart labels fit across supported and extrapolated states
- Location: test/browser/final-polish.spec.js:109:1

# Error details

```
Error: 2000 nm, large=true

expect(received).toEqual(expected) // deep equality

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
    - generic [ref=e20]: 2000 nm
    - generic [ref=e21]: The current Tour or restored URL state supplies this value.
    - generic [ref=e22]: Sarcomere length controls passive geometry here; it does not set calcium activation or simulate an active-contraction trajectory. The 2,000–2,400 nm interval is this model's declared comparison range, not a universal range for every muscle.
    - generic [ref=e23]: Sarcomere length 2000 nm is between the defined states 'contracted' (1900 nm) and 'resting' (2200 nm). Filament landmarks are interpolated between scientifically defined states and titin extension is mechanically re-derived at a common force. This is not directly measured molecular motion, and no intermediate conformation is claimed.
    - heading "Geometry at this length" [level=2] [ref=e24]
    - table [ref=e25]:
      - rowgroup [ref=e26]:
        - row [ref=e27]:
          - cell "Half-sarcomere" [ref=e28]
          - cell "1000.0 nm" [ref=e29]
        - row [ref=e30]:
          - cell "I-band half-width" [ref=e31]
          - cell "200.0 nm" [ref=e32]
        - row [ref=e33]:
          - cell "Thin/thick overlap" [ref=e34]
          - cell "720.0 nm" [ref=e35]
        - row [ref=e36]:
          - cell "d10 spacing" [ref=e37]
          - cell "41.77 nm" [ref=e38]
        - row [ref=e39]:
          - cell "Filament context" [ref=e40]
          - cell "immediate neighbours (1 myosin thick filament + 6 actin thin filaments)" [ref=e41]
        - row [ref=e42]:
          - cell "Thick filaments built" [ref=e43]
          - cell "1" [ref=e44]
        - row [ref=e45]:
          - cell "Thin filaments built" [ref=e46]
          - cell "6" [ref=e47]
        - row [ref=e48]:
          - cell "Representative titin paths built" [ref=e49]
          - cell "1" [ref=e50]
        - row [ref=e51]:
          - cell "Representative titin A-band radius" [ref=e52]
          - cell "7.50 nm · thick-filament periphery · schematic azimuth" [ref=e53]
        - row [ref=e54]:
          - cell "A-band display allocation" [ref=e55]
          - cell "695.0 nm · SCHEMATIC and invariant in the renderer" [ref=e56]
        - row [ref=e57]:
          - cell "C-zone sequence/display derivation" [ref=e58]
          - cell "11 domains × 3.98 nm mean = 43.78 nm · 11 repeats displayed" [ref=e59]
        - row [ref=e60]:
          - cell "Distinct thick-filament spacings" [ref=e61]
          - cell "H 43.17 nm · crown 14.3 nm · L ≈45.54 nm" [ref=e62]
        - row [ref=e63]:
          - cell "Thin-filament double overlap" [ref=e64]
          - cell "75 nm" [ref=e65]
    - heading "Passive force" [level=2] [ref=e66]
    - generic [ref=e67]: Rat/rabbit skeletal-muscle + recombinant-human literature transfer · SD-04 APPROVED WITH LIMITS · approximate passive pN per titin
    - generic [ref=e69]:
      - generic [ref=e70]: "Force evaluation: supported"
      - generic [ref=e71]: 0.18 ± 0.08 pN · supported · model estimate; ± is literature parameter sensitivity, not a confidence interval.
      - generic [ref=e72]: Inside the SD-04-approved supported interval. Approximate passive force per titin only; active force and non-titin passive contributions are excluded.
      - figure "sarcomere length (nm)" [ref=e73]:
        - paragraph [ref=e74]: approximate passive force per titin (pN)
        - group "Approximate passive force per titin across sarcomere length, with supported and extrapolated regimes and parameter sensitivity range." [ref=e75]:
          - text: 1,9000.02,1200.502,3401.02,5601.52,7802.03,0002.5
          - button "Sources for modeled chart point at 2000 nm, 0.18 ± 0.08 pN, supported" [ref=e92] [cursor=pointer]
          - text: 0.18 ± 0.08 pN
      - generic [ref=e94]: "Approximate passive force per titin for a tissue-neutral Q8WZ42-1 reference-sequence model, not a measured or tissue-specific human force. Material values transfer rat/rabbit skeletal-muscle and recombinant-human evidence. The band is one-at-a-time literature parameter sensitivity, not a confidence interval or biological variance. Slack/contact/compression and Ig unfolding/refolding are omitted; force is not evaluated below 2000 nm or at/above 2500 nm. Not claimed: a measured single-molecule force trace for this sarcomere; total passive muscle tension, which includes non-titin contributions; any active or calcium-dependent force; a supported absolute-pN range beyond the exact SD-04-authorized regime."
      - generic [ref=e95]: Added regional length is shown separately from incremental compliance. Absolute regional length is not a compliance share.
      - table [ref=e96]:
        - row [ref=e97]:
          - columnheader "Region" [ref=e98]
          - columnheader "Current extension" [ref=e99]
          - columnheader "Added length from shortest state" [ref=e100]
          - columnheader "Incremental compliance" [ref=e101]
        - row [ref=e102]:
          - cell "Proximal tandem Ig (I-band)" [ref=e103]
          - cell "122.2 nm" [ref=e104]
          - cell "37.6 nm" [ref=e105]
          - cell "4.3e+2 nm/pN" [ref=e106]
        - row [ref=e107]:
          - cell "N2A I80-UN2A-I81-I82-I83 signaling element" [ref=e108]
          - cell "16.4 nm" [ref=e109]
          - cell "0.2 nm" [ref=e110]
          - cell "2.1 nm/pN" [ref=e111]
        - row [ref=e112]:
          - cell "PEVK entropic spring" [ref=e113]
          - cell "10.0 nm" [ref=e114]
          - cell "4.1 nm" [ref=e115]
          - cell "57 nm/pN" [ref=e116]
        - row [ref=e117]:
          - cell "Distal tandem Ig (I-band)" [ref=e118]
          - cell "26.4 nm" [ref=e119]
          - cell "8.1 nm" [ref=e120]
          - cell "94 nm/pN" [ref=e121]
      - generic [ref=e122]:
        - button "Parameters behind this modeled output" [ref=e123] [cursor=pointer]
        - button "Sources for this modeled output" [ref=e124] [cursor=pointer]
      - group [ref=e125]:
        - generic "Equations, parameters, preparation, validity, and transfer audit" [ref=e126] [cursor=pointer]
    - generic [ref=e127]: Regional extension remains a deterministic model output. Quantitative force appears only where the loaded SD-04 decision explicitly authorizes its regime and sensitivity policy.
    - heading "Incremental compliance" [level=2] [ref=e128]
    - generic [ref=e129]: Local slope contribution at the evaluated force. This is distinct from absolute regional extension and added length.
    - generic [ref=e131]:
      - img "Regional incremental compliance across sarcomere length, with unsupported regimes left blank." [ref=e132]: 1,9000.02,120852,3401.7e+22,5602.6e+22,7803.4e+23,0004.3e+2sarcomere length (nm)incremental compliance (nm/pN)
      - generic [ref=e151]:
        - generic [ref=e152]: Proximal tandem Ig (I-band)
        - generic [ref=e154]: N2A I80-UN2A-I81-I82-I83 signaling element
        - generic [ref=e156]: PEVK entropic spring
        - generic [ref=e158]: Distal tandem Ig (I-band)
      - generic [ref=e160]: supported · Inside the SD-04-approved supported interval.
      - generic [ref=e161]:
        - generic [ref=e162]: Proximal tandem Ig (I-band)
        - generic [ref=e164]: 73.9% · 433 nm/pN
      - generic [ref=e165]:
        - generic [ref=e166]: N2A I80-UN2A-I81-I82-I83 signaling element
        - generic [ref=e168]: 0.4% · 2.11 nm/pN
      - generic [ref=e169]:
        - generic [ref=e170]: PEVK entropic spring
        - generic [ref=e172]: 9.7% · 56.9 nm/pN
      - generic [ref=e173]:
        - generic [ref=e174]: Distal tandem Ig (I-band)
        - generic [ref=e176]: 16.0% · 93.5 nm/pN
      - generic [ref=e177]: "The share is the local slope contribution to the serial chain at the evaluated force; it is not the absolute regional length or its fraction. Not claimed: a confidence interval or biological population variance; a measured regional compliance trace; a compliance value where force status is not_evaluated."
    - heading "Lattice cross-section" [level=2] [ref=e178]
    - generic [ref=e179]: Looking down the filament axis, drawn flat at one shared scale. Both panels use the same centre and projection, so the change in spacing is a real comparison rather than a change of zoom.
    - generic [ref=e181]:
      - generic [ref=e182]:
        - generic [ref=e183]:
          - img "Current lattice at 2000 nm sarcomere length; d10 41.77 nm" [ref=e184]: d10 41.8 nm
          - generic [ref=e249]:
            - generic [ref=e250]: Current · 2,000 nm
            - generic [ref=e251]: d10 41.77 nm · surface gap 15.8 nm
            - generic [ref=e252]: WITHIN WORKING RANGE
        - generic [ref=e253]:
          - img "Comparison lattice at 2400 nm sarcomere length; d10 38.13 nm" [ref=e254]: d10 38.1 nm
          - generic [ref=e319]:
            - generic [ref=e320]: Upper working-range geometry · 2,400 nm
            - generic [ref=e321]: d10 38.13 nm · surface gap 13.4 nm
            - generic [ref=e322]: WITHIN WORKING RANGE
      - generic [ref=e323]: Δd10 3.64 nm between 2,000 and 2,400 nm · dashed circles ghost the other state
      - generic [ref=e324]: "MODELED · d10 = sqrt(V_cell / ((2/sqrt(3)) * SL)); d10 ∝ 1/sqrt(SL) (constant-volume idealization) d10(SL) per scaling law; REAL muscle Poisson ratio time-varying (not strictly isovolumetric) Not claimed: time-resolved active contraction; strict biological isovolumetry; directly measured d10 for the scope-ledger construct; a second lattice solver."
    - heading "Legend" [level=2] [ref=e325]
    - generic [ref=e326]:
      - button "Inspect Thick filament (myosin)" [ref=e327] [cursor=pointer]: Thick filament (myosin)
      - button "Inspect Thin filament (actin)" [ref=e329] [cursor=pointer]: Thin filament (actin)
      - button "Inspect Z-disc envelope" [ref=e331] [cursor=pointer]: Z-disc envelope
      - button "Inspect M-band midpoint" [ref=e333] [cursor=pointer]: M-band midpoint
      - button "Inspect Titin" [ref=e335] [cursor=pointer]: Titin
```

# Test source

```ts
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
  54  |     expect(large.intersections).toEqual([]);
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
> 118 |       expect(layout.intersections, `${length} nm, large=${large}`).toEqual([]);
      |                                                                    ^ Error: 2000 nm, large=true
  119 |     }
  120 |     await expect(page.locator('.force-readout')).toContainText(length === 2450 ? 'extrapolated' : 'supported');
  121 |     await page.locator('#textScale').click();
  122 |     await page.locator('#closeEvidence').click();
  123 |   }
  124 | });
  125 | 
```