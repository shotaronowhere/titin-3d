/** SC-26 pure incremental-compliance plot presenter. */

/** @type {Map<string, ReadonlyArray<any>>} */
const memo = new Map();

function sampleLengths(model, samples) {
  if (!Number.isInteger(samples) || samples < 5) {
    throw new Error(`createCompliancePlot: samples must be an integer >= 5, got ${samples}.`);
  }
  const { min, max } = model.slRange();
  return Object.freeze(Array.from({ length: samples }, (_, index) => (
    Math.round(min + ((max - min) * index) / (samples - 1))
  )));
}

function evaluationAt(model, sarcomereLengthNm) {
  const geometry = model.geometryAt(sarcomereLengthNm);
  return model.geometry.mechanicalModel.evaluateSarcomereLength(sarcomereLengthNm, {
    totalNm: geometry.titin_iband_total_nm,
    regionExtensionNm: geometry.titin_iband_extension_nm,
  });
}

function pointAt(model, sarcomereLengthNm) {
  const evaluation = evaluationAt(model, sarcomereLengthNm);
  return Object.freeze({
    sarcomere_length_nm: sarcomereLengthNm,
    status: evaluation.status,
    reason: evaluation.reason,
    force_pN: evaluation.force_pN,
    regional_extension_nm: evaluation.region_extension_nm,
    incremental_compliance_share: evaluation.incremental_compliance_share,
    incremental_compliance_nm_per_pN: evaluation.incremental_compliance_nm_per_pN,
    sensitivity_nm_per_pN: evaluation.sensitivity?.incremental_compliance_nm_per_pN || null,
    parameter_set_id: evaluation.parameter_set_id,
    model_fingerprint: evaluation.model_fingerprint,
  });
}

/**
 * The compliance series deliberately retains unsupported samples with null
 * shares.  An omitted-force regime is a visible validity region, not a zero.
 */
export function createCompliancePlot(model, {
  samples = 33, currentLengthNm = null,
} = {}) {
  const key = `${model.spec.identity.model_fingerprint}:${model.spec.mechanicalParameters.parameter_set_id}:${samples}`;
  let points = memo.get(key);
  if (!points) {
    points = Object.freeze(sampleLengths(model, samples).map((sl) => pointAt(model, sl)));
    memo.set(key, points);
  }
  const current = Number.isFinite(currentLengthNm) ? pointAt(model, currentLengthNm) : null;
  const regionIds = Object.freeze(model.spec.mechanicalParameters.regions.map((row) => row.id));
  const numeric = points.flatMap((point) => (
    point.incremental_compliance_nm_per_pN
      ? Object.values(point.incremental_compliance_nm_per_pN) : []
  )).filter(Number.isFinite);
  return Object.freeze({
    schema: 'titin-compliance-plot/1',
    points,
    current,
    region_ids: regionIds,
    axes: Object.freeze({
      x: Object.freeze({
        label: 'sarcomere length (nm)',
        min: points[0]?.sarcomere_length_nm ?? null,
        max: points.at(-1)?.sarcomere_length_nm ?? null,
      }),
      y: Object.freeze({
        label: 'incremental compliance (nm/pN)',
        min: numeric.length ? Math.min(...numeric) : null,
        max: numeric.length ? Math.max(...numeric) : null,
      }),
    }),
    supported_range_nm: Object.freeze([
      ...model.spec.mechanicalParameters.regime_policy.approved_supported_range_nm,
    ]),
    interpretation: 'The share is the local slope contribution to the serial chain at the '
      + 'evaluated force; it is not the absolute regional length or its fraction.',
    not_claimed: Object.freeze([
      'a confidence interval or biological population variance',
      'a measured regional compliance trace',
      'a compliance value where force status is not_evaluated',
    ]),
  });
}
