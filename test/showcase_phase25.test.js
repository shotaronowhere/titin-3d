/** SC-25 gates: pick priority, hit proxies, label routes, and titin prominence. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import {
  COMPONENT_COLOR, GUIDED_COMPONENT_COLOR, PICK_PROXY_LAYER, SarcomereScene,
} from '../src/render/SarcomereScene.js';
import {
  PICK_CLASS, PICK_PRIORITY_ORDER, PICK_REASON, resolvePick,
} from '../src/render/PickPriority.js';
import { inspectorPlacement, STAGE_LAYOUT } from '../src/presentation/StageLayout.js';
import { VIEWPORTS } from '../src/presentation/VisualMatrix.js';
import { HIT_GRID_RULES, ringSamples } from '../scripts/build_picking_hit_grid.mjs';

const model = await TitinModel.create(nodeReader());
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const grid = JSON.parse(readFileSync(
  new URL('../test/fixtures/picking_hit_grid.json', import.meta.url), 'utf8',
));
// Release gates are deliberately NOT a Spec input — they are a post-candidate
// record, and SC-18 keeps them outside model identity — so they are read from
// the repository rather than through the model.
const gates = JSON.parse(readFileSync(
  new URL('../data/release_gates.json', import.meta.url), 'utf8',
));
const policy = model.spec.renderStyle.titin.picking;

function build(sl = 2200, opts = {}) {
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(sl, { rings: 1 }), model.domainInstancesAt(sl), {
    latticeScope: 'local', mirror: false, titinStrands: false,
    titinPath: model.backboneAt(sl), domainBatches: model.instancingPlanAt(sl),
    domainStrands: [0], presentationMode: 'guided', viewWidthNm: 400, viewportPx: 1200,
    ...opts,
  });
  return scene;
}

/** A candidate record with every required field, overridable per test. */
function candidate(overrides = {}) {
  return {
    target_type: 'component',
    target_id: 'thick_filament',
    biological_class: PICK_CLASS.context,
    pick_proxy: false,
    visible: true,
    screen_distance_px: 0,
    ray_distance_nm: 100,
    selected: false,
    ...overrides,
  };
}

const titinAt = (screen, ray, extra = {}) => candidate({
  target_type: 'titin_region', target_id: 'PEVK', biological_class: PICK_CLASS.titin,
  screen_distance_px: screen, ray_distance_nm: ray, ...extra,
});

// ---------------------------------------------------------------------------
// 25.1 — the reviewed rule

test('SC25: the resolver implements the reviewed order and nothing else', () => {
  assert.deepEqual([...PICK_PRIORITY_ORDER], policy.priority_order);
  assert.equal(policy.emphasized_titin_tolerance_px,
    (policy.pick_proxy_line_width_px + policy.line_pick_threshold_px) / 2);
  // The visible trace is what clause 2 promotes; its own effective pick width may
  // never exceed the tolerance the resolver enforces.
  for (const key of ['trace_px', 'trace_px_evidence']) {
    assert.ok(
      (model.spec.renderStyle.titin[key] + policy.line_pick_threshold_px) / 2
        <= policy.emphasized_titin_tolerance_px,
      `${key} pick half-width exceeds the reviewed tolerance`,
    );
  }
  assert.equal(policy.pick_proxy_layer, PICK_PROXY_LAYER);
  assert.equal(policy.pick_proxy_rendered, false);
  assert.equal(policy.pick_proxy_counted_in_geometry, false);
  assert.equal(policy.selection_influences_resolution, false);
});

test('SC25: an explicitly named target wins outright, with or without ray candidates', () => {
  const intent = {
    explicit_target: { target_type: 'titin_region', target_id: 'N2A' },
    tolerance_px: policy.emphasized_titin_tolerance_px,
  };
  for (const candidates of [[], [candidate({ ray_distance_nm: 1 })]]) {
    const resolved = resolvePick(candidates, intent);
    assert.equal(resolved.reason, PICK_REASON.explicit_target);
    assert.equal(resolved.target.target_id, 'N2A');
    assert.equal(resolved.target.pick_proxy, false);
  }
});

