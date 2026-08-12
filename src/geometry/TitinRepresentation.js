/**
 * Phase 4 — Titin Representation (hierarchical).
 *
 * Level 0  Backbone   — scientifically defined 3D curve carrying the titin path.
 * Level 1  Domains    — repeated domain instances placed along the backbone
 *                       according to the spec's sequence/organization.
 * Level 2  Proxies    — hook for PDB-derived lightweight geometry (Phase 6 fills it).
 * Level 3  Reference  — full molecular structures stay OFFLINE validation assets.
 *
 * Source-of-truth discipline: every number here is read from the spec
 * (titin.json / structural_states.json / geometry_strategy.json / sarcomere.json)
 * or derived from those by an explicitly documented rule. No biological
 * constants are written into this file.
 *
 * The backbone "controls positioning but should not imply that the real molecule
 * is literally a smooth tube" (plan, Level 0) — so the backbone is emitted as a
 * control-point path flagged `render_as_tube: false`, and the visible geometry is
 * the domain instances placed along it.
 */

const EPS = 1e-6;

/**
 * Domain classes from the plan's Level-1 component-class list (the plan gives them
 * as *potential* classes, so the vocabulary is wider than what this isoform emits).
 *
 * `domain_class` names the FOLD, not the mechanical role. Two members are therefore
 * never emitted by the current model, deliberately:
 *
 *  - `terminal_anchor` — Z1/Z2 and the M-line M-domains are genuine Ig folds and are
 *    emitted as `Ig_like`. Their anchoring role is carried by
 *    `mechanical_class: 'anchored'`, which is the correct axis for it. Emitting them
 *    as `terminal_anchor` would lose the fold identity to describe a role already
 *    recorded elsewhere.
 *  - `flexible_linker` — no region in titin.json is typed as a standalone linker.
 *    Inter-domain spacing in bound regions is reported per-instance as
 *    `interdomain_linker_nm`, not as a separate instance.
 *
 * `N2B` is absent because this render consumes the one reference sequence named
 * by scientific_scope.json; no second isoform is admitted.
 */
export const DOMAIN_CLASSES = Object.freeze([
  'Ig_like', 'Fn3', 'PEVK', 'N2A', 'unresolved_sequence',
  'flexible_linker', 'kinase', 'terminal_anchor',
]);

export class TitinRepresentation {
  /**
   * @param {object} spec     loaded spec bundle (titin, sarcomere, states, strategy...)
   * @param {object} engine   GeometryEngine (state interpolation)
   * @param {object} strategy geometry_strategy.json
   * @param {import('./StructuralProxies.js').StructuralProxies|null} proxies
   */
  constructor(spec, engine, strategy, proxies = null) {
    this.spec = spec;
    this.engine = engine;
    this.strategy = strategy;
    // Phase-6 level-2 proxies, injected (this file imports nothing by design;
    // modules are composed in TitinModel). Null keeps the Phase-4 stub behaviour.
    this.proxies = proxies;
    this.regions = spec.titin.regions;
    this._regionById = new Map(this.regions.map((r) => [r.id, r]));
  }

  // ---------------------------------------------------------------- Level 0

  /**
   * Level 0 — backbone path for one titin molecule at the given sarcomere length.
   *
   * Returns ordered control points along X (the longitudinal axis). Transverse
   * (Y/Z) placement is NOT invented: azimuth about the thick filament is recorded
   * UNKNOWN in the spec, so every control point carries y=z=0 with that stated.
   */
  backboneAt(sarcomereLengthNm) {
    const geom = this.engine.geometryAt(sarcomereLengthNm);
    const layout = geom.titin_iband_layout_nm || {};
    const aTip = geom.I_band_half_width_nm;             // A-band tip for this SL
    const halfSarc = sarcomereLengthNm / 2;

    const points = [];
    const segments = [];
    let cursor = 0;

    for (const region of this.regions) {
      const lay = layout[region.id];
      let start;
      let end;
      if (lay) {
        // I-band elastic regions: interpolated layout is authoritative.
        start = lay.X_start;
        end = lay.X_end;
      } else {
        // Anchored regions translate rigidly with the thick filament: their
        // resting offsets are measured from the resting A-band tip and re-based
        // onto this state's tip. (The anchored chain spans the half thick
        // filament, an SL-invariant length, so offsets carry over unchanged.)
        const rest = region.resting_axial_position_nm;
        const restTip = this._restingATip();
        if (region.band === 'Z-disc') {
          start = rest.X_start;                       // Z1Z2 sits inside the Z-disc
          end = rest.X_end;
        } else {
          start = aTip + (rest.X_start - restTip);
          end = aTip + (rest.X_end - restTip);
        }
      }
      if (points.length === 0) points.push({ x: start, y: 0, z: 0, at: `${region.id}:start` });
      points.push({ x: end, y: 0, z: 0, at: `${region.id}:end` });
      segments.push({ region_id: region.id, band: region.band, X_start: start, X_end: end });
      cursor = end;
    }

    return {
      sarcomere_length_nm: sarcomereLengthNm,
      level: 0,
      curve_type: 'polyline_control_points',
      render_as_tube: false,
      render_note:
        'Backbone controls positioning only. It must NOT be drawn as a smooth solid tube: ' +
        'the real molecule is a chain of discrete folded domains and disordered segments.',
      axis: 'X (longitudinal sarcomere axis)',
      transverse_placement: {
        y: 0, z: 0,
        evidence_class: 'UNKNOWN',
        note: 'Azimuthal placement of titin about the thick filament is not resolved; ' +
              'rendered on-axis as an explicit SCHEMATIC choice.',
      },
      points,
      segments,
      terminus: { X_start: points[0].x, X_end: cursor, half_sarcomere_nm: halfSarc },
    };
  }

