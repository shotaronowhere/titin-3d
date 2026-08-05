/**
 * SC-6 orthographic myofilament lattice cross-section.
 *
 * Two same-scale transverse panels that show how the modeled lattice narrows as
 * the sarcomere lengthens. The module owns no lattice mathematics: every site
 * comes back verbatim from `LatticeGeometry.latticePatch`, and every d10 comes
 * from `GeometryEngine.latticeD10` through that same call. A presentation view
 * that re-derived either would become a second, competing lattice solver, which
 * is exactly what the plan's lattice guardrail forbids.
 *
 * Why this is a descriptor module and not a camera.
 *
 * The educational cross-section must not foreshorten. Rather than adding an
 * orthographic camera and then asserting that nothing perspective-projected
 * leaked into it, the view is emitted as plane coordinates plus ONE shared
 * linear scale for both panels. Circles drawn from that record cannot be
 * foreshortened and cannot disagree about scale, so "no perspective tunnel" and
 * "both panels share center, scale, and projection" hold by construction and are
 * checkable without a GPU.
 *
 * What the comparison deliberately is not.
 *
 * A length sweep under a constant-volume idealization is a quasi-static model
 * statement. It is not a time-resolved trajectory of an actively contracting
 * sarcomere, whose effective Poisson ratio is time varying. The caveat travels
 * inside the descriptor so it renders beside the panels rather than only in the
 * evidence inventory, and `time_resolved_contraction_implied` is validated false.
 */

const EPS = 1e-9;

const finite = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`LatticeCrossSection: ${label} must be finite.`);
  return number;
};

const claim = (spec, id) => {
  const record = spec.showcaseClaims?.objects?.find((object) => object.id === id);
  if (!record) throw new Error(`LatticeCrossSection: reviewed claim '${id}' is missing.`);
  return record;
};

/**
 * The declared working band, taken from the sourced literature parameter and
 * cross-checked against the band the presentation record declares. Two
 * independent statements of the same interval; disagreement is a failure rather
 * than a silent choice between them.
 */
function workingRangeNm(spec) {
  const record = spec.geometrySources?.parameters?.find((parameter) => (
    parameter.component === 'Sarcomere' && parameter.parameter === 'Resting/working length'
  ));
  if (!record) throw new Error('LatticeCrossSection: the sourced working-length parameter is missing.');
  if (record.unit !== 'µm') {
    throw new Error(`LatticeCrossSection: working length is recorded in '${record.unit}', expected µm.`);
  }
  const bounds = String(record.value).split(/[–-]/).map(Number);
  if (bounds.length !== 2 || !bounds.every(Number.isFinite) || !(bounds[0] < bounds[1])) {
    throw new Error(`LatticeCrossSection: cannot read a working range from '${record.value}'.`);
  }
  const sourced = bounds.map((value) => value * 1000);
  const declared = spec.presentation?.scope?.working_range_nm;
  if (!Array.isArray(declared) || declared.length !== 2
      || declared.some((value, index) => Math.abs(value - sourced[index]) > EPS)) {
    throw new Error(
      `LatticeCrossSection: the declared working range ${JSON.stringify(declared)} does not `
      + `match the sourced ${JSON.stringify(sourced)} nm band.`,
    );
  }
  return {
    min_nm: sourced[0],
    max_nm: sourced[1],
    source_ids: [record.primary_source],
    evidence_class: record.evidence_class,
  };
}

