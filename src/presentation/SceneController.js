/**
 * SC-24 semantic scene and shared-URL controller.
 *
 * This module is deliberately browser independent. It resolves declarative
 * presentation records into state, compares the complete meaningful scene
 * state, and owns the v1 -> v2 URL migration. It never mutates a Viewer.
 */

export const URL_SCHEMA_VERSION = 2;

export const DEPTHS = Object.freeze({ learn: 'learn', explore: 'explore' });

export const DRAWERS = Object.freeze([
  'closed', 'inspect', 'measure', 'evidence', 'sources',
]);

export const CONTROL_SCENE_IDS = Object.freeze([
  'overview', 'titin_alone', 'spring', 'architecture', 'z_anchor',
  'a_band_scaffold', 'lattice',
]);

export const SCENE_LAYER_KEYS = Object.freeze([
  'extended_lattice',
  'lattice_rings_1',
  'lattice_rings_2',
  'lattice_rings_3',
  'mirror',
  'show_context_detail',
  'show_domains',
  'show_lattice',
]);

const CONTROL_SCENE_FIELDS = new Set([
  'label', 'camera_preset', 'scale', 'context', 'layers', 'selection',
  'length_policy', 'claim_ids',
]);

const V2_KEYS = new Set([
  'v', 'depth', 'step', 'sl', 'drawer', 'scene', 'camera', 'scale',
  'target', 'context', 'layers', 'confidence',
]);

