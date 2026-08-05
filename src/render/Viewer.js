/**
 * Viewer — camera, lighting, and interaction for the sarcomere context view.
 *
 * Split from SarcomereScene so that scene CONSTRUCTION (which must be
 * verifiable, and is tested headlessly in Node) stays independent of
 * PRESENTATION (which needs a canvas and a GPU). SarcomereScene can therefore be
 * asserted against the spec without a browser, which is what makes the Phase 7
 * test suite possible at all.
 *
 * Like SarcomereScene, this file contains no biology: every dimension it uses
 * for framing comes from the built scene's bounding box.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SarcomereScene } from './SarcomereScene.js';

/** @typedef {import('../model/TitinModel.js').TitinModel} TitinModel */

/** Camera presets, expressed as directions so they work at any sarcomere length. */
export const VIEWS = Object.freeze({
  longitudinal: { dir: [0.15, 0.35, 1], label: 'Longitudinal (default)' },
  titin_story: {
    dir: [0.12, 0.25, 1],
    label: 'Titin route — Z-disc to M-band',
    focus: 'titin_half',
  },
  side: { dir: [0, 0, 1], label: 'Side — the sarcomere banding pattern' },
  transverse: { dir: [1, 0, 0], label: 'Transverse — down the filament axis' },
  oblique: { dir: [0.7, 0.5, 0.7], label: 'Oblique — 3-D lattice organization' },
});

/** Default duration for deliberate camera moves in the Phase-10 interface. */
export const CAMERA_TRANSITION_MS = 650;

/**
 * Symmetric cubic easing with zero velocity at both ends.
 * Exported so the motion contract can be tested without constructing WebGL.
 */
export function easeCameraTransition(t) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2;
}

/**
 * Close-up presets: where to look, and how wide a span to fill the viewport with.
 *
 * Each entry names a landmark by a FUNCTION OF THE GEOMETRY rather than a fixed X,
 * because every landmark except the Z-disc moves with sarcomere length — the
 * I-band/A-band junction sits at X=150 nm when contracted and X=700 nm when
 * extended. Hardcoding a coordinate would silently point the camera at empty space
 * at other lengths.
 *
 * `spanNm` is chosen from the size of the feature the view exists to show, and it
 * is what makes a close-up scientifically honest: at a 120 nm span the crown
 * spacing (14.3 nm) covers ~143 px and the long-pitch crossover (~37 nm) ~370 px,
 * both far above the 2 px aliasing threshold, so what the user sees at that
 * distance is a resolved periodicity rather than a moire pattern.
 *
 * @type {Readonly<Record<string, {label: string, at: (g: any) => number[],
 *   spanNm: number, dir: number[], shows: string}>>}
 */
export const CLOSEUPS = Object.freeze({
  crowns: {
    label: 'Myosin heads (crown array)',
    // Inside the overlap zone, one crown repeat in from the junction, so the view
    // contains thick filament, heads, and the thin filaments they reach toward.
    at: (g) => [g.overlap_zone_nm.start_nm + (g.overlap_zone_nm.length ?? 0) * 0.35, 0, 0],
    spanNm: 120,
    dir: [0.1, 0.25, 1],
    shows: 'myosin head pairs on helically arranged crowns',
  },
  twist: {
    label: 'Thin-filament twist',
    // The I-band side of the junction: the thin filament is present and no thick
    // filament or crown array is in front of it to occlude the long-pitch twist.
    at: (g) => [Math.max(g.zdisc.width + 20, g.I_A_junction_X * 0.5), 0, 0],
    spanNm: 90,
    dir: [0, 0.15, 1],
    shows: 'thin-filament long-pitch helical twist (crossover repeat)',
  },
  junction: {
    label: 'I-band / A-band junction',
    at: (g) => [g.I_A_junction_X, 0, 0],
    spanNm: 260,
    dir: [0.15, 0.3, 1],
    shows: 'where titin\u2019s elastic I-band segment meets the A-band',
  },
  zdisc: {
    label: 'Z-disc anchorage',
    at: (g) => [g.zdisc.X + g.zdisc.width / 2, 0, 0],
    spanNm: 200,
    dir: [0.35, 0.3, 1],
    shows: 'titin\u2019s N-terminal anchor and thin-filament attachment',
  },
  mline: {
    label: 'M-band center within the head-free bare zone',
    at: (g) => [g.mline.X, 0, 0],
    spanNm: 220,
    dir: [0.2, 0.3, 1],
    shows: 'the head-free bare zone, midpoint reference, sparse M-band context, and opposing titin C-terminal anchors',
  },
  lattice: {
    label: 'Hexagonal lattice (down-axis)',
    at: (g) => [g.overlap_zone_nm.start_nm + (g.overlap_zone_nm.length ?? 0) * 0.5, 0, 0],
    spanNm: 140,
    dir: [1, 0.06, 0.06],
    shows: 'the thick/thin filament lattice in cross-section',
  },
});

