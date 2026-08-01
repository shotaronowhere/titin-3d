/**
 * Phase 9 — the biological API.
 *
 * The plan requires that the core API "use biological concepts rather than raw
 * rendering operations", and that low-level Three.js stay behind these
 * abstractions. This module is that boundary. It is deliberately a FACADE: every
 * number it returns is produced by the Phase 3-8 layers that the validator and
 * the test suite already cover. Nothing here re-derives geometry, because a
 * second derivation could drift from the first and there would be no way to say
 * which one was the spec.
 *
 * Layering:
 *
 *   data/*.json  (source of truth)
 *        v
 *   SpecLoader -> GeometryEngine -> TitinRepresentation -> InstancingPlan
 *        v
 *   THIS MODULE  (biological vocabulary; pure data, no Three.js)
 *        v
 *   TitinVisualization  (Three.js; src/api/TitinVisualization.js)
 *
 * Everything in this file is headless and synchronous, so the whole biological
 * API is testable in Node with no WebGL context.
 *
 * @module api/titinApi
 */

/** @typedef {import('../model/TitinModel.js').TitinModel} TitinModel */
/** @typedef {import('../geometry/TitinRepresentation.js').TitinRepresentation} TitinRepresentation */

/**
 * A titin backbone path. It carries the sarcomere length it was derived at,
 * which is what makes it verifiable downstream — see {@link placeDomainsAlongPath}.
 *
 * @typedef {object} TitinPath
 * @property {number} sarcomere_length_nm
 * @property {number} level
 * @property {string} curve_type
 * @property {Array<{x:number,y:number,z:number,at:string}>} points
 * @property {Array<{region_id:string,band:string,X_start:number,X_end:number}>} segments
 * @property {object} [terminus]
 */

/**
 * @typedef {object} DomainPlacement
 * @property {string} domain_id
 * @property {string} domain_class
 * @property {{x:number,y:number,z:number}} position_nm
 * @property {object} orientation
 * @property {string|null} geometry_archetype null for regions with no fitted archetype
 * @property {string} evidence_class
 *
 * Only the fields consumers rely on are declared. Instance records carry ~24
 * fields; narrowing the typedef to the load-bearing ones keeps the contract
 * readable, so it is applied as a documented view rather than a cast.
 */

/** The four I-band elastic regions, in Z-disc -> A-band order. */
export const IBAND_REGIONS = Object.freeze(['prox_Ig', 'N2A', 'PEVK', 'dist_Ig']);

/**
 * Largest tolerated disagreement (nm) between a caller-supplied path and the
 * path the canonical mechanical model produces at the same sarcomere length. The spec
 * stores region extensions to 0.001 nm, so 0.01 nm sits above round-trip noise
 * while still catching any real redistribution.
 */
export const PATH_FIDELITY_TOL_NM = 0.01;

// ---------------------------------------------------------------------------
// internal guards
// ---------------------------------------------------------------------------

/**
 * @param {TitinModel} model
 * @returns {TitinRepresentation}
 */
function requireRepresentation(model) {
  if (!model || !model.representation) {
    throw new Error(
      'titinApi: this model has no titin representation — geometry_strategy.json '
      + 'was not loaded. Construct the model with a reader that can see data/.',
    );
  }
  return model.representation;
}

/** @param {TitinModel} model */
function requireStrategy(model) {
  if (!model || !model.strategy) {
    throw new Error(
      'titinApi: this model has no geometry strategy — geometry_strategy.json was '
      + 'not loaded, so no scene descriptors can be produced.',
    );
  }
  return model.strategy;
}

/**
 * Option keys {@link resolveLength} accepts. Callers that take further options
 * (regionId, includeAband, rings, ...) declare them in EXTRA_OPTS so this set
 * stays the single definition of the length vocabulary.
 */
const LENGTH_OPTS = new Set(['sarcomereLengthNm', 'state']);

/**
 * Resolve a sarcomere length from either an explicit number or a named
 * structural state. Exactly one must be supplied: accepting both and preferring
 * one silently would make the returned geometry ambiguous when they disagree.
 *
 * @param {TitinModel} model
 * @param {{sarcomereLengthNm?: number, state?: string}} [opts]
 * @returns {{sarcomereLengthNm: number, state: string|null}}
 */
