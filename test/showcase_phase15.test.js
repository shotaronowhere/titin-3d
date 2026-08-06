/** SC-15 gates: the mechanism is visible and still says what it is. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { SarcomereScene } from '../src/render/SarcomereScene.js';

const model = await TitinModel.create(nodeReader());

const DISORDERED = ['N2A', 'PEVK'];

/**
 * Build one context scene the way the Viewer does.
 *
 * `SarcomereScene.build(scene, domains, opts)` takes DESCRIPTORS, not the model,
 * so this resolves them here exactly as `Viewer.setSarcomereLength()` does.
 * `mirror: false` is the default because the mirrored half is a cloned group
 * carried by a transform: its userData still records the UNMIRRORED canonical
 * interval, so reading coordinates off it would compare two different frames.
 */
function build(sl, options = {}) {
  const { mirror = false, presentationMode = 'guided' } = options;
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(sl, { rings: 1 }), model.domainInstancesAt(sl), {
    latticeScope: 'local',
    mirror,
    titinStrands: false,
    titinPath: model.backboneAt(sl),
    domainBatches: model.instancingPlanAt(sl),
    domainStrands: [0],
    presentationMode,
    viewWidthNm: 400,
    viewportPx: 1200,
  });
  return scene;
}

test('SC15: the disordered regions are drawn as a coil and declared schematic', () => {
  const scene = build(2200);
  const depiction = scene.manifest.disordered_depiction;
  assert.deepEqual([...depiction.regions].sort(), DISORDERED);
  assert.equal(depiction.evidence_class, 'SCHEMATIC');
  assert.ok(depiction.meaning.includes('not a measured conformation'));
  assert.ok(depiction.amplitude_nm > 0,
    'a resting chain far from its contour length must actually be coiled');
  scene.clear();
});

test('SC15: coiling never moves a canonical axial coordinate', () => {
  const geometry = model.geometryAt(2200);
  const scene = build(2200);
  const layout = geometry.titin_iband_layout_nm;
  let checked = 0;
  scene.root.traverse((object) => {
    const region = object.userData?.titin_region;
    if (!region || !layout[region]) return;
    const range = object.userData.axial_range_nm;
    if (!range) return;
    checked += 1;
    assert.ok(Math.abs(range[0] - layout[region].X_start) < 1e-6,
      `${region} start moved: ${range[0]} vs ${layout[region].X_start}`);
    assert.ok(Math.abs(range[1] - layout[region].X_end) < 1e-6,
      `${region} end moved: ${range[1]} vs ${layout[region].X_end}`);
  });
  assert.ok(checked >= DISORDERED.length,
    'every I-band region tube must publish the interval it was built from');
  scene.clear();
});

test('SC15: the coil is bounded by the canonical interval it decorates', () => {
  const geometry = model.geometryAt(2200);
  const layout = geometry.titin_iband_layout_nm;
  const scene = build(2200);
  const seen = new Set();
  scene.root.traverse((object) => {
    const region = object.userData?.titin_region;
    if (!DISORDERED.includes(region) || !object.geometry?.getAttribute) return;
    seen.add(region);
    const position = object.geometry.getAttribute('position');
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < position.count; i += 1) {
      min = Math.min(min, position.getX(i));
      max = Math.max(max, position.getX(i));
    }
    // The transverse detour is display-only: the drawn surface still starts and
    // ends exactly on the Level-0 interval, to render precision.
    assert.ok(Math.abs(min - layout[region].X_start) < 1e-3,
      `${region} coil starts at ${min}, not ${layout[region].X_start}`);
    assert.ok(Math.abs(max - layout[region].X_end) < 1e-3,
      `${region} coil ends at ${max}, not ${layout[region].X_end}`);
  });
  assert.deepEqual([...seen].sort(), DISORDERED);
  scene.clear();
});

test('SC15: stretching straightens the coil', () => {
  const short = build(2000);
  const long = build(2400);
  assert.ok(long.manifest.disordered_depiction.amplitude_nm
    < short.manifest.disordered_depiction.amplitude_nm,
  'a chain closer to its contour length must look straighter');
  short.clear(); long.clear();
});

test('SC15: the coil is driven by the same contour length the mechanics use', () => {
  const scene = build(2200);
  const contours = scene.manifest.disordered_depiction.contour_length_nm;
  const spec = new Map(model.spec.titin.regions.map((region) => [region.id, region]));
  for (const region of DISORDERED) {
    assert.equal(contours[region], spec.get(region).extension_model.max_end2end_nm,
      `${region} must coil against titin.json's contour, not a renderer constant`);
  }
  scene.clear();
});

test('SC15: the folded regions are never coiled', () => {
  const scene = build(2000);
  scene.root.traverse((object) => {
    const region = object.userData?.titin_region;
    if (!region || DISORDERED.includes(region)) return;
    assert.equal(object.userData.disordered_depiction, null,
      `${region} has folded domains and must not be drawn as a bare coil`);
  });
  scene.clear();
});
