/**
 * Provenance — resolves evidence class, source, and bibliographic detail for any
 * spec value. Backs the plan's "optional evidence/confidence display" (Phase 10).
 *
 * Never invents a class. If a value is not classified in the spec it resolves to
 * UNKNOWN with a note, so the UI can honestly say "not classified" rather than
 * implying certainty.
 */
export class Provenance {
  constructor(spec) {
    this.spec = spec;
    // geometry_sources.json labels components by human name ("Thick filament");
    // the rest of the app keys off component ids ("thick_filament"). Build an
    // alias map so callers can use EITHER, and normalize both to a lookup token.
    this._componentAlias = new Map();
    for (const c of spec.sarcomere.components || []) {
      this._componentAlias.set(this._norm(c.id), c.id);
      this._componentAlias.set(this._norm(c.name), c.id);
    }
    // hand-map the geometry_sources component names that don't match a component id
    // (these are broader groupings than the 5 render components — kept explicit).
    for (const [name, id] of [
      ['Sarcomere', 'sarcomere'], ['Titin', 'titin'],
      ['Myofilament lattice', 'lattice'], ['Z-disc', 'zdisc'],
      ['Thick filament', 'thick_filament'], ['Thin filament', 'thin_filament'],
    ]) this._componentAlias.set(this._norm(name), id);

    // index geometry parameters by (normalized-component-id, normalized-parameter)
    this._params = new Map();
    for (const par of spec.geometrySources.parameters || []) {
      const cid = this._componentAlias.get(this._norm(par.component)) || this._norm(par.component);
      this._params.set(`${cid}::${this._norm(par.parameter)}`, par);
    }
  }

  /** Normalize a label for tolerant matching (lowercase, collapse punctuation/space). */
  _norm(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  /** All (component, parameter) pairs available in geometry_sources — for discovery. */
  listParameters() {
    return (this.spec.geometrySources.parameters || []).map((p) => ({
      component: p.component, parameter: p.parameter, evidence_class: p.evidence_class,
    }));
  }

  /** Parameter names available for one component (id or human name). */
  parametersFor(component) {
    const cid = this._componentAlias.get(this._norm(component)) || this._norm(component);
    return (this.spec.geometrySources.parameters || [])
      .filter((p) => (this._componentAlias.get(this._norm(p.component)) || this._norm(p.component)) === cid)
      .map((p) => p.parameter);
  }

  /** Resolve one reference key (DOI or "UniProt:...") to its bibliography entry. */
  reference(key) {
    return this.spec.references[key] || null;
  }

  /** Full bibliography entries for a list of citation keys, skipping unresolved. */
  references(keys = []) {
    return keys.map((k) => ({ key: k, entry: this.reference(k) })).filter((r) => r.entry);
  }

  /**
   * Evidence descriptor for a sarcomere component or titin region.
   * Returns { top, byClaim, sources, unknowns } — byClaim is the per-claim map
   * added in the session-4 review (residue span = MEASURED, render proxy = SCHEMATIC, ...).
   */
  forComponent(id) {
    const c = this.spec.sarcomere.components.find((x) => x.id === id);
    if (!c) return null;
    return {
      id,
      top: c.evidence_class,
      byClaim: c.evidence_by_claim || null,
      sources: this.references(c.primary_references || []),
      unknowns: (this.spec.sarcomere.unknowns || []),
    };
  }

  forRegion(id) {
    const r = this.spec.titin.regions.find((x) => x.id === id);
    if (!r) return null;
    return {
      id,
      top: r.evidence_class,
      byClaim: r.evidence_by_claim || null,
      sources: this.references(r.primary_references || []),
      unknowns: (this.spec.titin.unknowns || []),
    };
  }

  /**
   * Evidence descriptor for one geometry parameter. `component` accepts either a
   * component id ("thick_filament") or the geometry_sources human name
   * ("Thick filament"); `parameter` matches tolerantly (case/punctuation-insensitive).
   * A lookup MISS returns { found:false } — deliberately NOT class:UNKNOWN, so a
   * missing key is never mistaken for a spec-declared genuine unknown. Use
   * listParameters()/parametersFor() to discover valid names.
   */
  forParameter(component, parameter) {
    const cid = this._componentAlias.get(this._norm(component)) || this._norm(component);
    const par = this._params.get(`${cid}::${this._norm(parameter)}`);
    if (!par) return {
      found: false,
      note: 'no such parameter in geometry_sources.json (lookup miss, not a scientific unknown)',
      available: this.parametersFor(component),
    };
    return {
      found: true,
      class: par.evidence_class,
      value: par.value,
      unit: par.unit,
      species: par.species,
      isoform: par.isoform,
      muscle_type: par.muscle_type,
      state: par.biological_state,
      method: par.method,
      uncertainty: par.uncertainty,
      verified: par.verified,
      sources: this.references([par.primary_source].filter(Boolean)),
    };
  }

  /** All explicit unknowns across the spec — for a "what we do NOT know" panel. */
  allUnknowns() {
    return [
      ...(this.spec.sarcomere.unknowns || []).map((u) => ({ scope: 'sarcomere', ...u })),
      ...(this.spec.titin.unknowns || []).map((u) => ({ scope: 'titin', ...u })),
    ];
  }
}
