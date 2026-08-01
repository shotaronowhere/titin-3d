/**
 * Phase 9 — the Three.js half of the biological API.
 *
 * `titinApi.js` is headless: it answers biological questions with numbers.
 * This class is the only place where those numbers meet Three.js, and it keeps
 * the plan's two Three.js-facing names — `setSarcomereLength` and
 * `setStructuralState` — in biological vocabulary. Callers of this class never
 * touch a Mesh, a Material, a BufferGeometry or a camera.
 *
 *   const vis = await TitinVisualization.create(container, { view: 'context' });
 *   vis.setStructuralState('stretched');   // named, scientifically defined
 *   vis.setSarcomereLength(2350);          // continuous, INTERPOLATED
 *   vis.start();
 *
 * Interpolation honesty. The plan permits smooth interpolation between defined
 * states but forbids presenting it as measured molecular motion. The two setters
 * are therefore not interchangeable: `setStructuralState` lands exactly on a
 * keyframe the spec defines, `setSarcomereLength` may land between keyframes, and
 * every return value carries {@link StateReport.interpolated} plus, when true, an
 * explicit caveat naming the two keyframes the value sits between. The UI is
 * expected to display that caveat; the field exists so it cannot be inferred
 * wrongly by omission.
 *
 * @module api/TitinVisualization
 */

import { Viewer, VIEWS } from '../render/Viewer.js';
import { COMPONENTS } from '../render/SarcomereScene.js';
import { TitinModel } from '../model/TitinModel.js';
import { browserReader } from '../model/readBrowser.js';
import { createAnnotations } from './TitinAnnotations.js';
import {
  createSarcomere, createTitin, createTitinPath, createDomainChain,
  placeDomainsAlongPath, regionOfDomain, describeLength, IBAND_REGIONS,
} from './titinApi.js';

/**
 * @typedef {object} StateReport
 * @property {number} sarcomere_length_nm
 * @property {string|null} structural_state name if this is exactly a keyframe
 * @property {boolean} interpolated true when the length falls between keyframes
 * @property {string|null} interpolation_caveat set iff interpolated
 * @property {object} manifest what the renderer actually drew
 * @property {string[]} notes verification notes from the scene check
 */

/** The two scales the MVP presents. */
export const SCALES = Object.freeze({
  /** titin in situ: filaments, Z-disc, M-line, transverse lattice */
  context: 'context',
  /** titin alone: regions and domain architecture */
  detail: 'detail',
});

export class TitinVisualization {
  /**
   * @param {HTMLElement} container
   * @param {TitinModel} model
   * @param {object} [opts]
   * @param {string} [opts.scale] 'context' | 'detail'
   * @param {number} [opts.rings] transverse lattice rings
   * @param {Record<string, any>} [opts.buildOpts] biological display options
   */
  constructor(container, model, opts = {}) {
    if (!container) throw new Error('TitinVisualization: a container element is required.');
    this.model = model;
    /** @type {'context'|'detail'} */
    this.scale = /** @type {'context'|'detail'} */ (opts.scale || SCALES.context);
    if (!Object.hasOwn(SCALES, this.scale)) {
      throw new Error(
        `TitinVisualization: unknown scale '${this.scale}'. Known: ${Object.keys(SCALES).join(', ')}`,
      );
    }
    this.viewer = new Viewer(container, model);
    this._displayOptions = { ...(opts.buildOpts || {}) };
    this.viewer.buildOpts = this._optsForScale(this.scale, opts);
    this._state = null;
  }

  /**
   * Build a visualization, loading the spec over HTTP. Async because the spec is
   * fetched; construction itself is synchronous.
   *
   * @param {HTMLElement} container
   * @param {object} [opts]
   * @param {(path:string)=>Promise<object>} [opts.reader] override the spec reader
   * @param {string} [opts.scale] 'context' | 'detail'
   * @param {number} [opts.rings] transverse lattice rings
   * @param {object} [opts.buildOpts] renderer options passed through
   * @returns {Promise<TitinVisualization>}
   */
  static async create(container, opts = {}) {
    const model = await TitinModel.create(opts.reader || browserReader());
    return new TitinVisualization(container, model, opts);
  }