export class Viewer {
  /**
   * @param {HTMLElement} container
   * @param {TitinModel} model
   */
  constructor(container, model) {
    this.container = container;
    this.model = model;
    this.sarcomere = new SarcomereScene();
    this.scene = this.sarcomere.scene;
    this.scene.background = new THREE.Color(0x0e1116);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Near/far track the CURRENT camera distance (see _updateFrustum), not the
    // whole-sarcomere extent. Deriving them once at framing time made the near
    // plane a hard floor on approach: at the default framing the near plane sits
    // ~2050 nm out, so dollying closer than that clipped the entire scene and the
    // structure simply vanished — the myosin crowns and the thin-filament twist
    // were unreachable however far the user scrolled.
    this.camera = new THREE.PerspectiveCamera(
      35, container.clientWidth / container.clientHeight, 1, 100000,
    );
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    // Explicit rather than relying on OrbitControls defaults: these are Phase 10
    // completion conditions and a dependency update must not silently disable one.
    this.controls.enableRotate = true;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    // A myosin head is ~19 nm and a crown spacing ~14.3 nm, so approach has to be
    // allowed to a few nm for a head to fill a useful fraction of the viewport.
    // The ceiling keeps the whole sarcomere reachable at any length.
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20000;
    this._motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
    this.prefersReducedMotion = Boolean(this._motionQuery?.matches);
    this._cameraTransition = null;
    this._onMotionPreferenceChange = (event) => {
      this.prefersReducedMotion = event.matches;
      // If reduced motion is enabled during a transition, finish it immediately
      // rather than leaving the camera stranded at an arbitrary intermediate pose.
      if (event.matches && this._cameraTransition) {
        const move = this._cameraTransition;
        this.camera.position.copy(move.to_position);
        this.controls.target.copy(move.to_target);
        this._cameraTransition = null;
        this._updateFrustum();
        this.controls.update();
      }
    };
    this._motionQuery?.addEventListener?.('change', this._onMotionPreferenceChange);
    this._onControlStart = () => { this._cameraTransition = null; };
    // Direct manipulation always wins over an automated move. Otherwise a user
    // beginning to orbit mid-transition would fight the interpolation every frame.
    this.controls.addEventListener('start', this._onControlStart);

    // Three lights, no shadows: shadows would imply an illumination geometry that
    // means nothing here, and they obscure the transparency that carries evidence.
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(1, 1, 1);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
    fill.position.set(-1, -0.5, -1);
    this.scene.add(fill);

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this._raf = null;
    this.currentSL = null;
    /**
     * Default renderer options. Typed as an open record because callers (and the
     * Phase 9 API) set the show* flags after construction.
     * @type {Record<string, any>}
     */
    this.buildOpts = {};
    this.raycaster = new THREE.Raycaster();
    // Lines (the zero-width M-band marker and continuity trace) need a small
    // world-space tolerance to be reachable without creating fake marker geometry.
    this.raycaster.params.Line.threshold = 3;
  }

