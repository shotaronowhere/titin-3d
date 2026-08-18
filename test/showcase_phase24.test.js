/** SC-24 gates: semantic state truth, URL v2, hierarchy, and stretch framing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { TitinVisualization, SCALES } from '../src/api/TitinVisualization.js';
import { COMPONENTS } from '../src/render/SarcomereScene.js';
import { VIEWS, CLOSEUPS } from '../src/render/Viewer.js';
import {
  CONTROL_SCENE_IDS, DEPTHS, SCENE_LAYER_KEYS, SceneController,
  resolveScene, sceneMatch,
} from '../src/presentation/SceneController.js';
import { createVisualMatrix } from '../src/presentation/VisualMatrix.js';

const model = await TitinModel.create(nodeReader());
const regions = model.titinRegions().map((region) => region.id);
const components = Object.keys(COMPONENTS);
const { min, max } = model.slRange();
const capabilities = {
  views: Object.keys(VIEWS), closeups: Object.keys(CLOSEUPS),
  scales: Object.values(SCALES), targets: [...regions, ...components],
  regionTargets: regions, componentTargets: components, minLength: min, maxLength: max,
  claimIds: model.spec.claimSupport.claims.map((claim) => claim.id),
};
const controller = new SceneController(model.spec.scenes, capabilities,
  { presentation: model.spec.presentation });
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');

test('SC24: seven human semantic controls resolve purely from the declarative catalog', () => {
  assert.deepEqual(controller.order, CONTROL_SCENE_IDS);
  assert.deepEqual(controller.order.map((id) => controller.scene(id).label), [
    'Overview', 'Titin alone', 'Spring', 'Architecture', 'Z-anchor',
    'A-band scaffold', 'Lattice',
  ]);
  const current = controller.defaultState({ sarcomere_length_nm: 2317 });
  const snapshot = structuredClone(current);
  for (const id of controller.order) {
    const direct = resolveScene(id, current, model.spec.scenes);
    const resolved = controller.resolveScene(id, current);
    assert.equal(direct.sceneId, id);
    assert.equal(resolved.scene_id, id);
    assert.equal(resolved.sarcomere_length_nm, 2317, `${id} must preserve length`);
    assert.ok(sceneMatch(controller.scene(id), resolved), id);
  }
  assert.deepEqual(current, snapshot, 'resolution must not mutate current state');
});

test('SC24: complete meaningful state—not the last clicked button—owns active truth', () => {
  const overview = controller.defaultState();
  assert.equal(controller.matchingSceneId(overview), 'overview');
  const manualCamera = { ...overview, camera_preset: 'view.oblique' };
  assert.equal(controller.reconcile(manualCamera).scene_id, null);
  const layerChange = structuredClone(overview);
  layerChange.layers.show_context_detail = true;
  assert.equal(controller.reconcile(layerChange).scene_id, null);
  const ringChange = controller.resolveScene('lattice', overview);
  ringChange.layers.lattice_rings_1 = false;
  ringChange.layers.lattice_rings_2 = true;
  assert.equal(controller.reconcile(ringChange).scene_id, null);
  assert.equal(controller.reconcile(controller.resolveScene('lattice', ringChange)).scene_id, 'lattice');
});

test('SC24: canonical v2 scene and Custom URLs round-trip without mixed representations', () => {
  const scene = controller.resolveScene('a_band_scaffold', controller.defaultState({
    story_step: 'scaffold_thick_filament', sarcomere_length_nm: 2375,
  }));
  const sceneHash = controller.serialize(scene);
  assert.equal(sceneHash,
    '#v=2&depth=learn&step=scaffold_thick_filament&sl=2375&drawer=closed'
    + '&scene=a_band_scaffold&confidence=0');
  assert.doesNotMatch(sceneHash, /camera=|layers=/);
  assert.deepEqual(controller.parse(sceneHash), { state: scene, issues: [], migrated: false });

  const custom = structuredClone(scene);
  custom.scene_id = null;
  custom.depth = DEPTHS.explore;
  custom.drawer = 'measure';
  custom.confidence_display = true;
  custom.layers.extended_lattice = true;
  const customHash = controller.serialize(custom);
  assert.match(customHash, /^#v=2&depth=explore&step=/);
  assert.doesNotMatch(customHash, /(?:^|&)scene=/);
  const encodedLayers = new URLSearchParams(customHash.slice(1)).get('layers').split(',');
  assert.deepEqual(encodedLayers, SCENE_LAYER_KEYS.filter((key) => custom.layers[key]));
  assert.deepEqual(controller.parse(customHash), { state: custom, issues: [], migrated: false });
});

test('SC24: every v1 mode migrates deterministically and only inexact values produce issues', () => {
  const learn = controller.parse(
    '#mode=guided&step=architecture&sl=2317&scale=detail&camera=region.prox_Ig&target=titin_domains&evidence=0',
  );
  assert.equal(learn.migrated, true);
  assert.equal(learn.state.depth, 'learn');
  assert.equal(learn.state.drawer, 'closed');
  assert.equal(learn.state.story_step, 'molecular_architecture');
  assert.equal(learn.state.sarcomere_length_nm, 2317);
  assert.equal(learn.state.camera_preset, 'region.prox_Ig');
  assert.equal(learn.state.selection.id, 'titin_domains');
  assert.deepEqual(learn.issues, []);

  const explore = controller.parse('#mode=evidence&step=anchors&sl=2200&evidence=1');
  assert.equal(explore.state.depth, 'explore');
  assert.equal(explore.state.drawer, 'inspect');
  assert.equal(explore.state.confidence_display, true);
  assert.deepEqual(explore.issues, []);

  const inexact = controller.parse('#mode=expert&step=missing&sl=9999&camera=free.any');
  assert.ok(inexact.issues.length >= 4, inexact.issues.join('\n'));
  assert.match(inexact.issues.join(' '), /no exact v2 equivalent/i);
});

test('SC24: a conflicting scene plus custom representation visibly becomes Custom', () => {
  const hash = '#v=2&depth=learn&step=meet_sarcomere&sl=2200&drawer=closed&scene=overview'
    + '&camera=view.oblique&scale=context&target=titin&context=1'
    + '&layers=lattice_rings_1%2Cmirror%2Cshow_lattice&confidence=0';
  const decoded = controller.parse(hash);
  assert.equal(decoded.state.scene_id, null);
  assert.match(decoded.issues.join(' '), /conflicts with custom fields.*Custom/i);
  assert.doesNotMatch(controller.serialize(decoded.state), /(?:^|&)scene=/);
});

test('SC24: v2 repairs renderer invariants visibly and serialization rejects impossible state', () => {
  const contextMismatch = controller.parse(
    '#v=2&depth=learn&step=meet_sarcomere&sl=2200&drawer=closed'
      + '&camera=view.titin_story&scale=detail&target=titin&context=1'
      + '&layers=lattice_rings_1%2Cshow_domains&confidence=0',
  );
  assert.equal(contextMismatch.state.context, false);
  assert.match(contextMismatch.issues.join(' '), /Context must agree with scale/i);
  const repairedHash = controller.serialize(contextMismatch.state);
  assert.match(repairedHash, /context=0/);
  assert.deepEqual(controller.parse(repairedHash).issues, []);

  const closeup = controller.parse(
    '#v=2&depth=explore&step=meet_sarcomere&sl=2200&drawer=closed'
      + '&camera=closeup.mline&scale=context&target=none&context=1'
      + '&layers=lattice_rings_1&confidence=1',
  );
  assert.equal(closeup.state.layers.show_lattice, true);
  assert.equal(closeup.state.layers.mirror, true);
  // The myosin-head/actin-twist layer is a scene default, not a camera
  // implication, so an explicit link that leaves it off is honoured.
  assert.equal(closeup.state.layers.show_context_detail, false);
  assert.match(closeup.issues.join(' '), /requires 'show_lattice'.*full sarcomere/is);
  assert.deepEqual(controller.parse(controller.serialize(closeup.state)).issues, []);

  const impossible = structuredClone(controller.defaultState());
  impossible.scene_id = null;
  impossible.context = false;
  assert.throws(() => controller.serialize(impossible), /context does not agree with scale/);
});

test('SC24: runtime catalog validation resolves control-scene claims when supplied', () => {
  const corrupted = structuredClone(model.spec.scenes);
  corrupted.control_scenes.overview.claim_ids.push('invented_claim');
  assert.throws(
    () => new SceneController(corrupted, capabilities, { presentation: model.spec.presentation }),
    /canonical claim IDs/,
  );
  const extra = structuredClone(model.spec.scenes);
  extra.control_scenes.extra = structuredClone(extra.control_scenes.overview);
  extra.control_scene_order.push('extra');
  assert.throws(
    () => new SceneController(extra, capabilities, { presentation: model.spec.presentation }),
    /control scenes must be exactly/,
  );
});

test('SC24: responsive shell exposes story, semantic, contextual, More, and stretch contracts', () => {
  for (const id of [
    'storyReopen', 'guidedCardToggle', 'sceneControls', 'sceneTruth', 'sceneDetails',
    'sceneRingControls', 'sceneMyosinToggle', 'stageMore', 'moreSheet', 'closeMore',
    'stagePlay', 'stageReset', 'stretchHint',
  ]) assert.match(page, new RegExp(`id="${id}"`), id);
  assert.match(page, /role="dialog" aria-modal="true"/);
  assert.match(page, /STORY_SESSION_KEY/);
  assert.match(page, /sessionStorage\.setItem/);
  assert.match(page, /focusableMoreControls/);
  assert.match(page, /titin:manual-camera-change/);
  assert.match(page, /frameStretchSweep\(sweepRange\.max/);
  assert.match(page, /Watch the I-band bracket/);
  assert.match(page, /--supported-start/);
  assert.match(page, /supportedRangeDescription/);
  assert.doesNotMatch(page, /\.stage-row \{[^}]*overflow-x:\s*auto/s,
    'primary mobile architecture must not be a horizontal strip');
});

test('SC24: visual matrix is regenerated from v2 semantic scenes with legacy disposition', () => {
  const matrix = createVisualMatrix(model, {
    views: Object.keys(VIEWS), closeups: Object.keys(CLOSEUPS),
    scales: Object.values(SCALES), targets: [...regions, ...components],
    regionTargets: regions, componentTargets: components, minLength: min, maxLength: max,
  });
  assert.equal(matrix.schema, 'titin-visual-matrix/2');
  assert.equal(matrix.cells.length, 56);
  assert.deepEqual(
    matrix.cells.filter((cell) => cell.group === 'semantic_scenes').map((cell) => cell.id),
    CONTROL_SCENE_IDS.map((id) => `scene_${id}`),
  );
  assert.ok(matrix.cells.every((cell) => cell.url_hash.startsWith('#v=2&')));
  for (const row of matrix.legacy_disposition) {
    assert.equal(matrix.cells.some((cell) => cell.id === row.old_cell_id), false);
    assert.equal(matrix.cells.some((cell) => cell.id === row.new_cell_id), true);
  }
});

test('SC24: a close-up scene can turn its context-detail layer off and still share', () => {
  const lattice = controller.resolveScene('lattice', controller.defaultState());
  const detailOff = controller.update(lattice, {
    layers: { ...lattice.layers, show_context_detail: false },
  });
  assert.equal(detailOff.scene_id, null, 'the detail layer is part of scene meaning');
  const hash = controller.serialize(detailOff);
  const decoded = controller.parse(hash);
  assert.deepEqual(decoded.issues, []);
  assert.equal(decoded.state.camera_preset, 'closeup.lattice');
  assert.equal(decoded.state.layers.show_context_detail, false);
  assert.deepEqual(decoded.state, detailOff);
});

test('SC24: a close-up still refuses to serialize without its filament lattice', () => {
  const lattice = controller.resolveScene('lattice', controller.defaultState());
  const latticeOff = controller.update(lattice, {
    layers: { ...lattice.layers, show_lattice: false },
  });
  assert.throws(() => controller.serialize(latticeOff), /close-up camera requires the filament lattice/);
});

test('SC24: Explore confidence display keeps semantic scene truth and shares as one field', () => {
  const explore = controller.defaultState();
  explore.depth = DEPTHS.explore;
  explore.drawer = 'inspect';
  const lattice = controller.resolveScene('lattice', explore);
  lattice.confidence_display = true;
  assert.equal(controller.reconcile(lattice).scene_id, 'lattice');
  const hash = controller.serialize(lattice);
  assert.equal(hash,
    '#v=2&depth=explore&step=meet_sarcomere&sl=2200&drawer=inspect&scene=lattice&confidence=1');
  assert.deepEqual(controller.parse(hash), { state: lattice, issues: [], migrated: false });
});

test('SC24: the stage shortcut legend names current surfaces, not retired modes', () => {
  const legend = page.match(/id="shortcutHelp">([\s\S]*?)<\/span>/)?.[1];
  assert.ok(legend, 'the stage must carry a visible shortcut legend');
  assert.match(legend, /x spring/i);
  assert.match(legend, /e explore/i);
  assert.match(legend, /g learn/i);
  assert.doesNotMatch(legend, /extension|evidence|guided/i,
    'the legend must not name retired actions or audience modes');
});
