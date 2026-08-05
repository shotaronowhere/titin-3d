/**
 * SC-7 AI/provenance pipeline.
 *
 * The closing chapter's message is not "AI drew a convincing protein". It is
 * that the application is generated from cited records, evidence-classified data,
 * an executable model, procedural geometry, and destructive validation — each of
 * which a reader can go and inspect.
 *
 * A diagram that asserted that with hand-written numbers would be exactly the
 * unaudited illustration it claims not to be. So every stage's figure is COUNTED
 * from the loaded records at render time: change `references.json` and the first
 * stage's number changes with it. The stage labels are copy; the numbers are
 * measurements of the repository's own data layer.
 *
 * Nothing here is biology, so this module reads no coordinate and emits none.
 */

import { EVIDENCE_CLASSES } from '../model/SpecLoader.js';

/** Fixed order, top to bottom. Exported so the gate can assert the flow's shape. */
export const PIPELINE_STAGE_IDS = Object.freeze([
  'primary_records',
  'measurement',
  'specification',
  'executable_model',
  'procedural_render',
  'validation',
]);

const REQUIRED_CLAIM_ID = 'ai_provenance_pipeline';

function positiveCount(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`createProvenancePipeline: ${label} must be a positive integer count.`);
  }
  return number;
}

/** Structural gate for the SC-7 provenance record. */
export function validateProvenancePipeline(pipeline) {
  if (!pipeline || pipeline.schema !== 'titin-provenance-pipeline/1') {
    throw new Error('validateProvenancePipeline: unsupported record.');
  }
  if (pipeline.claim_id !== REQUIRED_CLAIM_ID) {
    throw new Error('validateProvenancePipeline: the pipeline must cite its reviewed claim.');
  }
  const ids = pipeline.stages.map((stage) => stage.id);
  if (ids.length !== PIPELINE_STAGE_IDS.length
      || ids.some((id, index) => id !== PIPELINE_STAGE_IDS[index])) {
    throw new Error('validateProvenancePipeline: the stage flow is incomplete or reordered.');
  }
  for (const stage of pipeline.stages) {
    if (!stage.label?.trim() || !stage.detail?.trim() || !stage.count_label?.trim()) {
      throw new Error(`validateProvenancePipeline: stage '${stage.id}' is missing copy.`);
    }
    if (!Number.isInteger(stage.count) || stage.count <= 0) {
      throw new Error(`validateProvenancePipeline: stage '${stage.id}' has no counted figure.`);
    }
    // A stage that cannot name the record it counted is an assertion, not a trace.
    if (!Array.isArray(stage.records) || !stage.records.length
        || stage.records.some((record) => !String(record || '').trim())) {
      throw new Error(`validateProvenancePipeline: stage '${stage.id}' names no inspectable record.`);
    }
  }
  if (!Array.isArray(pipeline.not_claimed) || pipeline.not_claimed.length < 3) {
    throw new Error('validateProvenancePipeline: the reviewed non-claims are required.');
  }
  if (!pipeline.not_claimed.some((entry) => /AI is a scientific authority/i.test(entry))) {
    throw new Error('validateProvenancePipeline: the AI-authority non-claim is required.');
  }
  return pipeline;
}

/**
 * @param {import('../model/TitinModel.js').TitinModel} model
 */
export function createProvenancePipeline(model) {
  const spec = model.spec;
  const claim = spec.showcaseClaims?.objects?.find((object) => object.id === REQUIRED_CLAIM_ID);
  if (!claim) throw new Error('createProvenancePipeline: the reviewed pipeline claim is missing.');
  if (!String(claim.decision).startsWith('ADMIT')) {
    throw new Error('createProvenancePipeline: the pipeline claim is not admitted.');
  }

  const referenceCount = positiveCount(Object.keys(spec.references).length, 'cited records');
  const parameterCount = positiveCount(
    spec.geometrySources.parameters.length, 'sourced parameters',
  );
  const recordCount = positiveCount(
    spec.sarcomere.components.length + spec.titin.regions.length, 'specified records',
  );
  const stateCount = positiveCount(Object.keys(spec.states.states).length, 'defined states');
  const primitiveCount = positiveCount(
    (spec.geometryStrategy?.primitive_vocabulary || []).length, 'render primitives',
  );
  const controlCount = positiveCount(
    (spec.showcaseClaims.global_negative_controls || []).length, 'destructive controls',
  );
  const forbiddenCount = positiveCount(
    (spec.states.transition_rules?.forbidden || []).length, 'forbidden depiction rules',
  );

  const stages = [
    {
      id: 'primary_records',
      label: 'Primary paper, PDB entry, UniProt record',
      detail: 'Every quantitative claim traces to a citable record with complete metadata.',
      count: referenceCount,
      count_label: 'cited records',
      records: ['data/references.json'],
    },
    {
      id: 'measurement',
      label: 'Coordinate or literature measurement',
      detail: 'Values are read from deposited coordinates or from the reported literature '
        + 'value, each with its species, muscle type, state, method, and uncertainty.',
      count: parameterCount,
      count_label: 'sourced parameters',
      records: ['data/geometry_sources.json', 'data/context_measurements.json', 'scripts/measure_context.py'],
    },
    {
      id: 'specification',
      label: 'Evidence-classified specification',
      detail: `Each record carries its evidence class from the ${EVIDENCE_CLASSES.length} declared `
        + 'classes, per claim, so a measured length and a schematic shape stay distinguishable.',
      count: recordCount,
      count_label: 'specified components and titin regions',
      records: ['data/sarcomere.json', 'data/titin.json', 'data/geometry_strategy.json'],
    },
    {
      id: 'executable_model',
      label: 'Executable mechanical and geometric model',
      detail: 'Defined states are keyframes; intermediate lengths are solved at a common '
        + 'force from each region’s own force-extension law, never scaled uniformly.',
      count: stateCount,
      count_label: 'defined structural states, continuously solved between',
      records: ['data/mechanical_model.json', 'src/geometry/MechanicalModel.js'],
    },
    {
      id: 'procedural_render',
      label: 'Procedural render',
      detail: 'Geometry is built from the specification through a declared primitive '
        + 'vocabulary. The renderer holds no biological constant of its own.',
      count: primitiveCount,
      count_label: 'declared render primitives',
      records: ['data/geometry_strategy.json', 'src/render/SarcomereScene.js'],
    },
    {
      id: 'validation',
      label: 'Positive and destructive negative tests',
      detail: `Beyond passing tests, ${controlCount} declared destructive controls and `
        + `${forbiddenCount} forbidden depiction rules prove the guards reject invalid geometry.`,
      count: controlCount + forbiddenCount,
      count_label: 'declared destructive controls and forbidden depiction rules',
      records: ['data/showcase_claims.json', 'scripts/validate_geometry.py', 'scripts/neg_control_showcase_claims.py'],
    },
  ];

  return validateProvenancePipeline({
    schema: 'titin-provenance-pipeline/1',
    claim_id: claim.id,
    evidence_class: claim.render_evidence_class,
    claim_evidence_class: claim.claim_evidence_class,
    audience: [...claim.audience],
    stages,
    not_claimed: [...claim.not_claimed],
    counted_at_runtime: true,
  });
}
