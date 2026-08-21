/** SC-26 gates: pure expert models and deterministic reproducible exports. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { COMPONENTS } from '../src/render/SarcomereScene.js';
import { VIEWS, CLOSEUPS } from '../src/render/Viewer.js';
import { SCALES } from '../src/api/TitinVisualization.js';
import { createCompliancePlot } from '../src/presentation/CompliancePlot.js';
import { createForceCurve } from '../src/presentation/ForceCurve.js';
import {
  createBoundaryWorksheet,
  createEvidenceGroups,
  createInspectionView,
  createParameterTable,
  createReferenceDomainStrip,
  createReproductionWorksheet,
  modelInputManifestFingerprint,
  REPRODUCTION_INPUT_PATHS,
} from '../src/presentation/ParameterTable.js';
import {
  EXPORT_CONTRACT,
  EXPORT_CONTRACT_CANONICAL,
  EXPORT_CONTRACT_FINGERPRINT,
  FORCE_CSV_COLUMNS,
  parseCsv,
  RESEARCH_CAMERA_PRESETS,
  RESEARCH_LAYER_KEYS,
  REGIONAL_CSV_COLUMNS,
  researchExport,
  validateResearchExport,
} from '../src/presentation/ResearchExport.js';
import { sha256Text } from '../src/presentation/DeterministicHash.js';
import {
  SceneController, SCENE_LAYER_KEYS,
} from '../src/presentation/SceneController.js';
import {
  MODEL_INPUTS, readEmbeddedInputManifest, readEmbeddedResearchIdentity,
} from '../scripts/build_identity.mjs';

const standalone = readFileSync(new URL('../index.html', import.meta.url));
const identity = readEmbeddedResearchIdentity(standalone);
const manifest = readEmbeddedInputManifest(standalone);
const model = await TitinModel.create(nodeReader(), { identity });
const { min, max } = model.slRange();
const regions = model.titinRegions().map((row) => row.id);
const components = Object.keys(COMPONENTS);
const controller = new SceneController(model.spec.scenes, {
  views: Object.keys(VIEWS), closeups: Object.keys(CLOSEUPS),
  scales: Object.values(SCALES), targets: [...regions, ...components],
  regionTargets: regions, componentTargets: components,
  claimIds: model.spec.claimSupport.claims.map((claim) => claim.id), minLength: min, maxLength: max,
}, { presentation: model.spec.presentation });

function exportAt(length, selection = { kind: 'region', id: 'PEVK' }) {
  const state = controller.resolveScene('spring', {
    ...controller.defaultState(),
    depth: 'explore', drawer: 'sources', sarcomere_length_nm: length,
  });
  const deepLink = controller.serialize(state);
  return researchExport({
    model,
    presentationState: { ...state, deepLink },
    selection,
    buildIdentity: model.spec.identity,
    inputManifest: manifest,
  });
}

test('SC26: contract fingerprint is SHA-256 of the canonical schema contract, not payload bytes', () => {
  assert.equal(EXPORT_CONTRACT.schema, 'titin-research-export-contract/1');
  assert.equal(EXPORT_CONTRACT_FINGERPRINT,
    createHash('sha256').update(EXPORT_CONTRACT_CANONICAL).digest('hex'));
  assert.match(EXPORT_CONTRACT.numbers, /no locale/i);
  assert.match(EXPORT_CONTRACT.nulls, /never zero/i);
  assert.deepEqual(EXPORT_CONTRACT.csv.force_columns, FORCE_CSV_COLUMNS);
  assert.deepEqual(EXPORT_CONTRACT.csv.regional_columns, REGIONAL_CSV_COLUMNS);
  assert.equal(sha256Text('titin 🧬\n'),
    createHash('sha256').update('titin 🧬\n').digest('hex'));
});

test('SC26: complete parameter table exposes values, bindings, units, preparation, and transfer', () => {
  const table = createParameterTable(model);
  assert.equal(table.schema, 'titin-parameter-table/1');
  assert.equal(table.rows.length, 13);
  assert.deepEqual(Object.keys(table.equations), ['wlc', 'ewlc', 'folded_plus_wlc']);
  for (const row of table.rows) {
    assert.ok(row.value !== null || row.value_from_spec, row.id);
    for (const field of ['unit', 'source_id', 'source_locator', 'species', 'preparation',
      'temperature_K',
      'applicability', 'transfer_rationale', 'validity', 'source_context']) {
      assert.notEqual(row[field], undefined, `${row.id}.${field}`);
    }
  }
});

test('SC26: Inspect resolves the exact construct, interval, mapped features, render, and claims', () => {
  const view = createInspectionView(model, {
    selection: { kind: 'region', id: 'prox_Ig' }, sarcomereLengthNm: 2200,
  });
  assert.equal(view.accession, 'Q8WZ42');
  assert.equal(view.isoform_id, 'Q8WZ42-1');
  assert.deepEqual(view.residue_interval, { start: 801, end: 9365, length_aa: 8565 });
  assert.equal(view.sequence_domain_count, 285);
  assert.equal(view.region_domain_count, 74);
  assert.equal(view.contained_domain_features.length, 74);
  assert.match(view.region_role, /Serially-linked Ig/);
  assert.match(view.placement_confidence, /STRONGLY INFERRED/);
  assert.equal(view.render_status, 'SCHEMATIC');
  assert.match(view.render_semantics, /display width/i);
  assert.ok(view.claims.length >= 2);
  assert.ok(view.claims.every((claim) => claim.sources.every((source) => source.locator)));
  const annotationShaped = createInspectionView(model, {
    selection: { id: 'annotation:PEVK', target_type: 'titin_region', target_id: 'PEVK' },
    sarcomereLengthNm: 2200,
  });
  assert.equal(annotationShaped.target.id, 'PEVK');
  const nonTitin = createInspectionView(model, {
    selection: { kind: 'component', id: 'thick_filament' }, sarcomereLengthNm: 2200,
  });
  assert.equal(nonTitin.label, 'Myosin thick filament');
  for (const field of ['accession', 'isoform_id', 'construct', 'coordinate_frame',
    'sequence_length_aa', 'sequence_domain_count']) assert.equal(nonTitin[field], null, field);
});

test('SC26: exact reference strip accounts for every residue and every domain feature', () => {
  const strip = createReferenceDomainStrip(model);
  assert.equal(strip.sequence_length_aa, 34350);
  assert.equal(strip.domain_feature_count, 285);
  assert.equal(strip.regions.length, 9);
  assert.deepEqual(strip.boundary_problems, []);
  assert.equal(strip.regions[0].start, 1);
  assert.equal(strip.regions.at(-1).end, strip.sequence_length_aa);
  assert.equal(strip.regions.reduce((sum, row) => sum + row.length_aa, 0), strip.sequence_length_aa);
  assert.equal(strip.regions.reduce((sum, row) => sum + row.feature_count, 0), 285);
  for (let index = 1; index < strip.regions.length; index += 1) {
    assert.equal(strip.regions[index].start, strip.regions[index - 1].end + 1);
  }
});

test('SC26: atomic evidence groups cover every claim while render status stays orthogonal', () => {
  const grouped = createEvidenceGroups(model);
  assert.deepEqual(grouped.groups.map((group) => group.id), [
    'measured_source_direct', 'strongly_inferred', 'modeled', 'inferred', 'unknown',
  ]);
  const claims = grouped.groups.flatMap((group) => group.claims);
  assert.equal(claims.length, model.spec.claimSupport.claims.length);
  assert.equal(new Set(claims.map((claim) => claim.id)).size, claims.length);
  assert.ok(claims.every((claim) => ['MODELED', 'SCHEMATIC', 'UNKNOWN']
    .includes(claim.render_status)));
  assert.equal(claims.find((claim) => claim.id === 'object_linked_tooltips').scientific_status,
    'UNKNOWN');
});

test('SC26: compliance plot has shares at supported lengths and nulls at omission boundaries', () => {
  const supported = createCompliancePlot(model, { currentLengthNm: 2200 });
  assert.equal(supported.current.status, 'supported');
  const shares = Object.values(supported.current.incremental_compliance_share);
  assert.ok(Math.abs(shares.reduce((sum, value) => sum + value, 0) - 1) < 1e-12);
  assert.deepEqual(supported.region_ids, ['prox_Ig', 'N2A', 'PEVK', 'dist_Ig']);
  const omitted = createCompliancePlot(model, { currentLengthNm: 1900 });
  assert.equal(omitted.current.status, 'not_evaluated');
  assert.equal(omitted.current.incremental_compliance_share, null);
  assert.equal(omitted.current.incremental_compliance_nm_per_pN, null);
  const curve = createForceCurve(model, { currentLengthNm: 2200 });
  assert.deepEqual(curve.current.regional_extension_nm,
    model.geometryAt(2200).titin_iband_extension_nm);
  assert.match(curve.caveat, /Slack\/contact\/compression/);
  assert.ok(curve.not_claimed.length >= 4);
});

test('SC26: reproduction worksheet names only fingerprinted model inputs and every required runtime', () => {
  const worksheet = createReproductionWorksheet(model, { inputManifest: manifest });
  assert.equal(worksheet.generator, 'python3 scripts/mechanical_model.py');
  assert.equal(worksheet.parameter_set_id, model.spec.mechanicalParameters.parameter_set_id);
  assert.equal(worksheet.model_fingerprint, model.spec.identity.model_fingerprint);
  assert.deepEqual(worksheet.supported_regime, {
    status: 'supported', min_nm: 2000, max_nm: 2400,
    lower_inclusive: true, upper_inclusive: true,
  });
  assert.deepEqual(worksheet.runtime, { python: '>=3.12', node: '20.19.2', npm: '11.5.2' });
  assert.deepEqual(worksheet.comparison_tolerance, { force_pN: 1e-9, extension_nm: 1e-9 });
  const featureInput = manifest.inputs.find((row) => (
    row.path === 'data/titin_sequence_features.json'
  ));
  assert.deepEqual(worksheet.feature_source_checksums, {
    path: 'data/titin_sequence_features.json',
    candidate_sha256: featureInput.sha256,
    upstream_sha256: model.spec.sequenceFeatures.source.upstream_sha256,
    sequence_sha256: model.spec.sequenceFeatures.source.sequence_sha256,
  });
  assert.deepEqual(worksheet.pinned_inputs.map((row) => row.path), REPRODUCTION_INPUT_PATHS);
  assert.deepEqual(REPRODUCTION_INPUT_PATHS, MODEL_INPUTS);
  assert.equal(modelInputManifestFingerprint(manifest),
    model.spec.identity.model_input_manifest_fingerprint);
  assert.ok(worksheet.pinned_inputs.every((row) => /^[0-9a-f]{64}$/.test(row.sha256)));
  assert.throws(() => createReproductionWorksheet(model), /candidate input manifest is required/);
  const bad = structuredClone(manifest);
  bad.model_inputs[0] = 'README.md';
  assert.throws(() => createReproductionWorksheet(model, { inputManifest: bad }),
    /outside the candidate model-input manifest/);
  const forged = structuredClone(manifest);
  forged.inputs.find((row) => row.path === REPRODUCTION_INPUT_PATHS[0]).sha256 = '0'.repeat(64);
  assert.throws(() => createReproductionWorksheet(model, { inputManifest: forged }),
    /does not match the loaded candidate identity/);
});

test('SC26: boundary worksheet pins every exact SC27 review coordinate', () => {
  const worksheet = createBoundaryWorksheet(model, { inputManifest: manifest });
  const featureRow = manifest.inputs.find((row) => (
    row.path === 'data/titin_sequence_features.json'
  ));
  assert.equal(worksheet.source.candidate_sha256, featureRow.sha256);
  assert.equal(worksheet.source.upstream_sha256,
    model.spec.sequenceFeatures.source.upstream_sha256);
  assert.equal(worksheet.source.sequence_sha256,
    model.spec.sequenceFeatures.source.sequence_sha256);
  assert.deepEqual(worksheet.boundary_problems, []);
  assert.equal(worksheet.regions.length, 9);
  assert.equal(worksheet.regions.reduce((sum, region) => sum + region.features.length, 0), 285);
  for (const region of worksheet.regions) {
    assert.ok(region.features.every((feature) => (
      feature.start >= region.start && feature.end <= region.end
    )), region.id);
  }
});

for (const length of [2000, 2200, 2400, 1900]) {
  test(`SC26: ${length} nm export is byte-deterministic and agrees with direct evaluation`, () => {
    const first = exportAt(length);
    const second = exportAt(length);
    assert.deepEqual(first, second);
    assert.deepEqual(validateResearchExport(first, { model }), []);
    const state = JSON.parse(first.stateJson);
    const geometry = model.geometryAt(length);
    assert.equal(state.mechanics.status, geometry.titin_force_status);
    assert.equal(state.mechanics.parameter_set_id, geometry.mechanical_parameter_set_id);
    const row = parseCsv(first.forceCsv).find((candidate) => candidate[0] === String(length));
    assert.ok(row, 'force CSV must contain the exact current state');
    assert.equal(row[4], geometry.titin_force_status);
    if (geometry.titin_force_status === 'not_evaluated') {
      assert.deepEqual(row.slice(1, 4), ['', '', '']);
    } else {
      assert.equal(Number(row[2]), geometry.titin_chain_force_pN);
      assert.equal(Number(row[1]), geometry.titin_force_sensitivity.force_pN.min);
      assert.equal(Number(row[3]), geometry.titin_force_sensitivity.force_pN.max);
    }
    const restored = controller.parse(first.deepLink);
    assert.deepEqual(restored.issues, []);
    assert.equal(restored.state.sarcomere_length_nm, length);
    assert.equal(restored.state.scene_id, state.state.scene);
    assert.equal(restored.state.depth, state.state.depth);
    assert.equal(restored.state.drawer, state.state.drawer);
    assert.equal(restored.state.story_step, state.state.story_step);
    assert.equal(restored.state.confidence_display, state.state.confidence_display);
    assert.deepEqual(restored.state.selection, state.state.selection);
    assert.equal(controller.serialize(restored.state), first.deepLink);
  });
}

test('SC26: CSV shapes are exact, parse cleanly, and every row carries all four identities', () => {
  const output = exportAt(2200);
  const state = JSON.parse(output.stateJson);
  const force = parseCsv(output.forceCsv);
  const regional = parseCsv(output.regionalCsv);
  assert.deepEqual(force[0], FORCE_CSV_COLUMNS);
  assert.deepEqual(regional[0], REGIONAL_CSV_COLUMNS);
  const check = (rows, columns) => {
    const positions = Object.fromEntries(columns.map((column, index) => [column, index]));
    for (const row of rows.slice(1)) {
      assert.equal(row.length, columns.length);
      for (const field of Object.keys(state.build)) {
        assert.equal(row[positions[field]], state.build[field]);
      }
    }
  };
  check(force, FORCE_CSV_COLUMNS);
  check(regional, REGIONAL_CSV_COLUMNS);
  const extrapolated = force.find((row) => row[4] === 'extrapolated');
  assert.match(extrapolated[5], /quantitative output is extrapolated/);
  assert.deepEqual(parseCsv('a,b\n"comma, value","quote ""value"""\n'), [
    ['a', 'b'], ['comma, value', 'quote "value"'],
  ]);
  assert.throws(() => parseCsv('a,b\n"closed"junk,value\n'), /after closing quote/);
  assert.throws(() => parseCsv('a,b\nun"quoted,value\n'), /quote in unquoted/);
});

test('SC26: custom-state export restores every serialized presentation field', () => {
  const custom = {
    ...controller.defaultState(),
    depth: 'explore', story_step: 'stretch_spring', sarcomere_length_nm: 2275,
    drawer: 'measure', confidence_display: true, scene_id: '',
    camera_preset: 'view.titin_story', scale: 'context', context: true,
    selection: { kind: 'region', id: 'PEVK' },
  };
  const deepLink = controller.serialize(custom);
  const output = researchExport({
    model, presentationState: { ...custom, deepLink }, selection: custom.selection,
    buildIdentity: identity, inputManifest: manifest,
  });
  assert.deepEqual(validateResearchExport(output, { model }), []);
  const exported = JSON.parse(output.stateJson).state;
  assert.equal(exported.scene, '');
  assert.equal(exported.story_step, custom.story_step);
  assert.equal(exported.confidence_display, true);
  assert.deepEqual(exported.custom, {
    camera_preset: custom.camera_preset,
    context: custom.context,
    layers: Object.fromEntries(Object.entries(custom.layers).sort()),
    scale: custom.scale,
  });
  const restored = controller.parse(output.deepLink);
  assert.deepEqual(restored.issues, []);
  for (const field of ['story_step', 'sarcomere_length_nm', 'drawer',
    'confidence_display', 'camera_preset', 'scale', 'context']) {
    assert.deepEqual(restored.state[field], custom[field], field);
  }
  assert.deepEqual(restored.state.layers, custom.layers);
  assert.deepEqual(restored.state.selection, custom.selection);
  assert.equal(controller.serialize(restored.state), output.deepLink);
});

test('SC26: selected claim subset includes local metadata and exact source locators offline', () => {
  const claims = JSON.parse(exportAt(2200).claimsJson);
  assert.deepEqual(claims.claims.map((claim) => claim.id), [
    'regional_extension_story', 'titin_region_architecture',
  ]);
  const sourceIds = new Set(claims.claims.flatMap((claim) => claim.support.map((row) => row.source_id)));
  assert.deepEqual(Object.keys(claims.references), [...sourceIds].sort());
  assert.ok(claims.claims.every((claim) => claim.support.every((row) => row.locator)));
  assert.match(claims.references['data/mechanical_model.json'].availability, /no network/);
});

test('SC26: validators reject malformed, forged, drifted, and non-canonical payloads', () => {
  const output = exportAt(1900);
  const zero = { ...output, forceCsv: output.forceCsv.replace(
    /^1900,,,,not_evaluated/m, '1900,0,0,0,not_evaluated',
  ) };
  assert.ok(validateResearchExport(zero, { model })
    .some((problem) => /unsupported force/.test(problem)));
  const identityDrift = { ...output, regionalCsv: output.regionalCsv.replace(
    model.spec.identity.build_inputs_fingerprint, 'drifted-build',
  ) };
  assert.ok(validateResearchExport(identityDrift, { model })
    .some((problem) => /mismatched build_inputs/.test(problem)));
  const state = JSON.parse(output.stateJson);
  state.generated_at = '2026-08-20T00:00:00Z';
  const timestamp = { ...output, stateJson: `${JSON.stringify(state, null, 2)}\n` };
  assert.ok(validateResearchExport(timestamp, { model })
    .some((problem) => /forbidden export metadata/.test(problem)));
  assert.ok(validateResearchExport({ ...output, stateJson: 'null\n' })
    .some((problem) => /root must be an object/));
  const malformedClaims = { ...output, claimsJson: '{"claims":{}}\n' };
  assert.doesNotThrow(() => validateResearchExport(malformedClaims));
  assert.ok(validateResearchExport(malformedClaims)
    .some((problem) => /claims must be an array/));
  assert.ok(validateResearchExport({
    ...output, forceCsv: `${FORCE_CSV_COLUMNS.join(',')}\n`,
  }, { model }).some((problem) => /no data rows/));
  assert.ok(validateResearchExport({
    ...output, forceCsv: output.forceCsv.replace('\n', '\n"closed"junk,'),
  }, { model }).some((problem) => /after closing quote/));
  assert.ok(validateResearchExport({
    ...output, forceCsv: output.forceCsv.replace(',not_evaluated,', ',invented_status,'),
  }, { model }).some((problem) => /invalid status|disagrees with model status/));
  assert.ok(validateResearchExport({
    ...output,
    forceCsv: output.forceCsv.replace(
      model.spec.mechanicalParameters.parameter_set_id, 'invented-parameter-set',
    ),
  }, { model }).some((problem) => /mismatched parameter_set_id|disagrees with model/));
  const supported = exportAt(2200);
  const wrongForce = {
    ...supported,
    forceCsv: supported.forceCsv.replace(
      /^(2200,[^,]*,)[^,]*(,[^,]*,)/m, (_match, before, after) => `${before}999${after}`,
    ),
  };
  assert.ok(validateResearchExport(wrongForce, { model })
    .some((problem) => /disagrees with model force_pN_central/));
  const driftedLink = {
    ...supported,
    deepLink: supported.deepLink.replace('step=meet_sarcomere', 'step=stretch_spring'),
  };
  assert.ok(validateResearchExport(driftedLink, { model })
    .some((problem) => /base fields|canonical serialization/));
  const nonCanonicalState = JSON.parse(supported.stateJson);
  nonCanonicalState.reproduction = Object.fromEntries(
    Object.entries(nonCanonicalState.reproduction).reverse(),
  );
  assert.ok(validateResearchExport({
    ...supported, stateJson: `${JSON.stringify(nonCanonicalState, null, 2)}\n`,
  }, { model }).some((problem) => /reproduction worksheet is not canonically ordered/));
  const forgedWorksheet = JSON.parse(supported.stateJson);
  forgedWorksheet.reproduction.pinned_inputs[0].sha256 = '0'.repeat(64);
  assert.ok(validateResearchExport({
    ...supported, stateJson: `${JSON.stringify(forgedWorksheet, null, 2)}\n`,
  }, { model }).some((problem) => /not candidate-authentic|does not match the loaded candidate/));
  const forgedClaims = researchExport({
    model,
    presentationState: {
      ...controller.resolveScene('spring', controller.defaultState()),
      claim_support_ids: ['scope_badge'],
    },
    selection: { kind: 'region', id: 'PEVK', claim_support_ids: ['scope_badge'] },
    buildIdentity: identity,
    inputManifest: manifest,
  });
  assert.deepEqual(JSON.parse(forgedClaims.claimsJson).claims.map((claim) => claim.id), [
    'regional_extension_story', 'titin_region_architecture',
  ]);
  assert.throws(() => researchExport({
    model,
    presentationState: controller.resolveScene('spring', controller.defaultState()),
    selection: { kind: 'region', id: 'PEVK' },
    buildIdentity: { ...identity, app_revision: 'forged-app' },
    inputManifest: manifest,
  }), /app_revision does not match the loaded candidate/);
  assert.throws(() => researchExport({
    model,
    presentationState: {
      depth: 'explore', story_step: 'meet_sarcomere', sarcomere_length_nm: 2200,
      drawer: 'sources', scene_id: 'spring', scale: 'context',
      deepLink: '#v=2&depth=explore&step=meet_sarcomere&sl=2201&drawer=sources&scene=spring&confidence=0',
    },
    selection: { kind: 'region', id: 'PEVK' },
    buildIdentity: model.spec.identity,
    inputManifest: manifest,
  }), /does not reproduce the exported state/);
  assert.throws(() => researchExport({
    model,
    presentationState: {
      depth: 'explore', story_step: 'meet_sarcomere', sarcomere_length_nm: 2200,
      drawer: 'sources', scene_id: 'overview', scale: 'context',
    },
    selection: { kind: 'region', id: 'PEVK' },
    buildIdentity: model.spec.identity,
    inputManifest: manifest,
  }), /does not match the exported selection/);
});

test('SC26: JSON Schema records describe the two emitted JSON payloads', () => {
  const stateSchema = JSON.parse(readFileSync(
    new URL('../schemas/titin-state-export.schema.json', import.meta.url), 'utf8',
  ));
  const claimsSchema = JSON.parse(readFileSync(
    new URL('../schemas/titin-claim-support-export.schema.json', import.meta.url), 'utf8',
  ));
  assert.equal(stateSchema.$id, 'titin-state-export/1');
  assert.equal(claimsSchema.$id, 'titin-claim-support-export/1');
  assert.deepEqual(stateSchema.required, ['schema', 'build', 'state', 'mechanics', 'reproduction']);
  assert.deepEqual(claimsSchema.required, ['schema', 'build', 'context', 'claims', 'references']);
  assert.equal(stateSchema.additionalProperties, false);
  assert.equal(claimsSchema.additionalProperties, false);
  assert.deepEqual(stateSchema.properties.state.required, [
    'url_version', 'depth', 'scene', 'sarcomere_length_nm', 'drawer', 'selection',
    'story_step', 'confidence_display', 'custom',
  ]);
  assert.equal(stateSchema.properties.reproduction.properties.pinned_inputs.minItems, 9);
  assert.deepEqual(
    stateSchema.properties.reproduction.properties.feature_source_checksums.required,
    ['path', 'candidate_sha256', 'upstream_sha256', 'sequence_sha256'],
  );
  assert.equal(stateSchema.properties.reproduction.properties.candidate_manifest_verified.const, true);
  assert.deepEqual(SCENE_LAYER_KEYS, [...SCENE_LAYER_KEYS].sort(),
    'custom deep-link layer order must remain deterministic');
  assert.deepEqual(RESEARCH_LAYER_KEYS, SCENE_LAYER_KEYS);
  assert.deepEqual(RESEARCH_CAMERA_PRESETS, [
    ...Object.keys(VIEWS).map((name) => `view.${name}`),
    ...Object.keys(CLOSEUPS).map((name) => `closeup.${name}`),
  ]);
});

test('SC26: release manifest records contract and sample byte hashes externally', () => {
  const releaseManifest = JSON.parse(readFileSync(
    new URL('../release/MANIFEST.json', import.meta.url), 'utf8',
  ));
  assert.equal(releaseManifest.export_contract_fingerprint, EXPORT_CONTRACT_FINGERPRINT);
  assert.deepEqual(releaseManifest.sample_exports.map((row) => row.sarcomere_length_nm),
    [2000, 2200, 2400, 1900]);
  assert.deepEqual(releaseManifest.sample_exports.map((row) => row.status),
    ['supported', 'supported', 'supported', 'not_evaluated']);
  assert.ok(releaseManifest.artifacts.some((row) => (
    row.path === 'release/BOUNDARY_WORKSHEET.md'
  )));
  for (const row of releaseManifest.sample_exports) {
    for (const field of ['state_json_sha256', 'force_csv_sha256',
      'regional_csv_sha256', 'claims_json_sha256']) assert.match(row[field], /^[0-9a-f]{64}$/);
  }
});

test('SC26: serializer module remains free of browser, clock, random, and Node-only reads', () => {
  const source = readFileSync(
    new URL('../src/presentation/ResearchExport.js', import.meta.url), 'utf8',
  );
  assert.doesNotMatch(source, /\b(window|document|navigator|Date)\.|Math\.random|from ['"]node:/);
  assert.doesNotMatch(source, /toLocaleString/);
  const hashSource = readFileSync(
    new URL('../src/presentation/DeterministicHash.js', import.meta.url), 'utf8',
  );
  assert.doesNotMatch(hashSource, /\b(window|document|navigator|Date)\.|Math\.random|from ['"]node:/);
});
