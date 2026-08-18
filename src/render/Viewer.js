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
import { PICK_PROXY_LAYER, SarcomereScene } from './SarcomereScene.js';
import { PICK_CLASS, PICK_REASON, resolvePick } from './PickPriority.js';
import { STAGE_LAYOUT } from '../presentation/StageLayout.js';

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
 * Fallback used when the container has no layout yet. Any finite positive value
 * works: `resize()` overwrites it as soon as the element has a real size.
 */
const FALLBACK_ASPECT = 16 / 9;

/**
 * The camera's aspect ratio, guarded against a container that has not been laid
 * out yet.
 *
 * A hidden or not-yet-measured element reports 0 for both dimensions, and 0/0 is
 * NaN. That NaN does not stay local: `focusSpan` and `closeUp` SOLVE their camera
 * distance as `span / aspect / 2 / tan(fov/2)`, so a NaN aspect propagates into
 * camera.position and then into the projection matrix, and the canvas renders
 * nothing at all. The failure is silent from the inside — renderer.info still
 * reports a full complement of draw calls and triangles against a blank frame —
 * so the aspect is clamped here at the single point where it enters the camera.
 *
 * Exported so the guard can be tested without constructing WebGL.
 */
export function cameraAspect(width, height) {
  return (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0)
    ? width / height
    : FALLBACK_ASPECT;
}

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
 * `at` receives the landmark record built by {@link closeUpLandmarks}: the
 * interpolated geometry plus the canonical landmarks the geometry record does not
 * itself carry. Keeping it to ONE argument means every preset reads the same
 * vocabulary and no preset re-derives a landmark that already has one owner.
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
  czone: {
    label: 'A-band C-zone',
    // The canonical C-zone midpoint, from the one derivation that also places the
    // C-zone domain block and draws the SC-2 band bracket. This is the close-up the
    // reviewed attention budget presupposes when it confines MyBP-C detail to "its
    // relevant close-up"; at this span the 45.5 nm titin super-repeat and the 43 nm
    // MyBP-C stripe spacing are both far above the aliasing threshold.
    at: (g) => [(g.c_zone.start_nm + g.c_zone.end_nm) / 2, 0, 0],
    spanNm: 280,
    dir: [0.12, 0.28, 1],
    shows: 'the thick-filament-bound A-band super-repeat inside the C-zone, with the optional schematic MyBP-C context',
  },
  lattice: {
    label: 'Hexagonal lattice (down-axis)',
    at: (g) => [g.overlap_zone_nm.start_nm + (g.overlap_zone_nm.length ?? 0) * 0.5, 0, 0],
    spanNm: 140,
    dir: [1, 0.06, 0.06],
    // Deliberately NOT called a cross-section any more. This is a perspective 3-D
    // view down the filament axis: useful for grasping the packing, but its
    // foreshortening makes it the wrong place to read spacing. SC-6's orthographic
    // panels are where d10 is measured.
    shows: 'the 3-D packing of thick and thin filaments seen down the filament axis; '
      + 'spacing is measured in the orthographic lattice cross-section, not here',
  },
});

/**
 * The landmark record every close-up preset reads.
 *
 * The interpolated geometry, plus the canonical landmarks that live outside
 * `geometryAt` because they are defined by titin rather than by the filaments —
 * currently the C-zone, which `TitinRepresentation.cZoneAt` owns. Exported so the
 * camera tests exercise the same record the viewer feeds the presets, instead of a
 * hand-built approximation of it.
 *
 * @param {TitinModel} model
 * @param {number} sarcomereLengthNm
 */
