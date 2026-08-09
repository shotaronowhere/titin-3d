/**
 * SC-5 optional skeletal MyBP-C C-zone context.
 *
 * MyBP-C is an accessory thick-filament protein, not part of titin. The SC-0
 * audit admitted it as `ADMIT_SCHEMATIC`, Tier B, Evidence audience only, off by
 * default. This module therefore emits a SPARSE, SUBORDINATE, explicitly
 * schematic descriptor and refuses to emit anything stronger.
 *
 * What is sourced (and read, never restated, here):
 *
 *   - the C-zone interval, taken from the SAME canonical derivation the SC-2
 *     band brackets already publish (A-band titin super-repeat block anchored at
 *     the bound segment's M-band end), so the showcase cannot end up with two
 *     competing C-zones;
 *   - the ~43 nm stripe periodicity and the ~3 molecules per stripe, from
 *     geometry_sources.json's fast-skeletal MyBP-C records (Hessel et al. 2024).
 *
 * What is deliberately SCHEMATIC and declared as such in the output:
 *
 *   - the axial register of the stripe block inside the C-zone;
 *   - the azimuth of each molecule;
 *   - the outward reach, orientation, and pose of every molecule.
 *
 * Two things this module structurally cannot do, because the plan's negative
 * gates are enforced in `validateMyBPCContext` rather than left to review:
 *
 *   1. reach a thin filament. Every molecule's radial extent is clamped to a
 *      fraction of the live thick-to-thin surface separation and the validator
 *      rejects any descriptor whose reach touches the thin-filament surface, so
 *      the layer can never depict an obligatory rigid thick-to-thin bridge.
 *   2. claim a titin contact. Sharing the C-zone is a periodic coincidence, not
 *      evidence of a bond; `titin_contact_rendered` is false and validated false.
 *
 * No cardiac coordinate enters here. The cardiac cMyBP-C chain placement in
 * PDB 8G4L stays where geometry_strategy.json's context_depiction_policy left
 * it — deferred — and the count used below comes from the skeletal record.
 */

const REQUIRED_CLAIM_ID = 'mybpc_czone_context';

const finite = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`MyBPCContext: ${label} must be finite.`);
  return number;
};

const claim = (spec, id) => {
  const record = spec.showcaseClaims?.objects?.find((object) => object.id === id);
  if (!record) throw new Error(`MyBPCContext: reviewed claim '${id}' is missing.`);
  return record;
};

const sourceIds = (record) => record.sources.map((source) => source.id);

const parameter = (spec, name) => {
  const record = spec.geometrySources?.parameters?.find((entry) => (
    entry.component === 'MyBP-C' && entry.parameter === name
  ));
  if (!record) throw new Error(`MyBPCContext: sourced parameter '${name}' is missing.`);
  if (record.primary_source !== '10.1038/s41467-024-46957-7') {
    throw new Error(
      `MyBPCContext: parameter '${name}' no longer cites the admitted fast-skeletal source.`,
    );
  }
  return record;
};

/**
 * Structural gate for every SC-5 negative control. Called on construction of
 * each descriptor, so an unsafe layer cannot reach the renderer at all.
 */
