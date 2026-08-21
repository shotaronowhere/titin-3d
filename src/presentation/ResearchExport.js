/**
 * SC-26 deterministic, browser-independent research handoff serializers.
 *
 * No function in this module reads time, randomness, the DOM, window, network
 * state, or repository files.  Candidate identity and the input manifest are
 * explicit dependencies.  The export-contract fingerprint hashes the contract,
 * never the bytes that carry it, so it is safe to embed in every payload.
 */

import { createAnnotations } from '../api/TitinAnnotations.js';
import { sha256Text } from './DeterministicHash.js';
import {
  createReproductionWorksheet, REPRODUCTION_INPUT_PATHS,
} from './ParameterTable.js';

export { sha256Text } from './DeterministicHash.js';

export const STATE_EXPORT_SCHEMA = 'titin-state-export/1';
export const CLAIM_EXPORT_SCHEMA = 'titin-claim-support-export/1';
export const SERIALIZER_VERSION = 'titin-research-export-js/1';
const DRAWERS = Object.freeze(['closed', 'inspect', 'measure', 'evidence', 'sources']);
export const RESEARCH_LAYER_KEYS = Object.freeze([
  'extended_lattice', 'lattice_rings_1', 'lattice_rings_2', 'lattice_rings_3',
  'mirror', 'show_context_detail', 'show_domains', 'show_lattice',
]);
export const RESEARCH_CAMERA_PRESETS = Object.freeze([
  'view.longitudinal', 'view.titin_story', 'view.side', 'view.transverse', 'view.oblique',
  'closeup.crowns', 'closeup.twist', 'closeup.junction', 'closeup.zdisc',
  'closeup.mline', 'closeup.czone', 'closeup.lattice',
]);
const DEEP_LINK_BASE_KEYS = Object.freeze(['v', 'depth', 'step', 'sl', 'drawer']);
const DEEP_LINK_CUSTOM_KEYS = Object.freeze(['camera', 'scale', 'target', 'context', 'layers']);

export const FORCE_CSV_COLUMNS = Object.freeze([
  'sarcomere_length_nm',
  'force_pN_min',
  'force_pN_central',
  'force_pN_max',
  'status',
  'reason',
  'parameter_set_id',
  'model_fingerprint',
  'app_revision',
  'build_inputs_fingerprint',
  'export_contract_fingerprint',
]);

export const REGIONAL_CSV_COLUMNS = Object.freeze([
  'sarcomere_length_nm',
  'region_id',
  'extension_nm',
  'added_length_nm',
  'incremental_compliance_share',
  'status',
  'parameter_set_id',
  'model_fingerprint',
  'app_revision',
  'build_inputs_fingerprint',
  'export_contract_fingerprint',
]);

export const EXPORT_CONTRACT = Object.freeze({
  schema: 'titin-research-export-contract/1',
  serializer_version: SERIALIZER_VERSION,
  encoding: 'UTF-8',
  line_endings: 'LF (U+000A)',
  json: Object.freeze({
    indentation_spaces: 2,
    trailing_newline: true,
    state_schema: STATE_EXPORT_SCHEMA,
    state_root_key_order: Object.freeze(['schema', 'build', 'state', 'mechanics', 'reproduction']),
    build_key_order: Object.freeze([
      'model_fingerprint', 'app_revision', 'build_inputs_fingerprint',
      'export_contract_fingerprint',
    ]),
    state_key_order: Object.freeze([
      'url_version', 'depth', 'scene', 'sarcomere_length_nm', 'drawer', 'selection',
      'story_step', 'confidence_display', 'custom',
    ]),
    mechanics_key_order: Object.freeze(['parameter_set_id', 'status']),
    claims_schema: CLAIM_EXPORT_SCHEMA,
    claims_root_key_order: Object.freeze(['schema', 'build', 'context', 'claims', 'references']),
    nested_canonical_order: 'lexicographic Unicode code-point order',
  }),
  csv: Object.freeze({
    delimiter: ',',
    quoting: 'RFC 4180 double-quote escaping; quote fields containing comma, quote, CR, or LF',
    trailing_newline: true,
    force_columns: FORCE_CSV_COLUMNS,
    regional_columns: REGIONAL_CSV_COLUMNS,
  }),
  units: Object.freeze({
    sarcomere_length_nm: 'nm',
    force_pN_min: 'pN',
    force_pN_central: 'pN',
    force_pN_max: 'pN',
    extension_nm: 'nm',
    added_length_nm: 'nm',
    incremental_compliance_share: 'dimensionless',
  }),
  numbers: 'Finite ECMAScript shortest round-trip decimal; negative zero is serialized as 0; no locale formatting.',
  nulls: 'JSON uses null. CSV uses an empty field. A not_evaluated force is empty, never zero.',
  exclusions: Object.freeze([
    'generation timestamp', 'random identifier', 'locale-formatted number',
    'generated payload checksum', 'raw artifact self-checksum',
  ]),
});

function canonicalClone(value) {
  if (Array.isArray(value)) return value.map(canonicalClone);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort()
      .map((key) => [key, canonicalClone(value[key])]));
  }
  return value;
}

function canonicalContractText() {
  return JSON.stringify(canonicalClone(EXPORT_CONTRACT));
}

export const EXPORT_CONTRACT_CANONICAL = canonicalContractText();

export const EXPORT_CONTRACT_FINGERPRINT = sha256Text(EXPORT_CONTRACT_CANONICAL);

function finiteNumber(value, label) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error(`researchExport: ${label} must be finite.`);
  return Object.is(numeric, -0) ? 0 : numeric;
}

function decimal(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`researchExport: cannot serialize non-finite number '${value}'.`);
  }
  return Object.is(value, -0) ? '0' : String(value);
}

