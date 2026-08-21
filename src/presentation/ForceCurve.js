/**
 * SC-21 status-bearing force-curve presenter.
 *
 * It samples GeometryEngine and discloses force only when SD-04 authorizes the
 * current length regime. Omission-boundary samples remain `not_evaluated` with
 * null force while regional geometry and the audit trail remain usable.
 */

import { createParameterTable } from './ParameterTable.js';

export const FORCE_CURVE = Object.freeze({
  samples: 33,
  evidence_class: 'MODELED',
  claim_id: 'regional_extension_story',
  source_ids: Object.freeze([
    '10.1083/jcb.140.4.853',
    '10.3389/fphys.2020.00173',
    '10.1073/pnas.95.14.8052',
    '10.1242/jcs.111.11.1567',
    '10.1529/biophysj.103.033571',
    '10.1529/biophysj.104.057737',
    '10.1016/s0006-3495(03)74732-8',
    '10.1016/j.celrep.2016.01.025',
    '10.1152/ajpcell.00469.2025',
  ]),
  not_claimed: Object.freeze([
    'a measured single-molecule force trace for this sarcomere',
    'total passive muscle tension, which includes non-titin contributions',
    'any active or calcium-dependent force',
    'a supported absolute-pN range beyond the exact SD-04-authorized regime',
  ]),
  basis: 'The series-law equations and every parameter are read from '
    + 'data/mechanical_parameters.json; target applicability is decided separately.',
});

/** @type {Map<string, any>} */
const memo = new Map();

/**
 * @param {any} model loaded TitinModel
 * @param {{samples?: number, currentLengthNm?: number|null}} [opts]
 */
export function createForceCurve(
  model, { samples = FORCE_CURVE.samples, currentLengthNm = null } = {},
) {
  if (!Number.isInteger(samples) || samples < 5) {
    throw new Error(`createForceCurve: samples must be an integer >= 5, got ${samples}`);
  }
  const { min, max } = model.slRange();
  const parameterRecord = model.spec.mechanicalParameters;
  const key = [
    model.spec.identity.model_fingerprint,
    parameterRecord.parameter_set_id,
    parameterRecord.decision.status,
    min,
    max,
    samples,
  ].join(':');
  let points = memo.get(key);
  if (!points) {
    points = [];
    for (let i = 0; i < samples; i += 1) {
      const sl = Math.round(min + ((max - min) * i) / (samples - 1));
      const geometry = model.geometryAt(sl);
      const evaluation = model.geometry.mechanicalModel.evaluateSarcomereLength(sl, {
        totalNm: geometry.titin_iband_total_nm,
        regionExtensionNm: geometry.titin_iband_extension_nm,
      });
      points.push(Object.freeze({
        sarcomere_length_nm: geometry.sarcomere_length_nm,
        status: geometry.titin_force_status,
        reason: geometry.titin_force_reason,
        force_pN: geometry.titin_chain_force_pN,
        sensitivity: geometry.titin_force_sensitivity,
        precision: geometry.titin_force_precision,
        iband_total_nm: geometry.titin_iband_total_nm,
        regional_extension_nm: Object.freeze({ ...geometry.titin_iband_extension_nm }),
        incremental_compliance_share: evaluation.incremental_compliance_share,
        incremental_compliance_nm_per_pN: evaluation.incremental_compliance_nm_per_pN,
        parameter_set_id: geometry.mechanical_parameter_set_id,
        model_fingerprint: geometry.mechanical_model_fingerprint,
      }));
    }
    Object.freeze(points);
    memo.set(key, points);
  }

  let current = null;
  if (Number.isFinite(currentLengthNm)) {
    const geometry = model.geometryAt(currentLengthNm);
    const first = model.geometryAt(min);
    const evaluated = geometry.titin_force_status !== 'not_evaluated';
    const incremental = evaluated
      ? model.geometry.mechanicalModel.developmentCompliance(
        geometry.titin_chain_force_pN,
      ).incremental_compliance_nm_per_pN
      : null;
    current = Object.freeze({
      sarcomere_length_nm: geometry.sarcomere_length_nm,
      status: geometry.titin_force_status,
      reason: geometry.titin_force_reason,
      force_pN: geometry.titin_chain_force_pN,
      sensitivity: geometry.titin_force_sensitivity,
      precision: geometry.titin_force_precision,
      incremental_compliance_nm_per_pN: incremental
        ? Object.freeze({ ...incremental }) : null,
      regional_extension_nm: Object.freeze({ ...geometry.titin_iband_extension_nm }),
      added_length_contribution_nm: Object.freeze(Object.fromEntries(
        Object.entries(geometry.titin_iband_extension_nm).map(([id, value]) => [
          id, value - first.titin_iband_extension_nm[id],
        ]),
      )),
      parameter_set_id: geometry.mechanical_parameter_set_id,
      model_fingerprint: geometry.mechanical_model_fingerprint,
    });
  }

  const supported = parameterRecord.regime_policy.approved_supported_range_nm;
  const parameterTable = createParameterTable(model);
  const numericForces = points.flatMap((point) => [
    point.force_pN,
    point.sensitivity?.force_pN?.min,
    point.sensitivity?.force_pN?.max,
  ]).filter(Number.isFinite);
  return Object.freeze({
    status: current?.status || parameterRecord.output_policy.evaluation_status,
    points,
    current,
    axes: Object.freeze({
      x: Object.freeze({
        label: 'sarcomere length (nm)',
        min: points[0].sarcomere_length_nm,
        max: points.at(-1).sarcomere_length_nm,
      }),
      y: Object.freeze({
        label: 'approximate passive force per titin (pN)',
        min: numericForces.length ? Math.min(...numericForces) : null,
        max: numericForces.length ? Math.max(...numericForces) : null,
      }),
    }),
    supported_range_nm: Array.isArray(supported) ? Object.freeze([...supported]) : null,
    sensitivity_label: parameterRecord.sensitivity_policy.label,
    sensitivity_interpretation: parameterRecord.sensitivity_policy.reason,
    equations: Object.freeze({ ...parameterRecord.equations }),
    parameters: parameterTable.rows,
    parameter_set_id: parameterRecord.parameter_set_id,
    model_fingerprint: model.spec.identity.model_fingerprint,
    decision: Object.freeze({ ...parameterRecord.decision }),
    caveat: parameterRecord.output_policy.public_caveat,
    evidence_class: FORCE_CURVE.evidence_class,
    claim_id: FORCE_CURVE.claim_id,
    source_ids: FORCE_CURVE.source_ids,
    not_claimed: FORCE_CURVE.not_claimed,
    basis: FORCE_CURVE.basis,
  });
}
