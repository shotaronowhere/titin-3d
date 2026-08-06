/** SC-11 gates: the tour reaches the cameras it declares, and stage composition. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import {
  STAGE_LAYOUT, BRACKET_LANE_OFFSETS, bracketLaneY, inspectorPlacement,
  stagePxPerNm, scaleBar, scaleBarPlacement,
} from '../src/presentation/StageLayout.js';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { TitinVisualization, SCALES } from '../src/api/TitinVisualization.js';
import { COMPONENTS } from '../src/render/SarcomereScene.js';
import { Viewer, VIEWS, CLOSEUPS } from '../src/render/Viewer.js';
import { StoryController } from '../src/presentation/StoryController.js';

const model = await TitinModel.create(nodeReader());
const { min, max } = model.slRange();
// The second constructor argument is a RUNTIME CAPABILITY descriptor, not the
// model: StoryController deliberately knows nothing about geometry, and it
// throws if a chapter names a camera, scale or target the runtime cannot offer.
// Built here exactly as test/presentation.test.js and the page build it, so this
// file exercises the same controller the browser gets.
const story = new StoryController(model.spec.presentation, {
  views: Object.keys(VIEWS),
  closeups: Object.keys(CLOSEUPS),
  scales: Object.values(SCALES),
  targets: [...model.titinRegions().map((region) => region.id), ...Object.keys(COMPONENTS)],
  hiddenTargetsByScale: { [SCALES.detail]: TitinVisualization.DETAIL_HIDDEN },
  minLength: min,
  maxLength: max,
});

// `story.chapters` is an array property, not a method — assigned at StoryController:383.
test('SC11-0: a step-only hash adopts that chapter\'s declared camera', () => {
  for (const chapter of story.chapters) {
    const decoded = story.parse(`#mode=guided&step=${chapter.id}`);
    assert.equal(decoded.state.camera_preset, chapter.recommended_state.camera_preset,
      `step=${chapter.id} must frame ${chapter.id}, not whatever was on screen before`);
  }
});

test('SC11-0: an explicit camera still wins over the chapter default', () => {
  const decoded = story.parse('#mode=guided&step=anchors&camera=view.oblique');
  assert.equal(decoded.state.camera_preset, 'view.oblique');
});

// A close-up chapter that leaves the context-detail layer off renders the bare
// cylinder that src/index.template.html:1224 describes as "a rendering failure".
test('SC11-0: every close-up chapter enables its detail layer', () => {
  for (const chapter of story.chapters) {
    const scene = chapter.recommended_state;
    if (!scene.camera_preset.startsWith('closeup.')) continue;
    assert.equal(scene.visibility.show_context_detail, true,
      `chapter '${chapter.id}' frames a close-up; without context detail it shows a bare cylinder`);
  }
});

// A close-up chapter must be describable by a URL that survives a reload.
test('SC11-0: a close-up chapter round-trips through its own URL', () => {
  for (const chapter of story.chapters) {
    const scene = chapter.recommended_state;
    if (!scene.camera_preset.startsWith('closeup.')) continue;
    const hash = story.serialize(story.stateForChapter(chapter.id));
    assert.equal(story.parse(hash).state.camera_preset, scene.camera_preset);
  }
});

// ---------------------------------------------------------------------------
// Task 11.1 — stage composition arithmetic
// ---------------------------------------------------------------------------

test('SC11: the bracket lane hugs the model instead of the page header', () => {
  const projected = [
    { y_px: 500, visible: true },
    { y_px: 520, visible: true },
    { y_px: 40, visible: false },   // ignored: not visible
  ];
  const lane = bracketLaneY(projected, { canvasHeight: 900, safeTopPx: 80 });
  const lowestLane = lane + BRACKET_LANE_OFFSETS.marker;
  assert.ok(lowestLane < 500, 'every lane must sit above the model');
  assert.ok(lowestLane > 500 - 120, 'the lane must stay near the model, not at the top of the page');
  assert.ok(lane >= 80, 'the lane must not slide under the page header');
});

test('SC11: an off-screen model falls back to a deterministic lane', () => {
  const lane = bracketLaneY([], { canvasHeight: 900, safeTopPx: 80 });
  assert.equal(lane, 80 + STAGE_LAYOUT.bracket_lane_gap_px);
});

test('SC11: a model near the top clamps to the safe area instead of overlapping the header', () => {
  const lane = bracketLaneY([{ y_px: 90, visible: true }], { canvasHeight: 900, safeTopPx: 80 });
  assert.equal(lane, 80);
});

test('SC11: the inspector card never covers the object it explains', () => {
  const canvas = { width: 1440, height: 900 };
  const card = { width: 370, height: 380 };
  for (const x of [100, 400, 720, 1000, 1380]) {
    const placed = inspectorPlacement({
      anchor: { x_px: x, y_px: 450 }, card, canvas, safeTopPx: 80,
    });
    assert.equal(placed.overlaps_anchor, false, `card covers its anchor at x=${x}`);
    assert.ok(placed.left >= 8 && placed.left + card.width <= canvas.width - 8);
    assert.ok(placed.top >= 80 && placed.top + card.height <= canvas.height - 8);
  }
});

test('SC11: the card prefers the side away from the anchor', () => {
  const canvas = { width: 1440, height: 900 };
  const card = { width: 370, height: 200 };
  const left = inspectorPlacement({ anchor: { x_px: 1100, y_px: 400 }, card, canvas, safeTopPx: 60 });
  assert.equal(left.side, 'left');
  const right = inspectorPlacement({ anchor: { x_px: 300, y_px: 400 }, card, canvas, safeTopPx: 60 });
  assert.equal(right.side, 'right');
});

// ---------------------------------------------------------------------------
// Task 11.2 — framing margin and the region-focus standoff
// ---------------------------------------------------------------------------

/** focusSpan is arithmetic on the camera; exercise it without a WebGL context. */
function stubViewer(aspect = 1440 / 900) {
  const viewer = Object.create(Viewer.prototype);
  viewer.camera = new THREE.PerspectiveCamera(50, aspect, 1, 10000);
  viewer.controls = { target: new THREE.Vector3(), update() {} };
  viewer.prefersReducedMotion = true;
  viewer._moveCamera = function moveCamera(position, target) {
    this.camera.position.copy(position);
    this.controls.target.copy(target);
  };
  viewer._updateFrustum = () => {};
  return viewer;
}