test('SC25: emphasized titin within tolerance outranks a nearer occluding surface', () => {
  const candidates = [
    candidate({ ray_distance_nm: 10 }),
    titinAt(policy.emphasized_titin_tolerance_px - 1, 400, { pick_proxy: true }),
  ];
  const emphasised = resolvePick(candidates, {
    emphasis: PICK_CLASS.titin, tolerance_px: policy.emphasized_titin_tolerance_px,
  });
  assert.equal(emphasised.reason, PICK_REASON.emphasized_titin);
  assert.equal(emphasised.target.target_id, 'PEVK');

  // Explore does not emphasise titin, so the same ray answers with what is
  // genuinely in front of the pointer.
  const explore = resolvePick(candidates, {
    emphasis: null, tolerance_px: policy.emphasized_titin_tolerance_px,
  });
  assert.equal(explore.reason, PICK_REASON.nearest_visible_surface);
  assert.equal(explore.target.target_id, 'thick_filament');
});

test('SC25: outside the tolerance the emphasized molecule does not steal the click', () => {
  const resolved = resolvePick([
    candidate({ ray_distance_nm: 10 }),
    titinAt(policy.emphasized_titin_tolerance_px + 0.5, 400, { pick_proxy: true }),
  ], { emphasis: PICK_CLASS.titin, tolerance_px: policy.emphasized_titin_tolerance_px });
  assert.equal(resolved.reason, PICK_REASON.nearest_visible_surface);
  assert.equal(resolved.target.target_id, 'thick_filament');
});

test('SC25: clause 2 answers with the nearest part of the molecule, not the nearest depth', () => {
  // A neighbouring region's hit area lying slightly closer to the camera must not
  // win a click that landed squarely on its neighbour.
  const resolved = resolvePick([
    titinAt(9, 100, { target_id: 'N2A', pick_proxy: true }),
    titinAt(0, 400, { target_id: 'PEVK', pick_proxy: true }),
  ], { emphasis: PICK_CLASS.titin, tolerance_px: policy.emphasized_titin_tolerance_px });
  assert.equal(resolved.target.target_id, 'PEVK');
  // At the same place, the drawn molecule beats its own hit area.
  const drawnWins = resolvePick([
    titinAt(0, 400, { target_id: 'PEVK', pick_proxy: true }),
    titinAt(0, 400, { target_id: 'PEVK', pick_proxy: false }),
  ], { emphasis: PICK_CLASS.titin, tolerance_px: policy.emphasized_titin_tolerance_px });
  assert.equal(drawnWins.target.pick_proxy, false);
});

test('SC25: a proxy-only hit resolves last, and never over a drawn surface', () => {
  const alone = resolvePick([titinAt(3, 400, { pick_proxy: true })],
    { emphasis: null, tolerance_px: policy.emphasized_titin_tolerance_px });
  assert.equal(alone.reason, PICK_REASON.pick_proxy_only);
  assert.equal(alone.target.target_id, 'PEVK');
  const withSurface = resolvePick([
    titinAt(3, 400, { pick_proxy: true }), candidate({ ray_distance_nm: 900 }),
  ], { emphasis: null, tolerance_px: policy.emphasized_titin_tolerance_px });
  assert.equal(withSurface.reason, PICK_REASON.nearest_visible_surface);
});

test('SC25: the current selection is inert and cannot make a selection sticky', () => {
  const candidates = [
    candidate({ target_id: 'thick_filament', ray_distance_nm: 10 }),
    candidate({ target_id: 'thin_filament', ray_distance_nm: 20 }),
  ];
  const base = resolvePick(candidates, { tolerance_px: 10 });
  for (const selected of ['thin_filament', 'thick_filament']) {
    const marked = candidates.map((row) => ({ ...row, selected: row.target_id === selected }));
    const resolved = resolvePick(marked, {
      tolerance_px: 10, selection: { target_type: 'component', target_id: selected },
    });
    assert.equal(resolved.target.target_id, base.target.target_id,
      'selection must not change which object a ray resolves to');
  }
  // Empty space with something pinned resolves to nothing, not to the pin.
  const empty = resolvePick([], {
    tolerance_px: 10, selection: { target_type: 'component', target_id: 'titin' },
  });
  assert.equal(empty.reason, PICK_REASON.no_target);
  assert.equal(empty.target, null);
});