  _restingATip() {
    const st = this.spec.states.states.resting;
    return st.positions_nm.thick_tip_I_A_junction;
  }

  // ---------------------------------------------------------------- Level 1

  /**
   * Level 1 — domain instances along the backbone.
   *
   * Each instance carries exactly the fields the plan mandates:
   *   domain_id, sequence_position, domain_class,
   *   position, orientation, scale,
   *   geometry_archetype, evidence_class, source
   *
   * Folded domains are placed by AXIAL RISE, not by stretching the archetype:
   * when the available span is shorter than the folded contour the domains are
   * TILTED (reoriented), which is the mechanically correct picture for tandem-Ig
   * straightening. `scale` is therefore always 1 for folded domains — the
   * archetype is never deformed to fit.
   */
  domainInstancesAt(sarcomereLengthNm, { includeAband = true } = {}) {
    const backbone = this.backboneAt(sarcomereLengthNm);
    const segByRegion = new Map(backbone.segments.map((s) => [s.region_id, s]));
    const archetypes = this.strategy.domain_archetypes;
    const out = [];

    for (const region of this.regions) {
      const strat = this.strategy.titin_primitives[region.id];
      if (!strat) continue;
      const seg = segByRegion.get(region.id);
      if (!seg) continue;
      if (!includeAband && region.band === 'A-band') continue;

      if (strat.assembly === 'instanced_repeat') {
        out.push(...this._placeFolded(region, strat, seg, archetypes));
      } else if (strat.assembly === 'tube') {
        out.push(this._placeDisordered(region, strat, seg));
      } else if (strat.assembly === 'composite_spring') {
        out.push(...this._placeCompositeSpring(region, strat, seg, archetypes));
      } else if (strat.assembly === 'single') {
        out.push(this._placeSingle(region, strat, seg, archetypes));
      }
    }
    // Keep the public instance record rectangular. These fields are meaningful
    // for the mixed-structure UN2A envelope but explicit null/false values let
    // downstream consumers distinguish "not present" from a missing property.
    for (const instance of out) {
      if (!("contains_structured_core" in instance)) instance.contains_structured_core = false;
      if (!("structured_core" in instance)) instance.structured_core = null;
      if (!("folded_domains_semantics" in instance)) {
        instance.folded_domains_semantics = instance.folded_domains
          ? 'true means this instance is rendered with a folded-domain archetype'
          : 'false means this instance uses a non-instanced chain-envelope route';
      }
    }
    return { sarcomere_length_nm: sarcomereLengthNm, level: 1, instances: out };
  }

  /** Folded (Ig/Fn3) tandem regions -> one instance per domain, tilted to fit. */
  /**
   * Archetype for one instance (Phase 5 step 4: instance the right archetype).
   *
   * The archetype is resolved from the instance's DOMAIN CLASS, not from the
   * region. A region-level `unit_archetype` cannot be right for Aband_super,
   * which is mixed (47 Ig_like + 132 Fn3): region-level resolution rendered all
   * 179 as Ig_like and left the Fn3 archetype permanently unreachable.
   *
   * Falls back to the region's `unit_archetype` when the class has no archetype
   * of its own, so an unmodelled class degrades to the region default rather
   * than to nothing.
   */
  _archetypeFor(domainClass, strat, archetypes) {
    const key = archetypes[domainClass] ? domainClass : strat.unit_archetype;
    return { key, arche: archetypes[key] };
  }

