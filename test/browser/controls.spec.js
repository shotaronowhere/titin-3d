import { test, expect } from '@playwright/test';

import {
  SC27A_VIEWPORTS,
  chromeCounts,
  failOnPageErrors,
  horizontalOverflow,
  waitForReady,
} from './helpers.js';

failOnPageErrors(test);

const DESKTOP = { width: 1280, height: 720 };
const PHONE = { width: 375, height: 812 };
const SCENE_LABELS = {
  lattice: 'Lattice', architecture: 'Architecture', a_band_scaffold: 'A-band scaffold',
};

async function boot(page, viewport = DESKTOP, hash = '') {
  await page.setViewportSize(viewport);
  await page.goto(`/index.html${hash}`);
  await waitForReady(page);
}

async function openResearchInventory(page) {
  if (await page.locator('#panel').isHidden()) await page.locator('#audienceEvidence').click();
  else await page.locator('#tabInspect').click();
  await expect(page.locator('#tabInspect')).toHaveAttribute('aria-selected', 'true');
  const details = page.locator('.research-inventory');
  if (!(await details.evaluate((node) => node.open))) await details.locator('summary').click();
  await expect(page.locator('#sceneControls')).toBeVisible();
}

for (const viewport of SC27A_VIEWPORTS) {
  test(`SC24/27A Tour hierarchy remains bounded at ${viewport.width}x${viewport.height}`,
    async ({ page }) => {
      await boot(page, viewport);
      await expect(page.locator('#panel')).toBeHidden();
      await expect(page.locator('#guidedCard')).toBeVisible();
      const counts = await chromeCounts(page);
      expect(counts.visible).toBeLessThanOrEqual(5);
      expect(counts.tabbable).toBeLessThanOrEqual(4);
      expect((await horizontalOverflow(page)).document).toBeLessThanOrEqual(1);
      expect(await page.locator('#guidedCardBody').evaluate(
        (node) => node.scrollHeight <= node.clientHeight + 1,
      )).toBe(true);
    });
}

test('SC24/27A tablet rotation preserves semantic state and operability', async ({ page }) => {
  await boot(page, { width: 768, height: 1024 });
  await openResearchInventory(page);
  await page.locator('#sceneControls [data-scene="lattice"]').click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.locator('#sceneTruth')).toHaveText('Lattice');
  await expect(page.locator('#sceneControls [data-scene="lattice"]'))
    .toHaveAttribute('aria-pressed', 'true');
  expect((await horizontalOverflow(page)).document).toBeLessThanOrEqual(1);
});

test('SC24/27A Tour stays visible and Research restores its invoking focus', async ({ page }) => {
  await boot(page, PHONE);
  await page.locator('#chapterNext').click();
  await expect(page.locator('#chapterTitle')).toHaveText('Follow one giant molecule');
  await page.locator('#audienceEvidence').click();
  await expect(page.locator('#panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#panel')).toBeHidden();
  await expect(page.locator('#audienceEvidence')).toBeFocused();
  await expect(page.locator('#guidedCard')).toBeVisible();
  await expect(page.locator('#chapterTitle')).toHaveText('Follow one giant molecule');
});

test('SC24 scene truth, contextual layers, URL, and browser history agree', async ({ page }) => {
  await boot(page);
  await openResearchInventory(page);
  const lattice = page.locator('#sceneControls [data-scene="lattice"]');
  await lattice.click();
  await expect(lattice).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#sceneTruth')).toHaveText('Lattice');
  expect(new URL(page.url()).hash).toContain('scene=lattice');

  await page.locator('#sceneRingControls [data-scene-rings="2"]').click();
  await expect(page.locator('#sceneTruth')).toHaveText('Custom');
  let params = new URLSearchParams(new URL(page.url()).hash.slice(1));
  expect(params.has('scene')).toBe(false);
  expect(params.get('layers').split(',')).toContain('lattice_rings_2');
  await expect.poll(() => page.evaluate(
    () => window.titinVisualization.currentState().manifest.lattice.thick_drawn,
  )).toBe(19);

  await page.goBack();
  await expect(page.locator('#sceneTruth')).toHaveText('Lattice');
  await page.goForward();
  await expect(page.locator('#sceneTruth')).toHaveText('Custom');
});

test('SC24 object selection immediately makes scene truth and URL agree', async ({ page }) => {
  await boot(page);
  await page.locator('#canvas').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#sceneTruth')).toHaveText('Custom');
  const params = new URLSearchParams(new URL(page.url()).hash.slice(1));
  expect(params.has('scene')).toBe(false);
  expect(params.get('target')).not.toBe('titin');
});

