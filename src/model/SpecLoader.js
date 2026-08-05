/**
 * SpecLoader — loads and validates the required scientific and presentation records.
 *
 * The scientific geometric specification (data/*.json) is the SINGLE SOURCE OF TRUTH.
 * This loader consumes it; it contains NO biological constants of its own.
 * (MASTER_PLAN Phase 2: "The renderer should consume the scientific specification
 *  rather than contain biological constants in application code.")
 *
 * Environment-agnostic: pass a `fetchJson(name) -> Promise<object>` reader so the
 * same code runs under Node (fs) and the browser (fetch).
 */

import { checkPresentationSpec } from '../presentation/StoryController.js';
import { checkAnnotationCatalog } from '../presentation/AnnotationCatalog.js';

export const SPEC_FILES = Object.freeze([
  'sarcomere.json',
  'titin.json',
  'structural_states.json',
  'geometry_sources.json',
  'references.json',
  'showcase_claims.json',
  'presentation.json',
  'annotations.json',
]);

// Phase-3 geometry strategy. Distinct from the five canonical source-of-truth
// files: it is a DERIVED layer (primitive assignments) that references the spec
// rather than restating it. Loaded if present; validated against the spec.
export const STRATEGY_FILE = 'geometry_strategy.json';

// Phase-6 measured context geometry (PDB 8G4L, 6KN7), produced by
// scripts/measure_context.py. Like the strategy file this is DERIVED, not
// source-of-truth: it records what deposited coordinates measure, and Phase 7b
// consumes it. Loaded if present; followup_register item PH11-1 exists because it
// was previously read by no code at all.
export const CONTEXT_FILE = 'context_measurements.json';

export const EVIDENCE_CLASSES = Object.freeze([
  'MEASURED',
  'STRONGLY INFERRED',
  // MODELED: computed from a physical law whose every parameter is itself
  // MEASURED or STRONGLY INFERRED. It is a DERIVED value, not an observation,
  // so it ranks BELOW 'STRONGLY INFERRED' and can never present as MEASURED.
  // Permitted only with a declared `model_basis` (the law) and `modeled_from`
  // (the input classes); if any input is weaker than STRONGLY INFERRED, the
  // value takes that weaker class with MODELED as a parenthetical qualifier.
  'MODELED',
  'INFERRED',
  'SCHEMATIC',
  'UNKNOWN',
]);

export class SpecValidationError extends Error {
  constructor(problems) {
    super(`Spec validation failed with ${problems.length} problem(s):\n  - ` +
      problems.join('\n  - '));
    this.name = 'SpecValidationError';
    this.problems = problems;
  }
}

export class Spec {
  constructor(files) {
    this.sarcomere = files['sarcomere.json'];
    this.titin = files['titin.json'];
    this.states = files['structural_states.json'];
    this.geometrySources = files['geometry_sources.json'];
    this.references = files['references.json'];
    this.showcaseClaims = files['showcase_claims.json'];
    this.presentation = files['presentation.json'];
    this.annotations = files['annotations.json'];
    this.geometryStrategy = files[STRATEGY_FILE] || null;
    this.contextMeasurements = files[CONTEXT_FILE] || null;
    this._raw = files;
  }

  /** Load every required record (+ optional derived layers), then validate. */
  static async load(fetchJson, { validate = true, strategy = true, context = true } = {}) {
    const files = {};
    for (const name of SPEC_FILES) {
      files[name] = await fetchJson(name);
    }
    if (strategy) {
      try { files[STRATEGY_FILE] = await fetchJson(STRATEGY_FILE); }
      catch { /* strategy optional — absence is not a spec failure */ }
    }
    if (context) {
      try { files[CONTEXT_FILE] = await fetchJson(CONTEXT_FILE); }
      catch { /* context measurements optional — absence is not a spec failure */ }
    }
    const spec = new Spec(files);
    if (validate) spec.validate(); // throws SpecValidationError on any problem
    return spec;
  }

