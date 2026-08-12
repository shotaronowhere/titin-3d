/**
 * SC-21 mechanics evaluator.
 *
 * This module contains equations and numerical algorithms only. Material
 * constants, contours, solver options, decision state, validity policy, and
 * sensitivity authority are injected from data/mechanical_parameters.json and
 * data/titin.json. A deferred SD-04 therefore cannot accidentally become a
 * numeric public result merely because the development solver can find one.
 */

/** Marko-Siggia interpolation: g(y), where f = (kT/A) g(y). */
export function gMarkoSiggia(y) {
  return 1.0 / (4.0 * (1.0 - y) ** 2) - 0.25 + y;
}

/** Force at fractional extension y. Every dimensional input is explicit. */
export function wlcForce(y, A_nm, kT_pN_nm) {
  return (kT_pN_nm / A_nm) * gMarkoSiggia(y);
}

/** Invert monotonic g on [0,1); the iteration count is injected model policy. */
export function gInverse(target, iterations) {
  let lo = 0.0;
  let hi = 1.0 - Number.EPSILON;
  for (let i = 0; i < iterations; i += 1) {
    const mid = 0.5 * (lo + hi);
    if (gMarkoSiggia(mid) < target) lo = mid; else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/** Pure-entropic WLC extension. */
export function wlcExtension(F_pN, A_nm, Lc_nm, kT_pN_nm, inverseIterations) {
  if (F_pN <= 0.0) return 0.0;
  return Lc_nm * gInverse((F_pN * A_nm) / kT_pN_nm, inverseIterations);
}

/** Extensible WLC extension. */
export function ewlcExtension(
  F_pN, A_nm, Lc_nm, K0_pN, kT_pN_nm, inverseIterations,
) {
  if (F_pN <= 0.0) return 0.0;
  return Lc_nm * (
    gInverse((F_pN * A_nm) / kT_pN_nm, inverseIterations) + F_pN / K0_pN
  );
}

function requirePositive(value, label) {
  if (!(typeof value === 'number' && Number.isFinite(value) && value > 0)) {
    throw new Error(`MechanicalModel: ${label} must be a positive finite number`);
  }
  return value;
}

function parameterValue(record, label) {
  if (!record || typeof record !== 'object' || !Object.hasOwn(record, 'value')) {
    throw new Error(`MechanicalModel: ${label} has no numeric value`);
  }
  return requirePositive(record.value, label);
}

function contourValue(region, field, label) {
  const value = region?.extension_model?.[field];
  return requirePositive(value, label);
}

function roundToSignificant(value, digits) {
  if (value === 0) return 0;
  const scale = 10 ** (digits - 1 - Math.floor(Math.log10(Math.abs(value))));
  return Math.round(value * scale) / scale;
}

/**
 * Format an authorized result without manufacturing precision. The sensitivity
 * half-range controls the decimal place, while the two-significant-digit cap
 * wins on conflict. Deferred evaluations never reach this path.
 */
export function formatForceEstimate(evaluation, significantDigitCap = 2) {
  if (!evaluation || evaluation.status === 'not_evaluated'
      || !Number.isFinite(evaluation.force_pN)) {
    return Object.freeze({ central: null, sensitivity: null, text: 'not evaluated' });
  }
  const force = evaluation.force_pN;
  const envelope = evaluation.sensitivity;
  if (!envelope || !Number.isFinite(envelope.force_pN?.min)
      || !Number.isFinite(envelope.force_pN?.max)) {
    const rounded = roundToSignificant(force, significantDigitCap);
    return Object.freeze({
      central: rounded,
      sensitivity: null,
      text: `≈${rounded} pN`,
    });
  }
  const halfRange = Math.max(
    force - envelope.force_pN.min,
    envelope.force_pN.max - force,
  );
  if (!(halfRange > 0)) {
    const rounded = roundToSignificant(force, significantDigitCap);
    return Object.freeze({ central: rounded, sensitivity: null, text: `≈${rounded} pN` });
  }
  const halfPlace = 10 ** Math.floor(Math.log10(halfRange));
  const forcePlace = force === 0 ? 0
    : 10 ** (Math.floor(Math.log10(Math.abs(force))) - significantDigitCap + 1);
  const place = Math.max(halfPlace, forcePlace);
  const central = Math.round(force / place) * place;
  const sensitivity = Math.round(halfRange / place) * place;
  const decimals = Math.max(0, -Math.round(Math.log10(place)));
  return Object.freeze({
    central,
    sensitivity,
    text: `${central.toFixed(decimals)} ± ${sensitivity.toFixed(decimals)} pN`,
  });
}

export class MechanicalModel {
  /**
   * @param {object} specTitin parsed titin.json
   * @param {object} mechanicalParameters parsed mechanical_parameters.json
   * @param {string} modelFingerprint injected candidate identity
   */
  constructor(specTitin, mechanicalParameters, modelFingerprint) {
    if (mechanicalParameters?.schema !== 'titin-mechanical-parameters/1') {
      throw new Error('MechanicalModel: unsupported or missing mechanical parameter schema');
    }
    if (!(typeof modelFingerprint === 'string' && modelFingerprint.trim())) {
      throw new Error('MechanicalModel: model fingerprint is required');
    }
    this.parameters = mechanicalParameters;
    this.parameterSetId = mechanicalParameters.parameter_set_id;
    this.modelFingerprint = modelFingerprint;
    this.order = Object.freeze([...mechanicalParameters.topology.region_order]);
    this.layoutOnly = Object.freeze([...mechanicalParameters.topology.layout_only_regions]);
    this.solver = Object.freeze({ ...mechanicalParameters.solver });
    this.kT_pN_nm = parameterValue(
      mechanicalParameters.physical_constants.boltzmann_constant,
      'physical_constants.boltzmann_constant',
    ) * parameterValue(
      mechanicalParameters.physical_constants.temperature,
      'physical_constants.temperature',
    ) * 1e21;

    const regions = Object.fromEntries(specTitin.regions.map((region) => [region.id, region]));
    this.chain = {};
    for (const row of mechanicalParameters.regions) {
      if (!this.order.includes(row.id)) continue;
      const region = regions[row.id];
      if (!region) throw new Error(`MechanicalModel: titin.json has no region "${row.id}"`);
      const p = row.parameters;
      const chainRow = {
        law: row.law,
        A_nm: parameterValue(p.persistence_length, `${row.id}.persistence_length`),
        Lc_nm: contourValue(region, 'max_end2end_nm', `${row.id}.max_end2end_nm`),
        parameter_records: p,
      };
      if (p.stretch_modulus) {
        chainRow.K0_pN = parameterValue(p.stretch_modulus, `${row.id}.stretch_modulus`);
      }
      if (p.rigid_folded_length) {
        chainRow.rigid_nm = contourValue(
          region, 'rigid_folded_length_nm', `${row.id}.rigid_folded_length_nm`,
        );
        if (chainRow.rigid_nm >= chainRow.Lc_nm) {
          throw new Error(`MechanicalModel: ${row.id} rigid floor must be below contour`);
        }
      }
      this.chain[row.id] = Object.freeze(chainRow);
    }
    if (Object.keys(this.chain).length !== this.order.length) {
      throw new Error('MechanicalModel: parameter record does not cover every series region');
    }
    Object.freeze(this.chain);
  }

  /** Extension of one region at an explicitly development-diagnostic force. */
  regionExtension(id, F_pN, chain = this.chain) {
    const c = chain[id];
    if (!c) throw new Error(`MechanicalModel: unknown region "${id}"`);
    const inverseIterations = this.solver.inverse_iterations;
    if (c.law === 'wlc') {
      return wlcExtension(F_pN, c.A_nm, c.Lc_nm, this.kT_pN_nm, inverseIterations);
    }
    if (c.law === 'folded_plus_wlc') {
      return c.rigid_nm + wlcExtension(
        F_pN, c.A_nm, c.Lc_nm - c.rigid_nm, this.kT_pN_nm, inverseIterations,
      );
    }
    if (c.law === 'ewlc') {
      return ewlcExtension(
        F_pN, c.A_nm, c.Lc_nm, c.K0_pN, this.kT_pN_nm, inverseIterations,
      );
    }
    throw new Error(`MechanicalModel: unsupported law "${c.law}" for ${id}`);
  }

  chainExtension(F_pN, chain = this.chain) {
    return this.order.reduce((sum, id) => sum + this.regionExtension(id, F_pN, chain), 0);
  }

  /** Explicit internal/audit solve; target applicability is intentionally not implied. */
  solveDevelopmentForce(totalNm, chain = this.chain) {
    requirePositive(totalNm, 'I-band total');
    let lo = this.solver.force_bracket.min;
    let hi = this.solver.force_bracket.max;
    const loExtension = this.chainExtension(lo, chain);
    const hiExtension = this.chainExtension(hi, chain);
    const tolerance = this.solver.parity_tolerance?.extension_nm ?? Number.EPSILON;
    if (totalNm < loExtension - tolerance || totalNm > hiExtension + tolerance) {
      throw new Error(
        `MechanicalModel: I-band total ${totalNm} nm is outside the solver bracket `
        + `[${loExtension}, ${hiExtension}] nm`,
      );
    }
    if (Math.abs(totalNm - loExtension) <= tolerance) return lo;
    if (Math.abs(totalNm - hiExtension) <= tolerance) return hi;
    for (let i = 0; i < this.solver.iterations; i += 1) {
      const mid = 0.5 * (lo + hi);
      if (this.chainExtension(mid, chain) < totalNm) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  /** Backward-incompatible by design: public callers must name the diagnostic. */
  solveForce() {
    throw new Error(
      'MechanicalModel.solveForce is not a public evaluation; use evaluateSarcomereLength()',
    );
  }

  forceForRegion(id, zNm, chain = this.chain) {
    const c = chain[id];
    if (!c) throw new Error(`MechanicalModel: unknown region "${id}"`);
    if (!(typeof zNm === 'number' && Number.isFinite(zNm) && zNm >= 0)) {
      throw new Error(`MechanicalModel: ${id} extension must be a non-negative finite number`);
    }
    const guard = this.solver.pure_wlc_contour_guard_fraction;
    if ((c.law === 'wlc' || c.law === 'folded_plus_wlc')
        && zNm >= c.Lc_nm * (1.0 - guard)) return null;
    if (c.law === 'folded_plus_wlc' && zNm <= c.rigid_nm) return 0.0;
    let lo = this.solver.force_bracket.min;
    let hi = this.solver.force_bracket.max;
    const loExtension = this.regionExtension(id, lo, chain);
    const hiExtension = this.regionExtension(id, hi, chain);
    const tolerance = this.solver.parity_tolerance?.extension_nm ?? Number.EPSILON;
    if (zNm < loExtension - tolerance || zNm > hiExtension + tolerance) return null;
    if (Math.abs(zNm - loExtension) <= tolerance) return lo;
    if (Math.abs(zNm - hiExtension) <= tolerance) return hi;
    for (let i = 0; i < this.solver.iterations; i += 1) {
      const mid = 0.5 * (lo + hi);
      if (this.regionExtension(id, mid, chain) < zNm) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  developmentCompliance(F_pN, chain = this.chain) {
    const relative = this.solver.finite_difference_relative_step;
    const minimum = this.solver.finite_difference_min_step_pN;
    const h = Math.max(F_pN * relative, minimum);
    const loF = Math.max(F_pN - h, this.solver.force_bracket.min);
    const hiF = F_pN + h;
    const incremental = {};
    let total = 0.0;
    for (const id of this.order) {
      incremental[id] = (
        this.regionExtension(id, hiF, chain) - this.regionExtension(id, loF, chain)
      ) / (hiF - loF);
      total += incremental[id];
    }
    const share = Object.fromEntries(
      this.order.map((id) => [id, incremental[id] / total]),
    );
    return { share, incremental_compliance_nm_per_pN: incremental, total_nm_per_pN: total };
  }

  complianceShares() {
    throw new Error(
      'MechanicalModel.complianceShares is not a public evaluation; use evaluateSarcomereLength()',
    );
  }

  developmentComplianceRank(F_pN, chain = this.chain) {
    const { share } = this.developmentCompliance(F_pN, chain);
    return [...this.order].sort((a, b) => share[b] - share[a]);
  }

  statusAt(sarcomereLengthNm) {
    const policy = this.parameters.regime_policy;
    if (this.parameters.decision.status !== 'APPROVED') return 'not_evaluated';
    const range = policy.approved_supported_range_nm;
    if (!Array.isArray(range) || range.length !== 2
        || !range.every(Number.isFinite) || range[0] >= range[1]) return 'not_evaluated';
    if (!Number.isFinite(sarcomereLengthNm)) return 'not_evaluated';
    const slack = policy.slack_or_buckling_boundary_nm;
    const unfolding = policy.unfolding_materiality_boundary_nm;
    if (!Number.isFinite(slack) || !Number.isFinite(unfolding)
        || slack > range[0] || unfolding <= range[1] || slack >= unfolding) {
      return 'not_evaluated';
    }
    const enabled = new Set(
      policy.regimes.filter((regime) => regime.enabled).map((regime) => regime.status),
    );
    if (sarcomereLengthNm < slack) return 'not_evaluated';
    if (sarcomereLengthNm >= unfolding) {
      return 'not_evaluated';
    }
    if (sarcomereLengthNm >= range[0] && sarcomereLengthNm <= range[1]) {
      return enabled.has('supported') ? 'supported' : 'not_evaluated';
    }
    return enabled.has('extrapolated') ? 'extrapolated' : 'not_evaluated';
  }

  reasonAt(sarcomereLengthNm, status = this.statusAt(sarcomereLengthNm)) {
    const policy = this.parameters.regime_policy;
    if (this.parameters.decision.status !== 'APPROVED') {
      return this.parameters.output_policy.public_caveat;
    }
    if (!Number.isFinite(sarcomereLengthNm)) {
      return 'No finite sarcomere length was supplied for mechanics evaluation.';
    }
    const range = policy.approved_supported_range_nm;
    const slack = policy.slack_or_buckling_boundary_nm;
    const unfolding = policy.unfolding_materiality_boundary_nm;
    if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite)
        || range[0] >= range[1] || !Number.isFinite(slack)
        || !Number.isFinite(unfolding) || slack > range[0]
        || unfolding <= range[1] || slack >= unfolding) {
      return 'The SD-04 regime boundaries are missing, malformed, or physically unordered.';
    }
    if (sarcomereLengthNm < slack) {
      return 'Below the SD-04-approved slack or buckling boundary; equilibrium tensile force is not evaluated.';
    }
    if (sarcomereLengthNm >= unfolding) {
      return 'At or above the SD-04-approved unfolding-materiality boundary; omitted physics makes force not evaluated.';
    }
    if (status === 'supported') return 'Inside the SD-04-approved supported interval.';
    if (status === 'extrapolated') {
      return 'Outside the approved supported interval; quantitative output is extrapolated.';
    }
    return 'The applicable SD-04 regime is disabled or lacks an approved boundary.';
  }

  chainWithOverrides(overrides = {}) {
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
      throw new Error('MechanicalModel: scenario overrides must be an object');
    }
    if (Object.hasOwn(overrides, 'PEVK.residue_rise')
        && Object.hasOwn(overrides, 'PEVK.contour_length')) {
      throw new Error(
        'MechanicalModel: scenario redundantly overrides both PEVK residue rise and contour length',
      );
    }
    const chain = Object.fromEntries(this.order.map((id) => [id, { ...this.chain[id] }]));
    for (const [path, raw] of Object.entries(overrides)) {
      const parts = path.split('.');
      if (parts.length !== 2 || parts.some((part) => !part)) {
        throw new Error(`MechanicalModel: invalid scenario override ${path}`);
      }
      const [id, parameter] = parts;
      const value = requirePositive(
        raw && typeof raw === 'object' ? raw.value : raw, `scenario ${path}`,
      );
      if (parameter === 'residue_rise' && id === 'PEVK' && chain[id]) {
        const centralRise = parameterValue(
          this.chain[id].parameter_records.residue_rise,
          `${id}.residue_rise`,
        );
        chain[id].Lc_nm = this.chain[id].Lc_nm * value / centralRise;
        continue;
      }
      const field = {
        persistence_length: 'A_nm',
        stretch_modulus: 'K0_pN',
        contour_length: 'Lc_nm',
        rigid_folded_length: 'rigid_nm',
      }[parameter];
      if (!chain[id] || !field) throw new Error(`MechanicalModel: invalid scenario override ${path}`);
      chain[id][field] = value;
    }
    for (const [id, row] of Object.entries(chain)) {
      if (row.rigid_nm !== undefined && row.rigid_nm >= row.Lc_nm) {
        throw new Error(`MechanicalModel: scenario ${id} rigid floor must be below contour`);
      }
    }
    return chain;
  }

  sensitivityEnvelope(totalNm, status) {
    const policy = this.parameters.sensitivity_policy;
    if (status === 'not_evaluated' || policy.status === 'not_evaluated') return null;
    const scenarios = policy.approved_scenarios || [];
    if (!scenarios.length) return null;
    const rows = [{ id: 'central', chain: this.chain }, ...scenarios.map((scenario) => ({
      id: scenario.id,
      chain: this.chainWithOverrides(scenario.overrides),
    }))].map(({ id, chain }) => {
      const force = this.solveDevelopmentForce(totalNm, chain);
      const extensions = Object.fromEntries(
        this.order.map((regionId) => [regionId, this.regionExtension(regionId, force, chain)]),
      );
      const compliance = this.developmentCompliance(force, chain);
      return { id, force, extensions, compliance: compliance.incremental_compliance_nm_per_pN };
    });
    const bounds = (selector) => ({
      min: Math.min(...rows.map(selector)),
      max: Math.max(...rows.map(selector)),
    });
    return Object.freeze({
      label: policy.label,
      scenario_ids: Object.freeze(rows.map((row) => row.id)),
      force_pN: Object.freeze(bounds((row) => row.force)),
      extension_nm: Object.freeze(Object.fromEntries(
        this.order.map((id) => [id, Object.freeze(bounds((row) => row.extensions[id]))]),
      )),
      incremental_compliance_nm_per_pN: Object.freeze(Object.fromEntries(
        this.order.map((id) => [id, Object.freeze(bounds((row) => row.compliance[id]))]),
      )),
      interpretation: 'Parameter sensitivity range; not a confidence interval, biological variance, or experimental error.',
    });
  }

  /**
   * One status-bearing target contract at every sarcomere length. The caller
   * injects the canonical I-band total because filament/Z-disc geometry is not
   * duplicated in this mechanics module. Deferred SD-04 never needs that total
   * to return an honest status, but geometry callers provide it so the returned
   * regional layout remains auditable.
   * @param {number|null} sarcomereLengthNm null is accepted only by legacy audit callers and fails closed
   * @param {{totalNm?: number|null, regionExtensionNm?: object|null}} [options]
   */
  evaluateSarcomereLength(
    sarcomereLengthNm, { totalNm = null, regionExtensionNm = null } = {},
  ) {
    const status = this.statusAt(sarcomereLengthNm);
    let suppliedExtension = regionExtensionNm === null
      ? null : Object.freeze({ ...regionExtensionNm });
    if (suppliedExtension === null && typeof totalNm === 'number'
        && Number.isFinite(totalNm) && totalNm > 0) {
      const developmentForce = this.solveDevelopmentForce(totalNm);
      suppliedExtension = Object.freeze(Object.fromEntries(
        this.order.map((id) => [id, this.regionExtension(id, developmentForce)]),
      ));
    }
    if (status === 'not_evaluated') {
      const reason = this.reasonAt(sarcomereLengthNm, status);
      return Object.freeze({
        status,
        force_pN: null,
        sensitivity: null,
        sensitivity_pN: null,
        region_extension_nm: suppliedExtension,
        incremental_compliance_share: null,
        incremental_compliance_nm_per_pN: null,
        precision: Object.freeze({ ...this.parameters.output_policy.precision }),
        reason,
        reasons: Object.freeze([reason]),
        parameter_set_id: this.parameterSetId,
        model_fingerprint: this.modelFingerprint,
      });
    }
    requirePositive(totalNm, 'I-band total');
    const force = this.solveDevelopmentForce(totalNm);
    const sensitivity = this.sensitivityEnvelope(totalNm, status);
    const compliance = this.developmentCompliance(force);
    const regionExtension = suppliedExtension || Object.freeze(Object.fromEntries(
      this.order.map((id) => [id, this.regionExtension(id, force)]),
    ));
    const reason = this.reasonAt(sarcomereLengthNm, status);
    const evaluation = {
      status,
      force_pN: force,
      sensitivity,
      sensitivity_pN: sensitivity
        ? Object.freeze([sensitivity.force_pN.min, sensitivity.force_pN.max]) : null,
      region_extension_nm: regionExtension,
      incremental_compliance_share: Object.freeze({ ...compliance.share }),
      incremental_compliance_nm_per_pN: Object.freeze({
        ...compliance.incremental_compliance_nm_per_pN,
      }),
      reason,
      reasons: Object.freeze([reason]),
      parameter_set_id: this.parameterSetId,
      model_fingerprint: this.modelFingerprint,
    };
    return Object.freeze({
      ...evaluation,
      precision: formatForceEstimate(evaluation, this.parameters.output_policy.precision.significant_digit_cap),
    });
  }

  /** Compatibility wrapper for callers that already hold the canonical total. */
  evaluate(totalNm, { sarcomereLengthNm = null } = {}) {
    return this.evaluateSarcomereLength(sarcomereLengthNm, { totalNm });
  }

  /**
   * Geometry partition plus the separate evaluation status. The development
   * scalar used to lay out the regions is deliberately not returned.
   * @param {number} totalNm
   * @param {{sarcomereLengthNm?: number|null}} [options]
   */
  partition(totalNm, { sarcomereLengthNm = null } = {}) {
    const developmentForce = this.solveDevelopmentForce(totalNm);
    const extension = Object.fromEntries(
      this.order.map((id) => [id, this.regionExtension(id, developmentForce)]),
    );
    for (const id of this.layoutOnly) extension[id] = 0;
    const evaluation = this.evaluateSarcomereLength(sarcomereLengthNm, {
      totalNm,
      regionExtensionNm: extension,
    });
    return Object.freeze({
      status: evaluation.status,
      force_pN: evaluation.force_pN,
      sensitivity: evaluation.sensitivity,
      sensitivity_pN: evaluation.sensitivity_pN,
      precision: evaluation.precision,
      reason: evaluation.reason,
      reasons: evaluation.reasons,
      extension_nm: Object.freeze(extension),
      incremental_compliance_share: evaluation.incremental_compliance_share,
      incremental_compliance_nm_per_pN: evaluation.incremental_compliance_nm_per_pN,
      total_nm: this.order.reduce((sum, id) => sum + extension[id], 0),
      parameter_set_id: this.parameterSetId,
      model_fingerprint: this.modelFingerprint,
      evidence_class: evaluation.status === 'not_evaluated'
        ? 'MODELED development geometry; quantitative force not evaluated'
        : 'MODELED SD-04-authorized approximate passive force per titin',
      basis: 'series force balance over the canonical mechanical-parameter record',
    });
  }

  auditPartition(specExtensionNm) {
    const implied = {};
    const unreachable = [];
    const atFloor = [];
    for (const id of this.order) {
      const force = this.forceForRegion(id, specExtensionNm[id]);
      if (force === null) unreachable.push(id);
      else if (force === 0.0) atFloor.push(id);
      else implied[id] = force;
    }
    const values = Object.values(implied);
    const spread = values.length > 1 ? Math.max(...values) / Math.min(...values) : null;
    return {
      status: 'development_diagnostic',
      implied_force_pN: implied,
      unreachable_at_finite_force: unreachable,
      at_rigid_floor: atFloor,
      spread,
      consistent: spread === null
        ? null : spread < this.solver.audit_common_force_spread_max,
      criterion: 'Series topology requires one common development-solver force.',
    };
  }
}
