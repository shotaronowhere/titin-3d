/**
 * GeometryStrategy — turns the Phase-3 geometry strategy + the live spec geometry
 * into a flat list of renderable PRIMITIVE DESCRIPTORS the viewer can instantiate.
 *
 * Design rules (MASTER_PLAN Phase 2 + Phase 3):
 *   - Holds ZERO biological constants. Every dimension is read from the spec
 *     (via GeometryEngine.geometryAt) or from geometry_strategy.json, which itself
 *     references spec parameters rather than restating them.
 *   - Emits the simplest primitive that preserves scientifically meaningful structure.
 *   - Never fabricates a resolved 3D shape: each descriptor carries its evidence
 *     class and an explicit `not_claimed` list, and disordered regions (worm-like
 *     chain) are emitted as smooth tubes with NO folded-domain instances.
 *   - Enforces the spec's forbidden rules structurally (A-band invariant length,
 *     titin confined to I-band) by deriving all axial extents from the engine.
 *
 * A descriptor is renderer-agnostic (no Three.js here):
 *   { id, kind, primitive, assembly, transform:{position_nm,axis,length_nm,...},
 *     instances?:[...], evidence, sources, not_claimed }
 */
export class GeometryStrategy {
  constructor(spec, engine, strategy) {
    this.spec = spec;
    this.engine = engine;
    this.strategy = strategy;
  }

  /** Resolve a "file.json:dotted.path" pointer against the loaded spec. */
  _resolve(pointer) {
    const [file, path] = pointer.split(':');
    const roots = {
      'sarcomere.json': this.spec.sarcomere,
      'titin.json': this.spec.titin,
      'structural_states.json': this.spec.states,
      'geometry_sources.json': this.spec.geometrySources,
    };
    let node = roots[file];
    if (node === undefined) return undefined;
    if (!path) return node;
    for (const key of path.split('.')) {
      if (node == null) return undefined;
      // support array-of-{id} lookup by id token, e.g. "zdisc.dimensions_nm.width_X"
      if (Array.isArray(node)) node = node.find((e) => e.id === key);
      else node = node[key];
    }
    return node;
  }

  /**
   * Full renderable scene descriptor at a given sarcomere length (nm).
   *
   * `opts.lattice` (Phase 7) opts into the TRANSVERSE layer: pass a
   * LatticeGeometry and a ring count to get per-filament YZ placement and the
   * titin strand azimuths. It is opt-in rather than automatic because every
   * pre-Phase-7 consumer treats the scene as a single axial half-sarcomere, and
   * silently multiplying its filament count would change what those callers
   * mean. Omitting it reproduces the previous descriptor exactly.
   */
  sceneAt(sarcomereLengthNm, opts = {}) {
    const geom = this.engine.geometryAt(sarcomereLengthNm);
    const scene = {
      sarcomere_length_nm: geom.sarcomere_length_nm,
      sarcomere: this._sarcomerePrimitives(geom),
      titin: this._titinPrimitives(geom),
      relationships: this.strategy.geometric_relationships,
    };
    if (opts.lattice) {
      scene.lattice = this._latticeLayer(geom, opts.lattice, opts.latticeRings ?? 1);
    }
    return scene;
  }