function resolveLength(model, opts = {}, extraOpts = []) {
  // A misspelled key (`sarcomereLength` for `sarcomereLengthNm`) used to be
  // silently ignored, so a caller who asked for a specific length could be shown a
  // different one with no error at all. Silence is the wrong default for an API
  // whose entire purpose is that the geometry on screen is the geometry that was
  // asked for — so unknown keys are refused, and the likely near-miss is named.
  const accepted = new Set([...LENGTH_OPTS, ...extraOpts]);
  const unknown = Object.keys(opts).filter((k) => !accepted.has(k));
  if (unknown.length) {
    const hint = unknown.includes('sarcomereLength')
      ? " Did you mean 'sarcomereLengthNm'? Lengths are always in nanometres."
      : '';
    throw new Error(
      `titinApi: unknown option(s) ${unknown.join(', ')}. `
      + `Accepted here: ${[...accepted].join(', ')}.${hint}`,
    );
  }
  const { sarcomereLengthNm, state } = opts;
  const hasNm = sarcomereLengthNm !== undefined && sarcomereLengthNm !== null;
  const hasState = state !== undefined && state !== null;

  if (hasNm && hasState) {
    throw new Error(
      'titinApi: pass sarcomereLengthNm OR state, not both — they can disagree, '
      + 'and silently preferring one would make the returned geometry ambiguous.',
    );
  }
  if (hasState) {
    const presets = model.presets();
    const kf = presets.find((p) => p.name === state);
    if (!kf) {
      throw new Error(
        `titinApi: unknown structural state '${state}'. Known states: `
        + presets.map((p) => p.name).join(', '),
      );
    }
    return { sarcomereLengthNm: kf.sarcomere_length_nm, state };
  }
  if (!hasNm) {
    throw new Error('titinApi: sarcomereLengthNm or state is required.');
  }
  if (!Number.isFinite(sarcomereLengthNm)) {
    throw new Error(`titinApi: sarcomereLengthNm must be finite, got ${sarcomereLengthNm}`);
  }
  const { min, max } = model.slRange();
  if (sarcomereLengthNm < min || sarcomereLengthNm > max) {
    throw new Error(
      `titinApi: sarcomereLengthNm ${sarcomereLengthNm} is outside the modelled `
      + `range ${min}–${max} nm. Headless biological queries are strict and never `
      + 'silently clamp; use TitinVisualization.setSarcomereLength() when a UI '
      + 'needs an explicitly disclosed clamp.',
    );
  }
  // Name the state if this length happens to BE a keyframe, so a caller who
  // passed a number still gets the biological label back.
  const exact = model.presets().find((p) => p.sarcomere_length_nm === sarcomereLengthNm);
  return { sarcomereLengthNm, state: exact ? exact.name : null };
}

// ---------------------------------------------------------------------------
// the names the plan specifies
// ---------------------------------------------------------------------------

/**
 * `createSarcomere` — the sarcomere context view: filaments, Z-disc, M-line and
 * the transverse lattice, as primitive descriptors in nm.
 *
 * The generated scene is checked against the spec's forbidden rules before it is
 * returned; a caller should never have to remember to do that.
 *
 * @param {TitinModel} model
 * @param {object} [opts]
 * @param {number} [opts.sarcomereLengthNm]
 * @param {string} [opts.state] named structural state instead of a length
 * @param {number} [opts.rings] transverse lattice rings (0 = axial only)
 * @param {boolean} [opts.contextDetail] include crowns / head pairs / thin twist
 * @returns {object}
 */
export function createSarcomere(model, opts = {}) {
  requireStrategy(model);
  const { sarcomereLengthNm, state } = resolveLength(model, opts, ['rings', 'contextDetail']);
  const { rings = 1, contextDetail = false } = opts;
  if (!Number.isInteger(rings) || rings < 0) {
    throw new Error(`createSarcomere: rings must be a non-negative integer, got ${rings}`);
  }
  if (typeof contextDetail !== 'boolean') {
    throw new Error('createSarcomere: contextDetail must be boolean.');
  }

  const scene = rings > 0
    ? model.contextSceneAt(sarcomereLengthNm, { rings })
    : model.sceneAt(sarcomereLengthNm);

  const verification = model.verifyScene(scene);
  if (verification.errors && verification.errors.length) {
    throw new Error(
      'createSarcomere: generated geometry violates the spec\'s forbidden rules: '
      + verification.errors.join('; '),
    );
  }

  const detail = contextDetail
    ? model.contextDetailSceneAt(sarcomereLengthNm, { rings })
    : null;

  return {
    kind: 'sarcomere',
    sarcomere_length_nm: sarcomereLengthNm,
    structural_state: state,
    lattice_rings: rings,
    scene,
    context_detail: detail,
    verification,
    provenance: {
      geometry: 'GeometryEngine.geometryAt via GeometryStrategy.sceneAt',
      lattice: rings > 0 ? model.latticeProvenance() : null,
      context_detail: contextDetail ? model.contextDetailProvenance() : null,
    },
  };
}

