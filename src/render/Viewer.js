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
  side: { dir: [0, 0, 1], label: 'Side — the sarcomere banding pattern' },
  transverse: { dir: [1, 0, 0], label: 'Transverse — down the filament axis' },
  oblique: { dir: [0.7, 0.5, 0.7], label: 'Oblique — 3-D lattice organization' },
});

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
    label: 'M-line / bare zone',
    at: (g) => [g.mline.X, 0, 0],
    spanNm: 220,
    dir: [0.2, 0.3, 1],
    shows: 'the head-free bare zone and titin\u2019s C-terminal anchor',
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
    // A myosin head is ~19 nm and a crown spacing ~14.3 nm, so approach has to be
    // allowed to a few nm for a head to fill a useful fraction of the viewport.
    // The ceiling keeps the whole sarcomere reachable at any length.
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20000;

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
    const scene = showLattice
      ? this.model.contextSceneAt(sl, { rings: Math.max(1, merged.rings ?? 1) })
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
    const contextDetail = (merged.showContextDetail && showLattice)
      ? this.model.contextDetailSceneAt(sl, { rings: Math.max(1, merged.rings ?? 1) })
      : null;

    this.sarcomere.build(scene, this.model.domainInstancesAt(sl), {
      ...merged,
      domainBatches,
      contextDetail,
      viewWidthNm: this.visibleWidthNm(),
      viewportPx: this.container.clientWidth,
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
    const halfH = dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    return 2 * halfH * this.camera.aspect;
  }

  /** Frame the whole sarcomere from a named or explicit direction. */
  frame(view = 'longitudinal') {
    const dir = Array.isArray(view) ? view : (VIEWS[view] || VIEWS.longitudinal).dir;
    const box = new THREE.Box3().setFromObject(this.sarcomere.root);
    const centre = box.getCenter(new THREE.Vector3());
    const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    // 1.15 leaves a small margin so the structure does not touch the frame edge.
    const distance = (radius / Math.sin(fov / 2)) * 1.15;
    const v = new THREE.Vector3(...dir).normalize().multiplyScalar(distance);
    this.camera.position.copy(centre).add(v);
    this.controls.target.copy(centre);
    this._sceneRadius = radius;
    this._updateFrustum();
    this.controls.update();
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
  closeUp(name, sl = this.currentSL) {
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
    this.controls.target.copy(target);
    this.camera.position.copy(target).add(v);
    this._updateFrustum();
    this.controls.update();

    const px = this.container.clientWidth;
    const perNm = px / this.visibleWidthNm();
    const cd = this.sarcomere.manifest?.context_detail;
    return {
      name,
      label: preset.label,
      shows: preset.shows,
      target_nm: target.toArray().map((n) => Number(n.toFixed(1))),
      span_nm: Number(this.visibleWidthNm().toFixed(1)),
      distance_nm: Number(distance.toFixed(1)),
      // Reported so a claim about resolving a periodicity is checkable, not asserted.
      crown_spacing_px: cd?.crown_spacing_nm != null
        ? Number((cd.crown_spacing_nm * perNm).toFixed(1)) : null,
      crossover_repeat_px: cd?.crossover_repeat_nm != null
        ? Number((cd.crossover_repeat_nm * perNm).toFixed(1)) : null,
      alias_threshold_px: cd?.alias_threshold_px ?? null,
    };
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
   * Rebuild ONLY when zooming has crossed the Phase 7b aliasing threshold.
   *
   * The gate's decision depends on the camera, so zooming can invalidate it — but
   * rebuilding every frame would re-derive 100+ crown levels per filament at 60 Hz.
   * Instead: compare the CURRENT screen size of the crown spacing against the
   * threshold and rebuild only when the boolean answer changes. Zooming within a
   * regime costs nothing; crossing the regime boundary costs one rebuild.
   *
   * @param {(sl:number)=>void} rebuild caller's rebuild function (it owns the opts)
   */
  checkDetailLOD(rebuild) {
    if (!this.lastBuildOpts?.showContextDetail) return false;
    const r = this.sarcomere.manifest?.context_detail;
    if (!r) return false;
    // The manifest carries the spacing in NM, so the current screen size is a
    // direct computation rather than a reconstruction from the last build's pixels.
    if (r.crown_spacing_nm == null) return false;
    const nowPx = (this.container.clientWidth * r.crown_spacing_nm) / this.visibleWidthNm();
    const isResolvable = nowPx >= r.alias_threshold_px;
    if (r.heads_drawn !== isResolvable) { rebuild(this.currentSL); return true; }
    return false;
  }

  /** @param {((sl:number)=>void)|null} [onLODChange] called on an LOD threshold crossing */
  start(onLODChange = null) {
    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      this.controls.update();
      // Before rendering, so a dolly this frame is already reflected in the depth
      // range. Without this the near plane would again be a floor on approach.
      this._updateFrustum();
      // Checked once per frame but acts at most on a threshold crossing.
      if (onLODChange) this.checkDetailLOD(onLODChange);
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
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
