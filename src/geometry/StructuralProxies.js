/**
 * Representation level 2 — structural proxies (Phase 6).
 *
 * Level 1 places validated archetypes. Level 3 keeps full mmCIF as an offline
 * validation asset. This level sits between: for each domain class whose
 * geometry has been MEASURED from deposited coordinates, it publishes the
 * fitted primitive parameters and the evidence that the fit is faithful.
 *
 * Deliberately NOT a mesh loader. The Phase-6 measurement showed that every
 * fitted primitive here is fully described by three to four numbers, so the
 * proxy is a parameter set the renderer instantiates procedurally. Shipping GLB
 * files would add binary assets carrying no geometric information beyond these
 * values, and would invite the reader to believe surface detail is claimed.
 *
 * The distinction this module must never blur: a MEASURED size is not a
 * measured ORIENTATION. The kinase's chain direction lies far off its longest
 * principal axis, so its ellipsoid size is measured while its rotation about
 * the sarcomere axis remains UNKNOWN.
 */

const EPS = 1e-9;

export class StructuralProxies {
  /**
   * @param {object} strategy geometry_strategy.json
   */
  constructor(strategy) {
    this.strategy = strategy || {};
    this.archetypes = this.strategy.domain_archetypes || {};
  }

  /** Domain classes carrying Phase-6 measured geometry, in spec order. */
  availableClasses() {
    return Object.keys(this.archetypes).filter(
      (k) => this.archetypes[k].measured_geometry
        && this.archetypes[k].geometry_derived_from_coordinates === true,
    );
  }

  /**
   * Fitted proxy for one domain class, or null if it has no measured geometry.
   *
   * `axial_length_nm` is intentionally read from the archetype rather than from
   * the measurement: for Ig_like and Fn3 the reviewed literature value is
   * authoritative and the measurement is corroboration, not a replacement.
   */
  proxyFor(domainClass) {
    const a = this.archetypes[domainClass];
    if (!a || !a.measured_geometry) return null;
    const g = a.measured_geometry;

    const axialUsed = a.axial_length_nm;
    const axialMeasured = g.n_to_c_axial_nm;
    const chainAligned = g.n_to_c_vs_long_axis_deg != null
      && g.n_to_c_vs_long_axis_deg <= 30;

    return {
      domain_class: domainClass,
      primitive: a.primitive || null,
      // --- parameters the renderer needs ---
      axial_length_nm: axialUsed != null ? axialUsed : null,
      lateral_diameter_nm: a.lateral_diameter_nm != null ? a.lateral_diameter_nm : null,
      ellipsoid_semi_axes_nm: a.ellipsoid_semi_axes_nm || null,
      // --- what was measured, kept separate from what is used ---
      measured: {
        n_to_c_axial_nm: axialMeasured,
        longest_principal_extent_nm: g.longest_principal_extent_nm,
        mean_cross_section_nm: g.mean_cross_section_nm,
        radius_of_gyration_nm: g.radius_of_gyration_nm,
        n_to_c_vs_long_axis_deg: g.n_to_c_vs_long_axis_deg,
        n_independent_entries: g.n_independent_entries,
        entries_used: g.entries_used,
        source: g.source,
      },
      // --- is the primitive a faithful envelope? (Phase-6 step 8) ---
      fit_quality: {
        capsule_enclosure_frac: g.capsule_enclosure_frac,
        ellipsoid_enclosure_frac: g.ellipsoid_enclosure_frac,
        enclosure_of_chosen_primitive: a.primitive === 'ellipsoid'
          ? g.ellipsoid_enclosure_frac
          : g.capsule_enclosure_frac,
      },
      // --- claims ---
      // NOTE two different senses of "measured" meet here, and conflating them
      // would misreport provenance. The spec's evidence class MEASURED means
      // "experimentally determined" — the literature axial length is MEASURED in
      // that sense, by the cited cryo-EM study. This flag is narrower: it asks
      // whether the value in use came from THIS pipeline's coordinate fits.
      axial_length_from_this_pipeline: g.axial_length_adopted !== false,
      axial_length_evidence_class: (a.evidence_by_claim || {}).axial_length_nm || null,
      axial_length_provenance: g.axial_length_adopted === false
        ? `literature (${g.literature_axial_source}), corroborated by measurement`
        : `measured in this pipeline (${g.source})`,
      lateral_diameter_evidence: (a.evidence_by_claim || {}).lateral_diameter_nm || null,
      chain_aligned: chainAligned,
      orientation_claim: chainAligned
        ? 'chain direction is within 30 deg of the long axis; axial alignment is supported'
        : 'chain direction is far off the long axis; the primitive marks SIZE only and '
          + 'its rotation about the sarcomere axis is UNKNOWN',
      not_claimed: a.not_claimed || [],
      replaces_archetype: false,
    };
  }

