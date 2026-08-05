/** SC-10 gates: titin reads as the subject without borrowing the evidence channel. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { SarcomereScene } from '../src/render/SarcomereScene.js';

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

test('SC10: every screen-space line material is registered and resolution-settable', () => {
  const scene = build();
  assert.ok(scene.screenSpaceLineMaterials.size > 0);
  const applied = scene.setLineResolution(1440, 900);
  assert.equal(applied.materials_updated, scene.screenSpaceLineMaterials.size);
  for (const material of scene.screenSpaceLineMaterials) {
    assert.equal(material.resolution.x, 1440);
    assert.equal(material.resolution.y, 900);
  }
  scene.clear();
});

test('SC10: clear() releases every tracked resource', () => {
  const scene = build();
  assert.ok(scene.disposables.size > 0);
  scene.clear();
  assert.equal(scene.disposables.size, 0);
  assert.equal(scene.screenSpaceLineMaterials.size, 0);
});
