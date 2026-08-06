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

import { Viewer, VIEWS, CLOSEUPS } from '../render/Viewer.js';
import { COMPONENTS } from '../render/SarcomereScene.js';
import { TitinModel } from '../model/TitinModel.js';
import { browserReader } from '../model/readBrowser.js';
import { AUDIENCE_MODES } from '../presentation/StoryController.js';
import { createShowcaseOverlay } from '../presentation/ShowcaseOverlay.js';
import { createProvenancePipeline } from '../presentation/ProvenancePipeline.js';
import { createAnnotations } from './TitinAnnotations.js';
import { resolveSources } from '../presentation/AnnotationCatalog.js';
import { createBibliography } from '../presentation/Bibliography.js';
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
 * @property {string[]} hidden_components components not visible at this scale
 * @property {string|null} highlighted_titin_region active selection, if any
 * @property {object} region_highlight_applied selection counts in the built tree
 * @property {'guided'|'evidence'} audience_mode current explanation depth
 * @property {string|null} story_step validated guided-chapter ID
 * @property {string|null} selected_component_or_region public biological selection
 * @property {null} regulatory_state absent in Tier A; length never encodes activation
 * @property {string} camera_preset named, reproducible camera state
 * @property {boolean} evidence_display whether the raw inventory was requested
 */

/** The two scales the MVP presents. */
export const SCALES = Object.freeze({
  /** titin in situ: filaments, Z-disc, M-line, transverse lattice */
  context: 'context',
  /** titin alone: regions and domain architecture */
  detail: 'detail',
});