/**
 * `createTitinPath` — the titin backbone polyline at a given sarcomere length.
 *
 * Region extension is NOT uniform: each region's share of the I-band comes from
 * the Phase 8 series force-balance model, so the regions extend by very
 * different factors (prox_Ig ~3x vs PEVK ~53x between SL 1900 and 3000 nm).
 *
 * @param {TitinModel} model
 * @param {object} [opts]
 * @param {number} [opts.sarcomereLengthNm]
 * @param {string} [opts.state]
 * @returns {TitinPath}
 */
export function createTitinPath(model, opts = {}) {
  const rep = requireRepresentation(model);
  const { sarcomereLengthNm } = resolveLength(model, opts);
  return rep.backboneAt(sarcomereLengthNm);
}

/**
 * `createDomainChain` — the ordered domain chain of ONE titin region.
 *
 * @param {TitinModel} model
 * @param {string} regionId e.g. 'prox_Ig', 'PEVK', 'Aband_super'
 * @param {object} [opts]
 * @param {number} [opts.sarcomereLengthNm]
 * @param {string} [opts.state]
 * @returns {{region_id:string, sarcomere_length_nm:number, span_nm:number,
 *            count:number, domains:DomainPlacement[], extension:object|null}}
 */
export function createDomainChain(model, regionId, opts = {}) {
  const rep = requireRepresentation(model);
  const { sarcomereLengthNm } = resolveLength(model, opts);

  const known = rep.regions.map((r) => r.id);
  if (!known.includes(regionId)) {
    throw new Error(
      `createDomainChain: unknown region '${regionId}'. Known regions: ${known.join(', ')}`,
    );
  }

  const all = rep.domainInstancesAt(sarcomereLengthNm);
  const domains = all.instances.filter((d) => _regionOf(rep, d) === regionId);

  const path = rep.backboneAt(sarcomereLengthNm);
  const seg = path.segments.find((s) => s.region_id === regionId) || null;

  return {
    region_id: regionId,
    sarcomere_length_nm: sarcomereLengthNm,
    span_nm: seg ? seg.X_end - seg.X_start : 0,
    count: domains.length,
    domains: /** @type {DomainPlacement[]} */ (domains),
    extension: seg ? { X_start: seg.X_start, X_end: seg.X_end, band: seg.band } : null,
  };
}

/**
 * `createTitin` — one complete titin molecule: the path, every domain placed on
 * it, and the evidence record for both.
 *
 * @param {TitinModel} model
 * @param {object} [opts]
 * @param {number} [opts.sarcomereLengthNm]
 * @param {string} [opts.state]
 * @param {boolean} [opts.includeAband] default true
 * @returns {object}
 */
export function createTitin(model, opts = {}) {
  const rep = requireRepresentation(model);
  const { sarcomereLengthNm, state } = resolveLength(model, opts, ['includeAband']);
  const { includeAband = true } = opts;
  if (typeof includeAband !== 'boolean') {
    throw new Error('createTitin: includeAband must be boolean.');
  }

  const path = rep.backboneAt(sarcomereLengthNm);
  const placed = rep.domainInstancesAt(sarcomereLengthNm, { includeAband });
  const verification = rep.verifyRepresentation(sarcomereLengthNm);
  if (verification.errors && verification.errors.length) {
    throw new Error(
      'createTitin: generated representation violates the scientific contract: '
      + verification.errors.join('; '),
    );
  }

  const byRegion = {};
  for (const seg of path.segments) {
    byRegion[seg.region_id] = {
      band: seg.band,
      X_start: seg.X_start,
      X_end: seg.X_end,
      length_nm: seg.X_end - seg.X_start,
    };
  }

  return {
    kind: 'titin',
    sarcomere_length_nm: sarcomereLengthNm,
    structural_state: state,
    path,
    domains: /** @type {DomainPlacement[]} */ (placed.instances),
    domain_count: placed.instances.length,
    regions: byRegion,
    verification,
    provenance: {
      extension_model: 'Phase 8 series force balance (MODELED); regions extend '
        + 'non-uniformly — see data/mechanical_model.json',
      placement: 'TitinRepresentation.domainInstancesAt',
    },
  };
}