export function validateMyBPCContext(context) {
  if (!context || context.target !== 'mybpc') {
    throw new Error("validateMyBPCContext: expected target 'mybpc'.");
  }
  if (context.evidence_class !== 'SCHEMATIC'
      || context.placement_evidence_class !== 'SCHEMATIC') {
    throw new Error('validateMyBPCContext: MyBP-C placement must remain SCHEMATIC.');
  }
  if (context.part_of_titin !== false || context.titin_contact_rendered !== false) {
    throw new Error('validateMyBPCContext: MyBP-C is accessory context, never titin and never in contact with it.');
  }
  if (context.default_visible !== false
      || !Array.isArray(context.audience) || context.audience.length !== 1
      || context.audience[0] !== 'EVIDENCE') {
    throw new Error('validateMyBPCContext: MyBP-C stays Evidence-only and off by default.');
  }
  if (context.rigid_thick_to_thin_bridge_rendered !== false
      || context.reaches_thin_filament !== false) {
    throw new Error('validateMyBPCContext: an obligatory rigid thick-to-thin bridge is forbidden.');
  }
  const zone = context.c_zone;
  if (!Number.isFinite(zone?.start_nm) || !Number.isFinite(zone?.end_nm)
      || !(zone.end_nm > zone.start_nm)
      || Math.abs((zone.end_nm - zone.start_nm) - zone.length_nm) > 1e-9) {
    throw new Error('validateMyBPCContext: the C-zone interval is invalid.');
  }
  if (!Array.isArray(context.stripes) || !context.stripes.length) {
    throw new Error('validateMyBPCContext: at least one C-zone stripe is required.');
  }
  const spacing = context.stripe_spacing_nm;
  if (!Number.isFinite(spacing) || spacing <= 0) {
    throw new Error('validateMyBPCContext: stripe spacing must be positive.');
  }
  const clearance = context.render_dimensions_nm?.thin_filament_clearance_nm;
  if (!Number.isFinite(clearance) || clearance <= 0) {
    throw new Error('validateMyBPCContext: MyBP-C must retain positive clearance from the thin filament.');
  }
  const xs = context.stripes.map((stripe) => stripe.x_nm);
  for (const [index, stripe] of context.stripes.entries()) {
    if (!Number.isFinite(stripe.x_nm)
        || stripe.x_nm < zone.start_nm - 1e-9 || stripe.x_nm > zone.end_nm + 1e-9) {
      throw new Error(`validateMyBPCContext: stripe '${stripe.id}' falls outside the C-zone.`);
    }
    if (index > 0 && Math.abs((xs[index] - xs[index - 1]) - spacing) > 1e-9) {
      throw new Error('validateMyBPCContext: stripes must reproduce the sourced periodicity.');
    }
    if (!Array.isArray(stripe.molecules) || stripe.molecules.length !== context.molecules_per_stripe) {
      throw new Error(`validateMyBPCContext: stripe '${stripe.id}' has the wrong molecule count.`);
    }
    for (const molecule of stripe.molecules) {
      const points = [molecule.start_nm, molecule.end_nm];
      if (!points.every((point) => [point?.x, point?.y, point?.z].every(Number.isFinite))) {
        throw new Error(`validateMyBPCContext: molecule '${molecule.id}' has invalid coordinates.`);
      }
      const outer = Math.hypot(molecule.end_nm.y - stripe.site_nm.y,
        molecule.end_nm.z - stripe.site_nm.z);
      if (outer > context.render_dimensions_nm.max_outer_radius_nm + 1e-9) {
        throw new Error(`validateMyBPCContext: molecule '${molecule.id}' exceeds the declared reach envelope.`);
      }
      if (outer >= context.render_dimensions_nm.thin_filament_surface_radius_nm) {
        throw new Error(`validateMyBPCContext: molecule '${molecule.id}' would touch a thin filament.`);
      }
    }
  }
  const poses = new Set(context.stripes.flatMap((stripe) => (
    stripe.molecules.map((molecule) => molecule.axial_tilt_deg)
  )));
  if (poses.size < 2) {
    throw new Error('validateMyBPCContext: identical rigid poses for every molecule are forbidden.');
  }
  return context;
}

export class MyBPCContext {
  /**
   * @param {object} spec loaded Spec
   * @param {object} representation TitinRepresentation — owns the one canonical
   *   C-zone derivation this layer sits inside
   */
  constructor(spec, representation) {
    this.spec = spec;
    this.representation = representation;
    this.claim = claim(spec, REQUIRED_CLAIM_ID);
    if (this.claim.decision !== 'ADMIT_SCHEMATIC'
        || this.claim.render_evidence_class !== 'SCHEMATIC') {
      throw new Error('MyBPCContext: the MyBP-C layer is not admitted as SCHEMATIC.');
    }
    if (this.claim.audience.length !== 1 || this.claim.audience[0] !== 'EVIDENCE') {
      throw new Error('MyBPCContext: the MyBP-C layer is admitted for Evidence mode only.');
    }
    const budget = spec.showcaseClaims?.attention_budget || {};
    if (budget.mybpc_default_visibility !== false) {
      throw new Error('MyBPCContext: the reviewed attention budget keeps MyBP-C off by default.');
    }
    this.defaultVisible = false;

    this.stripeSpacingNm = finite(
      parameter(spec, 'MyBP-C C-zone stripe axial periodicity').value, 'stripe periodicity',
    );
    this.moleculesPerStripe = finite(
      parameter(spec, 'MyBP-C molecules per C-zone stripe').value, 'molecules per stripe',
    );
    if (!Number.isInteger(this.moleculesPerStripe) || this.moleculesPerStripe < 1) {
      throw new Error('MyBPCContext: molecules per stripe must be a positive integer.');
    }

    const thick = spec.sarcomere.components.find((component) => component.id === 'thick_filament');
    const thin = spec.sarcomere.components.find((component) => component.id === 'thin_filament');
    if (!thick || !thin) throw new Error('MyBPCContext: filament components are missing.');
    this.thickRadiusNm = finite(thick.dimensions_nm?.diameter, 'thick diameter') / 2;
    this.thinRadiusNm = finite(thin.dimensions_nm?.diameter, 'thin diameter') / 2;
  }