  /**
   * Transverse layer descriptor: where each filament sits in YZ, and where the
   * titin strands sit around each thick filament.
   *
   * Only the CENTRAL thick filament carries titin strands. That is a deliberate
   * pedagogical restriction, recorded here so it is not mistaken for a claim:
   * every thick filament in real muscle has its own six titins, but drawing
   * them on all of them at once hides the very geometry this view exists to
   * show. The descriptor states the true per-filament count alongside the
   * number drawn, so the omission is visible to a reader of the data.
   */
  _latticeLayer(geom, lattice, rings) {
    // Pass the ORIGINAL request, not geom.sarcomere_length_nm. geom has already
    // been clamped by geometryAt(), so handing that value to latticePatch() meant
    // the patch never saw an out-of-range request and reported was_clamped:false
    // for it — a scene built at SL 1600 silently claimed it was built at 1600
    // when it was actually evaluated at 1900. latticePatch() clamps identically,
    // so the geometry is unchanged; only the provenance is repaired. `geom` is the
    // fallback for callers that predate requested_sl_nm.
    const slRequested = geom.requested_sl_nm ?? geom.sarcomere_length_nm;
    const patch = lattice.latticePatch(slRequested, rings);
    const strands = lattice.titinStrandOffsets(slRequested);
    return {
      kind: 'lattice',
      primitive: 'lattice_rule',
      evaluated_at_sl_nm: patch.sarcomere_length_nm,
      sarcomere_length_requested_nm: patch.sarcomere_length_requested_nm,
      was_clamped: patch.was_clamped,
      transform: {
        plane: 'YZ',
        d10_nm: patch.d10_nm,
        lattice_constant_nm: patch.lattice_constant_nm,
        myosin_actin_centre_nm: patch.myosin_actin_centre_nm,
        surface_separation_nm: patch.surface_separation_nm,
        rings,
      },
      thick_sites: patch.thick,
      thin_sites: patch.thin,
      stoichiometry: patch.stoichiometry,
      titin_strands: {
        drawn_on: 'central thick filament only',
        drawn_count: strands.length,
        true_count_per_thick_filament:
          this.spec.sarcomere.copy_number.titin_per_half_thick_filament,
        pedagogical_restriction: 'titin strands are drawn on the central filament '
          + 'only for legibility; every thick filament carries the same number',
        offsets: strands,
      },
      provenance: lattice.provenance(),
    };
  }

  _sarcomerePrimitives(geom) {
    const half = geom.half_sarcomere_nm;
    const out = [];
    for (const [id, strat] of Object.entries(this.strategy.sarcomere_primitives)) {
      const comp = this.spec.sarcomere.components.find((c) => c.id === id);
      const d = comp ? comp.dimensions_nm || {} : {};
      const desc = {
        id, kind: 'sarcomere', primitive: strat.primitive,
        preserves: strat.preserves, not_claimed: strat.not_claimed,
        evidence: strat.evidence_by_claim,
      };
      if (id === 'zdisc') {
        desc.transform = { position_nm: 0, axis: 'X', width_nm: d.width_X, plane: 'YZ' };
      } else if (id === 'thin_filament') {
        // The thin filament emerges at the Z-disc EDGE, not its centre — the same
        // anchoring convention already resolved for titin. Session-12 finding: this
        // descriptor used to emit start_nm=0 / end_nm=length, putting the pointed
        // end at 1050 nm, while the spec's own `thin_pointed_end` is 1075 nm in
        // ALL four states and the spec component says X_start=25. The 25 nm error
        // silently propagated into every overlap-zone calculation. Derived from the
        // engine (which reads Z-disc width from the spec) so no constant is restated.
        const t = geom.thin_filament;
        desc.transform = { start_nm: t.X_start, length_nm: t.length, end_nm: t.X_end,
                           diameter_nm: d.diameter, axis: 'X' };
        desc.anchoring = 'barbed end at the Z-disc edge; the Z-disc-internal portion '
          + 'is subsumed by the Z-disc primitive and not modelled separately';
      } else if (id === 'thick_filament') {
        // A-band cylinder centred on M-line; length INVARIANT (read from spec, never scaled)
        const L = d.length_X;
        desc.transform = { center_nm: half, length_nm: L, diameter_nm: d.diameter,
                           start_nm: half - L / 2, end_nm: half + L / 2,
                           bare_zone_center_nm: half, axis: 'X' };
        desc.invariant = 'length_nm is SL-independent (A-band never extends)';
      } else if (id === 'mline') {
        desc.transform = { position_nm: half, width_nm: d.width_X, plane: 'YZ' };
      } else if (id === 'lattice') {
        desc.transform = { d10_nm: geom.lattice_d10_nm, symmetry: 'hexagonal',
                           law: 'GeometryEngine.latticeD10(SL)' };
      }
      out.push(desc);
    }
    return out;
  }

