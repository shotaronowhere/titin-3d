import { test, expect } from '@playwright/test';

import { setReviewViewport, waitForReady } from './helpers.js';

const chapters = [
  'Meet the sarcomere',
  'Follow one giant molecule',
  'Build and stretch the spring',
  'Scaffold the thick filament',
  'What do we know?',
];

async function boot(page, viewport, hash = '') {
  await setReviewViewport(page, viewport);
  await page.goto(`/index.html${hash}`);
  await waitForReady(page);
}

for (const viewport of ['desktop', 'responsive']) {
  test(`SC23/27A ${viewport} completes the silent five-beat Tour without changing length`,
    async ({ page }) => {
      await boot(page, viewport,
        '#v=2&depth=learn&step=meet_sarcomere&sl=2317&drawer=closed'
          + '&camera=view.titin_hero&scale=context&target=titin&context=1'
          + '&layers=lattice_rings_1%2Cshow_lattice&confidence=0');
      for (let index = 0; index < chapters.length; index += 1) {
        await expect(page.locator('#chapterTitle')).toHaveText(chapters[index]);
        await expect(page.locator('#chapterProgress')).toHaveText(`Beat ${index + 1} of 5`);
        await expect(page.locator('#sl')).toHaveValue('2317');
        await expect(page.locator('#chapterStateAnnouncement')).not.toBeEmpty();
        if (index > 0) await expect(page.locator('#chapterPrevious')).toHaveAttribute(
          'aria-label', `Previous: ${chapters[index - 1]}`,
        );
        if (index < chapters.length - 1) await page.locator('#chapterNext').click();
      }
      await expect(page.locator('#chapterNext')).toHaveText('Replay');
      await page.locator('#chapterNext').click();
      await expect(page.locator('#chapterTitle')).toHaveText(chapters[0]);
      await expect(page.locator('#sl')).toHaveValue('2317');
      await expect(page.locator('#err')).toBeHidden();
    });
}

test('SC23 out-of-range Stretch setup stays explicit and user-reversible', async ({ page }) => {
  await boot(page, 'desktop',
    '#v=2&depth=learn&step=stretch_spring&sl=1900&drawer=closed'
      + '&camera=region.PEVK&scale=detail&target=PEVK&context=0'
      + '&layers=show_domains&confidence=0');
  await expect(page.locator('#chapterTitle')).toHaveText('Build and stretch the spring');
  await expect(page.locator('#sl')).toHaveValue('1900');
  await page.locator('#stagePlay').click();
  await expect(page.locator('#sl')).toHaveValue('1900');
  await expect(page.locator('#objectAnnouncement')).toContainText(
    'use the slider to choose 2,000 to 2,400 nanometres first',
  );
  await page.locator('#sl').fill('2000');
  await expect(page.locator('#stagePlay')).toBeEnabled();
  await page.locator('#sl').fill('1900');
  await expect(page.locator('#sl')).toHaveValue('1900');
});

test('SC23 legacy step-only links restore and canonicalize the complete final scene', async ({ page }) => {
  await boot(page, 'desktop', '#mode=guided&step=architecture&sl=2317');
  await expect(page.locator('#chapterTitle')).toHaveText('Build and stretch the spring');
  await expect(page.locator('#urlNotice')).toBeHidden();
  const hash = new URL(page.url()).hash;
  expect(hash).toContain('v=2');
  expect(hash).toContain('step=stretch_spring');
  expect(hash).toContain('sl=2317');
  expect(hash).toContain('scene=spring');
  expect(await page.evaluate(() => window.titinVisualization.currentState().camera_preset))
    .toBe('view.titin_hero');
  expect(await page.evaluate(() => window.titinVisualization.currentState().highlighted_titin_region))
    .toBe('PEVK');
});

test('SC23 Sources exposes the resolved semantic-scene context in Research', async ({ page }) => {
  await boot(page, 'desktop');
  await page.locator('#audienceEvidence').click();
  await page.locator('#tabSources').click();
  await page.locator('#sourceFilters [data-source-scope="scene"]').click();
  await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'scene');
  await expect(page.locator('#sourceContextLabel')).toContainText('Sources for this scene');
  await expect(page.locator('#sourceContextLabel')).toContainText('Overview');
  expect(await page.locator('#bibliography .source-result').count()).toBeGreaterThan(0);
});
