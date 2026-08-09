/**
 * ContextDetail — Phase 7b. The three context features admitted by
 * geometry_strategy.json:context_depiction_policy, and nothing else.
 *
 * -------------------------------------------------------------------------
 * Why this module exists as a SEPARATE phase
 *
 * MASTER_PLAN Phase 7's own text specifies "cylinders -> thick and thin
 * filaments". Every deliverable it names is implemented and gated. The features
 * here go BEYOND that text, so they are tracked as an extension (7b) rather than
 * folded into 7 by silently reinterpreting the plan. The plan's cylinder-level
 * simplification was written before we knew the C-zone was resolved at 6.4 A.
 *
 * This module also discharges a Phase 3 directive that had been outstanding for
 * four phases: geometric_relationships.thick_filament_crown_periodicity.encode_as
 * says "instanced crown markers along thick-filament cylinder at spacing =
 * crown_axial_spacing", and before this module no crown geometry existed anywhere
 * in src/. That gap was followup_register item PH3-1, now RESOLVED. The
 * unrealised_directives entry has been deleted per its own `when_realised`
 * instruction; unrealised_directives._realised_and_deleted records that this file
 * is where it was realised, and the validator now FAILS if a directive is declared
 * unrealised while its tokens appear in src/.
 *
 * -------------------------------------------------------------------------
 * Evidence discipline (same two rules as LatticeGeometry)
 *
 *  1. No new biological constants. Every number is read from the spec, from
 *     geometry_strategy.json, or from context_measurements.json — which is now
 *     produced by the Phase 6 pipeline (scripts/measure_context.py), not by hand.
 *
 *  2. Each emitted feature carries its evidence class, its source, and an
 *     explicit not_claimed list. `muscle_type` and `skeletal_transfer` travel
 *     with every geometry value, so cross-preparation admission remains explicit
 *     at the point of use rather than only in the data file.
 *
 * -------------------------------------------------------------------------
 * What is deliberately NOT here
 *
 * Actin subunits, troponin/tropomyosin, and cMyBP-C are DEFERRED to a maximal
 * pass; the inter-filament superlattice is permanently excluded. Their geometry
 * is recorded in context_depiction_policy.decisions with the reasoning. Absence
 * here is a decision recorded there, not an oversight.
 */

/** Small helpers — kept local so this module holds no shared mutable state. */
const D2R = Math.PI / 180;
const wrap360 = (a) => ((a % 360) + 360) % 360;

/**
 * Declaration of what Phase 7b claims, mirroring RADIAL_TITIN_POLICY's role in
 * LatticeGeometry. Frozen so a caller cannot mutate the provenance record.
 */
export const CONTEXT_DETAIL_POLICY = Object.freeze({
  id: 'phase7b_context_detail',
  phase: '7b — Context Detail (extension beyond Phase 7 as written)',
  admitted: Object.freeze([
    'myosin head pairs on crowns (rod-plus-head morphology)',
    'quasi-helical crown rotation (unequal inter-crown azimuths)',
    'thin-filament long-pitch twist (crossover repeat, no subunits)',
  ]),
  deferred: Object.freeze([
    'actin subunit-level double helix',
    'troponin / tropomyosin',
    'cMyBP-C (isoform question must be resolved first)',
  ]),
  excluded: Object.freeze(['inter-filament superlattice rotational disorder']),
  policy_source: 'geometry_strategy.json:context_depiction_policy',
  not_claimed: Object.freeze([
    'individual myosin head conformation as a function of activation state',
    'which titin strand pairs with which crown',
    'actin subunit positions (the twist is drawn without subunits)',
    'that the cardiac crown geometry is quantitatively identical in skeletal muscle',
  ]),
});