function csvField(value) {
  const string = typeof value === 'number' ? decimal(value) : String(value ?? '');
  return /[",\r\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function csv(columns, rows) {
  return `${[columns, ...rows].map((row) => row.map(csvField).join(',')).join('\n')}\n`;
}

function prettyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function checkedBuildIdentity(model, buildIdentity) {
  if (!buildIdentity || typeof buildIdentity !== 'object') {
    throw new Error('researchExport: buildIdentity is required.');
  }
  const result = {};
  for (const field of ['model_fingerprint', 'app_revision', 'build_inputs_fingerprint']) {
    if (typeof buildIdentity[field] !== 'string' || !buildIdentity[field].trim()) {
      throw new Error(`researchExport: buildIdentity is missing ${field}.`);
    }
    result[field] = buildIdentity[field];
    if (result[field] !== model.spec.identity[field]) {
      throw new Error(`researchExport: ${field} does not match the loaded candidate.`);
    }
  }
  return Object.freeze({
    model_fingerprint: result.model_fingerprint,
    app_revision: result.app_revision,
    build_inputs_fingerprint: result.build_inputs_fingerprint,
    export_contract_fingerprint: EXPORT_CONTRACT_FINGERPRINT,
  });
}

function normalizeSelection(selection) {
  if (selection === null || selection === undefined || selection === '' || selection === 'none') {
    return null;
  }
  if (typeof selection === 'string') return Object.freeze({ kind: null, id: selection });
  const id = selection.target_id || selection.targetId || selection.id;
  const raw = selection.kind || selection.target_type || selection.targetType;
  const kind = raw === 'region' || raw === 'titin_region' ? 'region'
    : raw === 'component' ? 'component' : null;
  if (typeof id !== 'string' || !id) {
    throw new Error('researchExport: selection must identify a canonical target.');
  }
  return Object.freeze({ kind, id });
}

function canonicalSelection(model, selection, sarcomereLengthNm) {
  if (!selection) return null;
  const isRegion = model.spec.titin.regions.some((region) => region.id === selection.id);
  const annotations = [
    ...createAnnotations(model, sarcomereLengthNm, { scale: 'context' }),
    ...createAnnotations(model, sarcomereLengthNm, { scale: 'detail' }),
  ];
  const annotation = annotations.find((row) => row.target_id === selection.id);
  const inferredKind = isRegion ? 'region'
    : annotation?.target_type === 'component' ? 'component' : null;
  if (!inferredKind) {
    throw new Error(`researchExport: unknown canonical selection '${selection.id}'.`);
  }
  if (selection.kind && selection.kind !== inferredKind) {
    throw new Error(`researchExport: selection '${selection.id}' is not a ${selection.kind}.`);
  }
  return Object.freeze({ kind: inferredKind, id: selection.id });
}

function selectionsEqual(left, right) {
  if (left === null || right === null) return left === right;
  return left.id === right.id && left.kind === right.kind;
}

function normalizedCustomState(model, presentationState) {
  const camera = presentationState.camera_preset || presentationState.cameraPreset;
  const scale = presentationState.scale;
  const context = presentationState.context;
  const layers = presentationState.layers;
  if (!camera || !scale || typeof context !== 'boolean' || !layers
      || typeof layers !== 'object' || Array.isArray(layers)) {
    throw new Error('researchExport: a Custom state needs camera, scale, context, and layers.');
  }
  const regionCameras = new Set(model.spec.titin.regions.map((region) => `region.${region.id}`));
  if (!RESEARCH_CAMERA_PRESETS.includes(camera) && !regionCameras.has(camera)) {
    throw new Error(`researchExport: unknown Custom camera '${camera}'.`);
  }
  if (!['context', 'detail'].includes(scale) || context !== (scale === 'context')) {
    throw new Error('researchExport: Custom context must agree with its admitted scale.');
  }
  if (JSON.stringify(Object.keys(layers).sort()) !== JSON.stringify(RESEARCH_LAYER_KEYS)) {
    throw new Error('researchExport: Custom layers must contain the complete admitted layer set.');
  }
  const normalizedLayers = Object.fromEntries(Object.keys(layers).sort().map((key) => {
    if (typeof layers[key] !== 'boolean') {
      throw new Error(`researchExport: Custom layer '${key}' must be boolean.`);
    }
    return [key, layers[key]];
  }));
  const ringCount = [1, 2, 3]
    .filter((ring) => normalizedLayers[`lattice_rings_${ring}`]).length;
  if (ringCount !== 1) throw new Error('researchExport: Custom layers must select one lattice ring count.');
  if (camera.startsWith('closeup.') && (!normalizedLayers.show_lattice || scale !== 'context')) {
    throw new Error('researchExport: a Custom close-up requires context and the filament lattice.');
  }
  if (camera === 'closeup.mline' && !normalizedLayers.mirror) {
    throw new Error('researchExport: the Custom M-line close-up requires the full sarcomere.');
  }
  return Object.freeze({
    camera_preset: camera,
    scale,
    context,
    layers: Object.freeze(normalizedLayers),
  });
}

function normalizePresentationState(model, presentationState, selection) {
  if (!presentationState || typeof presentationState !== 'object') {
    throw new Error('researchExport: presentationState is required.');
  }
  const length = finiteNumber(
    presentationState.sarcomere_length_nm ?? presentationState.sarcomereLengthNm,
    'sarcomere_length_nm',
  );
  if (!Number.isInteger(length)) {
    throw new Error('researchExport: sarcomere_length_nm must be an integer for URL v2.');
  }
  const range = model.slRange();
  if (length < range.min || length > range.max) {
    throw new Error(`researchExport: sarcomere length is outside ${range.min}-${range.max} nm.`);
  }
  const rawDepth = presentationState.depth || presentationState.audience_mode;
  const depth = rawDepth === 'explore' || rawDepth === 'evidence' ? 'explore'
    : rawDepth === 'learn' || rawDepth === 'guided' ? 'learn' : null;
  if (!depth) throw new Error(`researchExport: invalid depth '${rawDepth}'.`);
  const drawer = presentationState.drawer || 'closed';
  if (!DRAWERS.includes(drawer)) throw new Error(`researchExport: invalid drawer '${drawer}'.`);
  if (depth === 'learn' && drawer !== 'closed') {
    throw new Error('researchExport: Learn depth requires a closed drawer.');
  }
  const scene = presentationState.scene ?? presentationState.scene_id
    ?? presentationState.sceneId ?? '';
  if (typeof scene !== 'string') throw new Error('researchExport: scene must be a string.');
  const storyStep = presentationState.story_step || presentationState.storyStep
    || model.spec.presentation.initial_state.story_step;
  const chapterIds = new Set(model.spec.presentation.guided_chapters.map((row) => row.id));
  if (!chapterIds.has(storyStep)) {
    throw new Error(`researchExport: unknown story step '${storyStep}'.`);
  }
  const confidence = presentationState.confidence_display
    ?? presentationState.evidence_display ?? false;
  if (typeof confidence !== 'boolean') {
    throw new Error('researchExport: confidence_display must be boolean.');
  }
  const rawSelection = selection === undefined
    ? normalizeSelection(presentationState.selection
      ?? presentationState.selected_component_or_region ?? null)
    : normalizeSelection(selection);
  const selected = canonicalSelection(model, rawSelection, length);
  return Object.freeze({
    url_version: 2,
    depth,
    scene: scene || '',
    sarcomere_length_nm: length,
    drawer,
    selection: selected,
    story_step: storyStep,
    confidence_display: confidence,
    custom: scene ? null : normalizedCustomState(model, presentationState),
  });
}

function queryValue(value) {
  return encodeURIComponent(String(value)).replaceAll('%20', '+');
}

function createDeepLink(model, presentationState, state) {
  const supplied = presentationState.deepLink || presentationState.deep_link
    || presentationState.url_hash;
  const entries = [
    ['v', 2], ['depth', state.depth],
    ['step', state.story_step],
    ['sl', state.sarcomere_length_nm], ['drawer', state.drawer],
  ];
  if (state.scene) {
    const scene = model.spec.scenes.control_scenes?.[state.scene]
      || model.spec.scenes.scenes?.[state.scene];
    if (!scene) throw new Error(`researchExport: unknown semantic scene '${state.scene}'.`);
    const expectedSelection = canonicalSelection(
      model, normalizeSelection(scene.selection), state.sarcomere_length_nm,
    );
    if (!selectionsEqual(state.selection, expectedSelection)) {
      throw new Error(`researchExport: scene '${state.scene}' does not match the exported selection.`);
    }
    const optionalSceneFields = [
      ['camera_preset', 'cameraPreset', scene.camera_preset],
      ['scale', 'scale', scene.scale],
      ['context', 'context', scene.context],
    ];
    for (const [snake, camel, expected] of optionalSceneFields) {
      const actual = presentationState[snake] ?? presentationState[camel];
      if (actual !== undefined && actual !== expected) {
        throw new Error(`researchExport: scene '${state.scene}' conflicts with ${snake}.`);
      }
    }
    if (presentationState.layers !== undefined) {
      const layerKeys = [...new Set([
        ...Object.keys(scene.layers || {}), ...Object.keys(presentationState.layers || {}),
      ])];
      if (layerKeys.some((key) => (
        Boolean(scene.layers?.[key]) !== Boolean(presentationState.layers?.[key])
      ))) {
        throw new Error(`researchExport: scene '${state.scene}' conflicts with layers.`);
      }
    }
    entries.push(['scene', state.scene]);
  }
  else {
    const { camera_preset: camera, scale, context, layers } = state.custom;
    entries.push(
      ['camera', camera], ['scale', scale], ['target', state.selection?.id || 'none'],
      ['context', context ? 1 : 0],
      ['layers', Object.keys(layers).sort().filter((key) => layers[key]).join(',')],
    );
  }
  entries.push(['confidence', state.confidence_display ? 1 : 0]);
  const canonical = `#${entries.map(([key, value]) => (
    `${queryValue(key)}=${queryValue(value)}`
  )).join('&')}`;
  if (supplied !== undefined && supplied !== canonical) {
    throw new Error('researchExport: supplied deep link does not reproduce the exported state.');
  }
  return canonical;
}

function evaluationAt(model, sarcomereLengthNm) {
  const geometry = model.geometryAt(sarcomereLengthNm);
  const mechanics = model.geometry.mechanicalModel.evaluateSarcomereLength(sarcomereLengthNm, {
    totalNm: geometry.titin_iband_total_nm,
    regionExtensionNm: geometry.titin_iband_extension_nm,
  });
  // GeometryEngine is the public model evaluation already consumed by the
  // visible curve.  Keep its exact force/sensitivity bytes while supplementing
  // them with the compliance fields from the same MechanicalModel contract.
  const evaluation = Object.freeze({
    ...mechanics,
    status: geometry.titin_force_status,
    reason: geometry.titin_force_reason,
    force_pN: geometry.titin_chain_force_pN,
    sensitivity: geometry.titin_force_sensitivity,
    precision: geometry.titin_force_precision,
    parameter_set_id: geometry.mechanical_parameter_set_id,
    model_fingerprint: geometry.mechanical_model_fingerprint,
  });
  return { geometry, evaluation };
}

function forceSampleLengths(model, currentLengthNm, samples) {
  if (!Number.isInteger(samples) || samples < 5) {
    throw new Error(`researchExport: samples must be an integer >= 5, got ${samples}.`);
  }
  const { min, max } = model.slRange();
  const lengths = Array.from({ length: samples }, (_, index) => (
    Math.round(min + ((max - min) * index) / (samples - 1))
  ));
  lengths.push(currentLengthNm);
  return [...new Set(lengths)].sort((left, right) => left - right);
}

function claimIdsForContext(model, state) {
  if (state.selection) {
    const type = state.selection.kind === 'region' ? 'titin_region' : 'component';
    const scene = model.spec.scenes.control_scenes?.[state.scene]
      || model.spec.scenes.scenes?.[state.scene];
    const scale = state.custom?.scale || scene?.scale || 'context';
    const annotation = createAnnotations(model, state.sarcomere_length_nm, { scale })
      .find((row) => row.target_id === state.selection.id
        && (state.selection.kind === null || row.target_type === type));
    if (!annotation) {
      throw new Error(`researchExport: selection '${state.selection.id}' has no canonical annotation at scale '${scale}'.`);
    }
    return [...annotation.claim_support_ids].sort();
  }
  const scene = model.spec.scenes.control_scenes?.[state.scene]
    || model.spec.scenes.scenes?.[state.scene];
  return [...new Set(scene?.claim_ids || [])].sort();
}

function claimsPayload(model, build, state) {
  const ids = claimIdsForContext(model, state);
  const byId = new Map(model.spec.claimSupport.claims.map((claim) => [claim.id, claim]));
  const claims = ids.map((id) => {
    const claim = byId.get(id);
    if (!claim) throw new Error(`researchExport: contextual claim '${id}' is unresolved.`);
    return canonicalClone(claim);
  });
  const sourceIds = [...new Set(claims.flatMap((claim) => (
    (claim.support || []).map((row) => row.source_id)
  )))].sort();
  const references = Object.fromEntries(sourceIds.map((id) => {
    const reference = model.spec.references[id];
    if (reference) return [id, canonicalClone(reference)];
    if (id.startsWith('data/')) {
      return [id, canonicalClone({
        identifier: id,
        title: `Local canonical record: ${id}`,
        availability: 'embedded in the standalone candidate; no network required',
      })];
    }
    throw new Error(`researchExport: contextual source '${id}' is unresolved.`);
  }));
  return {
    schema: CLAIM_EXPORT_SCHEMA,
    build,
    context: {
      depth: state.depth,
      scene: state.scene,
      selection: canonicalClone(state.selection),
    },
    claims,
    references,
  };
}

/**
 * @param {{model:any, presentationState:any, selection?:any,
 *   buildIdentity:any, inputManifest?:any, samples?:number}} options
 */
export function researchExport({
  model, presentationState, selection = undefined, buildIdentity,
  inputManifest = null, samples = 33,
}) {
  if (!model?.spec || !model?.geometry) {
    throw new Error('researchExport: a loaded TitinModel is required.');
  }
  const build = checkedBuildIdentity(model, buildIdentity);
  const state = normalizePresentationState(model, presentationState, selection);
  const deepLink = createDeepLink(model, presentationState, state);
  const current = evaluationAt(model, state.sarcomere_length_nm).evaluation;
  const reproduction = createReproductionWorksheet(model, { inputManifest });
  const statePayload = {
    schema: STATE_EXPORT_SCHEMA,
    build,
    state: {
      url_version: state.url_version,
      depth: state.depth,
      scene: state.scene,
      sarcomere_length_nm: state.sarcomere_length_nm,
      drawer: state.drawer,
      selection: canonicalClone(state.selection),
      story_step: state.story_step,
      confidence_display: state.confidence_display,
      custom: canonicalClone(state.custom),
    },
    mechanics: {
      parameter_set_id: current.parameter_set_id,
      status: current.status,
    },
    reproduction: canonicalClone(reproduction),
  };

  const lengths = forceSampleLengths(model, state.sarcomere_length_nm, samples);
  const samplesAtLength = lengths.map((length) => ({ length, ...evaluationAt(model, length) }));
  const forceRows = samplesAtLength.map(({ length, evaluation }) => {
    const range = evaluation.sensitivity?.force_pN || null;
    return [
      length,
      range?.min ?? null,
      evaluation.force_pN,
      range?.max ?? null,
      evaluation.status,
      evaluation.reason,
      evaluation.parameter_set_id,
      build.model_fingerprint,
      build.app_revision,
      build.build_inputs_fingerprint,
      build.export_contract_fingerprint,
    ];
  });
  const baseline = evaluationAt(model, model.slRange().min).geometry.titin_iband_extension_nm;
  const regionalRows = samplesAtLength.flatMap(({ length, geometry, evaluation }) => (
    Object.keys(geometry.titin_iband_extension_nm).map((regionId) => {
      const extension = geometry.titin_iband_extension_nm[regionId];
      return [
        length,
        regionId,
        extension,
        extension - baseline[regionId],
        evaluation.incremental_compliance_share?.[regionId] ?? null,
        evaluation.status,
        evaluation.parameter_set_id,
        build.model_fingerprint,
        build.app_revision,
        build.build_inputs_fingerprint,
        build.export_contract_fingerprint,
      ];
    })
  ));
  const result = Object.freeze({
    stateJson: prettyJson(statePayload),
    forceCsv: csv(FORCE_CSV_COLUMNS, forceRows),
    regionalCsv: csv(REGIONAL_CSV_COLUMNS, regionalRows),
    claimsJson: prettyJson(claimsPayload(model, build, state)),
    deepLink,
  });
  const problems = validateResearchExport(result, { model });
  if (problems.length) {
    throw new Error(`researchExport emitted an invalid payload:\n  - ${problems.join('\n  - ')}`);
  }
  return result;
}

/** RFC-4180 parser used by validators and parity tests. */
export function parseCsv(text) {
  if (typeof text !== 'string') throw new Error('parseCsv: text is required.');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '\r') throw new Error('parseCsv: CR characters are forbidden.');
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') { quoted = false; afterQuote = true; }
      else field += char;
    } else if (afterQuote) {
      if (char === ',') { row.push(field); field = ''; afterQuote = false; }
      else if (char === '\n') {
        row.push(field); rows.push(row); row = []; field = ''; afterQuote = false;
      } else throw new Error(`parseCsv: unexpected character after closing quote at offset ${index}.`);
    } else if (char === '"') {
      if (field !== '') throw new Error(`parseCsv: quote in unquoted field at offset ${index}.`);
      quoted = true;
    } else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (quoted) throw new Error('parseCsv: unterminated quoted field.');
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function forbiddenMetadata(value, path = '') {
  const problems = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => problems.push(...forbiddenMetadata(entry, `${path}/${index}`)));
  } else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (/^(generated_at|generation_timestamp|exported_at|random_(?:id|identifier|uuid)|payload_sha256|state_json_sha256|claims_json_sha256|force_csv_sha256|regional_csv_sha256|index_html_sha256|artifact_sha256|self_sha256)$/i.test(key)) {
        problems.push(`${path}/${key} is forbidden export metadata`);
      }
      problems.push(...forbiddenMetadata(entry, `${path}/${key}`));
    }
  }
  return problems;
}

