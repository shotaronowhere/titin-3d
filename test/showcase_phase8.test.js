/** SC-8 gates: integrated validation, accessibility, and lifecycle. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { createAnnotations } from '../src/api/TitinAnnotations.js';
import { TitinVisualization, SCALES } from '../src/api/TitinVisualization.js';
import { COMPONENTS, SarcomereScene } from '../src/render/SarcomereScene.js';
import { Viewer, VIEWS, CLOSEUPS } from '../src/render/Viewer.js';
import { StoryController } from '../src/presentation/StoryController.js';
import { baseEvidence } from '../src/presentation/AnnotationCatalog.js';
import { createVisualMatrix, VIEWPORTS } from '../src/presentation/VisualMatrix.js';
import { RADIAL_TITIN_POLICY } from '../src/geometry/LatticeGeometry.js';

const model = await TitinModel.create(nodeReader());
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const gates = JSON.parse(
  readFileSync(new URL('../data/release_gates.json', import.meta.url), 'utf8'),
);
const SL = 2200;
const { min, max } = model.slRange();
const capabilities = {
  views: Object.keys(VIEWS),
  closeups: Object.keys(CLOSEUPS),
  scales: Object.values(SCALES),
  targets: [...model.titinRegions().map((region) => region.id), ...Object.keys(COMPONENTS)],
  hiddenTargetsByScale: { [SCALES.detail]: TitinVisualization.DETAIL_HIDDEN },
  minLength: min,
  maxLength: max,
};
const controller = new StoryController(model.spec.presentation, capabilities, model.spec.scenes);

/** The presentation option space SC-8 has to sweep. */
const MODES = ['guided', 'evidence'];
const COMBINATIONS = [];
for (const presentationMode of MODES) {
  for (const latticeScope of ['local', 'patch']) {
    for (const mirror of [true, false]) {
      for (const titinStrands of [true, false]) {
        for (const domains of [true, false]) {
          COMBINATIONS.push({ presentationMode, latticeScope, mirror, titinStrands, domains });
        }
      }
    }
  }
}

function build(options = {}) {
  const {
    presentationMode = 'evidence', latticeScope = 'local', mirror = true,
    titinStrands = false, domains = true, anchorDetail = null, mybpc = false,
    viewWidthNm = 400, sl = SL,
  } = options;
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(sl, { rings: 1 }), model.domainInstancesAt(sl), {
    latticeScope,
    mirror,
    titinStrands,
    titinPath: model.backboneAt(sl),
    domainBatches: domains ? model.instancingPlanAt(sl) : null,
    domainStrands: domains ? [0] : [],
    anchorDetail: anchorDetail ? model.anchorDetailAt(sl, anchorDetail, { rings: 1 }) : null,
    mybpcContext: mybpc ? model.mybpcContextAt(sl, { rings: 1 }) : null,
    presentationMode,
    viewWidthNm,
    viewportPx: 1200,
  });
  return scene;
}

// ---------------------------------------------------------------------------
// The presentation layer must not touch the science
// ---------------------------------------------------------------------------

test('SC8: no presentation combination changes the model or the solver', () => {
  const snapshot = (sl) => JSON.stringify({
    geometry: model.geometryAt(sl),
    backbone: model.backboneAt(sl),
    domains: model.domainInstancesAt(sl),
    lattice: model.latticePatchAt(sl, 1),
  });
  for (const sl of [1900, 2200, 2400, 3000]) {
    const before = snapshot(sl);
    for (const combination of COMBINATIONS) {
      const scene = build({ ...combination, sl });
      scene.setPresentationEmphasis(combination.presentationMode);
      scene.setTitinRegionHighlight('PEVK');
      scene.setComponentVisibility({ thick_filament: false, titin_domains: false });
      scene.clear();
    }
    assert.equal(snapshot(sl), before,
      `building and manipulating scenes changed the model at SL ${sl}`);
  }
});

