/**
 * SC-21 status-bearing force-curve presenter.
 *
 * It samples GeometryEngine but never upgrades a development solve into a public
 * result. Under deferred SD-04 every sample remains `not_evaluated` with a null
 * force, while regional extension geometry and the audit trail remain usable.
 */

export const FORCE_CURVE = Object.freeze({
  samples: 33,
  evidence_class: 'MODELED',
  claim_id: 'regional_extension_story',
  source_ids: Object.freeze([
    '10.1083/jcb.140.4.853',
    '10.3389/fphys.2020.00173',
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

function parameterRows(record) {
  const rows = [];
  for (const [id, parameter] of Object.entries(record.physical_constants)) {
    rows.push(Object.freeze({
      id: `physical_constants.${id}`,
      region_id: null,
      law: 'physical_constant',
      value: parameter.value,
      value_from_spec: null,
      unit: parameter.unit,
      uncertainty: Object.freeze({ ...parameter.uncertainty }),
      source_id: parameter.source_id,
      source_locator: parameter.source_locator,
      species: parameter.species,
      preparation: parameter.preparation,
      applicability: parameter.applicability,
      transfer_rationale: parameter.transfer_rationale,
      validity: Object.freeze({ ...parameter.validity }),
      approved_reviewer: parameter.approved_reviewer,
      decision_status: parameter.decision_status,
    }));
  }
  for (const region of record.regions) {
    for (const [id, parameter] of Object.entries(region.parameters)) {
      rows.push(Object.freeze({
        id: `${region.id}.${id}`,
        region_id: region.id,
        law: region.law,
        value: Object.hasOwn(parameter, 'value') ? parameter.value : null,
        value_from_spec: parameter.value_from_spec || null,
        unit: parameter.unit,
        uncertainty: Object.freeze({ ...parameter.uncertainty }),
        source_id: parameter.source_id,
        source_locator: parameter.source_locator,
        species: parameter.species,
        preparation: parameter.preparation,
        applicability: parameter.applicability,
        transfer_rationale: parameter.transfer_rationale,
        validity: Object.freeze({ ...parameter.validity }),
        approved_reviewer: parameter.approved_reviewer,
        decision_status: parameter.decision_status,
      }));
    }
  }
  return Object.freeze(rows);
}

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
      points.push(Object.freeze({
        sarcomere_length_nm: geometry.sarcomere_length_nm,
        status: geometry.titin_force_status,
        force_pN: geometry.titin_chain_force_pN,
        sensitivity: geometry.titin_force_sensitivity,
        precision: geometry.titin_force_precision,
        iband_total_nm: geometry.titin_iband_total_nm,
        regional_extension_nm: Object.freeze({ ...geometry.titin_iband_extension_nm }),
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
    parameters: parameterRows(parameterRecord),
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
