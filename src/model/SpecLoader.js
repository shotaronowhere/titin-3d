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

import { checkPresentationSpec, checkSemanticScenes } from '../presentation/StoryController.js';
import { checkAnnotationCatalog } from '../presentation/AnnotationCatalog.js';
import { mapFeaturesToRegions } from './SequenceFeatures.js';
import { scopeLedger } from './ScientificScope.js';
import { decisionLedger } from './ScientificDecisions.js';

export const SPEC_FILES = Object.freeze([
  'sarcomere.json',
  'titin.json',
  'structural_states.json',
  'geometry_sources.json',
  'references.json',
  'showcase_claims.json',
  'presentation.json',
  'scenes.json',
  'annotations.json',
  'scientific_scope.json',
  'titin_sequence_features.json',
  'claim_support.json',
  'scientific_decisions.json',
  'render_style.json',
  'mechanical_parameters.json',
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

// SC-16.2 measured Cα backbones for the domain archetypes, produced by
// scripts/extract_domain_backbones.py from the SHA-256-pinned structure cache.
// DERIVED like the two files above, and optional in the same way: it changes the
// SURFACE drawn for a domain at the deepest zoom and nothing else, so a build
// without it renders exactly the archetype capsules it always did.
export const BACKBONE_FILE = 'domain_backbones.json';

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

/** Development/test identity used only when a caller has no generated candidate. */
export const UNPINNED_IDENTITY = Object.freeze({
  model_fingerprint: 'unpinned-development-model',
  app_revision: 'unpinned-development-source',
  build_inputs_fingerprint: 'unpinned-development-inputs',
  model_input_manifest_fingerprint: 'unpinned-development-model-inputs',
});

function checkedIdentity(identity) {
  const value = identity || UNPINNED_IDENTITY;
  for (const field of ['model_fingerprint', 'app_revision', 'build_inputs_fingerprint']) {
    if (typeof value[field] !== 'string' || !value[field].trim()) {
      throw new Error(`Spec identity is missing ${field}`);
    }
  }
  return Object.freeze({
    model_fingerprint: value.model_fingerprint,
    app_revision: value.app_revision,
    build_inputs_fingerprint: value.build_inputs_fingerprint,
    model_input_manifest_fingerprint: typeof value.model_input_manifest_fingerprint === 'string'
      && value.model_input_manifest_fingerprint.trim()
      ? value.model_input_manifest_fingerprint : UNPINNED_IDENTITY.model_input_manifest_fingerprint,
  });
}

function isIsoCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export class SpecValidationError extends Error {
  constructor(problems) {
    super(`Spec validation failed with ${problems.length} problem(s):\n  - ` +
      problems.join('\n  - '));
    this.name = 'SpecValidationError';
    this.problems = problems;
  }
}

export class Spec {
  constructor(files, identity = UNPINNED_IDENTITY) {
    this.sarcomere = files['sarcomere.json'];
    this.titin = files['titin.json'];
    this.states = files['structural_states.json'];
    this.geometrySources = files['geometry_sources.json'];
    this.references = files['references.json'];
    this.showcaseClaims = files['showcase_claims.json'];
    this.presentation = files['presentation.json'];
    this.scenes = files['scenes.json'];
    this.annotations = files['annotations.json'];
    this.scientificScope = files['scientific_scope.json'];
    this.sequenceFeatures = files['titin_sequence_features.json'];
    this.claimSupport = files['claim_support.json'];
    this.scientificDecisions = files['scientific_decisions.json'];
    this.renderStyle = files['render_style.json'];
    this.mechanicalParameters = files['mechanical_parameters.json'];
    this.geometryStrategy = files[STRATEGY_FILE] || null;
    this.contextMeasurements = files[CONTEXT_FILE] || null;
    this.domainBackbones = files[BACKBONE_FILE] || null;
    // SC-18. Identity is injected by the builder/generator. Model code never
    // reaches into window, Git, or the filesystem to discover who it is.
    this.identity = checkedIdentity(identity);
    this._raw = files;
  }

  /** Load every required record (+ optional derived layers), then validate. */
  static async load(fetchJson, {
    validate = true, strategy = true, context = true, backbones = true,
    identity = UNPINNED_IDENTITY,
  } = {}) {
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
    if (backbones) {
      try { files[BACKBONE_FILE] = await fetchJson(BACKBONE_FILE); }
      catch { /* backbones optional — the archetype capsules are the fallback */ }
    }
    const spec = new Spec(files, identity);
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
      scenes: this.scenes,
      annotations: this.annotations,
      scientificScope: this.scientificScope,
      sequenceFeatures: this.sequenceFeatures,
      claimSupport: this.claimSupport,
      scientificDecisions: this.scientificDecisions,
      renderStyle: this.renderStyle,
      mechanicalParameters: this.mechanicalParameters,
    })) if (!v || typeof v !== 'object') p.push(`${k}.json missing or not an object`);
    if (p.length) return { ok: false, problems: p };

    // SC-19 authority records are mandatory and cross-linked. Detailed schema
    // validation is shared with the standalone Python gates; runtime performs
    // the boundary checks needed to refuse an incoherent artifact.
    try {
      const scope = scopeLedger(this);
      const decisions = decisionLedger(this);
      if (scope.sequence.accession !== this.sequenceFeatures.source?.record) {
        p.push('scientific scope accession differs from pinned sequence record');
      }
      if (scope.sequence.isoform_id !== this.sequenceFeatures.source?.isoform_id) {
        p.push('scientific scope isoform differs from pinned sequence record');
      }
      if (T.meta?.coordinate_frame !== scope.sequence.coordinate_frame) {
        p.push('titin coordinate frame differs from scientific scope');
      }
      if (T.meta?.total_length_aa !== this.sequenceFeatures.sequence_length_aa) {
        p.push('titin total length differs from pinned sequence length');
      }
      if (scope.sequence.review_status !== decisions.rows.find((row) => row.id === 'SD-01')?.status) {
        p.push('scope sequence review status differs from SD-01');
      }
      if (scope.mechanics.review_status !== decisions.rows.find((row) => row.id === 'SD-04')?.status) {
        p.push('scope mechanics review status differs from SD-04');
      }
      if (scope.render.review_status !== decisions.rows.find((row) => row.id === 'SD-05')?.status) {
        p.push('scope render review status differs from SD-05');
      }
      const mapped = mapFeaturesToRegions(this.sequenceFeatures, T.regions, {
        expectedCoordinateFrame: T.meta?.coordinate_frame,
      });
      if (mapped.boundaryProblems.length) {
        p.push(`sequence mapping has ${mapped.boundaryProblems.length} boundary problem(s)`);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      p.push(`SC-19 sequence/scope validation failed: ${detail}`);
    }
    if (this.claimSupport.schema !== 'titin-claim-support/1') {
      p.push('claim_support.json has the wrong schema');
    }
    if (this.scientificDecisions.schema !== 'titin-scientific-decisions/2') {
      p.push('scientific_decisions.json has the wrong schema');
    }
    if (this.renderStyle.schema !== 'titin-render-style/1') {
      p.push('render_style.json has the wrong schema');
    }
    if (this.mechanicalParameters.schema !== 'titin-mechanical-parameters/1') {
      p.push('mechanical_parameters.json has the wrong schema');
    }
    const mechanicsDecision = this.scientificDecisions.decisions?.['SD-04'];
    if (this.mechanicalParameters.decision?.status !== mechanicsDecision?.status) {
      p.push('mechanical parameter decision status differs from SD-04');
    }
    if (mechanicsDecision?.status !== 'APPROVED') {
      const output = this.mechanicalParameters.output_policy || {};
      if (output.evaluation_status !== 'not_evaluated'
          || output.force_value !== null
          || output.public_force !== 'SUPPRESSED') {
        p.push('unapproved mechanical parameter set does not fail closed');
      }
    }
    const supportIds = new Set((this.claimSupport.claims || []).map((claim) => claim.id));
    const supportById = new Map((this.claimSupport.claims || []).map((claim) => [claim.id, claim]));
    const resolvePointer = (value, pointer) => pointer.split('/').slice(1).reduce((node, raw) => {
      const token = raw.replaceAll('~1', '/').replaceAll('~0', '~');
      return Array.isArray(node) ? node[Number(token)] : node?.[token];
    }, value);
    for (const [index, object] of (this.showcaseClaims.objects || []).entries()) {
      if (!supportIds.has(object.claim_support_id)) {
        p.push(`showcase claim '${object.id}' has no claim-support record`);
      } else {
        const expected = `data/showcase_claims.json#/objects/${index}/claim`;
        if (!(supportById.get(object.claim_support_id)?.public_bindings || []).includes(expected)) {
          p.push(`showcase claim '${object.id}' lacks exact public binding '${expected}'`);
        }
      }
    }
    for (const section of ['guided_chapters', 'expert_cards']) {
      for (const [index, row] of (this.presentation[section] || []).entries()) {
        const expected = `data/presentation.json#/${section}/${index}`;
        const rowClaimIds = section === 'guided_chapters' ? row.claim_ids || [] : [row.target_claim_id];
        for (const claimId of rowClaimIds) {
          const claim = supportById.get(claimId);
          if (!claim) p.push(`presentation row '${row.id}' has unresolved claim-support ID '${claimId}'`);
          else if (!(claim.public_bindings || []).includes(expected)) {
            p.push(`presentation row '${row.id}' claim '${claimId}' lacks exact public binding '${expected}'`);
          }
        }
      }
    }
    for (const [sceneId, scene] of Object.entries(this.scenes.scenes || {})) {
      const expected = `data/scenes.json#/scenes/${sceneId}`;
      for (const claimId of scene.claim_ids || []) {
        const claim = supportById.get(claimId);
        if (!claim) p.push(`semantic scene '${sceneId}' has unresolved claim-support ID '${claimId}'`);
        else if (!(claim.public_bindings || []).includes(expected)) {
          p.push(`semantic scene '${sceneId}' claim '${claimId}' lacks exact public binding '${expected}'`);
        }
      }
    }
    for (const [index, annotation] of (this.annotations.components || []).entries()) {
      if (!annotation.claim_support_ids?.length) {
        p.push(`annotation '${annotation.id}' has no claim-support record`);
      }
      for (const id of annotation.claim_support_ids || []) {
        const claim = supportById.get(id);
        if (!claim) p.push(`annotation '${annotation.id}' has unresolved claim-support ID '${id}'`);
        else {
          const expected = `data/annotations.json#/components/${index}`;
          if (!(claim.public_bindings || []).includes(expected)) {
            p.push(`annotation '${annotation.id}' lacks claim '${id}' binding '${expected}'`);
          }
        }
      }
    }
    const ownerApprovableClaims = new Set([
      'sarcomere_definition', 'actomyosin_motor_function',
    ]);
    for (const claim of this.claimSupport.claims || []) {
      const review = claim.review || {};
      const authority = review.approval_authority;
      if (review.status === 'PENDING' && authority) {
        p.push(`claim '${claim.id}' invents approval authority while PENDING`);
      } else if (review.status === 'APPROVED' && authority?.type === 'PROJECT_OWNER') {
        const authorityKeys = Object.keys(authority).sort().join('|');
        if (authorityKeys !== [
          'authority_basis', 'identity', 'independent_scientific_reviewer', 'type',
        ].sort().join('|')
            || !ownerApprovableClaims.has(claim.id)
            || claim.inventory_status !== 'REQUIRED_FOR_SC23'
            || authority.identity !== 'UNDISCLOSED_PROJECT_OWNER'
            || authority.authority_basis !== 'registered_scientific_evidence_accepted'
            || authority.independent_scientific_reviewer !== false
            || review.independent_human_review_status !== 'NOT_PERFORMED'
            || review.locator_verified_independently !== false
            || review.reviewer !== null || review.affiliation !== null
            || review.reviewed_on !== null
            || review.publication_consent !== false
            || !isIsoCalendarDate(review.approved_on)
            || !/^[0-9a-f]{64}$/.test(review.reviewed_payload_sha256 || '')) {
          p.push(`claim '${claim.id}' has invalid project-owner approval provenance`);
        }
      } else if (review.status === 'APPROVED'
          && (!review.reviewer || !review.affiliation
            || review.locator_verified_independently !== true)) {
        p.push(`claim '${claim.id}' has unsupported approval provenance`);
      }
      for (const binding of claim.public_bindings || []) {
        const match = binding.match(/^data\/([^#]+)#(\/.*)$/);
        if (!match) continue;
        const file = this._raw[match[1]];
        if (!file || resolvePointer(file, match[2]) === undefined) {
          p.push(`claim '${claim.id}' has unresolved public binding '${binding}'`);
        }
      }
    }
    for (const decisionId of ['SD-01', 'SD-02', 'SD-03', 'SD-04', 'SD-05']) {
      const decision = this.scientificDecisions.decisions?.[decisionId];
      if (!decision) {
        p.push(`scientific decision ${decisionId} is missing`);
      } else if (decision.status === 'PENDING'
          && (decision.reviewer !== null || decision.ruling !== null || decision.reviewed_on !== null)) {
        p.push(`scientific decision ${decisionId} invents review metadata while PENDING`);
      }
    }

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
    const presentationContext = {
      claims: this.showcaseClaims,
      claimSupport: this.claimSupport,
      references: R,
      sarcomere: S,
      titin: T,
      states: ST,
      annotations: this.annotations,
      scientificScope: this.scientificScope,
      scenes: this.scenes,
    };
    p.push(...checkPresentationSpec(this.presentation, presentationContext));
    p.push(...checkSemanticScenes(this.scenes, {
      ...presentationContext,
      presentation: this.presentation,
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
    const curated = decl.curated_biological_domain_count || {};
    const rendered = decl.rendered_domain_count || {};
    if (ig !== curated.Ig_like) p.push(`Ig-like total ${ig} != curated ${curated.Ig_like}`);
    if (fn !== curated.Fn3) p.push(`Fn3 total ${fn} != curated ${curated.Fn3}`);
    if (rendered.Ig_like !== curated.Ig_like || rendered.Fn3 !== curated.Fn3) {
      p.push('rendered domain totals differ from curated biological totals');
    }

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
      for (const m of CM.measurements || []) {
        const q = m.quantity || '(unnamed)';
        if (m.value === undefined || m.value === null) p.push(`context measurement without value: ${q}`);
        if (!m.unit) p.push(`context measurement without unit: ${q}`);
        if (!m.evidence_class) p.push(`context measurement without evidence class: ${q}`);
        else if (!EVIDENCE_CLASSES.includes(this._baseClass(m.evidence_class)))
          p.push(`context measurement non-standard evidence class: ${q} -> ${m.evidence_class}`);
        if (!m.muscle_type) p.push(`context measurement without muscle_type: ${q}`);
        if (!m.skeletal_transfer) p.push(`context measurement states no transfer/admission status: ${q}`);
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
