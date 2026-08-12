/**
 * GeometryEngine — the interpolatable geometry API the renderer consumes.
 *
 * Turns the scientific spec into positions/dimensions at ANY sarcomere length.
 * Filament landmarks interpolate the reviewed keyframes; the four elastic titin
 * regions are re-solved at their common series force. It holds NO biological
 * constants: every number comes from the spec. It also enforces the spec's
 * "forbidden" transition rules structurally, so a renderer physically cannot
 * ask for a scientifically invalid geometry.
 *
 * Coordinate system (from spec meta): X = longitudinal (nm), origin at Z-disc
 * centre; a HALF-sarcomere is modelled (Z-disc -> M-line).
 */
import { MechanicalModel } from './MechanicalModel.js';

export class GeometryEngine {
  constructor(spec) {
    this.spec = spec;

    // --- keyframes, sorted by sarcomere length (ascending) ---
    this.keyframes = Object.entries(spec.states.states)
      .map(([name, g]) => ({ name, ...g }))
      .sort((a, b) => a.sarcomere_length_nm - b.sarcomere_length_nm);
    this.slMin = this.keyframes[0].sarcomere_length_nm;
    this.slMax = this.keyframes[this.keyframes.length - 1].sarcomere_length_nm;

    // --- invariant constants, READ FROM SPEC (not hardcoded) ---
    const tf = spec.sarcomere.components.find((c) => c.id === 'thick_filament');
    this.thickLen = tf.dimensions_nm.length_X;      // A-band length — invariant
    this.halfThick = this.thickLen / 2;
    const thin = spec.sarcomere.components.find((c) => c.id === 'thin_filament');
    this.thinLen = thin.dimensions_nm.length_X;
    const zd = spec.sarcomere.components.find((c) => c.id === 'zdisc');
    this.zWidth = zd.dimensions_nm.width_X;

    // --- lattice constant-volume law parameters, READ FROM SPEC ---
    const lat = spec.sarcomere.components.find((c) => c.id === 'lattice');
    this.latticeVcell = lat.repeating_geometry.V_cell_nm3;   // nm^3

    // titin region order in the I-band, from the spec keyframe layout
    this.titinElements = Object.keys(this.keyframes[0].titin_I_band_extension_nm);
    this.mechanicalModel = new MechanicalModel(
      spec.titin, spec.mechanicalParameters, spec.identity.model_fingerprint,
    );
    // Phase 8 established one force-balanced series model as the canonical route.
    // `keyframe` remains available only as an explicit audit/reference mode for
    // reproducing the stored piecewise-linear partitions.
    this.titinPartitionMode = 'mechanical';
  }

  setTitinPartitionMode(mode) {
    if (mode !== 'keyframe' && mode !== 'mechanical') {
      throw new Error(
        `unknown titin partition mode '${mode}'; expected 'keyframe' or 'mechanical'`,
      );
    }
    this.titinPartitionMode = mode;
    return this;
  }

  /** Clamp a requested SL into the spec's defined range and report if clamped. */
  clampSL(sl) {
    const clamped = Math.max(this.slMin, Math.min(this.slMax, sl));
    return { sl: clamped, wasClamped: clamped !== sl };
  }

  /** Find bracketing keyframes for an SL and the interpolation fraction t in [0,1]. */
  _bracket(sl) {
    const kf = this.keyframes;
    if (sl <= kf[0].sarcomere_length_nm) return { lo: kf[0], hi: kf[0], t: 0 };
    if (sl >= kf[kf.length - 1].sarcomere_length_nm) {
      const last = kf[kf.length - 1];
      return { lo: last, hi: last, t: 0 };
    }
    for (let i = 0; i < kf.length - 1; i++) {
      const a = kf[i], b = kf[i + 1];
      if (sl >= a.sarcomere_length_nm && sl <= b.sarcomere_length_nm) {
        const span = b.sarcomere_length_nm - a.sarcomere_length_nm;
        const t = span === 0 ? 0 : (sl - a.sarcomere_length_nm) / span;
        return { lo: a, hi: b, t };
      }
    }
    return { lo: kf[0], hi: kf[0], t: 0 };
  }

  static _lerp(a, b, t) { return a + (b - a) * t; }

  /**
   * Lattice d10 (nm) from the constant-volume law — the physically correct
   * nonlinear curve d10 = sqrt(V_cell / ((2/sqrt3) * SL)), computed at the exact
   * SL rather than linearly interpolated. Labelled idealization (see spec).
   */
  latticeD10(sl) {
    return Math.sqrt(this.latticeVcell / ((2 / Math.sqrt(3)) * sl));
  }