  _placeFolded(region, strat, seg, archetypes) {
    const arche = archetypes[strat.unit_archetype];
    const n = strat.n_units;
    const span = seg.X_end - seg.X_start;
    const unit = arche.axial_length_nm;

    // A zone's rise and tilt are computed ONCE from `unit`, so every archetype
    // reachable in this region must share that axial length. Ig_like and Fn3 both
    // carry 4.0 nm from the same source, which is why per-class archetype
    // resolution below is a pure relabel. If a future archetype breaks that, the
    // single-`unit` tilt would silently become wrong for some instances — fail loudly.
    const reachable = new Set([strat.unit_archetype]);
    const dc = region.domain_composition || {};
    for (const cls of Object.keys(dc)) if (dc[cls] > 0 && archetypes[cls]) reachable.add(cls);
    for (const k of reachable) {
      const L = archetypes[k].axial_length_nm;
      if (L != null && Math.abs(L - unit) > EPS) {
        throw new Error(
          `region ${region.id}: archetype '${k}' axial length ${L} nm != zone unit ${unit} nm; ` +
          'per-zone rise/tilt assumes one folded length — placement would be wrong.',
        );
      }
    }

    // A-band titin uses the explicitly labelled, source-context arithmetic
    // interval in SD-03; it is not a claim of a universal physical register.
    const zones = region.band === 'A-band'
      ? this._abandZones(region, seg, n)
      : [{
          zone: null, index0: 0, count: n, X_start: seg.X_start, X_end: seg.X_end,
          // Even division of a sourced region span by a MEASURED domain count.
          // The span and count are sourced; the uniform spacing is a modelling
          // assumption, so placement is INFERRED — never MEASURED.
          placement_evidence: 'INFERRED (uniform division of a sourced span by a MEASURED domain count)',
          placement_source: null,
        }];

    const inst = [];
    for (const z of zones) {
      const zSpan = z.X_end - z.X_start;
      const rise = z.count > 0 ? zSpan / z.count : 0;
      // cos(tilt) = axial rise / folded contour length. Clamped: a value >1 would
      // mean the domain is longer than its own folded length, i.e. UNFOLDING.
      const cosT = Math.min(1, rise / unit);
      const tiltDeg = (Math.acos(cosT) * 180) / Math.PI;

      // rise > folded length means consecutive domains are NOT contiguous — there is
      // axial space between them. What that space MEANS depends on the region:
      //   - anchored/bound regions (Z-disc, A-band super-repeat, M-line): the spacing
      //     is inter-domain linker / insertion sequence set by the binding partner's
      //     periodicity. This is real architecture, not deformation.
      //   - extensible tandem-Ig regions (prox_Ig, dist_Ig): these extend by
      //     STRAIGHTENING, so a rise exceeding the folded length would mean the fold
      //     itself had to lengthen -> Ig UNFOLDING, a forbidden depiction.
      const anchored = strat.mechanical_class === 'anchored';

      for (let i = 0; i < z.count; i++) {
        const gi = z.index0 + i;
        // Most zones use one uniform axial rise. The unsourced D-zone may supply
        // explicit per-domain placements so its schematic chain can join the
        // measured C-zone without a 3D break (see `_abandZones`).
        const p = z.placements ? z.placements[i] : null;
        const localRise = p ? p.axial_rise_nm : rise;
        const localTilt = p ? p.tilt_deg_from_axis : tiltDeg;
        const localPosition = p ? p.position_nm
          : { x: z.X_start + rise * (i + 0.5), y: 0, z: 0 };
        const excess = localRise - unit;
        const unfolding = !anchored && excess > EPS;
        const linkerNm = anchored && excess > EPS ? Number(excess.toFixed(3)) : 0;
        const dClass = this._classOf(region, gi);
        const { key: archeKey, arche: instArche } = this._archetypeFor(dClass, strat, archetypes);
        inst.push({
          domain_id: `${region.id}.${gi + 1}`,
          sequence_position: this._seqPos(region, gi),
          domain_class: dClass,
          domain_class_evidence: this._classOrderEvidence(region),
          position_nm: localPosition,
          orientation: {
            axis: 'X',
            tilt_deg_from_axis: Number(localTilt.toFixed(2)),
            azimuth_deg: null,
            evidence_class: 'STRONGLY INFERRED (axial tilt from span/count); UNKNOWN (azimuth)',
          },
          scale: 1, // archetype never deformed
          geometry_archetype: archeKey,
          // Phase 5 step 2: the experimental structure this archetype represents.
          // Identity only — no coordinate of it has been measured or fitted (Phase 6).
          representative_pdb_id: (instArche.representative_structure || {}).pdb_id || null,
          zone: z.zone,
          folded_domains: true,
          variable_length: false,
          note: null,
          span_nm: Number(localRise.toFixed(3)),
          axial_rise_nm: Number(localRise.toFixed(3)),
          folded_length_nm: unit,
          interdomain_linker_nm: linkerNm,
          mechanical_class: strat.mechanical_class,
          implies_unfolding: unfolding,
          // Two INDEPENDENT evidence claims per instance, never conflated:
          //  - domain_evidence_class: how well the domain's own size is known.
          //  - placement_evidence_class: how well its axial spacing is known.
          // A MEASURED domain size does not license a MEASURED placement.
          domain_evidence_class: instArche.evidence_by_claim
            ? instArche.evidence_by_claim.axial_length_nm
            : 'MEASURED',
          placement_evidence_class: z.placement_evidence,
          placement_source: z.placement_source || null,
          evidence_class: this._weakest(
            instArche.evidence_by_claim ? instArche.evidence_by_claim.axial_length_nm : 'MEASURED',
            z.placement_evidence,
          ),
          source: instArche.axial_length_source,
        });
      }
    }
    return inst;
  }

