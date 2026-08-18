import { test, expect } from '@playwright/test';

import { failOnPageErrors, waitForReady } from './helpers.js';

failOnPageErrors(test);

const DESKTOP = { width: 1280, height: 720 };
const PHONE = { width: 375, height: 812 };
const PHONE_LARGE = { width: 390, height: 844 };
const TABLET_PORTRAIT = { width: 768, height: 1024 };
const TABLET_LANDSCAPE = { width: 1024, height: 768 };

async function boot(page, viewport = DESKTOP, hash = '') {
  await page.setViewportSize(viewport);
  await page.goto(`/index.html${hash}`);
  await waitForReady(page);
}

async function layoutBudget(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#canvas').getBoundingClientRect();
    const clip = (box) => ({
      left: Math.max(canvas.left, box.left),
      right: Math.min(canvas.right, box.right),
      top: Math.max(canvas.top, box.top),
      bottom: Math.min(canvas.bottom, box.bottom),
    });
    const hasVisibleBackground = (node) => {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden'
          || Number(style.opacity) === 0) return false;
      const color = style.backgroundColor;
      const alpha = color === 'transparent' ? 0
        : Number(color.match(/rgba?\([^)]*[, /]([\d.]+)\)$/)?.[1] ?? 1);
      return alpha > 0 || style.backgroundImage !== 'none';
    };
    const rectangles = [...document.querySelectorAll('#canvas *')]
      .filter((node) => node.tagName !== 'CANVAS' && hasVisibleBackground(node))
      .map((node) => clip(node.getBoundingClientRect()))
      .filter((box) => box.right > box.left && box.bottom > box.top);

    // Exact rectangle-union area: split on every x edge, then merge y intervals
    // in each slab. Nested backgrounds therefore count once, not once per node.
    const xs = [...new Set(rectangles.flatMap((box) => [box.left, box.right]))]
      .sort((a, b) => a - b);
    let covered = 0;
    for (let index = 0; index < xs.length - 1; index += 1) {
      const left = xs[index]; const right = xs[index + 1];
      if (right <= left) continue;
      const intervals = rectangles
        .filter((box) => box.left < right && box.right > left)
        .map((box) => [box.top, box.bottom])
        .sort((a, b) => a[0] - b[0]);
      let height = 0; let start = null; let end = null;
      for (const [top, bottom] of intervals) {
        if (start === null) { start = top; end = bottom; }
        else if (top <= end) end = Math.max(end, bottom);
        else { height += end - start; start = top; end = bottom; }
      }
      if (start !== null) height += end - start;
      covered += (right - left) * height;
    }
    const canvasArea = canvas.width * canvas.height;
    const stageBar = document.querySelector('#stageBar').getBoundingClientRect();
    const containers = ['#stageBar', '.stage-row-primary', '.stage-row-scenes']
      .map((selector) => {
        const node = document.querySelector(selector);
        return { selector, client: node.clientWidth, scroll: node.scrollWidth };
      });
    return {
      stageBarHeight: stageBar.height,
      viewportHeight: innerHeight,
      unobscuredRatio: canvasArea ? (canvasArea - covered) / canvasArea : 0,
      containers,
      documentOverflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

const SCENE_LABELS = {
  lattice: 'Lattice', architecture: 'Architecture', a_band_scaffold: 'A-band scaffold',
};

/**
 * A thrown module error paints #err over the whole stage and is never cleared.
 * Every SC-24 control assertion below is worthless if the page died first, so
 * the runtime-error channel is asserted rather than assumed.
 */
function watchPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function expectLiveStage(page, errors) {
  await expect(page.locator('#err')).toBeHidden();
  expect(errors, 'the page must raise no runtime error').toEqual([]);
}

for (const viewport of [DESKTOP, PHONE]) {
  test(`SC24 initial hierarchy meets deterministic layout budgets at ${viewport.width}x${viewport.height}`,
    async ({ page }) => {
      await boot(page, viewport);
      await expect(page.locator('#panel')).toBeHidden();
      await expect(page.locator('#moreBackdrop')).toBeHidden();
      await expect(page.locator('#objectInspector')).toBeHidden();
      const budget = await layoutBudget(page);
      expect(budget.unobscuredRatio).toBeGreaterThanOrEqual(0.45);
      expect(budget.documentOverflow).toBeLessThanOrEqual(1);
      for (const container of budget.containers) {
        expect(container.scroll, container.selector).toBeLessThanOrEqual(container.client + 1);
      }
      if (viewport.width === DESKTOP.width) {
        expect(budget.stageBarHeight).toBeLessThanOrEqual(DESKTOP.height * 0.2);
      }
    });
}

for (const viewport of [PHONE_LARGE, TABLET_PORTRAIT, TABLET_LANDSCAPE]) {
  test(`SC24 hierarchy remains operable at ${viewport.width}x${viewport.height}`,
    async ({ page }) => {
      await boot(page, viewport);
      const budget = await layoutBudget(page);
      expect(budget.documentOverflow).toBeLessThanOrEqual(1);
      for (const container of budget.containers) {
        expect(container.scroll, container.selector).toBeLessThanOrEqual(container.client + 1);
      }
      await expect(page.locator('#sl')).toBeVisible();
      await expect(page.locator('#stagePlay')).toBeVisible();
      await expect(page.locator('#stageMore')).toBeVisible();
    });
}

test('SC24 tablet rotation preserves semantic state and operability', async ({ page }) => {
  await boot(page, TABLET_PORTRAIT);
  await page.locator('#sceneControls [data-scene="lattice"]').click();
  await page.setViewportSize(TABLET_LANDSCAPE);
  await expect(page.locator('#sceneTruth')).toHaveText('Lattice');
  await expect(page.locator('#sceneControls [data-scene="lattice"]'))
    .toHaveAttribute('aria-pressed', 'true');
  const budget = await layoutBudget(page);
  expect(budget.documentOverflow).toBeLessThanOrEqual(1);
  for (const container of budget.containers) {
    expect(container.scroll, container.selector).toBeLessThanOrEqual(container.client + 1);
  }
});

test('SC24 phone keeps the four common teaching actions and More directly visible', async ({ page }) => {
  await boot(page, PHONE);
  for (const locator of [
    '#sl', '#stagePlay', '#sceneControls [data-scene="overview"]',
    '#sceneControls [data-scene="titin_alone"]', '#stageMore',
  ]) await expect(page.locator(locator)).toBeVisible();
  await expect(page.locator('#sceneControls [data-scene="spring"]')).toBeHidden();
});

for (const viewport of [DESKTOP, PHONE]) {
  test(`SC24 story hide, Escape, focus, and same-chapter restoration at ${viewport.width}px`,
    async ({ page }) => {
      await boot(page, viewport);
      await page.locator('#chapterNext').click();
      await expect(page.locator('#chapterTitle')).toHaveText('Follow one giant molecule');

      await page.locator('#guidedCardToggle').click();
      await expect(page.locator('#guidedCard')).toBeHidden();
      await expect(page.locator('#storyReopen')).toBeFocused();
      await page.locator('#storyReopen').click();
      await expect(page.locator('#chapterTitle')).toBeFocused();
      await expect(page.locator('#chapterTitle')).toHaveText('Follow one giant molecule');

      await page.keyboard.press('Escape');
      await expect(page.locator('#guidedCard')).toBeHidden();
      await expect(page.locator('#storyReopen')).toBeFocused();
      await page.reload();
      await waitForReady(page);
      await expect(page.locator('#guidedCard')).toBeHidden();
      await expect(page.locator('#chapterTitle')).toHaveText('Follow one giant molecule');
      await page.setViewportSize(viewport.width === PHONE.width ? DESKTOP : PHONE);
      await expect(page.locator('#guidedCard')).toBeHidden();
    });
}

test('SC24 a shared link opens its story in a fresh browser session', async ({ browser, page }) => {
  await boot(page, PHONE);
  await page.locator('#guidedCardToggle').click();
  await expect(page.locator('#guidedCard')).toBeHidden();
  const sharedHash = new URL(page.url()).hash;
  await page.close();

  const fresh = await browser.newContext({ viewport: PHONE });
  const freshPage = await fresh.newPage();
  await freshPage.goto(`/index.html${sharedHash}`);
  await waitForReady(freshPage);
  await expect(freshPage.locator('#guidedCard')).toBeVisible();
  await fresh.close();
});

test('SC24 More is focus-trapped, dismissible, and restores its invoker', async ({ page }) => {
  await boot(page, PHONE);
  await page.locator('#stageMore').click();
  await expect(page.locator('#moreSheet')).toBeVisible();
  await expect(page.locator('#closeMore')).toBeFocused();
  await page.locator('#moreHelp').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#closeMore')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#moreHelp')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#moreBackdrop')).toBeHidden();
  await expect(page.locator('#stageMore')).toBeFocused();
  await expect(page.locator('#guidedCard')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#guidedCard')).toBeHidden();
});

test('SC24 scene truth, contextual layers, URL, and browser history agree', async ({ page }) => {
  await boot(page, DESKTOP);
  const lattice = page.locator('#sceneControls [data-scene="lattice"]');
  await lattice.click();
  await expect(lattice).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#sceneTruth')).toHaveText('Lattice');
  expect(new URL(page.url()).hash).toContain('scene=lattice');

  await page.locator('#sceneRingControls [data-scene-rings="2"]').click();
  await expect(page.locator('#sceneTruth')).toHaveText('Custom');
  await expect(lattice).toHaveAttribute('aria-pressed', 'false');
  let params = new URLSearchParams(new URL(page.url()).hash.slice(1));
  expect(params.has('scene')).toBe(false);
  expect(params.get('layers').split(',')).toContain('lattice_rings_2');
  await expect.poll(() => page.evaluate(
    () => window.titinVisualization.currentState().manifest.lattice.thick_drawn,
  )).toBe(19);

  await page.goBack();
  await expect(page.locator('#sceneTruth')).toHaveText('Lattice');
  await expect(page.locator('#sceneRingControls [data-scene-rings="1"]'))
    .toHaveAttribute('aria-pressed', 'true');
  await page.goForward();
  await expect(page.locator('#sceneTruth')).toHaveText('Custom');
  await expect(page.locator('#sceneRingControls [data-scene-rings="2"]'))
    .toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(
    () => window.titinVisualization.currentState().manifest.lattice.thick_drawn,
  )).toBe(19);

  await page.locator('#sceneMyosinToggle').click();
  params = new URLSearchParams(new URL(page.url()).hash.slice(1));
  expect(params.has('scene')).toBe(false);
  await expect(page.locator('#sceneTruth')).toHaveText('Custom');
  await expect.poll(() => page.evaluate(
    () => window.titinVisualization.currentState().manifest.context_detail,
  )).toBeNull();
});

test('SC24 object selection immediately makes scene truth and URL agree', async ({ page }) => {
  await boot(page, DESKTOP);
  await page.locator('#canvas').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#sceneTruth')).toHaveText('Custom');
  await expect(page.locator('#sceneControls [data-scene="overview"]'))
    .toHaveAttribute('aria-pressed', 'false');
  const params = new URLSearchParams(new URL(page.url()).hash.slice(1));
  expect(params.has('scene')).toBe(false);
  expect(params.get('target')).not.toBe('titin');
});

test('SC24 a fresh Custom lattice link restores its contextual controls', async ({ page }) => {
  await boot(page, DESKTOP,
    '#v=2&depth=learn&step=meet_sarcomere&sl=2200&drawer=closed'
      + '&camera=closeup.lattice&scale=context&target=none&context=1'
      + '&layers=extended_lattice%2Clattice_rings_2%2Cshow_context_detail%2Cshow_lattice'
      + '&confidence=0');
  await expect(page.locator('#sceneTruth')).toHaveText('Custom');
  // Desktop recovers the contextual controls inline; the phone route to the
  // same pair is covered by the Scene details sheet test below.
  await expect(page.locator('#sceneDetails')).toBeVisible();
  await expect(page.locator('#sceneMyosinToggle')).toBeVisible();
  await expect(page.locator('#sceneRingControls [data-scene-rings="2"]'))
    .toHaveAttribute('aria-pressed', 'true');
});

test('SC24 Story reopens visibly from Explore and returns to Learn', async ({ page }) => {
  await boot(page, DESKTOP);
  await page.locator('#guidedCardToggle').click();
  await page.locator('#audienceEvidence').click();
  await page.locator('#closeEvidence').click();
  await expect(page.locator('#app')).toHaveAttribute('data-mode', 'evidence');
  await expect(page.locator('#storyReopen')).toHaveAttribute('aria-expanded', 'false');
  await page.locator('#storyReopen').click();
  await expect(page.locator('#app')).toHaveAttribute('data-mode', 'guided');
  await expect(page.locator('#guidedCard')).toBeVisible();
  await expect(page.locator('#chapterTitle')).toBeFocused();
  expect(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('depth')).toBe('learn');
});

test('SC24 slider shows and describes the supported working range', async ({ page }) => {
  await boot(page, DESKTOP);
  const track = await page.locator('#sl').evaluate((slider) => ({
    start: getComputedStyle(slider).getPropertyValue('--supported-start').trim(),
    end: getComputedStyle(slider).getPropertyValue('--supported-end').trim(),
    background: getComputedStyle(slider).backgroundImage,
    description: document.querySelector('#supportedRangeDescription').textContent,
  }));
  expect(track.start).toBe('9.09%');
  expect(track.end).toBe('45.45%');
  expect(track.background).toContain('linear-gradient');
  expect(track.description).toContain('2000 to 2400 nanometres');
});

test('SC24 visible mechanics tables use human region, parameter, and compliance labels',
  async ({ page }) => {
    await boot(page, DESKTOP);
    await page.locator('#stageForceInfo').click();
    const labels = await page.locator('.force-contributions td:first-child, .force-parameters td:first-child')
      .allTextContents();
    expect(labels.length).toBeGreaterThan(4);
    expect(labels).toContain('Proximal tandem Ig (I-band)');
    expect(labels).toContain('Boltzmann constant');
    expect(labels.some((label) => /physical_constants|prox_Ig|extensible_straighten/.test(label)))
      .toBe(false);
    await expect(page.locator('#regions [data-region="prox_Ig"]'))
      .toHaveAttribute('title', /extends by folded-domain straightening/);
  });

test('SC24 relevant contextual controls are one interaction away on phone', async ({ page }) => {
  await boot(page, PHONE);
  for (const scene of ['architecture', 'a_band_scaffold', 'lattice']) {
    await page.locator('#stageMore').click();
    await page.locator(`#moreSceneControls [data-scene="${scene}"]`).click();
    await expect(page.locator('#sceneDetailsToggle')).toBeVisible();
    await page.locator('#sceneDetailsToggle').click();
    await expect(page.locator('#moreMyosinToggle')).toBeVisible();
    await expect(page.locator('#moreMyosinToggle')).toBeEnabled();
    if (scene === 'lattice') await expect(page.locator('#moreRingControls')).toBeVisible();
    else await expect(page.locator('#moreRingControls')).toBeHidden();
    await page.locator('#closeMore').click();
  }
});

test('SC24 exact legacy links migrate silently to canonical v2 state', async ({ page }) => {
  await boot(page, DESKTOP,
    '#mode=guided&step=architecture&sl=2317&scale=detail&camera=region.prox_Ig&target=titin_domains&evidence=0');
  await expect(page.locator('#chapterTitle')).toHaveText('See its molecular architecture');
  await expect(page.locator('#urlNotice')).toBeHidden();
  const params = new URLSearchParams(new URL(page.url()).hash.slice(1));
  expect(params.get('v')).toBe('2');
  expect(params.get('depth')).toBe('learn');
  expect(params.get('drawer')).toBe('closed');
  expect(params.get('step')).toBe('molecular_architecture');
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

test('SC24 coarse-pointer controls meet the 44px target floor', async ({ browser }) => {
  const context = await browser.newContext({ viewport: PHONE, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/index.html');
  await waitForReady(page);
  for (const selector of [
    '#stagePlay', '#stageMore', '#sceneControls [data-scene="overview"]', '#storyReopen',
  ]) {
    const box = await page.locator(selector).boundingBox();
    expect(box?.height, selector).toBeGreaterThanOrEqual(44);
  }
  await context.close();
});

test('SC24 the myosin detail control changes the model from every scene that offers it',
  async ({ page }) => {
    const errors = watchPageErrors(page);
    await boot(page, DESKTOP);
    for (const scene of ['lattice', 'architecture', 'a_band_scaffold']) {
      await page.locator(`#sceneControls [data-scene="${scene}"]`).click();
      await expect(page.locator('#sceneTruth')).toHaveText(SCENE_LABELS[scene]);
      await expect(page.locator('#sceneMyosinToggle')).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(() => page.evaluate(
        () => window.titinVisualization.currentState().manifest.context_detail,
      ), `${scene} must draw the detail layer first`).not.toBeNull();

      await page.locator('#sceneMyosinToggle').click();
      await expectLiveStage(page, errors);
      await expect(page.locator('#sceneMyosinToggle')).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('#sceneTruth')).toHaveText('Custom');
      const params = new URLSearchParams(new URL(page.url()).hash.slice(1));
      expect(params.has('scene'), `${scene} must serialize as Custom`).toBe(false);
      expect(params.get('layers').split(',')).not.toContain('show_context_detail');
      await expect.poll(() => page.evaluate(
        () => window.titinVisualization.currentState().manifest.context_detail,
      )).toBeNull();

      await page.locator('#sceneMyosinToggle').click();
      await expectLiveStage(page, errors);
      await expect(page.locator('#sceneTruth')).toHaveText(SCENE_LABELS[scene]);
    }
  });

test('SC24 a shared close-up link with the detail layer off restores it off', async ({ page }) => {
  const errors = watchPageErrors(page);
  await boot(page, DESKTOP);
  await page.locator('#sceneControls [data-scene="lattice"]').click();
  await page.locator('#sceneMyosinToggle').click();
  const shared = new URL(page.url()).hash;

  await boot(page, DESKTOP, shared);
  await expectLiveStage(page, errors);
  await expect(page.locator('#urlNotice')).toBeHidden();
  await expect(page.locator('#sceneMyosinToggle')).toHaveAttribute('aria-pressed', 'false');
  expect(new URL(page.url()).hash).toBe(shared);
  await expect.poll(() => page.evaluate(
    () => window.titinVisualization.currentState().manifest.context_detail,
  )).toBeNull();
});

test('SC24 the Explore drawer detail switches keep the stage alive on a close-up',
  async ({ page }) => {
    const errors = watchPageErrors(page);
    await boot(page, DESKTOP);
    await page.locator('#sceneControls [data-scene="z_anchor"]').click();
    await page.locator('#audienceEvidence').click();
    await page.locator('#tabInspect').click();
    await page.locator('#toggles [data-key="showContextDetail"]').click();
    await expectLiveStage(page, errors);
    expect(new URLSearchParams(new URL(page.url()).hash.slice(1))
      .get('layers').split(',')).not.toContain('show_context_detail');
  });

test('SC24 only a camera that actually moves makes the scene Custom', async ({ page }) => {
  const errors = watchPageErrors(page);
  await boot(page, DESKTOP);
  const box = await page.locator('#canvas canvas').boundingBox();
  await page.mouse.click(box.x + 14, box.y + 14);
  await expectLiveStage(page, errors);
  await expect(page.locator('#sceneTruth')).toHaveText('Overview');
  expect(new URL(page.url()).hash).toContain('scene=overview');
  expect(await page.locator('#objectAnnouncement').textContent())
    .not.toContain('Camera adjusted manually');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 45, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('#sceneTruth')).toHaveText('Custom');
  await expect(page.locator('#objectAnnouncement')).toContainText('Camera adjusted manually');
  expect(new URL(page.url()).hash).not.toContain('scene=overview');
});

test('SC24 Explore keeps truthful semantic scene state alongside confidence display',
  async ({ page }) => {
    await boot(page, DESKTOP);
    await page.locator('#audienceEvidence').click();
    await page.locator('#closeEvidence').click();
    await page.locator('#sceneControls [data-scene="lattice"]').click();
    await expect(page.locator('#sceneTruth')).toHaveText('Lattice');
    await expect(page.locator('#sceneControls [data-scene="lattice"]'))
      .toHaveAttribute('aria-pressed', 'true');
    const params = new URLSearchParams(new URL(page.url()).hash.slice(1));
    expect(params.get('depth')).toBe('explore');
    expect(params.get('scene')).toBe('lattice');
    expect(params.get('confidence')).toBe('1');
  });

test('SC24 scene detail controls are inline on desktop and a sheet action on a phone',
  async ({ page }) => {
    await boot(page, DESKTOP);
    await page.locator('#sceneControls [data-scene="lattice"]').click();
    await expect(page.locator('#sceneRingControls')).toBeVisible();
    await expect(page.locator('#sceneMyosinToggle')).toBeVisible();
    await expect(page.locator('#sceneDetailsToggle')).toBeHidden();

    await boot(page, PHONE);
    await page.locator('#stageMore').click();
    await page.locator('#moreSceneControls [data-scene="lattice"]').click();
    await expect(page.locator('#sceneDetails')).toBeHidden();
    await expect(page.locator('#sceneDetailsToggle')).toBeVisible();
  });

test('SC24 the phone bar states scene truth', async ({ page }) => {
  await boot(page, PHONE);
  await expect(page.locator('#sceneTruth')).toBeVisible();
  await expect(page.locator('#sceneTruth')).toHaveText('Overview');
  await page.locator('#stageMore').click();
  await page.locator('#moreSceneControls [data-scene="lattice"]').click();
  await expect(page.locator('#sceneTruth')).toHaveText('Lattice');
});