test('SC11: a small region focus keeps a minimum readable span', () => {
  const viewer = stubViewer();
  const tiny = viewer.focusSpan(100, 106.8);          // N2A at ~6.8 nm
  assert.equal(tiny.min_span_applied, true);
  assert.ok(tiny.view_span_nm >= STAGE_LAYOUT.min_region_view_span_nm - 1,
    `view span ${tiny.view_span_nm} nm is too tight to read a region in context`);
});

test('SC11: a large span uses the tighter margin', () => {
  const viewer = stubViewer();
  const wide = viewer.focusSpan(0, 1100);
  assert.equal(wide.min_span_applied, false);
  const ratio = wide.view_span_nm / 1100;
  assert.ok(ratio > 1.05 && ratio < 1.2,
    `margin ratio ${ratio.toFixed(3)} should be near ${STAGE_LAYOUT.frame_margin_factor}`);
});

// ---------------------------------------------------------------------------
// Task 11.3 — brackets attached to the model, and reframing on mode switch
// ---------------------------------------------------------------------------

const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const builder = readFileSync(new URL('../scripts/build_standalone.mjs', import.meta.url), 'utf8');

test('SC11: the page derives the bracket lane from the model, not the header', () => {
  assert.match(page, /import \{[^}]*bracketLaneY[^}]*\} from '\.\/src\/presentation\/StageLayout\.js'/);
  assert.match(page, /bracketLaneY\(/);
  assert.ok(!/const laneY = Math\.min\(height \* 0\.32/.test(page),
    'the header-relative lane must be gone');
  assert.match(page, /BRACKET_LANE_OFFSETS/,
    'lane offsets must come from the module, not be restated in the page');
});

test('SC11: brackets drop a tick to the axis they measure', () => {
  assert.match(page, /bracket_drop_tick_px/);
});

test('SC11: changing audience mode reframes the camera', () => {
  assert.match(page, /function syncAudienceMode[\s\S]{0,600}applyCameraPreset\(/,
    'the canvas changes width on mode switch, so the framing must be recomputed');
});

test('SC11: every StageLayout binding the page imports is re-exported by the bundle', () => {
  const imported = page.match(/import \{([^}]*)\} from '\.\/src\/presentation\/StageLayout\.js'/);
  assert.ok(imported, 'the page must import StageLayout');
  for (const name of imported[1].split(',').map((part) => part.trim()).filter(Boolean)) {
    assert.ok(builder.includes(name),
      `scripts/build_standalone.mjs must re-export '${name}' or the standalone page breaks`);
  }
});