test('SC8: every visibility and mode combination keeps titin continuous', () => {
  const backbone = model.backboneAt(SL);
  const expected = backbone.segments.map((segment) => segment.region_id);
  for (const combination of COMBINATIONS) {
    const scene = build(combination);
    const label = JSON.stringify(combination);
    const drawn = new Map();
    scene.root.traverse((object) => {
      const region = object.userData?.titin_region;
      if (region && !drawn.has(region)) drawn.set(region, object);
    });
    assert.deepEqual([...drawn.keys()].sort(), [...expected].sort(),
      `${label}: a titin region is missing from the scene`);

    // The drawn regions must tile the canonical backbone without a gap, which is
    // what "continuous" means for a molecule assembled from per-region tubes.
    const spans = backbone.segments
      .map((segment) => [segment.X_start, segment.X_end])
      .sort((a, b) => a[0] - b[0]);
    for (let index = 1; index < spans.length; index += 1) {
      assert.ok(Math.abs(spans[index][0] - spans[index - 1][1]) < 1e-9,
        `${label}: gap before ${expected[index]}`);
    }
    // Hiding context must never remove titin itself.
    scene.setComponentVisibility({ thick_filament: false, thin_filament: false, zdisc: false });
    let visibleTitin = 0;
    scene.root.traverse((object) => {
      if (object.userData?.titin_region && object.visible) visibleTitin += 1;
    });
    assert.ok(visibleTitin > 0, `${label}: hiding context hid titin`);
    scene.clear();
  }
});

// ---------------------------------------------------------------------------
// Evidence and provenance integrity
// ---------------------------------------------------------------------------

test('SC8: no annotation renders stronger evidence than it claims', () => {
  const RANK = ['UNKNOWN', 'SCHEMATIC', 'INFERRED', 'MODELED', 'STRONGLY INFERRED', 'MEASURED'];
  for (const scale of Object.values(SCALES)) {
    for (const sl of [1900, 2200, 3000]) {
      for (const annotation of createAnnotations(model, sl, { scale })) {
        const claim = baseEvidence(annotation.evidence.claim_class);
        const render = baseEvidence(annotation.evidence.render_class);
        assert.ok(claim && render, `${annotation.id}: unreadable evidence class`);
        assert.ok(RANK.indexOf(render) <= RANK.indexOf(claim),
          `${annotation.id}: render ${render} exceeds claim ${claim}`);
        assert.ok(annotation.sources.length && annotation.not_claimed.length,
          `${annotation.id}: incomplete provenance`);
      }
    }
  }
});

test('SC8: cross-muscle measurements are declared and never silently adopted', () => {
  const measurements = model.spec.contextMeasurements.measurements;
  assert.ok(measurements.some((entry) => entry.muscle_type === 'cardiac'),
    'the model retains explicitly labelled cardiac context measurements');
  for (const entry of measurements) {
    assert.ok(String(entry.skeletal_transfer || '').trim(),
      `${entry.quantity}: every value must state its transfer/admission status`);
  }
  // The measured cardiac titin azimuth is the concrete case: it exists, it is
  // better than the drawn schematic, and it is deliberately NOT adopted.
  const divergence = RADIAL_TITIN_POLICY.known_divergence_from_measurement;
  assert.match(divergence.status, /renderer intentionally lags/i);
  assert.match(divergence.why_not_yet_adopted, /current construct tissue status remains pending/i);
  assert.doesNotMatch(divergence.why_not_yet_adopted, /human skeletal/i);
  assert.equal(RADIAL_TITIN_POLICY.id, 'six_fold_symmetric');
  const offsets = model.contextSceneAt(SL, { rings: 1 }).lattice.titin_strands.offsets;
  const azimuths = offsets.map((offset) => Number(offset.azimuth_deg.toFixed(6)));
  assert.deepEqual(azimuths, [0, 60, 120, 180, 240, 300],
    'the rendered azimuths must remain the schematic six-fold set, not the cardiac pairs');
  const radii = new Set(offsets.map((offset) => Number(offset.radius_nm.toFixed(6))));
  assert.equal(radii.size, 1, 'the cardiac two-shell arrangement must not have been adopted');
});

// ---------------------------------------------------------------------------
// URL state and the deterministic visual matrix
// ---------------------------------------------------------------------------