  /**
   * Structural + scientific-integrity validation. Mirrors scripts/validate_geometry.py
   * so the runtime refuses to render a spec that fails the same checks.
   * Returns { ok, problems }. Call validate() to throw instead.
   */
  check() {
    const p = [];
    const S = this.sarcomere, T = this.titin, ST = this.states, R = this.references;

    // 1. presence
    for (const [k, v] of Object.entries({
      sarcomere: S, titin: T, states: ST, geometrySources: this.geometrySources, references: R,
      showcaseClaims: this.showcaseClaims, presentation: this.presentation,
      annotations: this.annotations,
    })) if (!v || typeof v !== 'object') p.push(`${k}.json missing or not an object`);
    if (p.length) return { ok: false, problems: p };

    // 2. cross-reference integrity — every cited DOI/UniProt id resolves in references.json
    const refKeys = new Set(Object.keys(R));
    const cited = new Set();
    const walk = (o) => {
      if (Array.isArray(o)) return o.forEach(walk);
      if (o && typeof o === 'object') {
        for (const [k, v] of Object.entries(o)) {
          if (k === 'primary_references' || k === 'primary_source') {
            (Array.isArray(v) ? v : [v]).forEach((x) => {
              if (typeof x === 'string' && (x.startsWith('10.') || x.startsWith('UniProt'))) cited.add(x);
            });
          } else walk(v);
        }
      }
    };
    [S, T, ST, this.geometrySources].forEach(walk);
    for (const c of cited) if (!refKeys.has(c)) p.push(`citation not in references.json: ${c}`);

    // 2b. SC-1 presentation contract. It is a required presentation layer, not a
    // source of geometry, and may only reference IDs admitted by the scientific
    // records. Browser runtime therefore rejects the same cross-file drift as CI.
    p.push(...checkPresentationSpec(this.presentation, {
      claims: this.showcaseClaims,
      references: R,
      sarcomere: S,
      titin: T,
      states: ST,
      annotations: this.annotations,
    }));
    p.push(...checkAnnotationCatalog(this.annotations, {
      references: R,
      sarcomere: S,
      titin: T,
      claims: this.showcaseClaims,
    }));

    // 3. titin domain reconciliation against declared UniProt totals
    const ig = T.regions.reduce((a, r) => a + (r.domain_composition?.Ig_like || 0), 0);
    const fn = T.regions.reduce((a, r) => a + (r.domain_composition?.Fn3 || 0), 0);
    const decl = T.domain_totals || {};
    if (decl.Ig_like != null && ig !== decl.Ig_like) p.push(`Ig-like total ${ig} != declared ${decl.Ig_like}`);
    if (decl.Fn3 != null && fn !== decl.Fn3) p.push(`Fn3 total ${fn} != declared ${decl.Fn3}`);

    // 4. per-state numerical identities (the geometry the engine will interpolate)
    const HALF_THICK = this._halfThick(); // read from spec, not hardcoded
    const Z_HALF = this._zHalf();          // Z-disc half-width (titin emerges at Z-disc edge)
    for (const [name, g] of Object.entries(ST.states)) {
      const sl = g.sarcomere_length_nm;
      if (Math.abs(g.half_sarcomere_nm - sl / 2) > 0.5) p.push(`${name}: half_sarcomere != SL/2`);
      if (Math.abs(g.I_band_half_width_nm - (sl / 2 - HALF_THICK)) > 0.5)
        p.push(`${name}: I_band_half_width != SL/2 - ${HALF_THICK}`);
      // Elastic titin spans the Z-disc edge -> A-band tip: span == I-band half-width - Z-disc half-width.
      if (Math.abs(g.titin_I_band_total_nm - (g.I_band_half_width_nm - Z_HALF)) > 1.0)
        p.push(`${name}: titin elastic span (${g.titin_I_band_total_nm}) != I-band half-width - Z-disc half-width (${(g.I_band_half_width_nm - Z_HALF).toFixed(1)})`);
      const extSum = Object.values(g.titin_I_band_extension_nm).reduce((a, b) => a + b, 0);
      if (Math.abs(extSum - g.titin_I_band_total_nm) > 1.0)
        p.push(`${name}: titin extension components sum (${extSum.toFixed(1)}) != titin_I_band_total (${g.titin_I_band_total_nm})`);
    }

    // 5. evidence vocabulary — only the plan's declared classes (six since
    //    session 9, when MODELED was added), base token checked
    const evSeen = new Set();
    const harvest = (o) => {
      if (Array.isArray(o)) return o.forEach(harvest);
      if (o && typeof o === 'object') {
        for (const [k, v] of Object.entries(o)) {
          if (k === 'evidence_class' && typeof v === 'string') evSeen.add(this._baseClass(v));
          else if (k === 'evidence_by_claim' && v && typeof v === 'object')
            Object.values(v).forEach((x) => { if (typeof x === 'string') evSeen.add(this._baseClass(x)); });
          else harvest(v);
        }
      }
    };
    [S, T, ST, this.geometrySources].forEach(harvest);
    for (const e of evSeen) if (e && !EVIDENCE_CLASSES.includes(e)) p.push(`non-standard evidence class: ${e}`);

    // 6. every geometry-source parameter carries a source
    for (const par of (this.geometrySources.parameters || []))
      if (!par.primary_source || String(par.primary_source) === 'nan')
        p.push(`geometry param without source: ${par.parameter}`);

    // 7. geometry strategy (if loaded) must be consistent with the spec
    const GS = this.geometryStrategy;
    if (GS) {
      const vocab = new Set(GS.primitive_vocabulary || []);
      const asm = new Set(GS.assembly_vocabulary || []);
      // 7a. coverage: every sarcomere component + titin region has a strategy entry
      for (const c of S.components || [])
        if (!(GS.sarcomere_primitives || {})[c.id]) p.push(`strategy missing sarcomere component: ${c.id}`);
      for (const r of T.regions || [])
        if (!(GS.titin_primitives || {})[r.id]) p.push(`strategy missing titin region: ${r.id}`);
      // 7b. primitives/assemblies drawn from the declared vocabularies
      for (const a of Object.values(GS.domain_archetypes || {}))
        if (a.primitive && !vocab.has(a.primitive)) p.push(`strategy primitive not in vocab: ${a.primitive}`);
      for (const s of Object.values(GS.sarcomere_primitives || {}))
        if (s.primitive && !vocab.has(s.primitive)) p.push(`strategy primitive not in vocab: ${s.primitive}`);
      for (const t of Object.values(GS.titin_primitives || {})) {
        if (t.assembly && !asm.has(t.assembly)) p.push(`strategy assembly not in vocab: ${t.assembly}`);
        const bp = t.backbone_path_primitive && String(t.backbone_path_primitive).replace('_bound', '');
        if (bp && !vocab.has(bp)) p.push(`strategy backbone primitive not in vocab: ${bp}`);
      }
      // 7c. every source_param the strategy cites exists in geometry_sources
      const gsParams = new Set((this.geometrySources.parameters || []).map((x) => x.parameter));
      const citedParams = new Set(), citedDois = new Set();
      const scan = (o) => {
        if (Array.isArray(o)) return o.forEach(scan);
        if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
          if (k === 'source_params' && Array.isArray(v)) v.forEach((x) => citedParams.add(x));
          else if (k === 'axial_length_source_param') citedParams.add(v);
          else if ((k === 'sources' || k === 'source' || k === 'axial_length_source'))
            (Array.isArray(v) ? v : [v]).forEach((x) => citedDois.add(x));
          else scan(v);
        }
      };
      scan(GS);
      for (const cp of citedParams) if (!gsParams.has(cp)) p.push(`strategy cites unknown geometry param: ${cp}`);
      for (const d of citedDois) if (!refKeys.has(d)) p.push(`strategy cites unknown reference: ${d}`);
      // 7d. strategy evidence labels reduce to a plan class
      const evS = new Set();
      const scanEv = (o) => {
        if (Array.isArray(o)) return o.forEach(scanEv);
        if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
          if (k === 'evidence_by_claim' && v && typeof v === 'object')
            Object.values(v).forEach((x) => { if (typeof x === 'string') evS.add(this._baseClass(x)); });
          else scanEv(v);
        }
      };
      scanEv(GS);
      for (const e of evS) if (e && !EVIDENCE_CLASSES.includes(e)) p.push(`strategy non-standard evidence class: ${e}`);
    }

    // 8. context measurements (if loaded) — the Phase 6 measured-geometry layer.
    //    Checked here because followup_register PH11-1 recorded that this file was
    //    read by no code and validated by nothing: an unvalidated measurement file
    //    is indistinguishable from a note.
    const CM = this.contextMeasurements;
    if (CM) {
      const scope = (S.meta && S.meta.scope_muscle_type) || 'skeletal';
      for (const m of CM.measurements || []) {
        const q = m.quantity || '(unnamed)';
        if (m.value === undefined || m.value === null) p.push(`context measurement without value: ${q}`);
        if (!m.unit) p.push(`context measurement without unit: ${q}`);
        if (!m.evidence_class) p.push(`context measurement without evidence class: ${q}`);
        else if (!EVIDENCE_CLASSES.includes(this._baseClass(m.evidence_class)))
          p.push(`context measurement non-standard evidence class: ${q} -> ${m.evidence_class}`);
        // muscle_type is the CONDITION under which sarcomere.json's
        // isoform_reconciliation policy permits cross-muscle values at all.
        if (!m.muscle_type) p.push(`context measurement without muscle_type: ${q}`);
        else if (!String(m.muscle_type).toLowerCase().includes(scope) && !m.skeletal_transfer)
          p.push(`context measurement is out-of-scope muscle type but states no transferability: ${q}`);
        const srcs = m.sources || (m.source ? [m.source] : []);
        if (!srcs.length) p.push(`context measurement without source: ${q}`);
      }
    }

    return { ok: p.length === 0, problems: p };
  }

  validate() {
    const { ok, problems } = this.check();
    if (!ok) throw new SpecValidationError(problems);
    return this;
  }

  /** Map a full evidence label ("MEASURED (sequence/domains); ...") to its base class. */
  _baseClass(label) {
    const s = label.trim();
    if (s.startsWith('STRONGLY INFERRED')) return 'STRONGLY INFERRED';
    return s.split(/[ (;/]/)[0];
  }

  /** Half thick-filament length read from the spec (nm). No hardcoded biology. */
  _halfThick() {
    const tf = this.sarcomere.components.find((c) => c.id === 'thick_filament');
    return tf.dimensions_nm.length_X / 2;
  }

  _zHalf() {
    const zd = this.sarcomere.components.find((c) => c.id === 'zdisc');
    return zd.dimensions_nm.width_X / 2;
  }
}
