/** SC-3 gates: Z-disc topology and M-band/bare-zone correction. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { TitinVisualization } from '../src/api/TitinVisualization.js';
import {
  ALIAS_THRESHOLD_PX, COMPONENTS, SarcomereScene,
} from '../src/render/SarcomereScene.js';
import { Viewer } from '../src/render/Viewer.js';
import { validateZDiscDetail } from '../src/geometry/ZDiscDetail.js';
import { validateMBandDetail } from '../src/geometry/MBandDetail.js';

const model = await TitinModel.create(nodeReader());
const sl = 2200;
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

function build(target = null, {
  viewWidthNm = 220, mirror = true, rings = 1, presentationMode = 'evidence',
} = {}) {
  const renderer = new SarcomereScene();
  renderer.build(model.contextSceneAt(sl, { rings }), model.domainInstancesAt(sl), {
    latticeScope: 'local', mirror, titinStrands: false,
    titinPath: model.backboneAt(sl),
    anchorDetail: target ? model.anchorDetailAt(sl, target, { rings }) : null,
    viewWidthNm, viewportPx: 1200, presentationMode,
  });
  return renderer;
}

function detailLOD({ opts, manifest, viewWidthNm }) {
  let rebuilds = 0;
  const fake = {
    lastBuildOpts: opts,
    sarcomere: { manifest },
    container: { clientWidth: 1200 },
    visibleWidthNm: () => viewWidthNm,
    currentSL: sl,
  };
  const changed = Viewer.prototype.checkDetailLOD.call(fake, () => { rebuilds += 1; });
  return { changed, rebuilds };
}

test('SC3: the 160 nm interval belongs only to the thick-filament bare zone', () => {
  const references = model.spec.sarcomere.reference_lengths_nm;
  assert.equal(references.thick_filament_bare_zone, 160);
  assert.equal(Object.hasOwn(references, 'm_line_bare_zone'), false);

  const thick = model.spec.sarcomere.components
    .find((component) => component.id === 'thick_filament');
  const mline = model.spec.sarcomere.components
    .find((component) => component.id === 'mline');
  assert.equal(thick.dimensions_nm.bare_zone_center, 160);
  assert.equal(Number.isFinite(mline.dimensions_nm.width_X), false);
  assert.match(mline.notes, /belongs to the thick-filament bare zone/i);

  const descriptor = model.sceneAt(sl).sarcomere.find((component) => component.id === 'mline');
  assert.equal(descriptor.transform.position_nm, sl / 2);
  assert.equal(descriptor.transform.axial_extent_nm, null);
  assert.equal(Object.hasOwn(descriptor.transform, 'width_nm'), false);
});

test('SC3: Z-disc detail is local, heterogeneous, antiparallel, and source-limited', () => {
  const detail = model.zdiscDetailAt(sl, { rings: 1 });
  assert.equal(detail.universal_lattice_rendered, false);
  assert.equal(detail.resolvability.evidence.feature_nm, 6);
  assert.notEqual(detail.resolvability.guided.feature_nm, 6);
  assert.doesNotMatch(detail.resolvability.guided.feature, /doublet/i);
  assert.deepEqual(detail.telethonin_complex.stoichiometry,
    { titin_z1z2: 2, telethonin: 1 });
  assert.deepEqual(detail.telethonin_complex.titin_chains.map((chain) => chain.direction),
    [1, -1]);
  assert.equal(detail.telethonin_complex.titin_chains
    .filter((chain) => chain.uses_existing_titin).length, 1);
  const intervals = detail.telethonin_complex.titin_chains.map((chain) => {
    const xs = chain.complex_points_nm.map((point) => point.x);
    return [Math.min(...xs), Math.max(...xs)];
  });
  const sharedStart = Math.max(...intervals.map(([start]) => start));
  const sharedEnd = Math.min(...intervals.map(([, end]) => end));
  assert.ok(sharedEnd > sharedStart, 'the two Z1Z2 proxies need a finite shared interval');
  assert.ok(detail.telethonin_complex.telethonin_proxy.start_nm.x >= sharedStart);
  assert.ok(detail.telethonin_complex.telethonin_proxy.end_nm.x <= sharedEnd);
  assert.ok(detail.alpha_actinin.doublet_detail.crosslink_sets
    .every((set) => set.kind === 'doublet'));
  assert.ok(detail.alpha_actinin.general_context.crosslink_sets
    .every((set) => set.kind === 'single'));
  assert.deepEqual(detail.alpha_actinin.doublet_detail.audience, ['EVIDENCE']);
  assert.match(detail.actin_network.not_claimed.join(' '), /end-to-end titin and actin/i);
  assert.ok(detail.actin_network.source_ids.includes('10.1016/j.cell.2021.02.047'));
  assert.ok(detail.telethonin_complex.source_ids.includes('10.1038/nature04343'));
});

test('SC3: the local Z-disc motif is invariant when the surrounding lattice expands', () => {
  const footprint = (rings) => model.zdiscDetailAt(sl, { rings }).actin_network.segments
    .map((segment) => [segment.start_nm.y, segment.start_nm.z]);
  assert.deepEqual(footprint(2), footprint(1));
  assert.deepEqual(footprint(3), footprint(1));
  const nearestRadius = Math.hypot(...footprint(3)[0]);
  assert.ok(footprint(3).every(([y, z]) => (
    Math.abs(Math.hypot(y, z) - nearestRadius) < 1e-9
  )), 'all selected actin proxies must remain on the nearest local ring');
});

test('SC3: M-band detail separates midpoint, head-free interval, and crosslink context', () => {
  const detail = model.mbandDetailAt(sl, { rings: 1 });
  assert.equal(detail.midpoint.x_nm, sl / 2);
  assert.equal(detail.midpoint.kind, 'coordinate_reference');
  assert.equal(Object.hasOwn(detail.midpoint, 'width_nm'), false);
  assert.equal(detail.bare_zone.width_nm, 160);
  assert.equal(detail.bare_zone.property_of, 'thick_filament_head_distribution');
  assert.equal(detail.crosslinks.length, 3);
  assert.ok(detail.crosslinks.every((link) => link.evidence_class === 'SCHEMATIC'));
  assert.equal(detail.titin_relationship.required_visible_halves, 2);
  assert.equal(detail.m1_density_rendered, false);
  assert.match(detail.crosslink_claim.not_claimed.join(' '), /exact myomesin\/OBSL1/i);
});

test('SC3: normal view has no anchor micro-detail and M-band is never a solid slab', () => {
  const renderer = build();
  assert.equal(renderer.manifest.anchor_detail, null);
  assert.equal(renderer.root.getObjectByName('zdisc_anchor_detail'), undefined);
  assert.equal(renderer.root.getObjectByName('mband_anchor_detail'), undefined);
  const midpoint = renderer.root.getObjectByName('mline');
  assert.equal(midpoint.geometry.type, 'BufferGeometry');
  assert.equal(midpoint.type, 'LineLoop');
  assert.equal(midpoint.userData.axial_extent_nm, null);
  const positions = midpoint.geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index += 1) {
    assert.equal(positions.getX(index), sl / 2,
      'every midpoint-marker vertex must stay on the exact zero-width plane');
  }
  assert.deepEqual(renderer.manifest.primitives_used.box, ['zdisc']);
  assert.equal(renderer.manifest.primitives_used.line_loop.includes('mline_midpoint_reference'), true);
  renderer.clear();
});

test('SC3: only the selected, screen-resolved anchor detail is drawn', () => {
  const zdisc = build('zdisc', { viewWidthNm: 200 });
  assert.equal(zdisc.manifest.anchor_detail.target, 'zdisc');
  assert.equal(zdisc.manifest.anchor_detail.drawn, true);
  assert.ok(zdisc.root.getObjectByName('zdisc_anchor_detail'));
  assert.equal(zdisc.root.getObjectByName('mband_anchor_detail'), undefined);
  assert.equal(zdisc.root.getObjectByName('zdisc').userData.presentation_muted_for_detail, true);
  assert.ok(zdisc.root.getObjectByName('alpha_actinin_zdisc_crosslinks'));
  assert.ok(zdisc.root.getObjectByName('telethonin_zdisc_sandwich'));
  assert.ok(zdisc.root.getObjectByName('titin_zdisc_opposing_z1z2'));
  assert.ok(zdisc.root.getObjectByName('titin_zdisc_canonical_z1z2_sandwich_proxy'));
  assert.equal(zdisc.manifest.anchor_detail.alpha_actinin_crosslinks, 5);
  assert.equal(zdisc.manifest.anchor_detail.alpha_actinin_doublets_rendered, true);
  assert.equal(zdisc.manifest.anchor_detail.alpha_actinin_doublet_spacing_nm, 6);
  assert.equal(zdisc.manifest.anchor_detail.telethonin_finite_overlap_rendered, true);
  assert.equal(Object.hasOwn(
    zdisc.manifest.anchor_detail, 'telethonin_shared_overlap_nm',
  ), false, 'schematic overlap size must not be reported as a measured dimension');
  zdisc.clear();

  const guided = build('zdisc', { viewWidthNm: 200, presentationMode: 'guided' });
  assert.equal(guided.manifest.anchor_detail.alpha_actinin_crosslinks, 3);
  assert.equal(guided.manifest.anchor_detail.alpha_actinin_doublets_rendered, false);
  assert.notEqual(guided.manifest.anchor_detail.feature_nm, 6);
  assert.doesNotMatch(guided.manifest.anchor_detail.feature, /doublet/i);
  assert.equal(Object.hasOwn(
    guided.manifest.anchor_detail, 'alpha_actinin_doublet_spacing_nm',
  ), false, 'Guided manifests must not expose the Evidence-only exact spacing');
  assert.equal(guided.root.getObjectByName('alpha_actinin_zdisc_crosslinks').count, 3);
  guided.clear();

  const mband = build('mline', { viewWidthNm: 220 });
  assert.equal(mband.manifest.anchor_detail.target, 'mline');
  assert.equal(mband.manifest.anchor_detail.drawn, true);
  assert.equal(mband.manifest.anchor_detail.midpoint_has_width, false);
  assert.equal(mband.manifest.anchor_detail.required_visible_titin_halves, 2);
  assert.equal(mband.manifest.anchor_detail.m1_density_rendered, false);
  assert.ok(mband.root.getObjectByName('half_sarcomere_mirrored'));
  assert.ok(mband.root.getObjectByName('mband_crosslink_sparse_context'));
  assert.equal(mband.root.getObjectByName('zdisc_anchor_detail'), undefined);
  mband.clear();

  const unresolved = build('zdisc', { viewWidthNm: 5000 });
  assert.equal(unresolved.manifest.anchor_detail.drawn, false);
  assert.ok(unresolved.manifest.anchor_detail.feature_px < ALIAS_THRESHOLD_PX);
  assert.match(unresolved.manifest.anchor_detail.omitted_because, /aliasing threshold/);
  assert.equal(unresolved.root.getObjectByName('zdisc_anchor_detail'), undefined);
  unresolved.clear();

  // The displayed value rounds to 2.00 px, but the raw 1.996 px value remains
  // below threshold and therefore must not admit the layer.
  const justBelowWidth = (1200 * 6) / 1.996;
  const justBelow = build('zdisc', { viewWidthNm: justBelowWidth });
  assert.equal(justBelow.manifest.anchor_detail.feature_px, 2);
  assert.equal(justBelow.manifest.anchor_detail.drawn, false);
  assert.equal(justBelow.root.getObjectByName('zdisc_anchor_detail'), undefined);
  justBelow.clear();
});

test('SC3: live LOD reevaluates crown, twist, and anchor gates exactly once', () => {
  const anchorOut = detailLOD({
    opts: { showContextDetail: false, anchorDetail: 'zdisc' },
    manifest: {
      anchor_detail: { drawn: true, feature_nm: 6, alias_threshold_px: 2 },
    },
    viewWidthNm: 5000,
  });
  assert.deepEqual(anchorOut, { changed: true, rebuilds: 1 });

  const anchorIn = detailLOD({
    opts: { showContextDetail: false, anchorDetail: 'zdisc' },
    manifest: {
      anchor_detail: { drawn: false, feature_nm: 6, alias_threshold_px: 2 },
    },
    viewWidthNm: 200,
  });
  assert.deepEqual(anchorIn, { changed: true, rebuilds: 1 });

  // Crown state already agrees (unresolved), but the larger crossover repeat has
  // independently crossed below threshold and must still cause one rebuild.
  const twistOut = detailLOD({
    opts: { showContextDetail: true },
    manifest: {
      context_detail: {
        crown_spacing_nm: 14.44, crossover_repeat_nm: 37,
        alias_threshold_px: 2, heads_drawn: false, twist_drawn: true,
      },
    },
    viewWidthNm: 30000,
  });
  assert.deepEqual(twistOut, { changed: true, rebuilds: 1 });

  const unchanged = detailLOD({
    opts: { showContextDetail: true, anchorDetail: 'zdisc' },
    manifest: {
      context_detail: {
        crown_spacing_nm: 14.44, crossover_repeat_nm: 37,
        alias_threshold_px: 2, heads_drawn: true, twist_drawn: true,
      },
      anchor_detail: { drawn: true, feature_nm: 6, alias_threshold_px: 2 },
    },
    viewWidthNm: 200,
  });
  assert.deepEqual(unchanged, { changed: false, rebuilds: 0 });
});

test('SC3: destructive controls reject a slab, single-ended telethonin, and one-half M detail', () => {
  const invalidM = structuredClone(model.mbandDetailAt(sl, { rings: 1 }));
  invalidM.midpoint.width_nm = 160;
  assert.throws(() => validateMBandDetail(invalidM), /cannot carry an M-band width/);

  const invalidZ = structuredClone(model.zdiscDetailAt(sl, { rings: 1 }));
  invalidZ.telethonin_complex.titin_chains.pop();
  assert.throws(() => validateZDiscDetail(invalidZ), /antiparallel/);

  const disjointSandwich = structuredClone(model.zdiscDetailAt(sl, { rings: 1 }));
  disjointSandwich.telethonin_complex.titin_chains[1].complex_points_nm
    .forEach((point) => { point.x -= 1000; });
  assert.throws(() => validateZDiscDetail(disjointSandwich), /finite shared overlap/);

  const detachedTelethonin = structuredClone(model.zdiscDetailAt(sl, { rings: 1 }));
  detachedTelethonin.telethonin_complex.telethonin_proxy.start_nm.y += 100;
  detachedTelethonin.telethonin_complex.telethonin_proxy.end_nm.y += 100;
  assert.throws(() => validateZDiscDetail(detachedTelethonin), /between both Z1Z2/);

  const guidedDoublets = structuredClone(model.zdiscDetailAt(sl, { rings: 1 }));
  guidedDoublets.alpha_actinin.doublet_detail.audience.push('GUIDED');
  assert.throws(() => validateZDiscDetail(guidedDoublets), /Evidence-only/);

  const driftedDoublet = structuredClone(model.zdiscDetailAt(sl, { rings: 1 }));
  driftedDoublet.alpha_actinin.doublet_detail.connectors[0].start_nm.x += 1;
  assert.throws(() => validateZDiscDetail(driftedDoublet), /drifted from sourced spacing/);

  assert.throws(() => build('mline', { mirror: false }), /requires mirrored titin/);
});

test('SC3: controls expose target gating and detail-only component ownership', () => {
  for (const component of ['alpha_actinin', 'telethonin', 'mband_crosslinks']) {
    assert.ok(Object.hasOwn(COMPONENTS, component));
    assert.ok(TitinVisualization.DETAIL_HIDDEN.includes(component));
  }
  const fake = {
    _displayOptions: {}, scale: 'context', viewer: { buildOpts: null },
    _optsForScale: TitinVisualization.prototype._optsForScale,
  };
  assert.equal(TitinVisualization.prototype.setDisplayOptions.call(fake, {
    anchorDetail: 'zdisc',
  }).anchorDetail, 'zdisc');
  assert.throws(() => TitinVisualization.prototype.setDisplayOptions.call(fake, {
    anchorDetail: 'both',
  }), /anchorDetail must be null, 'zdisc', or 'mline'/);
  assert.equal(TitinVisualization.prototype._optsForScale.call({
    _displayOptions: { anchorDetail: 'mline' },
  }, 'detail').anchorDetail, null);

  assert.match(page, /anchorDetail: \['zdisc', 'mline'\]\.includes\(state\.closeup\)/);
  assert.match(page, /if \(k === 'mline'\) state\.mirror = true/);
  assert.match(page, /M-band midpoint/);
  assert.match(packageJson.scripts['verify:sc3'], /check:build/);
});