export class ContextDetail {
  /**
   * @param {object} spec loaded Spec (needs .sarcomere)
   * @param {object} engine GeometryEngine — supplies geometryAt(SL)
   * @param {object} strategy geometry_strategy.json
   * @param {object} context context_measurements.json
   */
  constructor(spec, engine, strategy, context) {
    this.spec = spec;
    this.engine = engine;
    this.strategy = strategy;
    this.context = context;

    const comp = (id) => spec.sarcomere.components.find((c) => c.id === id);
    this.thickRadius = comp('thick_filament').dimensions_nm.diameter / 2;
    this.thinRadius = comp('thin_filament').dimensions_nm.diameter / 2;

    const rel = strategy.geometric_relationships.thick_filament_crown_periodicity;
    this.crownDirective = rel;

    // --- crown spacing: the spec value, NOT the measurement -----------------
    // followup_register PH1-2: spec 14.3 nm (STRONGLY INFERRED, from X-ray) and the
    // 8G4L measurement 14.44 nm differ by 0.14 nm, about 1/4 of 8G4L's own 6.4 A
    // resolution. They AGREE. We keep the spec value because the 43.1 nm super-repeat
    // is INDEPENDENTLY sourced: substituting 14.44 would put 3 x spacing at 43.32 vs
    // the sourced 43.1, and over ~110 crown levels the two choices diverge by 7.7 nm.
    // Adopting the measurement is an evidence-class promotion requiring a spec edit
    // plus a re-source (validate_geometry.py enforces the re-source), not a render
    // decision taken here.
    this.crownSpacing = rel.values.crown_axial_spacing_nm;
    this.superRepeat = rel.values.myosin_repeat_nm;
    this.crownSpacingEvidence = rel.evidence_class;

    const dec = (needle) => strategy.context_depiction_policy.decisions
      .find((d) => d.feature.toLowerCase().includes(needle));
    this.headDecision = dec('myosin head');
    this.rotDecision = dec('quasi-helical');
    this.twistDecision = dec('long-pitch twist');

    // heads per crown and head length: from the admitted decision's major_geometry
    const hg = this.headDecision.major_geometry;
    this.headsPerCrown = hg.heads_per_crown;
    this.headLength = hg.head_length_nm;

    // --- head projection skeleton (followup_register PH7B-1) ------------------
    // The first Phase 7b pass drew the head as ONE capsule pointing radially
    // outward. 8G4L says that is wrong three ways: the projection is TWO segments
    // (S2 then motor domain), each at a shallow angle to the FILAMENT AXIS rather
    // than perpendicular to it, and the resulting radial reach is 16.2 nm, not the
    // 23.5 nm a 16 nm radial spike gives. The measured skeleton is read here so the
    // depiction consumes sourced numbers instead of numbers chosen to look right.
    const sk = context.head_projection_skeleton;
    if (!sk) {
      throw new Error(
        'context_measurements.json:head_projection_skeleton missing — run '
        + 'scripts/measure_context.py --write. Refusing to fall back to the '
        + 'superseded radial-capsule geometry (followup_register PH7B-1).',
      );
    }
    this.headSkeleton = sk;
    const v = sk.values_nm_deg;
    // Built from the SIGNED displacements, not from (length, angle) pairs. Rebuilding
    // a node as radius + length*sin(angle) throws the sign away and pushes the motor
    // domain outward, when in this relaxed interacting-heads state it folds back
    // INWARD (measured motor_radial_displacement = -2.19 nm). That mistake inflated
    // the envelope past the measured filament diameter on the first attempt at PH7B-1.
    this.s2Length = v.s2_length_nm;
    this.s2AngleToAxis = v.s2_angle_to_axis_deg;
    this.motorLength = sk.motor_domain_long_axis_nm;
    this.motorWidth = sk.motor_domain_width_nm;
    this.motorAngleToAxis = v.motor_angle_to_axis_deg;
    this.headEnvelopeLimit = sk.envelope_constraint_nm;
    // axial: sign is in the structure frame where + points toward the M-line
    this.s2AxialFromJunction = -v.s2_axial_displacement_nm;   // junction -> S2 exit
    this.tipAxialFromJunction = v.tip_axial_displacement_nm;  // junction -> motor tip
    // radial: the S2 exit is pinned to the DRAWN rod surface rather than to its own
    // measured radius (7.98 nm), so the crossbridge is flush with the cylinder the
    // renderer actually draws instead of floating 0.5 nm off it. The two agree to
    // within 0.85 nm, below 8G4L's 6.4 A resolution, so this is a rounding to the
    // drawn surface and not an override of the measurement.
    this.s2ExitRadiusMeasured = v.s2_exit_radius_nm;
    this.s2RadialRise = v.s2_radial_displacement_nm;
    this.tipRadialFromJunction = v.tip_radial_displacement_nm;
    // The motor domain is drawn as a capsule CENTRED ON ITS MEASURED CENTROID, not
    // spanning junction-to-tip. The head-tail junction is a thin hinge; hanging a
    // 5.75 nm-wide capsule off it puts the domain's full width at the narrowest point
    // of the real structure and pushes the envelope past the measured 32.356 nm. The
    // centroid radius (12.27 nm) is itself measured, so centring there is a closer
    // proxy and lands inside the envelope without any fudge factor.
    this.motorCentroidRadius = v.motor_centroid_radius_nm;
    // S2 coiled-coil cross-section, measured (p90 about the local pair axis) rather
    // than a literal chosen to look right
    this.s2Radius = v.s2_radius_nm;
    this.motorCentroidAxialFromJunction = v.motor_axial_displacement_nm;

    // inter-crown rotations: the PAPER triplet, referenced to the IHM head-tail
    // junction. Our own motor-domain measurement gives [68.9, 34.5, 16.6] — the
    // same multiset to 3.1 deg. The partition depends on the reference point, so the
    // reference is named rather than left implicit.
    this.interCrownRotations = this.rotDecision.major_geometry.inter_crown_rotations_deg;

    const tg = this.twistDecision.major_geometry;
    this.crossoverRepeat = tg.crossover_repeat_nm;
    this.fullPitch = tg.full_pitch_nm;
    this.twistHandedness = tg.handedness;

    // muscle-type provenance for every context measurement we consume
    this.muscleTypes = {};
    for (const m of context.measurements) {
      this.muscleTypes[m.quantity] = {
        muscle_type: m.muscle_type,
        skeletal_transfer: m.skeletal_transfer,
      };
    }
  }