  /**
   * A-band titin splits into two zones whose placement evidence is NOT equal.
   *
   * C-zone: 11 sequence repeats x 11 domains, displayed with the 43.78 nm
   *   interval derived from the rabbit-psoas mean spacing (11 x 3.98 nm).
   * D-zone: the tip-proximal remainder. The spec records NO periodicity for it
   *   (`geometry_sources` has only the three C-zone parameters), so it uses a
   *   connected schematic zig-zag. Its terminal domains are untilted so the
   *   polypeptide joins the measured, untilted C-zone instead of breaking at the
   *   evidence boundary. None of that D-zone placement is a structural claim.
   */
  /**
   * The canonical C-zone interval — the ONE derivation in the project.
   *
   * `_abandZones` places the C-zone domain block from this, the SC-2 band bracket
   * draws it, and the SC-5 MyBP-C layer sits inside it. Three copies of
   * `X_end - n * periodicity` would be three chances to disagree about where the
   * C-zone is, which is the same defect class as a renderer re-deriving geometry.
   *
   * @param {number} sarcomereLengthNm
   */
  cZoneAt(sarcomereLengthNm) {
    const seg = this.backboneAt(sarcomereLengthNm).segments
      .find((candidate) => candidate.region_id === 'Aband_super');
    if (!seg) throw new Error('cZoneAt: the canonical A-band titin segment is unavailable.');
    return this._cZoneOfSegment(seg);
  }

  /** @param {{X_start:number, X_end:number}} seg canonical Aband_super segment */
  _cZoneOfSegment(seg) {
    const relEntry = this.strategy.geometric_relationships.titin_Aband_periodicities;
    const rel = relEntry.values;
    const intervalNm = rel.derived_11_domain_interval_nm.value;
    const lengthNm = rel.n_C_zone_super_repeats * intervalNm;
    // C-zone occupies the M-line-proximal end of the bound segment; the D-zone
    // (filament-tip-proximal) takes the remainder.
    const startNm = seg.X_end - lengthNm;
    if (!(startNm > seg.X_start)) {
      throw new Error(
        `cZoneAt: the ${lengthNm} nm C-zone block does not fit the bound A-band span `
        + `${seg.X_start}..${seg.X_end}.`,
      );
    }
    return {
      start_nm: startNm,
      end_nm: seg.X_end,
      length_nm: lengthNm,
      n_super_repeats: rel.n_C_zone_super_repeats,
      derived_11_domain_interval_nm: intervalNm,
      domains_per_super_repeat: rel.c_zone_sequence_super_repeat_domain_count,
      domains: rel.n_C_zone_super_repeats * rel.c_zone_sequence_super_repeat_domain_count,
      evidence_class: relEntry.evidence_class,
      source_ids: [...relEntry.sources],
    };
  }

  _abandZones(region, seg, nTotal) {
    const relEntry = this.strategy.geometric_relationships.titin_Aband_periodicities;
    const cZone = this._cZoneOfSegment(seg);
    const nC = cZone.domains;
    const nD = nTotal - nC;
    const cStart = cZone.start_nm;
    const cSrc = (relEntry.sources && relEntry.sources[0]) || null;
    const dSpan = cStart - seg.X_start;
    const dArchetypeKey = this.strategy.titin_primitives[region.id].unit_archetype;
    const unit = this.strategy.domain_archetypes[dArchetypeKey].axial_length_nm;

    // The even D-zone count permits one connected alternating chain whose net
    // transverse displacement is zero. The C-zone has an odd count (121), so its
    // first domain is untilted and the remaining 120 alternate. This keeps both
    // zone endpoints on-axis while preserving the exact derived C-zone interval.
    const dRise = dSpan / nD;
    if (dRise <= 0 || dRise > unit + EPS || nD % 2 !== 0) {
      throw new Error(
        `Aband_super D-zone cannot form a connected schematic chain: span=${dSpan}, `
        + `domains=${nD}, unit=${unit}`,
      );
    }
    const dAngle = Math.acos(Math.min(1, dRise / unit));
    const dTransverse = unit * Math.sin(dAngle);
    const dPlacements = [];
    let cursor = seg.X_start;
    let cursorY = 0;
    for (let i = 0; i < nD; i++) {
      const sign = i % 2 === 0 ? 1 : -1;
      dPlacements.push({
        axial_rise_nm: dRise,
        tilt_deg_from_axis: dAngle * 180 / Math.PI,
        position_nm: { x: cursor + dRise / 2, y: cursorY + sign * dTransverse / 2, z: 0 },
      });
      cursor += dRise;
      cursorY += sign * dTransverse;
    }
    if (Math.abs(cursor - cStart) > EPS || Math.abs(cursorY) > EPS) {
      throw new Error(`Aband_super D-zone placement ended at ${cursor}, expected ${cStart}`);
    }
    const cPlacements = [{
      axial_rise_nm: unit,
      tilt_deg_from_axis: 0,
      position_nm: { x: cStart + unit / 2, y: 0, z: 0 },
    }];
    const remainingRise = (cZone.length_nm - unit) / (nC - 1);
    const cAngle = Math.acos(Math.min(1, remainingRise / unit));
    const cTransverse = unit * Math.sin(cAngle);
    cursor = cStart + unit;
    cursorY = 0;
    for (let local = 1; local < nC; local += 1) {
      const globalIndex = nD + local;
      const sign = globalIndex % 2 === 0 ? 1 : -1;
      cPlacements.push({
        axial_rise_nm: remainingRise,
        tilt_deg_from_axis: cAngle * 180 / Math.PI,
        position_nm: {
          x: cursor + remainingRise / 2,
          y: cursorY + sign * cTransverse / 2,
          z: 0,
        },
      });
      cursor += remainingRise;
      cursorY += sign * cTransverse;
    }
    if (Math.abs(cursor - seg.X_end) > EPS || Math.abs(cursorY) > EPS) {
      throw new Error('Aband_super C-zone connected placement failed to close on-axis');
    }
    return [
      {
        zone: 'D_zone', index0: 0, count: nD, X_start: seg.X_start, X_end: cStart,
        placements: dPlacements,
        placement_evidence:
          'SCHEMATIC — no D-zone periodicity is recorded in the spec; domains are ' +
          'placed as a connected alternating chain with an untilted C-zone transition. ' +
          'The resulting spacing, tilt and transverse offset are rendering choices, ' +
          'NOT a measured super-repeat.',
        placement_source: null,
      },
      {
        zone: 'C_zone', index0: nD, count: nC, X_start: cStart, X_end: seg.X_end,
        placements: cPlacements,
        placement_evidence:
          'STRONGLY INFERRED (11 sequence repeats x 11 domains at the source-context '
          + '43.78 nm interval derived as 11 x 3.98 nm)',
        placement_source: cSrc,
      },
    ];
  }

