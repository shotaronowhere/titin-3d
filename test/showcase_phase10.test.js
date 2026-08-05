/** SC-10 gates: titin reads as the subject without borrowing the evidence channel. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { SarcomereScene, TITIN_RENDER_STYLE } from '../src/render/SarcomereScene.js';

const model = await TitinModel.create(nodeReader());
const SL = 2200;

/**
 * Build one context scene the way the Viewer does.
 *
 * `SarcomereScene.build(scene, domains, opts)` takes DESCRIPTORS, not the model,
 * so the helper resolves them here exactly as `Viewer.setSarcomereLength()` and
 * `test/showcase_phase8.test.js` do. Guided mode with the lattice present is the
 * default because that is the frame this sprint exists to fix.
 */
function build(options = {}) {
  const {
    presentationMode = 'guided', latticeScope = 'local', mirror = true,
    titinStrands = false, domains = true, sl = SL,
  } = options;
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(sl, { rings: 1 }), model.domainInstancesAt(sl), {
    latticeScope,
    mirror,
    titinStrands,
    titinPath: model.backboneAt(sl),
    domainBatches: domains ? model.instancingPlanAt(sl) : null,
    domainStrands: domains ? [0] : [],
    presentationMode,
    viewWidthNm: 400,
    viewportPx: 1200,
  });
  return scene;
}

test('SC10: the continuity trace is a screen-space wide line', () => {
  const scene = build();
  const traces = [];
  scene.root.traverse((object) => {
    if (object.name?.startsWith('titin_continuity_trace_')) traces.push(object);
  });
  assert.ok(traces.length > 0, 'the scene must draw a continuity trace');
  for (const trace of traces) {
    assert.ok(trace instanceof Line2, `${trace.name} must be a Line2`);
    assert.equal(trace.material.worldUnits, false,
      'width must be screen-space so titin stays legible when zoomed out');
    assert.ok(trace.material.linewidth >= 3,
      'the subject needs at least a 3 px ribbon');
  }
  scene.clear();
});

test('SC10: both audiences get a ribbon, and Guided gets the wider one', () => {
  for (const [mode, expected] of [
    ['guided', TITIN_RENDER_STYLE.trace_px],
    ['evidence', TITIN_RENDER_STYLE.trace_px_evidence],
  ]) {
    const scene = build({ presentationMode: mode });
    const traces = [];
    scene.root.traverse((object) => {
      if (object.name?.startsWith('titin_continuity_trace_')) traces.push(object);
    });
    assert.ok(traces.length > 0, `${mode}: the ribbon is not a Guided-only affordance`);
    for (const trace of traces) {
      assert.equal(trace.material.linewidth, expected, `${mode}: wrong ribbon width`);
      assert.equal(trace.userData.render_width_px, expected);
    }
    assert.equal(scene.manifest.titin_emphasis.trace_px, expected,
      `${mode}: the manifest must report the width actually drawn`);
    scene.clear();
  }
  assert.ok(TITIN_RENDER_STYLE.trace_px > TITIN_RENDER_STYLE.trace_px_evidence,
    'Guided is the audience that needs the heavier reading aid');
});

test('SC10: every screen-space line material is registered and resolution-settable', () => {
  const scene = build();
  assert.ok(scene.screenSpaceLineMaterials.size > 0);
  const applied = scene.setLineResolution(1440, 900);
  assert.equal(applied.materials_updated, scene.screenSpaceLineMaterials.size);
  for (const material of scene.screenSpaceLineMaterials) {
    assert.equal(material.resolution.x, 1440);
    assert.equal(material.resolution.y, 900);
  }
  // A zero size is the state a Line2 silently misbehaves in — it draws at the
  // wrong width and refuses to be picked — so it must be rejected, not stored.
  for (const bad of [[0, 900], [1440, 0], [-1, -1], [NaN, 900]]) {
    assert.throws(() => scene.setLineResolution(bad[0], bad[1]), /positive size/);
  }
  assert.equal(scene.screenSpaceLineMaterials.values().next().value.resolution.x, 1440);
  scene.clear();
});

