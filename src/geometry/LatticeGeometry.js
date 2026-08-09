/**
 * LatticeGeometry — the TRANSVERSE (YZ) half of the sarcomere model.
 *
 * Everything before Phase 7 was axial-only: every domain sat at y=z=0. This
 * module is where the second and third dimensions enter, so it is also where
 * the project's evidence discipline is most easily broken. Two rules govern it:
 *
 *  1. Nothing here is a new biological constant. Every number is read from the
 *     spec or derived from spec numbers by a stated identity. The class holds
 *     no literals other than the pure hexagonal-lattice constants sqrt(3), 2, 3.
 *
 *  2. Transverse structure is added ONLY where it is defensible (MASTER_PLAN
 *     Phase 7 explicitly forbids adding lattice detail for visual richness).
 *     Where the arrangement is genuinely unknown — the azimuth of the six titin
 *     molecules around a thick filament — the geometry is emitted with an
 *     explicit SCHEMATIC label and a machine-readable statement of what is not
 *     claimed, rather than being quietly invented.
 *
 * ---------------------------------------------------------------------------
 * Geometry of the vertebrate striated lattice
 *
 * Thick filaments occupy the vertices of a 2-D hexagonal (triangular) lattice
 * in the YZ plane. With lattice constant `a` (nearest thick-thick distance),
 * the primitive vectors are
 *
 *     v1 = (a, 0)                 v2 = (a/2, a*sqrt(3)/2)
 *
 * and a filament sits at every integer combination i*v1 + j*v2. Sites are
 * enumerated in hexagonal "rings" using axial coordinates: ring(i,j) =
 * max(|i|, |j|, |i+j|), so ring 0 is the central filament, ring 1 its six
 * nearest neighbours, and a patch of N rings holds 1 + 3N(N+1) filaments.
 *
 * Thin filaments sit at the TRIGONAL points — the centroids of the triangles
 * of the thick-filament lattice. This is not an extra assumption bolted on:
 * it is the arrangement that reproduces the spec's independently recorded
 * `myosin_actin_center` distance (a/sqrt(3)) and, asymptotically, the spec's
 * recorded 1 thick : 2 thin stoichiometry (each unit cell has one lattice
 * point and two triangles). A finite patch shows a ratio BELOW 2 because the
 * boundary triangles are incomplete; `latticePatch()` reports the ratio so
 * that this edge effect is visible rather than mistaken for a modelling error.
 *
 * The X-ray observable is d10, the (1,0) plane spacing, related to a by
 *
 *     d10 = a * sqrt(3) / 2        a = 2 * d10 / sqrt(3)
 *
 * and d10 itself varies with sarcomere length by the constant-volume law
 * already implemented in GeometryEngine.latticeD10(). That law is a labelled
 * idealization (see the spec's own note): the direction of the effect —
 * lattice narrowing as the sarcomere lengthens — is robust, but real muscle is
 * not strictly isovolumetric and the effective Poisson ratio is time-varying.
 * This module therefore inherits that caveat verbatim rather than restating it.
 */

/**
 * Radial placement policy for the six titins around a thick filament.
 *
 * The spec's own `unknowns` list states: "Azimuthal arrangement of the 6 titin
 * molecules around the thick filament — UNKNOWN — Symmetric distribution is a
 * SCHEMATIC choice." Six-fold symmetric placement is therefore a rendering
 * convention chosen for a stated reason, not a measurement.
 *
 * Why six-fold symmetric placement is nonetheless the right convention:
 *  - The copy number (6 per half thick filament) is MEASURED, so SOME azimuthal
 *    arrangement of exactly six strands must be drawn; refusing to place them
 *    would misrepresent the stoichiometry as unknown when it is not.
 *  - The thick filament itself is helically ordered with three-fold rotational
 *    symmetry, making a symmetric distribution the least-committal choice.
 *  - Any ASYMMETRIC arrangement would encode information the literature does
 *    not contain, and would additionally imply a broken rotational symmetry
 *    that no measurement supports.
 *
 * What is NOT claimed: the phase offset of the six strands, which strand pairs
 * with which crown, whether the arrangement is conserved between filaments,
 * and whether it is maintained along the filament length.
 */