  /**
   * The canonical C-zone interval. Delegated, never re-derived: the representation
   * layer that places the C-zone domain block owns this formula, and the SC-2 band
   * bracket reads the same record.
   */
  cZoneAt(sl) { return this.representation.cZoneAt(sl); }

  /**
   * Sparse MyBP-C context for the central thick filament of a lattice patch.
   *
   * @param {number} sl sarcomere length in nm
   * @param {Array<{y:number,z:number}>} thickSites lattice thick-filament sites
   * @param {Array<{y:number,z:number}>} thinSites lattice thin-filament sites
   */
  contextAt(sl, thickSites, thinSites) {
    const site = [...(thickSites || [])].find((candidate) => (
      Math.hypot(candidate.y, candidate.z) < 1e-9
    ));
    if (!site) throw new Error('MyBPCContext: a central thick-filament site is required.');
    const neighbours = [...(thinSites || [])]
      .map((candidate) => Math.hypot(candidate.y - site.y, candidate.z - site.z))
      .filter((distance) => distance > 1e-9)
      .sort((a, b) => a - b);
    if (!neighbours.length) {
      throw new Error('MyBPCContext: at least one neighbouring thin-filament site is required.');
    }
    // Live, not assumed: the lattice breathes with sarcomere length, so the
    // clearance the reach is a fraction of has to be measured at this state.
    const thinSurfaceRadiusNm = neighbours[0] - this.thinRadiusNm;
    const surfaceSeparationNm = thinSurfaceRadiusNm - this.thickRadiusNm;
    if (!(surfaceSeparationNm > 0)) {
      throw new Error('MyBPCContext: the thick and thin filament surfaces do not separate at this state.');
    }
    // 40% of the free gap. The number is a presentation choice with no biological
    // claim attached, and it exists to guarantee the descriptor can never depict a
    // molecule spanning to actin.
    const reachNm = 0.4 * surfaceSeparationNm;
    const maxOuterRadiusNm = this.thickRadiusNm + reachNm;

    const zone = this.cZoneAt(sl);
    // One stripe per canonical C-zone super-repeat, spaced at MyBP-C's own sourced
    // periodicity rather than at titin's: the two repeats are near-commensurate, and
    // pinning the stripes to 45.5 nm would silently assert an exact shared register.
    const nStripes = finite(zone.n_super_repeats, 'C-zone super-repeat count');
    const blockNm = (nStripes - 1) * this.stripeSpacingNm;
    if (blockNm > zone.length_nm + 1e-9) {
      throw new Error('MyBPCContext: the stripe block does not fit inside the canonical C-zone.');
    }
    // Centred in the C-zone. The stripe REGISTER is unresolved for this model, so
    // centring is declared as the schematic choice it is rather than presented as
    // an alignment to a measured first stripe.
    const firstNm = zone.start_nm + (zone.length_nm - blockNm) / 2;

    // Three azimuths from the thick filament's own three-fold symmetry, matching
    // the ~3 molecules per repeat the skeletal source reports. Every stripe uses
    // the same azimuths because no azimuthal progression is resolved; that choice
    // is declared, not implied.
    const azimuths = Array.from({ length: this.moleculesPerStripe }, (_, index) => (
      (index * 360) / this.moleculesPerStripe
    ));
    // Deterministic, non-identical outward poses. A single shared pose would read
    // as a rigid crystallographic orientation the evidence does not support; the
    // spread is symmetric about zero so it asserts no net axial polarity either.
    const tilts = azimuths.map((_, index) => (
      this.moleculesPerStripe === 1 ? 0
        : -18 + (36 * index) / (this.moleculesPerStripe - 1)
    ));

    const stripes = Array.from({ length: nStripes }, (_, stripeIndex) => {
      const x = firstNm + stripeIndex * this.stripeSpacingNm;
      const molecules = azimuths.map((azimuth, moleculeIndex) => {
        const radians = (azimuth * Math.PI) / 180;
        const tilt = tilts[moleculeIndex];
        const tiltRadians = (tilt * Math.PI) / 180;
        // Radial reach with a small axial lean: a purely radial spoke reads as a
        // rigid strut, which is exactly the depiction the claim forbids.
        const radial = reachNm * Math.cos(tiltRadians);
        const axial = reachNm * Math.sin(tiltRadians);
        return {
          id: `mybpc_${stripeIndex}_${moleculeIndex}`,
          stripe_index: stripeIndex,
          molecule_index: moleculeIndex,
          azimuth_deg: azimuth,
          axial_tilt_deg: tilt,
          start_nm: {
            x,
            y: site.y + this.thickRadiusNm * Math.cos(radians),
            z: site.z + this.thickRadiusNm * Math.sin(radians),
          },
          end_nm: {
            x: x + axial,
            y: site.y + (this.thickRadiusNm + radial) * Math.cos(radians),
            z: site.z + (this.thickRadiusNm + radial) * Math.sin(radians),
          },
        };
      });
      return {
        id: `mybpc_stripe_${stripeIndex}`,
        stripe_index: stripeIndex,
        x_nm: x,
        site_nm: { y: site.y, z: site.z },
        molecules,
      };
    });

    return validateMyBPCContext({
      schema: 'titin-context-layer/1',
      target: 'mybpc',
      claim_id: this.claim.id,
      evidence_class: this.claim.render_evidence_class,
      claim_evidence_class: this.claim.claim_evidence_class,
      placement_evidence_class: 'SCHEMATIC',
      audience: [...this.claim.audience],
      default_visible: this.defaultVisible,
      part_of_titin: false,
      titin_contact_rendered: false,
      rigid_thick_to_thin_bridge_rendered: false,
      reaches_thin_filament: false,
      source_ids: sourceIds(this.claim),
      not_claimed: [...this.claim.not_claimed],
      c_zone: {
        ...zone,
        derivation: 'TitinRepresentation.cZoneAt — the single canonical C-zone interval '
          + 'shared with the C-zone domain block and the SC-2 band bracket',
      },
      stripe_spacing_nm: this.stripeSpacingNm,
      stripe_spacing_evidence_class: 'MEASURED',
      stripe_spacing_source_ids: sourceIds(this.claim),
      molecules_per_stripe: this.moleculesPerStripe,
      stripes,
      resolvability: {
        feature_nm: this.stripeSpacingNm,
        feature: 'MyBP-C C-zone stripe spacing',
      },
      render_dimensions_nm: {
        molecule_radius_nm: this.thinRadiusNm / 4,
        reach_nm: reachNm,
        max_outer_radius_nm: maxOuterRadiusNm,
        thin_filament_surface_radius_nm: thinSurfaceRadiusNm,
        thin_filament_clearance_nm: thinSurfaceRadiusNm - maxOuterRadiusNm,
        surface_separation_nm: surfaceSeparationNm,
      },
      render_only: [
        'axial register of the stripe block inside the canonical C-zone',
        'azimuth of every molecule',
        'outward reach, lean, and cross-section of every molecule',
        'one representative thick filament carries the layer',
      ],
      cardiac_coordinates_imported: false,
      cardinality_policy: 'approximately three molecules per ~43 nm repeat, drawn as three azimuthal proxies; not three exact molecules at every human titin super-repeat',
      axial_register_policy: 'SCHEMATIC — the stripe block is centred in the canonical C-zone because its register is unresolved for this model',
      pose_policy: 'SCHEMATIC — outward poses differ between molecules so the layer cannot read as one rigid identical bridge; no measured orientation is claimed',
      scope: this.claim.scope,
    });
  }