test('SC25: decoration is dropped, and hidden geometry never resolves', () => {
  const dropped = resolvePick([
    candidate({ biological_class: PICK_CLASS.decorative, target_id: 'titin_halo', ray_distance_nm: 1 }),
    candidate({ ray_distance_nm: 50 }),
  ], { emphasis: PICK_CLASS.titin, tolerance_px: 10 });
  assert.equal(dropped.dropped_decorative, 1);
  assert.equal(dropped.target.target_id, 'thick_filament');

  const hidden = resolvePick([
    titinAt(0, 10, { visible: false }), candidate({ visible: false }),
  ], { emphasis: PICK_CLASS.titin, tolerance_px: 10 });
  assert.equal(hidden.reason, PICK_REASON.no_target);
});

test('SC25: malformed candidate records are refused rather than ranked', () => {
  const cases = [
    [{ ...candidate(), target_type: 'guess' }, /unknown target_type/],
    [{ ...candidate(), target_id: '' }, /no canonical target_id/],
    [{ ...candidate(), biological_class: 'important' }, /unknown biological_class/],
    [{ ...candidate(), pick_proxy: 'yes' }, /pick_proxy and visible as booleans/],
    [{ ...candidate(), ray_distance_nm: NaN }, /non-finite or negative/],
    [{ ...candidate(), screen_distance_px: -1 }, /non-finite or negative/],
  ];
  for (const [row, pattern] of cases) {
    assert.throws(() => resolvePick([row], { tolerance_px: 10 }), pattern);
  }
  assert.throws(() => resolvePick([], {}), /tolerance_px/);
  assert.throws(() => resolvePick([], { tolerance_px: 10, emphasis: 'myosin' }), /unknown emphasis/);
});

// ---------------------------------------------------------------------------
// 25.1 — the committed hit grid

test('SC25: the hit grid is exactly what its declared rules produce', () => {
  assert.equal(grid.schema, 'titin-picking-hit-grid/1');
  assert.equal(grid.depth, 'learn');
  assert.deepEqual(grid.rules, JSON.parse(JSON.stringify(HIT_GRID_RULES)),
    'the committed rules differ from the generator\'s declared rules');
  assert.deepEqual(grid.ring_samples, ringSamples(HIT_GRID_RULES),
    'the committed ring_samples table is not what the rules expand to');
  // The intended-hit radius is derived from the reviewed tolerance, with margin —
  // never tuned up to whatever the resolver happens to achieve.
  assert.ok(grid.rules.intended_hit_max_ring_px < policy.emphasized_titin_tolerance_px,
    'the intended-hit radius must sit strictly inside the reviewed tolerance');
  assert.ok(grid.rules.ring_radii_px.some((ring) => ring > policy.emphasized_titin_tolerance_px),
    'the grid must also probe outside the tolerance');
  for (const ring of grid.ring_samples) {
    assert.equal(ring.intended_titin_hit, ring.ring_px <= grid.rules.intended_hit_max_ring_px);
  }
  assert.equal(grid.totals.samples_per_offset, grid.ring_samples.length);

  const offsets = grid.scenes.reduce((sum, scene) => sum + scene.path_offsets.length, 0);
  // Every total is derivable from the offsets and the ring table, so an edited
  // total is an edited coverage claim and says so.
  assert.equal(grid.totals.path_offsets, offsets, 'totals.path_offsets is not the offset count');
  assert.equal(grid.totals.samples, offsets * grid.ring_samples.length,
    'totals.samples is not offsets x the declared ring table');
  assert.equal(grid.totals.intended,
    offsets * grid.ring_samples.filter((ring) => ring.intended_titin_hit).length,
    'totals.intended is not the rule-derived intended-sample count');
  assert.equal(grid.totals.scenes, grid.scenes.length, 'totals.scenes is not the scene count');
  assert.ok(grid.totals.intended > 1000, 'the grid must be a coverage claim, not a spot check');
});