  /** Rebuild the scene at a sarcomere length. Returns the render manifest. */
  /**
   * @param {number} sl
   * @param {Record<string, any>} [opts] renderer options; merged over buildOpts
   */
  setSarcomereLength(sl, opts = {}) {
    /** @type {Record<string, any>} */
    const merged = { ...this.buildOpts, ...opts };
    // Lattice off falls back to the plain AXIAL scene rather than a zero-ring
    // lattice. A zero-ring patch has one thick filament and no complete
    // triangles, hence no trigonal thin sites — so the thin filament would
    // revert to its on-axis axial idealization while the scene still claimed to
    // carry a lattice. The axial scene states that idealization honestly.
    const showLattice = merged.showLattice ?? true;
    const latticeScope = merged.latticeScope ?? 'patch';
    // Local context is intentionally one central thick filament plus its six
    // nearest thin neighbours. Always request the one-ring descriptor for that
    // view; the Evidence-only patch scope owns the larger ring count.
    const latticeRings = latticeScope === 'local'
      ? 1
      : Math.max(1, merged.rings ?? 1);
    const scene = showLattice
      ? this.model.contextSceneAt(sl, { rings: latticeRings })
      : this.model.sceneAt(sl);
    // Verification runs on EVERY rebuild, not once at startup: a state the user
    // can reach interactively must be as checked as the ones in the test suite.
    const { errors, notes } = this.model.verifyScene(scene);
    if (errors.length) {
      throw new Error(`scene at SL=${sl} failed verification:\n  ${errors.join('\n  ')}`);
    }
    const domainBatches = merged.showDomains ? this.model.instancingPlanAt(sl) : null;

    // Phase 7b. The context-detail layer needs the lattice (crowns are placed on
    // lattice filaments) and it needs to know how wide a span the camera actually
    // shows, because its aliasing gate is a decision about SCREEN size. Measuring
    // that here rather than guessing in the renderer is the point: a hardcoded view
    // width would let the gate pass or fail regardless of what the user is looking
    // at, which would make the gate decorative.
    const contextDetail = (merged.showContextDetail && showLattice
        && merged.showFilamentContext !== false)
      ? this.model.contextDetailSceneAt(sl, { rings: latticeRings })
      : null;
    const anchorDetail = (merged.anchorDetail && showLattice
        && merged.showFilamentContext !== false)
      ? this.model.anchorDetailAt(sl, merged.anchorDetail, { rings: latticeRings })
      : null;

    // Before the very first frame(), camera and orbit target both sit at the
    // origin, so the measured perspective span is exactly zero. Passing that
    // transient initialization value into the scientific LOD gate aborts browser
    // startup. Use the displayed sarcomere length as a conservative first-frame
    // overview span; every later build uses the live camera measurement, and the
    // first animation tick re-evaluates all LOD thresholds after framing.
    const measuredViewWidth = this.visibleWidthNm();
    const buildViewWidth = Number.isFinite(measuredViewWidth) && measuredViewWidth > 0
      ? measuredViewWidth : scene.sarcomere_length_nm;
    const buildViewportPx = Number.isFinite(this.container.clientWidth)
      && this.container.clientWidth > 0 ? this.container.clientWidth : 1;
    this.sarcomere.build(scene, this.model.domainInstancesAt(sl), {
      ...merged,
      domainBatches,
      contextDetail,
      anchorDetail,
      titinPath: this.model.backboneAt(sl),
      viewWidthNm: buildViewWidth,
      viewportPx: buildViewportPx,
    });
    this.currentSL = scene.sarcomere_length_nm;
    this.lastNotes = notes;
    // Remember what was actually built. buildOpts is the constructor's DEFAULTS;
    // the per-call opts are what the UI passed, and checkDetailLOD must reason
    // about the latter or it would never see the context layer enabled at all.
    /** @type {Record<string, any>} */
    this.lastBuildOpts = merged;
    return this.sarcomere.manifest;
  }

  /**
   * Width of the scene span the camera currently shows, in nm.
   *
   * Derived from the perspective frustum at the camera's distance to the orbit
   * target: half-height = distance * tan(fov/2), and width = height * aspect. This
   * is what the Phase 7b aliasing gate divides into the viewport pixel width to get
   * nm-per-pixel — so zooming in genuinely admits the crown array and zooming out
   * genuinely withdraws it, rather than the gate being a fixed compile-time choice.
   */
  visibleWidthNm() {
    const dist = this.camera.position.distanceTo(this.controls.target);
    return this.visibleWidthAtDistance(dist);
  }

  /** Width of the perspective frustum at an explicit orbit distance. */
  visibleWidthAtDistance(dist) {
    const halfH = dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    return 2 * halfH * this.camera.aspect;
  }

  /** Frame the whole sarcomere from a named or explicit direction. */
  frame(view = 'longitudinal', opts = {}) {
    const preset = Array.isArray(view) ? null : (VIEWS[view] || VIEWS.longitudinal);
    if (preset?.focus === 'titin_half') {
      const path = this.model.backboneAt(this.currentSL);
      const first = path.points[0];
      const last = path.points[path.points.length - 1];
      if (!first || !last) throw new Error('frame: canonical titin backbone is empty.');
      return this.focusSpan(first.x, last.x, opts);
    }
    const dir = Array.isArray(view) ? view : preset.dir;
    const box = this._visibleBounds();
    const centre = box.getCenter(new THREE.Vector3());
    const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    // 1.15 leaves a small margin so the structure does not touch the frame edge.
    const distance = (radius / Math.sin(fov / 2)) * 1.15;
    const v = new THREE.Vector3(...dir).normalize().multiplyScalar(distance);
    this._sceneRadius = radius;
    this._moveCamera(centre.clone().add(v), centre, opts);
    return {
      target_nm: centre.toArray(),
      distance_nm: distance,
      animated: Boolean(opts.animate && !this.prefersReducedMotion),
    };
  }