  /**
   * Render options per scale.
   *
   * Only options the renderer actually reads appear here — `showLattice`,
   * `showDomains`, `showContextDetail`, `rings`. Hiding the filaments for the
   * detail view is NOT done with a build flag: it is done after the build with
   * {@link SarcomereScene#setComponentVisibility}, so the isolated titin keeps the
   * exact anchor positions it has in situ. Re-deriving titin from a scene with no
   * thick filament could move its A-band anchoring, and the detail view would then
   * be showing a different molecule than the context view.
   *
   * @param {string} scale
   * @param {object} opts
   */
  _optsForScale(scale, opts = {}) {
    const rings = opts.rings ?? 1;
    const requested = { ...this._displayOptions, ...(opts.buildOpts || {}) };
    if (scale === SCALES.detail) {
      // Lattice off: an "isolated titin" view that still drew the surrounding
      // filament lattice would contradict its own label.
      return {
        ...requested,
        showLattice: false,
        showDomains: true,
        showContextDetail: false,
      };
    }
    return {
      showLattice: true, rings, showDomains: true, showContextDetail: true,
      ...requested,
    };
  }

  /**
   * Configure biological layers without exposing Three.js build objects.
   * Call a state setter afterwards to rebuild with the new selection.
   *
   * @param {Record<string, any>} options
   */
  setDisplayOptions(options) {
    const allowed = new Set([
      'showLattice', 'rings', 'showDomains', 'showContextDetail', 'mirror',
      'titinStrands', 'neighbourTitin', 'domainStrands',
    ]);
    const unknown = Object.keys(options).filter((key) => !allowed.has(key));
    if (unknown.length) {
      throw new Error(
        `setDisplayOptions: unknown option(s) ${unknown.join(', ')}. Known: `
        + [...allowed].join(', '),
      );
    }
    for (const key of ['showLattice', 'showDomains', 'showContextDetail', 'mirror',
      'titinStrands', 'neighbourTitin']) {
      if (Object.hasOwn(options, key) && typeof options[key] !== 'boolean') {
        throw new Error(`setDisplayOptions: ${key} must be boolean.`);
      }
    }
    if (Object.hasOwn(options, 'rings')
        && (!Number.isInteger(options.rings) || options.rings < 1)) {
      throw new Error('setDisplayOptions: rings must be a positive integer.');
    }
    this._displayOptions = { ...this._displayOptions, ...options };
    this.viewer.buildOpts = this._optsForScale(this.scale);
    return { ...this.viewer.buildOpts };
  }

  /** Components hidden in the isolated-titin detail view. */
  static get DETAIL_HIDDEN() {
    return Object.freeze([
      'thick_filament', 'thin_filament', 'thin_filament_twist',
      'myosin_heads', 'zdisc', 'mline',
    ]);
  }

  /**
   * Apply the visibility that the current scale implies. Called after every
   * rebuild, because `build()` constructs a fresh tree with everything visible.
   */
  _applyScaleVisibility() {
    const all = Object.keys(COMPONENTS);
    const hidden = this.scale === SCALES.detail
      ? new Set(TitinVisualization.DETAIL_HIDDEN)
      : new Set();
    /** @type {Record<string, boolean>} */
    const vis = {};
    if (this._userVisibility) Object.assign(vis, this._userVisibility);
    for (const c of all) {
      if (!Object.hasOwn(vis, c)) vis[c] = true;
      if (hidden.has(c)) vis[c] = false;
    }
    return this.viewer.sarcomere.setComponentVisibility(vis);
  }

  /**
   * Show or hide biological components (Phase 10's visibility controls).
   *
   * The choice persists across rebuilds and across sarcomere-length changes, so a
   * user who hid the thick filament does not have it reappear when they move the
   * length slider.
   *
   * @param {Record<string, boolean>} visibility
   * @returns {Record<string, number>} objects toggled per component
   */
  setComponentVisibility(visibility) {
    const unknown = Object.keys(visibility).filter((k) => !Object.hasOwn(COMPONENTS, k));
    if (unknown.length) {
      throw new Error(
        `setComponentVisibility: unknown component(s) ${unknown.join(', ')}. `
        + `Known: ${Object.keys(COMPONENTS).join(', ')}`,
      );
    }
    this._userVisibility = { ...(this._userVisibility || {}), ...visibility };
    return this._applyScaleVisibility();
  }