/**
 * `placeDomainsAlongPath` — place domains on a titin path.
 *
 * This is the one name in the plan's list that invites a scientific error, so it
 * is written to refuse it. "Place N domains along a path" reads naturally as
 * "distribute them evenly", and the plan states plainly: *Do not uniformly scale
 * titin. Different regions should respond according to their experimentally
 * supported mechanical behavior.* Even spacing would silently discard the Phase 8
 * force-balance partition while still looking plausible on screen.
 *
 * So this function does not take a path and a count. It takes a path that knows
 * the sarcomere length it came from, re-derives the mechanically correct
 * placement at that length, and VERIFIES that the supplied path still matches
 * the model. A path that has been rescaled, flattened, or hand-built with equal
 * region lengths fails the check instead of rendering.
 *
 * @param {TitinModel} model
 * @param {TitinPath} path from {@link createTitinPath}
 * @param {object} [opts]
 * @param {string} [opts.regionId] restrict to one region
 * @param {boolean} [opts.includeAband] default true
 * @param {boolean} [opts.uniform] REFUSED — see above
 * @param {number} [opts.spacing_nm] REFUSED — see above
 * @param {number} [opts.count] REFUSED — see above
 * @returns {{sarcomere_length_nm:number, domains:DomainPlacement[],
 *            fidelity:{checked:number, points_checked:number,
 *            exact_region_coverage:boolean, canonical_order:boolean,
 *            worst_deviation_nm:number}}}
 */