test('SC8: every supported state survives a URL round trip', () => {
  const states = [];
  for (const chapter of controller.chapters) states.push(controller.stateForChapter(chapter.id));
  const base = controller.stateForChapter(controller.chapters[0].id);
  for (const name of Object.keys(CLOSEUPS)) {
    states.push({
      ...base, audience_mode: 'evidence', evidence_display: true,
      camera_preset: `closeup.${name}`, selected_component_or_region: null,
    });
  }
  for (const view of Object.keys(VIEWS)) {
    states.push({ ...base, camera_preset: `view.${view}` });
  }
  for (const sl of [min, 2000, 2200, 2400, max]) {
    states.push({ ...base, sarcomere_length_nm: sl });
  }
  for (const state of states) {
    const hash = controller.serialize(state);
    const decoded = controller.parse(hash);
    assert.deepEqual(decoded.issues, [], `${hash}: not reproducible`);
    assert.deepEqual(decoded.state, state, `${hash}: decoded to a different state`);
  }
  // An unsupported state must fail visibly rather than silently becoming another.
  const unknown = controller.parse('#mode=guided&step=orientation&sl=2200&scale=context'
    + '&camera=view.titin_story&target=titin&evidence=0&future_field=1');
  assert.match(unknown.issues.join(' '), /Unknown URL field 'future_field'/);
  assert.deepEqual(unknown.state, controller.stateForChapter('orientation'));
});