  /** Evidence-class lattice: returns the weaker (less certain) of two claims. */
  _weakest(a, b) {
    const rank = (s) => {
      const head = String(s || '').toUpperCase();
      if (head.startsWith('UNKNOWN')) return 0;
      if (head.startsWith('SCHEMATIC')) return 1;
      if (head.startsWith('INFERRED')) return 2;
      if (head.startsWith('MODELED')) return 3;
      if (head.startsWith('STRONGLY')) return 4;
      if (head.startsWith('MEASURED')) return 5;
      return 2; // unrecognised -> treat as INFERRED, never as MEASURED
    };
    return rank(a) <= rank(b) ? a : b;
  }

  /**
   * Flexible/unresolved sequence regions -> one non-instanced chain envelope.
   *
   * This generic path is also used as the render-routing base for UN2A, whose
   * experimentally resolved structured core is attached by
   * `_placeCompositeSpring`. `folded_domains: false` therefore means "do not
   * instance a repeated folded-domain archetype"; it is not, by itself, a claim
   * that every residue in the sequence lacks structure.
   */
  _placeDisordered(region, strat, seg) {
    return {
      domain_id: `${region.id}.chain`,
      sequence_position: region.residue_span
        ? { start: region.residue_span.start, end: region.residue_span.end }
        : null,
      domain_class: region.id === 'PEVK' ? 'PEVK'
        : region.id === 'post_N2A_unknown' ? 'unresolved_sequence' : 'N2A',
      position_nm: { x: (seg.X_start + seg.X_end) / 2, y: 0, z: 0 },
      orientation: { axis: 'X', tilt_deg_from_axis: null, azimuth_deg: null,
                     evidence_class: 'UNKNOWN — no stable fold' },
      scale: 1,
      geometry_archetype: null,
      // The generic PEVK/UNKNOWN path has no representative structure. Composite
      // regions may override this field when a structure maps to a subspan.
      representative_pdb_id: /** @type {string|null} */ (null),
      zone: null,
      folded_domains: false,
      span_nm: Number((seg.X_end - seg.X_start).toFixed(3)),
      variable_length: region.mechanical_class !== 'excluded_unknown',
      // Chain-envelope instances have no repeated folded unit, so rise/linker
      // fields are INAPPLICABLE — null, and explicitly never `true`.
      axial_rise_nm: null,
      folded_length_nm: null,
      interdomain_linker_nm: null,
      mechanical_class: strat.mechanical_class || 'extensible_spring',
      implies_unfolding: false,
      domain_class_evidence: region.id === 'post_N2A_unknown'
        ? 'UNKNOWN (no approved biological-region or fold assignment)'
        : 'MEASURED (region identity); no domain sequence to order',
      domain_evidence_class: region.id === 'post_N2A_unknown'
        ? 'MEASURED (sequence continuity); UNKNOWN (identity and conformation)'
        : 'MEASURED (sequence); UNKNOWN (tertiary conformation)',
      placement_evidence_class: 'UNKNOWN (no stable fold — chain occupies the segment)',
      placement_source: null,
      // Effective class is the conservative FLOOR of the component claims. The
      // sequence is MEASURED, but the rendered chain envelope is not — a
      // consumer reading only this field must never infer a known shape.
      evidence_class: this._weakest(
        region.id === 'post_N2A_unknown'
          ? 'MEASURED (sequence continuity); UNKNOWN (identity and conformation)'
          : 'MEASURED (sequence); UNKNOWN (tertiary conformation)',
        'UNKNOWN (no stable fold — chain occupies the segment)',
      ),
      source: 'UniProt:Q8WZ42',
      note: region.id === 'post_N2A_unknown'
        ? 'Explicit unresolved sequence rendered as a bounded zero-projection loop; '
          + 'zero axial projection is bookkeeping, not zero physical length.'
        : 'Entropic/worm-like chain — represent as a flexible chain whose end-to-end '
          + 'length varies with force; never a fixed fold.',
    };
  }

