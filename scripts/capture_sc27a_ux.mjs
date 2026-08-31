/** Capture the deterministic SC-27A software-composition audit and review frames. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

import { chromium } from 'playwright';
import { STAGE_LAYOUT } from '../src/presentation/StageLayout.js';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'evidence/ux/SC-27A/final');
const PORT = 4174;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
];
const RESEARCH_VIEWPORTS = VIEWPORTS.filter(({ width, height }) => (
  width >= 1024 && width > height
));
const COMPACT_HEIGHT_VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 390, height: 684 },
  { width: 360, height: 640 },
];
const TOUR_BEATS = Object.freeze([
  'meet_sarcomere', 'follow_titin', 'stretch_spring',
  'scaffold_thick_filament', 'knowledge_recap',
]);
const TOUR_SCENES = Object.freeze([
  'overview', 'titin_alone', 'spring', 'architecture',
  'z_anchor', 'a_band_scaffold', 'lattice',
]);
// Linear-RGB diagnostic matrices commonly used for software composition. These
// frames are review aids, not a substitute for human colour-vision review or a
// claim that the simulation reproduces any individual's perception.
const COLOR_VISION_DIAGNOSTICS = Object.freeze({
  protanopia: [
    0.567, 0.433, 0, 0, 0,
    0.558, 0.442, 0, 0, 0,
    0, 0.242, 0.758, 0, 0,
    0, 0, 0, 1, 0,
  ],
  deuteranopia: [
    0.625, 0.375, 0, 0, 0,
    0.7, 0.3, 0, 0, 0,
    0, 0.3, 0.7, 0, 0,
    0, 0, 0, 1, 0,
  ],
  tritanopia: [
    0.95, 0.05, 0, 0, 0,
    0, 0.433, 0.567, 0, 0,
    0, 0.475, 0.525, 0, 0,
    0, 0, 0, 1, 0,
  ],
});

mkdirSync(OUT, { recursive: true });

const server = spawn(process.execPath, ['scripts/serve_browser_tests.mjs', '--port', String(PORT)], {
  cwd: ROOT,
  stdio: 'ignore',
});

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
for (let attempt = 0; attempt < 80; attempt += 1) {
  try {
    const response = await fetch(`${ORIGIN}/healthz`);
    if (response.ok) break;
  } catch {}
  if (attempt === 79) throw new Error('SC-27A capture server did not become ready.');
  await delay(100);
}

const browser = await chromium.launch({ headless: true });
const captures = [];
const audits = [];
const overlayAudits = [];
const transitionAudits = [];

async function ready(page, url = ORIGIN) {
  const errors = [];
  const recordError = (error) => errors.push(error.message);
  page.on('pageerror', recordError);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__titinBoot?.ready === true);
    await page.waitForTimeout(250);
    if (errors.length) throw new Error(errors.join('\n'));
  } finally {
    page.off('pageerror', recordError);
  }
}

async function auditScienceLabels(page, state) {
  return page.evaluate(({ auditState, tolerance }) => {
    const canvas = document.querySelector('#canvas').getBoundingClientRect();
    const overlay = document.querySelector('#scienceOverlay');
    const hint = document.querySelector('#inspectHint');
    const hintRect = hint.hidden ? null : hint.getBoundingClientRect();
    const labels = [...overlay.querySelectorAll('text')].flatMap((node) => {
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return [];
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return [{
        text: node.textContent.trim(),
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
        covered: !hit || (!overlay.contains(hit) && hit.tagName !== 'CANVAS'),
      }];
    });
    const collisions = [];
    for (let i = 0; i < labels.length; i += 1) {
      for (let j = i + 1; j < labels.length; j += 1) {
        const a = labels[i];
        const b = labels[j];
        const overlapX = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
        const overlapY = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
        if (overlapX > tolerance && overlapY > tolerance) {
          collisions.push(`${a.text} ↔ ${b.text} (${overlapX.toFixed(1)}×${overlapY.toFixed(1)} px)`);
        }
      }
    }
    return {
      ...auditState,
      label_count: labels.length,
      label_layout: overlay.dataset.labelLayout,
      terminus_layout: overlay.dataset.terminusLayout,
      inspection_hint_layout: hint.dataset.overlayLayout,
      science_label_collisions: collisions,
      inspection_hint_label_collisions: hintRect ? labels.filter(({ rect }) => (
        rect.right > hintRect.left && rect.left < hintRect.right
        && rect.bottom > hintRect.top && rect.top < hintRect.bottom
      )).map(({ text }) => text) : [],
      covered_science_labels: labels.filter(({ covered }) => covered).map(({ text }) => text),
    };
  }, { auditState: state, tolerance: STAGE_LAYOUT.label_collision_tolerance_px });
}

async function capture(page, name, state) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path });
  captures.push({
    id: name,
    state,
    viewport: page.viewportSize(),
    device_scale_factor: await page.evaluate(() => devicePixelRatio),
    path: `evidence/ux/SC-27A/final/${name}.png`,
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
    reviewer_disposition: 'PENDING — human visual review not performed',
  });
}

async function composedGeometryDiagnostic(page) {
  const clip = await page.locator('#canvas').boundingBox();
  if (!clip) throw new Error('SC-27A geometry diagnostic: stage has no rendered box.');
  const live = await page.screenshot({ clip, animations: 'disabled' });
  await page.evaluate(() => {
    for (const node of document.querySelectorAll('#canvas > canvas, #scienceOverlay')) {
      node.dataset.sc27aPriorVisibility = node.style.visibility;
      node.style.visibility = 'hidden';
    }
  });
  await page.waitForTimeout(50);
  const flat = await page.screenshot({ clip, animations: 'disabled' });
  await page.evaluate(() => {
    for (const node of document.querySelectorAll('#canvas > canvas, #scienceOverlay')) {
      node.style.visibility = node.dataset.sc27aPriorVisibility || '';
      delete node.dataset.sc27aPriorVisibility;
    }
  });
  const result = await page.evaluate(async ({ liveBase64, flatBase64 }) => {
    const pixels = async (base64) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return {
        width: canvas.width,
        height: canvas.height,
        data: context.getImageData(0, 0, canvas.width, canvas.height).data,
      };
    };
    const [front, back] = await Promise.all([pixels(liveBase64), pixels(flatBase64)]);
    if (front.width !== back.width || front.height !== back.height) {
      throw new Error('geometry diagnostic screenshots have different dimensions');
    }
    const threshold = 12;
    let changed = 0;
    let minX = front.width;
    let minY = front.height;
    let maxX = -1;
    let maxY = -1;
    for (let index = 0; index < front.data.length; index += 4) {
      const differs = Math.max(
        Math.abs(front.data[index] - back.data[index]),
        Math.abs(front.data[index + 1] - back.data[index + 1]),
        Math.abs(front.data[index + 2] - back.data[index + 2]),
        Math.abs(front.data[index + 3] - back.data[index + 3]),
      ) >= threshold;
      if (!differs) continue;
      changed += 1;
      const pixel = index / 4;
      const x = pixel % front.width;
      const y = Math.floor(pixel / front.width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    const total = front.width * front.height;
    const boundsArea = changed
      ? (maxX - minX + 1) * (maxY - minY + 1) : 0;
    return {
      method: 'pixel difference between the composed stage and the same frame with WebGL geometry and scientific SVG overlay hidden',
      channel_difference_threshold_8bit: threshold,
      pixel_share: Number((changed / total).toFixed(4)),
      bounding_box_share: Number((boundsArea / total).toFixed(4)),
      changed_pixels: changed,
      total_pixels: total,
    };
  }, { liveBase64: live.toString('base64'), flatBase64: flat.toString('base64') });
  return result;
}

async function applyColorVisionDiagnostic(page, id, values) {
  await page.evaluate(({ filterId, matrix }) => {
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    Object.assign(svg.style, {
      position: 'fixed', width: '0', height: '0', overflow: 'hidden', pointerEvents: 'none',
    });
    const filter = document.createElementNS(namespace, 'filter');
    filter.id = `sc27a-${filterId}`;
    filter.setAttribute('color-interpolation-filters', 'linearRGB');
    const colorMatrix = document.createElementNS(namespace, 'feColorMatrix');
    colorMatrix.setAttribute('type', 'matrix');
    colorMatrix.setAttribute('values', matrix.join(' '));
    filter.append(colorMatrix);
    svg.append(filter);
    document.body.append(svg);
    document.documentElement.style.filter = `url(#${filter.id})`;
  }, { filterId: id, matrix: values });
  await page.waitForTimeout(100);
}

async function auditCold(page, viewport) {
  return page.evaluate(({ measuredViewport, tolerance }) => {
    const isVisible = (node) => {
      if (node.closest('#scienceOverlay, #objectTooltip, #objectLeader')) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden'
        && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0
        && rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight;
    };
    const controls = [...document.querySelectorAll(
      'button, input, select, textarea, a[href], [role="button"], [role="tab"]',
    )].filter(isVisible);
    const words = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || parent.closest('[hidden], .sr-only')) continue;
      const style = getComputedStyle(parent);
      const rect = parent.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden'
          || rect.width <= 0 || rect.height <= 0 || rect.right <= 0 || rect.bottom <= 0
          || rect.left >= innerWidth || rect.top >= innerHeight) continue;
      words.push(...(node.textContent.trim().match(/\S+/g) || []));
    }
    const box = (selector) => {
      const node = document.querySelector(selector);
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
        width: rect.width, height: rect.height,
      };
    };
    const collide = (a, b) => a.left < b.right && a.right > b.left
      && a.top < b.bottom && a.bottom > b.top;
    const story = document.querySelector('#guidedCardBody');
    const canvas = box('#canvas');
    const header = box('#stageHeader');
    const card = box('#guidedCard');
    const scienceLabels = [...document.querySelectorAll('#scienceOverlay text')]
      .map((node) => ({ text: node.textContent.trim(), rect: (() => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      })() })).filter(({ rect }) => rect.right > rect.left && rect.bottom > rect.top);
    const scienceLabelCollisions = [];
    for (let i = 0; i < scienceLabels.length; i += 1) {
      for (let j = i + 1; j < scienceLabels.length; j += 1) {
        const a = scienceLabels[i].rect;
        const b = scienceLabels[j].rect;
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapX > tolerance && overlapY > tolerance) {
          scienceLabelCollisions.push(`${scienceLabels[i].text} ↔ ${scienceLabels[j].text}`);
        }
      }
    }
    const chromeArea = header.width * header.height + card.width * card.height;
    return {
      viewport: measuredViewport,
      state_hash: location.hash,
      visible_chrome_count: controls.length,
      tabbable_chrome_count: controls.filter((node) => !node.disabled && node.tabIndex >= 0).length,
      visible_chrome_ids: controls.map((node) => node.id || node.getAttribute('aria-label')),
      visible_word_count: words.length,
      bounds: { header, story: card },
      overlap_findings: {
        header_story: collide(header, card),
        science_label_collisions: scienceLabelCollisions,
      },
      scroll: {
        document_width: document.documentElement.scrollWidth,
        viewport_width: innerWidth,
        document_horizontal_overflow: document.documentElement.scrollWidth - innerWidth,
        canvas_scroll_left: document.querySelector('#canvas').scrollLeft,
        story_scroll_height: story.scrollHeight,
        story_client_height: story.clientHeight,
      },
      unobscured_stage_area_share_diagnostic: Number(
        Math.max(0, 1 - chromeArea / (canvas.width * canvas.height)).toFixed(4),
      ),
      candidate_identity: window.__titinBuild,
    };
  }, { measuredViewport: viewport, tolerance: STAGE_LAYOUT.label_collision_tolerance_px });
}

try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport, reducedMotion: 'no-preference' });
    await ready(page);
    audits.push({
      ...await auditCold(page, viewport),
      composed_geometry_share_diagnostic: await composedGeometryDiagnostic(page),
    });
    await capture(page, `cold-${viewport.width}x${viewport.height}`, 'cold open');
    for (const beat of TOUR_BEATS) {
      for (const scene of TOUR_SCENES) {
        await ready(page, `${ORIGIN}/#v=2&depth=learn&step=${beat}`
          + `&sl=2200&drawer=closed&scene=${scene}&confidence=0`);
        overlayAudits.push(await auditScienceLabels(page, { viewport, beat, scene }));
      }
    }
    if (RESEARCH_VIEWPORTS.some((candidate) => (
      candidate.width === viewport.width && candidate.height === viewport.height
    ))) {
      for (const beat of TOUR_BEATS) {
        for (const scene of TOUR_SCENES) {
          await ready(page, `${ORIGIN}/#v=2&depth=explore&step=${beat}`
            + `&sl=2200&drawer=inspect&scene=${scene}&confidence=1`);
          overlayAudits.push(await auditScienceLabels(page, {
            surface: 'Research', viewport, beat, scene,
          }));
        }
      }
    }
    await page.close();
  }

  for (const viewport of COMPACT_HEIGHT_VIEWPORTS) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    for (const beat of TOUR_BEATS) {
      await ready(page, `${ORIGIN}/#v=2&depth=learn&step=${beat}`
        + '&sl=2200&drawer=closed&scene=overview&confidence=0');
      overlayAudits.push(await auditScienceLabels(page, {
        surface: 'Tour compact-height', viewport, beat, scene: 'overview',
      }));
    }
    await page.close();
  }

  for (const [portrait, landscape] of [
    [{ width: 768, height: 1024 }, { width: 1024, height: 768 }],
    [{ width: 375, height: 812 }, { width: 1280, height: 720 }],
  ]) {
    const page = await browser.newPage({ viewport: portrait, reducedMotion: 'reduce' });
    await ready(page);
    await page.locator('#audienceEvidence').click();
    await page.waitForFunction(() => (
      document.querySelector('#scienceOverlay').dataset.labelLayout === 'hidden'
    ));
    const observe = () => page.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      canvas_inert: document.querySelector('#canvas').inert,
      canvas_visibility: getComputedStyle(document.querySelector('#canvas')).visibility,
      label_layout: document.querySelector('#scienceOverlay').dataset.labelLayout,
      terminus_layout: document.querySelector('#scienceOverlay').dataset.terminusLayout,
      hint_layout: document.querySelector('#inspectHint').dataset.overlayLayout,
    }));
    const states = [await observe()];
    await page.setViewportSize(landscape);
    await page.waitForFunction(() => (
      document.querySelector('#scienceOverlay').dataset.labelLayout === 'resolved'
    ));
    states.push(await observe());
    await page.setViewportSize(portrait);
    await page.waitForFunction(() => (
      document.querySelector('#scienceOverlay').dataset.labelLayout === 'hidden'
    ));
    states.push(await observe());
    transitionAudits.push({ kind: 'Research viewport round-trip', portrait, landscape, states });
    await page.close();
  }

  const historyPage = await browser.newPage({
    viewport: { width: 375, height: 812 }, reducedMotion: 'reduce',
  });
  await ready(historyPage, `${ORIGIN}/#v=2&depth=learn&step=scaffold_thick_filament`
    + '&sl=2200&drawer=closed&scene=overview&confidence=0');
  await historyPage.locator('#chapterNext').click();
  await historyPage.waitForFunction(() => (
    document.querySelector('#chapterProgress').textContent.trim() === 'Beat 5 of 5'
    && document.querySelector('#scienceOverlay').dataset.labelLayout === 'resolved'
  ));
  const observeHistory = () => historyPage.evaluate(() => ({
    progress: document.querySelector('#chapterProgress').textContent,
    scene: document.querySelector('#sceneTruth').textContent,
    label_layout: document.querySelector('#scienceOverlay').dataset.labelLayout,
    terminus_layout: document.querySelector('#scienceOverlay').dataset.terminusLayout,
    hint_layout: document.querySelector('#inspectHint').dataset.overlayLayout,
  }));
  const historyStates = [await observeHistory()];
  await historyPage.goBack();
  await historyPage.waitForFunction(() => (
    document.querySelector('#chapterProgress').textContent.trim() === 'Beat 4 of 5'
    && document.querySelector('#sceneTruth').textContent.trim() === 'Overview'
    && document.querySelector('#scienceOverlay').dataset.labelLayout === 'resolved'
  ));
  historyStates.push(await observeHistory());
  await historyPage.goForward();
  await historyPage.waitForFunction(() => (
    document.querySelector('#chapterProgress').textContent.trim() === 'Beat 5 of 5'
    && document.querySelector('#scienceOverlay').dataset.labelLayout === 'resolved'
  ));
  historyStates.push(await observeHistory());
  transitionAudits.push({ kind: 'mobile beat 4/overview history round-trip', states: historyStates });
  await historyPage.close();

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await ready(page);
  for (let beat = 1; beat <= 5; beat += 1) {
    await capture(page, `beat-${beat}-1280x720`, `Tour beat ${beat}`);
    if (beat < 5) await page.locator('#chapterNext').click();
  }
  await page.locator('#chapterPrevious').click();
  await page.locator('#chapterPrevious').click();
  await page.locator('#sl').fill('2400');
  await capture(page, 'beat-3-stretched-1280x720', 'Tour beat 3 at 2,400 nm');
  await page.locator('#chapterPrevious').click();
  await page.locator('#chapterPrevious').click();
  const titinHit = page.locator('#scienceOverlay [aria-label="Inspect Titin"]');
  await titinHit.focus();
  await titinHit.press('Enter');
  await capture(page, 'selected-titin-1280x720', 'selected-object explanation');
  await page.locator('#objectInspectorDetailLink').click();
  await capture(page, 'research-evidence-1280x720', 'Research Evidence, selected titin');
  for (const [tab, id] of [['#tabInspect', 'inspect'], ['#tabMeasure', 'measure'], ['#tabSources', 'sources-build']]) {
    await page.locator(tab).click();
    await capture(page, `research-${id}-1280x720`, `Research ${id}`);
  }
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await ready(mobile);
  await mobile.locator('#audienceEvidence').click();
  await capture(mobile, 'research-inspect-375x812', 'mobile Research Inspect');
  await mobile.close();

  const zoomContext = await browser.newContext({
    viewport: { width: 640, height: 360 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const zoom = await zoomContext.newPage();
  await ready(zoom);
  await zoom.locator('#chapterNext').scrollIntoViewIfNeeded();
  await capture(
    zoom,
    'cold-200-percent-1280x720',
    'cold open in a 640x360 CSS viewport at device scale 2, equivalent to 200% browser zoom on 1280x720',
  );
  await zoomContext.close();

  const reduced = await browser.newPage({
    viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce',
  });
  await ready(reduced);
  await capture(reduced, 'cold-reduced-motion-1280x720', 'cold open, reduced motion');
  await reduced.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; });
  await capture(reduced, 'cold-grayscale-1280x720', 'cold open, grayscale diagnostic');
  await reduced.close();

  for (const [id, matrix] of Object.entries(COLOR_VISION_DIAGNOSTICS)) {
    const diagnostic = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await ready(diagnostic);
    await applyColorVisionDiagnostic(diagnostic, id, matrix);
    await capture(
      diagnostic,
      `cold-${id}-1280x720`,
      `cold open, ${id} software-composition diagnostic`,
    );
    await diagnostic.close();
  }

  const projector = await browser.newPage({ viewport: { width: 1536, height: 864 } });
  await ready(projector);
  await capture(projector, 'cold-projector-1536x864', 'projector software composition');
  await projector.close();

  const renderStyle = JSON.parse(readFileSync(
    resolve(ROOT, 'data/render_style.json'), 'utf8',
  ));
  const theme = renderStyle.presentation;
  const capturesByHash = new Map();
  for (const entry of captures) {
    const siblings = capturesByHash.get(entry.sha256) || [];
    siblings.push(entry);
    capturesByHash.set(entry.sha256, siblings);
  }
  const duplicateCaptures = [...capturesByHash.values()].filter((entries) => entries.length > 1);
  if (duplicateCaptures.length) {
    throw new Error(`SC-27A capture pack contains duplicate observations: ${duplicateCaptures
      .map((entries) => entries.map((entry) => entry.id).join(' = ')).join('; ')}`);
  }
  const overlapFailures = audits.filter((entry) => (
    entry.overlap_findings.header_story
    || entry.overlap_findings.science_label_collisions.length
  ));
  if (overlapFailures.length) {
    throw new Error(`SC-27A capture audit found stage collisions: ${overlapFailures
      .map((entry) => `${entry.viewport.width}x${entry.viewport.height} `
        + JSON.stringify(entry.overlap_findings)).join('; ')}`);
  }
  const overlayFailures = overlayAudits.filter((entry) => (
    !(
      (entry.label_layout === 'resolved' && entry.terminus_layout === 'resolved')
      || (entry.surface === 'Tour compact-height'
        && entry.label_layout === 'suppressed:compact-stage'
        && entry.terminus_layout === 'suppressed:compact-stage'
        && entry.label_count === 0)
    )
    || entry.inspection_hint_layout !== 'resolved'
    || entry.science_label_collisions.length
    || entry.inspection_hint_label_collisions.length
    || entry.covered_science_labels.length
  ));
  if (overlayFailures.length) {
    throw new Error(`SC-27A overlay matrix found label failures: ${overlayFailures
      .map((entry) => `${entry.viewport.width}x${entry.viewport.height} ${entry.beat}/${entry.scene} `
        + JSON.stringify({
          layout: entry.label_layout,
          terminus_layout: entry.terminus_layout,
          hint_layout: entry.inspection_hint_layout,
          collisions: entry.science_label_collisions,
          hint_collisions: entry.inspection_hint_label_collisions,
          covered: entry.covered_science_labels,
        })).join('; ')}`);
  }
  const transitionFailures = transitionAudits.filter((entry) => {
    if (entry.kind === 'Research viewport round-trip') {
      const [portraitBefore, landscape, portraitAfter] = entry.states;
      const hidden = (state) => state.canvas_inert && state.canvas_visibility === 'hidden'
        && state.label_layout === 'hidden' && state.terminus_layout === 'hidden'
        && state.hint_layout === 'hidden';
      const visible = (state) => !state.canvas_inert && state.canvas_visibility === 'visible'
        && state.label_layout === 'resolved' && state.terminus_layout === 'resolved'
        && state.hint_layout === 'resolved';
      return !hidden(portraitBefore) || !visible(landscape) || !hidden(portraitAfter);
    }
    const [beatFiveBefore, beatFour, beatFiveAfter] = entry.states;
    const resolved = (state) => state.label_layout === 'resolved'
      && state.terminus_layout === 'resolved' && state.hint_layout === 'resolved';
    return !resolved(beatFiveBefore) || !resolved(beatFour) || !resolved(beatFiveAfter)
      || beatFour.progress.trim() !== 'Beat 4 of 5' || beatFour.scene.trim() !== 'Overview';
  });
  if (transitionFailures.length) {
    throw new Error(`SC-27A transition audit failed: ${JSON.stringify(transitionFailures)}`);
  }
  const audit = {
    schema: 'sc27a-ux-audit/1',
    purpose: 'Automated diagnostics only; this record does not claim human comprehension or visual quality.',
    candidate_identity: audits[0].candidate_identity,
    viewports: audits,
    overlay_label_matrix: {
      scope: 'Every Tour beat × scene × release viewport; every visible desktop Research beat × scene; and every Tour beat at three compact phone heights in Chromium.',
      collision_tolerance_px: STAGE_LAYOUT.label_collision_tolerance_px,
      state_count: overlayAudits.length,
      states: overlayAudits,
    },
    transition_audits: transitionAudits,
    declared_contrast_results: theme.declared_contrast_ratios,
    presentation_titin_emphasis: {
      ...theme.titin_emphasis,
      live_trace_px: renderStyle.titin.trace_px,
      live_halo_radius_scale: renderStyle.titin.halo_radius_scale,
      live_halo_opacity: renderStyle.titin.halo_opacity,
      evidence_opacity_unchanged: true,
      historical_sc25_audit_note: 'SC-25 remains pinned to its reviewed 0.20 halo; this SC-27A presentation candidate uses the live declaration above.',
    },
    color_vision_diagnostics: {
      kind: 'linear-RGB software-composition matrices',
      matrices: COLOR_VISION_DIAGNOSTICS,
      limitation: 'Diagnostic review aids only; no human colour-vision review is claimed.',
    },
    capture_count: captures.length,
    captures,
    human_review_status: 'PENDING',
  };
  writeFileSync(resolve(OUT, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
  console.log(`SC-27A UX audit wrote ${captures.length} captures and ${audits.length} viewport records.`);
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