/** Every SC-6 gate that can be stated as a property of the emitted record. */
export function validateLatticeCrossSection(view) {
  if (!view || view.schema !== 'titin-lattice-cross-section/1') {
    throw new Error('validateLatticeCrossSection: unsupported record.');
  }
  if (view.projection?.kind !== 'orthographic' || view.projection.plane !== 'YZ'
      || view.projection.foreshortening !== 'none') {
    throw new Error('validateLatticeCrossSection: the cross-section must be an orthographic YZ projection.');
  }
  if (view.time_resolved_contraction_implied !== false
      || view.derives_second_lattice !== false) {
    throw new Error('validateLatticeCrossSection: the view may not imply active contraction or a second lattice.');
  }
  if (!Array.isArray(view.panels) || view.panels.length !== 2) {
    throw new Error('validateLatticeCrossSection: exactly two comparison panels are required.');
  }
  const frame = view.shared_frame;
  if (!Number.isFinite(frame?.half_extent_nm) || frame.half_extent_nm <= 0
      || frame.centre_nm?.y !== 0 || frame.centre_nm?.z !== 0) {
    throw new Error('validateLatticeCrossSection: both panels need one shared, centred frame.');
  }
  const lengths = new Set();
  for (const panel of view.panels) {
    if (panel.shared_frame_id !== frame.id || panel.rings !== frame.rings) {
      throw new Error(`validateLatticeCrossSection: panel '${panel.id}' does not use the shared frame.`);
    }
    if (!Number.isFinite(panel.d10_nm) || panel.d10_nm <= 0) {
      throw new Error(`validateLatticeCrossSection: panel '${panel.id}' has an invalid d10.`);
    }
    lengths.add(panel.sarcomere_length_nm);
    for (const key of ['thick', 'thin']) {
      if (!Array.isArray(panel[key]) || !panel[key].length) {
        throw new Error(`validateLatticeCrossSection: panel '${panel.id}' has no ${key} sites.`);
      }
    }
    // Ghosts are checked with the rest: a ghost outside the frame would be clipped,
    // and a silently clipped ghost understates the displacement it exists to show.
    for (const key of ['thick', 'thin', 'ghost_thick']) {
      for (const site of panel[key] || []) {
        if (![site.y, site.z, site.radius_nm].every(Number.isFinite) || site.radius_nm <= 0) {
          throw new Error(`validateLatticeCrossSection: panel '${panel.id}' has an invalid ${key} site.`);
        }
        if (Math.hypot(site.y, site.z) + site.radius_nm > frame.half_extent_nm + EPS) {
          throw new Error(`validateLatticeCrossSection: panel '${panel.id}' overflows the shared frame.`);
        }
      }
    }
    // The dimension line must MEASURE d10, not merely be labelled with it.
    const line = panel.dimension_line;
    const drawn = Math.hypot(line.to_nm.y - line.from_nm.y, line.to_nm.z - line.from_nm.z);
    if (Math.abs(drawn - panel.d10_nm) > 1e-6) {
      throw new Error(
        `validateLatticeCrossSection: panel '${panel.id}' draws a ${drawn.toFixed(4)} nm `
        + `dimension line for a ${panel.d10_nm.toFixed(4)} nm d10.`,
      );
    }
  }
  if (lengths.size !== 2) {
    throw new Error('validateLatticeCrossSection: the two panels must show different lengths.');
  }
  const [current, comparison] = view.panels;
  if (current.id !== 'current' || comparison.id !== 'comparison') {
    throw new Error('validateLatticeCrossSection: panel order is current, then comparison.');
  }
  if (comparison.outside_working_range !== false) {
    throw new Error('validateLatticeCrossSection: the comparison state must lie inside the working band.');
  }
  // Longer sarcomere, narrower lattice — the direction the declared model states.
  const longer = current.sarcomere_length_nm > comparison.sarcomere_length_nm
    ? current : comparison;
  const shorter = longer === current ? comparison : current;
  if (!(longer.d10_nm < shorter.d10_nm)) {
    throw new Error('validateLatticeCrossSection: d10 must fall as sarcomere length rises.');
  }
  if (!view.caveat?.text || view.caveat.beside_comparison !== true) {
    throw new Error('validateLatticeCrossSection: the constant-volume caveat must render beside the panels.');
  }
  if (!Array.isArray(view.not_claimed)
      || !view.not_claimed.some((entry) => /time-resolved active contraction/i.test(entry))) {
    throw new Error('validateLatticeCrossSection: the active-contraction non-claim is required.');
  }
  return view;
}

export class LatticeCrossSection {
  /**
   * @param {object} spec loaded Spec
   * @param {object} engine GeometryEngine
   * @param {object} lattice LatticeGeometry — the only source of sites and d10
   */
  constructor(spec, engine, lattice) {
    this.spec = spec;
    this.engine = engine;
    this.lattice = lattice;
    this.claim = claim(spec, 'lattice_cross_section');
    if (!String(this.claim.decision).startsWith('ADMIT')) {
      throw new Error('LatticeCrossSection: the cross-section claim is not admitted.');
    }
    this.workingRange = workingRangeNm(spec);

    const component = spec.sarcomere.components.find((entry) => entry.id === 'lattice');
    if (!component) throw new Error('LatticeCrossSection: the lattice component is missing.');
    this.component = component;
    this.thickRadiusNm = finite(
      spec.sarcomere.components.find((entry) => entry.id === 'thick_filament')
        ?.dimensions_nm?.diameter, 'thick diameter',
    ) / 2;
    this.thinRadiusNm = finite(
      spec.sarcomere.components.find((entry) => entry.id === 'thin_filament')
        ?.dimensions_nm?.diameter, 'thin diameter',
    ) / 2;

    // Comparison candidates are NAMED structural states inside the declared band,
    // not arbitrary boundary values: the comparison panel then shows a state the
    // rest of the application can also reach and label.
    this.candidates = Object.entries(spec.states?.states || {})
      .map(([id, state]) => ({ id, sarcomere_length_nm: state.sarcomere_length_nm }))
      .filter((state) => state.sarcomere_length_nm >= this.workingRange.min_nm
        && state.sarcomere_length_nm <= this.workingRange.max_nm)
      .sort((a, b) => a.sarcomere_length_nm - b.sarcomere_length_nm);
    if (this.candidates.length < 2) {
      throw new Error(
        'LatticeCrossSection: at least two defined structural states must lie inside the '
        + `${this.workingRange.min_nm}–${this.workingRange.max_nm} nm working band.`,
      );
    }
  }