  /**
   * N2A is a composite series element in the curated sequence order
   * I80–UN2A–I81–I82–I83. Four folded domains establish a 16 nm rigid floor;
   * the remaining axial span belongs to the unique-sequence ribbon. The source
   * overlap between experimental I81 and UniProt I82 residue intervals is
   * preserved in metadata and never "repaired" by geometry.
   */
  _placeCompositeSpring(region, strat, seg, archetypes) {
    const archeKey = strat.unit_archetype;
    const arche = archetypes[archeKey];
    if (!arche || arche.axial_length_nm == null) {
      throw new Error(`${region.id}: composite spring requires a measured folded archetype`);
    }
    const nFolds = strat.n_units;
    const rigid = arche.axial_length_nm;
    const rigidTotal = rigid * nFolds;
    const span = seg.X_end - seg.X_start;
    if (nFolds !== 4 || span < rigidTotal - EPS) {
      throw new Error(
        `${region.id}: requires four folds and a span of at least ${rigidTotal} nm; got ${span}`,
      );
    }
    const curated = region.curated_elements || [];
    const foldElements = curated.filter((element) => element.kind === 'Ig_like');
    const unique = curated.find((element) => element.kind === 'unique_sequence');
    if (foldElements.length !== nFolds || !unique) {
      throw new Error(`${region.id}: curated I80–UN2A–I81–I82–I83 elements are incomplete`);
    }
    const coilSpan = span - rigidTotal;
    const foldStarts = [
      seg.X_start,
      seg.X_start + rigid + coilSpan,
      seg.X_start + rigid * 2 + coilSpan,
      seg.X_start + rigid * 3 + coilSpan,
    ];
    const folded = foldElements.map((element, index) => {
      const canonicalSource = element.source.includes('10.1085/jgp.202012766')
        ? '10.1085/jgp.202012766' : 'UniProt:Q8WZ42';
      return ({
      domain_id: `${region.id}.${index + 1}`,
      sequence_position: {
        start: element.start, end: element.end, label: element.label,
        basis: element.source, evidence_class: 'MEASURED',
      },
      domain_class: 'Ig_like',
      domain_class_evidence: 'MEASURED (curated N2A element identity)',
      position_nm: { x: foldStarts[index] + rigid / 2, y: 0, z: 0 },
      orientation: {
        axis: 'X', tilt_deg_from_axis: 0, azimuth_deg: null,
        evidence_class: 'INFERRED (serial axial placement); UNKNOWN (azimuth)',
      },
      scale: 1,
      geometry_archetype: archeKey,
      representative_pdb_id: (arche.representative_structure || {}).pdb_id || null,
      zone: null,
      folded_domains: true,
      variable_length: false,
      note: element.source_overlap_note || null,
      span_nm: rigid,
      axial_rise_nm: rigid,
      folded_length_nm: rigid,
      interdomain_linker_nm: index === 0 ? coilSpan : 0,
      mechanical_class: 'rigid_fold_in_series',
      implies_unfolding: false,
      domain_evidence_class: arche.evidence_by_claim?.axial_length_nm || 'MEASURED',
      placement_evidence_class: 'INFERRED (curated sequence order; axial display placement)',
      placement_source: canonicalSource,
      evidence_class: this._weakest(
        arche.evidence_by_claim?.axial_length_nm || 'MEASURED',
        'INFERRED (curated sequence order; axial display placement)',
      ),
      source: canonicalSource,
    });
    });

    const coilSeg = {
      X_start: seg.X_start + rigid,
      X_end: seg.X_start + rigid + coilSpan,
    };
    const coil = this._placeDisordered(region, strat, coilSeg);
    coil.sequence_position = {
      start: unique.start, end: unique.end, label: unique.label,
      basis: unique.source, evidence_class: 'MEASURED',
    };
    coil.source = unique.source;
    const core = strat.structured_core;
    if (!core?.pdb_id || !core?.canonical_Q8WZ42_1_span?.start
        || !core?.canonical_Q8WZ42_1_span?.end || !core?.fold || !core?.source) {
      throw new Error(`${region.id}: structured UN2A core provenance is incomplete`);
    }
    // PDB 7NIP resolves the central human UN2A tri-helix core. The enclosing
    // ribbon remains the correct SC-20 coarse view because neither the flexible
    // flanks nor the core's in-sarcomere pose is resolved. Override every generic
    // "no stable fold" field so render routing cannot erase that measured fold.
    coil.orientation.evidence_class =
      'UNKNOWN (in-sarcomere orientation of the UN2A core and flexible flanks)';
    coil.representative_pdb_id = core.pdb_id;
    coil.contains_structured_core = true;
    coil.structured_core = {
      label: 'UN2A tri-helix core',
      sequence_position: { ...core.canonical_Q8WZ42_1_span },
      representative_pdb_id: core.pdb_id,
      fold: core.fold,
      evidence_class: 'MEASURED (solution NMR; deposited coordinates)',
      source: core.source,
      render_usage: core.render_usage,
    };
    coil.folded_domains_semantics = 'false means no repeated folded-domain archetype is '
      + `instanced for this composite unique-sequence envelope; it does not deny the ${core.pdb_id} core`;
    coil.domain_class_evidence =
      'MEASURED (UN2A identity and 7NIP structured core); flexible flanks unresolved';
    coil.domain_evidence_class =
      'MEASURED (7NIP structured core); UNKNOWN (flank and in-situ conformation)';
    coil.placement_evidence_class =
      'SCHEMATIC (serial chain envelope; core pose and flank paths unresolved)';
    coil.evidence_class = this._weakest(
      coil.domain_evidence_class, coil.placement_evidence_class,
    );
    coil.note = 'UN2A unique sequence rendered as a non-atomic variable-length ribbon between '
      + 'curated I80 and I81. PDB 7NIP establishes a structured tri-helix core; flexible flanks '
      + 'and the complete in-sarcomere conformation remain unresolved.';
    return [folded[0], coil, ...folded.slice(1)];
  }