test('SC8: the visual matrix covers the plan and every cell is reproducible', () => {
  const matrix = createVisualMatrix(model, capabilities);
  assert.equal(matrix.cells.length, gates.visual_matrix.expected_cells);
  assert.deepEqual(matrix.viewports.map((viewport) => [viewport.width, viewport.height]),
    [[1920, 1080], [1440, 900], [1280, 720], [390, 844]]);

  // Every declared group and every declared viewport is genuinely present.
  const groups = new Set(matrix.cells.map((cell) => cell.group));
  for (const required of matrix.required_groups) assert.ok(groups.has(required), required);
  for (const viewport of VIEWPORTS) {
    assert.ok(matrix.cells.some((cell) => cell.viewport_id === viewport.id), viewport.id);
  }
  // Every guided chapter at every viewport, which is the part a first-time viewer sees.
  for (const chapter of controller.chapters) {
    for (const viewport of VIEWPORTS) {
      assert.ok(matrix.cells.some((cell) => cell.id === `chapter_${chapter.id}_${viewport.id}`),
        `missing ${chapter.id} at ${viewport.id}`);
    }
  }
  // The MyBP-C pair differs only by the display option, so it is a real before/after.
  const [off, on] = ['mybpc_off', 'mybpc_on']
    .map((id) => matrix.cells.find((cell) => cell.id === id));
  assert.equal(off.url_hash, on.url_hash);
  assert.equal(off.options.mybpc, false);
  assert.equal(on.options.mybpc, true);

  // Reproducibility is the property that makes the matrix a control rather than
  // a gallery: each hash must decode back to the state the cell names.
  for (const cell of matrix.cells) {
    const decoded = controller.parse(cell.url_hash);
    assert.deepEqual(decoded.issues, [], `${cell.id}: ${decoded.issues.join(' ')}`);
    assert.deepEqual(decoded.state, cell.state, `${cell.id}: decoded to another state`);
  }
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

function contrastRatio(foreground, background) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('SC8: every declared colour pair meets its contrast floor and exists in the page', () => {
  const pairs = gates.accessibility.contrast_pairs;
  assert.ok(pairs.length >= 10);
  for (const pair of pairs) {
    const ratio = contrastRatio(pair.foreground, pair.background);
    assert.ok(ratio >= pair.min_ratio,
      `${pair.id}: ${ratio.toFixed(2)}:1 is below the ${pair.min_ratio}:1 floor`);
    // The record must describe the shipped stylesheet, not an aspiration.
    for (const colour of [pair.foreground, pair.background]) {
      assert.ok(page.toLowerCase().includes(colour.toLowerCase()),
        `${pair.id}: ${colour} does not appear in the page`);
    }
  }
});

test('SC8: focus order, keyboard route, and touch targets hold', () => {
  // No positive tabindex anywhere: focus order must follow the document.
  const tabindexes = [...page.matchAll(/tabindex="(-?\d+)"/g)].map((hit) => Number(hit[1]));
  assert.ok(tabindexes.length, 'the stage is focusable');
  assert.ok(tabindexes.every((value) => value <= 0),
    `positive tabindex reorders focus: ${tabindexes}`);

  // The guided route is driven by real buttons, so it is keyboard reachable.
  for (const id of ['chapterPrevious', 'chapterNext', 'chapterRestart', 'chapterEvidenceLink',
    'audienceGuided', 'audienceEvidence', 'closeEvidence']) {
    assert.match(page, new RegExp(`<button id="${id}"`), `${id} must be a real button`);
  }
  assert.match(page, /id="canvas"[^>]*tabindex="0"/);
  assert.match(page, /\['ArrowLeft', 'ArrowRight', 'Enter', ' '\]/);
  assert.match(page, /event\.key === 'Escape'/);

  // Tablet touch targets: a coarse pointer gets the 44 px minimum without
  // inflating the desktop control density.
  assert.match(page, /@media \(pointer: coarse\)[\s\S]{0,400}min-height: 44px/,
    'coarse-pointer devices must get a 44 px minimum touch target');
});

test('SC8: evidence and selection are never carried by colour alone', () => {
  // Evidence always reaches the reader as text.
  assert.match(page, /Claim \$\{annotation\.evidence\.claim_class\} · render \$\{annotation\.evidence\.render_class\}/);
  const claimRenderer = readFileSync(
    new URL('../src/presentation/ClaimViewRenderer.js', import.meta.url), 'utf8',
  );
  assert.match(claimRenderer, /classList\.add\('finding-status', `finding-\$\{field\.evidenceClass\}`\)/);
  assert.match(claimRenderer, /status\.textContent = field\.evidenceClass/,
    'a finding status must be readable as text, not only as a colour');
  // Selection reaches assistive technology as state, not as a hue.
  assert.match(page, /aria-pressed/);
  assert.match(page, /aria-current/);
  assert.match(page, /classList\.toggle\('selected-target', selected\)/);
  // And the renderer keeps identity, selection, and evidence on separate channels.
  const scene = build();
  const opacityBefore = [];
  scene.root.traverse((object) => {
    if (object.userData?.titin_region) opacityBefore.push(object.material.opacity);
  });
  const applied = scene.setTitinRegionHighlight('PEVK');
  const opacityAfter = [];
  scene.root.traverse((object) => {
    if (object.userData?.titin_region) opacityAfter.push(object.material.opacity);
  });
  assert.deepEqual(opacityAfter, opacityBefore, 'selection must not touch evidence opacity');
  assert.ok(applied.highlighted_tubes > 0 && applied.dimmed_tubes > 0);
  scene.clear();
});

// ---------------------------------------------------------------------------
// Performance and lifecycle
// ---------------------------------------------------------------------------

test('SC8: repeated rebuilds and mode changes do not grow resource counts', () => {
  const scene = new SarcomereScene();
  const sample = () => {
    let objects = 0;
    let instanced = 0;
    scene.root.traverse((object) => {
      objects += 1;
      if (object.isInstancedMesh) instanced += 1;
    });
    return { objects, instanced, disposables: scene.disposables.size };
  };
  const rebuild = (mode, sl) => {
    scene.build(model.contextSceneAt(sl, { rings: 1 }), model.domainInstancesAt(sl), {
      latticeScope: 'local',
      mirror: true,
      titinStrands: false,
      titinPath: model.backboneAt(sl),
      domainBatches: model.instancingPlanAt(sl),
      domainStrands: [0],
      presentationMode: mode,
      viewWidthNm: 400,
      viewportPx: 1200,
    });
  };
  rebuild('evidence', SL);
  const baseline = sample();
  assert.ok(baseline.instanced > 0, 'repeated structures must stay instanced');
  for (let round = 0; round < 12; round += 1) {
    rebuild(round % 2 ? 'guided' : 'evidence', SL);
    scene.setTitinRegionHighlight(round % 3 ? 'PEVK' : null);
    scene.setComponentVisibility({ myosin_heads: round % 2 === 0 });
  }
  rebuild('evidence', SL);
  assert.deepEqual(sample(), baseline,
    'twelve rebuilds and mode changes leaked objects or GPU resources');
  scene.clear();
  assert.equal(scene.disposables.size, 0, 'clear() must release every tracked resource');
});

test('SC8: an idle frame rebuilds no geometry', () => {
  let rebuilds = 0;
  const scene = build({ mybpc: false, anchorDetail: null });
  const viewer = Object.create(Viewer.prototype);
  viewer.sarcomere = scene;
  viewer.container = { clientWidth: 1200 };
  viewer.currentSL = SL;
  viewer.lastBuildOpts = { showContextDetail: false, anchorDetail: null, showMyBPC: false };
  viewer.visibleWidthNm = () => 400;
  for (let frame = 0; frame < 120; frame += 1) {
    assert.equal(viewer.checkDetailLOD(() => { rebuilds += 1; }), false);
  }
  assert.equal(rebuilds, 0, 'a still camera must not rebuild geometry every frame');

  // And a genuine threshold crossing still rebuilds exactly once.
  const gated = build({ mybpc: true, viewWidthNm: 400 });
  const zoomed = Object.create(Viewer.prototype);
  zoomed.sarcomere = gated;
  zoomed.container = { clientWidth: 1200 };
  zoomed.currentSL = SL;
  zoomed.lastBuildOpts = { showMyBPC: true };
  zoomed.visibleWidthNm = () => 40000;
  assert.equal(gated.manifest.mybpc_context.drawn, true);
  assert.equal(zoomed.checkDetailLOD(() => { rebuilds += 1; }), true);
  assert.equal(rebuilds, 1);
  scene.clear(); gated.clear();
});

test('SC8: the standalone build stays inside its declared size budget', () => {
  const baseline = gates.performance.baseline;
  const bytes = statSync(new URL('../index.html', import.meta.url)).size;
  const growth = (bytes - baseline.standalone_bytes) / baseline.standalone_bytes;
  assert.ok(growth <= baseline.standalone_regression_tolerance,
    `standalone grew ${(growth * 100).toFixed(1)}%, past the `
    + `${(baseline.standalone_regression_tolerance * 100).toFixed(0)}% tolerance`);
});

// ---------------------------------------------------------------------------
// The release record itself
// ---------------------------------------------------------------------------

test('SC8: the release record claims nothing that has not been earned', () => {
  assert.equal(gates.release_ready, false,
    'no human gate has been run, so the showcase is not release-ready');
  for (const section of ['lay_comprehension', 'expert_review', 'visual_matrix']) {
    assert.equal(gates[section].status, 'PENDING', `${section} must not claim a result`);
  }
  assert.deepEqual(gates.lay_comprehension.results, []);
  assert.deepEqual(gates.expert_review.reviewers, []);
  assert.deepEqual(gates.expert_review.findings, []);
  assert.deepEqual(gates.visual_matrix.captured_cells, []);
  // Automated gates may claim a result, and every check they claim must name a
  // file that exists in this repository.
  for (const section of ['automated', 'destructive_controls']) {
    assert.equal(gates[section].status, 'PASS');
    for (const check of gates[section].checks) {
      assert.equal(check.verification, 'automated');
      assert.equal(check.status, 'PASS');
      const files = check.verified_by.split(/[;\s]+/).filter((part) => part.includes('/'));
      assert.ok(files.length, `${check.id}: names no file`);
      for (const file of files) {
        assert.ok(statSync(new URL(`../${file}`, import.meta.url)).isFile(),
          `${check.id}: '${file}' does not exist`);
      }
    }
  }
  // Every outstanding gate is named as a blocker, so the reason is never implicit.
  const outstanding = ['scientific_decisions', 'claim_entailment', 'mechanical_validity',
    'deployment_parity', 'visual_matrix', 'lay_comprehension', 'expert_review',
    'accessibility', 'performance', 'demo_rehearsal', 'final_release_definition']
    .filter((section) => gates[section].status !== 'PASS');
  for (const section of outstanding) {
    assert.ok(gates.release_blockers.some((entry) => entry.startsWith(section)),
      `${section} is outstanding but not listed as a blocker`);
  }
});