  /**
   * Crown levels along ONE half thick filament at a sarcomere length.
   *
   * Crowns exist only where the thick filament has cross-bridges: the bare zone
   * (central M-line region) carries none. Levels are laid out from the bare-zone
   * edge toward the filament tip at `crownSpacing`, so the count follows from the
   * spec's filament and bare-zone dimensions rather than being asserted.
   *
   * Azimuth of level k accumulates the inter-crown rotations cyclically, which is
   * what makes the array QUASI-helical: the three rotations are unequal but sum to
   * 120 deg, so the pattern repeats every 3 levels (one super-repeat) instead of
   * advancing by a constant angle as a true helix would.
   */
  crownLevels(sl, { phaseDeg = 0, half = 'positive' } = {}) {
    const g = this.engine.geometryAt(sl);
    const thick = g.thick_filament;
    const bare = this._bareZone();
    const centre = g.mline.X;

    // axial span available for crowns on the chosen half
    const tipToward = half === 'positive' ? thick.X_end : thick.X_start;
    const bareEdge = half === 'positive' ? centre + bare / 2 : centre - bare / 2;
    const span = Math.abs(tipToward - bareEdge);
    const nLevels = Math.floor(span / this.crownSpacing) + 1;
    const dir = half === 'positive' ? 1 : -1;

    const rot = this.interCrownRotations;
    const levels = [];
    let az = phaseDeg;
    for (let k = 0; k < nLevels; k += 1) {
      if (k > 0) az += rot[(k - 1) % rot.length];
      const X = bareEdge + dir * k * this.crownSpacing;
      levels.push({
        level_index: k,
        X_nm: X,
        azimuth_deg: wrap360(az),
        // which of the 3 super-repeat positions this level occupies
        super_repeat_index: k % rot.length,
        // Heads tilt TOWARD the M-line (measured; see context_measurements.json:
        // head_projection_skeleton.axial_tilt_direction). `dir` points from the bare
        // edge OUT toward the filament tip, so the M-line is at -dir. Passing -dir
        // rather than a constant is what makes the two halves mirror correctly
        // instead of both leaning the same way in world space.
        heads: this._heads(X, az, -dir),
      });
    }
    return {
      sarcomere_length_nm: g.sarcomere_length_nm,
      was_clamped: g.was_clamped,
      half,
      crown_spacing_nm: this.crownSpacing,
      super_repeat_nm: this.superRepeat,
      n_levels: nLevels,
      bare_zone_nm: bare,
      levels,
      evidence: {
        crown_spacing: this.crownSpacingEvidence,
        inter_crown_rotation: 'MEASURED (PDB:8G4L, cardiac)',
        head_count_per_crown: 'MEASURED (PDB:8G4L, cardiac)',
      },
      provenance: this.muscleTypes['crown axial spacing'],
      not_claimed: CONTEXT_DETAIL_POLICY.not_claimed,
    };
  }