  /** Single-copy domains (kinase). */
  _placeSingle(region, strat, seg, archetypes) {
    const arche = archetypes[strat.unit_archetype] || {};
    return {
      domain_id: `${region.id}.1`,
      sequence_position: region.residue_span
        ? { start: region.residue_span.start, end: region.residue_span.end }
        : null,
      domain_class: 'kinase',
      position_nm: { x: (seg.X_start + seg.X_end) / 2, y: 0, z: 0 },
      orientation: { axis: 'X', tilt_deg_from_axis: 0, azimuth_deg: null,
                     evidence_class: 'INFERRED (axial); UNKNOWN (azimuth)' },
      scale: 1,
      geometry_archetype: strat.unit_archetype,
      representative_pdb_id: (arche.representative_structure || {}).pdb_id || null,
      zone: null,
      // The 35 nm interval is a SCHEMATIC position envelope. The glyph keeps the
      // coordinate-derived N-to-C length and is centred in that allocation.
      span_nm: arche.axial_length_nm != null ? arche.axial_length_nm : null,
      axial_rise_nm: arche.axial_length_nm != null ? arche.axial_length_nm : null,
      folded_length_nm: arche.axial_length_nm != null ? arche.axial_length_nm : null,
      interdomain_linker_nm: 0,
      mechanical_class: strat.mechanical_class || 'anchored',
      implies_unfolding: false,
      folded_domains: true,
      variable_length: false,
      note: null,
      domain_class_evidence: 'MEASURED (region is single-class)',
      domain_evidence_class: (arche.evidence_by_claim && arche.evidence_by_claim.primitive_choice)
        || 'SCHEMATIC',
      placement_evidence_class: 'SCHEMATIC (single copy centred in the 70–105 nm envelope)',
      placement_source: null,
      evidence_class: this._weakest(
        (arche.evidence_by_claim && arche.evidence_by_claim.primitive_choice) || 'SCHEMATIC',
        'SCHEMATIC (single copy centred in the 70–105 nm envelope)',
      ),
      source: arche.axial_length_source || 'UniProt:Q8WZ42',
    };
  }

  /** Residue index for domain i of a region (even division across its span). */
  _seqPos(region, i) {
    const rs = region.residue_span;
    const dc = region.domain_composition || {};
    const n = (dc.Ig_like || 0) + (dc.Fn3 || 0);
    if (!rs || !n) return null;
    const per = (rs.end - rs.start + 1) / n;
    return {
      start: Math.round(rs.start + per * i),
      end: Math.round(rs.start + per * (i + 1)) - 1,
      basis: 'even division of the region residue span across its folded-domain count',
      evidence_class: 'INFERRED',
    };
  }

  /**
   * Domain class for index i.
   *
   * The spec records per-region domain COUNTS (domain_composition) but does not
   * resolve the per-position Ig/Fn3 ORDER along the chain. Counts are therefore
   * honoured exactly, while the ordering used here (Ig block, then Fn3) is an
   * arbitrary tie-break — see `_classOrderEvidence`. Mixed-composition regions
   * must not be read as claiming a sequence.
   */
  _classOf(region, i) {
    const dc = region.domain_composition || {};
    return i < (dc.Ig_like || 0) ? 'Ig_like' : 'Fn3';
  }