export { AUDIENCE_MODES };

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
    this._highlightedRegion = null;
    // SC-1 presentation state is descriptive state only. It may choose a camera
    // or explanation but never replaces the mechanical solver or adds activation.
    this._presentationState = {
      audience_mode: AUDIENCE_MODES.guided,
      story_step: null,
      selected_component_or_region: null,
      regulatory_state: null,
      camera_preset: 'view.titin_story',
      evidence_display: false,
    };
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
   * `showDomains`, `showContextDetail`, `showFilamentContext`, `latticeScope`,
   * `rings`. Hiding the filaments for the
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
        anchorDetail: null,
        // MyBP-C is thick-filament context; an "isolated titin" view that drew an
        // accessory filament protein would contradict its own label.
        showMyBPC: false,
        // One titin molecule spans one half-sarcomere (Z-disc to M-line).
        // Mirroring would show the counterpart from the adjacent half and make
        // the singular "isolated titin" label false.
        mirror: false,
      };
    }
    return {
      // SC-5: the reviewed attention budget keeps MyBP-C off by default, so the
      // default here is `false` and a caller must opt in explicitly.
      showLattice: true, rings, showDomains: true, showContextDetail: true,
      showMyBPC: false,
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
      'showFilamentContext', 'latticeScope', 'titinStrands', 'neighbourTitin',
      'domainStrands', 'presentationMode', 'anchorDetail', 'showMyBPC',
    ]);
    const unknown = Object.keys(options).filter((key) => !allowed.has(key));
    if (unknown.length) {
      throw new Error(
        `setDisplayOptions: unknown option(s) ${unknown.join(', ')}. Known: `
        + [...allowed].join(', '),
      );
    }
    for (const key of ['showLattice', 'showDomains', 'showContextDetail', 'mirror',
      'showFilamentContext', 'titinStrands', 'neighbourTitin', 'showMyBPC']) {
      if (Object.hasOwn(options, key) && typeof options[key] !== 'boolean') {
        throw new Error(`setDisplayOptions: ${key} must be boolean.`);
      }
    }
    if (Object.hasOwn(options, 'rings')
        && (!Number.isInteger(options.rings) || options.rings < 1)) {
      throw new Error('setDisplayOptions: rings must be a positive integer.');
    }
    if (Object.hasOwn(options, 'presentationMode')
        && !Object.hasOwn(AUDIENCE_MODES, options.presentationMode)) {
      throw new Error("setDisplayOptions: presentationMode must be 'guided' or 'evidence'.");
    }
    if (Object.hasOwn(options, 'latticeScope')
        && !['local', 'patch'].includes(options.latticeScope)) {
      throw new Error("setDisplayOptions: latticeScope must be 'local' or 'patch'.");
    }
    if (Object.hasOwn(options, 'anchorDetail')
        && options.anchorDetail !== null
        && !['zdisc', 'mline'].includes(options.anchorDetail)) {
      throw new Error("setDisplayOptions: anchorDetail must be null, 'zdisc', or 'mline'.");
    }
    this._displayOptions = { ...this._displayOptions, ...options };
    this.viewer.buildOpts = this._optsForScale(this.scale);
    return { ...this.viewer.buildOpts };
  }

  /** Components hidden in the isolated-titin detail view. */
  static get DETAIL_HIDDEN() {
    return Object.freeze([
      'thick_filament', 'thin_filament', 'thin_filament_twist',
      'myosin_heads', 'zdisc', 'mline', 'alpha_actinin', 'telethonin',
      'mband_crosslinks', 'mybpc',
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
    if (this._displayOptions?.showFilamentContext === false) {
      for (const component of [
        'thick_filament', 'thin_filament', 'thin_filament_twist', 'myosin_heads',
        'alpha_actinin', 'telethonin', 'mband_crosslinks', 'mybpc',
      ]) hidden.add(component);
    }
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
    const applied = this._applyScaleVisibility();
    // Visibility is an interactive state, not an out-of-band render mutation.
    // Keep the public report synchronized so evidence/legend consumers cannot
    // continue describing pixels the user just hid.
    if (this._state) {
      this._state = {
        ...this._state,
        hidden_components: this.viewer.sarcomere.hiddenComponents(),
        visibility_applied: applied,
      };
    }
    return applied;
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
    const presentationEmphasisApplied = this.viewer.sarcomere
      .setPresentationEmphasis(this._presentationState?.audience_mode ?? AUDIENCE_MODES.guided);
    const regionHighlightApplied = this.viewer.sarcomere
      .setTitinRegionHighlight(this._highlightedRegion);
    // The interpolation disclosure lives in the headless module so it can be
    // tested without WebGL; this class must not compute a second version of it.
    const described = describeLength(this.model, sl);

    this._state = {
      ...described,
      ...this._presentationState,
      scale: this.scale,
      manifest,
      notes: this.viewer.lastNotes || [],
      annotations,
      hidden_components: this.viewer.sarcomere.hiddenComponents(),
      visibility_applied: visibilityApplied,
      presentation_emphasis_applied: presentationEmphasisApplied,
      highlighted_titin_region: this._highlightedRegion,
      region_highlight_applied: regionHighlightApplied,
      ...extra,
    };
    return this._state;
  }

  /** The last state applied, or null before the first setter call. */
  currentState() { return this._state; }

  /**
   * Update the public SC-1 biological/presentation state without exposing render
   * objects. Unknown values throw; the application may then show an explicit URL
   * fallback rather than silently changing the scientific state.
   */
  setPresentationState(update) {
    if (!update || typeof update !== 'object' || Array.isArray(update)) {
      throw new Error('setPresentationState: expected a state object.');
    }
    const allowed = new Set([
      'audience_mode', 'story_step', 'selected_component_or_region',
      'regulatory_state', 'camera_preset', 'evidence_display',
    ]);
    const unknown = Object.keys(update).filter((key) => !allowed.has(key));
    if (unknown.length) {
      throw new Error(`setPresentationState: unknown field(s) ${unknown.join(', ')}.`);
    }
    const next = { ...this._presentationState, ...update };
    if (!Object.hasOwn(AUDIENCE_MODES, next.audience_mode)) {
      throw new Error("setPresentationState: audience_mode must be 'guided' or 'evidence'.");
    }
    const chapters = this.model.spec.presentation?.guided_chapters || [];
    if (next.story_step !== null && !chapters.some((chapter) => chapter.id === next.story_step)) {
      throw new Error(`setPresentationState: unknown story_step '${next.story_step}'.`);
    }
    const targets = new Set([
      ...this.model.titinRegions().map((region) => region.id),
      ...Object.keys(COMPONENTS),
    ]);
    if (next.selected_component_or_region !== null
        && !targets.has(next.selected_component_or_region)) {
      throw new Error(
        `setPresentationState: unknown selected_component_or_region `
        + `'${next.selected_component_or_region}'.`,
      );
    }
    if (this.scale === SCALES.detail
        && TitinVisualization.DETAIL_HIDDEN.includes(next.selected_component_or_region)) {
      throw new Error(
        `setPresentationState: selected target '${next.selected_component_or_region}' `
        + 'is not visible at the isolated-titin detail scale.',
      );
    }
    if (next.regulatory_state !== null) {
      throw new Error(
        'setPresentationState: regulatory_state is not available in Tier A; '
        + 'sarcomere length does not encode activation.',
      );
    }
    if (typeof next.evidence_display !== 'boolean') {
      throw new Error('setPresentationState: evidence_display must be boolean.');
    }
    const [cameraKind, cameraName, cameraExtra] = String(next.camera_preset).split('.');
    const cameraKnown = !cameraExtra && (
      (cameraKind === 'view' && Object.hasOwn(VIEWS, cameraName))
      || (cameraKind === 'closeup' && Object.hasOwn(CLOSEUPS, cameraName))
      || (cameraKind === 'region'
        && this.model.titinRegions().some((region) => region.id === cameraName))
    );
    if (!cameraKnown) {
      throw new Error(`setPresentationState: unknown camera_preset '${next.camera_preset}'.`);
    }
    if (next.audience_mode === AUDIENCE_MODES.guided && next.evidence_display) {
      throw new Error('setPresentationState: Guided mode cannot expose the raw evidence inventory.');
    }
    this._presentationState = next;
    if (this._state && this.viewer?.sarcomere?._built) {
      const visibilityApplied = this._applyScaleVisibility();
      const presentationEmphasisApplied = this.viewer.sarcomere
        .setPresentationEmphasis(next.audience_mode);
      const regionHighlightApplied = this.viewer.sarcomere
        .setTitinRegionHighlight(this._highlightedRegion);
      this._state = {
        ...this._state,
        ...next,
        hidden_components: this.viewer.sarcomere.hiddenComponents(),
        visibility_applied: visibilityApplied,
        presentation_emphasis_applied: presentationEmphasisApplied,
        region_highlight_applied: regionHighlightApplied,
      };
    } else if (this._state) this._state = { ...this._state, ...next };
    return this.presentationState();
  }

  /** Public state snapshot with geometry and presentation kept in one vocabulary. */
  presentationState() {
    return {
      ...this._presentationState,
      sarcomere_length_nm: this._state?.sarcomere_length_nm ?? null,
      structural_state: this._state?.structural_state ?? null,
      scale: this.scale,
    };
  }

  /** Annotation records for the currently displayed scale and length. */
  annotations() {
    const sl = this._state?.sarcomere_length_nm;
    if (sl === undefined) {
      throw new Error('TitinVisualization: set a state before requesting annotations.');
    }
    return createAnnotations(this.model, sl, { scale: this.scale });
  }

  /** Pick visible geometry at a browser client coordinate. */
  pickObject(clientX, clientY) {
    const picked = this.viewer.pick(clientX, clientY);
    if (!picked) return null;
    return Object.freeze({
      ...picked,
      anchor_nm: Object.freeze({ ...picked.anchor_nm }),
      sarcomere_length_nm: this._state?.sarcomere_length_nm ?? null,
      scale: this.scale,
    });
  }

  /**
   * Resolve a stable pick/selection to the current canonical annotation. Rebuilds
   * may replace every mesh, so UI code retains biological IDs, never object refs.
   */
  resolveAnnotation(selection) {
    if (!selection || typeof selection !== 'object') return null;
    const annotations = this.annotations();
    const base = annotations.find((annotation) => (
      annotation.target_type === selection.target_type
      && annotation.target_id === selection.target_id
    ));
    if (!base) return null;
    const currentSL = this._state?.sarcomere_length_nm;
    const sameRenderedState = selection.sarcomere_length_nm === currentSL
      && selection.scale === this.scale;
    let anchor = sameRenderedState && selection.anchor_nm
      ? { ...selection.anchor_nm }
      : { ...base.anchor_nm };
    if (!sameRenderedState && selection.mirrored && this.scale === SCALES.context) {
      anchor = { x: currentSL - anchor.x, y: anchor.y, z: -anchor.z };
    }
    return Object.freeze({
      ...base,
      anchor_nm: Object.freeze(anchor),
      picked_instance: selection.domain_id ? Object.freeze({
        domain_id: selection.domain_id,
        archetype: selection.archetype || null,
        instance_id: selection.instance_id ?? null,
      }) : null,
    });
  }

  /** Resolve reference IDs to human-readable citations and browser links. */
  sources(sourceIds) {
    if (!Array.isArray(sourceIds)) throw new Error('sources: expected an array of source IDs.');
    return resolveSources(this.model.spec.references, sourceIds);
  }

  /**
   * The whole reference registry, ordered for display. `cited` marks the records
   * this build's annotations and chapters actually use, so a reader can tell the
   * working bibliography from the full corpus.
   */
  bibliography() {
    const citedIds = new Set();
    for (const component of this.model.spec.annotations?.components || []) {
      for (const id of component.source_ids || []) citedIds.add(id);
    }
    for (const chapter of this.model.spec.presentation?.guided_chapters || []) {
      for (const id of chapter.source_ids || []) citedIds.add(id);
    }
    return createBibliography(this.model.spec.references, { citedIds: [...citedIds] });
  }

  /** Names of the scientifically defined structural states. */
  structuralStates() {
    return this.model.presets().map((p) => ({
      name: p.name, sarcomere_length_nm: p.sarcomere_length_nm,
    }));
  }

  /** Titin-region metadata available to the Phase-10 region navigator. */
  titinRegions() { return this.model.titinRegions(); }

  /**
   * SC-6 two-panel orthographic lattice comparison at the displayed length.
   * Sites and d10 are the same lattice output the 3D scene draws, so the axial
   * and transverse readouts cannot describe different states.
   */
  latticeCrossSection(opts = {}) {
    const sl = this._state?.sarcomere_length_nm;
    if (sl === undefined) {
      throw new Error('TitinVisualization: set a state before requesting the lattice cross-section.');
    }
    return this.model.latticeCrossSectionAt(sl, opts);
  }

  /** SC-2 descriptors derived from the same mechanical output as the 3D scene. */
  showcaseOverlay() {
    const sl = this._state?.sarcomere_length_nm;
    if (sl === undefined) {
      throw new Error('TitinVisualization: set a state before requesting the showcase overlay.');
    }
    return createShowcaseOverlay(this.model, sl);
  }

  /**
   * SC-5 Evidence-mode expert cards, with their sources already resolved to
   * readable citations and links. Guided mode has no expert cards by contract.
   */
  expertCards() {
    const cards = this.model.spec.presentation?.expert_cards || [];
    return Object.freeze(cards.map((card) => Object.freeze({
      ...card,
      not_claimed: Object.freeze([...(card.not_claimed || [])]),
      findings: Object.freeze((card.findings || [])
        .map((found) => Object.freeze({ ...found }))),
      sources: Object.freeze(this.sources(card.source_ids || [])),
    })));
  }

  /** What the optional MyBP-C context layer claims, and what it deliberately omits. */
  mybpcProvenance() { return this.model.mybpcProvenance(); }

  /**
   * SC-7 build pipeline for the closing chapter. Every figure is counted from the
   * loaded records, so the diagram cannot drift from the data layer it describes.
   */
  provenancePipeline() { return createProvenancePipeline(this.model); }

  /** Project model-coordinate anchors for accessible screen-space labels. */
  projectPresentationAnchors(records) { return this.viewer.projectPoints(records); }

  /**
   * Width of the scene the stage currently shows, in nm, at the depth the camera
   * is looking at. Divide the canvas pixel width by it to get the stage's scale.
   *
   * This is the ONLY defensible source for a scale bar. Measuring instead how far
   * apart two model points land on screen sounds more direct and is wrong: it
   * reports the length of the interval's projection, which collapses as the
   * interval turns toward the camera. Down the filament axis that method labelled
   * a 96 px rule "50000000000000 µm"; even in the oblique view it overstated
   * distance by 42 %. The frustum width does not depend on the direction anything
   * in the scene happens to point.
   *
   * Returns null rather than a wrong number when the camera sits on its own orbit
   * target, which is the one state in which the stage has no measurable scale.
   *
   * @returns {number|null}
   */
  viewSpanNm() {
    const span = this.viewer.visibleWidthNm();
    return Number.isFinite(span) && span > 0 ? span : null;
  }

  /**
   * Axial position the camera is looking at, in nanometres.
   *
   * The companion to {@link viewSpanNm}: span says how much of the sarcomere is
   * in view, this says which part. Together they are what the SC-12 close-up
   * locator needs, and like the span it is a property of the CAMERA — the orbit
   * target — rather than of anything in the scene.
   *
   * @returns {number|null} null when the camera has no usable target
   */
  viewCentreNm() {
    const x = this.viewer?.controls?.target?.x;
    return Number.isFinite(x) ? Number(x) : null;
  }

  /**
   * Highlight one named titin region, or pass null to clear the selection.
   * Geometry and evidence opacity remain unchanged; only the selection colour
   * channel changes.
   */
  highlightTitinRegion(regionId) {
    if (!this._state) {
      throw new Error('highlightTitinRegion: set a state before highlighting a region.');
    }
    const known = this.model.titinRegions().map((region) => region.id);
    if (regionId !== null && !known.includes(regionId)) {
      throw new Error(
        `highlightTitinRegion: unknown region '${regionId}'. Known: ${known.join(', ')}`,
      );
    }
    this._highlightedRegion = regionId;
    const applied = this.viewer.sarcomere.setTitinRegionHighlight(regionId);
    this._state = {
      ...this._state,
      highlighted_titin_region: regionId,
      selected_component_or_region: regionId,
      region_highlight_applied: applied,
    };
    this._presentationState = {
      ...this._presentationState,
      selected_component_or_region: regionId,
    };
    return applied;
  }

  /**
   * Smoothly focus the canonical Level-0 span of one region.
   * Returns the camera measurement rather than exposing Three.js objects.
   */
  focusTitinRegion(regionId, opts = {}) {
    const sl = this._state?.sarcomere_length_nm;
    if (sl === undefined) {
      throw new Error('focusTitinRegion: set a state before focusing a region.');
    }
    const segment = this.model.backboneAt(sl).segments
      .find((candidate) => candidate.region_id === regionId);
    if (!segment) {
      const known = this.model.titinRegions().map((region) => region.id);
      throw new Error(`focusTitinRegion: unknown region '${regionId}'. Known: ${known.join(', ')}`);
    }
    const result = {
      region_id: regionId,
      ...this.viewer.focusSpan(segment.X_start, segment.X_end, opts),
    };
    this._presentationState = {
      ...this._presentationState,
      camera_preset: `region.${regionId}`,
    };
    if (this._state) this._state = { ...this._state, camera_preset: `region.${regionId}` };
    return result;
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
    const selectedTarget = this._presentationState.selected_component_or_region;
    if (scale === SCALES.detail
        && selectedTarget !== null
        && TitinVisualization.DETAIL_HIDDEN.includes(selectedTarget)) {
      this._presentationState = {
        ...this._presentationState,
        selected_component_or_region: null,
      };
    }
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
  frame(view = 'longitudinal', opts = {}) {
    this.viewer.frame(view, opts);
    this._presentationState = { ...this._presentationState, camera_preset: `view.${view}` };
    if (this._state) this._state = { ...this._state, camera_preset: `view.${view}` };
    return this;
  }

  /** Move to a named biological close-up without exposing the camera. */
  closeUp(name, opts = {}) {
    const sl = this._state?.sarcomere_length_nm;
    if (sl === undefined) {
      throw new Error('TitinVisualization: set a state before selecting a close-up.');
    }
    const result = this.viewer.closeUp(name, sl, opts);
    this._presentationState = { ...this._presentationState, camera_preset: `closeup.${name}` };
    if (this._state) this._state = { ...this._state, camera_preset: `closeup.${name}` };
    return result;
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
  /**
   * @param {((report: StateReport) => void)|null} [onStateChange]
   * @param {((info:{camera_moving:boolean})=>void)|null} [onFrame] receives whether
   *   the camera moved this frame, so screen-space overlay work can be skipped on a
   *   still frame instead of forcing a synchronous layout sixty times a second.
   */
  start(onStateChange = null, onFrame = null) {
    if (onStateChange !== null && typeof onStateChange !== 'function') {
      throw new Error('TitinVisualization.start: onStateChange must be a function or null.');
    }
    if (onFrame !== null && typeof onFrame !== 'function') {
      throw new Error('TitinVisualization.start: onFrame must be a function or null.');
    }
    this.viewer.start((sl) => {
      const report = this.setSarcomereLength(sl);
      if (onStateChange) onStateChange(report);
    }, onFrame);
    return this;
  }

  /** Stop rendering. */
  stop() { this.viewer.stop(); return this; }

  /** Refit the renderer after an audience drawer changes the stage dimensions. */
  resize() { this.viewer.resize(); return this; }

  /** Release GPU resources and detach from the DOM. */
  dispose() { this.viewer.dispose(); this._state = null; }
}
