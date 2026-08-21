/**
 * SC-26 pure expert workbench tables.
 *
 * These presenters expose canonical records without reaching into the DOM, the
 * filesystem, or a browser global.  In particular, the reproduction worksheet
 * receives the candidate input manifest explicitly: a downloaded handoff must
 * never guess which files produced it.
 */

import { createAnnotations } from '../api/TitinAnnotations.js';
import { sha256Text } from './DeterministicHash.js';

export const REPRODUCTION_INPUT_PATHS = Object.freeze([
  'data/sarcomere.json',
  'data/titin.json',
  'data/titin_sequence_features.json',
  'data/structural_states.json',
  'data/geometry_sources.json',
  'data/geometry_strategy.json',
  'data/context_measurements.json',
  'data/domain_backbones.json',
  'data/mechanical_parameters.json',
]);

export const REPRODUCTION_RUNTIME = Object.freeze({
  python: '>=3.12',
  node: '20.19.2',
  npm: '11.5.2',
});

function freezeRows(rows) {
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

function parameterSourceContext(parameter) {
  const direct = String(parameter.source_id || '').startsWith('data/')
    || parameter.validity?.target_status === 'UNIVERSAL_EXACT';
  return Object.freeze({
    claim_id: 'force_law_parameter_set',
    source_id: parameter.source_id,
    locator: parameter.source_locator,
    relationship: direct ? 'direct' : 'transfer',
    source_subject: Object.freeze({
      species: parameter.species,
      muscle_or_tissue: parameter.muscle_or_tissue,
      preparation: parameter.preparation,
      temperature_K: parameter.temperature_K ?? null,
    }),
    extraction_note: `${parameter.applicability} ${parameter.transfer_rationale}`,
  });
}

function parameterRow(id, regionId, law, parameter) {
  return Object.freeze({
    id,
    region_id: regionId,
    law,
    value: Object.hasOwn(parameter, 'value') ? parameter.value : null,
    value_from_spec: parameter.value_from_spec || null,
    unit: parameter.unit,
    uncertainty: Object.freeze({ ...parameter.uncertainty }),
    source_id: parameter.source_id,
    source_locator: parameter.source_locator,
    species: parameter.species,
    muscle_or_tissue: parameter.muscle_or_tissue,
    preparation: parameter.preparation,
    temperature_K: parameter.temperature_K ?? null,
    applicability: parameter.applicability,
    transfer_rationale: parameter.transfer_rationale,
    validity: Object.freeze({ ...parameter.validity }),
    approved_reviewer: parameter.approved_reviewer,
    approved_authority: parameter.approved_authority,
    decision_status: parameter.decision_status,
    source_context: parameterSourceContext(parameter),
  });
}

/** Complete, stable-order mechanical parameter table. */
export function createParameterTable(model) {
  const record = model?.spec?.mechanicalParameters;
  if (record?.schema !== 'titin-mechanical-parameters/1') {
    throw new Error('createParameterTable: a loaded titin mechanical-parameter record is required.');
  }
  const rows = [];
  for (const [id, parameter] of Object.entries(record.physical_constants)) {
    rows.push(parameterRow(`physical_constants.${id}`, null, 'physical_constant', parameter));
  }
  for (const region of record.regions) {
    for (const [id, parameter] of Object.entries(region.parameters)) {
      rows.push(parameterRow(`${region.id}.${id}`, region.id, region.law, parameter));
    }
  }
  return Object.freeze({
    schema: 'titin-parameter-table/1',
    parameter_set_id: record.parameter_set_id,
    model_fingerprint: model.spec.identity.model_fingerprint,
    equations: Object.freeze({ ...record.equations }),
    supported_range_nm: Object.freeze([...record.regime_policy.approved_supported_range_nm]),
    omission_boundaries_nm: Object.freeze({
      slack_or_buckling: record.regime_policy.slack_or_buckling_boundary_nm,
      unfolding_materiality: record.regime_policy.unfolding_materiality_boundary_nm,
    }),
    rows: Object.freeze(rows),
    transfers: Object.freeze(model.scientificScope.mechanics.transfers.map((row) => Object.freeze({
      ...row,
      quantities: Object.freeze([...row.quantities]),
      source_ids: Object.freeze([...row.source_ids]),
    }))),
    caveat: record.output_policy.public_caveat,
  });
}

function normalizedSelection(selection) {
  if (!selection) return null;
  const id = selection.target_id || selection.targetId || selection.id;
  const rawKind = selection.kind || selection.target_type || selection.targetType;
  const kind = rawKind === 'region' || rawKind === 'titin_region' ? 'region'
    : rawKind === 'component' ? 'component' : null;
  return typeof id === 'string' && id ? { id, kind } : null;
}

function claimRows(model, claimIds) {
  const claims = new Map(model.spec.claimSupport.claims.map((claim) => [claim.id, claim]));
  return freezeRows(claimIds.map((id) => {
    const claim = claims.get(id);
    if (!claim) throw new Error(`createInspectionView: unknown claim '${id}'.`);
    return {
      id: claim.id,
      statement: claim.statement,
      claim_class: claim.claim_class,
      render_class: claim.render_class,
      sources: Object.freeze((claim.support || []).map((support) => Object.freeze({
        id: support.source_id,
        locator: support.locator,
        relationship: support.relationship,
        species: support.source_subject?.species || null,
        muscle_or_tissue: support.source_subject?.muscle_or_tissue || null,
        preparation: support.source_subject?.preparation || null,
      }))),
    };
  }));
}

/**
 * Exact selected-object inspection record.  Region placement confidence is the
 * canonical axial-placement evidence class; render status remains separate.
 */
export function createInspectionView(model, {
  selection = null, sarcomereLengthNm = 2200, scale = 'context',
} = {}) {
  const normalized = normalizedSelection(selection);
  if (!normalized) return null;
  const targetType = normalized.kind === 'region' ? 'titin_region' : 'component';
  if (!['context', 'detail'].includes(scale)) {
    throw new Error(`createInspectionView: unknown scale '${scale}'.`);
  }
  const annotation = createAnnotations(model, sarcomereLengthNm, {
    scale: /** @type {'context'|'detail'} */ (scale),
  })
    .find((row) => row.target_id === normalized.id
      && (normalized.kind === null || row.target_type === targetType));
  if (!annotation) return null;
  const region = annotation.target_type === 'titin_region'
    ? model.spec.titin.regions.find((row) => row.id === annotation.target_id) : null;
  const mapped = region
    ? model.sequenceFeatures.regions.find((row) => row.regionId === region.id) : null;
  const features = mapped?.containedFeatures || [];
  const scope = model.scientificScope.sequence;
  const isTitinTarget = annotation.target_type === 'titin_region'
    || annotation.target_id === 'titin';
  return Object.freeze({
    schema: 'titin-inspection-view/1',
    target: Object.freeze({ kind: annotation.target_type, id: annotation.target_id }),
    label: annotation.label,
    accession: isTitinTarget ? scope.accession : null,
    isoform_id: isTitinTarget ? scope.isoform_id : null,
    construct: isTitinTarget ? scope.construct_label : null,
    coordinate_frame: isTitinTarget ? scope.coordinate_frame : null,
    residue_interval: region ? Object.freeze({ ...region.residue_span }) : null,
    sequence_length_aa: isTitinTarget ? model.spec.sequenceFeatures.sequence_length_aa : null,
    sequence_domain_count: isTitinTarget ? model.spec.sequenceFeatures.features.length : null,
    region_domain_count: features.length,
    declared_domain_composition: region
      ? Object.freeze({ ...region.domain_composition }) : null,
    contained_domain_features: freezeRows(features.map((feature) => ({
      id: feature.id,
      label: feature.label,
      type: feature.type,
      start: feature.start,
      end: feature.end,
      length_aa: feature.length_aa,
      locator: feature.locator,
    }))),
    region_role: region?.biological_role || annotation.scope,
    mechanical_class: region?.mechanical_class || null,
    placement_confidence: region?.evidence_by_claim?.resting_axial_position
      || annotation.evidence?.claim_class || 'UNKNOWN',
    render_status: annotation.evidence?.render_class || 'UNKNOWN',
    render_semantics: annotation.render_meaning,
    claims: claimRows(model, annotation.claim_support_ids),
  });
}

/** Exact full-reference residue strip with source-mapped feature containment. */
export function createReferenceDomainStrip(model) {
  const total = model.spec.sequenceFeatures.sequence_length_aa;
  const regionsById = new Map(model.spec.titin.regions.map((region) => [region.id, region]));
  return Object.freeze({
    schema: 'titin-reference-domain-strip/1',
    accession: model.scientificScope.sequence.accession,
    isoform_id: model.scientificScope.sequence.isoform_id,
    construct: model.scientificScope.sequence.construct_label,
    coordinate_frame: model.scientificScope.sequence.coordinate_frame,
    sequence_length_aa: total,
    domain_feature_count: model.spec.sequenceFeatures.features.length,
    source_release: model.spec.sequenceFeatures.source.release,
    source_sha256: model.spec.sequenceFeatures.source.upstream_sha256,
    regions: freezeRows(model.sequenceFeatures.regions.map((mapped) => {
      const region = regionsById.get(mapped.regionId);
      if (!region) throw new Error(`createReferenceDomainStrip: missing region '${mapped.regionId}'.`);
      return {
        id: region.id,
        name: region.name,
        start: region.residue_span.start,
        end: region.residue_span.end,
        length_aa: region.residue_span.length_aa,
        start_fraction: (region.residue_span.start - 1) / total,
        end_fraction: region.residue_span.end / total,
        feature_count: mapped.containedFeatures.length,
        features: freezeRows(mapped.containedFeatures.map((feature) => ({
          id: feature.id, label: feature.label, type: feature.type,
          start: feature.start, end: feature.end, length_aa: feature.length_aa,
        }))),
      };
    })),
    boundary_problems: Object.freeze([...model.sequenceFeatures.boundaryProblems]),
  });
}

const CLAIM_GROUPS = Object.freeze([
  Object.freeze({ id: 'measured_source_direct', label: 'Measured / source-direct', classes: ['MEASURED'] }),
  Object.freeze({ id: 'strongly_inferred', label: 'Strongly inferred', classes: ['STRONGLY INFERRED'] }),
  Object.freeze({ id: 'modeled', label: 'Modeled', classes: ['MODELED'] }),
  Object.freeze({ id: 'inferred', label: 'Inferred', classes: ['INFERRED'] }),
  Object.freeze({ id: 'unknown', label: 'Unknown', classes: ['UNKNOWN', 'SCHEMATIC'] }),
]);

/** Atomic claim groups; depiction status is deliberately orthogonal. */
export function createEvidenceGroups(model, { claimIds = null } = {}) {
  const selected = claimIds ? new Set(claimIds) : null;
  const claims = model.spec.claimSupport.claims.filter((claim) => !selected || selected.has(claim.id));
  if (selected) {
    const known = new Set(claims.map((claim) => claim.id));
    const missing = [...selected].filter((id) => !known.has(id));
    if (missing.length) throw new Error(`createEvidenceGroups: unknown claims ${missing.join(', ')}.`);
  }
  return Object.freeze({
    schema: 'titin-evidence-groups/1',
    groups: Object.freeze(CLAIM_GROUPS.map((group) => Object.freeze({
      id: group.id,
      label: group.label,
      claims: freezeRows(claims.filter((claim) => group.classes.includes(claim.claim_class))
        .map((claim) => ({
          id: claim.id,
          statement: claim.statement,
          scientific_status: claim.claim_class === 'SCHEMATIC' ? 'UNKNOWN' : claim.claim_class,
          source_direct: (claim.support || []).some((row) => row.relationship === 'direct'),
          render_status: claim.render_class,
          source_ids: Object.freeze((claim.support || []).map((row) => row.source_id)),
        }))),
    }))),
  });
}

function manifestInputRows(inputManifest) {
  if (!inputManifest) {
    throw new Error('createReproductionWorksheet: the candidate input manifest is required.');
  }
  if (inputManifest.schema !== 'titin-build-input-manifest/1'
      || !Array.isArray(inputManifest.model_inputs) || !Array.isArray(inputManifest.inputs)) {
    throw new Error('createReproductionWorksheet: invalid candidate input manifest.');
  }
  const admitted = new Set(inputManifest.model_inputs);
  const byPath = new Map(inputManifest.inputs.map((row) => [row.path, row]));
  return REPRODUCTION_INPUT_PATHS.map((path) => {
    if (!admitted.has(path)) {
      throw new Error(`createReproductionWorksheet: '${path}' is outside the candidate model-input manifest.`);
    }
    const row = byPath.get(path);
    if (!row || !/^[0-9a-f]{64}$/.test(row.sha256 || '')) {
      throw new Error(`createReproductionWorksheet: '${path}' has no pinned candidate SHA-256.`);
    }
    return Object.freeze({ path, sha256: row.sha256, checksum_scope: 'candidate file bytes' });
  });
}

/** Hash only the ordered model-input path/digest pairs embedded by the builder. */
export function modelInputManifestFingerprint(inputManifest) {
  const inputs = manifestInputRows(inputManifest).map(({ path, sha256 }) => ({ path, sha256 }));
  return sha256Text(JSON.stringify({ schema: 'titin-model-input-manifest/1', inputs }));
}

function verifyCandidateInputManifest(model, inputManifest, caller) {
  const actual = modelInputManifestFingerprint(inputManifest);
  const expected = model?.spec?.identity?.model_input_manifest_fingerprint;
  if (!/^[0-9a-f]{64}$/.test(expected || '') || actual !== expected) {
    throw new Error(`${caller}: input manifest does not match the loaded candidate identity.`);
  }
}

/**
 * Browser-independent instructions for reproducing the visible force value.
 * @param {any} model
 * @param {{inputManifest?:any, runtime?:typeof REPRODUCTION_RUNTIME}} options
 */
export function createReproductionWorksheet(model, {
  inputManifest, runtime = REPRODUCTION_RUNTIME,
} = {}) {
  const parameters = model.spec.mechanicalParameters;
  verifyCandidateInputManifest(model, inputManifest, 'createReproductionWorksheet');
  const manifestRows = manifestInputRows(inputManifest);
  const featureInput = manifestRows.find((row) => (
    row.path === 'data/titin_sequence_features.json'
  ));
  const featureSource = model.spec.sequenceFeatures.source;
  if (!featureInput || !/^[0-9a-f]{64}$/.test(featureSource.upstream_sha256 || '')
      || !/^[0-9a-f]{64}$/.test(featureSource.sequence_sha256 || '')) {
    throw new Error('createReproductionWorksheet: pinned feature/source checksums are incomplete.');
  }
  const tolerance = parameters.solver.parity_tolerance;
  const range = parameters.regime_policy.approved_supported_range_nm;
  return Object.freeze({
    schema: 'titin-reproduction-worksheet/1',
    command: 'python3 scripts/mechanical_model.py --parity-json',
    generator: 'python3 scripts/mechanical_model.py',
    parameter_set_id: parameters.parameter_set_id,
    model_fingerprint: model.spec.identity.model_fingerprint,
    supported_regime: Object.freeze({
      status: 'supported', min_nm: range[0], max_nm: range[1],
      lower_inclusive: true, upper_inclusive: true,
    }),
    runtime: Object.freeze({
      python: runtime.python, node: runtime.node, npm: runtime.npm,
    }),
    comparison_tolerance: Object.freeze({
      force_pN: tolerance.force_pN, extension_nm: tolerance.extension_nm,
    }),
    feature_source_checksums: Object.freeze({
      path: featureInput.path,
      candidate_sha256: featureInput.sha256,
      upstream_sha256: featureSource.upstream_sha256,
      sequence_sha256: featureSource.sequence_sha256,
    }),
    pinned_inputs: Object.freeze(manifestRows),
    candidate_manifest_verified: true,
    instructions: Object.freeze([
      'Verify every pinned input SHA-256 before running the generator.',
      'Create the documented Python environment and install requirements.txt.',
      'Run python3 scripts/mechanical_model.py --parity-json from the repository root.',
      'Compare force and regional extension using the recorded absolute tolerances.',
      'Treat not_evaluated force as null; never coerce it to zero.',
    ]),
  });
}

/**
 * Checksum-pinned sequence-boundary worksheet for independent SC-27 execution.
 * @param {any} model
 * @param {{inputManifest?:any}} options
 */
export function createBoundaryWorksheet(model, { inputManifest } = {}) {
  verifyCandidateInputManifest(model, inputManifest, 'createBoundaryWorksheet');
  const inputs = manifestInputRows(inputManifest);
  const featureInput = inputs.find((row) => row.path === 'data/titin_sequence_features.json');
  if (!featureInput) {
    throw new Error('createBoundaryWorksheet: the sequence-feature input is not pinned.');
  }
  const strip = createReferenceDomainStrip(model);
  return Object.freeze({
    schema: 'titin-boundary-worksheet/1',
    accession: strip.accession,
    isoform_id: strip.isoform_id,
    construct: strip.construct,
    coordinate_frame: strip.coordinate_frame,
    sequence_length_aa: strip.sequence_length_aa,
    domain_feature_count: strip.domain_feature_count,
    source: Object.freeze({
      path: featureInput.path,
      candidate_sha256: featureInput.sha256,
      upstream_sha256: strip.source_sha256,
      sequence_sha256: model.spec.sequenceFeatures.source.sequence_sha256,
      release: strip.source_release,
    }),
    command: 'python3 scripts/validate_sequence_features.py',
    regions: strip.regions,
    boundary_problems: strip.boundary_problems,
    instructions: Object.freeze([
      'Verify the candidate feature-file SHA-256 before reviewing boundaries.',
      'Run python3 scripts/validate_sequence_features.py from the repository root.',
      'Confirm every displayed region is contiguous and every contained feature lies wholly inside its inclusive interval.',
      'Record any unassigned, multiply assigned, or boundary-crossing feature as a finding; do not repair it by eye.',
    ]),
  });
}
