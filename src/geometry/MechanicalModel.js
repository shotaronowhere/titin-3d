/**
 * MechanicalModel — the force basis of titin I-band extension.
 *
 * WHY THIS EXISTS
 * ---------------
 * GeometryEngine reached intermediate sarcomere lengths by linearly
 * interpolating the four keyframe partitions in structural_states.json. The
 * recruitment order (proximal Ig straightening -> N2A -> PEVK) lived only as
 * English prose in titin.json:mechanical_summary; no code derived it. The
 * keyframes happened to encode it and lerp preserved it by accident.
 *
 * This module supplies the mechanism. Titin's four I-band elastic regions sit
 * in mechanical SERIES between the Z-disc and the thick-filament tip, so they
 * bear a COMMON force. One scalar force therefore fixes the whole partition,
 * and the recruitment order becomes a DERIVED result: it is the ordering of
 * the regions by compliance share dz/dF.
 *
 * This is the JS port of scripts/mechanical_model.py, which is the reference
 * implementation. The port is checked against the Python numerically in
 * test/phase8.test.js; the Python is checked against its own primary source.
 *
 * EVIDENCE CLASS: MODELED.
 * Deliberately distinct from the keyframes' STRONGLY INFERRED partition. This
 * module does NOT silently replace the keyframes -- callers choose, and
 * geometryAt() labels which route produced a given partition.
 *
 * Every parameter is sourced; none is fitted. See scripts/mechanical_model.py
 * for the full provenance argument, including two rejected earlier drafts (a
 * branch-switching PEVK law that introduced a 14.7 nm discontinuity, and an
 * N2A folded-bundle transition that rested on misattributing the Ig domain's
 * 6-8 pN refolding force to N2A).
 */

/**
 * Boltzmann constant * T in pN*nm. T = 300 K because that is the temperature
 * of the pnas.95.14.8052 experiments -- the temperature at which the sourced
 * persistence lengths were measured. Changing it would silently rescale every A.
 */
export const T_KELVIN = 300.0;
export const KT_PN_NM = 1.380649e-23 * T_KELVIN * 1e21;

/** Order along the chain: Z-disc -> thick-filament tip. */
export const IBAND_ORDER = ['prox_Ig', 'N2A', 'PEVK', 'dist_Ig'];

/**
 * Sourced force-extension laws. `Lc_nm: null` means "read the contour from the
 * spec at construction time" so the contour cannot drift from titin.json.
 */
export const CHAIN_PARAMETERS = {
  prox_Ig: {
    law: 'wlc', A_nm: 21.0, Lc_from_spec: 'max_end2end_nm',
    source: '10.1073/pnas.95.14.8052 (via Linke 1998 J Cell Sci 111:1567)',
    note: 'Poly-Ig tandem; entropic WLC fits to ~35 pN. Contour is the '
        + 'STRAIGHTENED-BUT-FOLDED tandem (n_units * 4.0 nm), because '
        + 'physiological poly-Ig extension is straightening, not unfolding.',
  },
  N2A: {
    // NOT a bare WLC: titin.json:domain_composition says N2A contains ONE folded
    // Ig-like domain, and a folded domain cannot collapse. So the region is a
    // rigid folded domain in SERIES with the remaining unique sequence as an
    // entropic coil. Both constants are already in the spec: 4.0 nm from
    // geometry_sources[10] "Folded Ig/Fn3 domain axial length" (MEASURED,
    // uncertainty 4.0-4.4, corroborated by the Phase 6 measured Ig_like N-to-C
    // extent of 4.319 nm), and the 39 nm contour from [11].
    //
    // A bare WLC let N2A fall to 0.3 nm at the contracted state -- below the
    // folded domain the region contains, which is physically impossible.
    // NB still no unfolding TRANSITION: the spec records no N2A unfolding force
    // (the 6-8 pN in geometry_sources[19] is the Ig domain's, not N2A's).
    law: 'folded_plus_wlc', A_nm: 0.35, Lc_nm: 39.0, rigid_nm: 4.0,
    source: '10.3389/fphys.2020.00173 (geometry_sources[11],[12], both skeletal N2A); '
          + 'rigid folded-domain length from geometry_sources[10] '
          + '(10.1016/j.jmb.2020.06.025)',
  },
  PEVK: {
    law: 'ewlc', A_nm: 0.55, K0_pN: 185.0, Lc_from_spec: 'max_end2end_nm',
    source: '10.1073/pnas.95.14.8052',
    note: 'The A/K0 pair with which the source reproduced the measured passive '
        + 'length-tension curve of rat psoas myofibrils over the whole '
        + 'physiological SL range -- hence a single-branch law. A and K0 are '
        + 'per-unit-length material properties and transfer across isoform '
        + 'length; the contour does not, so the spec\'s human contour is used.',
  },
  dist_Ig: {
    law: 'wlc', A_nm: 21.0, Lc_from_spec: 'max_end2end_nm',
    source: '10.1073/pnas.95.14.8052 (via Linke 1998 J Cell Sci 111:1567)',
    note: 'Same law as prox_Ig.',
  },
};

