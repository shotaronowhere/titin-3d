/** SC-2 gates: titin-first hierarchy, continuity, landmarks and extension story. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import {
  createShowcaseOverlay, EXTENSION_MECHANISM, isLongitudinalProjection,
} from '../src/presentation/ShowcaseOverlay.js';
import {
  COMPONENT_COLOR, GUIDED_COMPONENT_COLOR, SarcomereScene, TITIN_RENDER_STYLE,
} from '../src/render/SarcomereScene.js';
import { VIEWS } from '../src/render/Viewer.js';

const model = await TitinModel.create(nodeReader());
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const states = model.presets().map((preset) => preset.sarcomere_length_nm);

function sceneSourceMetadata(scene) {
  const objects = [];
  scene.root.traverse((object) => {
    const metadata = Object.fromEntries(Object.entries(object.userData || {})
      .filter(([key]) => /evidence|source|reference|provenance/i.test(key)));
    if (Object.keys(metadata).length) objects.push({ name: object.name, metadata });
  });
  return {
    manifest_evidence: structuredClone(scene.manifest.evidence),
    objects,
  };
}

function buildScene(sl = 2200) {
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

test('SC2: every presentation descriptor is a derivative of canonical geometry', () => {
  for (const sl of states) {
    const overlay = createShowcaseOverlay(model, sl);
    const geometry = model.geometryAt(sl);
    const backbone = model.backboneAt(sl);
    assert.equal(overlay.schema, 'titin-showcase-overlay/1');
    assert.deepEqual(overlay.continuity.points, backbone.points);
    assert.deepEqual(overlay.continuity.segments, backbone.segments);
    assert.equal(overlay.continuity.render_only, true);
    assert.deepEqual(overlay.termini.map((record) => record.anchor_nm),
      [backbone.points[0], backbone.points.at(-1)]);
    assert.ok(Math.abs(overlay.extension_chart.total_nm - geometry.titin_iband_total_nm) < 1e-9);
    for (const region of overlay.extension_chart.regions) {
      assert.equal(region.extension_nm, geometry.titin_iband_extension_nm[region.id]);
      assert.equal(region.evidence_class, geometry.titin_partition_evidence_class);
      assert.equal(region.mechanism, EXTENSION_MECHANISM[region.id]);
    }
  }
});

test('SC2: band labels use sourced ranges and do not invent M-band substructure', () => {
  const overlay = createShowcaseOverlay(model, 2200);
  const byId = new Map(overlay.brackets.map((record) => [record.id, record]));
  assert.deepEqual(byId.get('zdisc'), {
    id: 'zdisc', label: 'Z-disc', lane: 'major', kind: 'range',
    start_nm: -25, end_nm: 25, evidence_class: 'MEASURED',
    source_ids: ['10.1371/journal.pone.0300348'],
  });
  assert.equal(byId.get('iband').end_nm, model.geometryAt(2200).thick_filament.X_start);
  assert.equal(byId.get('aband').end_nm, model.geometryAt(2200).mline.X);
  assert.equal(byId.get('bare_zone').end_nm - byId.get('bare_zone').start_nm, 160);
  assert.equal(byId.get('mband').kind, 'marker');
  assert.equal(byId.get('mband').start_nm, byId.get('mband').end_nm);
  assert.match(byId.get('mband').not_claimed, /resolved M1 line/i);
  for (const bracket of overlay.brackets) {
    assert.ok(bracket.source_ids.length > 0, `${bracket.id} must retain canonical sources`);
    assert.ok(Object.isFrozen(bracket.source_ids));
  }
});

test('SC2: screen-space brackets are admitted only for the live longitudinal camera', () => {
  const start = { x_px: 100, y_px: 200, visible: true };
  assert.equal(isLongitudinalProjection(start,
    { x_px: 900, y_px: 205, visible: true }), true);
  assert.equal(isLongitudinalProjection(start,
    { x_px: 900, y_px: 500, visible: true }), false,
  'a diagonal free-orbit view must suppress horizontal brackets');
  assert.equal(isLongitudinalProjection(start,
    { x_px: 150, y_px: 200, visible: true }), false,
  'an axial projection below the screen-space resolution limit must be suppressed');
  assert.equal(isLongitudinalProjection(start,
    { x_px: 900, y_px: 200, visible: false }), false);
  assert.equal(isLongitudinalProjection(
    { x_px: 900, y_px: 200, visible: true }, start), true,
  'a horizontal camera reversal remains a truthful longitudinal view');
});

test('SC2: the x-ray trace is exact, continuous and independent of tube radius', () => {
  const scene = buildScene();
  const canonical = model.backboneAt(2200);
  const traces = scene.root.getObjectByName('titin_continuity_traces');
  assert.ok(traces);
  assert.equal(traces.children.length, canonical.segments.length);
  for (const segment of canonical.segments) {
    const trace = traces.getObjectByName(`titin_continuity_trace_${segment.region_id}`);
    const positions = trace.geometry.getAttribute('position');
    assert.ok(Math.abs(positions.getX(0) - segment.X_start) < 1e-5);
    assert.ok(Math.abs(positions.getX(1) - segment.X_end) < 1e-5);
    assert.equal(trace.userData.coordinate_basis, 'exact canonical Level-0 segment endpoints');
  }
  for (const regionId of ['N2A', 'PEVK']) {
    const tube = scene.root.getObjectByName(`titin_region_${regionId}_strand_0`);
    assert.equal(tube.userData.render_radius_scale, TITIN_RENDER_STYLE.disordered_radius_scale);
  }
  const foldedTube = scene.root.getObjectByName('titin_region_prox_Ig_strand_0');
  assert.equal(foldedTube.userData.render_radius_scale, 1);
  scene.clear();
});

test('SC2: hierarchy and selection preserve geometry and evidence opacity', () => {
  const scene = buildScene();
  const thick = scene.root.getObjectByName('thick_filament_central');
  const tube = scene.root.getObjectByName('titin_region_PEVK_strand_0');
  const beforePosition = tube.geometry.getAttribute('position').array.slice();
  const beforeOpacity = [];
  scene.root.traverse((object) => {
    if (object.material?.opacity !== undefined) beforeOpacity.push(object.material.opacity);
  });
  scene.setPresentationEmphasis('guided');
  assert.equal(thick.material.color.getHex(), GUIDED_COMPONENT_COLOR.thick_filament);
  assert.equal(tube.material.color.getHex(), COMPONENT_COLOR.titin);
  const beforeSourceMetadata = sceneSourceMetadata(scene);
  const applied = scene.setTitinRegionHighlight('PEVK');
  assert.equal(applied.highlighted_trace_segments, 2);
  assert.equal(applied.highlighted_tubes, 2);
  assert.deepEqual(tube.geometry.getAttribute('position').array, beforePosition);
  const afterOpacity = [];
  scene.root.traverse((object) => {
    if (object.material?.opacity !== undefined) afterOpacity.push(object.material.opacity);
  });
  assert.deepEqual(afterOpacity, beforeOpacity);
  assert.deepEqual(sceneSourceMetadata(scene), beforeSourceMetadata,
    'selection must not rewrite evidence, source, reference, or provenance metadata');
  scene.setPresentationEmphasis('evidence');
  assert.equal(thick.material.color.getHex(), COMPONENT_COLOR.thick_filament);
  scene.clear();
});

test('SC2: the opening and mechanics story are present in the accessible shell', () => {
  assert.equal(VIEWS.titin_story.focus, 'titin_half');
  assert.equal(model.spec.presentation.initial_state.camera_preset, 'view.titin_story');
  assert.equal(model.spec.presentation.initial_state.selected_component_or_region, 'titin');
  assert.match(page, /id="scienceOverlay"/);
  assert.match(page, /id="extensionStory"[\s\S]*?id="extensionRows"/);
  assert.match(page, /visualization\.showcaseOverlay\(\)/);
  assert.match(page, /projectPresentationAnchors/);
  assert.match(page, /isLongitudinalProjection\(\s*projected\.get\('n_terminus'\)/);
  assert.match(page, /titinStrands:\s*state\.audienceMode === AUDIENCE_MODES\.evidence/);
  assert.match(page, /folded domains straighten[\s\S]*disordered chain extends/);
  assert.match(page, /#canvas \{[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/,
    'the WebGL canvas must not retain a wide-screen height at the mobile breakpoint');
  assert.match(page, /#canvas > canvas \{[^}]*position:\s*absolute;[^}]*height:\s*100% !important;/);
});
