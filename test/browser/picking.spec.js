import { readFileSync } from 'node:fs';

import { test, expect } from '@playwright/test';

import { failOnPageErrors, waitForReady } from './helpers.js';

failOnPageErrors(test);

const grid = JSON.parse(readFileSync(
  new URL('../fixtures/picking_hit_grid.json', import.meta.url), 'utf8',
));

const LAPTOP = { width: 1280, height: 720 };
const PHONE = { width: 375, height: 812 };
const RELEASE_VIEWPORTS = [
  { id: 'projector', width: 1920, height: 1080 },
  { id: 'desktop', width: 1440, height: 900 },
  LAPTOP,
  { id: 'phone_large', width: 390, height: 844 },
  PHONE,
];

async function boot(page, viewport, hash = '') {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`/index.html${hash}`);
  await waitForReady(page);
}

/**
 * Re-derive the fixture's kept offsets in the running page, and run one pick per
 * declared sample.
 *
 * Everything the fixture stores is a rule input; the pixel positions are computed
 * here, in the page, from the render that is actually on screen. That is the
 * point of the split: a fixture of coordinates would pass forever after any
 * regression in where titin is drawn.
 */
const measureScene = ({ rules, ringSamples: rings, offsets }) => {
  const viz = window.titinVisualization;
  const canvas = document.querySelector('#canvas');
  const rect = canvas.getBoundingClientRect();
  const paths = viz.titinPickPaths().paths;
  const derived = [];
  const pointFor = new Map();
  for (const path of paths) {
    const cumulative = [0];
    for (let i = 1; i < path.points.length; i += 1) {
      const a = path.points[i - 1];
      const b = path.points[i];
      cumulative.push(cumulative[i - 1] + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
    }
    const total = cumulative.at(-1);
    const stops = [];
    for (let s = 0; s < total; s += rules.path_sample_spacing_nm) stops.push(s);
    const records = stops.map((offset) => {
      let index = 1;
      while (index < cumulative.length - 1 && cumulative[index] < offset) index += 1;
      const span = cumulative[index] - cumulative[index - 1];
      const t = span > 0 ? (offset - cumulative[index - 1]) / span : 0;
      const a = path.points[index - 1];
      const b = path.points[index];
      return {
        id: `${path.region_id}@${offset}`,
        offset,
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
      };
    });
    const projected = viz.projectPresentationAnchors(records);
    for (let i = 0; i < records.length; i += 1) {
      const point = projected[i];
      const inside = point.visible
        && point.x_px >= rules.edge_margin_px
        && point.y_px >= rules.edge_margin_px
        && point.x_px <= rect.width - rules.edge_margin_px
        && point.y_px <= rect.height - rules.edge_margin_px;
      if (!inside) continue;
      derived.push([path.region_id, records[i].offset]);
      pointFor.set(`${path.region_id}@${records[i].offset}`, point);
    }
  }

  const results = [];
  for (const [pathId, offset] of offsets) {
    const point = pointFor.get(`${pathId}@${offset}`);
    if (!point) { results.push({ path_id: pathId, offset, missing: true }); continue; }
    for (const ring of rings) {
      const radians = (ring.direction_deg * Math.PI) / 180;
      const x = rect.left + point.x_px + Math.cos(radians) * ring.ring_px;
      const y = rect.top + point.y_px + Math.sin(radians) * ring.ring_px;
      const picked = viz.pickObject(x, y, { emphasis: 'titin' });
      // The grid measures the RESOLVER, so it addresses the canvas directly. What
      // a finger would actually reach also depends on the stage chrome, so each
      // sample records whether an overlay is over it — reported as a coverage
      // caveat rather than silently folded into the hit rate.
      const over = document.elementFromPoint(x, y);
      results.push({
        path_id: pathId,
        offset,
        ring_px: ring.ring_px,
        intended: ring.intended_titin_hit,
        target_type: picked?.target_type ?? null,
        target_id: picked?.target_id ?? null,
        reason: picked?.pick_reason ?? null,
        under_chrome: Boolean(over && over.tagName !== 'CANVAS'),
      });
    }
  }
  return { derived, results };
};

/**
 * A point on the drawn titin route that a finger or cursor can actually reach.
 *
 * The story card owns a large part of the stage, so "the middle of this region"
 * is not necessarily addressable. Scanning for the first sample the stage chrome
 * is not over is both realistic — a reader taps what they can see — and stable,
 * where hiding the story would re-frame the camera underneath the coordinate the
 * test had just computed.
 */
async function reachableTitinPoint(page, regionId) {
  return page.evaluate((region) => {
    const viz = window.titinVisualization;
    const rect = document.querySelector('#canvas').getBoundingClientRect();
    const path = viz.titinPickPaths().paths.find((row) => row.region_id === region);
    if (!path) return null;
    const projected = viz.projectPresentationAnchors(
      path.points.map((point, index) => ({ id: `${region}:${index}`, ...point })),
    );
    for (const point of projected) {
      if (!point.visible) continue;
      const x = rect.left + point.x_px;
      const y = rect.top + point.y_px;
      const over = document.elementFromPoint(x, y);
      if (!over || over.tagName !== 'CANVAS') continue;
      if (!viz.pickObject(x, y, { emphasis: 'titin' })) continue;
      return { x, y };
    }
    return null;
  }, regionId);
}

test('SC25 the committed hit grid reproduces, and titin wins its intended samples', async ({ page }) => {
  // 7.5k raycasts across fourteen scene cells; the default per-test budget is for
  // interaction tests, not for a coverage grid.
  test.setTimeout(15 * 60 * 1000);
  const perScene = [];
  const perRing = new Map();
  let intended = 0;
  let resolved = 0;
  let exactRegion = 0;
  let underChrome = 0;
  const misses = [];

  for (const scene of grid.scenes) {
    await boot(page, scene.viewport, scene.url_hash);
    // The fixture declares a Learn scene; the page must actually be in it, or the
    // grid would be measuring some other state's geometry.
    await expect(page.locator('#sceneTruth')).toContainText(scene.scene_label);
    const measured = await page.evaluate(measureScene, {
      rules: grid.rules,
      ringSamples: grid.ring_samples,
      offsets: scene.path_offsets,
    });
    // Immutability: the page's own projection must still produce exactly the
    // offsets the fixture was generated from.
    expect(measured.derived, `${scene.id} offsets drifted from the committed fixture`)
      .toEqual(scene.path_offsets);

    let sceneIntended = 0;
    let sceneResolved = 0;
    for (const row of measured.results) {
      expect(row.missing, `${scene.id} lost offset ${row.path_id}@${row.offset}`).toBeFalsy();
      if (!row.intended) {
        // A probe outside the tolerance may resolve to anything, but never below
        // the reviewed order: a proxy must not win where a surface is drawn.
        if (row.reason === 'pick_proxy_only') {
          expect(row.target_type, `${scene.id} proxy-only probe resolved a non-titin target`)
            .toBe('titin_region');
        }
        continue;
      }
      intended += 1;
      sceneIntended += 1;
      if (row.under_chrome) underChrome += 1;
      const ring = perRing.get(row.ring_px) || { intended: 0, resolved: 0 };
      ring.intended += 1;
      if (row.target_type === 'titin_region') {
        resolved += 1;
        sceneResolved += 1;
        ring.resolved += 1;
        if (row.target_id === row.path_id) exactRegion += 1;
      } else {
        misses.push({ scene: scene.id, ...row });
      }
      perRing.set(row.ring_px, ring);
    }
    perScene.push({
      id: scene.id,
      intended: sceneIntended,
      resolved: sceneResolved,
      rate: sceneIntended ? sceneResolved / sceneIntended : 1,
    });
  }

  // Reported per scene, per ring, and in aggregate — the denominator is every
  // intended sample in the complete fixture, with no scene or ring excluded.
  const report = {
    aggregate: {
      intended,
      resolved,
      rate: Number((resolved / intended).toFixed(4)),
      exact_region_rate: Number((exactRegion / intended).toFixed(4)),
      // Not a miss: the resolver answered correctly. It records how much of the
      // route a pointer could not reach without first moving the story surface.
      intended_under_stage_chrome: underChrome,
    },
    per_ring: [...perRing.entries()].sort((a, b) => a[0] - b[0]).map(([ring, row]) => ({
      ring_px: ring, ...row, rate: Number((row.resolved / row.intended).toFixed(4)),
    })),
    per_scene: perScene.map((row) => ({ ...row, rate: Number(row.rate.toFixed(4)) })),
    missed_dispositions: misses.reduce((counts, miss) => {
      const key = `${miss.target_id ?? 'nothing'}/${miss.reason ?? 'no_target'}`;
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {}),
  };
  console.log(`SC25 hit-grid coverage: ${JSON.stringify(report, null, 2)}`);

  expect(intended).toBe(grid.totals.intended);
  expect(report.aggregate.rate).toBeGreaterThanOrEqual(0.95);
  // A miss must be an honest alternative — the nearest drawn surface at that
  // pixel — never a lower clause of the reviewed order and never nothing at all
  // while a target was available.
  for (const miss of misses) {
    expect(miss.reason, `${miss.scene} ${miss.path_id}@${miss.offset} ring ${miss.ring_px}`)
      .toBe('nearest_visible_surface');
  }
});

test('SC25 hit proxies answer rays and are absent from the render', async ({ page }) => {
  await boot(page, LAPTOP);
  const audit = await page.evaluate(() => {
    const viz = window.titinVisualization;
    const layer = viz.model.spec.renderStyle.titin.picking.pick_proxy_layer;
    let proxies = 0;
    let renderable = 0;
    const bounds = { before: null, after: null };
    viz.viewer.sarcomere.root.traverse((object) => {
      if (!object.userData?.pick_proxy) return;
      proxies += 1;
      if (object.layers.isEnabled(0)) renderable += 1;
    });
    const info = viz.viewer.renderer.info.render;
    bounds.before = viz.viewer.visibleWidthNm();
    return {
      proxies,
      renderable,
      cameraLayerMask: viz.viewer.camera.layers.mask,
      raycasterSeesProxyLayer: viz.viewer.raycaster.layers.isEnabled(layer),
      drawCalls: info.calls,
      viewSpanNm: bounds.before,
    };
  });
  expect(audit.proxies).toBeGreaterThan(0);
  expect(audit.renderable).toBe(0);
  // The camera's mask is layer 0 only: a proxy cannot reach a frame, a screenshot,
  // or the framing bounds derived from what is drawn.
  expect(audit.cameraLayerMask).toBe(1);
  expect(audit.raycasterSeesProxyLayer).toBe(true);
  expect(audit.drawCalls).toBeGreaterThan(0);
});

test('SC25 a real tap on titin pins its explanation through the pointer path', async ({ page }) => {
  await boot(page, LAPTOP);
  const at = await reachableTitinPoint(page, 'PEVK');
  expect(at, 'the PEVK spring must be reachable on the open stage').not.toBeNull();
  await page.mouse.click(at.x, at.y);
  await expect(page.locator('#objectInspector')).toBeVisible();
  await expect(page.locator('#objectAnnouncement')).toContainText('PEVK');
  // Clicking empty background clears rather than keeping a sticky selection.
  await page.mouse.click(30, 500);
  await expect(page.locator('#objectInspector')).toBeHidden();
});

test('SC25 the one-time invitation appears, is spent by inspecting, and stays gone', async ({ page }) => {
  // Each test gets a fresh browser context, so this page has never been visited
  // and the one-time flag has never been written. That is the state the assertion
  // is about; the reload at the end is what proves the flag then sticks.
  await boot(page, LAPTOP);
  await expect(page.locator('#inspectHint')).toBeVisible();
  await expect(page.locator('#inspectHintText'))
    .toHaveText('Click or tap a structure to explain it');
  // The pulse is colour only: evidence opacity is the confidence channel.
  const opacities = await page.evaluate(() => {
    const values = new Set();
    window.titinVisualization.viewer.sarcomere.root.traverse((object) => {
      if (object.userData?.titin_region) values.add(object.material.opacity);
    });
    return [...values].sort();
  });
  await page.locator('#stageLegend button[data-component="titin"]').click();
  await expect(page.locator('#inspectHint')).toBeHidden();
  const after = await page.evaluate(() => {
    const values = new Set();
    window.titinVisualization.viewer.sarcomere.root.traverse((object) => {
      if (object.userData?.titin_region) values.add(object.material.opacity);
    });
    return [...values].sort();
  });
  expect(after, 'the pulse must leave every evidence opacity where it found it')
    .toEqual(opacities);
  await page.reload();
  await waitForReady(page);
  await expect(page.locator('#inspectHint')).toBeHidden();
});

test('SC25 reduced motion gets the same invitation without a pulse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await boot(page, LAPTOP);
  await expect(page.locator('#inspectHint')).toBeVisible();
  const animation = await page.locator('#inspectHint')
    .evaluate((node) => getComputedStyle(node).animationName);
  expect(animation).toBe('none');
  // A single steady emphasis rather than a repeating one: sampled twice, the
  // identity colour must not have moved.
  const first = await page.evaluate(() => {
    const colours = new Set();
    window.titinVisualization.viewer.sarcomere.root.traverse((object) => {
      if (object.userData?.titin_region) colours.add(object.material.color.getHexString());
    });
    return [...colours];
  });
  await page.waitForTimeout(700);
  const second = await page.evaluate(() => {
    const colours = new Set();
    window.titinVisualization.viewer.sarcomere.root.traverse((object) => {
      if (object.userData?.titin_region) colours.add(object.material.color.getHexString());
    });
    return [...colours];
  });
  expect(second).toEqual(first);
});

test('SC25 direct labels and legend entries are operable by pointer and keyboard', async ({ page }) => {
  await boot(page, LAPTOP);
  const labels = page.locator('#scienceOverlay .label-hit');
  expect(await labels.count()).toBeGreaterThan(0);
  // Keyboard: focus the label and press Enter.
  await labels.first().evaluate((node) => {
    node.focus();
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  await expect(page.locator('#objectInspector')).toBeVisible();
  const firstLabel = await labels.first().getAttribute('aria-label');
  expect(firstLabel).toMatch(/^Inspect /);

  // Pointer: the stage colour key selects the same way.
  const legendButtons = page.locator('#stageLegend button.key');
  expect(await legendButtons.count()).toBeGreaterThan(0);
  await legendButtons.nth(1).click();
  await expect(page.locator('#objectInspector')).toBeVisible();
  // Coarse-pointer target floor for the label hit areas.
  const box = await labels.first().boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(28);
});

test('SC25 a touch tap selects titin and its legend on a phone', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: PHONE, hasTouch: true, isMobile: true, deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto('/index.html');
  await waitForReady(page);
  const at = await reachableTitinPoint(page, 'Aband_super');
  expect(at, 'the A-band segment must be tappable at 375 px').not.toBeNull();
  await page.touchscreen.tap(at.x, at.y);
  await expect(page.locator('#objectAnnouncement')).toContainText('A-band');
  await expect(page.locator('#inspectHint')).toBeHidden();
  await context.close();
});

test('SC25 the pinned explanation never lands on the primary controls', async ({ page }) => {
  for (const viewport of RELEASE_VIEWPORTS) {
    await boot(page, viewport);
    await page.locator('#stageLegend button[data-component="titin"]').click();
    await expect(page.locator('#objectInspector')).toBeVisible();
    const overlap = await page.evaluate(() => {
      const card = document.getElementById('objectInspector').getBoundingClientRect();
      const hits = [];
      for (const id of ['stageHeader', 'stageBar']) {
        const node = document.getElementById(id);
        const rect = node.getBoundingClientRect();
        if (card.left < rect.right && card.right > rect.left
          && card.top < rect.bottom && card.bottom > rect.top) hits.push(id);
      }
      // The card must also stay inside the stage rather than clipping off it.
      const canvas = document.getElementById('canvas').getBoundingClientRect();
      return {
        hits,
        insideStage: card.left >= canvas.left - 1 && card.right <= canvas.right + 1
          && card.top >= canvas.top - 1 && card.bottom <= canvas.bottom + 1,
      };
    });
    expect(overlap.hits, `${viewport.width}x${viewport.height}`).toEqual([]);
    expect(overlap.insideStage, `${viewport.width}x${viewport.height}`).toBe(true);
  }
});

test('SC25 the cold open and the route chapters show a legible continuous titin', async ({ page }) => {
  for (const viewport of [LAPTOP, PHONE]) {
    for (const hash of ['', '#v=2&depth=learn&step=scaffold_thick_filament&sl=2200&drawer=closed&scene=a_band_scaffold&confidence=0',
      '#v=2&depth=learn&step=knowledge_recap&sl=2200&drawer=closed&scene=overview&confidence=0']) {
      await boot(page, viewport, hash);
      const read = await page.evaluate(() => {
        const viz = window.titinVisualization;
        const manifest = viz.currentState().manifest;
        const rect = document.querySelector('#canvas').getBoundingClientRect();
        const paths = viz.titinPickPaths().paths;
        const records = paths.flatMap((path) => path.points.map((point, index) => ({
          id: `${path.region_id}:${index}`, ...point,
        })));
        const projected = viz.projectPresentationAnchors(records).filter((point) => point.visible);
        const xs = projected.map((point) => point.x_px);
        const legend = [...document.querySelectorAll('#stageLegend .key')]
          .map((node) => node.textContent.trim());
        return {
          tracePx: manifest.titin_emphasis.trace_px,
          haloOpacity: manifest.titin_emphasis.halo_opacity,
          routeSpanFraction: xs.length ? (Math.max(...xs) - Math.min(...xs)) / rect.width : 0,
          visiblePoints: projected.length,
          legend,
        };
      });
      const where = `${viewport.width}x${viewport.height} ${hash || 'cold open'}`;
      // Titin is identified by name and colour in the very first frame.
      expect(read.legend, where).toContain('Titin');
      // A continuous route, not a hairline fragment: the drawn width is a
      // reviewed reading width and a real span of the stage carries it.
      expect(read.tracePx, where).toBeGreaterThanOrEqual(4.5);
      expect(read.haloOpacity, where).toBeGreaterThanOrEqual(0.2);
      expect(read.visiblePoints, where).toBeGreaterThan(20);
      expect(read.routeSpanFraction, where).toBeGreaterThan(0.3);
      // The primary teaching action is reachable without scrolling.
      await expect(page.locator('#stagePlay')).toBeVisible();
      await expect(page.locator('#sl')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
    }
  }
});