export function closeUpLandmarks(model, sarcomereLengthNm) {
  return {
    ...model.geometryAt(sarcomereLengthNm),
    c_zone: model.cZoneAt(sarcomereLengthNm),
  };
}

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
      35, cameraAspect(container.clientWidth, container.clientHeight), 1, 100000,
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
    // SC-24 state truth. Direct orbit/pan/zoom is not a named semantic camera
    // any more, even though the last named preset remains the stable URL
    // fallback. The page listens at the container boundary and marks Custom.
    //
    // OrbitControls fires 'start' on pointerdown, before it knows whether the
    // pointer will move, so announcing there reported a manual camera change
    // for an ordinary click that moved nothing — and threw away a shareable
    // semantic link. The gesture is bracketed instead: the announcement waits
    // for the first real camera change between 'start' and 'end'.
    this._gestureActive = false;
    this._gestureAnnounced = false;
    this._onControlStart = () => {
      this._cameraTransition = null;
      this._gestureActive = true;
      this._gestureAnnounced = false;
    };
    this._onControlEnd = () => { this._gestureActive = false; };
    // Direct manipulation always wins over an automated move. Otherwise a user
    // beginning to orbit mid-transition would fight the interpolation every frame.
    this.controls.addEventListener('start', this._onControlStart);
    this.controls.addEventListener('end', this._onControlEnd);
    // Screen-space overlays must keep up while the camera moves, and must not run
    // when it is still. OrbitControls fires 'change' for direct input and for
    // damped settling, so this one flag covers every camera move it can cause.
    this._controlsMoved = false;
    this._onControlChange = () => {
      this._controlsMoved = true;
      if (this._gestureActive && !this._gestureAnnounced) {
        this._gestureAnnounced = true;
        this.container.dispatchEvent(new CustomEvent('titin:manual-camera-change'));
      }
    };
    this.controls.addEventListener('change', this._onControlChange);

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
    // Line2 has its own raycast path and reads its own params entry, which the
    // stock Raycaster does not define. Without it the titin ribbon is drawn but
    // unpickable at the edges. SC-25 moved the number itself into the reviewed
    // picking policy, so the raycaster and the tolerance the resolver enforces
    // cannot drift apart.
    this.pickPolicy = model.spec?.renderStyle?.titin?.picking ?? null;
    if (!this.pickPolicy || !(this.pickPolicy.line_pick_threshold_px > 0)
        || !(this.pickPolicy.emphasized_titin_tolerance_px > 0)
        || this.pickPolicy.pick_proxy_layer !== PICK_PROXY_LAYER) {
      throw new Error('Viewer: the reviewed SC-25 titin picking policy is unavailable.');
    }
    this.raycaster.params.Line2 = { threshold: this.pickPolicy.line_pick_threshold_px };
    // The camera's default mask renders layer 0 only, so enabling the proxy layer
    // HERE — and only here — is what makes a hit area reachable by a ray and
    // invisible to every render, screenshot, and bounding box.
    this.raycaster.layers.enable(PICK_PROXY_LAYER);
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

    // SC-5. Accessory C-zone context: optional, off unless asked for, Evidence
    // mode only, and dependent on the lattice because the stripes sit on a lattice
    // thick filament. Its absence changes nothing else in the scene.
    const mybpcContext = (merged.showMyBPC && showLattice
        && merged.showFilamentContext !== false
        && (merged.presentationMode ?? 'evidence') === 'evidence')
      ? this.model.mybpcContextAt(sl, { rings: latticeRings })
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
      // SC-16.2. Always handed over; the renderer decides from the framing
      // whether a backbone resolves, and reports what it decided. Null when the
      // optional file is absent, which simply leaves the capsules in place.
      // Optional at every step: absent file, absent spec, absent layer all mean
      // the same thing here — draw the archetype capsules, as before.
      domainBackbones: this.model.spec?.domainBackbones ?? null,
      contextDetail,
      anchorDetail,
      mybpcContext,
      titinPath: this.model.backboneAt(sl),
      viewWidthNm: buildViewWidth,
      viewportPx: buildViewportPx,
    });
    // A fresh build made fresh screen-space line materials, and one whose
    // resolution is still (0,0) draws at the wrong width and refuses to be
    // picked. resize() is not guaranteed to fire between here and the next frame.
    const { clientWidth: lineW, clientHeight: lineH } = this.container;
    if (lineW > 0 && lineH > 0) this.sarcomere.setLineResolution(lineW, lineH);
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
    const distance = (radius / Math.sin(fov / 2)) * STAGE_LAYOUT.frame_margin_factor;
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
      // SC-25. A pick proxy is a hit area, not a structure: it must not move the
      // camera, widen a close-up, or appear in any framing measurement. It is a
      // Line2 — which extends Mesh — so the layer, not the type, is the test.
      if (object.layers.isEnabled(PICK_PROXY_LAYER)) return;
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
   * Distance at which `spanNm` fills the viewport WIDTH; height follows from the
   * aspect ratio. Shared by every span-solving framing path.
   *
   * The aspect is asserted rather than defaulted here. `cameraAspect` already
   * guarantees a sane value wherever the aspect enters the camera, so a non-finite
   * one arriving at this point means something upstream is broken; quietly
   * substituting a fallback would frame to the wrong span instead of surfacing the
   * fault. The failure this prevents is silent — a NaN distance reaches
   * camera.position and blanks the canvas without raising anything, while
   * renderer.info still reports a full complement of draw calls and triangles.
   *
   * @param {number} spanNm physical span to fit across the viewport width
   */
  _distanceForSpan(spanNm) {
    const { aspect } = this.camera;
    if (!Number.isFinite(aspect) || aspect <= 0) {
      throw new Error(
        `camera aspect must be finite and positive to solve a framing distance, got ${aspect}`,
      );
    }
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    return (spanNm / aspect / 2) / Math.tan(fov / 2);
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
    const g = closeUpLandmarks(this.model, sl);
    const target = new THREE.Vector3(...preset.at(g));
    const distance = this._distanceForSpan(preset.spanNm);
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
    const marginFactor = opts.marginFactor ?? STAGE_LAYOUT.frame_margin_factor;
    if (!Number.isFinite(marginFactor) || marginFactor < 1) {
      throw new Error(`focusSpan: marginFactor must be finite and at least 1, got ${marginFactor}`);
    }
    const margined = physicalSpan * marginFactor;
    // A 6.8 nm region framed at 1.12x puts the camera INSIDE the tube and shows a
    // featureless wall. A region is only meaningful in series with its
    // neighbours, so a floor keeps that context in frame.
    const viewSpan = Math.max(margined, STAGE_LAYOUT.min_region_view_span_nm);
    const minSpanApplied = viewSpan > margined;
    const distance = this._distanceForSpan(viewSpan);
    const target = new THREE.Vector3((startNm + endNm) / 2, 0, 0);
    if (opts.contentCenterYPx !== undefined) {
      const contentCenterYPx = Number(opts.contentCenterYPx);
      const heightPx = this.container.clientHeight;
      if (!Number.isFinite(contentCenterYPx) || !(heightPx > 0)) {
        throw new Error('focusSpan: contentCenterYPx requires a finite pixel position '
          + 'and a measurable viewport.');
      }
      const visibleHeightNm = 2 * distance * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      target.y = (contentCenterYPx - heightPx / 2) * visibleHeightNm / heightPx;
    }
    const direction = new THREE.Vector3(0.12, 0.25, 1).normalize();
    this._moveCamera(target.clone().add(direction.multiplyScalar(distance)), target, opts);
    return {
      target_nm: target.toArray().map((n) => Number(n.toFixed(1))),
      region_span_nm: Number(physicalSpan.toFixed(3)),
      view_span_nm: Number(this.visibleWidthAtDistance(distance).toFixed(1)),
      distance_nm: Number(distance.toFixed(1)),
      min_span_applied: minSpanApplied,
      animated: Boolean(opts.animate && !this.prefersReducedMotion),
    };
  }

  /**
   * SC-24 demonstration framing. Solve the camera against the MAXIMUM sweep
   * extent, not the geometry currently drawn, so length changes cannot grow the
   * half-sarcomere or its I-band bracket off stage mid-demonstration.
   */
  frameSweepBounds(maxSarcomereLengthNm, opts = {}) {
    if (!Number.isFinite(maxSarcomereLengthNm)) {
      throw new Error('frameSweepBounds: expected a finite maximum sarcomere length.');
    }
    const geometry = this.model.geometryAt(maxSarcomereLengthNm);
    const path = this.model.backboneAt(maxSarcomereLengthNm);
    const xs = path.points.map((point) => point.x).filter(Number.isFinite);
    if (Number.isFinite(geometry?.mline?.X)) xs.push(geometry.mline.X);
    const start = Math.min(...xs);
    const end = Math.max(...xs);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw new Error('frameSweepBounds: maximum sweep geometry has no positive axial span.');
    }
    return {
      maximum_sarcomere_length_nm: maxSarcomereLengthNm,
      ...this.focusSpan(start, end, { marginFactor: 1.28, ...opts }),
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
   * Project a world point to container-local CSS pixels, honouring the near
   * plane. A point behind the camera has a negative `w`, and dividing by it
   * mirrors the position through the origin — which would report a pointer
   * "close to" a segment that is behind the viewer's head.
   *
   * @returns {{x:number, y:number, z:number}} `z` is camera-space depth (negative
   *   in front of the camera), so a caller can clip a segment before measuring it
   */
  _toCameraSpace(x, y, z) {
    const v = new THREE.Vector4(x, y, z, 1).applyMatrix4(this.camera.matrixWorldInverse);
    return { x: v.x, y: v.y, z: v.z };
  }

  _cameraSpaceToPixels(point, width, height) {
    const v = new THREE.Vector4(point.x, point.y, point.z, 1)
      .applyMatrix4(this.camera.projectionMatrix);
    if (!(Math.abs(v.w) > 1e-9)) return null;
    return {
      x: (v.x / v.w + 1) * width / 2,
      y: (1 - v.y / v.w) * height / 2,
    };
  }

  /**
   * Shortest CSS-pixel distance from the pointer to a screen-space line object.
   *
   * Measured in the SAME space the pick width is declared in, rather than by
   * projecting three's world-space closest point: the two disagree wherever the
   * line runs away from the camera, and the reviewed tolerance is a screen-space
   * number. Returns null when no segment is in front of the near plane.
   */
  _screenDistanceToLine2(object, pointerPx, width, height) {
    const start = object.geometry?.attributes?.instanceStart;
    const end = object.geometry?.attributes?.instanceEnd;
    if (!start || !end) return null;
    const count = Math.min(object.geometry.instanceCount ?? start.count, start.count);
    const near = -this.camera.near;
    const world = new THREE.Vector3();
    let bestDistance = null;
    for (let i = 0; i < count; i += 1) {
      world.set(start.getX(i), start.getY(i), start.getZ(i)).applyMatrix4(object.matrixWorld);
      let a = this._toCameraSpace(world.x, world.y, world.z);
      world.set(end.getX(i), end.getY(i), end.getZ(i)).applyMatrix4(object.matrixWorld);
      let b = this._toCameraSpace(world.x, world.y, world.z);
      if (a.z > near && b.z > near) continue;
      // Trim to the near plane exactly as three's own screen-space line raycast
      // does, so a segment that starts behind the camera is measured over the
      // part of it that is actually on screen.
      if (a.z > near) {
        const t = (a.z - near) / (a.z - b.z);
        a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: near };
      } else if (b.z > near) {
        const t = (b.z - near) / (b.z - a.z);
        b = { x: b.x + (a.x - b.x) * t, y: b.y + (a.y - b.y) * t, z: near };
      }
      const p = this._cameraSpaceToPixels(a, width, height);
      const q = this._cameraSpaceToPixels(b, width, height);
      if (!p || !q) continue;
      const dx = q.x - p.x; const dy = q.y - p.y;
      const lengthSq = dx * dx + dy * dy;
      const t = lengthSq > 0
        ? THREE.MathUtils.clamp(((pointerPx.x - p.x) * dx + (pointerPx.y - p.y) * dy) / lengthSq, 0, 1)
        : 0;
      const distance = Math.hypot(p.x + dx * t - pointerPx.x, p.y + dy * t - pointerPx.y);
      if (bestDistance === null || distance < bestDistance) bestDistance = distance;
    }
    return bestDistance;
  }

  /**
   * How far, in CSS pixels, the pointer was from the thing it hit.
   *
   * A surface hit is exact by construction — the intersection lies ON the ray, so
   * it projects back to the pointer. Only tolerance-bearing geometry (the
   * screen-space continuity trace and its hit proxy, and the world-space line
   * marker) can be hit from a distance, and only those need measuring.
   */
  _hitScreenDistancePx(hit, pointerPx, width, height) {
    if (hit.object?.isLineSegments2 || hit.object?.isLine2) {
      const measured = this._screenDistanceToLine2(hit.object, pointerPx, width, height);
      if (measured !== null) return measured;
    }
    if (hit.object?.isLine || hit.object?.isLineSegments) {
      const point = hit.pointOnLine ?? hit.point;
      const camera = this._toCameraSpace(point.x, point.y, point.z);
      const projected = this._cameraSpaceToPixels(camera, width, height);
      if (projected) return Math.hypot(projected.x - pointerPx.x, projected.y - pointerPx.y);
    }
    return 0;
  }

  /**
   * Raycast a browser client coordinate and return biological metadata only.
   * Three.js objects never cross the public facade boundary.
   *
   * SC-25: the loop MEASURES and the reviewed resolver DECIDES. Returning the
   * first hit — which is what this did — is the rule "nearest along the ray
   * wins", and that rule is wrong for a Learn stage whose titin trace is
   * deliberately drawn in front of the occluders it is geometrically behind.
   *
   * @param {number} clientX
   * @param {number} clientY
   * @param {import('./PickPriority.js').PickIntent} [intent]
   */
  pick(clientX, clientY, intent = {}) {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      throw new Error('pick: clientX and clientY must be finite numbers.');
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0
        || clientX < rect.left || clientX > rect.right
        || clientY < rect.top || clientY > rect.bottom) return null;
    const pointerPx = { x: clientX - rect.left, y: clientY - rect.top };
    const pointer = new THREE.Vector2(
      (pointerPx.x / rect.width) * 2 - 1,
      -(pointerPx.y / rect.height) * 2 + 1,
    );
    this.camera.updateMatrixWorld();
    this.sarcomere.root.updateWorldMatrix(true, true);
    this.raycaster.setFromCamera(pointer, this.camera);
    const drawn = (object) => {
      for (let cursor = object; cursor; cursor = cursor.parent) {
        if (!cursor.visible) return false;
      }
      return true;
    };
    const decorative = (object) => {
      for (let cursor = object; cursor; cursor = cursor.parent) {
        if (cursor.userData?.emphasis_channel === 'presentation') return true;
      }
      return false;
    };
    const candidates = [];
    const hits = [];
    for (const hit of this.raycaster.intersectObject(this.sarcomere.root, true)) {
      const target = this.sarcomere.pickTarget(hit.object, hit.instanceId ?? null);
      if (!target) continue;
      candidates.push({
        ...target,
        biological_class: decorative(hit.object)
          ? PICK_CLASS.decorative
          : (target.target_type === 'titin_region' ? PICK_CLASS.titin : PICK_CLASS.context),
        pick_proxy: Boolean(target.pick_proxy),
        visible: drawn(hit.object),
        screen_distance_px: this._hitScreenDistancePx(hit, pointerPx, rect.width, rect.height),
        ray_distance_nm: hit.distance,
        // Named by the plan's candidate record and read by nothing: see
        // PickPriority. Carried so the inertness is observable rather than
        // asserted.
        selected: intent.selection?.target_type === target.target_type
          && intent.selection?.target_id === target.target_id,
      });
      hits.push(hit);
    }
    const resolved = resolvePick(candidates, {
      explicit_target: intent.explicit_target ?? null,
      emphasis: intent.emphasis ?? null,
      selection: intent.selection ?? null,
      tolerance_px: this.pickPolicy.emphasized_titin_tolerance_px,
    });
    if (!resolved.target) return null;
    const index = candidates.findIndex((candidate) => candidate === resolved.target);
    const hit = index >= 0 ? hits[index] : null;
    const {
      biological_class: biologicalClass, selected: _selected, visible: _visible, ...target
    } = resolved.target;
    return {
      ...target,
      anchor_nm: hit
        ? { x: hit.point.x, y: hit.point.y, z: hit.point.z }
        : null,
      distance_nm: hit ? hit.distance : null,
      pick_reason: resolved.reason,
      biological_class: biologicalClass,
      candidates_considered: resolved.considered,
      decorative_candidates_dropped: resolved.dropped_decorative,
    };
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
    this.camera.aspect = cameraAspect(w, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    // Screen-space line widths are computed from this size.
    this.sarcomere?.setLineResolution(w, h);
    // Repairing the aspect above does NOT repair a position that was solved from a
    // broken one, and nothing else re-derives it, so a camera framed before the
    // container had a size would stay at NaN for the life of the page. Re-frame once
    // the element is real, so a late layout recovers instead of leaving a canvas that
    // renders nothing while reporting a full complement of draw calls.
    if (!Number.isFinite(this.camera.position.lengthSq())) this.frame();
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
    // SC-16.2. The domain surface is chosen at build time from the framed span, so
    // crossing the threshold has to rebuild exactly like every other detail gate.
    // Only archetypes whose sole obstacle is the camera are gated: one with no
    // usable backbone can never satisfy the comparison, and gating it would ask
    // for a rebuild on every frame forever.
    for (const record of Object.values(
      this.sarcomere.manifest?.domains?.backbones?.archetypes ?? {},
    )) {
      if (!record.swappable) continue;
      gates.push((record.drawn === 'measured_calpha_backbone')
        === resolves(record.domain_axial_length_nm, record.resolve_threshold_px));
    }
    const mybpc = this.sarcomere.manifest?.mybpc_context;
    if (this.lastBuildOpts?.showMyBPC && mybpc?.feature_nm != null) {
      // Two conditions, recomputed from the manifest's own numbers rather than
      // restated here: the stripe spacing must resolve, and the C-zone must still
      // fill enough of the frame to count as its close-up.
      const framed = (mybpc.c_zone_length_nm / viewWidthNm) >= mybpc.min_view_fraction;
      gates.push(mybpc.drawn
        === (resolves(mybpc.feature_nm, mybpc.alias_threshold_px) && framed));
    }
    if (gates.some((unchanged) => !unchanged)) {
      rebuild(this.currentSL);
      return true;
    }
    return false;
  }

  /**
   * @param {((sl:number)=>void)|null} [onLODChange] called on an LOD threshold crossing
   * @param {((info:{camera_moving:boolean})=>void)|null} [onFrame] called after
   *   camera/controls update. `camera_moving` lets a caller whose work is screen-space
   *   skip it on a still frame without having to compare camera state itself.
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
      if (onFrame) {
        onFrame({ camera_moving: Boolean(this._cameraTransition) || this._controlsMoved });
        this._controlsMoved = false;
      }
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
    this.controls.removeEventListener('end', this._onControlEnd);
    this.controls.removeEventListener('change', this._onControlChange);
    this._motionQuery?.removeEventListener?.('change', this._onMotionPreferenceChange);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
