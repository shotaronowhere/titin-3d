# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evidence.spec.js >> SC22 parameter source routing closes to its visible stage invoker
- Location: test/browser/evidence.spec.js:100:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('#chapterNext')
    - locator resolved to <button id="chapterNext" data-secondary="false" aria-label="Next: Follow one giant molecule">Next</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - performing click action

```

# Test source

```ts
  2   | 
  3   | import { clickProjectedLabel, setReviewViewport, waitForReady } from './helpers.js';
  4   | 
  5   | async function boot(page, viewport = 'desktop') {
  6   |   await setReviewViewport(page, viewport);
  7   |   await page.goto('/index.html');
  8   |   await waitForReady(page);
  9   | }
  10  | 
  11  | async function selectTitinFromStage(page) {
  12  |   await clickProjectedLabel(page, 'Titin');
  13  |   await expect(page.locator('#objectInspector')).toBeVisible();
  14  | }
  15  | 
  16  | async function openInventory(page) {
  17  |   const details = page.locator('.research-inventory');
  18  |   if (!(await details.evaluate((node) => node.open))) await details.locator('summary').click();
  19  | }
  20  | 
  21  | test('SC22/27A object explanation is compact and Research owns the full selected claim', async ({ page }) => {
  22  |   await boot(page);
  23  |   await selectTitinFromStage(page);
  24  |   await expect(page.locator('#objectInspectorName')).not.toBeEmpty();
  25  |   await expect(page.locator('#objectInspectorLay')).not.toBeEmpty();
  26  |   await expect(page.locator('#objectInspectorEvidence .evidence-chip')).toHaveCount(1);
  27  |   await expect(page.locator('#objectInspectorDetailLink')).toHaveText(/Why we know this/);
  28  |   await page.locator('#objectInspectorDetailLink').click();
  29  |   await expect(page.locator('#objectInspector')).toBeHidden();
  30  |   await expect(page.locator('#tabEvidence')).toHaveAttribute('aria-selected', 'true');
  31  |   await expect(page.locator('#selectedEvidence')).toBeVisible();
  32  |   expect(await page.locator('#selectedEvidence .claim-view-fields dt').count()).toBeGreaterThanOrEqual(2);
  33  |   await expect(page.locator('#selectedEvidence .claim-view-sources')).toBeVisible();
  34  | });
  35  | 
  36  | test('SC22 Guided inspector stays compact and clear of the Tour continuation', async ({ page }) => {
  37  |   await boot(page);
  38  |   await selectTitinFromStage(page);
  39  |   const geometry = await page.evaluate(() => {
  40  |     const card = document.querySelector('#objectInspector').getBoundingClientRect();
  41  |     const tour = document.querySelector('#guidedCard').getBoundingClientRect();
  42  |     const next = document.querySelector('#chapterNext').getBoundingClientRect();
  43  |     return {
  44  |       card: { top: card.top, bottom: card.bottom, height: card.height, left: card.left, right: card.right },
  45  |       tour: { top: tour.top, bottom: tour.bottom, left: tour.left, right: tour.right },
  46  |       next: { top: next.top, bottom: next.bottom, left: next.left, right: next.right },
  47  |     };
  48  |   });
  49  |   const collide = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  50  |   expect(geometry.card.height).toBeLessThan(300);
  51  |   expect(collide(geometry.card, geometry.next)).toBe(false);
  52  |   await expect(page.locator('#objectInspectorClaim')).toHaveCount(0);
  53  | });
  54  | 
  55  | test('SC22 contextual source controls select object, chapter, all, and exact value', async ({ page }) => {
  56  |   await boot(page);
  57  |   await selectTitinFromStage(page);
  58  |   await page.locator('#objectInspectorDetailLink').click();
  59  |   await page.locator('#selectedEvidenceSourcesLink').click();
  60  |   await expect(page.locator('#tabSources')).toHaveAttribute('aria-selected', 'true');
  61  |   await expect(page.locator('#sourceContextLabel')).toContainText('Sources for this object');
  62  |   await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'object');
  63  | 
  64  |   await page.locator('#sourceFilters [data-source-scope="chapter"]').click();
  65  |   await expect(page.locator('#sourceContextLabel')).toContainText('Sources for this beat');
  66  |   await page.locator('#sourceFilters [data-source-scope="all"]').click();
  67  |   await expect(page.locator('#sourceContextLabel')).toContainText('All sources');
  68  |   expect(await page.locator('#bibliography .source-result').count()).toBeGreaterThan(40);
  69  | 
  70  |   await page.locator('#tabMeasure').click();
  71  |   await page.locator('#forceCurve details > summary').click();
  72  |   await page.locator('#forceCurve .parameter-source-link').first().click();
  73  |   await expect(page.locator('#tabSources')).toHaveAttribute('aria-selected', 'true');
  74  |   await expect(page.locator('#sourceContextLabel')).toContainText('Sources for this value');
  75  |   await expect(page.locator('#bibliography .source-result')).toHaveCount(1);
  76  |   await page.locator('#bibliography .source-result summary').click();
  77  |   await expect(page.locator('#bibliography')).toContainText('Preparation');
  78  |   await expect(page.locator('#bibliography')).toContainText('Locator');
  79  |   await expect(page.locator('#bibliography')).toContainText('Relationship');
  80  |   await expect(page.locator('#bibliography')).toContainText('Extraction note');
  81  |   await expect(page.locator('#bibliography')).toContainText('Offline source ID');
  82  | });
  83  | 
  84  | test('SC22 value clearing falls back to the selected object instead of an empty source list', async ({ page }) => {
  85  |   await boot(page, 'responsive');
  86  |   await page.locator('#audienceEvidence').click();
  87  |   await page.locator('#tabMeasure').click();
  88  |   await page.locator('#forceCurve details > summary').click();
  89  |   await page.locator('#forceCurve .parameter-source-link').first().click();
  90  |   await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'value');
  91  | 
  92  |   await page.locator('#tabInspect').click();
  93  |   await openInventory(page);
  94  |   await page.locator('#regions [data-region="prox_Ig"]').click();
  95  |   await page.locator('#tabSources').click();
  96  |   await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'object');
  97  |   expect(await page.locator('#bibliography .source-result').count()).toBeGreaterThan(0);
  98  | });
  99  | 
  100 | test('SC22 parameter source routing closes to its visible stage invoker', async ({ page }) => {
  101 |   await boot(page);
> 102 |   await page.locator('#chapterNext').click();
      |                                      ^ Error: locator.click: Test timeout of 60000ms exceeded.
  103 |   await page.locator('#chapterNext').click();
  104 |   await page.locator('#stageForce').click();
  105 |   await page.locator('#forceCurve details > summary').click();
  106 |   await page.locator('#forceCurve .parameter-source-link').first().click();
  107 |   await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'value');
  108 |   await page.locator('#closeEvidence').click();
  109 |   await expect(page.locator('#stageForce')).toBeFocused();
  110 | });
  111 | 
  112 | test('SC22 selectable chart point filters sources and restores the contextual invoker', async ({ page }) => {
  113 |   await boot(page);
  114 |   await page.locator('#chapterNext').click();
  115 |   await page.locator('#chapterNext').click();
  116 |   await page.locator('#stageForce').click();
  117 |   await page.locator('#forceCurve .force-current-point').focus();
  118 |   await page.locator('#forceCurve .force-current-point').press('Enter');
  119 |   await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'value');
  120 |   await expect(page.locator('#sourceContextLabel')).toContainText('Modeled chart point at');
  121 |   await page.locator('#closeEvidence').click();
  122 |   await expect(page.locator('#stageForce')).toBeFocused();
  123 | });
  124 | 
  125 | test('SC22 ClaimView keeps citations after copy, fields, and limitations', async ({ page }) => {
  126 |   await boot(page);
  127 |   await page.locator('#audienceEvidence').click();
  128 |   await page.locator('#tabEvidence').click();
  129 |   const order = await page.locator('#chapterEvidence .claim-view').evaluate((node) => {
  130 |     const names = [...node.children].map((child) => child.className);
  131 |     return {
  132 |       fields: names.indexOf('claim-view-fields'),
  133 |       limitations: names.indexOf('claim-view-limitations'),
  134 |       sources: names.indexOf('claim-view-sources'),
  135 |     };
  136 |   });
  137 |   expect(order.fields).toBeGreaterThan(-1);
  138 |   expect(order.limitations).toBeGreaterThan(order.fields);
  139 |   expect(order.sources).toBeGreaterThan(order.limitations);
  140 |   await expect(page.locator('#expertCards .finding-status')).toHaveCount(25);
  141 |   await expect(page.locator('#expertCards [data-card="aband_scaffold_card"] .claim-view-source'))
  142 |     .toHaveCount(4);
  143 |   await expect(page.locator('#expertCards [data-card="unresolved_questions_card"] .claim-view-source'))
  144 |     .toHaveCount(5);
  145 | });
  146 | 
  147 | for (const viewport of ['desktop', 'responsive']) {
  148 |   test(`SC22 ${viewport} Research owns full titin, PEVK, and kinase detail`, async ({ page }) => {
  149 |     await boot(page, viewport);
  150 |     await page.locator('#audienceEvidence').click();
  151 |     await openInventory(page);
  152 |     for (const target of [
  153 |       { selector: '#annotations [data-target-id="titin"]', title: 'Titin' },
  154 |       { selector: '#regions [data-region="PEVK"]', title: 'PEVK' },
  155 |       { selector: '#regions [data-region="kinase"]', title: 'kinase' },
  156 |     ]) {
  157 |       await page.locator('#tabInspect').click();
  158 |       await openInventory(page);
  159 |       await page.locator(target.selector).click();
  160 |       await expect(page.locator('#objectAnnouncement')).toContainText(
  161 |         'Review Selected structure in the Research Evidence tab for the full claim and exact sources.',
  162 |       );
  163 |       expect(await page.locator('#objectAnnouncement').evaluate(
  164 |         (node) => node.closest('[inert]') === null,
  165 |       ), 'the Research route announcement must remain in the accessibility tree').toBe(true);
  166 |       await page.locator('#tabEvidence').click();
  167 |       await expect(page.locator('#selectedEvidence')).toBeVisible();
  168 |       await expect(page.locator('#selectedEvidence .claim-view-title')).toContainText(target.title);
  169 |       await expect(page.locator('#selectedEvidence .claim-view-fields')).toBeVisible();
  170 |       await expect(page.locator('#selectedEvidence .claim-view-sources')).toBeVisible();
  171 |     }
  172 |     await page.locator('#selectedEvidenceSourcesLink').click();
  173 |     await expect(page.locator('#sourceContextLabel')).toBeInViewport();
  174 |     expect(await page.locator('#panel').evaluate((panel) => panel.scrollTop)).toBe(0);
  175 |     await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'object');
  176 |   });
  177 | }
  178 | 
```