test('SC10: clear() releases every tracked resource', () => {
  const scene = build();
  assert.ok(scene.disposables.size > 0);
  scene.clear();
  assert.equal(scene.disposables.size, 0);
  assert.equal(scene.screenSpaceLineMaterials.size, 0);
});

test('SC10: the halo is an emphasis channel, not an evidence claim', () => {
  const scene = build();
  const halos = [];
  const tubes = [];
  scene.root.traverse((object) => {
    if (object.name?.startsWith('titin_halo_')) halos.push(object);
    if (object.userData?.titin_region && !object.name?.startsWith('titin_halo_')) tubes.push(object);
  });
  assert.ok(halos.length > 0, 'titin needs a halo');
  assert.ok(tubes.length > 0, 'the halo must surround real region tubes, not replace them');
  // The mirrored half is a clone(), and clone() drops own-property raycast
  // overrides. Named here so the no-pick assertion below cannot go vacuous.
  const inMirroredHalf = (object) => {
    for (let cursor = object; cursor; cursor = cursor.parent) {
      if (cursor.name === 'half_sarcomere_mirrored') return true;
    }
    return false;
  };
  assert.ok(halos.some(inMirroredHalf), 'the mirrored half must carry halos too');
  // Exactly one halo per canonical region, per half.
  const segments = model.backboneAt(SL).segments;
  const perHalf = halos.filter((halo) => !inMirroredHalf(halo));
  assert.equal(perHalf.length, segments.length);
  assert.deepEqual(
    perHalf.map((halo) => halo.name).sort(),
    segments.map((segment) => `titin_halo_${segment.region_id}`).sort(),
  );
  for (const halo of halos) {
    assert.equal(halo.material.blending, THREE.AdditiveBlending);
    assert.equal(halo.material.depthWrite, false);
    assert.equal(halo.userData.emphasis_channel, 'presentation');
    // A halo must never be pickable: it would answer for geometry it is not.
    assert.equal(halo.raycast, THREE.Object3D.prototype.raycast);
  }
  assert.equal(scene.manifest.titin_emphasis.evidence_opacity_unchanged, true);
  scene.clear();
});

test('SC10: the halo stays on the representative strand', () => {
  const count = (scene, prefix) => {
    let n = 0;
    scene.root.traverse((object) => { if (object.name?.startsWith(prefix)) n += 1; });
    return n;
  };
  const one = build({ titinStrands: false });
  const six = build({ titinStrands: true });
  // The six-strand lattice really is drawing more titin...
  assert.ok(count(six, 'titin_region_') > count(one, 'titin_region_'),
    'the six-strand build must draw more region tubes than the one-strand build');
  // ...and the reading aid still appears exactly once, not once per copy. Six
  // stacked additive halos would be a glare, and would emphasise the schematic
  // lattice copies as strongly as the strand the trace is drawn for.
  assert.equal(count(six, 'titin_halo_'), count(one, 'titin_halo_'));
  one.clear();
  six.clear();
});

test('SC10: emphasis does not change any evidence opacity', () => {
  const scene = build();
  const opacities = [];
  scene.root.traverse((object) => {
    if (object.userData?.titin_region && object.userData.evidence_rendered) {
      opacities.push([object.name, object.material.opacity]);
    }
  });
  // Every titin region tube keeps the opacity its evidence class dictates.
  for (const [name, opacity] of opacities) {
    assert.ok(opacity <= 1 && opacity > 0, `${name}: implausible opacity ${opacity}`);
  }
  const highlighted = scene.setTitinRegionHighlight('PEVK');
  const after = [];
  scene.root.traverse((object) => {
    if (object.userData?.titin_region && object.userData.evidence_rendered) {
      after.push([object.name, object.material.opacity]);
    }
  });
  assert.deepEqual(after, opacities, 'selection must not touch evidence opacity');
  assert.ok(highlighted.highlighted_tubes > 0);
  scene.clear();
});