  /**
   * The level-2 payload. Shape is backwards-compatible with the Phase-4 stub
   * (`level`, `available`, `note`) so existing consumers keep working.
   */
  describe() {
    const classes = this.availableClasses();
    const proxies = {};
    for (const c of classes) proxies[c] = this.proxyFor(c);
    const adoption = this.strategy.measured_geometry_adoption || null;
    return {
      level: 2,
      available: classes,
      proxies,
      asset_format: 'procedural parameters (no mesh files)',
      asset_rationale: adoption ? adoption.asset_export : null,
      adoption_policy: adoption,
      note: classes.length
        ? `Phase-6 fitted primitives for ${classes.join(', ')}, measured from deposited `
          + 'coordinates. Sizes are MEASURED; orientation claims are made only where the '
          + 'chain direction is close to the primitive long axis.'
        : 'No PDB-derived proxies substituted yet.',
    };
  }

  /**
   * Guard the level-2 payload. Returns { errors, notes }.
   *
   * These are the ways this layer could quietly assert more than the
   * coordinates support, so each is a hard error rather than a note.
   */
  /**
   * Interaction geometry BETWEEN consecutive domains (Phase 6, plan step 5).
   *
   * The per-class measurements come from single-domain entries, which cannot
   * express a domain-to-domain relationship. This comes from tandem depositions.
   *
   * Returns null when the spec carries no interdomain record. Never returns a
   * per-domain azimuth: Ig-Ig linkers are flexible, so a crystal shows one
   * conformation and `adopted_as_coordinates` is always false. Its purpose is to
   * report whether the SCHEMATIC alternating-azimuth policy is consistent with
   * observed tandems.
   */
  interdomainGeometry() {
    const g = this.strategy.interdomain_geometry;
    if (!g) return null;
    const c = g.what_it_constrains || {};
    return {
      evidence_class: g.evidence_class,
      entries_used: g.entries_used || [],
      n_independent_pairs: g.n_independent_pairs,
      centre_to_centre_nm: g.centre_to_centre_nm,
      interaxis_bend_deg: g.interaxis_bend_deg,
      abs_twist_deg: g.abs_twist_deg,
      // Guardrail: this module must never hand a renderer an azimuth to apply.
      adopted_as_coordinates: g.adopted_as_coordinates === true,
      constrains_policy: c.policy_id || null,
      policy_evidence_class: c.policy_evidence_class_after_this || null,
      constant_azimuth_excluded: (c.measured_abs_twist_median_deg || 0) > 20,
      // Lattice-free in-situ check: spacing ONLY. A 6.4 A map cannot support a
      // per-domain axis, so this never carries bend or twist.
      in_situ_cross_check: g.in_situ_cross_check || null,
      not_claimed: g.not_claimed || [],
    };
  }