export function placeDomainsAlongPath(model, path, opts = {}) {
  const rep = requireRepresentation(model);

  const accepted = new Set(['regionId', 'includeAband', 'uniform', 'uniformSpacing', 'spacing_nm', 'count']);
  const unknown = Object.keys(opts).filter((key) => !accepted.has(key));
  if (unknown.length) {
    throw new Error(
      `placeDomainsAlongPath: unknown option(s) ${unknown.join(', ')}. Accepted: `
      + `${[...accepted].join(', ')}.`,
    );
  }
  const forbidden = ['uniform', 'uniformSpacing', 'spacing_nm', 'count']
    .filter((key) => Object.hasOwn(opts, key));
  if (forbidden.length) {
    throw new Error(
      `placeDomainsAlongPath: ${forbidden.join(', ')} placement option(s) are `
      + 'refused. The plan forbids uniformly scaling titin: each region extends '
      + 'according to its own force-extension law (Phase 8). Placement is derived '
      + "from the path's sarcomere length, never from a spacing argument.",
    );
  }
  if (!path || typeof path !== 'object') {
    throw new Error('placeDomainsAlongPath: a path from createTitinPath() is required.');
  }
  const sl = path.sarcomere_length_nm;
  if (!Number.isFinite(sl)) {
    throw new Error(
      'placeDomainsAlongPath: this path carries no sarcomere_length_nm, so the '
      + 'mechanically correct domain placement cannot be determined. Obtain the '
      + 'path from createTitinPath(), which records it.',
    );
  }
  const range = model.slRange();
  if (sl < range.min || sl > range.max) {
    throw new Error(
      `placeDomainsAlongPath: path length ${sl} nm is outside the modelled range `
      + `${range.min}–${range.max} nm.`,
    );
  }
  if (!Array.isArray(path.segments) || path.segments.length === 0) {
    throw new Error('placeDomainsAlongPath: path has no segments.');
  }
  if (!Array.isArray(path.points) || path.points.length === 0) {
    throw new Error('placeDomainsAlongPath: path has no control points.');
  }
  if (path.curve_type !== 'polyline_control_points' || path.level !== 0) {
    throw new Error(
      'placeDomainsAlongPath: expected an unmodified level-0 polyline from createTitinPath().',
    );
  }
  const { includeAband = true, regionId = null } = opts;
  if (typeof includeAband !== 'boolean') {
    throw new Error('placeDomainsAlongPath: includeAband must be boolean.');
  }
  const knownRegions = new Set(rep.regions.map((region) => region.id));
  if (regionId !== null && (typeof regionId !== 'string' || !knownRegions.has(regionId))) {
    throw new Error(
      `placeDomainsAlongPath: unknown region '${regionId}'. Known regions: `
      + [...knownRegions].join(', '),
    );
  }

  // --- fidelity gate: does this path still match the model at its own SL? ---
  const reference = rep.backboneAt(sl);
  if (path.segments.length !== reference.segments.length) {
    throw new Error(
      `placeDomainsAlongPath: path has ${path.segments.length} segments; the model `
      + `requires exactly ${reference.segments.length}. Partial paths are not accepted.`,
    );
  }
  if (path.points.length !== reference.points.length) {
    throw new Error(
      `placeDomainsAlongPath: path has ${path.points.length} control points; the `
      + `model requires exactly ${reference.points.length}.`,
    );
  }
  let worst = 0;
  let worstRegion = null;
  let checked = 0;
  const seen = new Set();
  for (let i = 0; i < path.segments.length; i += 1) {
    const seg = path.segments[i];
    const ref = reference.segments[i];
    if (!seg || seg.region_id !== ref.region_id || seg.band !== ref.band) {
      throw new Error(
        `placeDomainsAlongPath: segment ${i} is '${seg?.region_id ?? 'missing'}'; `
        + `expected '${ref.region_id}' in canonical biological order.`,
      );
    }
    if (seen.has(seg.region_id)) {
      throw new Error(`placeDomainsAlongPath: duplicate region '${seg.region_id}'.`);
    }
    seen.add(seg.region_id);
    if (![seg.X_start, seg.X_end].every(Number.isFinite)) {
      throw new Error(`placeDomainsAlongPath: region '${seg.region_id}' has non-finite coordinates.`);
    }
    const d = Math.max(
      Math.abs(seg.X_start - ref.X_start),
      Math.abs(seg.X_end - ref.X_end),
    );
    checked += 1;
    if (d > worst) { worst = d; worstRegion = seg.region_id; }
  }
  let worstPoint = 0;
  for (let i = 0; i < path.points.length; i += 1) {
    const point = path.points[i];
    const ref = reference.points[i];
    if (!point || point.at !== ref.at || ![point.x, point.y, point.z].every(Number.isFinite)) {
      throw new Error(
        `placeDomainsAlongPath: control point ${i} is missing, non-finite, or not labelled '${ref.at}'.`,
      );
    }
    worstPoint = Math.max(
      worstPoint,
      Math.abs(point.x - ref.x),
      Math.abs(point.y - ref.y),
      Math.abs(point.z - ref.z),
    );
  }
  if (worstPoint > worst) {
    worst = worstPoint;
    worstRegion = 'control points';
  }
  if (worst > PATH_FIDELITY_TOL_NM) {
    throw new Error(
      'placeDomainsAlongPath: the supplied path does not match the canonical mechanical model '
      + `at SL ${sl} nm (region '${worstRegion}' is off by ${worst.toFixed(3)} nm, `
      + `tolerance ${PATH_FIDELITY_TOL_NM} nm). A path may not be rescaled or `
      + 'redistributed before placement — that would present uniform scaling as '
      + 'mechanically derived geometry. Re-derive it with createTitinPath().',
    );
  }

  const placed = rep.domainInstancesAt(sl, { includeAband });
  let domains = placed.instances;
  if (regionId) {
    domains = domains.filter((d) => _regionOf(rep, d) === regionId);
  }

  return {
    sarcomere_length_nm: sl,
    domains: /** @type {DomainPlacement[]} */ (domains),
    fidelity: {
      checked,
      points_checked: path.points.length,
      exact_region_coverage: true,
      canonical_order: true,
      worst_deviation_nm: worst,
    },
  };
}

// ---------------------------------------------------------------------------
// interpolation disclosure
// ---------------------------------------------------------------------------

/**
 * Describe a sarcomere length relative to the spec's defined structural states.
 *
 * The plan permits smooth interpolation between scientifically defined states but
 * forbids presenting it as directly measured molecular motion. This function is
 * where that distinction is computed, deliberately kept here in the headless
 * module rather than inside the Three.js class, so the honesty of the disclosure
 * is testable without a WebGL context.
 *
 * `interpolated` is false ONLY when the length is exactly a defined keyframe.
 *
 * @param {TitinModel} model
 * @param {number} sl
 * @returns {{sarcomere_length_nm:number, structural_state:string|null,
 *            interpolated:boolean, interpolation_caveat:string|null,
 *            between:[string,string]|null}}
 */