  /** Evidence class for the Ig/Fn3 assignment of a single instance. */
  _classOrderEvidence(region) {
    const dc = region.domain_composition || {};
    const mixed = (dc.Ig_like || 0) > 0 && (dc.Fn3 || 0) > 0;
    return mixed
      ? 'count MEASURED; per-position Ig/Fn3 order UNKNOWN (not resolved in spec — ' +
        'render order is an arbitrary tie-break, not a sequence claim)'
      : 'MEASURED (region is single-class)';
  }

  // ------------------------------------------------------------ Levels 2 / 3

  /**
   * Level 2 — validated PDB/mmCIF-coordinate-derived structural proxies.
   *
   * Delegated to StructuralProxies, which reads the measured geometry the
   * Phase-6 pipeline wrote into geometry_strategy.json. Returns the same
   * {level, available, note} shape the Phase-4 stub returned, so consumers
   * written against the stub keep working.
   */
  structuralProxies() {
    return this.proxies
      ? this.proxies.describe()
      : {
        level: 2,
        available: [],
        note: 'No PDB-derived proxies substituted yet (Phase 6 / Milestone 4). ' +
              'Until then all domains render as validated archetypes.',
      };
  }

  /**
   * Interaction geometry between CONSECUTIVE domains (Phase 6, plan step 5).
   * Measured from tandem depositions, which single-domain entries cannot supply.
   * Evidence only — never a layout input; see StructuralProxies.interdomainGeometry().
   */
  interdomainGeometry() {
    return this.proxies ? this.proxies.interdomainGeometry() : null;
  }

  /** Guards for the level-2 payload; see StructuralProxies.verify(). */
  verifyStructuralProxies() {
    return this.proxies ? this.proxies.verify() : { errors: [], notes: [] };
  }

  /** Level 3 — molecular reference assets are OFFLINE; never loaded in the browser. */
  molecularReference() {
    return {
      level: 3,
      load_in_browser: false,
      note: 'Full PDB/mmCIF structures are retained as offline validation assets only.',
    };
  }

  // ---------------------------------------------------------------- verify

  /**
   * Representation-level checks. Errors are violations of spec invariants or of
   * the project's forbidden depictions.
   */
  verifyRepresentation(sarcomereLengthNm) {
    const errors = [];
    const notes = [];
    const bb = this.backboneAt(sarcomereLengthNm);
    const { instances } = this.domainInstancesAt(sarcomereLengthNm);

    // (1) Titin is ONE continuous polypeptide: no gaps between consecutive regions.
    for (let i = 1; i < bb.segments.length; i++) {
      const gap = bb.segments[i].X_start - bb.segments[i - 1].X_end;
      if (Math.abs(gap) > 0.01) {
        errors.push(`chain discontinuity ${bb.segments[i - 1].region_id} -> ` +
                    `${bb.segments[i].region_id}: ${gap.toFixed(2)} nm`);
      }
    }

    // (2) C-terminus must reach the M-line centre (half-sarcomere).
    const halfSarc = sarcomereLengthNm / 2;
    if (Math.abs(bb.terminus.X_end - halfSarc) > 0.5) {
      errors.push(`titin C-terminus at ${bb.terminus.X_end.toFixed(1)} nm != ` +
                  `half-sarcomere ${halfSarc.toFixed(1)} nm`);
    }

    // (3) FORBIDDEN: folded domains stretched beyond their folded length would
    //     depict Ig unfolding as ordinary length change.
    const unfolded = instances.filter((d) => d.implies_unfolding);
    if (unfolded.length) {
      errors.push(`${unfolded.length} folded domain(s) exceed folded length ` +
                  `(would imply unfolding): e.g. ${unfolded[0].domain_id} ` +
                  `rise=${unfolded[0].axial_rise_nm} nm`);
    }

    // (4) FORBIDDEN: a disordered region must carry no folded-domain instances.
    for (const d of instances) {
      if ((d.domain_class === 'PEVK' || d.domain_class === 'N2A') &&
          d.geometry_archetype != null) {
        errors.push(`disordered region instance ${d.domain_id} carries a folded archetype`);
      }
    }

    // (5) Every instance must carry the plan's mandated Level-1 fields.
    const REQ = ['domain_id', 'sequence_position', 'domain_class', 'position_nm',
                 'orientation', 'scale', 'geometry_archetype', 'evidence_class', 'source'];
    for (const d of instances) {
      const miss = REQ.filter((f) => !(f in d));
      if (miss.length) errors.push(`${d.domain_id} missing Level-1 fields: ${miss.join(',')}`);
    }

    notes.push('Azimuthal placement is UNKNOWN and rendered on-axis (SCHEMATIC).');
    return { errors, notes, n_instances: instances.length };
  }
}
