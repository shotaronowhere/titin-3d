import { test, expect } from '@playwright/test';

import { setReviewViewport, waitForReady } from './helpers.js';

const chapters = [
  'Meet the sarcomere',
  'Follow one giant molecule',
  'See its molecular architecture',
  'Stretch the spring',
  'Inspect both anchors',
  'Scaffold the thick filament',
  'What do we know?',
];

async function boot(page, viewport) {
  await setReviewViewport(page, viewport);
  await page.goto('/index.html');
  await waitForReady(page);
}

for (const viewport of ['desktop', 'responsive']) {
  test(`SC23 ${viewport} completes the silent Learn route without changing length`, async ({ page }) => {
    await boot(page, viewport);
    await page.locator('#sl').fill('2317');
    await expect(page.locator('#chapterTitle')).toHaveText(chapters[0]);
    await expect(page.locator('#chapterProgress')).toHaveText('Chapter 1 of 7');
    await expect(page.locator('#chapterStateAnnouncement')).toContainText('length is preserved');

    for (let index = 1; index < chapters.length; index += 1) {
      await page.locator('#chapterNext').click();
      await expect(page.locator('#chapterTitle')).toHaveText(chapters[index]);
      await expect(page.locator('#chapterProgress')).toHaveText(`Chapter ${index + 1} of 7`);
      await expect(page.locator('#sl')).toHaveValue('2317');
      await expect(page.locator('#chapterStateAnnouncement')).not.toBeEmpty();
      await expect(page.locator('#chapterPrevious')).toContainText(`Previous: ${chapters[index - 1]}`);
    }

    await expect(page.locator('#chapterNext')).toBeDisabled();
    await expect(page.locator('#chapterNextActions button')).toHaveText([
      'Replay stretch', 'Inspect a region', 'Open evidence',
    ]);
    await expect(page.locator('#err')).toBeHidden();
  });
}

test('SC23 out-of-range stretch setup is explicit and reversible', async ({ page }) => {
  await boot(page, 'desktop');
  await page.locator('#sl').fill('1900');
  for (let index = 0; index < 3; index += 1) await page.locator('#chapterNext').click();
  await expect(page.locator('#chapterTitle')).toHaveText('Stretch the spring');
  await expect(page.locator('#sl')).toHaveValue('1900');
  await expect(page.locator('#chapterNextActions [data-chapter-action="sweep.toggle"]')).toBeDisabled();

  await page.locator(
    '#chapterNextActions [data-chapter-action="length.set_demo_start"]',
  ).click();
  await expect(page.locator('#sl')).toHaveValue('2000');
  await expect(page.locator(
    '#chapterNextActions [data-chapter-action="length.restore"]',
  )).toBeEnabled();
  await page.locator('#chapterNextActions [data-chapter-action="length.restore"]').click();
  await expect(page.locator('#sl')).toHaveValue('1900');
});

test('SC23 chapter view recommendations are explicit and reversible', async ({ page }) => {
  await boot(page, 'desktop');
  await page.locator('#sl').fill('2317');
  await page.locator('#sceneControls [data-scene="titin_alone"]').click();
  await expect(page.locator('#sceneTruth')).toHaveText('Titin alone');
  await expect(page.locator('#chapterRestoreView')).toBeDisabled();

  await page.locator('#chapterNext').click();
  await expect(page.locator('#chapterRestoreView')).toBeEnabled();
  await expect(page.locator('#chapterStateAnnouncement')).toContainText(
    'Restore previous view is available',
  );

  await page.locator('#chapterRestoreView').click();
  await expect(page.locator('#sceneTruth')).toHaveText('Titin alone');
  await expect(page.locator('#chapterRestoreView')).toBeDisabled();
  await expect(page.locator('#chapterTitle')).toHaveText('Follow one giant molecule');
  await expect(page.locator('#sl')).toHaveValue('2317');
  await expect(page.locator('#chapterStateAnnouncement')).toContainText('Previous view restored');
});

test('SC23 legacy step-only links restore and canonicalize the complete scene', async ({ page }) => {
  await setReviewViewport(page, 'desktop');
  await page.goto('/index.html#mode=guided&step=architecture&sl=2317');
  await waitForReady(page);
  await expect(page.locator('#chapterTitle')).toHaveText('See its molecular architecture');
  await expect(page.locator('#urlNotice')).toBeHidden();
  await expect(page.locator('#scales [data-scale="detail"]')).toHaveAttribute(
    'aria-pressed', 'true',
  );
  const hash = new URL(page.url()).hash;
  expect(hash).toContain('v=2');
  expect(hash).toContain('step=molecular_architecture');
  expect(hash).toContain('sl=2317');
  expect(hash).toContain('scale=detail');
  expect(hash).toContain('camera=region.prox_Ig');
  expect(hash).toContain('target=titin_domains');
});

test('SC23 Sources exposes the resolved semantic-scene context', async ({ page }) => {
  await boot(page, 'desktop');
  await page.locator('#stageMore').click();
  await page.locator('#stageSourcesLink').click();
  await page.locator('#sourceFilters [data-source-scope="scene"]').click();
  await expect(page.locator('#bibliography')).toHaveAttribute('data-source-scope', 'scene');
  // SC-24: the descriptor prefers the control scene actually on stage over the
  // chapter's SC-23 scene, so the label speaks the primary bar's vocabulary.
  // That branch was unreachable while confidence display forced Explore to Custom.
  await expect(page.locator('#sourceContextLabel')).toContainText('Sources for this scene');
  await expect(page.locator('#sourceContextLabel')).toContainText('Overview');
  await expect(page.locator('#sceneControls [data-scene="overview"]'))
    .toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('#bibliography .source-result').count()).toBeGreaterThan(0);
});