// ---------------------------------------------------------------------------
// Task 11.4 — overlay work on change, not on every frame
// ---------------------------------------------------------------------------

const viewerSource = readFileSync(new URL('../src/render/Viewer.js', import.meta.url), 'utf8');

/** Body of a top-level page function, from its declaration to its column-0 brace. */
function pageFunction(name) {
  const from = page.indexOf(`function ${name}(`);
  assert.ok(from > 0, `the page must declare ${name}`);
  const body = page.slice(from);
  return body.slice(0, body.indexOf('\n}\n') + 3);
}

test('SC11: overlay work is dirty-flagged, not run on every frame', () => {
  assert.match(page, /function markStageDirty\(\)/);
  // The per-frame callback must consult the flag before doing DOM measurement.
  assert.match(
    page,
    /\}, \(\{ camera_moving[\s\S]{0,200}if \(!stageDirty[\s\S]{0,200}renderScienceOverlay\(\); renderObjectOverlay\(\);/,
    'the frame callback must early-out when nothing changed',
  );
  assert.match(page, /window\.addEventListener\('resize', markStageDirty\)/,
    'a window resize moves every overlay and is not visible as camera motion');
});

test('SC11: every state change that can move an overlay marks the stage dirty', () => {
  // A missed call is invisible until an overlay is silently stale against the
  // frame it annotates, so the set is pinned here rather than left to review.
  for (const name of ['rebuild', 'applyChapter', 'setAudienceMode', 'selectRegion',
    'setPinnedSelection', 'clearPinnedSelection', 'showHoverPick']) {
    assert.ok(pageFunction(name).includes('markStageDirty()'),
      `${name} changes what the overlays draw and must mark the stage dirty`);
  }
});

test('SC11: the viewer reports camera motion so overlays keep up while it moves', () => {
  assert.match(viewerSource, /onFrame\(\{ camera_moving:/,
    'the frame callback needs to know the camera moved, not guess');
  assert.match(viewerSource, /this\.controls\.addEventListener\('change', this\._onControlChange\)/,
    'OrbitControls fires change for direct input and for damped settling');
  assert.match(viewerSource, /this\.controls\.removeEventListener\('change', this\._onControlChange\)/,
    'a listener added in the constructor must come off in dispose()');
});

// ---------------------------------------------------------------------------
// Task 11.4a — a scale bar, because every number here is in nanometres
// ---------------------------------------------------------------------------

const annotations = JSON.parse(
  readFileSync(new URL('../data/annotations.json', import.meta.url), 'utf8'),
);

test('SC11-4a: the bar picks a round span that fits the budget', () => {
  for (const pxPerNm of [0.05, 0.3, 1.07, 4.2, 17, 120]) {
    const bar = scaleBar(pxPerNm, 160);
    assert.ok(bar.px > 0 && bar.px <= 160, 'the bar must fit its pixel budget');
    assert.ok(bar.px >= 40, 'a bar under 40 px cannot be read');
    // 1-2-5 sequence across decades: the span is always a number a viewer can hold.
    const mantissa = bar.nm / 10 ** Math.floor(Math.log10(bar.nm));
    assert.ok([1, 2, 5].includes(Math.round(mantissa * 1e6) / 1e6),
      `${bar.nm} nm is not a 1-2-5 round number`);
    assert.ok(Math.abs(bar.px - bar.nm * pxPerNm) < 1e-6,
      'the drawn length must equal the labelled span, not approximate it');
  }
});

test('SC11-4a: the label switches unit without changing the measurement', () => {
  assert.match(scaleBar(0.02, 160).label, /µm$/);   // wide field
  assert.match(scaleBar(20, 160).label, /nm$/);     // molecular close-up
});

test('SC11-4a: a scale that cannot be measured is refused, not drawn', () => {
  // A ruler that states a wrong number is worse than no ruler, so bad inputs
  // throw here rather than producing a plausible-looking bar.
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.throws(() => scaleBar(bad, 160), /positive finite/);
    assert.throws(() => scaleBar(1, bad), /positive finite/);
  }
});

test('SC11-4a: the stage scale is a property of the camera, not of the scene', () => {
  // The regression this pins. A first implementation measured how far apart two
  // model points landed on screen. That measures the length of an interval's
  // IMAGE, which collapses as the interval turns toward the camera: down the
  // filament axis it labelled a 96 px rule '50000000000000 um', and even in the
  // oblique view of chapter 6 it overstated distance by 42 %. Framing one target
  // from any direction at one distance must report one scale.
  const target = new THREE.Vector3(1100, 0, 0);
  const spans = [[0.12, 0.25, 1], [0.7, 0.5, 0.7], [1, 0, 0], [0, 0, 1], [1, 0.06, 0.06]]
    .map((dir) => {
      const viewer = stubViewer();
      const offset = new THREE.Vector3(...dir).normalize().multiplyScalar(400);
      viewer._moveCamera(target.clone().add(offset), target);
      return Number(viewer.visibleWidthNm().toFixed(6));
    });
  assert.equal(new Set(spans).size, 1,
    `camera orientation changed the reported stage scale: ${spans.join(', ')}`);
});

test('SC11-4a: a scale the stage cannot state is reported as absent', () => {
  assert.equal(stagePxPerNm(1000, 1280), 1.28);
  for (const bad of [null, 0, -1, NaN, Infinity]) {
    assert.equal(stagePxPerNm(bad, 1280), null, `span ${bad} must not produce a scale`);
    assert.equal(stagePxPerNm(1000, bad), null, `viewport ${bad} must not produce a scale`);
  }
  // And the facade refuses at the source, so no caller has to know the rule.
  const facade = Object.create(TitinVisualization.prototype);
  facade.viewer = { visibleWidthNm: () => 1234.5 };
  assert.equal(facade.viewSpanNm(), 1234.5);
  for (const bad of [0, -1, NaN, Infinity]) {
    facade.viewer = { visibleWidthNm: () => bad };
    assert.equal(facade.viewSpanNm(), null, `visibleWidthNm ${bad} must not become a scale`);
  }
});

test('SC11-4a: the ruler holds the stage rule instead of following the card', () => {
  const canvas = { width: 1280, height: 720 };
  const baseline = canvas.height - STAGE_LAYOUT.scale_bar_baseline_px;
  // Evidence mode: no chapter card, so the bottom-left corner is free.
  assert.deepEqual(scaleBarPlacement({ barPx: 104, canvas, card: null, safeTopPx: 90 }),
    { left: 12, baseline });
  // Guided: the card owns the corner, so the bar sits beside it on the same rule.
  const short = { top: 504, right: 514, bottom: 676 };
  const tall = { top: 240, right: 514, bottom: 676 };   // chapter 7's pipeline card
  const beside = scaleBarPlacement({ barPx: 104, canvas, card: short, safeTopPx: 90 });
  assert.deepEqual(beside, { left: 526, baseline });
  // The card's HEIGHT must not move the bar: that is what made it jump on Next.
  assert.deepEqual(scaleBarPlacement({ barPx: 104, canvas, card: tall, safeTopPx: 90 }), beside);
});

test('SC11-4a: a phone-width card pushes the ruler above it rather than off-stage', () => {
  const canvas = { width: 375, height: 812 };
  const card = { top: 500, right: 356, bottom: 795 };
  const placed = scaleBarPlacement({ barPx: 100, canvas, card, safeTopPx: 120 });
  assert.equal(placed.left, 12);
  assert.ok(placed.left + 100 <= canvas.width - 12, 'the bar must stay on the stage');
  assert.equal(placed.baseline, card.top - 12);
  // And a card tall enough to reach the header cannot push the bar underneath it.
  const engulfing = { top: 100, right: 356, bottom: 795 };
  assert.equal(
    scaleBarPlacement({ barPx: 100, canvas, card: engulfing, safeTopPx: 120 }).baseline, 140,
  );
});

test('SC11-4a: the page takes the bar\'s scale from the camera', () => {
  assert.match(page, /import \{[^}]*scaleBar[^}]*\} from '\.\/src\/presentation\/StageLayout\.js'/);
  assert.match(page, /stagePxPerNm\(visualization\.viewSpanNm\(\), width\)/,
    'the scale must come from the camera frustum, not from a projected interval');
  assert.match(page, /scaleBar\(/);
  // One projection pass still serves brackets and termini alike.
  assert.equal((page.match(/projectPresentationAnchors\(records\)/g) || []).length, 1,
    'the overlay must measure the stage once per pass');
});

test('SC11-4a: the stage declares the scale bar as presentation geometry', () => {
  const meaning = annotations.meta.stage_render_meaning;
  assert.ok(typeof meaning === 'string' && meaning.trim(),
    'stage overlays need a render-meaning record like every other drawn claim');
  assert.match(meaning, /scale bar/i);
  assert.match(meaning, /bracket/i);
  assert.match(meaning, /continuity trace/i);
});
