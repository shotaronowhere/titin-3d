/**
 * Phase 10 — browser-experience completion gates.
 *
 * These tests target semantics behind the controls, not decoration: region
 * highlighting may change colour but never coordinates or evidence opacity;
 * navigation must terminate exactly, remain interruptible, and honor reduced
 * motion; isolated-titin framing must exclude hidden context geometry.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { TitinVisualization } from '../src/api/TitinVisualization.js';
import {
  Viewer, CAMERA_TRANSITION_MS, easeCameraTransition,
} from '../src/render/Viewer.js';
import {
  ANNOTATION_SCREEN_SCALE, COMPONENT_COLOR, SarcomereScene,
} from '../src/render/SarcomereScene.js';

const model = await TitinModel.create(nodeReader());
const PAGE_SOURCE = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const REGION_IDS = model.titinRegions().map((region) => region.id);

function colorDistance(a, b) {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function buildRegionScene(sl = 2200) {
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(sl, { rings: 1 }), model.domainInstancesAt(sl), {
    mirror: true,
    titinStrands: false,
    domainBatches: model.instancingPlanAt(sl),
    domainStrands: [0],
    titinPath: model.backboneAt(sl),
  });
  return scene;
}

test('PHASE10: the supported experience exposes every plan-named capability', () => {
  const viewer = readFileSync(new URL('../src/render/Viewer.js', import.meta.url), 'utf8');
  const facade = readFileSync(new URL('../src/api/TitinVisualization.js', import.meta.url), 'utf8');
  for (const flag of ['enableRotate', 'enableZoom', 'enablePan']) {
    assert.match(viewer, new RegExp(`controls\\.${flag}\\s*=\\s*true`), `${flag} must be explicit`);
  }
  for (const method of ['setScale', 'setSarcomereLength', 'setStructuralState',
    'setComponentVisibility', 'highlightTitinRegion', 'focusTitinRegion']) {
    assert.equal(typeof TitinVisualization.prototype[method], 'function', `${method} missing`);
  }
  assert.match(facade, /SCALES[\s\S]*context[\s\S]*detail/);
  assert.match(PAGE_SOURCE, /id="presets"/);
  assert.match(PAGE_SOURCE, /id="annotations"/);
  assert.match(PAGE_SOURCE, /id="evidenceToggle"/);

  const detailOptions = TitinVisualization.prototype._optsForScale.call(
    { _displayOptions: {} }, 'detail',
    { buildOpts: { showLattice: true, showDomains: false, mirror: true } },
  );
  assert.deepEqual(
    {
      showLattice: detailOptions.showLattice,
      showDomains: detailOptions.showDomains,
      showContextDetail: detailOptions.showContextDetail,
      mirror: detailOptions.mirror,
    },
    { showLattice: false, showDomains: true, showContextDetail: false, mirror: false },
    'isolated titin must be one molecule with detail present and context absent',
  );
});

test('PHASE10: region tubes use exactly the canonical Level-0 boundaries', () => {
  const sl = 2200;
  const canonical = model.backboneAt(sl);
  const scene = buildRegionScene(sl);
  const half = scene.root.getObjectByName('half_sarcomere');
  const strand = half.getObjectByName('titin_strand_0');
  assert.ok(strand, 'central titin strand missing');
  assert.deepEqual(strand.children.map((child) => child.userData.titin_region), REGION_IDS);
  assert.equal(strand.children.length, canonical.segments.length);

  for (const segment of canonical.segments) {
    const tube = strand.getObjectByName(`titin_region_${segment.region_id}_strand_0`);
    assert.ok(tube, `${segment.region_id}: region tube missing`);
    tube.geometry.computeBoundingBox();
    const bounds = tube.geometry.boundingBox;
    // BufferGeometry attributes are float32. The tolerance covers only that
    // representation step (well below any biologically meaningful distance).
    assert.ok(Math.abs(bounds.min.x - segment.X_start) < 1e-5,
      `${segment.region_id}: start ${bounds.min.x} != ${segment.X_start}`);
    assert.ok(Math.abs(bounds.max.x - segment.X_end) < 1e-5,
      `${segment.region_id}: end ${bounds.max.x} != ${segment.X_end}`);
  }
  scene.clear();
});

test('PHASE10: highlighting changes selection colour only — never geometry or evidence opacity', () => {
  const scene = buildRegionScene();
  const half = scene.root.getObjectByName('half_sarcomere');
  const domainMesh = (() => {
    let found = null;
    half.traverse((object) => {
      if (!found && object.isInstancedMesh
          && object.userData.instance_regions?.includes('prox_Ig')) found = object;
    });
    return found;
  })();
  assert.ok(domainMesh, 'a prox_Ig domain batch must exist');
  const index = domainMesh.userData.instance_regions.indexOf('prox_Ig');
  const beforeMatrix = new THREE.Matrix4();
  const afterMatrix = new THREE.Matrix4();
  domainMesh.getMatrixAt(index, beforeMatrix);
  const opacityBefore = [];
  scene.root.traverse((object) => {
    if (object.material?.opacity !== undefined) opacityBefore.push(object.material.opacity);
  });

  const applied = scene.setTitinRegionHighlight('prox_Ig');
  domainMesh.getMatrixAt(index, afterMatrix);
  assert.deepEqual(afterMatrix.elements, beforeMatrix.elements,
    'highlighting must not move or rotate a domain');
  assert.equal(applied.highlighted_tubes, 2, 'one selected tube in each mirrored half');
  assert.equal(applied.dimmed_tubes, (REGION_IDS.length - 1) * 2);
  assert.equal(applied.highlighted_domains, 77 * 2,
    'all proximal-Ig domains in both halves must be selected');
  assert.equal(scene.manifest.highlighted_titin_region, 'prox_Ig');

  const selectedColor = new THREE.Color();
  domainMesh.getColorAt(index, selectedColor);
  assert.ok(colorDistance(
    selectedColor, new THREE.Color(COMPONENT_COLOR.titin_highlight),
  ) < 1e-5);
  const opacityAfter = [];
  scene.root.traverse((object) => {
    if (object.material?.opacity !== undefined) opacityAfter.push(object.material.opacity);
  });
  assert.deepEqual(opacityAfter, opacityBefore,
    'selection must not alter the evidence/confidence opacity channel');

  scene.setTitinRegionHighlight(null);
  domainMesh.getColorAt(index, selectedColor);
  assert.ok(colorDistance(selectedColor, new THREE.Color(COMPONENT_COLOR.titin)) < 1e-5,
    'clearing selection must restore the identity colour');
  assert.equal(scene.manifest.highlighted_titin_region, null);
  scene.clear();
});

test('PHASE10: disordered regions highlight through the path without fake folded domains', () => {
  const scene = buildRegionScene();
  const applied = scene.setTitinRegionHighlight('PEVK');
  assert.equal(applied.highlighted_tubes, 2);
  assert.equal(applied.highlighted_domains, 0,
    'PEVK must not acquire folded-domain instances merely to support selection');
  assert.throws(() => scene.setTitinRegionHighlight('not_a_region'), /unknown region.*Known/i);
  scene.clear();
});

test('PHASE10: the biological facade focuses the canonical region span', () => {
  const scene = buildRegionScene();
  const calls = [];
  const facade = Object.create(TitinVisualization.prototype);
  facade.model = model;
  facade.viewer = {
    sarcomere: scene,
    focusSpan: (start, end, opts) => {
      calls.push({ start, end, opts });
      return { region_span_nm: end - start, animated: Boolean(opts.animate) };
    },
  };
  facade._state = { sarcomere_length_nm: 2200 };
  facade._highlightedRegion = null;

  const selected = facade.highlightTitinRegion('PEVK');
  assert.equal(selected.highlighted_tubes, 2);
  const report = facade.focusTitinRegion('PEVK', { animate: true });
  const segment = model.backboneAt(2200).segments.find((item) => item.region_id === 'PEVK');
  assert.deepEqual(calls[0], {
    start: segment.X_start, end: segment.X_end, opts: { animate: true },
  });
  assert.equal(report.region_id, 'PEVK');
  assert.equal(report.region_span_nm, segment.X_end - segment.X_start);
  assert.equal(facade.currentState().highlighted_titin_region, 'PEVK');
  assert.throws(() => facade.highlightTitinRegion('ghost'), /unknown region.*Known/i);

  // A length/scale change constructs an entirely new Three.js tree. The
  // biological selection must be re-applied rather than silently disappearing.
  const rebuilt = buildRegionScene(2450);
  facade.viewer.sarcomere = rebuilt;
  facade.viewer.lastNotes = [];
  facade.scale = 'context';
  const rebuiltReport = facade._report(2450, rebuilt.manifest);
  assert.equal(rebuiltReport.highlighted_titin_region, 'PEVK');
  assert.equal(rebuilt.manifest.highlighted_titin_region, 'PEVK');
  assert.equal(rebuiltReport.region_highlight_applied.highlighted_tubes, 2);
  rebuilt.clear();
  scene.clear();
});

test('PHASE10: component visibility synchronizes the public state report', () => {
  const scene = buildRegionScene();
  const facade = Object.create(TitinVisualization.prototype);
  facade.scale = 'context';
  facade.viewer = { sarcomere: scene };
  facade._userVisibility = {};
  facade._state = { manifest: scene.manifest, hidden_components: [] };
  facade.setComponentVisibility({ thick_filament: false });
  assert.ok(facade.currentState().hidden_components.includes('thick_filament'));
  assert.ok(!facade.currentState().hidden_components.includes('titin'));
  assert.ok(facade.currentState().visibility_applied.thick_filament > 0);
  scene.clear();
});

test('PHASE10: structural markers stay screen-sized during region focus', () => {
  const scene = buildRegionScene();
  const markerGroup = scene.setAnnotations([{
    id: 'test', anchor_nm: { x: 250, y: 0, z: 0 },
  }]);
  const marker = markerGroup.children[0];
  assert.equal(marker.material.sizeAttenuation, false);
  assert.deepEqual(marker.scale.toArray(), [
    ANNOTATION_SCREEN_SCALE, ANNOTATION_SCREEN_SCALE, ANNOTATION_SCREEN_SCALE,
  ]);
  assert.match(scene.manifest.annotations.marker_geometry, /fixed-size screen-space/);
  scene.clear();
});

test('PHASE10: zoom-driven rebuilds can refresh the public readout', () => {
  const facade = Object.create(TitinVisualization.prototype);
  let rebuild = null;
  facade.viewer = { start: (callback) => { rebuild = callback; } };
  facade.setSarcomereLength = (sl) => ({ sarcomere_length_nm: sl });
  let received = null;
  facade.start((report) => { received = report; });
  rebuild(2350);
  assert.deepEqual(received, { sarcomere_length_nm: 2350 });
  assert.throws(() => facade.start('not a callback'), /function or null/);
});

test('PHASE10: camera easing is bounded, symmetric, monotone, and terminates exactly', () => {
  assert.ok(CAMERA_TRANSITION_MS >= 300 && CAMERA_TRANSITION_MS <= 1200);
  assert.equal(easeCameraTransition(-1), 0);
  assert.equal(easeCameraTransition(0), 0);
  assert.equal(easeCameraTransition(0.5), 0.5);
  assert.equal(easeCameraTransition(1), 1);
  assert.equal(easeCameraTransition(2), 1);
  let previous = -1;
  for (let i = 0; i <= 100; i += 1) {
    const t = i / 100;
    const value = easeCameraTransition(t);
    assert.ok(value >= previous, `easing moved backwards at ${t}`);
    assert.ok(Math.abs(value + easeCameraTransition(1 - t) - 1) < 1e-12);
    previous = value;
  }

  const viewer = Object.create(Viewer.prototype);
  viewer.camera = new THREE.PerspectiveCamera(35, 1.6, 1, 10000);
  viewer.camera.position.set(0, 0, 100);
  viewer.controls = { target: new THREE.Vector3(0, 0, 0), update: () => {} };
  viewer.prefersReducedMotion = false;
  viewer._sceneRadius = 1000;
  const destination = new THREE.Vector3(100, 50, 400);
  const target = new THREE.Vector3(200, 0, 0);
  assert.equal(viewer._moveCamera(destination, target,
    { animate: true, durationMs: 1000, now: 0 }), true);
  assert.equal(viewer._advanceCameraTransition(500), true);
  assert.ok(viewer.camera.position.distanceTo(new THREE.Vector3(50, 25, 250)) < 1e-9);
  assert.equal(viewer._advanceCameraTransition(1000), false);
  assert.ok(viewer.camera.position.distanceTo(destination) < 1e-9);
  assert.ok(viewer.controls.target.distanceTo(target) < 1e-9);
  assert.equal(viewer._cameraTransition, null);
});

test('PHASE10: reduced-motion preference makes navigation immediate', () => {
  const viewer = Object.create(Viewer.prototype);
  viewer.camera = new THREE.PerspectiveCamera(35, 1.6, 1, 10000);
  viewer.camera.position.set(0, 0, 100);
  viewer.controls = { target: new THREE.Vector3(), update: () => {} };
  viewer.prefersReducedMotion = true;
  viewer._sceneRadius = 1000;
  const destination = new THREE.Vector3(10, 20, 30);
  const target = new THREE.Vector3(4, 5, 6);
  assert.equal(viewer._moveCamera(destination, target, { animate: true }), false);
  assert.ok(viewer.camera.position.distanceTo(destination) < 1e-9);
  assert.ok(viewer.controls.target.distanceTo(target) < 1e-9);
  assert.equal(viewer._cameraTransition, null);
});

test('PHASE10: detail framing excludes hidden context geometry', () => {
  const root = new THREE.Group();
  const near = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10));
  const farHidden = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100));
  farHidden.position.x = 10000;
  farHidden.visible = false;
  root.add(near, farHidden);
  const viewer = Object.create(Viewer.prototype);
  viewer.sarcomere = { root };
  const bounds = viewer._visibleBounds();
  assert.ok(bounds.max.x <= 5.001, `hidden context contaminated bounds: max.x=${bounds.max.x}`);
  near.geometry.dispose(); farHidden.geometry.dispose();
});

test('PHASE10: the page wires smooth scale/region navigation and accessible controls', () => {
  assert.match(PAGE_SOURCE, /setScale\(scale\)[\s\S]*?focusTitinRegion\([^)]*animate:\s*true/);
  assert.match(PAGE_SOURCE, /frame\([^)]*\{\s*animate:\s*true\s*\}/);
  assert.match(PAGE_SOURCE, /highlightTitinRegion\(state\.region\)/);
  assert.match(PAGE_SOURCE, /id="regions"/);
  assert.match(PAGE_SOURCE, /id="regionReadout"[^>]*aria-live="polite"/);
  assert.match(PAGE_SOURCE, /id="sl"[^>]*step="1"[^>]*aria-label=/);
  assert.match(PAGE_SOURCE, /aria-pressed/);
  assert.match(PAGE_SOURCE, /prefers-reduced-motion/);
  assert.match(PAGE_SOURCE, /drag: orbit[^<]*zoom[^<]*pan/);
  assert.match(PAGE_SOURCE, /DETAIL_DEPICTION[\s\S]*?mirror:\s*false/);
  assert.match(PAGE_SOURCE, /state\.region\)\s*visualization\.focusTitinRegion\(state\.region\)/,
    'length changes must keep a selected region in frame');
  assert.match(PAGE_SOURCE, /syncComponentButtons\(report\)/,
    'component controls must reflect effective scene visibility');
  assert.match(PAGE_SOURCE, /visualization\.start\(\(report\)\s*=>[\s\S]*?render\(report\)/,
    'LOD rebuilds must refresh the visible report');
});
