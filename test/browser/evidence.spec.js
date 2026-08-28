import { test, expect } from '@playwright/test';

import { clickProjectedLabel, setReviewViewport, waitForReady } from './helpers.js';

async function boot(page, viewport = 'desktop') {
  await setReviewViewport(page, viewport);
  await page.goto('/index.html');
  await waitForReady(page);
}

async function selectTitinFromStage(page) {
  await clickProjectedLabel(page, 'Titin');
  await expect(page.locator('#objectInspector')).toBeVisible();
}

async function openInventory(page) {
  const details = page.locator('.research-inventory');
  if (!(await details.evaluate((node) => node.open))) await details.locator('summary').click();
}

test('SC22/27A object explanation is compact and Research owns the full selected claim', async ({ page }) => {
  await boot(page);
  await selectTitinFromStage(page);
  await expect(page.locator('#objectInspectorName')).not.toBeEmpty();
  await expect(page.locator('#objectInspectorLay')).not.toBeEmpty();
  await expect(page.locator('#objectInspectorEvidence .evidence-chip')).toHaveCount(1);
  await expect(page.locator('#objectInspectorDetailLink')).toHaveText(/Why we know this/);
  await page.locator('#objectInspectorDetailLink').click();
  await expect(page.locator('#objectInspector')).toBeHidden();
  await expect(page.locator('#tabEvidence')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#selectedEvidence')).toBeVisible();
  expect(await page.locator('#selectedEvidence .claim-view-fields dt').count()).toBeGreaterThanOrEqual(2);
  await expect(page.locator('#selectedEvidence .claim-view-sources')).toBeVisible();
});

test('SC22 Guided inspector stays compact and clear of the Tour continuation', async ({ page }) => {
  await boot(page);
  await selectTitinFromStage(page);
  const geometry = await page.evaluate(() => {
    const card = document.querySelector('#objectInspector').getBoundingClientRect();
    const tour = document.querySelector('#guidedCard').getBoundingClientRect();
    const next = document.querySelector('#chapterNext').getBoundingClientRect();
    return {
      card: { top: card.top, bottom: card.bottom, height: card.height, left: card.left, right: card.right },
      tour: { top: tour.top, bottom: tour.bottom, left: tour.left, right: tour.right },
      next: { top: next.top, bottom: next.bottom, left: next.left, right: next.right },
    };
  });
  const collide = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  expect(geometry.card.height).toBeLessThan(300);
  expect(collide(geometry.card, geometry.next)).toBe(false);
  await expect(page.locator('#objectInspectorClaim')).toHaveCount(0);
});

test('SC22 contextual source controls select object, chapter, all, and exact value', async ({ page }) => {
  await boot(page);
  await selectTitinFromStage(page);
  await page.locator('#objectInspectorDetailLink').click();
  await page.locator('#selectedEvidenceSourcesLink').click();
  await expect(page.locator('#tabSources')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#sourceContextLabel')).toContainText('Sources for this object');
  await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'object');

  await page.locator('#sourceFilters [data-source-scope="chapter"]').click();
  await expect(page.locator('#sourceContextLabel')).toContainText('Sources for this beat');
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

test('SC22 value clearing falls back to the selected object instead of an empty source list', async ({ page }) => {
  await boot(page, 'responsive');
  await page.locator('#audienceEvidence').click();
  await page.locator('#tabMeasure').click();
  await page.locator('#forceCurve details > summary').click();
  await page.locator('#forceCurve .parameter-source-link').first().click();
  await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'value');

  await page.locator('#tabInspect').click();
  await openInventory(page);
  await page.locator('#regions [data-region="prox_Ig"]').click();
  await page.locator('#tabSources').click();
  await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'object');
  expect(await page.locator('#bibliography .source-result').count()).toBeGreaterThan(0);
});

test('SC22 parameter source routing closes to its visible stage invoker', async ({ page }) => {
  await boot(page);
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await page.locator('#stageForce').click();
  await page.locator('#forceCurve details > summary').click();
  await page.locator('#forceCurve .parameter-source-link').first().click();
  await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'value');
  await page.locator('#closeEvidence').click();
  await expect(page.locator('#stageForce')).toBeFocused();
});

test('SC22 selectable chart point filters sources and restores the contextual invoker', async ({ page }) => {
  await boot(page);
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await page.locator('#stageForce').click();
  await page.locator('#forceCurve .force-current-point').focus();
  await page.locator('#forceCurve .force-current-point').press('Enter');
  await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'value');
  await expect(page.locator('#sourceContextLabel')).toContainText('Modeled chart point at');
  await page.locator('#closeEvidence').click();
  await expect(page.locator('#stageForce')).toBeFocused();
});

test('SC22 ClaimView keeps citations after copy, fields, and limitations', async ({ page }) => {
  await boot(page);
  await page.locator('#audienceEvidence').click();
  await page.locator('#tabEvidence').click();
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
  test(`SC22 ${viewport} Research owns full titin, PEVK, and kinase detail`, async ({ page }) => {
    await boot(page, viewport);
    await page.locator('#audienceEvidence').click();
    await openInventory(page);
    for (const target of [
      { selector: '#annotations [data-target-id="titin"]', title: 'Titin' },
      { selector: '#regions [data-region="PEVK"]', title: 'PEVK' },
      { selector: '#regions [data-region="kinase"]', title: 'kinase' },
    ]) {
      await page.locator('#tabInspect').click();
      await openInventory(page);
      await page.locator(target.selector).click();
      await page.locator('#tabEvidence').click();
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