/** Marko-Siggia interpolation: f = (kT/A) * g(y), y = z/Lc. */
export function gMarkoSiggia(y) {
  return 1.0 / (4.0 * (1.0 - y) ** 2) - 0.25 + y;
}

/** Force (pN) at fractional extension y for a pure-entropic WLC. */
export function wlcForce(y, A_nm) {
  return (KT_PN_NM / A_nm) * gMarkoSiggia(y);
}

/**
 * Invert the strictly-increasing g on y in [0,1). Bisection cannot pick a
 * wrong branch, and 200 halvings take the bracket below double precision.
 */
export function gInverse(target) {
  let lo = 0.0;
  let hi = 1.0 - 1e-15;
  for (let i = 0; i < 200; i += 1) {
    const mid = 0.5 * (lo + hi);
    if (gMarkoSiggia(mid) < target) lo = mid; else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/** Pure-entropic WLC extension (nm). Asymptotic in Lc: never reaches it. */
export function wlcExtension(F_pN, A_nm, Lc_nm) {
  if (F_pN <= 0.0) return 0.0;
  return Lc_nm * gInverse((F_pN * A_nm) / KT_PN_NM);
}

/**
 * Extensible WLC: z/Lc = y(f) + f/K0. The enthalpic term means there is NO
 * contour ceiling -- the physically correct statement that a real chain can be
 * strained past its relaxed contour length.
 */
export function ewlcExtension(F_pN, A_nm, Lc_nm, K0_pN) {
  if (F_pN <= 0.0) return 0.0;
  return Lc_nm * (gInverse((F_pN * A_nm) / KT_PN_NM) + F_pN / K0_pN);
}

export class MechanicalModel {
  /**
   * @param {object} specTitin  parsed titin.json (supplies contour lengths)
   */
  constructor(specTitin) {
    const regions = {};
    for (const r of specTitin.regions) regions[r.id] = r;

    this.chain = {};
    for (const id of IBAND_ORDER) {
      const p = { ...CHAIN_PARAMETERS[id] };
      if (p.Lc_from_spec) {
        const region = regions[id];
        if (!region) throw new Error(`MechanicalModel: titin.json has no region "${id}"`);
        const lc = region.extension_model[p.Lc_from_spec];
        if (!(typeof lc === 'number' && lc > 0)) {
          throw new Error(`MechanicalModel: ${id}.extension_model.${p.Lc_from_spec} is not a positive number`);
        }
        p.Lc_nm = lc;
      }
      this.chain[id] = p;
    }
    Object.freeze(this.chain);
  }

  /** Extension (nm) of one region at force F. */
  regionExtension(id, F_pN) {
    const c = this.chain[id];
    if (!c) throw new Error(`MechanicalModel: unknown region "${id}"`);
    if (c.law === 'wlc') return wlcExtension(F_pN, c.A_nm, c.Lc_nm);
    if (c.law === 'folded_plus_wlc') {
      // Floors the region at rigid_nm: the folded domain is present at every force.
      return c.rigid_nm + wlcExtension(F_pN, c.A_nm, c.Lc_nm - c.rigid_nm);
    }
    return ewlcExtension(F_pN, c.A_nm, c.Lc_nm, c.K0_pN);
  }

  /** Total I-band chain extension (nm) at force F. */
  chainExtension(F_pN) {
    let s = 0.0;
    for (const id of IBAND_ORDER) s += this.regionExtension(id, F_pN);
    return s;
  }

  /**
   * The common force at which the series chain spans totalNm. Monotone in F,
   * so bisection is exact to convergence. This is the ONLY free scalar: the
   * total comes from the spec/engine, never from this module.
   */
  solveForce(totalNm, hiPN = 1.0e4) {
    let lo = 0.0;
    let hi = hiPN;
    for (let i = 0; i < 400; i += 1) {
      const mid = 0.5 * (lo + hi);
      if (this.chainExtension(mid) < totalNm) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  /**
   * Force one region ALONE would need to reach zNm.
   * Returns null when zNm is at or beyond a pure-entropic contour length,
   * i.e. unreachable at any finite force. Callers must handle null rather
   * than treating it as a large number.
   */
  forceForRegion(id, zNm, hiPN = 1.0e4) {
    const c = this.chain[id];
    if ((c.law === 'wlc' || c.law === 'folded_plus_wlc')
        && zNm >= c.Lc_nm * (1.0 - 1e-12)) return null;
    // At or below the rigid floor the region implies ZERO force, which carries no
    // information about the chain force. Returned as 0 and excluded from spread
    // ratios by auditPartition() rather than producing a divide-by-zero.
    if (c.law === 'folded_plus_wlc' && zNm <= c.rigid_nm) return 0.0;
    let lo = 0.0;
    let hi = hiPN;
    for (let i = 0; i < 400; i += 1) {
      const mid = 0.5 * (lo + hi);
      if (this.regionExtension(id, mid) < zNm) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  /**
   * Partition a given I-band total across the four regions by force balance.
   * The total is preserved exactly (to solver precision), so filament
   * positions, overlap, M-line and lattice are untouched -- only titin's
   * internal region boundaries move.
   */
  partition(totalNm) {
    const F = this.solveForce(totalNm);
    const ext = {};
    for (const id of IBAND_ORDER) ext[id] = this.regionExtension(id, F);
    return {
      force_pN: F,
      extension_nm: ext,
      total_nm: IBAND_ORDER.reduce((a, id) => a + ext[id], 0),
      evidence_class: 'MODELED (series force balance over MEASURED chain parameters)',
      basis: 'series force balance over sourced force-extension laws',
    };
  }

  /**
   * Fraction of chain compliance dz/dF carried by each region at force F.
   * THIS is what makes recruitment order a derived quantity rather than prose.
   * Central difference with a relative step, one-sided near F = 0.
   */
  complianceShares(F_pN) {
    const h = Math.max(F_pN * 1e-4, 1e-7);
    const loF = Math.max(F_pN - h, 0.0);
    const hiF = F_pN + h;
    const d = {};
    let tot = 0.0;
    for (const id of IBAND_ORDER) {
      d[id] = (this.regionExtension(id, hiF) - this.regionExtension(id, loF)) / (hiF - loF);
      tot += d[id];
    }
    const share = {};
    for (const id of IBAND_ORDER) share[id] = d[id] / tot;
    return { share, dz_dF: d, total_dz_dF: tot };
  }

  /** Regions ranked most- to least-compliant at force F. */
  complianceRank(F_pN) {
    const { share } = this.complianceShares(F_pN);
    return [...IBAND_ORDER].sort((a, b) => share[b] - share[a]);
  }

  /**
   * Audit a spec partition for internal consistency. In a series chain every
   * region must imply the SAME force; a large spread means the partition is
   * not mechanically realisable. Returns nulls for unreachable values rather
   * than silently clamping.
   */
  auditPartition(specExtensionNm) {
    const implied = {};
    const unreachable = [];
    const atFloor = [];
    for (const id of IBAND_ORDER) {
      const f = this.forceForRegion(id, specExtensionNm[id]);
      if (f === null) unreachable.push(id);
      else if (f === 0.0) atFloor.push(id);   // rigid floor: no information, no ratio
      else implied[id] = f;
    }
    const vals = Object.values(implied);
    return {
      implied_force_pN: implied,
      unreachable_at_finite_force: unreachable,
      at_rigid_floor: atFloor,
      spread: vals.length > 1 ? Math.max(...vals) / Math.min(...vals) : null,
      consistent: vals.length > 1 ? (Math.max(...vals) / Math.min(...vals)) < 3.0 : null,
      criterion: 'series topology requires one common force; spread is the '
               + 'ratio max/min of the per-region implied forces',
    };
  }
}