  _titinPrimitives(geom) {
    const out = [];
    const archetypes = this.strategy.domain_archetypes;
    for (const region of this.spec.titin.regions) {
      const strat = this.strategy.titin_primitives[region.id];
      if (!strat) continue;
      const lay = (geom.titin_iband_layout_nm || {})[region.id];
      const arche = strat.unit_archetype ? archetypes[strat.unit_archetype] : null;
      // Static strategy evidence describes the claim at design time. For elastic
      // I-band spans the live geometry record is more specific: Phase 8 derives
      // them from a common-force mechanical model. Never let the static
      // STRONGLY INFERRED label overwrite that MODELED provenance in a manifest.
      const evidence = { ...(strat.evidence_by_claim || {}) };
      if (lay && geom.titin_partition_evidence_class) {
        evidence.axial_span = geom.titin_partition_evidence_class;
      }
      const desc = {
        id: region.id, kind: 'titin', band: region.band,
        assembly: strat.assembly,
        primitive: strat.assembly === 'composite_spring'
          ? 'composite'
          : (arche ? arche.primitive : (strat.assembly === 'tube' ? 'tube' : null)),
        backbone_path: strat.backbone_path_primitive,
        n_units: strat.n_units,
        mechanical_class: strat.mechanical_class,
        preserves: strat.preserves, not_claimed: strat.not_claimed,
        evidence,
      };
      // axial placement: only I-band regions have an interpolated layout; others are anchored
      if (lay) {
        desc.transform = { start_nm: lay.X_start, end_nm: lay.X_end, axis: 'X',
                           span_nm: lay.X_end - lay.X_start };
        // instanced domains fill the span; disordered tube gets NO instances
        if (strat.assembly === 'instanced_repeat' && arche && strat.n_units) {
          desc.instance_spec = {
            count: strat.n_units, unit_axial_nm: arche.axial_length_nm,
            unit_lateral_nm: arche.lateral_diameter_nm,
            note: 'straightening (not stretching): domains reorient/space along the widening span',
          };
        } else if (strat.assembly === 'tube') {
          desc.tube_spec = { variable_length: true, folded_domains: false,
                             note: 'entropic spring — intrinsically disordered, no folded structure' };
        } else if (strat.assembly === 'composite_spring' && arche) {
          desc.composite_spec = {
            folded_count: strat.n_units,
            folded_archetype: strat.unit_archetype,
            folded_axial_nm: arche.axial_length_nm,
            coil_span_nm: Math.max(0, (lay.X_end - lay.X_start) - arche.axial_length_nm),
            variable_length: true,
            note: 'one rigid folded domain in series with a variable-length entropic coil; '
              + 'region-internal sequence order is unresolved',
          };
        }
      } else {
        // anchored regions (Z1Z2, A-band super-repeat, kinase, M-line): position from spec, not interpolated
        desc.anchored = true;
        if (region.id === 'Aband_super') {
          const rel = this.strategy.geometric_relationships.titin_Aband_super_repeat;
          desc.super_repeat = {
            periodicity_nm: rel.values.super_repeat_periodicity_nm,
            n_repeats: rel.values.n_C_zone_super_repeats,
            bound_to: 'thick_filament',
            note: 'axial position translates with SL; internal length INVARIANT',
          };
        }
      }
      out.push(desc);
    }
    return out;
  }