  /**
   * The working-band state to compare against: whichever candidate sits furthest
   * from the displayed length, so the pair is never degenerate. Ties resolve to
   * the shorter state, which keeps the choice deterministic.
   */
  comparisonStateFor(sarcomereLengthNm) {
    return this.candidates.reduce((best, candidate) => {
      const distance = Math.abs(candidate.sarcomere_length_nm - sarcomereLengthNm);
      const bestDistance = Math.abs(best.sarcomere_length_nm - sarcomereLengthNm);
      if (distance > bestDistance + EPS) return candidate;
      if (Math.abs(distance - bestDistance) <= EPS) {
        return candidate.sarcomere_length_nm < best.sarcomere_length_nm ? candidate : best;
      }
      return best;
    });
  }

  /**
   * One panel's sites, exactly as the lattice layer evaluated them.
   *
   * @param {string} id
   * @param {number} sarcomereLengthNm
   * @param {number} rings
   * @param {{stateId?: string|null, ghostOf?: Record<string, any>|null}} [opts]
   * @returns {Record<string, any>}
   */
  _panel(id, sarcomereLengthNm, rings, opts = {}) {
    const { stateId = null, ghostOf = null } = opts;
    const patch = this.lattice.latticePatch(sarcomereLengthNm, rings);
    const thick = patch.thick.map((site) => ({
      y: site.y, z: site.z, ring: site.ring, radius_nm: this.thickRadiusNm,
    }));
    const thin = patch.thin.map((site) => ({
      y: site.y, z: site.z, radius_nm: this.thinRadiusNm,
    }));

    // The d10 dimension line is the perpendicular distance from the central
    // lattice point to the adjacent (1,0) row. Constructing it from two ring-1
    // sites makes its DRAWN length equal d10 by geometry rather than by label:
    // the midpoint of two neighbours 60 deg apart lies exactly a*sqrt(3)/2 away.
    const ringOne = thick
      .filter((site) => site.ring === 1)
      .sort((a, b) => Math.atan2(a.z, a.y) - Math.atan2(b.z, b.y));
    if (ringOne.length < 2) {
      throw new Error('LatticeCrossSection: a dimension line needs two ring-1 neighbours.');
    }
    const [first, second] = ringOne;
    const midpoint = { y: (first.y + second.y) / 2, z: (first.z + second.z) / 2 };

    // Judged on the length actually DISPLAYED, not the one requested: a clamped
    // request must not be labelled by a state the panel is not showing.
    const shown = patch.sarcomere_length_nm;
    const outside = shown < this.workingRange.min_nm || shown > this.workingRange.max_nm;
    return {
      id,
      state_id: stateId,
      // Assigned once both panels exist, so the two provably carry the same frame.
      shared_frame_id: /** @type {string|null} */ (null),
      sarcomere_length_nm: patch.sarcomere_length_nm,
      was_clamped: patch.was_clamped,
      outside_working_range: outside,
      status_label: outside ? 'REFERENCE · OUTSIDE WORKING RANGE' : 'WITHIN WORKING RANGE',
      d10_nm: patch.d10_nm,
      lattice_constant_nm: patch.lattice_constant_nm,
      myosin_actin_centre_nm: patch.myosin_actin_centre_nm,
      surface_separation_nm: patch.surface_separation_nm,
      rings: patch.rings,
      thick,
      thin,
      // Ghost sites are the OTHER panel's thick lattice at the same scale, so the
      // radial displacement is legible inside one panel as well as across the pair.
      ghost_thick: /** @type {Array<Record<string, number>>|null} */ (ghostOf
        ? ghostOf.thick.map((site) => ({ y: site.y, z: site.z, radius_nm: site.radius_nm }))
        : null),
      ghost_of_sarcomere_length_nm: /** @type {number|null} */ (
        ghostOf ? ghostOf.sarcomere_length_nm : null),
      dimension_line: {
        from_nm: { y: 0, z: 0 },
        to_nm: midpoint,
        value_nm: patch.d10_nm,
        label: 'd10',
        // The lattice row the distance is measured to, so the line reads as a
        // plane spacing rather than as an arbitrary segment between two circles.
        plane_nm: [
          { y: first.y, z: first.z },
          { y: second.y, z: second.z },
        ],
      },
      stoichiometry: patch.stoichiometry,
    };
  }