  /**
   * Bounds of what is actually visible, excluding hidden context geometry.
   * Box3.setFromObject(root) includes invisible descendants; using it made the
   * isolated-titin scale retain the context camera distance and look like a few
   * red pixels in empty space rather than a genuine detail view.
   */
  _visibleBounds() {
    const box = new THREE.Box3().makeEmpty();
    this.sarcomere.root.updateWorldMatrix(true, true);
    this.sarcomere.root.traverse((object) => {
      if (!(object.isMesh || object.isLine || object.isSprite || object.isInstancedMesh)) return;
      let cursor = object;
      while (cursor) {
        if (!cursor.visible) return;
        cursor = cursor.parent;
      }
      box.expandByObject(object, true);
    });
    if (box.isEmpty()) box.setFromObject(this.sarcomere.root, true);
    return box;
  }

  /**
   * Move the camera to a named close-up, filling the viewport with `spanNm`.
   *
   * The distance is SOLVED from the span and the field of view rather than tuned by
   * eye, so the same preset shows the same physical span on any viewport shape:
   * for a horizontal span w, distance = (w / aspect / 2) / tan(fov/2).
   *
   * Returns the measurement that justifies the view — the span shown and the screen
   * size the periodic features resolve to — so the caller can display it instead of
   * asserting "this is a close-up" without evidence.
   *
   * @param {string} name key of CLOSEUPS
   * @param {number} [sl] sarcomere length to take landmarks from (defaults to current)
   */
  closeUp(name, sl = this.currentSL, opts = {}) {
    const preset = CLOSEUPS[name];
    if (!preset) {
      throw new Error(
        `unknown close-up '${name}'. Available: ${Object.keys(CLOSEUPS).join(', ')}`,
      );
    }
    const g = this.model.geometryAt(sl);
    const target = new THREE.Vector3(...preset.at(g));
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    // Fit the span across the WIDTH; height follows from the aspect ratio.
    const distance = (preset.spanNm / this.camera.aspect / 2) / Math.tan(fov / 2);
    const v = new THREE.Vector3(...preset.dir).normalize().multiplyScalar(distance);
    const move = opts.move !== false;
    if (move) this._moveCamera(target.clone().add(v), target, opts);

    const px = this.container.clientWidth;
    // `move:false` is a read-only measurement path used after rebuilding the
    // manifest. It must report the live camera span without restarting or
    // cancelling an in-progress transition.
    const finalSpan = move ? this.visibleWidthAtDistance(distance) : this.visibleWidthNm();
    const perNm = px / finalSpan;
    const cd = this.sarcomere.manifest?.context_detail;
    const anchor = this.sarcomere.manifest?.anchor_detail;
    return {
      name,
      label: preset.label,
      shows: preset.shows,
      target_nm: target.toArray().map((n) => Number(n.toFixed(1))),
      span_nm: Number(finalSpan.toFixed(1)),
      distance_nm: Number(distance.toFixed(1)),
      animated: Boolean(move && opts.animate && !this.prefersReducedMotion),
      // Reported so a claim about resolving a periodicity is checkable, not asserted.
      crown_spacing_px: cd?.crown_spacing_nm != null
        ? Number((cd.crown_spacing_nm * perNm).toFixed(1)) : null,
      crossover_repeat_px: cd?.crossover_repeat_nm != null
        ? Number((cd.crossover_repeat_nm * perNm).toFixed(1)) : null,
      alias_threshold_px: cd?.alias_threshold_px ?? null,
      anchor_detail: anchor?.target === name ? {
        drawn: anchor.drawn,
        feature: anchor.feature,
        feature_nm: anchor.feature_nm,
        feature_px: anchor.feature_px,
        alias_threshold_px: anchor.alias_threshold_px,
        omitted_because: anchor.omitted_because ?? null,
      } : null,
    };
  }