export const RADIAL_TITIN_POLICY = Object.freeze({
  id: 'six_fold_symmetric',
  rule: 'six strands at equal 60 deg azimuthal intervals around the thick-filament axis',
  evidence_class: 'SCHEMATIC (arrangement) over MEASURED (copy number)',
  copy_number_source: 'sarcomere.json:copy_number.titin_per_half_thick_filament',
  justified_by: [
    'copy number is MEASURED, so six strands must be placed somewhere',
    'thick-filament helical symmetry makes a symmetric choice least-committal',
    'any asymmetry would encode unmeasured information',
  ],
  does_not_claim: [
    'the absolute phase of the six strands',
    'the pairing of a strand to a particular myosin crown',
    'that the arrangement is conserved between filaments or along one filament',
  ],
  spec_unknown: 'sarcomere.json:unknowns[Azimuthal arrangement of the 6 titin molecules]',

  /**
   * As of session 15 the arrangement is NO LONGER UNKNOWN: PDB 8G4L (human cardiac
   * C-zone, 6 A) resolves it, and measuring the deposited coordinates shows the six
   * strands occupy TWO radial shells in three 120 deg sectors — not one shell at
   * 60 deg. This renderer still draws the six-fold schematic, so the divergence is
   * declared here rather than left implicit: a spec that says MEASURED while the
   * renderer quietly draws something else is precisely the failure mode this
   * project's evidence classes exist to catch.
   *
   * The schematic is retained for now for a SCOPE reason, not a geometric one:
   * 8G4L is cardiac, while the sequence construct and tissue status are governed
   * by scientific_scope.json. Adopting cardiac coordinates wholesale would
   * silently mix preparations.
   */
  known_divergence_from_measurement: Object.freeze({
    status: 'DECLARED — renderer intentionally lags the measurement',
    measured_arrangement: '3 sectors x a TA/TB pair 30 deg apart; TA r=8.57 nm, TB r=6.85 nm',
    rendered_arrangement: '6 strands at equal 60 deg intervals on one 7.5 nm shell',
    // The schematic's absolute phase is unclaimed, so the azimuthal error is a
    // RANGE over that free phase, not a single number: even at the best-case phase
    // no six-fold set can sit closer than 15 deg to the measured pair arrangement,
    // because equal 60 deg spacing cannot reproduce a 30 deg intra-pair gap.
    max_azimuthal_error_deg: { best_case_phase: 15.0, worst_case_phase: 30.0 },
    max_radial_error_nm: 1.07, // TA: 8.57 measured vs 7.5 rendered (TB error 0.65)
    measured_in: 'data/context_measurements.json',
    source: 'PDB:8G4L',
    why_not_yet_adopted:
      '8G4L is CARDIAC; the current construct tissue status remains pending. '
      + 'Transferring the arrangement is a scientific-scope decision requiring construct-compatible evidence, '
      + 'not a rendering decision.',
    resolves_to: 'sarcomere.json:unknowns[Azimuthal arrangement].superseded',
  }),
});

export class LatticeGeometry {
  /**
   * @param {object} spec  loaded Spec (needs .sarcomere and .states)
   * @param {object} engine  GeometryEngine — supplies latticeD10(SL) so the
   *   constant-volume law lives in exactly one place.
   */
  constructor(spec, engine) {
    this.spec = spec;
    this.engine = engine;

    const comp = (id) => spec.sarcomere.components.find((c) => c.id === id);
    const lat = comp('lattice');
    const thick = comp('thick_filament');
    const thin = comp('thin_filament');

    // --- radii, from spec diameters (used for the surface-separation check) ---
    this.thickRadius = thick.dimensions_nm.diameter / 2;
    this.thinRadius = thin.dimensions_nm.diameter / 2;

    // --- titin copy number: MEASURED, drives the radial strand count ---
    const cn = spec.sarcomere.copy_number;
    this.titinPerHalfThick = cn.titin_per_half_thick_filament;
    this.titinCopyEvidence = cn.evidence_class;

    // --- the spec's stored lattice triple and the SL it belongs to ---
    // The stored d10/a/d_MA are NOT resting values: inverting the
    // constant-volume law on the stored d10 gives SL ~2851 nm, consistent with
    // the component's own note ("at SL=2.85um"). Recording the implied SL keeps
    // a later reader from validating the triple against the wrong length.
    this.storedD10 = lat.dimensions_nm.d10_spacing;
    this.storedLatticeConstant = lat.dimensions_nm.lattice_constant;
    this.storedMyosinActin = lat.dimensions_nm.myosin_actin_center;
    this.storedD10ImpliedSL = engine.latticeVcell
      / ((2 / Math.sqrt(3)) * this.storedD10 * this.storedD10);

    this.evidence = lat.evidence_by_claim;
    this.idealizationNote = lat.notes;
  }