  /**
   * The two-panel comparison at a displayed sarcomere length.
   *
   * @param {number} sarcomereLengthNm
   * @param {{rings?: number}} [opts]
   */
  comparisonAt(sarcomereLengthNm, { rings = 2 } = {}) {
    // Chosen against the length that will actually be DISPLAYED. Selecting on the
    // raw request would let a clamped state be compared against the wrong end of
    // the working band.
    const shownNm = this.engine.clampSL(sarcomereLengthNm).sl;
    const comparisonState = this.comparisonStateFor(shownNm);
    const current = this._panel('current', sarcomereLengthNm, rings);
    const comparison = this._panel(
      'comparison', comparisonState.sarcomere_length_nm, rings,
      { stateId: comparisonState.id, ghostOf: current },
    );
    current.ghost_thick = comparison.thick
      .map((site) => ({ y: site.y, z: site.z, radius_nm: site.radius_nm }));
    current.ghost_of_sarcomere_length_nm = comparison.sarcomere_length_nm;

    // ONE scale for both panels, sized to whichever lattice is wider. Deriving it
    // from the pair rather than per panel is what makes the two directly
    // comparable instead of independently normalised.
    const reach = (panel) => Math.max(...[...panel.thick, ...panel.thin]
      .map((site) => Math.hypot(site.y, site.z) + site.radius_nm));
    const halfExtent = Math.max(reach(current), reach(comparison)) * 1.06;
    const frameId = `lattice_cross_section_${rings}`;
    current.shared_frame_id = frameId;
    comparison.shared_frame_id = frameId;

    const evidence = this.component.evidence_by_claim || {};
    const view = {
      schema: 'titin-lattice-cross-section/1',
      claim_id: this.claim.id,
      evidence_class: this.claim.render_evidence_class,
      claim_evidence_class: this.claim.claim_evidence_class,
      audience: [...this.claim.audience],
      projection: {
        kind: 'orthographic',
        plane: 'YZ',
        foreshortening: 'none',
        note: 'plane coordinates with one linear scale; no camera, no perspective divide',
      },
      shared_frame: {
        id: frameId,
        centre_nm: { y: 0, z: 0 },
        half_extent_nm: halfExtent,
        rings,
      },
      panels: [current, comparison],
      working_range_nm: [this.workingRange.min_nm, this.workingRange.max_nm],
      working_range_source_ids: [...this.workingRange.source_ids],
      comparison_selection_policy: 'the defined structural state inside the declared working '
        + 'band that lies furthest from the displayed length; ties resolve to the shorter state',
      d10_delta_nm: Number((current.d10_nm - comparison.d10_nm).toFixed(4)),
      sites_source: 'LatticeGeometry.latticePatch — evaluated sites are reused verbatim',
      d10_source: 'GeometryEngine.latticeD10 — the single constant-volume law',
      derives_second_lattice: false,
      time_resolved_contraction_implied: false,
      caveat: {
        beside_comparison: true,
        text: this.component.state_dependence,
        model_note: this.component.notes,
        scaling_law: this.component.repeating_geometry?.scaling_law,
        evidence_class: evidence.constant_volume_scaling_law,
        instantaneous_behavior: evidence.instantaneous_behavior_during_contraction,
        source_ids: [...(this.component.primary_references || [])],
      },
      evidence_by_claim: {
        d10_absolute_value: evidence.d10_absolute_value,
        d10_length_response: evidence.d10_length_and_preparation_response,
        constant_volume_scaling_law: evidence.constant_volume_scaling_law,
        instantaneous_behavior_during_contraction:
          evidence.instantaneous_behavior_during_contraction,
        transverse_positions: evidence.dimensions_and_positions,
      },
      not_claimed: [...this.claim.not_claimed],
      render_only: [
        'panel margin around the shared frame',
        'which two ring-1 neighbours carry the d10 dimension line',
        'circular filament cross-sections as a schematic envelope',
        // The site set is invariant under an in-plane reflection, so which way round
        // the plane is drawn carries no information; saying so keeps a reader from
        // reading a handedness into a view that claims none.
        'in-plane orientation and handedness of the drawn plane',
      ],
    };
    return validateLatticeCrossSection(view);
  }
}
