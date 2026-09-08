import { test, expect } from '@playwright/test';
import { failOnPageErrors, setReducedMotion, waitForReady } from './helpers.js';

failOnPageErrors(test);

async function open(page, width, height, step = 'stretch_spring') {
  await page.setViewportSize({ width, height });
  await setReducedMotion(page);
  await page.goto(`/index.html#v=2&depth=learn&step=${step}&sl=2400&drawer=closed&confidence=0`);
  await waitForReady(page);
}

async function chartLayout(page) {
  return page.locator('#forceCurve .force-chart').evaluate((svg) => {
    const box = svg.getBoundingClientRect();
    const labels = [...svg.querySelectorAll('text')].map((node) => {
      const r = node.getBoundingClientRect();
      const transform = node.getScreenCTM();
      return { text: node.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom,
        fontPx: parseFloat(getComputedStyle(node).fontSize) * Math.hypot(transform.c, transform.d) };
    });
    const intersections = [];
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i], b = labels[j];
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5
          && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5) {
        intersections.push([a.text, b.text]);
      }
    }
    return { minFontPx: Math.min(...labels.map(x => x.fontPx)), intersections,
      clipped: labels.filter(r => r.left < box.left - 0.5 || r.right > box.right + 0.5
        || r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5).map(r => r.text),
      overflow: document.querySelector('#panel').scrollWidth - document.querySelector('#panel').clientWidth };
  });
}

for (const [width, height] of [[1280, 720], [390, 844], [320, 740]]) {
  test(`Final polish ${width}: force labels are readable and Large type actually enlarges them`, async ({ page }) => {
    await open(page, width, height);
    await page.locator('#stageForce').click();
    await expect(page.locator('.force-axis-title').first()).toContainText('per titin (pN)');
    await expect(page.locator('.force-figure figcaption')).toContainText('sarcomere length (nm)');
    const ordinary = await chartLayout(page);
    expect(ordinary.minFontPx).toBeGreaterThanOrEqual(12);
    expect(ordinary.clipped).toEqual([]);
    expect(ordinary.intersections).toEqual([]);
    expect(ordinary.overflow).toBeLessThanOrEqual(1);
    const ordinaryText = await page.locator('#mechanicsScope').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    await page.locator('#textScale').click();
    await expect(page.locator('#textScale')).toHaveAttribute('aria-pressed', 'true');
    const large = await chartLayout(page);
    expect(large.minFontPx).toBeGreaterThan(ordinary.minFontPx);
    expect(large.clipped).toEqual([]);
    expect(large.intersections).toEqual([]);
    expect(large.overflow).toBeLessThanOrEqual(1);
    const largeText = await page.locator('#mechanicsScope').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    expect(largeText).toBeGreaterThan(ordinaryText);
    await page.locator('#textScale').click();
    expect((await chartLayout(page)).minFontPx).toBeCloseTo(ordinary.minFontPx, 2);
  });
}

test('Final polish: withdraw the colliding locator while keeping the main model labels', async ({ page }) => {
  await open(page, 1280, 720, 'meet_sarcomere');
  await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-locator-layout', 'visible');
  await page.locator('#chapterNext').click();
  await expect(page.locator('#oppositeTitinNote')).toBeVisible();
  await expect(page.locator('#oppositeTitinNote')).toContainText('separate representative path');
  await page.locator('#chapterNext').click();
  await expect(page.locator('#oppositeTitinNote')).toBeHidden();
  await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-locator-layout', 'suppressed:model-proximity');
  await expect(page.locator('[data-full-sarcomere-locator]')).toHaveCount(0);
  await expect(page.locator('.terminus-dot')).toHaveCount(2);
  await expect(page.locator('[data-stretch-comparison] text')).toHaveCount(2);
  await page.locator('#sl').fill('2000');
  await expect(page.locator('[data-stretch-comparison] text').first()).toHaveText('I-band');
  await page.locator('#sl').fill('2400');
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-locator-layout', 'suppressed:model-proximity');
  await expect(page.locator('[data-full-sarcomere-locator]')).toHaveCount(0);
  await expect(page.locator('.terminus-dot')).toHaveCount(2);
});

test('Final polish: phone Tour retains its locator and explains the opposite path', async ({ page }) => {
  await open(page, 390, 844, 'follow_titin');
  await expect(page.locator('#oppositeTitinNote')).toBeVisible();
  await page.locator('#chapterNext').click();
  await expect(page.locator('#oppositeTitinNote')).toBeHidden();
  await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-locator-layout', 'visible');
  await expect(page.locator('[data-full-sarcomere-locator]')).toHaveCount(1);
});

test('Final polish: selected scientific sources precede build identifiers on phone', async ({ page }) => {
  await open(page, 390, 844, 'knowledge_recap');
  await page.locator('#chapterInspectEvidence').click();
  await page.locator('#selectedEvidenceSourcesLink').click();
  const source = page.locator('#bibliography .source-result summary').first();
  await expect(source).toBeVisible();
  const paper = await source.boundingBox();
  const identity = await page.locator('#buildFingerprint').boundingBox();
  expect(paper.y + paper.height).toBeLessThan(844);
  expect(paper.y + paper.height).toBeLessThan(identity.y);
  await source.click();
  await expect(page.locator('#bibliography .source-result').first()).toContainText('Locator');
  await expect(page.locator('#modelFingerprint')).toHaveText(/^[a-f0-9]{64}$/);
});

test('Final polish: chart labels fit across supported and extrapolated states', async ({ page }) => {
  await open(page, 390, 844);
  for (const length of [2000, 2200, 2450]) {
    await page.locator('#sl').fill(String(length));
    await page.locator('#stageForce').click();
    for (const large of [false, true]) {
      if (large) await page.locator('#textScale').click();
      const layout = await chartLayout(page);
      expect(layout.clipped, `${length} nm, large=${large}`).toEqual([]);
      expect(layout.intersections, `${length} nm, large=${large}`).toEqual([]);
    }
    await expect(page.locator('.force-readout')).toContainText(length === 2450 ? 'extrapolated' : 'supported');
    await page.locator('#textScale').click();
    await page.locator('#closeEvidence').click();
  }
});