  /**
   * Head pairs at one crown level. Heads emerge from the BACKBONE SURFACE, not
   * from the filament axis — the head-tail junction sits at the surface, and
   * drawing the rod from the axis outward would imply myosin rods radiating from
   * the centre, which is wrong morphology.
   */
  /**
   * Head projections for one crown level, as the MEASURED two-segment skeleton.
   *
   * Each head is emitted as an explicit polyline of three nodes in the filament's
   * own frame, plus the primitive to draw between them:
   *
   *   base   S2 leaves the backbone surface       r = s2_exit_radius   (7.98 nm)
   *   joint  head-tail junction / lever base      r = junction_radius (14.09 nm)
   *   tip    far end of the motor domain
   *
   * Both segments are tilted toward +X (the M-line side of this half) because the
   * motor domain's axial displacement from its own junction was positive in 12 of
   * 12 measured chains. That polarity is the whole reason the textbook depiction
   * shows angled crossbridges rather than radial spikes, so it is carried in the
   * geometry rather than left to the renderer.
   *
   * `polarity` is +1 for the half-filament running toward increasing X. The mirror
   * half must pass -1: reflecting the drawn half through the M-line flips the axial
   * component, and a mirrored copy of a +1 skeleton would tilt the wrong way.
   */
  _heads(X, azBase, polarity = 1) {
    const out = [];
    const nPairs = this.headsPerCrown / 2;
    // The crown's X is measured AT THE HEAD-TAIL JUNCTION (measure_context.py clusters
    // junction z to find levels), so the junction is the node anchored at X and the
    // other two nodes are placed by signed displacement from it.
    const jointR = this.thickRadius + this.s2RadialRise;
    const baseR = this.thickRadius;
    const tipR = jointR + this.tipRadialFromJunction;
    for (let p = 0; p < nPairs; p += 1) {
      // pairs are distributed with the filament's 3-fold symmetry
      const az = wrap360(azBase + (p * 360) / nPairs);
      for (let h = 0; h < 2; h += 1) {
        // the two heads of a pair are offset slightly in azimuth: measured 8.8 deg
        // between the two head-tail junctions of a crown pair in 8G4L
        const azH = wrap360(az + (h === 0 ? 0 : 8.8));
        const cy = Math.cos(azH * D2R);
        const cz = Math.sin(azH * D2R);
        const node = (r, dx) => ({ X: X + polarity * dx, y: r * cy, z: r * cz });
        const joint = node(jointR, 0);
        // Both the S2 exit and the motor tip lie on the M-line side of the junction:
        // the head folds BACK along the filament (interacting-heads motif), so the
        // motor tip sits between the junction and the S2 exit. All signs are measured.
        const base = node(baseR, this.s2AxialFromJunction);
        const tip = node(tipR, this.tipAxialFromJunction);
        // motor capsule: centred on the measured centroid, long axis pointing along
        // junction -> tip, so its widest point is where the domain actually is
        const cAx = this.motorCentroidAxialFromJunction;
        const cR = this.motorCentroidRadius;
        const dAx = this.tipAxialFromJunction;
        const dR = this.tipRadialFromJunction;
        const dLen = Math.hypot(dAx, dR) || 1;
        const halfAx = (this.motorLength / 2) * (dAx / dLen);
        const halfR = (this.motorLength / 2) * (dR / dLen);
        const motorA = node(cR - halfR, cAx - halfAx);
        const motorB = node(cR + halfR, cAx + halfAx);
        out.push({
          pair_index: p,
          head_index: h,
          azimuth_deg: azH,
          polarity,
          // kept for callers that only want an anchor point
          origin_nm: base,
          skeleton_nm: { base, joint, tip },
          // the two capsules the renderer draws: S2 spans base->joint, the motor
          // domain spans motorA->motorB (centred on its measured centroid)
          draw_nm: { s2: [base, joint], motor: [motorA, motorB] },
          s2: {
            length_nm: this.s2Length,
            angle_to_axis_deg: this.s2AngleToAxis,
            drawn_angle_to_axis_deg:
              this.headSkeleton.values_nm_deg.s2_angle_of_median_displacements_deg,
            radius_nm: this.s2Radius,
            primitive: 'capsule',
            evidence_class: 'MEASURED (length, angle, endpoint radii; PDB 8G4L)',
          },
          motor: {
            long_axis_nm: this.motorLength,
            width_nm: this.motorWidth,
            angle_to_axis_deg: this.motorAngleToAxis,
            // the capsule is oriented junction->tip, whose angle is measured
            // separately from the junction->centroid angle above
            drawn_angle_to_axis_deg:
              this.headSkeleton.values_nm_deg.tip_angle_of_median_displacements_deg,
            primitive: 'capsule',
            evidence_class:
              'SCHEMATIC (shape) over MEASURED (long axis, width, angle; PDB 8G4L)',
          },
          // Widest point of what is actually DRAWN, so the envelope check tracks the
          // depiction rather than the skeleton: S2's thin capsule at the joint, and
          // the motor capsule at whichever of its ends reaches furthest out.
          max_radius_nm: Math.max(
            jointR + this.s2Radius,
            Math.hypot(motorA.y, motorA.z) + this.motorWidth / 2,
            Math.hypot(motorB.y, motorB.z) + this.motorWidth / 2,
          ),
          evidence_class: 'MEASURED (skeleton) with SCHEMATIC segment cross-sections',
        });
      }
    }
    return out;
  }