test('SC24 a fresh Custom lattice link restores its Research controls', async ({ page }) => {
  await boot(page, DESKTOP,
    '#v=2&depth=learn&step=meet_sarcomere&sl=2200&drawer=closed'
      + '&camera=closeup.lattice&scale=context&target=none&context=1'
      + '&layers=extended_lattice%2Clattice_rings_2%2Cshow_context_detail%2Cshow_lattice'
      + '&confidence=0');
  await openResearchInventory(page);
  await expect(page.locator('#sceneTruth')).toHaveText('Custom');
  await expect(page.locator('#sceneMyosinToggle')).toBeVisible();
  await expect(page.locator('#sceneRingControls [data-scene-rings="2"]'))
    .toHaveAttribute('aria-pressed', 'true');
});

test('SC24 slider is contextual to Stretch and describes the supported range', async ({ page }) => {
  await boot(page);
  await expect(page.locator('#sl')).toBeHidden();
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await expect(page.locator('#sl')).toBeVisible();
  const track = await page.locator('#sl').evaluate((slider) => ({
    start: getComputedStyle(slider).getPropertyValue('--supported-start').trim(),
    end: getComputedStyle(slider).getPropertyValue('--supported-end').trim(),
    background: getComputedStyle(slider).backgroundImage,
    description: document.querySelector('#supportedRangeDescription').textContent,
  }));
  expect(track.start).toBe('9.09%');
  expect(track.end).toBe('45.45%');
  expect(track.background).toContain('linear-gradient');
  expect(track.description).toMatch(/supported working range/i);
});

test('SC24 visible mechanics tables keep human labels in Research', async ({ page }) => {
  await boot(page);
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await page.locator('#stageForce').click();
  await expect(page.locator('#panelMeasure')).toBeVisible();
  const labels = await page.locator('.force-contributions td:first-child, .force-parameters td:first-child')
    .allTextContents();
  expect(labels.length).toBeGreaterThan(4);
  expect(labels).toContain('Proximal tandem Ig (I-band)');
  expect(labels).toContain('Boltzmann constant');
  expect(labels.some((label) => /physical_constants|prox_Ig|extensible_straighten/.test(label)))
    .toBe(false);
});

test('SC24 exact legacy links migrate silently to canonical v2 and final v3 story state', async ({ page }) => {
  await boot(page, DESKTOP,
    '#mode=guided&step=architecture&sl=2317&scale=detail&camera=region.prox_Ig&target=titin_domains&evidence=0');
  await expect(page.locator('#chapterTitle')).toHaveText('Build and stretch the spring');
  await expect(page.locator('#urlNotice')).toBeHidden();
  const params = new URLSearchParams(new URL(page.url()).hash.slice(1));
  expect(params.get('v')).toBe('2');
  expect(params.get('depth')).toBe('learn');
  expect(params.get('drawer')).toBe('closed');
  expect(params.get('step')).toBe('stretch_spring');
  expect(params.get('sl')).toBe('2317');
  expect(params.get('camera')).toBe('region.prox_Ig');
  expect(params.get('target')).toBe('titin_domains');
});

test('SC24 impossible v2 display state is repaired with a visible notice', async ({ page }) => {
  await boot(page, DESKTOP,
    '#v=2&depth=learn&step=meet_sarcomere&sl=2200&drawer=closed'
      + '&camera=view.titin_story&scale=detail&target=titin&context=1'
      + '&layers=extended_lattice%2Clattice_rings_1%2Cshow_domains&confidence=0');
  await expect(page.locator('#urlNotice')).toBeVisible();
  await expect(page.locator('#urlNotice')).toContainText('Context must agree with scale');
  const params = new URLSearchParams(new URL(page.url()).hash.slice(1));
  expect(params.get('scale')).toBe('detail');
  expect(params.get('context')).toBe('0');
});