  /** The components this visualization can show or hide. */
  static components() { return Object.keys(COMPONENTS); }

  // -------------------------------------------------------------------------
  // the two Three.js-facing names the plan specifies
  // -------------------------------------------------------------------------

  /**
   * `setSarcomereLength` — continuous sarcomere-length control.
   *
   * Lengths between defined states are computed intermediate geometries, and the
   * returned report says so. Filament landmarks interpolate the keyframes; each
   * titin region's share of the live I-band total is re-derived at a common force
   * from its own force-extension law, never scaled uniformly.
   *
   * @param {number} sl nanometres
   * @returns {StateReport}
   */
  setSarcomereLength(sl) {
    if (!Number.isFinite(sl)) {
      throw new Error(`setSarcomereLength: expected a finite length in nm, got ${sl}`);
    }
    // clampSL returns { sl, wasClamped } — not a bare number. Clamping is
    // reported rather than silently absorbed: a user who drags past the modelled
    // range must be told the view stopped following, not shown the limit state as
    // though it were the length they asked for.
    const { sl: clamped, wasClamped } = this.model.geometry.clampSL(sl);
    const manifest = this.viewer.setSarcomereLength(clamped);
    return this._report(clamped, manifest, {
      requested_nm: sl,
      clamped: wasClamped,
      clamp_note: wasClamped
        ? `Requested ${sl} nm is outside the modelled range; showing ${clamped} nm.`
        : null,
    });
  }

  /**
   * `setStructuralState` — jump to a named, scientifically defined state.
   *
   * These are the spec's keyframes, so the resulting geometry is never
   * interpolated. Unknown names throw rather than falling back to a default: a
   * silent fallback would show one state under another's label.
   *
   * @param {string} name e.g. 'contracted' | 'resting' | 'stretched'
   * @returns {StateReport}
   */
  setStructuralState(name) {
    const presets = this.model.presets();
    const kf = presets.find((p) => p.name === name);
    if (!kf) {
      throw new Error(
        `setStructuralState: unknown state '${name}'. Defined states: `
        + presets.map((p) => p.name).join(', '),
      );
    }
    const manifest = this.viewer.setSarcomereLength(kf.sarcomere_length_nm);
    return this._report(kf.sarcomere_length_nm, manifest, { requestedState: name });
  }

  /**
   * Build the state report, including the interpolation disclosure.
   *
   * @param {number} sl
   * @param {object} manifest
   * @param {object} [extra]
   * @returns {StateReport}
   */
  _report(sl, manifest, extra = {}) {
    // build() returns a fresh tree with everything visible, so the scale's
    // visibility and any user choice must be re-applied on EVERY rebuild —
    // otherwise moving the length slider in the detail view would make the
    // filaments reappear around the "isolated" molecule.
    const annotations = createAnnotations(this.model, sl, { scale: this.scale });
    this.viewer.sarcomere.setAnnotations(annotations);
    const visibilityApplied = this._applyScaleVisibility();
    // The interpolation disclosure lives in the headless module so it can be
    // tested without WebGL; this class must not compute a second version of it.
    const described = describeLength(this.model, sl);

    this._state = {
      ...described,
      scale: this.scale,
      manifest,
      notes: this.viewer.lastNotes || [],
      annotations,
      hidden_components: this.viewer.sarcomere.hiddenComponents(),
      visibility_applied: visibilityApplied,
      ...extra,
    };
    return this._state;
  }

  /** The last state applied, or null before the first setter call. */
  currentState() { return this._state; }

  /** Annotation records for the currently displayed scale and length. */
  annotations() {
    const sl = this._state?.sarcomere_length_nm;
    if (sl === undefined) {
      throw new Error('TitinVisualization: set a state before requesting annotations.');
    }
    return createAnnotations(this.model, sl, { scale: this.scale });
  }

  /** Names of the scientifically defined structural states. */
  structuralStates() {
    return this.model.presets().map((p) => ({
      name: p.name, sarcomere_length_nm: p.sarcomere_length_nm,
    }));
  }

  // -------------------------------------------------------------------------
  // scale switching (Phase 10 uses this; the boundary belongs here)
  // -------------------------------------------------------------------------