test('SC25: every hit-grid offset is a rule multiple on a real titin path', () => {
  const regions = new Set(model.titinRegions().map((region) => region.id));
  const viewports = new Set(grid.viewports.map((viewport) => viewport.id));
  const spacing = grid.rules.path_sample_spacing_nm;
  for (const scene of grid.scenes) {
    assert.ok(viewports.has(scene.viewport_id), scene.id);
    assert.match(scene.url_hash, /^#v=2&depth=learn&/, `${scene.id} must be a Learn scene link`);
    assert.match(scene.url_hash, new RegExp(`scene=${scene.scene_id}(&|$)`), scene.id);
    const seen = new Set();
    for (const [pathId, offset] of scene.path_offsets) {
      assert.ok(regions.has(pathId), `${scene.id} samples unknown path '${pathId}'`);
      assert.ok(scene.target_path_ids.includes(pathId), `${scene.id}: ${pathId} is undeclared`);
      assert.ok(Number.isInteger(Math.round(offset / spacing))
        && Math.abs(offset - Math.round(offset / spacing) * spacing) < 1e-9,
      `${scene.id}: offset ${offset} is not a multiple of ${spacing} nm`);
      const key = `${pathId}@${offset}`;
      assert.equal(seen.has(key), false, `${scene.id}: duplicate offset ${key}`);
      seen.add(key);
    }
    assert.ok(scene.path_offsets.length > 0, `${scene.id} samples nothing`);
  }
});

test('SC25: changing the committed grid requires a recorded contract migration', () => {
  assert.ok(Array.isArray(grid.contract.migrations));
  assert.match(grid.contract.immutability, /migration/i);
  assert.match(grid.contract.denominator, /intended/i);
  // The contract states how the fixture came to exist, including where the real
  // sequence departed from the plan's. A record that claimed the ordering it did
  // not have would be worse than no record.
  assert.match(grid.contract.generation_order, /derived from it/i);
  assert.match(grid.contract.generation_order, /same commit as the resolver/i);
  for (const migration of grid.contract.migrations) {
    for (const field of ['on', 'reason', 'changed', 'previous_totals']) {
      assert.ok(migration[field], `a migration entry must state ${field}`);
    }
  }
});

// ---------------------------------------------------------------------------
// 25.2 — proxies change picking, not the render

test('SC25: hit proxies are non-rendering, uncounted, and out of every bound', () => {
  const scene = build();
  const proxies = [];
  scene.root.traverse((object) => { if (object.userData?.pick_proxy) proxies.push(object); });
  assert.ok(proxies.length > 0, 'the representative titin must carry hit proxies');
  assert.equal(scene.manifest.titin_pick_proxies.count, proxies.length);
  assert.equal(scene.manifest.titin_pick_proxies.rendered, false);
  assert.equal(scene.manifest.titin_pick_proxies.counted_in_geometry, false);
  assert.equal(scene.manifest.titin_pick_proxies.layer, PICK_PROXY_LAYER);
  for (const proxy of proxies) {
    assert.equal(proxy.layers.isEnabled(PICK_PROXY_LAYER), true, proxy.name);
    assert.equal(proxy.layers.isEnabled(0), false, `${proxy.name} would be rendered`);
    assert.equal(proxy.userData.pick_proxy_width_px, policy.pick_proxy_line_width_px);
    assert.match(proxy.userData.render_meaning, /not a molecular envelope/);
  }
  // The proxy count is not a geometry count: the manifest's own object records
  // describe the drawn molecule and must not have grown.
  assert.equal(scene.manifest.titin_strands_drawn, 1);
  scene.clear();
});

test('SC25: a proxy resolves to its canonical region and never to an unknown object', () => {
  const scene = build();
  let proxy = null;
  scene.root.traverse((object) => { if (!proxy && object.userData?.pick_proxy) proxy = object; });
  const target = scene.pickTarget(proxy);
  assert.equal(target.target_type, 'titin_region');
  assert.equal(target.target_id, proxy.userData.pick_proxy_region);
  assert.equal(target.pick_proxy, true);
  assert.ok(model.titinRegions().some((region) => region.id === target.target_id));
  scene.clear();
});

test('SC25: selection and emphasis style the visible target, never the hit area', () => {
  const scene = build();
  const proxyColours = () => {
    const colours = [];
    scene.root.traverse((object) => {
      if (object.userData?.pick_proxy) colours.push(object.material.color.getHex());
    });
    return colours;
  };
  const before = proxyColours();
  const highlighted = scene.setTitinRegionHighlight('PEVK');
  assert.ok(highlighted.highlighted_tubes > 0);
  assert.deepEqual(proxyColours(), before, 'selection must not recolour a hit area');
  scene.setPresentationEmphasis('guided');
  assert.deepEqual(proxyColours(), before, 'emphasis must not recolour a hit area');
  // And the proxy is not part of the evidence channel at all.
  scene.root.traverse((object) => {
    if (object.userData?.pick_proxy) {
      assert.equal(object.userData.evidence_rendered, undefined);
    }
  });
  scene.setTitinRegionHighlight(null);
  scene.clear();
});

test('SC25: proxies are rebuilt and disposed with the target they follow', () => {
  const scene = build();
  const countProxies = () => {
    let n = 0;
    scene.root.traverse((object) => { if (object.userData?.pick_proxy) n += 1; });
    return n;
  };
  const first = countProxies();
  assert.equal(scene.titinPickPaths().length, first);
  // A mirrored build clones the half; the clone's proxies must stay on the proxy
  // layer, or the mirrored half would draw hit areas.
  const mirrored = build(2200, { mirror: true });
  let mirroredProxies = 0;
  mirrored.root.traverse((object) => {
    if (!object.userData?.pick_proxy) return;
    mirroredProxies += 1;
    assert.equal(object.layers.isEnabled(PICK_PROXY_LAYER), true);
    assert.equal(object.layers.isEnabled(0), false);
  });
  assert.equal(mirroredProxies, first * 2);
  assert.equal(mirrored.manifest.titin_pick_proxies.count, first);
  mirrored.clear();
  assert.equal(mirrored.titinPickPaths().length, 0);
  scene.clear();
  assert.equal(scene.titinPickPaths().length, 0);
});

test('SC25: the pick centreline is the path the molecule is drawn on', () => {
  const scene = build();
  const paths = scene.titinPickPaths();
  const segments = new Map(model.backboneAt(2200).segments.map((s) => [s.region_id, s]));
  assert.deepEqual(paths.map((path) => path.region_id), [...segments.keys()]);
  for (const path of paths) {
    const segment = segments.get(path.region_id);
    assert.ok(path.points.length >= 2, path.region_id);
    // Endpoints are the canonical axial interval: the drawn chain wanders in the
    // transverse plane only, which is the SC-20 depiction contract.
    assert.ok(Math.abs(path.points[0].x - segment.X_start) < 1e-6, path.region_id);
    assert.ok(Math.abs(path.points.at(-1).x - segment.X_end) < 1e-6, path.region_id);
    for (const point of path.points) {
      assert.ok([point.x, point.y, point.z].every(Number.isFinite), path.region_id);
    }
  }
  scene.clear();
});

// ---------------------------------------------------------------------------
// 25.3 — teaching and exposing inspection

test('SC25: labels, legends, and the one-time invitation are wired in the page', () => {
  for (const id of ['inspectHint', 'inspectHintText', 'inspectHintDismiss',
    'objectInspectorDetailLink']) {
    assert.match(page, new RegExp(`id="${id}"`), id);
  }
  assert.match(page, /Click or tap a structure to explain it/);
  assert.match(page, /function selectNamedTarget/);
  assert.match(page, /function selectableLabel/);
  assert.match(page, /function legendEntry/);
  assert.match(page, /localStorage\.getItem\(INSPECT_HINT_KEY\)/);
  assert.match(page, /pulseTitinIdentity/);
  assert.match(page, /wantsReducedMotion\(\)/);
  // The invitation is spent at the single selection choke point, not in the
  // pointer handler, so a keyboard-only reader is not invited forever.
  assert.match(page, /completeInspectionOnboarding\(\);\s*\n\s*pinnedPick = \{ \.\.\.selection \};/);
  // The stage colour key must not carry the attribute that made it invisible.
  assert.doesNotMatch(page, /<div id="stageLegend" hidden/);
});

test('SC25: the onboarding pulse moves colour only and yields to a real selection', () => {
  const scene = build();
  const titinOpacity = () => {
    const values = [];
    scene.root.traverse((object) => {
      if (object.userData?.titin_region) values.push(object.material.opacity);
    });
    return values;
  };
  const baseOpacity = titinOpacity();
  const pulsed = scene.setTitinIdentityPulse(1);
  assert.equal(pulsed.preserves_evidence_opacity, true);
  assert.ok(pulsed.recolored_objects > 0);
  assert.deepEqual(titinOpacity(), baseOpacity, 'the pulse must not touch evidence opacity');

  let pulsedColour = null;
  scene.root.traverse((object) => {
    if (!pulsedColour && object.userData?.titin_region) pulsedColour = object.material.color.getHex();
  });
  assert.equal(pulsedColour, COMPONENT_COLOR.titin_highlight);
  scene.setTitinIdentityPulse(0);
  let restored = null;
  scene.root.traverse((object) => {
    if (restored === null && object.userData?.titin_region) restored = object.material.color.getHex();
  });
  assert.equal(restored, COMPONENT_COLOR.titin, 'the pulse must land exactly on the base identity');

  scene.setTitinRegionHighlight('PEVK');
  const suppressed = scene.setTitinIdentityPulse(1);
  assert.equal(suppressed.suppressed_by_selection, true);
  assert.equal(suppressed.recolored_objects, 0);
  scene.setTitinRegionHighlight(null);
  assert.throws(() => scene.setTitinIdentityPulse(1.4), /within 0\.\.1/);
  scene.clear();
});

// ---------------------------------------------------------------------------
// 25.4 — placement and prominence

test('SC25: the pinned card clears the controls at every release viewport', () => {
  const chrome = (viewport) => {
    const headerBottom = Math.round(viewport.height * 0.16);
    const barTop = Math.round(viewport.height * 0.85);
    return {
      safeTopPx: headerBottom,
      obstacles: [
        { id: 'stageHeader', left: 0, top: 0, right: viewport.width, bottom: headerBottom },
        { id: 'stageBar', left: 0, top: barTop, right: viewport.width, bottom: viewport.height },
        {
          id: 'guidedCard',
          left: 14,
          top: Math.round(viewport.height * 0.35),
          right: Math.min(viewport.width - 14, 14 + Math.round(viewport.width * 0.4)),
          bottom: barTop - 24,
        },
      ],
      canvasHeight: barTop,
    };
  };
  for (const viewport of [...VIEWPORTS, { id: 'phone', width: 375, height: 812 }]) {
    const layout = chrome(viewport);
    const card = {
      width: Math.min(370, viewport.width - 24),
      height: Math.min(340, Math.round(layout.canvasHeight - layout.safeTopPx - 16)),
    };
    for (const x of [40, viewport.width * 0.3, viewport.width * 0.5, viewport.width - 40]) {
      for (const y of [layout.safeTopPx + 20, layout.canvasHeight / 2, layout.canvasHeight - 40]) {
        const placed = inspectorPlacement({
          anchor: { x_px: x, y_px: y },
          card,
          canvas: { width: viewport.width, height: layout.canvasHeight },
          safeTopPx: layout.safeTopPx,
          obstacles: layout.obstacles,
        });
        const where = `${viewport.id} anchor ${Math.round(x)},${Math.round(y)}`;
        // The acceptance is about the PRIMARY CONTROLS, and that clause holds at
        // every viewport including the phone.
        assert.deepEqual(
          placed.collides_with.filter((id) => ['stageHeader', 'stageBar'].includes(id)), [],
          `${where} covers ${placed.collides_with}`,
        );
        // Above the phone breakpoint the stage is wide enough to clear the story
        // surface as well, and to keep SC-11's rule that the card never covers
        // the object it explains. At 375-390 px a 340 px card and a story sheet
        // cannot both have the width, and no vertical placement clears a
        // mid-stage anchor either; there the placement is required to REPORT the
        // collision rather than to pretend it placed cleanly, which
        // `placement reports a real constraint` covers.
        if (viewport.width >= 768) {
          assert.deepEqual(placed.collides_with, [], `${where} covers ${placed.collides_with}`);
          assert.equal(placed.collision_area_px, 0, where);
          assert.equal(placed.overlaps_anchor, false, `${where} covers its own anchor`);
        }
        assert.ok(placed.left >= STAGE_LAYOUT.edge_padding_px, where);
        assert.ok(placed.left + card.width <= viewport.width - STAGE_LAYOUT.edge_padding_px, where);
        assert.ok(placed.top >= layout.safeTopPx, where);
        assert.ok(placed.top + card.height <= layout.canvasHeight, where);
      }
    }
  }
});

test('SC25: placement reports a real constraint rather than hiding a collision', () => {
  // A stage with no free space must still answer, and must say what it landed on.
  const placed = inspectorPlacement({
    anchor: { x_px: 200, y_px: 200 },
    card: { width: 380, height: 380 },
    canvas: { width: 400, height: 400 },
    safeTopPx: 0,
    obstacles: [{ id: 'stageBar', left: 0, top: 0, right: 400, bottom: 400 }],
  });
  assert.deepEqual(placed.collides_with, ['stageBar']);
  assert.ok(placed.collision_area_px > 0);
  // Safe-area insets shrink the band the card may use.
  const inset = inspectorPlacement({
    anchor: { x_px: 900, y_px: 300 },
    card: { width: 300, height: 200 },
    canvas: { width: 1000, height: 600 },
    safeTopPx: 40,
    safeRightPx: 60,
  });
  assert.ok(inset.left + 300 <= 1000 - 60 - STAGE_LAYOUT.edge_padding_px);
});

test('SC25: titin keeps the top of the luminance range against every context object', () => {
  const pairs = gates.accessibility.object_contrast_pairs;
  const declared = new Map(pairs.map((pair) => [pair.id, pair]));
  for (const id of ['titin_vs_stage_guided', 'titin_vs_myosin_guided', 'titin_vs_actin_guided']) {
    assert.ok(declared.has(id), `${id} must be a recorded gate`);
    assert.equal(declared.get(id).foreground, '#ff5d7d');
  }
  const luminance = (hex) => {
    const channels = [16, 8, 0].map((shift) => ((hex >> shift) & 0xff) / 255);
    const linear = channels.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const ratio = (a, b) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (high + 0.05) / (low + 0.05);
  };
  const stage = 0x0e1116;
  const titinAgainstStage = ratio(COMPONENT_COLOR.titin, stage);
  // Luminance, not hue: a grayscale print and every common colour-vision
  // simulation keep luminance and discard the hue that carries protein identity.
  for (const [id, colour] of Object.entries(GUIDED_COMPONENT_COLOR)) {
    if (id === 'telethonin') continue; // a pale Z-disc partner, drawn only in its close-up
    assert.ok(titinAgainstStage > ratio(colour, stage) * 1.5,
      `titin must out-read guided ${id} against the stage by a clear margin`);
  }
  assert.ok(ratio(COMPONENT_COLOR.titin, GUIDED_COMPONENT_COLOR.thick_filament) >= 2.6);
  assert.ok(ratio(COMPONENT_COLOR.titin, GUIDED_COMPONENT_COLOR.thin_filament) >= 1.7);
});

test('SC25: the drawn chain is irregular at every length, not a regular helix', () => {
  for (const sl of [2000, 2200, 2400, 2600]) {
    const scene = build(sl);
    const disordered = new Set(model.spec.renderStyle.titin.disordered_regions
      .map((row) => row.id));
    let checked = 0;
    for (const path of scene.titinPickPaths()) {
      if (!disordered.has(path.region_id) || path.points.length < 8) continue;
      checked += 1;
      // Transverse displacement from the straight canonical chord. A helix has a
      // constant radius and a constant angular step; both must vary here.
      const first = path.points[0];
      const last = path.points.at(-1);
      const span = last.x - first.x;
      const radii = [];
      const angles = [];
      for (const point of path.points.slice(1, -1)) {
        const t = span === 0 ? 0 : (point.x - first.x) / span;
        const dy = point.y - (first.y + (last.y - first.y) * t);
        const dz = point.z - (first.z + (last.z - first.z) * t);
        radii.push(Math.hypot(dy, dz));
        angles.push(Math.atan2(dz, dy));
      }
      const steps = angles.slice(1).map((angle, index) => {
        let delta = angle - angles[index];
        while (delta > Math.PI) delta -= 2 * Math.PI;
        while (delta < -Math.PI) delta += 2 * Math.PI;
        return delta;
      });
      const spread = (values) => {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
      };
      const where = `${path.region_id} at ${sl} nm`;
      assert.ok(spread(steps) > 0.05,
        `${where}: angular steps are near-constant, which reads as a regular helix`);
      const meanRadius = radii.reduce((sum, v) => sum + v, 0) / radii.length;
      assert.ok(meanRadius > 0 && spread(radii) / meanRadius > 0.1,
        `${where}: a constant transverse radius reads as a measured coil`);
    }
    assert.ok(checked >= 2, `only ${checked} disordered chains checked at ${sl} nm`);
    scene.clear();
  }
});

test('SC25: the stage states that titin’s drawn width is a reading width', () => {
  assert.match(page, /reading width, not scale/);
  assert.match(page, /function illustrativeWidthRatio/);
  assert.match(page, /TITIN_CROSS_SECTION_NM =\s*\n?\s*model\.spec\.geometryStrategy/);
  const archetype = model.spec.geometryStrategy.domain_archetypes.Ig_like;
  assert.ok(archetype.lateral_diameter_nm > 0);
  assert.match(String(archetype.evidence_by_claim.lateral_diameter_nm), /MEASURED/);
});