  /**
   * Focus an axial span without exposing camera objects to the biological facade.
   * Used for titin-region navigation; the target and span still come from the
   * canonical backbone, while this method performs presentation math only.
   */
  focusSpan(startNm, endNm, opts = {}) {
    if (!Number.isFinite(startNm) || !Number.isFinite(endNm) || endNm <= startNm) {
      throw new Error(`focusSpan: expected a positive finite range, got ${startNm}..${endNm}`);
    }
    const physicalSpan = endNm - startNm;
    const viewSpan = Math.max(40, physicalSpan * 1.35);
    const target = new THREE.Vector3((startNm + endNm) / 2, 0, 0);
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const distance = (viewSpan / this.camera.aspect / 2) / Math.tan(fov / 2);
    const direction = new THREE.Vector3(0.12, 0.25, 1).normalize();
    this._moveCamera(target.clone().add(direction.multiplyScalar(distance)), target, opts);
    return {
      target_nm: target.toArray().map((n) => Number(n.toFixed(1))),
      region_span_nm: Number(physicalSpan.toFixed(3)),
      view_span_nm: Number(this.visibleWidthAtDistance(distance).toFixed(1)),
      distance_nm: Number(distance.toFixed(1)),
      animated: Boolean(opts.animate && !this.prefersReducedMotion),
    };
  }

  /**
   * Project canonical model anchors into container-local CSS pixels. The return
   * value contains no Three.js object and is safe for accessible DOM overlays.
   */
  projectPoints(records) {
    if (!Array.isArray(records)) throw new Error('projectPoints: expected an array.');
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.updateMatrixWorld();
    return records.map((record) => {
      const anchor = record.anchor_nm || record;
      if (![anchor.x, anchor.y ?? 0, anchor.z ?? 0].every(Number.isFinite)) {
        throw new Error(`projectPoints: '${record.id || 'anchor'}' has invalid coordinates.`);
      }
      const projected = new THREE.Vector3(anchor.x, anchor.y ?? 0, anchor.z ?? 0)
        .project(this.camera);
      return {
        id: record.id ?? null,
        x_px: (projected.x + 1) * width / 2,
        y_px: (1 - projected.y) * height / 2,
        visible: projected.z >= -1 && projected.z <= 1
          && projected.x >= -1.15 && projected.x <= 1.15
          && projected.y >= -1.15 && projected.y <= 1.15,
      };
    });
  }