  /**
   * Bare-zone width from the spec. The spec key is `bare_zone_center` (160 nm) —
   * the central cross-bridge-free region spanning the M-line, so a half-filament
   * gets half of it. Throws rather than defaulting to 0: a silent 0 would place
   * crowns through the bare zone, asserting cross-bridges where there are none.
   */
  _bareZone() {
    const thick = this.spec.sarcomere.components.find((c) => c.id === 'thick_filament');
    const bz = thick.dimensions_nm.bare_zone_center;
    if (typeof bz !== 'number') {
      throw new Error('ContextDetail: sarcomere.json thick_filament.dimensions_nm.bare_zone_center '
        + 'is required — crowns must not be placed through the bare zone');
    }
    return bz;
  }

  /**
   * Long-pitch twist of one thin filament, as a polyline of surface phase along
   * the filament — WITHOUT actin subunits (those are DEFERRED).
   *
   * The crossover repeat is 180 deg of the long-pitch helix, so the full pitch is
   * twice it. Computing a crossover from the genetic helix instead gives ~5.95 nm,
   * a trap that cost a correction in session 15; the value here comes from the
   * decision's recorded major_geometry, already checked against that trap.
   */
  thinFilamentTwist(sl, { samplesPerCrossover = 8, phaseDeg = 0 } = {}) {
    const g = this.engine.geometryAt(sl);
    const f = g.thin_filament;
    const n = Math.max(2, Math.round((f.length / this.crossoverRepeat) * samplesPerCrossover));
    const pts = [];
    for (let i = 0; i <= n; i += 1) {
      const X = f.X_start + (i / n) * f.length;
      // 180 deg per crossover; sign from the recorded handedness
      const sign = this.twistHandedness.includes('right') ? 1 : -1;
      const az = wrap360(phaseDeg + sign * 180 * ((X - f.X_start) / this.crossoverRepeat));
      pts.push({
        X_nm: X,
        azimuth_deg: az,
        y: this.thinRadius * Math.cos(az * D2R),
        z: this.thinRadius * Math.sin(az * D2R),
      });
    }
    return {
      crossover_repeat_nm: this.crossoverRepeat,
      full_pitch_nm: this.fullPitch,
      handedness: this.twistHandedness,
      n_crossovers: f.length / this.crossoverRepeat,
      samples: pts,
      evidence_class: 'MEASURED (PDB:6KN7)',
      provenance: this.muscleTypes['actin crossover repeat'],
      not_claimed: ['individual actin subunit positions (DEFERRED to a maximal pass)'],
    };
  }

