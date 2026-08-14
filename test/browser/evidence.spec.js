import { test, expect } from '@playwright/test';

import { setReviewViewport, waitForReady } from './helpers.js';

async function boot(page, viewport = 'desktop') {
  await setReviewViewport(page, viewport);
  await page.goto('/index.html');
  await waitForReady(page);
}

test('SC22 desktop uses the drawer as the sole full selected-claim surface', async ({ page }) => {
  await boot(page);
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await page.locator('.extension-row[data-region="prox_Ig"]').click();
  await expect(page.locator('#objectInspector')).toBeVisible();
  await page.locator('#audienceEvidence').click();
  await expect(page.locator('#objectInspector')).toBeHidden();
  await expect(page.locator('#selectedEvidence')).toBeVisible();
  await expect(page.locator('#selectedEvidence .claim-view-fields dt')).toHaveCount(3);
  await expect(page.locator('#selectedEvidence .claim-view-sources')).toBeVisible();
});

test('SC22 Guided inspector stays compact and clear of the stage controls', async ({ page }) => {
  await boot(page);
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  // Chapter 4 starts with PEVK selected; move away and back so the PEVK row
  // exercises the pinning path instead of its intentional toggle-off path.
  await page.locator('.extension-row[data-region="prox_Ig"]').click();
  await page.locator('.extension-row[data-region="PEVK"]').click();
  const geometry = await page.evaluate(() => {
    const card = document.querySelector('#objectInspector').getBoundingClientRect();
    const bar = document.querySelector('#stageBar').getBoundingClientRect();
    return {
      card: { top: card.top, bottom: card.bottom, height: card.height },
      bar: { top: bar.top, bottom: bar.bottom },
      specialistDisplay: getComputedStyle(document.querySelector(
        '#objectInspectorClaim .claim-view-specialist',
      )).display,
    };
  });
  expect(geometry.card.bottom).toBeLessThanOrEqual(geometry.bar.top + 1);
  expect(geometry.card.height).toBeLessThan(360);
  expect(geometry.specialistDisplay).toBe('none');
  await expect(page.locator('#objectInspector .claim-view-sources')).toBeVisible();
});

test('SC22 contextual source controls select object, chapter, all, and exact value', async ({ page }) => {
  await boot(page);
  await page.locator('#stageSourcesLink').click();
  await expect(page.locator('#tabSources')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#sourceContextLabel')).toContainText('Sources for this object');
  await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'object');

  await page.locator('#sourceFilters [data-source-scope="chapter"]').click();
  await expect(page.locator('#sourceContextLabel')).toContainText('Sources for this chapter');
  await page.locator('#sourceFilters [data-source-scope="all"]').click();
  await expect(page.locator('#sourceContextLabel')).toContainText('All sources');
  expect(await page.locator('#bibliography .source-result').count()).toBeGreaterThan(40);

  await page.locator('#tabMeasure').click();
  await page.locator('#forceCurve details > summary').click();
  await page.locator('#forceCurve .parameter-source-link').first().click();
  await expect(page.locator('#tabSources')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#sourceContextLabel')).toContainText('Sources for this value');
  await expect(page.locator('#bibliography .source-result')).toHaveCount(1);
  await page.locator('#bibliography .source-result summary').click();
  await expect(page.locator('#bibliography')).toContainText('Preparation');
  await expect(page.locator('#bibliography')).toContainText('Locator');
  await expect(page.locator('#bibliography')).toContainText('Relationship');
  await expect(page.locator('#bibliography')).toContainText('Extraction note');
  await expect(page.locator('#bibliography')).toContainText('Offline source ID');
});

test('SC22 value clearing falls back instead of rendering an empty source list', async ({ page }) => {
  await boot(page, 'responsive');
  await page.locator('#stageMeasureLink').click();
  await page.locator('#forceCurve details > summary').click();
  await page.locator('#forceCurve .parameter-source-link').first().click();
  await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'value');
  await page.locator('#tabInspect').click();
  await page.locator('#regions [data-region="prox_Ig"]').click();
  await page.locator('#tabSources').click();
  await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'object');
  expect(await page.locator('#bibliography .source-result').count()).toBeGreaterThan(0);
});

test('SC22 selectable current chart point filters sources and restores the outer invoker', async ({ page }) => {
  await boot(page);
  await page.locator('#stageMeasureLink').click();
  await page.locator('#forceCurve .force-current-point').focus();
  await page.locator('#forceCurve .force-current-point').press('Enter');
  await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'value');
  await expect(page.locator('#sourceContextLabel')).toContainText('Modeled chart point at');
  await page.locator('#closeEvidence').click();
  await expect(page.locator('#stageMeasureLink')).toBeFocused();
});

test('SC22 parameter source routing keeps a visible close-focus target', async ({ page }) => {
  await boot(page);
  await page.locator('#stageMeasureLink').click();
  await page.locator('#forceCurve details > summary').click();
  await page.locator('#forceCurve .parameter-source-link').first().click();
  await page.locator('#closeEvidence').click();
  await expect(page.locator('#stageMeasureLink')).toBeFocused();
});

test('SC22 ClaimView DOM keeps citations after copy, fields, and limitations', async ({ page }) => {
  await boot(page);
  await page.locator('#audienceEvidence').click();
  const order = await page.locator('#chapterEvidence .claim-view').evaluate((node) => {
    const names = [...node.children].map((child) => child.className);
    return {
      fields: names.indexOf('claim-view-fields'),
      limitations: names.indexOf('claim-view-limitations'),
      sources: names.indexOf('claim-view-sources'),
    };
  });
  expect(order.fields).toBeGreaterThan(-1);
  expect(order.limitations).toBeGreaterThan(order.fields);
  expect(order.sources).toBeGreaterThan(order.limitations);
  await expect(page.locator('#expertCards .finding-status')).toHaveCount(25);
  await expect(page.locator('#expertCards [data-card="aband_scaffold_card"] .claim-view-source'))
    .toHaveCount(4);
  await expect(page.locator('#expertCards [data-card="unresolved_questions_card"] .claim-view-source'))
    .toHaveCount(5);
});

for (const viewport of ['desktop', 'responsive']) {
  test(`SC22 ${viewport} Evidence view owns full titin, PEVK, and kinase detail`, async ({ page }) => {
    await boot(page, viewport);
    await page.locator('#audienceEvidence').click();

    for (const target of [
      { selector: '#annotations [data-target-id="titin"]', title: 'Titin' },
      { selector: '#regions [data-region="PEVK"]', title: 'PEVK' },
      { selector: '#regions [data-region="kinase"]', title: 'kinase' },
    ]) {
      await page.locator('#tabInspect').click();
      await page.locator(target.selector).click();
      await page.locator('#tabEvidence').click();
      await expect(page.locator('#objectInspector')).toBeHidden();
      await expect(page.locator('#selectedEvidence')).toBeVisible();
      await expect(page.locator('#selectedEvidence .claim-view-title')).toContainText(target.title);
      await expect(page.locator('#selectedEvidence .claim-view-fields')).toBeVisible();
      await expect(page.locator('#selectedEvidence .claim-view-sources')).toBeVisible();
    }

    await page.locator('#selectedEvidenceSourcesLink').click();
    await expect(page.locator('#sourceContextLabel')).toBeInViewport();
    expect(await page.locator('#panel').evaluate((panel) => panel.scrollTop)).toBe(0);
    await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'object');
  });
}