const V1_KEYS = new Set([
  'mode', 'step', 'sl', 'scale', 'camera', 'target', 'evidence',
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === expected.size && actual.every((key) => expected.has(key));
}

function normalizeSelection(value) {
  if (value === null || value === undefined || value === '' || value === 'none') return null;
  if (typeof value === 'string') return { kind: null, id: value };
  if (typeof value === 'object' && !Array.isArray(value)
      && ['component', 'region'].includes(value.kind) && typeof value.id === 'string') {
    return { kind: value.kind, id: value.id };
  }
  return undefined;
}

function normalizedSceneState(state) {
  const cameraPreset = state?.cameraPreset ?? state?.camera_preset;
  const sceneId = state?.sceneId ?? state?.scene_id ?? null;
  const selection = normalizeSelection(
    state?.selection ?? state?.selected_component_or_region ?? null,
  );
  return {
    sceneId,
    cameraPreset,
    scale: state?.scale,
    context: state?.context,
    layers: state?.layers,
    selection,
    lengthPolicy: state?.lengthPolicy ?? state?.length_policy,
  };
}

function normalizedSceneRecord(scene) {
  if (!scene) return null;
  return {
    sceneId: scene.sceneId ?? scene.scene_id ?? null,
    cameraPreset: scene.cameraPreset ?? scene.camera_preset,
    scale: scene.scale,
    context: scene.context,
    layers: scene.layers,
    selection: normalizeSelection(scene.selection),
    lengthPolicy: scene.lengthPolicy ?? scene.length_policy,
  };
}

function selectionsEqual(left, right) {
  if (left === null || right === null) return left === right;
  if (!left || !right) return false;
  if (left.id !== right.id) return false;
  return left.kind === null || right.kind === null || left.kind === right.kind;
}

/**
 * True only when every field that gives a semantic scene meaning still matches.
 * Sarcomere length is intentionally excluded: every SC-24 scene preserves it.
 */
export function sceneMatch(scene, currentState) {
  const expected = normalizedSceneRecord(scene);
  const actual = normalizedSceneState(currentState);
  if (!expected || !actual) return false;
  if (expected.cameraPreset !== actual.cameraPreset
      || expected.scale !== actual.scale
      || expected.context !== actual.context
      || !selectionsEqual(expected.selection, actual.selection)) return false;
  if (!expected.layers || !actual.layers) return false;
  const layerKeys = new Set([...Object.keys(expected.layers), ...Object.keys(actual.layers)]);
  if ([...layerKeys].some((key) => Boolean(expected.layers[key]) !== Boolean(actual.layers[key]))) {
    return false;
  }
  const expectedPolicy = expected.lengthPolicy?.kind ?? expected.lengthPolicy;
  const actualPolicy = actual.lengthPolicy?.kind ?? actual.lengthPolicy;
  return actualPolicy === undefined || actualPolicy === expectedPolicy;
}

/**
 * Resolve one record without mutating the supplied state or any renderer.
 *
 * @param {string} sceneId
 * @param {Record<string, any>} currentState
 * @param {Record<string, any>} catalog data/scenes.json or its control_scenes map
 */
export function resolveScene(sceneId, currentState = {}, catalog = {}) {
  const records = catalog.control_scenes || catalog.scenes || catalog;
  const scene = records?.[sceneId];
  if (!scene) return null;
  return {
    ...clone(currentState),
    sceneId,
    cameraPreset: scene.camera_preset,
    scale: scene.scale,
    context: scene.context,
    layers: clone(scene.layers),
    selection: clone(scene.selection),
    lengthPolicy: clone(scene.length_policy),
  };
}

function legacyLayers(visibility = {}) {
  const rings = Number(visibility.rings) || 1;
  return {
    show_lattice: visibility.show_lattice ?? true,
    show_domains: visibility.show_domains ?? false,
    show_context_detail: visibility.show_context_detail ?? false,
    mirror: visibility.mirror ?? true,
    extended_lattice: false,
    lattice_rings_1: rings === 1,
    lattice_rings_2: rings === 2,
    lattice_rings_3: rings === 3,
  };
}

/** Pure semantic scene controller and deterministic URL v2 codec. */
export class SceneController {
  /**
   * @param {any} sceneCatalog data/scenes.json
   * @param {any} capabilities renderer/presentation vocabulary
   * @param {any} options presentation defaults and legacy chapter records
   */
  constructor(sceneCatalog, capabilities = {}, options = {}) {
    if (!sceneCatalog || typeof sceneCatalog !== 'object') {
      throw new Error('SceneController: a scene catalog is required.');
    }
    this.catalog = sceneCatalog;
    this.records = sceneCatalog.control_scenes || {};
    this.order = [...(sceneCatalog.control_scene_order || Object.keys(this.records))];
    this.capabilities = {
      views: new Set(capabilities.views || []),
      closeups: new Set(capabilities.closeups || []),
      scales: new Set(capabilities.scales || ['context', 'detail']),
      targets: new Set(capabilities.targets || []),
      componentTargets: new Set(capabilities.componentTargets || []),
      regionTargets: new Set(capabilities.regionTargets || []),
      claimIds: new Set(capabilities.claimIds || []),
      minLength: capabilities.minLength,
      maxLength: capabilities.maxLength,
    };
    // Existing callers supply one combined target vocabulary. Resolve kind from
    // the explicit sets when available, then from the legacy chapter/control data.
    if (!this.capabilities.componentTargets.size && !this.capabilities.regionTargets.size) {
      for (const scene of Object.values(this.records)) {
        if (scene?.selection?.kind === 'component') {
          this.capabilities.componentTargets.add(scene.selection.id);
        } else if (scene?.selection?.kind === 'region') {
          this.capabilities.regionTargets.add(scene.selection.id);
        }
      }
    }
    this.presentation = options.presentation || null;
    this.chapterMap = new Map((this.presentation?.guided_chapters || [])
      .map((chapter) => [chapter.id, chapter]));
    this.aliases = new Map(Object.entries(this.presentation?.chapter_aliases?.aliases || {}));
    this.defaultSceneId = options.defaultSceneId || this.order[0] || null;
    this.defaultLength = options.defaultLength
      ?? this.presentation?.initial_state?.sarcomere_length_nm
      ?? this.capabilities.minLength;
    this._validate();
  }

  _cameraKnown(camera) {
    const [kind, name, extra] = String(camera || '').split('.');
    if (!name || extra) return false;
    if (kind === 'view') return this.capabilities.views.has(name);
    if (kind === 'closeup') return this.capabilities.closeups.has(name);
    if (kind === 'region') return this.capabilities.targets.has(name)
      || this.capabilities.regionTargets.has(name);
    return false;
  }

  _selectionKind(id) {
    if (id === null) return null;
    if (this.capabilities.regionTargets.has(id)) return 'region';
    if (this.capabilities.componentTargets.has(id)) return 'component';
    for (const scene of Object.values(this.records)) {
      if (scene?.selection?.id === id) return scene.selection.kind;
    }
    // The combined vocabulary proves availability but not kind. Region cameras
    // are the remaining deterministic signal; everything else is a component.
    return this.capabilities.targets.has(id) ? 'component' : null;
  }

  _targetKnown(id) {
    return id === null || this.capabilities.targets.has(id)
      || this.capabilities.componentTargets.has(id)
      || this.capabilities.regionTargets.has(id);
  }

  _validate() {
    const problems = [];
    if (!this.order.length || new Set(this.order).size !== this.order.length
        || this.order.some((id) => !Object.hasOwn(this.records, id))
        || Object.keys(this.records).some((id) => !this.order.includes(id))) {
      problems.push('control_scene_order must contain every control scene exactly once');
    }
    if (CONTROL_SCENE_IDS.some((id) => !Object.hasOwn(this.records, id))) {
      problems.push(`required control scenes are ${CONTROL_SCENE_IDS.join(', ')}`);
    }
    if (this.order.length !== CONTROL_SCENE_IDS.length
        || this.order.some((id, index) => id !== CONTROL_SCENE_IDS[index])) {
      problems.push(`control scenes must be exactly ${CONTROL_SCENE_IDS.join(', ')}`);
    }
    const expectedLayers = new Set(SCENE_LAYER_KEYS);
    for (const [id, scene] of Object.entries(this.records)) {
      if (!exactKeys(scene, CONTROL_SCENE_FIELDS)) {
        problems.push(`scene '${id}' has an incomplete or unexpected record shape`);
        continue;
      }
      if (typeof scene.label !== 'string' || !scene.label.trim()) {
        problems.push(`scene '${id}' needs a human label`);
      }
      if (!this._cameraKnown(scene.camera_preset)) {
        problems.push(`scene '${id}' uses unavailable camera '${scene.camera_preset}'`);
      }
      if (!this.capabilities.scales.has(scene.scale)) {
        problems.push(`scene '${id}' uses unavailable scale '${scene.scale}'`);
      }
      if (typeof scene.context !== 'boolean' || !exactKeys(scene.layers, expectedLayers)
          || Object.values(scene.layers || {}).some((value) => typeof value !== 'boolean')) {
        problems.push(`scene '${id}' has invalid context/layers`);
      }
      if (scene.context !== (scene.scale === 'context')) {
        problems.push(`scene '${id}' context must agree with its scale`);
      }
      const ringCount = [1, 2, 3].filter((ring) => scene.layers?.[`lattice_rings_${ring}`]).length;
      if (ringCount !== 1) problems.push(`scene '${id}' must select exactly one lattice ring count`);
      // A record is the REVIEWED DEFAULT for its scene, so a close-up scene
      // still opens with its filaments and local detail. The user may then turn
      // the detail layer off through its primary control; that is Custom state,
      // not an invalid record.
      if (String(scene.camera_preset).startsWith('closeup.')
          && (!scene.layers?.show_lattice || !scene.layers?.show_context_detail)) {
        problems.push(`scene '${id}' close-up must enable lattice and context detail`);
      }
      if (scene.camera_preset === 'closeup.mline' && !scene.layers?.mirror) {
        problems.push(`scene '${id}' M-line close-up must enable the full sarcomere`);
      }
      const selection = normalizeSelection(scene.selection);
      if (selection === undefined || (selection && !this._targetKnown(selection.id))) {
        problems.push(`scene '${id}' selects unavailable biology`);
      }
      if (scene.length_policy?.kind !== 'preserve') {
        problems.push(`scene '${id}' must preserve sarcomere length`);
      }
      if (!Array.isArray(scene.claim_ids) || !scene.claim_ids.length
          || new Set(scene.claim_ids).size !== scene.claim_ids.length
          || scene.claim_ids.some((claim) => typeof claim !== 'string')
          || (this.capabilities.claimIds.size
            && scene.claim_ids.some((claim) => !this.capabilities.claimIds.has(claim)))) {
        problems.push(`scene '${id}' needs canonical claim IDs`);
      }
    }
    if (!Object.hasOwn(this.records, this.defaultSceneId)) {
      problems.push(`default scene '${this.defaultSceneId}' is unavailable`);
    }
    if (problems.length) throw new Error(`SceneController: ${problems.join('; ')}`);
  }

  scene(id) { return this.records[id] || null; }

  resolveScene(id, currentState = {}) {
    const resolved = resolveScene(id, currentState, this.catalog);
    if (!resolved) return null;
    return this._fromPublicSceneState(resolved, currentState);
  }

  _fromPublicSceneState(resolved, currentState = {}) {
    return {
      ...clone(currentState),
      scene_id: resolved.sceneId,
      camera_preset: resolved.cameraPreset,
      scale: resolved.scale,
      context: resolved.context,
      layers: clone(resolved.layers),
      selection: clone(resolved.selection),
      length_policy: clone(resolved.lengthPolicy),
    };
  }

  matchingSceneId(state) {
    // Confidence display is a top-level shared field, not part of the Custom
    // bundle, so a scene and an Explore reading preference can both be true at
    // once. Erasing scene truth for it would report Custom for a state that is
    // exactly the named scene.
    return this.order.find((id) => sceneMatch(this.records[id], state)) || null;
  }

  /**
   * Recover the semantic context that owns contextual controls after a Custom
   * mutation or URL restore. The controls themselves (ring count and myosin/
   * actin detail) are intentionally ignored; all other scene meaning must still
   * agree, so an unrelated Custom camera never inherits misleading controls.
   */
  contextSceneId(state) {
    if (state?.scene_id && this.records[state.scene_id]) return state.scene_id;
    const ignoredLayers = new Set([
      'show_context_detail', 'lattice_rings_1', 'lattice_rings_2', 'lattice_rings_3',
    ]);
    return this.order.find((id) => {
      const scene = this.records[id];
      if (!['lattice', 'architecture', 'a_band_scaffold'].includes(id)) return false;
      if (scene.camera_preset !== state?.camera_preset || scene.scale !== state?.scale
          || scene.context !== state?.context
          || normalizeSelection(scene.selection)?.id !== normalizeSelection(state?.selection)?.id) {
        return false;
      }
      return SCENE_LAYER_KEYS.every((key) => ignoredLayers.has(key)
        || Boolean(scene.layers[key]) === Boolean(state?.layers?.[key]));
    }) || null;
  }

  reconcile(state, { infer = true } = {}) {
    const copy = clone(state);
    const named = copy.scene_id && this.records[copy.scene_id];
    if (named && sceneMatch(named, copy)) return copy;
    copy.scene_id = infer ? this.matchingSceneId(copy) : null;
    return copy;
  }

  update(state, patch, { infer = true } = {}) {
    const next = { ...clone(state), ...clone(patch) };
    return this.reconcile(next, { infer });
  }

  defaultState(overrides = {}) {
    const base = {
      version: URL_SCHEMA_VERSION,
      depth: DEPTHS.learn,
      story_step: this.presentation?.initial_state?.story_step
        || this.presentation?.guided_chapters?.[0]?.id || null,
      sarcomere_length_nm: this.defaultLength,
      drawer: 'closed',
      confidence_display: false,
    };
    return this.resolveScene(this.defaultSceneId, { ...base, ...clone(overrides) });
  }

  _validLength(value) {
    return Number.isInteger(value)
      && (!Number.isFinite(this.capabilities.minLength) || value >= this.capabilities.minLength)
      && (!Number.isFinite(this.capabilities.maxLength) || value <= this.capabilities.maxLength);
  }

  _canonicalChapter(value) {
    const canonical = this.aliases.get(value) || value;
    return !this.chapterMap.size || this.chapterMap.has(canonical) ? canonical : null;
  }

  _parseLayers(value, issues) {
    const requested = String(value || '').split(',').filter(Boolean);
    const unknown = requested.filter((key) => !SCENE_LAYER_KEYS.includes(key));
    if (unknown.length) issues.push(`Unknown layer keys '${unknown.join(', ')}' were ignored.`);
    const admitted = new Set(requested.filter((key) => SCENE_LAYER_KEYS.includes(key)));
    const result = Object.fromEntries(SCENE_LAYER_KEYS.map((key) => [key, admitted.has(key)]));
    const rings = [1, 2, 3].filter((ring) => result[`lattice_rings_${ring}`]);
    if (rings.length !== 1) {
      issues.push('Custom state must select exactly one lattice ring count; using one ring.');
      for (const ring of [1, 2, 3]) result[`lattice_rings_${ring}`] = ring === 1;
    }
    return result;
  }

  _parseSelection(value, fallback, issues) {
    if (value === null || value === '' || value === 'none') return null;
    if (!this._targetKnown(value)) {
      issues.push(`Unknown target '${value}' used '${fallback?.id || 'none'}'.`);
      return clone(fallback);
    }
    return { kind: this._selectionKind(value), id: value };
  }

  /**
   * Normalize state that the renderer cannot represent independently. The URL
   * must describe what is actually drawn: context follows scale, every close-up
   * needs the filaments it is framed against, and an M-line view needs both
   * halves. The myosin-head/actin-twist detail layer is deliberately NOT forced
   * here: SC-24 gives it a primary control on the three close-up scenes, so
   * turning it off is a state a shared link has to be able to carry.
   * Legacy migration calls this without an issue sink because those implications
   * already existed in the v1 UI. V2 calls it with one so malformed links are
   * repaired visibly rather than silently discarded.
   */
  _normalizeDisplayInvariants(
    state,
    issues = /** @type {string[] | null} */ (null),
  ) {
    const note = (message) => { if (issues) issues.push(message); };
    if (String(state.camera_preset || '').startsWith('closeup.') && state.scale !== 'context') {
      note(`Close-up camera '${state.camera_preset}' requires sarcomere context; using context scale.`);
      state.scale = 'context';
    }
    const expectedContext = state.scale === 'context';
    if (state.context !== expectedContext) {
      note(`Context must agree with scale '${state.scale}'; using '${Number(expectedContext)}'.`);
      state.context = expectedContext;
    }
    if (String(state.camera_preset || '').startsWith('closeup.')
        && !state.layers?.show_lattice) {
      note(`Close-up camera '${state.camera_preset}' requires 'show_lattice'; enabling it.`);
      state.layers.show_lattice = true;
    }
    if (state.camera_preset === 'closeup.mline' && !state.layers?.mirror) {
      note('The M-line close-up requires the full sarcomere; enabling mirror.');
      state.layers.mirror = true;
    }
    return state;
  }

  _parseV2(params) {
    const issues = [];
    let state = this.defaultState();
    const seen = new Set();
    for (const [key] of params) {
      if (!V2_KEYS.has(key)) issues.push(`Unknown URL field '${key}' was ignored.`);
      if (seen.has(key)) issues.push(`Duplicate URL field '${key}' used its first value.`);
      seen.add(key);
    }
    const first = (key) => params.getAll(key)[0];
    const depth = first('depth');
    if (Object.hasOwn(DEPTHS, depth)) state.depth = depth;
    else issues.push(`Invalid depth '${depth}'; using '${state.depth}'.`);
    const step = this._canonicalChapter(first('step'));
    if (step) state.story_step = step;
    else issues.push(`Invalid step '${first('step')}'; using '${state.story_step}'.`);
    const length = Number(first('sl'));
    if (this._validLength(length)) state.sarcomere_length_nm = length;
    else issues.push(`Invalid sarcomere length '${first('sl')}'; using '${state.sarcomere_length_nm}'.`);
    const drawer = first('drawer');
    if (DRAWERS.includes(drawer)) state.drawer = drawer;
    else issues.push(`Invalid drawer '${drawer}'; using '${state.drawer}'.`);
    if (state.depth === DEPTHS.learn && state.drawer !== 'closed') {
      issues.push(`Learn depth cannot open the '${state.drawer}' drawer; using Explore.`);
      state.depth = DEPTHS.explore;
    }

    // Confidence display is orthogonal to WHICH biology is on stage, so it is
    // a top-level field beside depth and drawer rather than part of the Custom
    // camera/layer bundle. That is what lets Explore keep truthful scene state.
    const confidence = first('confidence');
    if (confidence === '0' || confidence === '1') state.confidence_display = confidence === '1';
    else issues.push(`Invalid confidence '${confidence}'; using '${Number(state.confidence_display)}'.`);

    const sceneId = first('scene');
    const customKeys = ['camera', 'scale', 'target', 'context', 'layers'];
    const hasCustom = customKeys.some((key) => params.has(key));
    if (sceneId && this.scene(sceneId)) state = this.resolveScene(sceneId, state);
    else if (sceneId) {
      issues.push(`Unknown scene '${sceneId}'; using Custom based on Overview.`);
      state.scene_id = null;
    }

    if (!sceneId && !hasCustom) {
      issues.push('URL v2 requires either a semantic scene or a complete custom state; using Overview.');
      return { state, issues, migrated: false };
    }
    if (hasCustom) {
      const camera = first('camera');
      if (this._cameraKnown(camera)) state.camera_preset = camera;
      else issues.push(`Invalid camera '${camera}'; using '${state.camera_preset}'.`);
      const scale = first('scale');
      if (this.capabilities.scales.has(scale)) state.scale = scale;
      else issues.push(`Invalid scale '${scale}'; using '${state.scale}'.`);
      state.selection = this._parseSelection(first('target'), state.selection, issues);
      const context = first('context');
      if (context === '0' || context === '1') state.context = context === '1';
      else issues.push(`Invalid context '${context}'; using '${Number(state.context)}'.`);
      state.layers = this._parseLayers(first('layers'), issues);
      this._normalizeDisplayInvariants(state, issues);
      const matched = this.matchingSceneId(state);
      if (sceneId && matched !== sceneId) {
        issues.push(`Scene '${sceneId}' conflicts with custom fields; showing Custom.`);
        state.scene_id = null;
      } else if (sceneId) {
        issues.push(`Scene '${sceneId}' redundantly included custom fields; canonical links use the scene only.`);
        state.scene_id = sceneId;
      } else state.scene_id = null;
      // A malformed partial custom representation must be visible rather than
      // being mistaken for a verified semantic scene.
      if (customKeys.some((key) => !params.has(key))) {
        issues.push('Custom URL state was incomplete; missing fields used the current fallback.');
        if (!sceneId) state.scene_id = null;
      }
    }
    return { state, issues, migrated: false };
  }

  _legacyChapterState(step, state) {
    const chapter = this.chapterMap.get(step);
    if (!chapter) return state;
    const recommended = chapter.recommended_state || {};
    const selectionId = recommended.selected_component_or_region ?? chapter.target?.id ?? null;
    return {
      ...state,
      camera_preset: recommended.camera_preset ?? state.camera_preset,
      scale: recommended.scale ?? state.scale,
      context: recommended.scale === 'context',
      layers: legacyLayers(recommended.visibility),
      selection: selectionId === null ? null : {
        kind: chapter.target?.kind || this._selectionKind(selectionId), id: selectionId,
      },
    };
  }

  _parseV1(params) {
    const issues = [];
    let state = this.defaultState();
    const seen = new Set();
    for (const [key] of params) {
      if (!V1_KEYS.has(key)) issues.push(`Unknown legacy URL field '${key}' was ignored.`);
      if (seen.has(key)) issues.push(`Duplicate legacy URL field '${key}' used its first value.`);
      seen.add(key);
    }
    const first = (key) => params.getAll(key)[0];
    const mode = first('mode');
    if (mode === 'guided' || mode === undefined) {
      state.depth = DEPTHS.learn;
      state.drawer = 'closed';
    } else if (mode === 'evidence') {
      state.depth = DEPTHS.explore;
      state.drawer = 'inspect';
    } else issues.push(`Legacy mode '${mode}' has no exact v2 equivalent; using Learn.`);
    if (params.has('step')) {
      const step = this._canonicalChapter(first('step'));
      if (step) {
        state.story_step = step;
        state = this._legacyChapterState(step, state);
      } else issues.push(`Legacy step '${first('step')}' has no exact v2 equivalent.`);
    }
    if (params.has('sl')) {
      const length = Number(first('sl'));
      if (this._validLength(length)) state.sarcomere_length_nm = length;
      else issues.push(`Legacy length '${first('sl')}' has no exact v2 equivalent.`);
    }
    if (params.has('scale')) {
      const scale = first('scale');
      if (this.capabilities.scales.has(scale)) {
        state.scale = scale;
        state.context = scale === 'context';
      } else issues.push(`Legacy scale '${scale}' has no exact v2 equivalent.`);
    }
    if (params.has('camera')) {
      const camera = first('camera');
      if (this._cameraKnown(camera)) state.camera_preset = camera;
      else issues.push(`Legacy camera '${camera}' has no exact v2 equivalent.`);
    }
    if (params.has('target')) {
      state.selection = this._parseSelection(first('target'), state.selection, issues);
    }
    if (params.has('evidence')) {
      const evidence = first('evidence');
      if (evidence === '0' || evidence === '1') state.confidence_display = evidence === '1';
      else issues.push(`Legacy evidence value '${evidence}' has no exact v2 equivalent.`);
    }
    this._normalizeDisplayInvariants(state);
    state.scene_id = this.matchingSceneId(state);
    return { state, issues, migrated: true };
  }

  parse(hash) {
    const raw = String(hash || '').replace(/^#/, '');
    if (!raw) return { state: this.defaultState(), issues: [], migrated: false };
    const params = new URLSearchParams(raw);
    return params.get('v') === String(URL_SCHEMA_VERSION)
      ? this._parseV2(params) : this._parseV1(params);
  }

  _assertSerializable(state) {
    const problems = [];
    if (!Object.hasOwn(DEPTHS, state.depth)) problems.push('invalid depth');
    if (!this._canonicalChapter(state.story_step)) problems.push('invalid story step');
    if (!this._validLength(state.sarcomere_length_nm)) problems.push('invalid length');
    if (!DRAWERS.includes(state.drawer)) problems.push('invalid drawer');
    if (state.depth === DEPTHS.learn && state.drawer !== 'closed') {
      problems.push('Learn depth requires a closed drawer');
    }
    if (!this._cameraKnown(state.camera_preset)) problems.push('invalid camera');
    if (!this.capabilities.scales.has(state.scale)) problems.push('invalid scale');
    if (typeof state.context !== 'boolean') problems.push('invalid context');
    if (state.context !== (state.scale === 'context')) {
      problems.push('context does not agree with scale');
    }
    if (!exactKeys(state.layers, new Set(SCENE_LAYER_KEYS))) problems.push('invalid layers');
    const ringCount = [1, 2, 3]
      .filter((ring) => state.layers?.[`lattice_rings_${ring}`]).length;
    if (ringCount !== 1) problems.push('layers must select exactly one lattice ring count');
    if (String(state.camera_preset || '').startsWith('closeup.')
        && !state.layers?.show_lattice) {
      problems.push('close-up camera requires the filament lattice');
    }
    if (state.camera_preset === 'closeup.mline' && !state.layers?.mirror) {
      problems.push('M-line close-up requires the full sarcomere');
    }
    const selection = normalizeSelection(state.selection);
    if (selection === undefined || (selection && !this._targetKnown(selection.id))) {
      problems.push('invalid target');
    }
    if (typeof state.confidence_display !== 'boolean') problems.push('invalid confidence state');
    if (state.scene_id && (!this.scene(state.scene_id)
        || !sceneMatch(this.scene(state.scene_id), state))) {
      problems.push(`scene '${state.scene_id}' does not match the complete state`);
    }
    if (problems.length) throw new Error(`SceneController: cannot serialize: ${problems.join('; ')}`);
  }

  serialize(inputState) {
    // `null` is an intentional Custom lock. In particular, a manual orbit can
    // leave all serializable fields equal to a named scene while the camera's
    // actual transform no longer is. Do not silently turn that Custom state
    // back into a semantic scene while sharing it.
    const state = inputState?.scene_id === null
      ? clone(inputState) : this.reconcile(inputState);
    this._assertSerializable(state);
    const params = new URLSearchParams();
    params.set('v', String(URL_SCHEMA_VERSION));
    params.set('depth', state.depth);
    params.set('step', state.story_step);
    params.set('sl', String(state.sarcomere_length_nm));
    params.set('drawer', state.drawer);
    if (state.scene_id) params.set('scene', state.scene_id);
    else {
      params.set('camera', state.camera_preset);
      params.set('scale', state.scale);
      params.set('target', state.selection?.id || 'none');
      params.set('context', state.context ? '1' : '0');
      params.set('layers', SCENE_LAYER_KEYS.filter((key) => state.layers[key]).join(','));
    }
    params.set('confidence', state.confidence_display ? '1' : '0');
    const hash = `#${params.toString()}`;
    const decoded = this.parse(hash);
    if (decoded.issues.length || decoded.migrated) {
      throw new Error(`SceneController: emitted an invalid v2 URL: ${decoded.issues.join(' ')}`);
    }
    return hash;
  }
}
