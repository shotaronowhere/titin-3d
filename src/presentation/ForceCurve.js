/**
 * SC-14 passive force–extension curve.
 *
 * This module SAMPLES the existing pipeline; it does not re-derive anything. The
 * force comes from GeometryEngine, which gets it from MechanicalModel's series
 * force balance, whose parameters are sourced and unfitted. A second
 * implementation here would be a second thing to keep in agreement with the
 * science, so there isn't one.
 *
 * Sampling cost: ~1.5 ms per point, so the curve is built once per range and
 * memoised. The current-length marker uses the force the render already has.
 *
 * On the source ids: the WLC persistence lengths and the PEVK stretch modulus
 * come from 10.1073/pnas.95.14.8052, which the data layer cites as a parameter
 * source string but which is NOT a record in data/references.json — so it is
 * not linkable and cannot be listed here, where every id must resolve in the
 * registry. That attribution reaches the reader the way the reviewed claim
 * already routes it: through data/mechanical_model.json, which
 * `regional_extension_story` carries as an INTERNAL source and which `basis`
 * names. The ids below are the registry records that directly underwrite what
 * this curve shows.
 */
import { MechanicalModel } from '../geometry/MechanicalModel.js';

export const FORCE_CURVE = Object.freeze({
  samples: 33,
  evidence_class: 'MODELED',
  claim_id: 'regional_extension_story',
  source_ids: Object.freeze([
    '10.1083/jcb.140.4.853',       // in-situ folded-Ig / unfolded-PEVK extension behaviour
    '10.3389/fphys.2020.00173',    // single-molecule force spectroscopy behind the N2A chain law
  ]),
  not_claimed: Object.freeze([
    'a measured single-molecule force trace for this sarcomere',
    'total passive muscle tension, which includes non-titin contributions',
    'any active or calcium-dependent force',
  ]),
  basis: 'series force balance over sourced force-extension laws; '
    + 'one common force across the four I-band regions; '
    + 'the laws and their primary sources are recorded in data/mechanical_model.json',
});

/** @type {Map<string, any>} */
const memo = new Map();

/**
 * @param {any} model  a loaded TitinModel
 * @param {{samples?: number, currentLengthNm?: number|null}} [opts]
 */
export function createForceCurve(model, { samples = FORCE_CURVE.samples, currentLengthNm = null } = {}) {
  if (!Number.isInteger(samples) || samples < 5) {
    throw new Error(`createForceCurve: samples must be an integer >= 5, got ${samples}`);
  }
  const { min, max } = model.slRange();
  const key = `${min}:${max}:${samples}`;
  let points = memo.get(key);
  if (!points) {
    points = [];
    for (let i = 0; i < samples; i += 1) {
      const sl = Math.round(min + ((max - min) * i) / (samples - 1));
      const geometry = model.geometryAt(sl);
      points.push(Object.freeze({
        sarcomere_length_nm: geometry.sarcomere_length_nm,
        force_pN: geometry.titin_chain_force_pN,
        iband_total_nm: geometry.titin_iband_total_nm,
      }));
    }
    Object.freeze(points);
    memo.set(key, points);
  }

  let current = null;
  if (Number.isFinite(currentLengthNm)) {
    const geometry = model.geometryAt(currentLengthNm);
    const mechanical = new MechanicalModel(model.spec.titin);
    current = Object.freeze({
      sarcomere_length_nm: geometry.sarcomere_length_nm,
      force_pN: geometry.titin_chain_force_pN,
      shares: Object.freeze({ ...mechanical.complianceShares(geometry.titin_chain_force_pN).share }),
    });
  }

  return Object.freeze({
    points,
    current,
    axes: Object.freeze({
      x: Object.freeze({ label: 'sarcomere length (nm)', min: points[0].sarcomere_length_nm, max: points.at(-1).sarcomere_length_nm }),
      y: Object.freeze({ label: 'passive force per titin (pN)', min: 0, max: points.at(-1).force_pN }),
    }),
    evidence_class: FORCE_CURVE.evidence_class,
    claim_id: FORCE_CURVE.claim_id,
    source_ids: FORCE_CURVE.source_ids,
    not_claimed: FORCE_CURVE.not_claimed,
    basis: FORCE_CURVE.basis,
  });
}