export function describeLength(model, sl) {
  if (!Number.isFinite(sl)) {
    // Every neighbouring entry point takes an OPTIONS OBJECT ({sarcomereLengthNm}
    // or {state}); this one takes a bare number, because it answers a question
    // about a length rather than building geometry at one. That asymmetry is a real
    // trap, so the diagnostic names the fix instead of printing '[object Object]'.
    const hint = (sl && typeof sl === 'object')
      ? ' — this function takes a bare number, not an options object. '
        + (Object.hasOwn(sl, 'state')
          ? `For a named state use: describeLength(model, resolveLength(model, ${JSON.stringify(sl)}))`
          : 'Try describeLength(model, opts.sarcomereLengthNm), or resolveLength(model, opts) first.')
      : '';
    throw new Error(`describeLength: expected a finite length in nm, got ${sl}${hint}`);
  }
  const presets = model.presets();
  const exact = presets.find((p) => p.sarcomere_length_nm === sl) || null;
  if (exact) {
    return {
      sarcomere_length_nm: sl,
      structural_state: exact.name,
      interpolated: false,
      interpolation_caveat: null,
      between: null,
    };
  }
  const sorted = [...presets].sort((a, b) => a.sarcomere_length_nm - b.sarcomere_length_nm);
  const lo = [...sorted].reverse().find((p) => p.sarcomere_length_nm <= sl) || null;
  const hi = sorted.find((p) => p.sarcomere_length_nm >= sl) || null;
  // lo/hi are null when sl falls outside the keyframe range entirely. Both the
  // pair and the prose are built inside one guard so the two can never disagree.
  /** @type {[string,string]|null} */
  let between = null;
  let where = 'outside the range of the defined structural states';
  if (lo && hi) {
    between = [lo.name, hi.name];
    where = `between the defined states '${lo.name}' (${lo.sarcomere_length_nm} nm) `
      + `and '${hi.name}' (${hi.sarcomere_length_nm} nm)`;
  }
  return {
    sarcomere_length_nm: sl,
    structural_state: null,
    interpolated: true,
    interpolation_caveat:
      `Sarcomere length ${sl} nm is ${where}. Filament landmarks are interpolated `
      + 'between scientifically defined states and titin extension is mechanically '
      + 're-derived at a common force. This is not directly measured molecular '
      + 'motion, and no intermediate conformation is claimed.',
    between,
  };
}

// ---------------------------------------------------------------------------
// region attribution
// ---------------------------------------------------------------------------

/**
 * Region-id lists, longest-first, cached per representation.
 *
 * A WeakMap rather than a property on the representation: the sort is pure derived
 * data, and writing a private field onto another layer's object would make this
 * facade a mutator of the thing it wraps.
 *
 * @type {WeakMap<TitinRepresentation, string[]>}
 */
const _regionIdCache = new WeakMap();

/**
 * Which region a placed domain belongs to.
 *
 * Instance records do not carry `region_id` (they carry `domain_id` like
 * "prox_Ig.7"), so attribution is by domain_id prefix, matched against the
 * spec's own region list longest-first rather than by splitting on '.' — a naive
 * split would mis-attribute ids that contain a dot for other reasons, and a
 * shortest-first match could let one region id shadow another.
 *
 * @param {TitinRepresentation} rep
 * @param {{domain_id?:string}} inst
 * @returns {string|null}
 */
function _regionOf(rep, inst) {
  if (!inst || typeof inst.domain_id !== 'string') return null;
  const cached = _regionIdCache.get(rep);
  /** @type {string[]} */
  const ids = cached
    || rep.regions.map((r) => r.id).sort((a, b) => b.length - a.length);
  if (!cached) _regionIdCache.set(rep, ids);
  for (const id of ids) {
    if (inst.domain_id === id || inst.domain_id.startsWith(`${id}.`)) return id;
  }
  return null;
}

/** Exposed for tests and for the Three.js layer: region of a placed domain. */
export function regionOfDomain(model, inst) {
  return _regionOf(requireRepresentation(model), inst);
}