function exactKeys(value, keys) {
  return JSON.stringify(Object.keys(value || {})) === JSON.stringify(keys);
}

function isCanonicalNested(value) {
  return JSON.stringify(value) === JSON.stringify(canonicalClone(value));
}

function canonicalNumberText(value) {
  if (value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && decimal(numeric) === value ? numeric : null;
}

function expectedDeepLink(state) {
  const entries = [
    ['v', 2], ['depth', state.depth], ['step', state.story_step],
    ['sl', state.sarcomere_length_nm], ['drawer', state.drawer],
  ];
  if (state.scene) entries.push(['scene', state.scene]);
  else if (state.custom) {
    entries.push(
      ['camera', state.custom.camera_preset], ['scale', state.custom.scale],
      ['target', state.selection?.id || 'none'], ['context', state.custom.context ? 1 : 0],
      ['layers', Object.keys(state.custom.layers || {}).sort()
        .filter((key) => state.custom.layers[key]).join(',')],
    );
  }
  entries.push(['confidence', state.confidence_display ? 1 : 0]);
  return `#${entries.map(([key, value]) => `${queryValue(key)}=${queryValue(value)}`).join('&')}`;
}

/**
 * Structural, semantic, and model-parity validator for all five handoff outputs.
 * @param {any} payload
 * @param {{model?:any}} options
 */
export function validateResearchExport(payload, { model = null } = {}) {
  const problems = [];
  let state; let claims; let forceRows = []; let regionalRows = [];
  for (const field of ['stateJson', 'forceCsv', 'regionalCsv', 'claimsJson', 'deepLink']) {
    if (typeof payload?.[field] !== 'string' || !payload[field]) problems.push(`${field} is missing`);
  }
  if (problems.length) return problems;
  for (const [name, text] of Object.entries(payload)) {
    if (name !== 'deepLink'
        && (!text.endsWith('\n') || text.endsWith('\n\n') || text.includes('\r'))) {
      problems.push(`${name} must use LF and end with one newline`);
    }
  }
  const detail = (error) => error instanceof Error ? error.message : String(error);
  try { state = JSON.parse(payload.stateJson); }
  catch (error) { problems.push(`stateJson is not JSON: ${detail(error)}`); }
  try { claims = JSON.parse(payload.claimsJson); }
  catch (error) { problems.push(`claimsJson is not JSON: ${detail(error)}`); }
  try { forceRows = parseCsv(payload.forceCsv); }
  catch (error) { problems.push(`forceCsv is invalid: ${detail(error)}`); }
  try { regionalRows = parseCsv(payload.regionalCsv); }
  catch (error) { problems.push(`regionalCsv is invalid: ${detail(error)}`); }
  const objectRecord = (value) => value !== null && typeof value === 'object'
    && !Array.isArray(value);
  if (!objectRecord(state)) problems.push('stateJson root must be an object');
  if (!objectRecord(claims)) problems.push('claimsJson root must be an object');
  if (!objectRecord(state) || !objectRecord(claims)) return [...new Set(problems)];
  if (state.schema !== STATE_EXPORT_SCHEMA) problems.push('stateJson schema is wrong');
  if (claims.schema !== CLAIM_EXPORT_SCHEMA) problems.push('claimsJson schema is wrong');
  if (state.build?.export_contract_fingerprint !== EXPORT_CONTRACT_FINGERPRINT) {
    problems.push('stateJson export-contract fingerprint is wrong');
  }
  if (JSON.stringify(Object.keys(state))
      !== JSON.stringify(EXPORT_CONTRACT.json.state_root_key_order)) {
    problems.push('stateJson root key order is wrong');
  }
  if (JSON.stringify(Object.keys(claims))
      !== JSON.stringify(EXPORT_CONTRACT.json.claims_root_key_order)) {
    problems.push('claimsJson root key order is wrong');
  }
  const buildKeys = EXPORT_CONTRACT.json.build_key_order;
  if (JSON.stringify(Object.keys(state.build || {})) !== JSON.stringify(buildKeys)) {
    problems.push('stateJson build key order is wrong');
  }
  if (!['learn', 'explore'].includes(state.state?.depth)
      || state.state?.url_version !== 2 || !Number.isInteger(state.state?.sarcomere_length_nm)) {
    problems.push('stateJson state does not satisfy URL v2');
  }
  if (state.state?.depth === 'learn' && state.state?.drawer !== 'closed') {
    problems.push('stateJson Learn depth must have a closed drawer');
  }
  if (JSON.stringify(Object.keys(state.state || {}))
      !== JSON.stringify(EXPORT_CONTRACT.json.state_key_order)) {
    problems.push('stateJson state key order is wrong');
  }
  const stateRecord = objectRecord(state.state) ? state.state : {};
  const selection = stateRecord.selection;
  if (selection !== null && (!objectRecord(selection)
      || !exactKeys(selection, ['id', 'kind'])
      || typeof selection.id !== 'string' || !selection.id
      || !['component', 'region'].includes(selection.kind))) {
    problems.push('stateJson selection is invalid or not canonically ordered');
  }
  if (typeof stateRecord.story_step !== 'string' || !stateRecord.story_step
      || typeof stateRecord.confidence_display !== 'boolean') {
    problems.push('stateJson story/confidence state is incomplete');
  }
  if (stateRecord.scene) {
    if (stateRecord.custom !== null) problems.push('stateJson named scene must have null custom state');
  } else {
    const custom = stateRecord.custom;
    if (!objectRecord(custom) || !exactKeys(custom, ['camera_preset', 'context', 'layers', 'scale'])
        || typeof custom.camera_preset !== 'string' || !custom.camera_preset
        || typeof custom.scale !== 'string' || !custom.scale
        || typeof custom.context !== 'boolean' || !objectRecord(custom.layers)
        || Object.values(custom.layers || {}).some((value) => typeof value !== 'boolean')
        || !isCanonicalNested(custom.layers)
        || JSON.stringify(Object.keys(custom.layers || {}).sort())
          !== JSON.stringify(RESEARCH_LAYER_KEYS)
        || !['context', 'detail'].includes(custom.scale)
        || custom.context !== (custom.scale === 'context')
        || [1, 2, 3].filter((ring) => custom.layers?.[`lattice_rings_${ring}`]).length !== 1) {
      problems.push('stateJson custom state is incomplete or not canonically ordered');
    }
  }
  if (JSON.stringify(Object.keys(state.mechanics || {}))
      !== JSON.stringify(EXPORT_CONTRACT.json.mechanics_key_order)) {
    problems.push('stateJson mechanics key order is wrong');
  }
  if (!['supported', 'extrapolated', 'not_evaluated'].includes(state.mechanics?.status)) {
    problems.push('stateJson mechanics status is invalid');
  }
  if (!state.reproduction?.generator || !state.reproduction?.parameter_set_id
      || !state.reproduction?.model_fingerprint || !state.reproduction?.supported_regime
      || !state.reproduction?.runtime?.python || !state.reproduction?.runtime?.node
      || !state.reproduction?.comparison_tolerance
      || state.reproduction?.feature_source_checksums?.path
        !== 'data/titin_sequence_features.json'
      || ['candidate_sha256', 'upstream_sha256', 'sequence_sha256'].some((field) => (
        !/^[0-9a-f]{64}$/.test(state.reproduction?.feature_source_checksums?.[field] || '')
      ))
      || !Array.isArray(state.reproduction?.pinned_inputs)
      || state.reproduction.pinned_inputs.length !== REPRODUCTION_INPUT_PATHS.length
      || state.reproduction?.candidate_manifest_verified !== true) {
    problems.push('stateJson reproduction worksheet is incomplete');
  }
  if (JSON.stringify(state.reproduction?.pinned_inputs?.map((row) => row.path))
      !== JSON.stringify(REPRODUCTION_INPUT_PATHS)
      || state.reproduction?.pinned_inputs?.some((row) => !/^[0-9a-f]{64}$/.test(row.sha256))) {
    problems.push('stateJson reproduction inputs are not exactly pinned');
  }
  if (!isCanonicalNested(state.reproduction)) {
    problems.push('stateJson reproduction worksheet is not canonically ordered');
  }
  if (state.reproduction?.model_fingerprint !== state.build?.model_fingerprint
      || state.reproduction?.parameter_set_id !== state.mechanics?.parameter_set_id) {
    problems.push('stateJson reproduction identity does not match exported mechanics');
  }
  if (JSON.stringify(forceRows[0]) !== JSON.stringify(FORCE_CSV_COLUMNS)) {
    problems.push('forceCsv columns are wrong');
  }
  if (JSON.stringify(regionalRows[0]) !== JSON.stringify(REGIONAL_CSV_COLUMNS)) {
    problems.push('regionalCsv columns are wrong');
  }
  if (forceRows.length < 2) problems.push('forceCsv has no data rows');
  if (regionalRows.length < 2) problems.push('regionalCsv has no data rows');
  const identity = objectRecord(state.build) ? state.build : {};
  const forceByLength = new Map();
  const regionalByKey = new Map();
  const checkRows = (rows, columns, name, kind) => {
    const index = Object.fromEntries(columns.map((column, position) => [column, position]));
    for (const [rowIndex, row] of rows.slice(1).entries()) {
      const line = rowIndex + 2;
      if (row.length !== columns.length) {
        problems.push(`${name} row ${line} has wrong width`);
        continue;
      }
      for (const field of buildKeys) {
        if (row[index[field]] !== identity[field]) {
          problems.push(`${name} row ${line} has mismatched ${field}`);
        }
      }
      const length = canonicalNumberText(row[index.sarcomere_length_nm]);
      if (!Number.isInteger(length)) problems.push(`${name} row ${line} has invalid sarcomere length`);
      const status = row[index.status];
      if (!['supported', 'extrapolated', 'not_evaluated'].includes(status)) {
        problems.push(`${name} row ${line} has invalid status`);
      }
      if (!row[index.parameter_set_id]
          || row[index.parameter_set_id] !== state.mechanics?.parameter_set_id) {
        problems.push(`${name} row ${line} has mismatched parameter_set_id`);
      }
      if (kind === 'force') {
        if (!row[index.reason]) problems.push(`${name} row ${line} has no status reason`);
        if (forceByLength.has(length)) problems.push(`${name} has duplicate length ${length}`);
        forceByLength.set(length, { row, line });
        const forceFields = [index.force_pN_min, index.force_pN_central, index.force_pN_max];
        if (status === 'not_evaluated') {
          if (forceFields.some((position) => row[position] !== '')) {
            problems.push(`${name} row ${line} serializes unsupported force as a value`);
          }
        } else {
          const values = forceFields.map((position) => canonicalNumberText(row[position]));
          if (values.some((value) => value === null)) {
            problems.push(`${name} row ${line} has non-canonical force values`);
          } else if (!(Number(values[0]) <= Number(values[1])
              && Number(values[1]) <= Number(values[2]))) {
            problems.push(`${name} row ${line} has an invalid force interval`);
          }
        }
      } else {
        const regionId = row[index.region_id];
        if (!regionId) problems.push(`${name} row ${line} has no region_id`);
        const key = `${length}\u0000${regionId}`;
        if (regionalByKey.has(key)) problems.push(`${name} has duplicate length/region ${length}/${regionId}`);
        regionalByKey.set(key, { row, line });
        for (const field of ['extension_nm', 'added_length_nm']) {
          if (canonicalNumberText(row[index[field]]) === null) {
            problems.push(`${name} row ${line} has invalid ${field}`);
          }
        }
        const shareText = row[index.incremental_compliance_share];
        if (status === 'not_evaluated') {
          if (shareText !== '') problems.push(`${name} row ${line} must leave compliance blank`);
        } else if (shareText !== '') {
          const share = canonicalNumberText(shareText);
          if (share === null || share < 0 || share > 1) {
            problems.push(`${name} row ${line} has invalid incremental_compliance_share`);
          }
        }
      }
    }
  };
  checkRows(forceRows, FORCE_CSV_COLUMNS, 'forceCsv', 'force');
  checkRows(regionalRows, REGIONAL_CSV_COLUMNS, 'regionalCsv', 'regional');
  for (const { row, line } of regionalByKey.values()) {
    const length = Number(row[REGIONAL_CSV_COLUMNS.indexOf('sarcomere_length_nm')]);
    const force = forceByLength.get(length)?.row;
    if (!force) problems.push(`regionalCsv row ${line} has no forceCsv length`);
    else if (row[REGIONAL_CSV_COLUMNS.indexOf('status')]
        !== force[FORCE_CSV_COLUMNS.indexOf('status')]) {
      problems.push(`regionalCsv row ${line} status disagrees with forceCsv`);
    }
  }
  const currentForce = forceByLength.get(stateRecord.sarcomere_length_nm)?.row;
  if (!currentForce) problems.push('forceCsv does not contain the exact current state');
  else if (currentForce[FORCE_CSV_COLUMNS.indexOf('status')] !== state.mechanics?.status) {
    problems.push('forceCsv current-state status disagrees with stateJson');
  }
  for (const field of buildKeys) {
    if (claims.build?.[field] !== identity[field]) problems.push(`claimsJson has mismatched ${field}`);
  }
  if (JSON.stringify(Object.keys(claims.build || {})) !== JSON.stringify(buildKeys)) {
    problems.push('claimsJson build key order is wrong');
  }
  if (claims.context?.depth !== state.state?.depth
      || claims.context?.scene !== state.state?.scene
      || JSON.stringify(claims.context?.selection) !== JSON.stringify(state.state?.selection)) {
    problems.push('claimsJson context does not match stateJson');
  }
  if (!Array.isArray(claims.claims)) problems.push('claimsJson claims must be an array');
  if (!objectRecord(claims.references)) problems.push('claimsJson references must be an object');
  const claimRows = Array.isArray(claims.claims) ? claims.claims : [];
  const references = objectRecord(claims.references) ? claims.references : {};
  if (claimRows.some((claim) => !isCanonicalNested(claim))
      || Object.values(references).some((reference) => !isCanonicalNested(reference))) {
    problems.push('claimsJson nested records are not canonically ordered');
  }
  const citedSources = new Set(claimRows.flatMap((claim) => (
    Array.isArray(claim?.support)
      ? claim.support.map((support) => support?.source_id).filter(Boolean) : []
  )));
  if (JSON.stringify(Object.keys(references))
      !== JSON.stringify([...citedSources].sort())) {
    problems.push('claimsJson references are not the exact contextual source set');
  }
  if (!payload.deepLink.startsWith('#v=2&')) problems.push('deepLink is not URL v2');
  else {
    const params = new URLSearchParams(payload.deepLink.slice(1));
    const once = (key) => params.getAll(key).length === 1 ? params.get(key) : null;
    const expectedKeys = new Set([
      ...DEEP_LINK_BASE_KEYS,
      ...(state.state?.scene ? ['scene'] : DEEP_LINK_CUSTOM_KEYS),
      'confidence',
    ]);
    if ([...params.keys()].some((key) => !expectedKeys.has(key))
        || [...expectedKeys].some((key) => once(key) === null)
        || [...params.keys()].length !== expectedKeys.size) {
      problems.push('deepLink fields are not a complete canonical URL v2 state');
    }
    if (once('v') !== '2' || once('depth') !== state.state?.depth
        || once('step') !== state.state?.story_step
        || once('sl') !== String(state.state?.sarcomere_length_nm)
        || once('drawer') !== state.state?.drawer
        || once('confidence') !== (state.state?.confidence_display ? '1' : '0')) {
      problems.push('deepLink base fields do not match stateJson');
    }
    if (state.state?.scene) {
      if (once('scene') !== state.state.scene || params.has('target')) {
        problems.push('deepLink scene does not match stateJson');
      }
    } else if (once('target') !== (state.state?.selection?.id || 'none') || params.has('scene')
        || once('camera') !== state.state?.custom?.camera_preset
        || once('scale') !== state.state?.custom?.scale
        || once('context') !== (state.state?.custom?.context ? '1' : '0')
        || once('layers') !== Object.keys(state.state?.custom?.layers || {}).sort()
          .filter((key) => state.state.custom.layers[key]).join(',')) {
      problems.push('deepLink custom state does not match stateJson');
    }
    if (payload.deepLink !== expectedDeepLink(stateRecord)) {
      problems.push('deepLink is not the canonical serialization of stateJson');
    }
  }
  if (model?.spec && model?.geometry) {
    for (const field of ['model_fingerprint', 'app_revision', 'build_inputs_fingerprint']) {
      if (identity[field] !== model.spec.identity[field]) {
        problems.push(`stateJson ${field} does not match the loaded candidate`);
      }
    }
    try {
      const reproducedManifest = {
        schema: 'titin-build-input-manifest/1',
        model_inputs: [...REPRODUCTION_INPUT_PATHS],
        inputs: (state.reproduction?.pinned_inputs || []).map((row) => ({
          path: row?.path, sha256: row?.sha256,
        })),
      };
      const expectedReproduction = canonicalClone(createReproductionWorksheet(model, {
        inputManifest: reproducedManifest,
      }));
      if (JSON.stringify(state.reproduction) !== JSON.stringify(expectedReproduction)) {
        problems.push('stateJson reproduction worksheet does not match the loaded candidate');
      }
    } catch (error) {
      problems.push(`stateJson reproduction worksheet is not candidate-authentic: ${detail(error)}`);
    }
    const chapters = new Set(model.spec.presentation.guided_chapters.map((row) => row.id));
    if (!chapters.has(stateRecord.story_step)) problems.push('stateJson story step is unknown');
    const scene = stateRecord.scene
      ? (model.spec.scenes.control_scenes?.[stateRecord.scene]
        || model.spec.scenes.scenes?.[stateRecord.scene]) : null;
    if (stateRecord.scene && !scene) problems.push('stateJson scene is unknown');
    if (scene) {
      let expectedSelection = null;
      try {
        expectedSelection = canonicalSelection(
          model, normalizeSelection(scene.selection), stateRecord.sarcomere_length_nm,
        );
      } catch (error) { problems.push(`stateJson scene selection is invalid: ${detail(error)}`); }
      if (!selectionsEqual(stateRecord.selection, expectedSelection)) {
        problems.push('stateJson selection does not match its named scene');
      }
    } else if (stateRecord.selection) {
      try { canonicalSelection(model, stateRecord.selection, stateRecord.sarcomere_length_nm); }
      catch (error) { problems.push(`stateJson selection is not canonical: ${detail(error)}`); }
    }
    if (!stateRecord.scene && objectRecord(stateRecord.custom)) {
      try { normalizedCustomState(model, stateRecord.custom); }
      catch (error) { problems.push(`stateJson Custom state is invalid: ${detail(error)}`); }
    }
    const baseline = evaluationAt(model, model.slRange().min).geometry.titin_iband_extension_nm;
    const expectedRegionsByLength = new Map();
    for (const [length, entry] of forceByLength.entries()) {
      if (!Number.isInteger(length)) continue;
      let direct;
      try { direct = evaluationAt(model, length); }
      catch (error) { problems.push(`forceCsv length ${length} cannot be evaluated: ${detail(error)}`); continue; }
      const { row, line } = entry;
      const fi = Object.fromEntries(FORCE_CSV_COLUMNS.map((field, index) => [field, index]));
      const range = direct.evaluation.sensitivity?.force_pN || null;
      const expected = {
        force_pN_min: decimal(range?.min ?? null),
        force_pN_central: decimal(direct.evaluation.force_pN),
        force_pN_max: decimal(range?.max ?? null),
        status: direct.evaluation.status,
        reason: direct.evaluation.reason,
        parameter_set_id: direct.evaluation.parameter_set_id,
      };
      for (const [field, value] of Object.entries(expected)) {
        if (row[fi[field]] !== value) problems.push(`forceCsv row ${line} disagrees with model ${field}`);
      }
      expectedRegionsByLength.set(length, direct);
    }
    for (const [length, direct] of expectedRegionsByLength.entries()) {
      const regionIds = Object.keys(direct.geometry.titin_iband_extension_nm);
      const actualIds = [...regionalByKey.keys()].filter((key) => key.startsWith(`${length}\u0000`))
        .map((key) => key.split('\u0000')[1]);
      if (JSON.stringify(actualIds) !== JSON.stringify(regionIds)) {
        problems.push(`regionalCsv region set/order is wrong at ${length} nm`);
      }
      for (const regionId of regionIds) {
        const entry = regionalByKey.get(`${length}\u0000${regionId}`);
        if (!entry) continue;
        const ri = Object.fromEntries(REGIONAL_CSV_COLUMNS.map((field, index) => [field, index]));
        const extension = direct.geometry.titin_iband_extension_nm[regionId];
        const expected = {
          extension_nm: decimal(extension),
          added_length_nm: decimal(extension - baseline[regionId]),
          incremental_compliance_share:
            decimal(direct.evaluation.incremental_compliance_share?.[regionId] ?? null),
          status: direct.evaluation.status,
          parameter_set_id: direct.evaluation.parameter_set_id,
        };
        for (const [field, value] of Object.entries(expected)) {
          if (entry.row[ri[field]] !== value) {
            problems.push(`regionalCsv row ${entry.line} disagrees with model ${field}`);
          }
        }
      }
    }
    if (stateRecord.sarcomere_length_nm >= model.slRange().min
        && stateRecord.sarcomere_length_nm <= model.slRange().max) {
      const direct = evaluationAt(model, stateRecord.sarcomere_length_nm).evaluation;
      if (state.mechanics?.status !== direct.status
          || state.mechanics?.parameter_set_id !== direct.parameter_set_id) {
        problems.push('stateJson mechanics disagrees with direct model evaluation');
      }
    } else problems.push('stateJson sarcomere length is outside the loaded model range');
    if (objectRecord(claims) && objectRecord(state.build)) {
      try {
        const expectedClaims = claimsPayload(model, state.build, stateRecord);
        if (JSON.stringify(claims) !== JSON.stringify(expectedClaims)) {
          problems.push('claimsJson is not the exact canonical claim set for stateJson');
        }
      } catch (error) { problems.push(`claimsJson cannot be derived from stateJson: ${detail(error)}`); }
    }
  }
  if (!isCanonicalNested(claims.context)) {
    problems.push('claimsJson context is not canonically ordered');
  }
  problems.push(...forbiddenMetadata(state, '/stateJson'), ...forbiddenMetadata(claims, '/claimsJson'));
  return [...new Set(problems)];
}