  /**
   * Full half-sarcomere geometry at an arbitrary SL.
   * Filament positions are piecewise-linear between keyframes; titin I-band
   * extensions come from a common-force series solve by default (so titin is
   * NEVER uniformly scaled); lattice d10 comes from the constant-volume law.
   */
  geometryAt(slRequested) {
    const { sl, wasClamped } = this.clampSL(slRequested);
    const { lo, hi, t } = this._bracket(sl);
    const L = GeometryEngine._lerp;

    // filament longitudinal geometry
    const halfSarc = sl / 2;
    const iBand = halfSarc - this.halfThick;                 // I-band half-width
    const iAjunction = L(lo.positions_nm.thick_tip_I_A_junction, hi.positions_nm.thick_tip_I_A_junction, t);
    const overlapLen = L(lo.positions_nm.overlap_len, hi.positions_nm.overlap_len, t);

    // Titin I-band elements. The default derives a smooth force-balanced
    // partition at this total. Explicit `keyframe` mode exists only to reproduce
    // the reviewed stored partitions for comparison and regression auditing.
    const totalFromAnchors = iBand - this.zWidth / 2;
    let titinExt;
    let titinEvidence;
    /** @type {number|null} */
    let titinForce = null;
    let mechanicalEvaluation = null;
    if (this.titinPartitionMode === 'mechanical') {
      const partition = this.mechanicalModel.partition(totalFromAnchors, {
        sarcomereLengthNm: sl,
      });
      titinExt = partition.extension_nm;
      titinEvidence = partition.evidence_class;
      titinForce = partition.force_pN;
      mechanicalEvaluation = partition;
    } else {
      titinExt = {};
      for (const el of this.titinElements) {
        titinExt[el] = L(lo.titin_I_band_extension_nm[el], hi.titin_I_band_extension_nm[el], t);
      }
      titinEvidence = lo.titin_I_band_extension_evidence_class
        || this.spec.states.meta?.evidence_by_claim?.I_band_titin_extension_partition
        || 'INFERRED';
    }
    // lay titin elements end-to-end from the Z-disc edge outward
    const titinLayout = {};
    let x = this.zWidth / 2; // titin N-terminus emerges at Z-disc edge
    for (const el of this.titinElements) {
      const len = titinExt[el];
      titinLayout[el] = { X_start: x, X_end: x + len, len };
      x += len;
    }
    const titinIbandTotal = Object.values(titinExt).reduce((a, b) => a + b, 0);

    return {
      sarcomere_length_nm: sl,
      requested_sl_nm: slRequested,
      was_clamped: wasClamped,
      half_sarcomere_nm: halfSarc,
      interpolated_between: [lo.name, hi.name],
      t,
      // filaments
      zdisc: { X: 0, width: this.zWidth },
      thin_filament: { X_start: this.zWidth / 2, X_end: this.zWidth / 2 + this.thinLen, length: this.thinLen },
      thick_filament: { X_start: iBand, X_end: iBand + this.thickLen, length: this.thickLen, invariant: true },
      mline: { X: halfSarc },
      I_A_junction_X: iAjunction,
      I_band_half_width_nm: iBand,
      overlap_len_nm: overlapLen,
      overlap_zone_nm: {
        start_nm: L(lo.positions_nm.overlap_start, hi.positions_nm.overlap_start, t),
        end_nm: L(lo.positions_nm.overlap_start, hi.positions_nm.overlap_start, t) + overlapLen,
        length: overlapLen,
      },
      // titin
      titin_partition_mode: this.titinPartitionMode,
      titin_partition_evidence_class: titinEvidence,
      titin_chain_force_pN: titinForce,
      titin_force_status: mechanicalEvaluation?.status || 'not_evaluated',
      titin_force_reason: mechanicalEvaluation?.reason || null,
      titin_force_sensitivity: mechanicalEvaluation?.sensitivity || null,
      titin_force_precision: mechanicalEvaluation?.precision || null,
      titin_mechanics_decision_status: this.mechanicalModel.parameters.decision.status,
      mechanical_parameter_set_id: this.mechanicalModel.parameterSetId,
      mechanical_model_fingerprint: this.mechanicalModel.modelFingerprint,
      titin_iband_extension_nm: titinExt,
      titin_iband_layout_nm: titinLayout,
      titin_iband_total_nm: titinIbandTotal,
      // lattice (transverse)
      lattice_d10_nm: this.latticeD10(sl),
      // copy number passthrough
      titin_per_half_thick_filament: this.spec.sarcomere.copy_number.titin_per_half_thick_filament,
    };
  }

  /** The named preset states the plan requires (contracted/resting/stretched...). */
  presets() {
    return this.keyframes.map((k) => ({
      name: k.name,
      sarcomere_length_nm: k.sarcomere_length_nm,
      biological_condition: k.biological_condition,
    }));
  }

  /** Geometry at a named preset. */
  geometryAtPreset(name) {
    const kf = this.keyframes.find((k) => k.name === name);
    if (!kf) throw new Error(`unknown preset: ${name}`);
    return this.geometryAt(kf.sarcomere_length_nm);
  }

  /**
   * Assert the spec's forbidden rules hold for a computed geometry. Returns a list
   * of violations (empty = valid). The renderer can call this on every frame.
   */
  checkForbidden(geom) {
    const v = [];
    if (Math.abs(geom.thick_filament.length - this.thickLen) > 1e-6)
      v.push('A-band (thick filament) length changed — forbidden.');
    // Confinement: the elastic I-band titin spans the Z-disc edge -> thick-filament
    // tip. Its span therefore equals (I-band half-width - Z-disc half-width), and its
    // distal end must land exactly at the A-band tip (Z1Z2 is anchored in the Z-disc).
    const els = this.titinElements;
    const distalEnd = geom.titin_iband_layout_nm[els[els.length - 1]].X_end;
    if (Math.abs(distalEnd - geom.thick_filament.X_start) > 1.0)
      v.push('distal titin end != A-band tip — extension not confined to the I-band.');
    if (Math.abs(geom.titin_iband_total_nm - (geom.I_band_half_width_nm - this.zWidth / 2)) > 1.0)
      v.push('titin elastic span != (I-band half-width - Z-disc half-width) — anchoring offset wrong.');
    return v;
  }
}