  /**
   * Clamp a requested SL exactly as GeometryEngine.geometryAt does.
   *
   * The constant-volume law is closed-form and would happily evaluate at any SL,
   * but the AXIAL layer cannot: its per-state quantities are interpolated
   * between keyframes (1900-3000 nm) and extrapolating them would invent data,
   * so geometryAt clamps. Without the same clamp here, the same SL produced two
   * different lattices depending on the call path — a scene at SL=1500 would
   * draw filaments at 1900 nm spacing but a lattice at 1500 nm spacing, a 3.6 nm
   * disagreement in surface separation. Consistency with the drawn filaments
   * wins; `was_clamped` in the patch output keeps the limitation visible rather
   * than silent. Note this is narrower than the spec's declared
   * cross-study tested range [1510, 4400] — that union is scope metadata from
   * different preparations, not one physiological range and not model support.
   */
  _sl(sl) {
    return this.engine.clampSL(sl);
  }

  /** Lattice constant a (nearest thick-thick distance) at a sarcomere length. */
  latticeConstant(sl) {
    return (2 * this.engine.latticeD10(this._sl(sl).sl)) / Math.sqrt(3);
  }

  /** Thick-to-thin centre distance = a/sqrt(3) = 2*d10/3. */
  myosinActinCentre(sl) {
    return this.latticeConstant(sl) / Math.sqrt(3);
  }

  /**
   * Thick-to-thin SURFACE separation — the cross-bridge reach.
   *
   * This is derived from the live d10 value and the declared filament radii.
   * Published surface distances are condition dependent (temperature, osmotic
   * compression, species and muscle type), so this value is deliberately not
   * fitted to a literature interval or treated as an independent validation.
   */
  surfaceSeparation(sl) {
    return this.myosinActinCentre(sl) - this.thickRadius - this.thinRadius;
  }

  /**
   * Axial (i,j) sites of a hexagonal patch of `rings` rings, plus their YZ
   * coordinates at a given sarcomere length.
   *
   * Returns { rings, lattice_constant_nm, d10_nm, thick, thin, stoichiometry }
   * where `thick` and `thin` are arrays of { y, z, ring? } in nm.
   */
  latticePatch(sl, rings = 1) {
    if (!Number.isInteger(rings) || rings < 0) {
      throw new Error(`latticePatch: rings must be a non-negative integer, got ${rings}`);
    }
    const { sl: slEff, wasClamped } = this._sl(sl);
    const a = this.latticeConstant(sl);
    const v1 = [a, 0];
    const v2 = [a / 2, (a * Math.sqrt(3)) / 2];
    const site = (i, j) => [i * v1[0] + j * v2[0], i * v1[1] + j * v2[1]];

    const cells = [];
    for (let i = -rings; i <= rings; i += 1) {
      for (let j = -rings; j <= rings; j += 1) {
        if (Math.max(Math.abs(i), Math.abs(j), Math.abs(i + j)) <= rings) cells.push([i, j]);
      }
    }
    const key = (i, j) => `${i},${j}`;
    const present = new Set(cells.map(([i, j]) => key(i, j)));

    const thick = cells.map(([i, j]) => {
      const [y, z] = site(i, j);
      return { y, z, i, j, ring: Math.max(Math.abs(i), Math.abs(j), Math.abs(i + j)) };
    });

    // Thin filaments at trigonal points = centroids of the lattice triangles.
    // Both triangle orientations of the triangular lattice are enumerated; a
    // triangle contributes only if all three of its thick sites are inside the
    // patch, which is what produces the honest boundary deficit.
    //
    // The ANCHOR RANGE must extend one cell beyond the patch. A triangle is
    // identified by its lowest corner (i,j), and a triangle can have that anchor
    // OUTSIDE the patch while all three of its corners are inside — e.g. at
    // rings=1 the triangle {(-1,0),(0,-1),(0,0)} is anchored at (-1,-1), which is
    // not a patch cell. Anchoring only at patch cells silently dropped that
    // triangle, giving 5 trigonal sites instead of the correct 6 and breaking the
    // patch's own 6-fold symmetry. Found by checking the rendered scene against
    // this list: the mirrored half drew a thin filament at azimuth 210 deg that
    // matched the dropped centroid to 0.0006 nm — the render was right and this
    // list was incomplete.
    //
    // Complete-triangle count is then exactly 6*rings^2 (a hexagon of side
    // `rings` tiles into that many unit triangles), which is asserted below.
    const tris = [
      [[0, 0], [1, 0], [0, 1]],
      [[1, 0], [0, 1], [1, 1]],
    ];
    const seen = new Set();
    const thin = [];
    for (let i = -rings - 1; i <= rings + 1; i += 1) {
      for (let j = -rings - 1; j <= rings + 1; j += 1) {
        for (const tri of tris) {
          const corners = tri.map(([di, dj]) => [i + di, j + dj]);
          if (!corners.every(([ci, cj]) => present.has(key(ci, cj)))) continue;
          const id = corners.map(([ci, cj]) => key(ci, cj)).sort().join('|');
          if (seen.has(id)) continue;
          seen.add(id);
          const pts = corners.map(([ci, cj]) => site(ci, cj));
          thin.push({
            y: pts.reduce((s, p) => s + p[0], 0) / 3,
            z: pts.reduce((s, p) => s + p[1], 0) / 3,
          });
        }
      }
    }
    const expectedThin = 6 * rings * rings;
    if (thin.length !== expectedThin) {
      throw new Error(`latticePatch: enumerated ${thin.length} trigonal sites for `
        + `rings=${rings}, expected 6*rings^2 = ${expectedThin}. The hexagonal patch `
        + 'tiles into exactly that many complete unit triangles, so a mismatch means '
        + 'the enumeration is dropping or duplicating sites.');
    }

    return {
      sarcomere_length_nm: slEff,
      sarcomere_length_requested_nm: sl,
      was_clamped: wasClamped,
      rings,
      lattice_constant_nm: a,
      d10_nm: this.engine.latticeD10(slEff),
      myosin_actin_centre_nm: this.myosinActinCentre(sl),
      surface_separation_nm: this.surfaceSeparation(sl),
      thick,
      thin,
      stoichiometry: {
        thick_count: thick.length,
        thin_count: thin.length,
        ratio: thin.length / thick.length,
        asymptotic_ratio: 2,
        note: 'a finite patch has ratio < 2 because boundary triangles are '
          + 'incomplete; the spec 1:2 stoichiometry is the infinite-lattice limit',
        expected_thick_count: 1 + 3 * rings * (rings + 1),
      },
      symmetry: 'hexagonal',
      evidence: this.evidence,
      idealization: this.idealizationNote,
    };
  }