  /**
   * Switch between the sarcomere context view and the isolated titin detail view,
   * preserving the current sarcomere length so the two scales always agree.
   *
   * @param {string} scale 'context' | 'detail'
   * @param {object} [opts]
   * @returns {StateReport}
   */
  setScale(scale, opts = {}) {
    if (!Object.hasOwn(SCALES, scale)) {
      throw new Error(
        `setScale: unknown scale '${scale}'. Known: ${Object.keys(SCALES).join(', ')}`,
      );
    }
    this.scale = /** @type {'context'|'detail'} */ (scale);
    if (opts.buildOpts) this._displayOptions = { ...this._displayOptions, ...opts.buildOpts };
    this.viewer.buildOpts = this._optsForScale(scale, opts);
    const sl = this._state?.sarcomere_length_nm ?? this.model.presets()
      .find((p) => p.name === 'resting')?.sarcomere_length_nm;
    const manifest = this.viewer.setSarcomereLength(sl);
    return this._report(sl, manifest, { scale });
  }

  // -------------------------------------------------------------------------
  // biological queries — delegated, so callers need only this object
  // -------------------------------------------------------------------------

  /** @param {object} [opts] */
  sarcomere(opts = {}) { return createSarcomere(this.model, this._withSL(opts)); }

  /** @param {object} [opts] */
  titin(opts = {}) { return createTitin(this.model, this._withSL(opts)); }

  /** @param {object} [opts] */
  titinPath(opts = {}) { return createTitinPath(this.model, this._withSL(opts)); }

  /**
   * @param {string} regionId
   * @param {object} [opts]
   */
  domainChain(regionId, opts = {}) {
    return createDomainChain(this.model, regionId, this._withSL(opts));
  }

  /**
   * @param {object} path
   * @param {object} [opts]
   */
  placeDomains(path, opts = {}) { return placeDomainsAlongPath(this.model, path, opts); }

  /** @param {object} inst */
  regionOf(inst) { return regionOfDomain(this.model, inst); }

  /** The four I-band elastic regions, Z-disc -> A-band. */
  get iBandRegions() { return IBAND_REGIONS; }

  /**
   * Default the query length to whatever is currently displayed, so a query
   * cannot silently describe a different state than the one on screen.
   *
   * @param {object} opts
   */
  _withSL(opts = {}) {
    if (opts.sarcomereLengthNm !== undefined || opts.state !== undefined) return opts;
    const sl = this._state?.sarcomere_length_nm;
    if (sl === undefined) {
      throw new Error(
        'TitinVisualization: no state has been set yet, so there is no current '
        + 'sarcomere length to query. Call setStructuralState() or '
        + 'setSarcomereLength() first, or pass one explicitly.',
      );
    }
    return { ...opts, sarcomereLengthNm: sl };
  }

  // -------------------------------------------------------------------------
  // camera / lifecycle — biological names, no Three.js types exposed
  // -------------------------------------------------------------------------

  /**
   * Frame the structure from a named anatomical direction.
   * @param {string} view e.g. 'longitudinal' | 'transverse'
   */
  frame(view = 'longitudinal') { this.viewer.frame(view); return this; }

  /** Move to a named biological close-up without exposing the camera. */
  closeUp(name) {
    const sl = this._state?.sarcomere_length_nm;
    if (sl === undefined) {
      throw new Error('TitinVisualization: set a state before selecting a close-up.');
    }
    return this.viewer.closeUp(name, sl);
  }

  /** Named camera directions available to {@link frame}. */
  static views() { return Object.keys(VIEWS); }

  /**
   * Begin rendering.
   *
   * The zoom level-of-detail gate rebuilds the scene when crossing the aliasing
   * threshold, and a rebuild produces a fresh tree with every component visible.
   * The callback therefore goes through this class's own setter rather than the
   * viewer's, so component visibility and the state report stay correct after an
   * automatic rebuild. The manifest it returns is intentionally discarded: the
   * gate's contract is void.
   */
  start() {
    this.viewer.start((sl) => { this.setSarcomereLength(sl); });
    return this;
  }

  /** Stop rendering. */
  stop() { this.viewer.stop(); return this; }

  /** Release GPU resources and detach from the DOM. */
  dispose() { this.viewer.dispose(); this._state = null; }
}