  /**
   * Forbidden-rule verification over a generated scene. Returns { errors, notes }.
   *
   * `errors` are hard violations of the reviewed spec's invariants:
   *   - A-band (thick filament) length must be SL-invariant;
   *   - titin I-band span must equal the I-band half-width (the confinement
   *     enforces — a LENGTH invariant: elastic titin span == I-band half-width -
   *     Z-disc half-width, since Z1Z2 is anchored inside the Z-disc);
   *   - the distal titin end lands exactly at the A-band tip (Z-disc anchoring);
   *   - a disordered region must carry no folded-domain instances.
   *
   * `notes` record non-fatal modelling caveats. (The former Z-disc origin offset —
   * titin span measured from the Z-disc centre but laid out from the Z-disc edge —
   * was resolved at the spec layer: the elastic extension budget is now the
   * Z-edge -> A-tip gap, so the distal Ig meets the A-band tip at every state.)
   */
  verifyScene(scene) {
    const errors = [], notes = [];
    const thick = scene.sarcomere.find((s) => s.id === 'thick_filament');
    const specL = this.spec.sarcomere.components.find((c) => c.id === 'thick_filament').dimensions_nm.length_X;
    if (Math.abs(thick.transform.length_nm - specL) > 1e-6)
      errors.push('thick filament length deviates from spec — A-band must be invariant.');

    // Confinement (LENGTH invariant): the elastic I-band titin spans the Z-disc edge
    // to the A-band tip, so its span == I-band half-width - Z-disc half-width.
    const geom = this.engine.geometryAt(scene.sarcomere_length_nm);
    const zHalf = this.spec.sarcomere.components.find((c) => c.id === 'zdisc').dimensions_nm.width_X / 2;
    const elasticSpan = geom.I_band_half_width_nm - zHalf;
    const iBandTitin = scene.titin
      .filter((x) => x.band === 'I-band' && x.transform)
      .reduce((a, t) => a + (t.transform.span_nm || 0), 0);
    if (Math.abs(iBandTitin - elasticSpan) > 1.0)
      errors.push(`titin I-band span ${iBandTitin.toFixed(1)} != I-band half-width - Z-disc half-width `
        + `${elasticSpan.toFixed(1)} — extension not confined to the I-band.`);

    // Anchoring registration: distal titin must land exactly at the A-band tip.
    // The elastic spring emerges at the Z-disc edge (Z1Z2 anchored in the Z-disc),
    // so its span == I-band half-width - Z-disc half-width. A residual offset here
    // would mean the Z-disc anchoring convention was mis-applied.
    const abTip = thick.transform.start_nm;
    const iband = scene.titin.filter((x) => x.band === 'I-band' && x.transform);
    if (iband.length) {
      const distalEnd = Math.max(...iband.map((t) => t.transform.end_nm));
      const offset = distalEnd - abTip;
      if (Math.abs(offset) > 1.0)
        errors.push(`titin distal end (${distalEnd.toFixed(1)} nm) does not meet the A-band tip `
          + `(${abTip.toFixed(1)} nm): off by ${offset.toFixed(1)} nm — Z-disc anchoring offset mis-applied.`);
    }

    // Disordered regions must carry no folded-domain instances.
    for (const t of scene.titin)
      if (t.tube_spec && t.instance_spec)
        errors.push(`${t.id} is disordered but has folded-domain instances.`);

    // ---- Phase 7: transverse layer, verified only when it was requested ----
    if (scene.lattice) {
      const Lx = scene.lattice;
      const tr = Lx.transform;

      // (a) The hexagonal identities must hold, or the lattice is not hexagonal.
      if (Math.abs(tr.lattice_constant_nm - (2 * tr.d10_nm) / Math.sqrt(3)) > 1e-9)
        errors.push('lattice constant does not satisfy a = 2*d10/sqrt(3) — not a hexagonal lattice.');
      if (Math.abs(tr.myosin_actin_centre_nm - tr.lattice_constant_nm / Math.sqrt(3)) > 1e-9)
        errors.push('myosin-actin centre distance does not satisfy d_MA = a/sqrt(3).');

      // (a2) The transverse layer must be evaluated at the SAME sarcomere length
      //      as the axial layer. These diverged once: the axial layer clamps to
      //      its keyframe range while the closed-form lattice law does not, so a
      //      scene at SL=1500 drew 1900 nm filaments inside a 1500 nm lattice.
      if (Lx.evaluated_at_sl_nm !== scene.sarcomere_length_nm)
        errors.push(`lattice evaluated at SL=${Lx.evaluated_at_sl_nm} but the axial scene is at `
          + `SL=${scene.sarcomere_length_nm} — transverse/axial layers disagree.`);

      // (b) Every thin filament must sit at a trigonal point, i.e. exactly d_MA
      //     from its nearest thick filament. A drifted thin filament would break
      //     the 1:2 register that the spec records as MEASURED.
      let worst = 0;
      for (const t of Lx.thin_sites) {
        let nearest = Infinity;
        for (const k of Lx.thick_sites) nearest = Math.min(nearest, Math.hypot(t.y - k.y, t.z - k.z));
        worst = Math.max(worst, Math.abs(nearest - tr.myosin_actin_centre_nm));
      }
      if (worst > 1e-6)
        errors.push(`a thin filament is ${worst.toFixed(4)} nm off the trigonal point — `
          + 'thick/thin transverse register broken.');

      // (c) Filaments must not interpenetrate. This is the check that would catch
      //     a lattice compressed past physical possibility by a bad SL.
      const rThick = this.spec.sarcomere.components.find((c) => c.id === 'thick_filament').dimensions_nm.diameter / 2;
      const rThin = this.spec.sarcomere.components.find((c) => c.id === 'thin_filament').dimensions_nm.diameter / 2;
      if (tr.surface_separation_nm <= 0)
        errors.push(`thick and thin filaments interpenetrate at SL=${scene.sarcomere_length_nm} `
          + `(surface separation ${tr.surface_separation_nm.toFixed(2)} nm).`);
      if (Math.abs(tr.surface_separation_nm - (tr.myosin_actin_centre_nm - rThick - rThin)) > 1e-9)
        errors.push('surface separation is inconsistent with the spec filament radii.');

      // (d) Thick-filament count must match the closed form for a hexagonal patch.
      const st = Lx.stoichiometry;
      if (st.thick_count !== st.expected_thick_count)
        errors.push(`hexagonal patch has ${st.thick_count} thick filaments, expected `
          + `1+3N(N+1) = ${st.expected_thick_count}.`);

      // (e) The titin strand count must equal the MEASURED copy number. Drawing a
      //     different number would misstate a measurement, not a convention.
      const ts = Lx.titin_strands;
      if (ts.drawn_count !== ts.true_count_per_thick_filament)
        errors.push(`${ts.drawn_count} titin strands drawn but the spec copy number is `
          + `${ts.true_count_per_thick_filament}.`);

      // (f) The azimuthal arrangement must stay declared SCHEMATIC. If a future
      //     edit ever promotes it to a measured claim, this fails loudly: the
      //     spec's own unknowns list says the arrangement is UNKNOWN.
      const azEv = Lx.provenance.evidence_by_claim.titin_azimuthal_arrangement;
      if (azEv !== 'SCHEMATIC')
        errors.push(`titin azimuthal arrangement is declared "${azEv}" but the spec lists it `
          + 'as UNKNOWN — it may only ever be SCHEMATIC.');

      // Non-fatal caveats that a reader of the scene must see.
      notes.push('transverse lattice spacing follows the constant-volume idealization; '
        + 'real muscle is not strictly isovolumetric (Poisson ratio is time-varying).');
      notes.push(`titin strands drawn on the central filament only (${ts.drawn_count} of `
        + `${ts.drawn_count * st.thick_count} present in this patch) — legibility, not a claim.`);
      if (st.ratio < st.asymptotic_ratio)
        notes.push(`patch thin:thick ratio ${st.ratio.toFixed(3)} < 2 because boundary `
          + 'triangles are incomplete; 1:2 is the infinite-lattice stoichiometry.');
    }

    return { errors, notes };
  }
}