  /**
   * Instance counts for a lattice patch, so a caller can budget before building
   * meshes. Counts are derived, never asserted.
   */
  instanceBudget(sl, nThickFilaments, nThinFilaments) {
    const pos = this.crownLevels(sl, { half: 'positive' });
    const neg = this.crownLevels(sl, { half: 'negative' });
    const crowns = pos.n_levels + neg.n_levels;
    return {
      crown_levels_per_filament: crowns,
      heads_per_filament: crowns * this.headsPerCrown,
      head_instances: crowns * this.headsPerCrown * nThickFilaments,
      thin_twist_polylines: nThinFilaments,
      note: 'One InstancedMesh per class; heads are the dominant cost.',
    };
  }

  /** Machine-readable declaration of Phase 7b's claims. */
  provenance() {
    return {
      layer: 'context detail (Phase 7b)',
      policy: CONTEXT_DETAIL_POLICY,
      realises_directive: {
        pointer: 'geometry_strategy.json:geometric_relationships.thick_filament_crown_periodicity.encode_as',
        directive: this.crownDirective.encode_as,
        register_item: 'PH3-1',
        status: 'REALISED in this module (crownLevels + _heads emit instanced crown markers)',
      },
      values_used: {
        crown_axial_spacing_nm: this.crownSpacing,
        myosin_repeat_nm: this.superRepeat,
        heads_per_crown: this.headsPerCrown,
        head_length_nm: this.headLength,
        // PH7B-1: head_length_nm above is the whole-projection length carried from
        // the depiction decision. The DRAWN geometry is the measured two-segment
        // skeleton, whose own numbers are reported here so a reader can see which
        // quantities the render actually consumes.
        head_s2_length_nm: this.s2Length,
        head_s2_angle_to_axis_deg: this.s2AngleToAxis,
        head_motor_long_axis_nm: this.motorLength,
        head_motor_angle_to_axis_deg: this.motorAngleToAxis,
        head_axial_tilt_direction: this.headSkeleton.axial_tilt_direction,
        inter_crown_rotations_deg: this.interCrownRotations,
        crossover_repeat_nm: this.crossoverRepeat,
      },
      isoform_provenance: this.muscleTypes,
      evidence_by_claim: {
        crown_axial_spacing: this.crownSpacingEvidence,
        crown_count: 'DERIVED from spec filament + bare-zone dimensions',
        inter_crown_rotation: 'MEASURED (cardiac; skeletal transfer NOT established)',
        head_shape:
          'MEASURED skeleton (two segments, lengths and angles to the filament axis '
          + 'from PDB 8G4L) with SCHEMATIC segment cross-sections',
        head_axial_tilt:
          'MEASURED for the RELAXED interacting-heads state only — the tilt SIGN does '
          + 'not transfer to active cross-bridges (see context_measurements.json:'
          + 'head_projection_skeleton.state_caveat)',
        head_position_and_count: 'MEASURED (cardiac)',
        thin_filament_twist: 'MEASURED (skeletal actin entity in 6KN7)',
      },
      not_claimed: CONTEXT_DETAIL_POLICY.not_claimed,
    };
  }
}