  /**
   * Raycast a browser client coordinate and return biological metadata only.
   * Three.js objects never cross the public facade boundary.
   */
  pick(clientX, clientY) {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      throw new Error('pick: clientX and clientY must be finite numbers.');
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0
        || clientX < rect.left || clientX > rect.right
        || clientY < rect.top || clientY > rect.bottom) return null;
    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.camera.updateMatrixWorld();
    this.sarcomere.root.updateWorldMatrix(true, true);
    this.raycaster.setFromCamera(pointer, this.camera);
    const visible = (object) => {
      for (let cursor = object; cursor; cursor = cursor.parent) {
        if (!cursor.visible) return false;
      }
      return true;
    };
    for (const hit of this.raycaster.intersectObject(this.sarcomere.root, true)) {
      if (!visible(hit.object)) continue;
      const target = this.sarcomere.pickTarget(hit.object, hit.instanceId ?? null);
      if (!target) continue;
      return {
        ...target,
        anchor_nm: { x: hit.point.x, y: hit.point.y, z: hit.point.z },
        distance_nm: hit.distance,
      };
    }
    return null;
  }

  /**
   * Move immediately or start one interruptible camera interpolation.
   * `opts.animate` is opt-in so programmatic tests and first paint remain
   * deterministic; Phase-10 controls request it explicitly.
   */
  _moveCamera(position, target, opts = {}) {
    const durationMs = opts.durationMs ?? CAMERA_TRANSITION_MS;
    const animate = Boolean(opts.animate) && !this.prefersReducedMotion && durationMs > 0;
    if (!animate) {
      this._cameraTransition = null;
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      this._updateFrustum();
      this.controls.update();
      return false;
    }
    const now = opts.now ?? performance.now();
    this._cameraTransition = {
      start_ms: now,
      duration_ms: durationMs,
      from_position: this.camera.position.clone(),
      to_position: position.clone(),
      from_target: this.controls.target.clone(),
      to_target: target.clone(),
    };
    return true;
  }

  /** Advance the active transition. Returns true while motion remains. */
  _advanceCameraTransition(now = performance.now()) {
    const move = this._cameraTransition;
    if (!move) return false;
    const raw = THREE.MathUtils.clamp(
      (now - move.start_ms) / move.duration_ms, 0, 1,
    );
    const eased = easeCameraTransition(raw);
    this.camera.position.lerpVectors(move.from_position, move.to_position, eased);
    this.controls.target.lerpVectors(move.from_target, move.to_target, eased);
    this._updateFrustum();
    if (raw >= 1) this._cameraTransition = null;
    return raw < 1;
  }

  /**
   * Keep the depth range straddling whatever the camera is currently looking at.
   *
   * The near plane must be a fraction of the CURRENT orbit distance, not a
   * constant derived from the scene's full extent: a sarcomere is ~2250 nm long
   * but a myosin head is ~19 nm, so one fixed frustum cannot serve both scales.
   * Tying near to distance gives a constant depth-precision ratio at every zoom
   * level, which is the standard way to span four orders of magnitude without
   * either clipping the subject or destroying the depth buffer.
   *
   * Called every frame (it is a few float operations), so it cannot fall out of
   * step with a user-driven dolly the way the framing-time computation did.
   */
  _updateFrustum() {
    const dist = this.camera.position.distanceTo(this.controls.target);
    const radius = this._sceneRadius ?? dist;
    const near = Math.max(0.1, dist * 0.02);
    // Far must still clear the whole structure, or close-ups would cut away the
    // background filaments that give a crown its spatial context.
    const far = Math.max(dist + radius * 4, near * 1000);
    if (near !== this.camera.near || far !== this.camera.far) {
      this.camera.near = near;
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /**
   * Rebuild only when zooming crosses a screen-resolvability threshold.
   *
   * Crown spacing, thin-filament crossover spacing, and SC-3 anchor detail each
   * have independent gates. Compare every live screen size with the boolean stored
   * in the current manifest, then rebuild ONCE if any answer changed. Zooming inside
   * a regime remains free, while no detail layer can become stale after a dolly.
   *
   * @param {(sl:number)=>void} rebuild caller's rebuild function (it owns the opts)
   */
  checkDetailLOD(rebuild) {
    if (typeof rebuild !== 'function') {
      throw new Error('checkDetailLOD: rebuild callback must be a function.');
    }
    const viewportPx = this.container.clientWidth;
    const viewWidthNm = this.visibleWidthNm();
    if (!(Number.isFinite(viewportPx) && viewportPx > 0
        && Number.isFinite(viewWidthNm) && viewWidthNm > 0)) return false;
    const resolves = (featureNm, thresholdPx) => (
      Number.isFinite(featureNm) && Number.isFinite(thresholdPx)
      && (viewportPx * featureNm) / viewWidthNm >= thresholdPx
    );
    const gates = [];
    const context = this.sarcomere.manifest?.context_detail;
    if (this.lastBuildOpts?.showContextDetail && context) {
      if (context.crown_spacing_nm != null) {
        gates.push(context.heads_drawn
          === resolves(context.crown_spacing_nm, context.alias_threshold_px));
      }
      if (context.crossover_repeat_nm != null) {
        gates.push(context.twist_drawn
          === resolves(context.crossover_repeat_nm, context.alias_threshold_px));
      }
    }
    const anchor = this.sarcomere.manifest?.anchor_detail;
    if (this.lastBuildOpts?.anchorDetail && anchor?.feature_nm != null) {
      gates.push(anchor.drawn === resolves(anchor.feature_nm, anchor.alias_threshold_px));
    }
    if (gates.some((unchanged) => !unchanged)) {
      rebuild(this.currentSL);
      return true;
    }
    return false;
  }

  /**
   * @param {((sl:number)=>void)|null} [onLODChange] called on an LOD threshold crossing
   * @param {(()=>void)|null} [onFrame] called after camera/controls update
   */
  start(onLODChange = null, onFrame = null) {
    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      this._advanceCameraTransition();
      this.controls.update();
      // Before rendering, so a dolly this frame is already reflected in the depth
      // range. Without this the near plane would again be a floor on approach.
      this._updateFrustum();
      // Checked once per frame but acts at most on a threshold crossing.
      if (onLODChange) this.checkDetailLOD(onLODChange);
      if (onFrame) onFrame();
      this.renderer.render(this.scene, this.camera);
    };
    if (!this._raf) tick();
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    this.sarcomere.clear();
    this.controls.removeEventListener('start', this._onControlStart);
    this._motionQuery?.removeEventListener?.('change', this._onMotionPreferenceChange);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
