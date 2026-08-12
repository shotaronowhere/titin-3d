/** SC-20 gates: reviewed architecture, linked A/M geometry, and deterministic depiction. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { SPEC_FILES } from '../src/model/SpecLoader.js';
import {
  MODEL_INPUTS, buildInputsFingerprint, modelFingerprint,
} from '../scripts/build_identity.mjs';
import { SarcomereScene } from '../src/render/SarcomereScene.js';

const model = await TitinModel.create(nodeReader());
const byRegion = new Map(model.spec.titin.regions.map((region) => [region.id, region]));

function build(sl = 2200) {
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(sl, { rings: 1 }), model.domainInstancesAt(sl), {
    latticeScope: 'local', mirror: false, titinStrands: false,
    titinPath: model.backboneAt(sl), domainBatches: model.instancingPlanAt(sl),
    domainStrands: [0], presentationMode: 'evidence', viewWidthNm: 400, viewportPx: 1200,
  });
  return scene;
}

test('SC20: owner-authorized rulings are consumable without claiming human review', () => {
  const record = model.spec.scientificDecisions;
  assert.equal(record.schema, 'titin-scientific-decisions/2');
  assert.equal(record.review_policy.kind, 'owner_authorized_citation_backed_ai_adjudication');
  assert.equal(record.review_policy.human_expert_review_claimed, false);
  assert.deepEqual(Object.fromEntries(Object.entries(record.decisions)
    .map(([id, row]) => [id, row.status])), {
    'SD-01': 'APPROVED', 'SD-02': 'DEFERRED', 'SD-03': 'APPROVED',
    'SD-04': 'DEFERRED', 'SD-05': 'APPROVED',
  });
  for (const row of Object.values(record.decisions)) {
    assert.equal(row.reviewer, null);
    assert.equal(row.adjudicator.human_expert, false);
    assert.equal(row.independent_human_review_status, 'NOT_PERFORMED');
  }
});

test('SC20: live region boundaries implement the approved Q8WZ42-1 partition', () => {
  assert.deepEqual(model.spec.titin.regions.map((region) => [
    region.id, region.residue_span.start, region.residue_span.end,
  ]), [
    ['Z1Z2', 1, 800], ['prox_Ig', 801, 9365], ['N2A', 9366, 9851],
    ['post_N2A_unknown', 9852, 10215], ['PEVK', 10216, 12022],
    ['dist_Ig', 12023, 14018], ['Aband_super', 14019, 32177],
    ['kinase', 32178, 32432], ['Mline', 32433, 34350],
  ]);
  assert.equal(byRegion.get('prox_Ig').domain_composition.Ig_like, 74);
  assert.equal(byRegion.get('N2A').domain_composition.Ig_like, 4);
  assert.equal(byRegion.get('dist_Ig').domain_composition.Ig_like, 16);
  const unresolved = byRegion.get('post_N2A_unknown');
  assert.equal(unresolved.mechanical_class, 'excluded_unknown');
  assert.equal(unresolved.extension_model.physical_contour_nm, null);
  assert.equal(unresolved.extension_model.mechanics_included, false);
});

test('SC20: imported, curated, and rendered domain totals are not collapsed', () => {
  const totals = model.spec.titin.domain_totals;
  assert.deepEqual({
    imported: totals.uniprot_domain_feature_count.Ig_like,
    curated: totals.curated_biological_domain_count.Ig_like,
    rendered: totals.rendered_domain_count.Ig_like,
  }, { imported: 152, curated: 153, rendered: 153 });
  const n2a = model.domainInstancesAt(2200).instances
    .filter((instance) => instance.domain_id.startsWith('N2A.'));
  assert.equal(n2a.filter((instance) => instance.folded_domains).length, 4);
  assert.equal(n2a.filter((instance) => !instance.folded_domains).length, 1);
  assert.deepEqual(n2a.filter((instance) => instance.folded_domains)
    .map((instance) => instance.sequence_position.label), ['I80', 'I81', 'I82', 'I83']);
  const un2a = n2a.find((instance) => instance.domain_class === 'N2A');
  assert.equal(un2a.representative_pdb_id, '7NIP');
  assert.equal(un2a.contains_structured_core, true);
  assert.deepEqual(un2a.structured_core.sequence_position, { start: 9504, end: 9544 });
  assert.match(un2a.structured_core.fold, /three-helix/i);
  assert.doesNotMatch(JSON.stringify(un2a), /no stable fold|intrinsically disordered/i);
});

test('SC20: A/M display allocations are continuous, non-metric, and kinase-bounded', () => {
  const ids = ['Aband_super', 'kinase', 'Mline'];
  const rows = ids.map((id) => byRegion.get(id));
  for (const row of rows) {
    const position = row.resting_axial_position_nm;
    assert.equal(position.axial_length_nm, position.X_end - position.X_start);
    assert.equal(row.dimensions_nm.axial_length_X, position.axial_length_nm);
    assert.equal(row.axial_placement.kind, 'SCHEMATIC_DISPLAY_ALLOCATION');
    assert.equal(row.axial_placement.scientific_axial_length_nm, null);
  }
  for (let i = 1; i < rows.length; i += 1) {
    assert.equal(rows[i - 1].resting_axial_position_nm.X_end,
      rows[i].resting_axial_position_nm.X_start);
  }
  const envelope = byRegion.get('kinase').axial_placement.envelope_nm_from_sarcomere_midpoint;
  assert.deepEqual(envelope, { near: 70, far: 105, statistical_confidence_interval: false });
  assert.equal(byRegion.get('Mline').resting_axial_position_nm.X_end, 1100);
});

test('SC20: sequence composition, axial spacings, and register hypothesis stay distinct', () => {
  const p = byRegion.get('Aband_super').periodicity_quantities;
  assert.equal(p.c_zone_sequence_super_repeat_domain_count.value, 11);
  assert.equal(p.rabbit_psoas_mean_titin_domain_spacing_nm.value, 3.98);
  assert.deepEqual(p.rabbit_psoas_mean_titin_domain_spacing_nm.confidence_interval_95_nm,
    [3.92, 4.03]);
  assert.equal(p.derived_11_domain_interval_nm.value, 43.78);
  assert.equal(p.myosin_head_H_periodicity_nm.value, 43.17);
  assert.equal(p.myosin_crown_spacing_nm.value, 14.3);
  assert.equal(p.thick_filament_L_periodicity_nm.value, 45.54);
  assert.equal(p.L_periodicity_titin_origin_hypothesis.evidence_class, 'INFERRED');
  assert.equal('titin_super_repeat_nm' in p, false);
  assert.match(p.thick_filament_L_periodicity_nm.not_claimed,
    /not.*exact molecular length|exact molecular length/i);
});

test('SC20: render style is required build input and excluded from model identity', () => {
  assert.ok(SPEC_FILES.includes('render_style.json'));
  assert.ok(!MODEL_INPUTS.includes('data/render_style.json'));
  assert.equal(model.spec.renderStyle.schema, 'titin-render-style/1');
  assert.equal(model.spec.renderStyle.algorithm.prng, 'mulberry32');
  const source = readFileSync(new URL('../src/render/SarcomereScene.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Math\.random|Date\.now|performance\.now/);
});

test('SC20: a render-style-only mutation changes build identity but not model identity', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const originalRead = (path) => readFileSync(join(root, path));
  const stylePath = 'data/render_style.json';
  const originalStyle = JSON.parse(String(originalRead(stylePath)));
  const mutatedStyle = Buffer.from(JSON.stringify({
    ...originalStyle,
    render_seed: originalStyle.render_seed + 1,
  }));
  const mutatedRead = (path) => (path === stylePath ? mutatedStyle : originalRead(path));
  const manifest = {
    schema: 'titin-build-input-manifest/1',
    dependencies: [],
    inputs: [{ path: stylePath }],
  };
  assert.equal(modelFingerprint({ root, read: originalRead }),
    modelFingerprint({ root, read: mutatedRead }));
  assert.notEqual(buildInputsFingerprint(manifest, { root, read: originalRead }),
    buildInputsFingerprint(manifest, { root, read: mutatedRead }));
});

test('SC20: irregular ribbons are deterministic, bounded, and endpoint-preserving', () => {
  const first = build();
  const second = build();
  const report = first.manifest.disordered_depiction;
  assert.equal(report.algorithm.id, 'seeded-irregular-ensemble-ribbon');
  assert.equal(report.render_seed, 20260812);
  assert.deepEqual(report.descriptor_fingerprint_by_region,
    second.manifest.disordered_depiction.descriptor_fingerprint_by_region);
  assert.deepEqual([...report.regions].sort(), ['N2A', 'PEVK', 'post_N2A_unknown'].sort());
  for (const [id, row] of Object.entries(report.by_region)) {
    assert.ok(row.maximum_transverse_offset_nm <= row.declared_envelope_nm + 1e-9, id);
    assert.deepEqual(row.canonical_endpoints_nm, row.rendered_endpoints_nm, id);
  }
  assert.equal(report.by_region.N2A.representation_semantics.contains_structured_core, true);
  assert.equal(report.by_region.N2A.representation_semantics.representative_pdb_id, '7NIP');
  assert.match(report.meaning, /structured UN2A core/i);
  assert.doesNotMatch(JSON.stringify(report.by_region.N2A), /no stable fold/i);
  first.clear(); second.clear();
});

test('SC20: the public application requests one representative titin only', () => {
  const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
  assert.match(page, /titinStrands:\s*false/);
  assert.doesNotMatch(page, /titinStrands:\s*state\.audienceMode/);
  assert.match(page, /Representative titin paths built/);
  assert.doesNotMatch(page, /Titin strands built/);
  const scene = build();
  assert.equal(scene.manifest.titin_strands_drawn, 1);
  assert.equal(scene.manifest.representative_titin.copy_number_claimed, false);
  scene.clear();
});