  /**
   * Azimuths (degrees) of the titin strands around one thick filament.
   * Count is MEASURED; the equal spacing is the SCHEMATIC policy above.
   */
  titinAzimuths(phaseDeg = 0) {
    const n = this.titinPerHalfThick;
    return Array.from({ length: n }, (_, k) => (phaseDeg + (k * 360) / n) % 360);
  }

  /**
   * Radial offsets for the titin strands running along one thick filament.
   *
   * Titin lies on the thick-filament SURFACE in the A-band, so the strand
   * radius is the thick-filament radius. In the I-band there is no thick
   * filament to lie on, and the true path is not resolved; the strand radius
   * there is a render-only taper toward the Z-disc, declared SCHEMATIC.
   */
  titinStrandOffsets(sl, phaseDeg = 0) {
    const D = Math.PI / 180;
    return this.titinAzimuths(phaseDeg).map((az, k) => ({
      strand_index: k,
      azimuth_deg: az,
      radius_nm: this.thickRadius,
      y: this.thickRadius * Math.cos(az * D),
      z: this.thickRadius * Math.sin(az * D),
      evidence_class: RADIAL_TITIN_POLICY.evidence_class,
      policy: RADIAL_TITIN_POLICY.id,
    }));
  }

  /** Machine-readable declaration of the transverse layer's claims. */
  provenance() {
    return {
      layer: 'transverse lattice (Phase 7)',
      symmetry: 'hexagonal in YZ',
      preserves: [
        'hexagonal thick-filament packing',
        'thin filaments at trigonal points',
        'myosin-actin centre distance a/sqrt(3)',
        'd10(SL) constant-volume scaling',
        'measured titin copy number per half thick filament',
      ],
      not_claimed: [
        'titin azimuthal phase around the thick filament',
        'lattice disorder, defects, or domain boundaries',
        'time-varying Poisson ratio during active contraction',
      ],
      evidence_by_claim: {
        hexagonal_symmetry: 'STRONGLY INFERRED',
        d10_absolute: 'MODELED (calculator parameterization)',
        d10_length_and_preparation_response: 'MEASURED',
        d10_scaling_law: 'STRONGLY INFERRED (constant-volume idealization)',
        thin_at_trigonal_points: 'MEASURED (reproduces spec myosin_actin_center)',
        titin_copy_number: this.titinCopyEvidence,
        titin_azimuthal_arrangement: 'SCHEMATIC',
      },
      stored_triple_reference_sl_nm: this.storedD10ImpliedSL,
      radial_titin_policy: RADIAL_TITIN_POLICY,
      idealization: this.idealizationNote,
    };
  }
}