  verify() {
    const errors = [];
    const notes = [];

    // 0. Interaction geometry, if recorded, must stay evidence — never a
    //    coordinate. A flexible linker's crystal conformation is one sample.
    //    Checked before the per-class loop because it is spec-wide, not per class.
    const inter = this.interdomainGeometry();
    if (inter) {
      if (inter.adopted_as_coordinates) {
        errors.push('interdomain geometry is adopted as coordinates, but an '
          + 'Ig-Ig linker is flexible and one crystal conformation is not canonical');
      }
      if (!/SCHEMATIC/.test(inter.policy_evidence_class || '')) {
        errors.push('interdomain measurement upgraded the azimuth policy past '
          + `SCHEMATIC (got '${inter.policy_evidence_class}')`);
      }
      if (new Set(inter.entries_used).size < 3) {
        errors.push(`interdomain geometry rests on ${inter.entries_used.length} `
          + 'entries; at least 3 independent entries are required');
      }
      const isc = inter.in_situ_cross_check;
      if (isc) {
        for (const k of ['bend_deg', 'abs_twist_deg', 'twist_deg']) {
          if (isc[k] != null) {
            errors.push(`in-situ cross-check (${isc.pdb_id}, ${isc.resolution_A} A) `
              + `claims ${k}; that resolution supports centroid spacing only`);
          }
        }
        notes.push(`in situ (${isc.pdb_id}, ${isc.resolution_A} A, no lattice): `
          + `spacing ${isc.centre_to_centre_nm?.median} nm over `
          + `${isc.centre_to_centre_nm?.n} pairs, within `
          + `${Math.abs(isc.vs_crystal_and_literature?.in_situ_minus_literature_nm)} nm `
          + 'of the retained literature 4.0 nm');
      }
      notes.push(`interdomain: |twist| median ${inter.abs_twist_deg?.median} deg `
        + `over ${inter.n_independent_pairs} independent pairs `
        + `(${inter.entries_used.join(', ')}); constant azimuth `
        + `${inter.constant_azimuth_excluded ? 'excluded' : 'not excluded'}, `
        + 'policy remains SCHEMATIC');
    }
    for (const c of this.availableClasses()) {
      const p = this.proxyFor(c);
      const g = this.archetypes[c].measured_geometry;
      if (!p) {
        errors.push(`${c}: no structural proxy could be constructed`);
        continue;
      }

      // 1. A fitted primitive that fails to contain the atoms is not an envelope.
      const encl = p.fit_quality.enclosure_of_chosen_primitive;
      if (encl == null) {
        errors.push(`${c}: chosen primitive '${p.primitive}' has no enclosure figure`);
      } else if (encl < 0.95) {
        errors.push(`${c}: ${p.primitive} encloses only ${(encl * 100).toFixed(1)}% of `
          + 'heavy atoms (<95%); the primitive is not a faithful envelope');
      }

      // 2. Size may be measured; orientation may not be inferred from it.
      if (!p.chain_aligned) {
        const declares = (p.not_claimed || []).some((s) => /orientation|long axis/i.test(s));
        if (!declares) {
          errors.push(`${c}: chain runs ${g.n_to_c_vs_long_axis_deg} deg off the long axis `
            + 'but not_claimed[] does not disclaim the orientation');
        }
        notes.push(`${c}: SIZE measured, orientation UNKNOWN `
          + `(N-to-C ${g.n_to_c_vs_long_axis_deg} deg off long axis)`);
      }

      // 3. A measured number must not be silently substituted for the value in
      //    use. Where the literature value drives layout, say so explicitly.
      if (p.axial_length_from_this_pipeline === false) {
        if (g.axial_length_not_adopted_because == null) {
          errors.push(`${c}: measurement not adopted but no reason recorded`);
        }
        const lit = g.literature_axial_nm;
        if (lit != null && Math.abs(p.axial_length_nm - lit) > EPS) {
          errors.push(`${c}: axial_length_nm ${p.axial_length_nm} does not equal the `
            + `literature value ${lit} it claims to retain`);
        }
        notes.push(`${c}: axial length remains the literature value ${lit} nm; `
          + `measurement ${g.n_to_c_axial_nm} nm is corroboration `
          + `(${g.literature_deviation_sd} SD)`);
      }

      // 4. Every measured claim must name how many INDEPENDENT entries back it.
      if (!(g.n_independent_entries >= 2)) {
        errors.push(`${c}: measured geometry rests on ${g.n_independent_entries} `
          + 'independent entry; at least 2 required to call it MEASURED');
      }
    }
    return { errors, notes };
  }
}