  /** Machine-readable declaration of what the SC-5 context layer claims. */
  provenance() {
    return {
      layer: 'MyBP-C C-zone context (SC-5)',
      claim_id: this.claim.id,
      decision: this.claim.decision,
      audience: [...this.claim.audience],
      default_visible: this.defaultVisible,
      values_used: {
        // The only two numbers this layer owns. The C-zone interval and its
        // super-repeat count are read from TitinRepresentation.cZoneAt at each
        // sarcomere length, so they are deliberately not restated here.
        stripe_spacing_nm: this.stripeSpacingNm,
        molecules_per_stripe: this.moleculesPerStripe,
        c_zone_interval_source: 'TitinRepresentation.cZoneAt',
      },
      source_ids: sourceIds(this.claim),
      evidence_by_claim: {
        presence_in_c_zone: this.claim.claim_evidence_class,
        stripe_periodicity: 'MEASURED (fast skeletal; CONTEXT_ONLY transfer)',
        c_zone_interval: 'MEASURED (canonical A-band super-repeat block; delegated)',
        axial_register: 'SCHEMATIC',
        azimuth: 'SCHEMATIC',
        reach_and_pose: 'SCHEMATIC',
        titin_contact: 'NOT RENDERED — no evidence of a direct contact in this scope',
      },
      cardiac_omission: {
        omitted: 'exact cMyBP-C coordinates from the cardiac thick-filament reconstruction',
        why: 'the construct tissue status is pending; adopting a cardiac accessory-protein placement would silently mix preparations',
        recorded_in: 'geometry_strategy.json:context_depiction_policy (cMyBP-C DEFER) and showcase_claims.json:mybpc_czone_context',
      },
      not_claimed: [...this.claim.not_claimed],
    };
  }
}