test('SC24 coarse-pointer Guided controls meet the 44px target floor', async ({ browser }) => {
  const context = await browser.newContext({ viewport: PHONE, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/index.html');
  await waitForReady(page);
  for (const selector of ['#scopeBadge', '#audienceEvidence', '#chapterPrevious', '#chapterNext']) {
    const box = await page.locator(selector).boundingBox();
    expect(box?.height, selector).toBeGreaterThanOrEqual(44);
  }
  await context.close();
});

test('SC24 the myosin detail control changes model state from Research', async ({ page }) => {
  await boot(page);
  await openResearchInventory(page);
  await page.locator('#sceneControls [data-scene="lattice"]').click();
  await expect.poll(() => page.evaluate(
    () => window.titinVisualization.currentState().manifest.context_detail,
  )).not.toBeNull();
  await page.locator('#sceneMyosinToggle').click();
  await expect(page.locator('#sceneTruth')).toHaveText('Custom');
  await expect.poll(() => page.evaluate(
    () => window.titinVisualization.currentState().manifest.context_detail,
  )).toBeNull();
});

test('SC24 every Research scene that offers myosin detail round-trips model and URL truth',
  async ({ page }) => {
    await boot(page);
    await openResearchInventory(page);
    for (const scene of ['lattice', 'architecture', 'a_band_scaffold']) {
      await page.locator(`#sceneControls [data-scene="${scene}"]`).click();
      await expect(page.locator('#sceneTruth')).toHaveText(SCENE_LABELS[scene]);
      await expect(page.locator('#sceneMyosinToggle')).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(() => page.evaluate(
        () => window.titinVisualization.currentState().manifest.context_detail,
      ), `${scene} must draw the detail layer first`).not.toBeNull();

      await page.locator('#sceneMyosinToggle').click();
      await expect(page.locator('#sceneMyosinToggle')).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('#sceneTruth')).toHaveText('Custom');
      let params = new URLSearchParams(new URL(page.url()).hash.slice(1));
      expect(params.has('scene'), `${scene} must serialize as Custom`).toBe(false);
      expect(params.get('layers').split(',')).not.toContain('show_context_detail');
      await expect.poll(() => page.evaluate(
        () => window.titinVisualization.currentState().manifest.context_detail,
      )).toBeNull();

      await page.locator('#sceneMyosinToggle').click();
      await expect(page.locator('#sceneTruth')).toHaveText(SCENE_LABELS[scene]);
      params = new URLSearchParams(new URL(page.url()).hash.slice(1));
      expect(params.get('scene')).toBe(scene);
    }
  });

test('SC24 a shared Custom close-up link restores its disabled detail layer exactly', async ({ page }) => {
  await boot(page);
  await openResearchInventory(page);
  await page.locator('#sceneControls [data-scene="lattice"]').click();
  await page.locator('#sceneMyosinToggle').click();
  const shared = new URL(page.url()).hash;

  await boot(page, DESKTOP, shared);
  await openResearchInventory(page);
  await expect(page.locator('#urlNotice')).toBeHidden();
  await expect(page.locator('#sceneMyosinToggle')).toHaveAttribute('aria-pressed', 'false');
  expect(new URL(page.url()).hash).toBe(shared);
  await expect.poll(() => page.evaluate(
    () => window.titinVisualization.currentState().manifest.context_detail,
  )).toBeNull();
});

test('SC24 Research detail switches keep the stage alive on a close-up', async ({ page }) => {
  await boot(page);
  await openResearchInventory(page);
  await page.locator('#sceneControls [data-scene="z_anchor"]').click();
  await page.locator('#toggles [data-key="showContextDetail"]').click();
  await expect(page.locator('#err')).toBeHidden();
  expect(new URLSearchParams(new URL(page.url()).hash.slice(1))
    .get('layers').split(',')).not.toContain('show_context_detail');
});

test('SC24 only a camera that actually moves makes the scene Custom', async ({ page }) => {
  await boot(page);
  const box = await page.locator('#canvas canvas').boundingBox();
  await page.mouse.click(box.x + 14, box.y + 170);
  await expect(page.locator('#sceneTruth')).toHaveText('Overview');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 45, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('#sceneTruth')).toHaveText('Custom');
  await expect(page.locator('#objectAnnouncement')).toContainText('Camera adjusted manually');
  expect(new URL(page.url()).hash).not.toContain('scene=overview');
  await expect(page.locator('#researchRestoreView')).toBeHidden();

  await page.locator('#audienceEvidence').click();
  await expect(page.locator('#researchRestoreView')).toBeVisible();
  await page.locator('#researchRestoreView').click();
  await expect(page.locator('#sceneTruth')).toHaveText('Overview');
  await expect.poll(() => page.evaluate(
    () => window.titinVisualization.currentState().camera_preset,
  )).toBe('view.titin_hero');
  await expect(page.locator('#researchRestoreView')).toBeHidden();
  await expect(page.locator('#scopeDetails')).toBeFocused();
});
