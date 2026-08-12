/** SC-2 gates: titin-first hierarchy, continuity, landmarks and extension story. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { TitinVisualization } from '../src/api/TitinVisualization.js';
import {
  createShowcaseOverlay, EXTENSION_MECHANISM, isLongitudinalProjection,
} from '../src/presentation/ShowcaseOverlay.js';
import {
  COMPONENT_COLOR, GUIDED_COMPONENT_COLOR, SarcomereScene,
} from '../src/render/SarcomereScene.js';
import { VIEWS } from '../src/render/Viewer.js';

const model = await TitinModel.create(nodeReader());
const TITIN_RENDER_STYLE = model.spec.renderStyle.titin;
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

/**
 * The two endpoints one continuity trace actually draws.
 *
 * SC-10 made the trace a Line2, whose `position` attribute is the unit quad every
 * segment is expanded into — not the segment. The endpoints live in the instanced
 * `instanceStart`/`instanceEnd` attributes, so these assertions read those and keep
 * checking the drawn geometry rather than a metadata copy of it.
 */
function traceEndpoints(trace) {
  const start = trace.geometry.getAttribute('instanceStart');
  const end = trace.geometry.getAttribute('instanceEnd');
  return [
    { x: start.getX(0), y: start.getY(0), z: start.getZ(0) },
    { x: end.getX(0), y: end.getY(0), z: end.getZ(0) },
  ];
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

test('SC2: immediate context is one myosin filament with its six nearest actin filaments', () => {
  const scene = new SarcomereScene();
  const root = scene.build(
    // A larger descriptor proves that local selection is geometric, not an
    // accidental dependency on the one-ring array order.
    model.contextSceneAt(2200, { rings: 2 }),
    model.domainInstancesAt(2200),
    {
      latticeScope: 'local', mirror: true, titinStrands: false,
      titinPath: model.backboneAt(2200), presentationMode: 'guided',
    },
  );
  assert.equal(scene.manifest.lattice.scope, 'local');
  assert.equal(scene.manifest.lattice.thick_drawn, 1);
  assert.equal(scene.manifest.lattice.thin_drawn, 6);
  assert.equal(scene.manifest.lattice.omitted_neighbour_thick, 18);
  assert.equal(root.getObjectByName('thick_filament_lattice'), undefined,
    'neighbouring thick-filament rings belong only to the extended lattice');
  assert.equal(root.getObjectByName('thin_filament_lattice').count, 5,
    'one nearest thin filament is the individual mesh and five share the instance batch');
  assert.equal(scene.manifest.titin_strands_drawn, 1,
    'local context must keep titin as the single legible subject');
  const representative = scene.manifest.representative_titin;
  const thickRadius = model.spec.sarcomere.components
    .find((component) => component.id === 'thick_filament').dimensions_nm.diameter / 2;
  assert.equal(representative.a_band_surface_bound, true);
  assert.ok(Math.abs(representative.a_band_transverse_offset_nm.radius - thickRadius) < 1e-9,
    'the one representative must retain the same surface radius as the six-strand model');
  assert.match(representative.azimuth_evidence, /^SCHEMATIC/);
  const aBandTrace = root.getObjectByName('titin_continuity_trace_Aband_super');
  for (const point of traceEndpoints(aBandTrace)) {
    assert.ok(Math.abs(Math.hypot(point.y, point.z) - thickRadius) < 1e-5,
      'the bright continuity trace must not return to the myosin axis');
  }
  const [nTerminus] = traceEndpoints(root.getObjectByName('titin_continuity_trace_Z1Z2'));
  assert.ok(Math.hypot(nTerminus.y, nTerminus.z) < 1e-9,
    'the declared render-only I-band taper must still meet the Z-disc axis');
  assert.match(scene.manifest.render_only.join(' '), /immediate filament neighbourhood/);
  scene.clear();
});

test('SC2: immediate context detail zips one central crown array to one central site', () => {
  const sl = 2200;
  const contextDetail = model.contextDetailSceneAt(sl, { rings: 1 });
  const expectedHeads = contextDetail.crowns[0].levels
    .reduce((count, level) => count + level.heads.length, 0);
  const scene = new SarcomereScene();
  const root = scene.build(model.contextSceneAt(sl, { rings: 1 }), model.domainInstancesAt(sl), {
    latticeScope: 'local', mirror: true, titinStrands: false,
    titinPath: model.backboneAt(sl), contextDetail,
    viewWidthNm: 120, viewportPx: 1200,
  });
  assert.equal(scene.manifest.context_detail.heads_drawn, true);
  assert.equal(scene.manifest.context_detail.head_instances, expectedHeads,
    'local mode must draw one crown array, not the seven-record patch payload');
  assert.equal(scene.manifest.context_detail.thick_filaments_detailed, 1);
  assert.equal(root.getObjectByName('myosin_heads_s2').count, expectedHeads);
  assert.equal(root.getObjectByName('myosin_heads_motor').count, expectedHeads);
  assert.equal(scene.manifest.context_detail.twist_drawn, true);
  assert.equal(scene.manifest.context_detail.thin_filaments_detailed, 6);
  assert.ok(root.getObjectByName('thin_filament_twist'));
  assert.throws(() => scene._crownHeads(contextDetail.crowns, [{ y: 0, z: 0 }], 'bad'),
    /crown\/site count mismatch/,
    'future crown/site drift must fail descriptively before dereferencing an undefined site');
  scene.clear();
});

test('SC2: filament-context and lattice-scope options are validated and persistent', () => {
  const fake = {
    _displayOptions: {}, scale: 'context', viewer: { buildOpts: null },
    _optsForScale: TitinVisualization.prototype._optsForScale,
  };
  const options = TitinVisualization.prototype.setDisplayOptions.call(fake, {
    showFilamentContext: false, latticeScope: 'local',
  });
  assert.equal(options.showFilamentContext, false);
  assert.equal(options.latticeScope, 'local');
  assert.throws(() => TitinVisualization.prototype.setDisplayOptions.call(fake, {
    latticeScope: 'neighbours',
  }), /latticeScope must be 'local' or 'patch'/);

  const visibility = TitinVisualization.prototype._applyScaleVisibility.call({
    scale: 'context',
    _displayOptions: { showFilamentContext: false },
    _presentationState: { audience_mode: 'evidence' },
    _userVisibility: null,
    viewer: { sarcomere: { setComponentVisibility: (value) => value } },
  });
  for (const component of [
    'thick_filament', 'thin_filament', 'thin_filament_twist', 'myosin_heads',
  ]) assert.equal(visibility[component], false, `${component} must follow the context toggle`);
  assert.equal(visibility.titin, true, 'the promoted context toggle must never hide titin');
});

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
  // SC-10 parks each region's emphasis halo in this same group, so the invariant
  // is one TRACE per canonical segment, not one child per canonical segment.
  const traceChildren = traces.children
    .filter((child) => child.name.startsWith('titin_continuity_trace_'));
  assert.equal(traceChildren.length, canonical.segments.length);
  for (const segment of canonical.segments) {
    const trace = traces.getObjectByName(`titin_continuity_trace_${segment.region_id}`);
    const [start, end] = traceEndpoints(trace);
    assert.ok(Math.abs(start.x - segment.X_start) < 5e-5);
    assert.ok(Math.abs(end.x - segment.X_end) < 5e-5);
    assert.equal(trace.userData.coordinate_basis,
      'exact canonical Level-0 axial segment endpoints; schematic representative-strand transverse offset');
  }
  for (const regionId of ['N2A', 'post_N2A_unknown', 'PEVK']) {
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
  // SC-12 moved this control to the stage bar, which is inserted after
  // #stageChrome — so the positional proxy this line used would now fail while
  // its stated intent still holds. The intent is asserted directly instead.
  const drawerOpen = page.indexOf('id="panel"');
  const drawerClose = page.indexOf('</aside>', drawerOpen);
  const toggleAt = page.indexOf('id="filamentContextToggle"');
  assert.ok(toggleAt > -1 && !(toggleAt > drawerOpen && toggleAt < drawerClose),
    'the immediate actin/myosin control must be on the stage, not in the Evidence drawer');
  assert.match(page, /id="filamentContextToggle"[\s\S]*?>Actin \+ myosin<\/button>/);
  assert.match(page, /const action = on \? 'Hide' : 'Show';[\s\S]*?aria-label/,
    'the promoted toggle must announce the action its next click will perform');
  assert.match(page, /latticeScope:\s*useExtendedLattice \? 'patch' : 'local'/);
  assert.match(page, /activeShowcaseOverlay\.termini\.map\(renderedTitinAnchor\)/,
    'terminus labels must project onto the rendered representative strand');
  assert.match(page, /\['extendedLattice', 'extended lattice'\]/,
    'additional lattice rings must remain an advanced Evidence control');
  assert.match(page, /id="extensionStory"[\s\S]*?id="extensionRows"/);
  assert.match(page, /visualization\.showcaseOverlay\(\)/);
  assert.match(page, /projectPresentationAnchors/);
  assert.match(page, /isLongitudinalProjection\(\s*projected\.get\('n_terminus'\)/);
  assert.match(page, /titinStrands:\s*false/);
  assert.match(page, /folded domains straighten[\s\S]*disordered chain extends/);
  assert.match(page, /#canvas \{[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/,
    'the WebGL canvas must not retain a wide-screen height at the mobile breakpoint');
  assert.match(page, /#canvas > canvas \{[^}]*position:\s*absolute;[^}]*height:\s*100% !important;/);
});
