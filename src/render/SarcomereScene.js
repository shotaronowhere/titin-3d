/**
 * SarcomereScene — Phase 7. Builds the Three.js object graph for the sarcomere
 * context view from scene DESCRIPTORS.
 *
 * The one architectural rule: this file contains NO biology. It never reads a
 * spec file, never computes a dimension, and holds no biological constant. It
 * consumes what GeometryStrategy.sceneAt() emits and turns descriptors into
 * meshes. If a number appears here that did not come from a descriptor, that is
 * a bug — the scientific geometric specification is the source of truth, and a
 * renderer that re-derives geometry becomes a second, competing source.
 *
 * Consequently this module is where the MASTER_PLAN primitive vocabulary is
 * honoured (Phase 7):
 *   cylinders     -> thick and thin filaments
 *   simple meshes -> Z-disc and M-line
 *   curves/tubes  -> representative titin paths
 *   InstancedMesh -> repeated domains and repeated filaments
 *
 * Coordinate convention (inherited from the spec, not chosen here):
 *   X = longitudinal, origin at Z-disc centre; YZ = transverse lattice plane.
 * Three.js cylinders are Y-aligned by default, so every filament is rotated
 * +90 deg about Z to lie along X. That rotation is a library convention, not a
 * biological claim.
 *
 * Units: 1 scene unit = 1 nm. Keeping the render space in nanometres means a
 * reader can measure the picture and get a real number, and it removes any
 * chance of a scale factor silently corrupting a comparison between states.
 */
import * as THREE from 'three';

/** Visual encoding of evidence class. Presentation only — no geometry. */
export const EVIDENCE_STYLE = Object.freeze({
  MEASURED: { opacity: 1.0, roughness: 0.35 },
  'STRONGLY INFERRED': { opacity: 0.92, roughness: 0.45 },
  // A modelled value is not an observation: rendered just short of STRONGLY
  // INFERRED so it reads as derived rather than measured.
  MODELED: { opacity: 0.87, roughness: 0.5 },
  INFERRED: { opacity: 0.82, roughness: 0.55 },
  SCHEMATIC: { opacity: 0.55, roughness: 0.7 },
  UNKNOWN: { opacity: 0.3, roughness: 0.85 },
});

/**
 * Component colours. Deliberately NOT keyed to evidence class: colour carries
 * identity (which filament is this), transparency carries confidence (how well
 * do we know it). Overloading one channel with both would make neither readable.
 */
/**
 * Phase 7b aliasing gate. From context_depiction_policy.resolvability_table:
 * a feature below 2 px "aliases_below" — it stops reading as its own periodicity
 * and becomes a moire artefact. Declared here as the single threshold the
 * renderer enforces, rather than a magic number at each use.
 */
export const ALIAS_THRESHOLD_PX = 2.0;

/** Fixed screen-space scale for annotation markers (presentation only). */
export const ANNOTATION_SCREEN_SCALE = 0.018;

/**
 * The biological components a caller may show or hide, each mapped to a predicate
 * over the object names `build()` assigns.
 *
 * Prefix matching is deliberate: the thick filament is drawn as a central mesh
 * plus a lattice InstancedMesh ('thick_filament_central', 'thick_filament_lattice'),
 * and hiding only one of the two would leave a half-drawn filament that reads as a
 * lattice defect rather than as a hidden component. Titin domains live in
 * per-strand groups, so they match a distinct prefix and can be hidden
 * independently of the backbone tube.
 *
 * Ordering matters: `titin_domains` is tested before `titin`, since the domain
 * group names begin with "titin_" and would otherwise be captured by it.
 */
export const COMPONENTS = Object.freeze({
  thick_filament: (n) => n.startsWith('thick_filament'),
  // The actin twist helices are named 'thin_filament_twist*', so a bare
  // startsWith('thin_filament') would capture them too and make the twist
  // impossible to hide independently of the filament it decorates.
  thin_filament: (n) => n.startsWith('thin_filament') && !n.startsWith('thin_filament_twist'),
  thin_filament_twist: (n) => n.startsWith('thin_filament_twist'),
  zdisc: (n) => n === 'zdisc',
  mline: (n) => n === 'mline',
  myosin_heads: (n) => n.startsWith('myosin_heads'),
  // Domain instances are grouped per strand as 'titin_domains_strand_N', but the
  // per-archetype InstancedMeshes inside are named 'domains_<archetype>__<evidence>'.
  // Matching only the group would leave the meshes visible in renderers that walk
  // to leaves, so both are matched.
  titin_domains: (n) => n.startsWith('titin_domains') || n.startsWith('domains_'),
  // The backbone tube ('titin', 'titin_strand_N') but NOT the domain groups.
  titin: (n) => n.startsWith('titin') && !n.startsWith('titin_domains'),
  annotations: (n) => n === 'annotations' || n.startsWith('annotation_'),
});

export const COMPONENT_COLOR = Object.freeze({
  thick_filament: 0x4e79a7,
  // Phase 7b: heads share the thick filament's hue family so they read as part of
  // the same structure, lightened so the crown array is distinguishable from the
  // backbone cylinder it projects from.
  myosin_head: 0x79a9dc,
  thin_filament: 0x4fb39f,
  zdisc: 0x8794a3,
  mline: 0xa27c95,
  titin: 0xff5d7d,
  titin_neighbour: 0xa43d5c,
  // Selection is an interaction channel, never an evidence channel. Opacity
  // continues to encode confidence while colour temporarily identifies one region.
  titin_highlight: 0xffb0c0,
  titin_dim: 0x6f2e40,
  lattice_guide: 0x556070,
  annotation: 0xe6edf5,
});

/**
 * SC-2 presentation hierarchy. These are colour-only alternatives for Guided
 * mode: evidence opacity, geometry, metadata and visibility remain untouched.
 */
export const GUIDED_COMPONENT_COLOR = Object.freeze({
  thick_filament: 0x26384b,
  myosin_head: 0x3b5368,
  thin_filament: 0x3b514b,
  zdisc: 0x343b45,
  mline: 0x2b2530,
  lattice_guide: 0x3c4653,
});

/** Render-width decisions only; neither value is a molecular diameter. */
export const TITIN_RENDER_STYLE = Object.freeze({
  guided_radius_scale: 1.65,
  disordered_radius_scale: 0.58,
  continuity_opacity: 0.96,
});

/** Resolve an evidence string (which may carry a parenthetical) to a style. */
export function evidenceStyle(evidence) {
  if (!evidence) return EVIDENCE_STYLE.INFERRED;
  const up = String(evidence).toUpperCase();
  const key = Object.keys(EVIDENCE_STYLE)
    .sort((a, b) => b.length - a.length)
    .find((k) => up.startsWith(k));
  // No prefix matched: fall back rather than index with undefined. An unrecognised
  // label must not silently render as the most confident style.
  if (!key) return EVIDENCE_STYLE.INFERRED;
  return EVIDENCE_STYLE[key] || EVIDENCE_STYLE.INFERRED;
}

export class SarcomereScene {
  /**
   * @param {object} opts
   *   `scene` — an existing THREE.Scene to populate (one is created otherwise).
   */
  constructor(opts = {}) {
    this.scene = opts.scene || new THREE.Scene();
    this.root = new THREE.Group();
    this.root.name = 'sarcomere';
    this.scene.add(this.root);
    this.disposables = new Set();
    /** Populated by build(): a machine-readable audit of what was drawn. */
    this.manifest = null;
    this._built = false;
  }

  _material(color, evidence) {
    const st = evidenceStyle(evidence);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: st.roughness,
      metalness: 0.05,
      transparent: st.opacity < 1,
      opacity: st.opacity,
    });
    this.disposables.add(mat);
    return mat;
  }

  _track(geom) {
    // A Set, not an array: one archetype geometry is now shared by several
    // InstancedMeshes (one per evidence class), and dispose() must run once per
    // resource, not once per user of it.
    this.disposables.add(geom);
    return geom;
  }

  /**
   * A filament as an X-aligned cylinder.
   * `startNm`/`endNm` come from the descriptor; the centre and length are
   * derived from them so the mesh cannot disagree with the descriptor's extent.
   */
  _filament(startNm, endNm, radiusNm, color, evidence, name, offset = { y: 0, z: 0 }) {
    const len = endNm - startNm;
    const geom = this._track(new THREE.CylinderGeometry(radiusNm, radiusNm, len, 16, 1));
    const mesh = new THREE.Mesh(geom, this._material(color, evidence));
    mesh.rotation.z = Math.PI / 2;                 // Y-aligned -> X-aligned
    mesh.position.set(startNm + len / 2, offset.y, offset.z);
    mesh.name = name;
    return mesh;
  }

  /**
   * Repeated filaments as a single InstancedMesh (MASTER_PLAN: InstancedMesh for
   * repeated filaments). One draw call for the whole lattice patch.
   */
  _filamentInstances(sites, startNm, endNm, radiusNm, color, evidence, name) {
    const len = endNm - startNm;
    const geom = this._track(new THREE.CylinderGeometry(radiusNm, radiusNm, len, 12, 1));
    const mesh = new THREE.InstancedMesh(geom, this._material(color, evidence), sites.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    const s = new THREE.Vector3(1, 1, 1);
    sites.forEach((site, i) => {
      m.compose(new THREE.Vector3(startNm + len / 2, site.y, site.z), q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = name;
    return mesh;
  }

  /** Z-disc / M-line as a simple box mesh spanning the lattice patch. */
  _slab(centreXNm, widthXNm, extentNm, color, evidence, name) {
    const geom = this._track(new THREE.BoxGeometry(widthXNm, extentNm, extentNm));
    const mesh = new THREE.Mesh(geom, this._material(color, evidence));
    mesh.position.set(centreXNm, 0, 0);
    mesh.name = name;
    return mesh;
  }

  /**
   * A titin path as a tube through the points the descriptor supplies.
   *
   * A CatmullRom curve is used rather than straight segments because titin's
   * elastic regions are worm-like chains, not hinged rods; a smooth path is the
   * honest rendering of an unresolved conformation. The tube radius is a render
   * width (SCHEMATIC) and never implies a measured molecular diameter.
   *
   * @param {Array<{x:number,y?:number,z?:number}>} points
   * @param {number} radiusNm
   * @param {number} color
   * @param {string} evidence
   * @param {string} name
   * @param {number} [tubularSegments]
   * @param {[number, number]|null} [axialRange]
   */
  _titinTube(points, radiusNm, color, evidence, name, tubularSegments, axialRange = null) {
    const pts = points.map((p) => new THREE.Vector3(p.x, p.y ?? 0, p.z ?? 0));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
    const segs = tubularSegments ?? Math.max(24, pts.length * 6);
    const geom = this._track(new THREE.TubeGeometry(curve, segs, radiusNm, 8, false));
    if (axialRange) {
      // A tube's end ring is perpendicular to the curve tangent. If that tangent
      // is oblique, the schematic radius can otherwise make the *surface* cross
      // the canonical X boundary even though the centreline endpoint is exact.
      // Clamp only that render-width overhang, producing a planar colour boundary
      // at the authoritative Level-0 interval without moving the path or domains.
      const [startNm, endNm] = axialRange;
      const positions = geom.getAttribute('position');
      for (let i = 0; i < positions.count; i += 1) {
        positions.setX(i, THREE.MathUtils.clamp(positions.getX(i), startNm, endNm));
      }
      positions.needsUpdate = true;
      geom.computeVertexNormals();
    }
    const mesh = new THREE.Mesh(geom, this._material(color, evidence));
    mesh.name = name;
    return mesh;
  }

  /**
   * Exact Level-0 centreline for one canonical segment. This screen-readable
   * trace is deliberately a Line rather than a biological mesh: it cannot move
   * the tube, domains or any source-backed coordinate.
   */
  _titinContinuityTrace(segment) {
    const geometry = this._track(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(segment.X_start, 0, 0),
      new THREE.Vector3(segment.X_end, 0, 0),
    ]));
    const material = new THREE.LineBasicMaterial({
      color: COMPONENT_COLOR.titin_highlight,
      transparent: true,
      opacity: TITIN_RENDER_STYLE.continuity_opacity,
      depthTest: false,
      depthWrite: false,
    });
    this.disposables.add(material);
    const line = new THREE.Line(geometry, material);
    line.name = `titin_continuity_trace_${segment.region_id}`;
    line.renderOrder = 12;
    line.userData.titin_trace_region = segment.region_id;
    line.userData.base_color = COMPONENT_COLOR.titin_highlight;
    line.userData.coordinate_basis = 'exact canonical Level-0 segment endpoints';
    return line;
  }

  /**
   * Control points for one canonical titin region on one transverse strand.
   * Endpoints come from the Level-0 backbone; interior points come from Level 1.
   * Splitting the previously monolithic tube at real region boundaries is what
   * makes region highlighting possible without inventing geometry.
   */
  _titinRegionPath(domains, segment, off, aBandStartNm) {
    const at = (x, y = 0, z = 0) => {
      const f = x >= aBandStartNm ? 1 : x / aBandStartNm;
      return {
        x,
        y: (off.y || 0) * f + y,
        z: (off.z || 0) * f + z,
      };
    };
    const regionPoints = domains.instances
      .filter((d) => d.domain_id.split('.')[0] === segment.region_id)
      .map((d) => at(d.position_nm.x, d.position_nm.y || 0, d.position_nm.z || 0));
    const points = [at(segment.X_start), ...regionPoints, at(segment.X_end)]
      .sort((a, b) => a.x - b.x);
    // Duplicate endpoints can produce zero-length CatmullRom spans. Preserve the
    // first point at each X; transverse coordinates are identical at boundaries.
    return points.filter((point, i) => i === 0 || Math.abs(point.x - points[i - 1].x) > 1e-9);
  }

  /**
   * Phase 7b — myosin head pairs as ONE InstancedMesh across all crown levels of
   * all thick filaments in the patch.
   *
   * Heads originate at the BACKBONE SURFACE and point outward: the head-tail
   * junction sits on the surface, and a rod starting at the filament axis would
   * depict myosin rods radiating from the centre, which is wrong morphology.
   *
   * LOD is a scientific requirement, not a performance tweak. The depiction
   * policy's resolvability_table records the crown spacing as 14.44 nm; below
   * ~2 px on screen the array aliases into a moire pattern that reads as a
   * periodicity the filament does not have. The caller passes the view width and
   * heads are omitted — and the omission recorded in the manifest — when the
   * spacing would not resolve.
   */
  /**
   * Myosin crossbridges as the measured TWO-segment skeleton.
   *
   * The first Phase 7b pass drew one capsule per head pointing radially outward.
   * That was wrong (followup_register PH7B-1): 8G4L shows an S2 segment leaving the
   * backbone at ~14 deg to the FILAMENT AXIS and a motor domain angled a further
   * ~17 deg, giving the standard angled-crossbridge silhouette rather than a spike.
   *
   * Geometry supplies each head as three nodes (base -> joint -> tip). This method
   * draws them, and does not decide the angles: two capsules per head, each placed
   * by orienting a unit-Y capsule onto the node-to-node vector. Two InstancedMeshes
   * are returned in a Group because S2 and the motor domain have different radii,
   * and one InstancedMesh has one geometry.
   */
  _crownHeads(crownsByFilament, sites, name) {
    const nHeads = crownsByFilament.reduce(
      (n, c) => n + c.levels.reduce((k, l) => k + l.heads.length, 0), 0,
    );
    if (nHeads === 0) return null;
    const h0 = crownsByFilament[0].levels[0].heads[0];

    // ONE material shared by both segments: they are the same molecule and the
    // draw-call budget counts materials, so allocating one per segment would double
    // the head layer's material count for no visual difference.
    const headMat = this._material(COMPONENT_COLOR.myosin_head || 0xb04a4a, 'MEASURED');
    // Built at TRUE length: CapsuleGeometry's `length` argument is the CYLINDER body,
    // and the two hemispherical caps add `radius` at each end, so the body is
    // length - 2*radius for a capsule whose total axial extent is `length`. Floored
    // so a segment shorter than its own diameter degenerates to a sphere rather than
    // inverting.
    const seg = (radius, length, count) => new THREE.InstancedMesh(
      this._track(new THREE.CapsuleGeometry(
        radius, Math.max(length - 2 * radius, 1e-3), 4, 6,
      )), headMat, count,
    );
    const s2Mesh = seg(h0.s2.radius_nm, h0.s2.length_nm, nHeads);
    const motorMesh = seg(h0.motor.width_nm / 2, h0.motor.long_axis_nm, nHeads);

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const ONE = new THREE.Vector3(1, 1, 1);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const v = new THREE.Vector3();
    let i = 0;

    // Place one capsule spanning node p -> node r. The capsule's cylindrical body is
    // scaled to the span; its hemispherical caps keep their radius, so a joint between
    // two segments closes without a visible gap.
    // Rotation and translation ONLY — no scaling. Scaling a CapsuleGeometry along Y
    // stretches its hemispherical caps as well as its body, so a capsule built at
    // unit length and scaled to L ends up spanning L*(1+2r) instead of L: it
    // overshot the measured S2 length by 2.4x. Every head shares the same two
    // segment lengths (they are single measured constants, not per-instance values),
    // so each geometry is built at its true length once and never scaled.
    const place = (mesh, idx, p, r) => {
      a.set(p.X, p.y, p.z);
      b.set(r.X, r.y, r.z);
      v.subVectors(b, a);
      const L = v.length();
      if (L < 1e-6) return;
      mid.addVectors(a, b).multiplyScalar(0.5);
      q.setFromUnitVectors(up, v.divideScalar(L));
      m.compose(mid, q, ONE);
      mesh.setMatrixAt(idx, m);
    };

    crownsByFilament.forEach((crowns, fi) => {
      const site = sites[fi];
      // geometry emits head nodes in the FILAMENT's own frame; shift to the
      // filament's lattice site in the transverse plane
      const at = (nd) => ({ X: nd.X, y: site.y + nd.y, z: site.z + nd.z });
      for (const lvl of crowns.levels) {
        for (const h of lvl.heads) {
          // geometry hands over the two capsule spans explicitly; the motor span is
          // centred on the domain's measured centroid rather than hung off the thin
          // head-tail junction (PH7B-1)
          const [s2A, s2B] = h.draw_nm.s2;
          const [mA, mB] = h.draw_nm.motor;
          place(s2Mesh, i, at(s2A), at(s2B));
          place(motorMesh, i, at(mA), at(mB));
          i += 1;
        }
      }
    });
    s2Mesh.count = i;
    motorMesh.count = i;
    s2Mesh.instanceMatrix.needsUpdate = true;
    motorMesh.instanceMatrix.needsUpdate = true;
    s2Mesh.name = `${name}_s2`;
    motorMesh.name = `${name}_motor`;

    const group = new THREE.Group();
    group.name = name;
    group.add(s2Mesh);
    group.add(motorMesh);
    // callers report head_instances off .count; a Group has none, so expose the
    // head count explicitly rather than letting it read undefined
    group.count = i;
    return group;
  }

  /**
   * Phase 7b — thin-filament long-pitch twist as a pair of helical tubes.
   *
   * TWO strands 180 deg apart, because the long-pitch helix is two-stranded: the
   * crossover repeat is the axial distance between successive points where the
   * strands cross in projection. Individual actin subunits are NOT drawn — the
   * depiction policy DEFERS them to a maximal pass, so this is the twist without
   * the subunit detail, which is the standard illustration convention.
   */
  _thinTwist(twist, sites, name, evidence) {
    const group = new THREE.Group();
    group.name = name;
    const mat = this._material(COMPONENT_COLOR.thin_filament, evidence);
    for (const site of sites) {
      for (const strand of [0, 180]) {
        const pts = twist.samples.map((p) => {
          const a = ((p.azimuth_deg + strand) * Math.PI) / 180;
          const r = twist.samples[0] ? Math.hypot(p.y, p.z) : 1;
          return new THREE.Vector3(p.X_nm, site.y + r * Math.cos(a), site.z + r * Math.sin(a));
        });
        const curve = new THREE.CatmullRomCurve3(pts);
        const geom = this._track(new THREE.TubeGeometry(curve, pts.length, 0.7, 6, false));
        const mesh = new THREE.Mesh(geom, mat);
        mesh.name = `${name}_strand${strand}`;
        group.add(mesh);
      }
    }
    return group;
  }

  /**
   * Build the sarcomere context view.
   *
   * @param {object} scene   GeometryStrategy.sceneAt(sl, {lattice, latticeRings})
   * @param {object} domains model.domainInstancesAt(sl) — supplies the titin path
   * @param {object} opts    { titinStrands, mirror, neighbourTitin }
   *
   * Structure, in the order the plan asks for it: one clear longitudinal
   * sarcomere first (central filaments + Z-disc + M-line + one titin), then the
   * neighbouring structure that communicates genuine 3-D organization (the
   * lattice patch), then the transverse titin strands.
   *
   * MIRRORING: the spec models a HALF sarcomere (Z-disc to M-line); the full
   * repeating unit is that half reflected through the M-line. The mirror is a
   * transform of the same descriptors, never a second set of numbers, so the two
   * halves cannot drift apart. This is a structural fact about sarcomere
   * architecture, not an artistic choice: titin runs Z-disc to M-line and meets
   * its counterpart from the adjacent half there.
   */
  build(scene, domains, opts = {}) {
    this.clear();
    const {
      titinStrands = true, mirror = true, neighbourTitin = false,
      presentationMode = 'evidence',
      // Phase 7b. `contextDetail` is the OPT-IN payload from
      // model.contextDetailSceneAt(); omitting it leaves every pre-7b caller
      // getting exactly the scene it was written against. viewWidthNm is what the
      // camera actually shows, and it drives the aliasing gate — a caller that
      // does not supply it gets the A-band zoom width, at which the crown array
      // resolves, rather than a silently-empty detail layer.
      contextDetail = null, viewWidthNm = 400, viewportPx = 1200,
    } = opts;
    if (!['guided', 'evidence'].includes(presentationMode)) {
      throw new Error(`build: unknown presentationMode '${presentationMode}'.`);
    }
    /**
     * The Phase 7b report. Fields beyond the always-present ones are attached only
     * when the corresponding layer draws or is withheld, so the record is typed as
     * an open map rather than a closed literal.
     * @type {Record<string, any>|null}
     */
    let contextDetailReport = null;

    const find = (id) => scene.sarcomere.find((s) => s.id === id);
    const thick = find('thick_filament');
    const thin = find('thin_filament');
    const zdisc = find('zdisc');
    const mline = find('mline');
    const lat = scene.lattice;

    // Transverse extent of the slabs: the lattice patch if present, otherwise a
    // slab just wide enough to read as a disc against the central filaments.
    const patchExtent = lat
      ? 2 * Math.max(...lat.thick_sites.map((s) => Math.hypot(s.y, s.z)))
        + lat.transform.lattice_constant_nm
      : thick.transform.diameter_nm * 3;

    // Two scopes, and getting them wrong duplicates structure:
    //
    // The criterion is ANCHORING, not whether a component crosses the M-line:
    //
    //   HALF-SCOPED — thin filament, Z-disc, titin. Each is anchored in ONE
    //     Z-disc and has a distinct counterpart anchored in the other. These are
    //     mirrored. A half-scoped component MAY extend past the M-line: the thin
    //     filament has an SL-invariant length (1050 nm), so below SL~2150 nm the
    //     pointed ends from opposite halves interdigitate past the M-line. That
    //     double overlap is real physiology — it underlies the ascending limb of
    //     the length-tension relation — so mirroring correctly produces two
    //     overlapping thin filaments rather than one clipped filament.
    //
    //   SARCOMERE-SCOPED — thick filament and M-line. The thick filament
    //     descriptor spans the FULL A-band (300 to 1900 nm at SL=2200), centred
    //     exactly on the M-line, because the A-band is ONE continuous filament
    //     shared by both halves. Mirroring it would draw a second filament
    //     coincident with the first. The M-line likewise sits on the mirror
    //     plane. These are drawn once, outside the mirrored group.
    //
    // Scope is verified at runtime rather than trusted: the test is whether a
    // component is symmetric about the M-line (shared) or anchored at a Z-disc
    // (half-scoped), since a future spec change could move one between scopes.
    const half = new THREE.Group();
    half.name = 'half_sarcomere';
    const shared = new THREE.Group();
    shared.name = 'shared_across_halves';

    const mlineX = mline.transform.position_nm;
    // Shared: centred on the mirror plane, so mirroring maps it onto itself.
    const symmetricAboutMline = (t) => Math.abs((t.start_nm + t.end_nm) / 2 - mlineX) < 1e-6;
    if (!symmetricAboutMline(thick.transform)) {
      throw new Error('thick filament is no longer centred on the M-line '
        + `(centre ${((thick.transform.start_nm + thick.transform.end_nm) / 2).toFixed(2)} vs `
        + `M-line ${mlineX}): the half/shared scope split is invalid for this spec.`);
    }
    // Half-scoped: anchored at the Z-disc this half belongs to.
    if (symmetricAboutMline(thin.transform)) {
      throw new Error('thin filament is centred on the M-line — it is no longer '
        + 'Z-disc-anchored and cannot be mirrored as a half-scoped component.');
    }
    const thinCrossesMline = thin.transform.end_nm > mlineX + 1e-9;

    // ---- one clear longitudinal sarcomere: the central filaments ----
    shared.add(this._filament(
      thick.transform.start_nm, thick.transform.end_nm,
      thick.transform.diameter_nm / 2,
      COMPONENT_COLOR.thick_filament, thick.evidence, 'thick_filament_central',
    ));
    half.add(this._filament(
      thin.transform.start_nm, thin.transform.end_nm,
      thin.transform.diameter_nm / 2,
      COMPONENT_COLOR.thin_filament, thin.evidence, 'thin_filament_central',
      lat ? lat.thin_sites[0] : { y: 0, z: 0 },
    ));

    // ---- Z-disc and M-line as simple meshes ----
    // The Z-disc straddles X=0 (its centre is the coordinate origin) whereas the
    // M-line sits AT the half-sarcomere end; both widths come from descriptors.
    half.add(this._slab(
      zdisc.transform.position_nm, zdisc.transform.width_nm, patchExtent,
      COMPONENT_COLOR.zdisc, zdisc.evidence, 'zdisc',
    ));
    // The M-line is NOT added to `half`: it sits exactly on the mirror plane and
    // is a single structure shared by both half-sarcomeres. Mirroring the half
    // would place a second coincident slab there — doubling the transparency and
    // implying two M-lines where there is one. It is added once, below.

    // ---- neighbouring structure: the lattice patch, as InstancedMesh ----
    let latticeCounts = null;
    if (lat) {
      // The central filament is drawn individually above, so it is excluded here
      // to avoid two meshes occupying the same coordinates.
      const others = lat.thick_sites.filter((s) => Math.hypot(s.y, s.z) > 1e-9);
      const thinOthers = lat.thin_sites.slice(1);
      shared.add(this._filamentInstances(
        others, thick.transform.start_nm, thick.transform.end_nm,
        thick.transform.diameter_nm / 2,
        COMPONENT_COLOR.thick_filament, thick.evidence, 'thick_filament_lattice',
      ));
      half.add(this._filamentInstances(
        thinOthers, thin.transform.start_nm, thin.transform.end_nm,
        thin.transform.diameter_nm / 2,
        COMPONENT_COLOR.thin_filament, thin.evidence, 'thin_filament_lattice',
      ));
      // The "+1" counts the individually-drawn central filament. It is asserted
      // rather than assumed: with rings=0 the patch has no complete triangles and
      // therefore no trigonal thin site, so the central thin filament would be
      // drawn at its on-axis axial idealization while the manifest still claimed
      // a lattice thin site. Better to refuse than to miscount.
      if (lat.thin_sites.length === 0) {
        throw new Error('lattice patch contains no trigonal thin sites — a patch '
          + 'this small cannot support the 1:2 arrangement. Use the axial scene '
          + '(sceneAt) instead of a degenerate lattice.');
      }
      latticeCounts = {
        thick_drawn: others.length + 1,
        thin_drawn: thinOthers.length + 1,
        thick_sites: lat.thick_sites.length,
        thin_sites: lat.thin_sites.length,
      };

      // ---- Phase 7b: context detail on the lattice filaments ----
      // Drawn into `half` so the mirror carries it: the crown array is
      // polar (heads point toward the Z-disc on each side), and reflecting the
      // half through the M-line reproduces that polarity for free. Asserting it
      // twice would risk the two halves disagreeing.
      if (contextDetail) {
        const px = (nm) => (viewportPx * nm) / viewWidthNm;
        const crownPx = px(contextDetail.crowns[0]?.crown_spacing_nm ?? 0);
        const crossoverPx = px(contextDetail.twist?.crossover_repeat_nm ?? 0);
        contextDetailReport = {
          // Both the nm value and its screen size: the nm value lets a caller
          // re-evaluate the gate after a camera change without rebuilding, and the
          // px value records what the decision was actually made on.
          crown_spacing_nm: contextDetail.crowns[0]?.crown_spacing_nm ?? null,
          crossover_repeat_nm: contextDetail.twist?.crossover_repeat_nm ?? null,
          crown_spacing_px: Number(crownPx.toFixed(2)),
          crossover_repeat_px: Number(crossoverPx.toFixed(2)),
          alias_threshold_px: ALIAS_THRESHOLD_PX,
          heads_drawn: false,
          twist_drawn: false,
        };
        if (crownPx >= ALIAS_THRESHOLD_PX) {
          const headMesh = this._crownHeads(contextDetail.crowns, lat.thick_sites, 'myosin_heads');
          if (headMesh) {
            half.add(headMesh);
            contextDetailReport.heads_drawn = true;
            contextDetailReport.head_instances = headMesh.count;
          }
        } else {
          contextDetailReport.heads_omitted_because =
            `crown spacing resolves to ${crownPx.toFixed(2)} px, below the `
            + `${ALIAS_THRESHOLD_PX} px aliasing threshold — drawing them would show a `
            + 'moire periodicity the filament does not have';
        }
        if (crossoverPx >= ALIAS_THRESHOLD_PX && contextDetail.twist) {
          half.add(this._thinTwist(contextDetail.twist, lat.thin_sites, 'thin_filament_twist',
            contextDetail.twist.evidence_class));
          contextDetailReport.twist_drawn = true;
        } else if (contextDetail.twist) {
          contextDetailReport.twist_omitted_because =
            `crossover repeat resolves to ${crossoverPx.toFixed(2)} px, below the `
            + `${ALIAS_THRESHOLD_PX} px aliasing threshold`;
        }
      }
    }

    // ---- representative titin paths as tubes ----
    const titinGroup = new THREE.Group();
    titinGroup.name = 'titin';
    const strandOffsets = titinStrands && lat
      ? lat.titin_strands.offsets
      : [{ strand_index: 0, y: 0, z: 0, azimuth_deg: 0, evidence_class: 'SCHEMATIC' }];

    const aBandStart = thick.transform.start_nm;
    const baseTitinRadius = opts.titinTubeRadiusNm ?? thin.transform.diameter_nm / 6;
    const titinRadius = baseTitinRadius
      * (presentationMode === 'guided' ? TITIN_RENDER_STYLE.guided_radius_scale : 1);
    // Domain detail is opt-in per strand: 284 domains x 6 strands x 2 halves is
    // 3408 capsules, which is fine as InstancedMesh but visually unreadable in a
    // context view. Default: domains on the central strand only, tubes elsewhere.
    const domainBatches = opts.domainBatches ?? null;
    const domainStrands = opts.domainStrands ?? (domainBatches ? [0] : []);
    const titinPath = opts.titinPath ?? null;
    const regionDescriptors = new Map(scene.titin.map((region) => [region.id, region]));
    for (const off of strandOffsets) {
      if (domainBatches && domainStrands.includes(off.strand_index)) {
        titinGroup.add(this._domainInstances(domainBatches, off, aBandStart, off.strand_index));
      }
      if (titinPath?.segments?.length) {
        const strand = new THREE.Group();
        strand.name = `titin_strand_${off.strand_index}`;
        for (const segment of titinPath.segments) {
          const descriptor = regionDescriptors.get(segment.region_id);
          const evidence = this._weakestEvidence([
            off.evidence_class || 'SCHEMATIC',
            descriptor?.evidence?.backbone_path || 'SCHEMATIC',
          ]);
          const renderRadiusScale = ['N2A', 'PEVK'].includes(segment.region_id)
            ? TITIN_RENDER_STYLE.disordered_radius_scale : 1;
          const tube = this._titinTube(
            this._titinRegionPath(domains, segment, off, aBandStart),
            titinRadius * renderRadiusScale, COMPONENT_COLOR.titin, evidence,
            `titin_region_${segment.region_id}_strand_${off.strand_index}`,
            undefined,
            [segment.X_start, segment.X_end],
          );
          tube.userData.titin_region = segment.region_id;
          tube.userData.base_color = COMPONENT_COLOR.titin;
          tube.userData.evidence_rendered = evidence;
          tube.userData.render_radius_nm = titinRadius * renderRadiusScale;
          tube.userData.render_radius_scale = renderRadiusScale;
          strand.add(tube);
        }
        // One x-ray trace is enough to make the molecule's continuity explicit.
        // Drawing it on all lattice copies would turn a reading aid into clutter.
        if (off.strand_index === 0) {
          const traces = new THREE.Group();
          traces.name = 'titin_continuity_traces';
          for (const segment of titinPath.segments) {
            traces.add(this._titinContinuityTrace(segment));
          }
          titinGroup.add(traces);
        }
        titinGroup.add(strand);
      } else {
        // Compatibility for direct renderer callers that predate the Level-0
        // path option. The supported Viewer always passes the canonical path.
        const tube = this._titinTube(
          this._titinPath(domains, off, aBandStart),
          titinRadius, COMPONENT_COLOR.titin,
          off.evidence_class || 'SCHEMATIC',
          `titin_strand_${off.strand_index}`,
        );
        titinGroup.add(tube);
      }
    }
    half.add(titinGroup);

    this.root.add(half);

    // ---- the full repeating unit: the half, repeated through the M-line ----
    if (mirror) {
      const mirrored = new THREE.Group();
      mirrored.name = 'half_sarcomere_mirrored';
      mirrored.add(half.clone());
      // A 2-fold ROTATION about the Y axis through the M-line, not a reflection.
      //   rotation: (x,y,z) -> (2*Xm - x,  y, -z)
      //   reflection: (x,y,z) -> (2*Xm - x, y,  z)
      // Both send the half-sarcomere onto the opposite half correctly, because
      // every component here is axially symmetric about the filament axis. The
      // rotation is used because a reflection has determinant -1: it inverts
      // triangle winding, so with back-face culling the entire mirrored half
      // renders inside-out (verified: determinant was -1.000 before this change).
      // The two differ only in the handedness of the titin strand azimuths, which
      // the spec declares UNKNOWN and this model draws six-fold symmetric, so the
      // choice claims nothing either way.
      mirrored.rotation.y = Math.PI;
      mirrored.position.x = 2 * mline.transform.position_nm;
      this.root.add(mirrored);
    }

    // The M-line, drawn once on the shared mirror plane.
    shared.add(this._slab(
      mline.transform.position_nm, mline.transform.width_nm, patchExtent,
      COMPONENT_COLOR.mline, mline.evidence, 'mline',
    ));
    this.root.add(shared);

    this.manifest = {
      sarcomere_length_nm: scene.sarcomere_length_nm,
      units: 'nanometres (1 scene unit = 1 nm)',
      primitives_used: {
        cylinder: ['thick_filament', 'thin_filament'],
        box: ['zdisc', 'mline'],
        tube: ['titin'],
        // Read off the built tree rather than predicted from the inputs: an
        // inventory that disagreed with what was drawn would be worse than none.
        instanced_mesh: [...new Set(
          (() => {
            const names = [];
            this.root.traverse((o) => { if (o.isInstancedMesh) names.push(o.name); });
            return names;
          })(),
        )].sort(),
      },
      // Phase 7b. Present as `null` when the caller did not opt in, and as a
      // record with an `*_omitted_because` string when the layer was requested but
      // the feature would not resolve. Both are auditable states; a missing key
      // would be indistinguishable from a feature that failed to draw.
      context_detail: contextDetailReport,
      domains: domainBatches ? {
        strands_with_domain_detail: domainStrands,
        batches: domainBatches.batches.map((b) => ({
          archetype: b.archetype,
          count: b.count,
          primitive: b.geometry.primitive,
          representative_pdb_id: b.representative_structure?.pdb_id,
          not_claimed: b.geometry.not_claimed,
          // Instances within one archetype can differ in evidence (e.g. Fn3
          // placement is MEASURED where the spec records D-zone periodicity and
          // SCHEMATIC where it does not), so each class is drawn as its own
          // InstancedMesh at its own opacity. Reported here so the split is
          // auditable rather than implied by mesh names.
          by_evidence: b.transforms.reduce((acc, t) => {
            const c = this._weakestEvidence([t.evidence.effective]);
            acc[c] = (acc[c] || 0) + 1;
            return acc;
          }, {}),
        })),
      } : null,
      lattice: latticeCounts,
      // Thin-filament double overlap: below SL ~2150 nm the SL-invariant thin
      // filaments from opposite halves interdigitate past the M-line. Reported
      // because it is a scientifically meaningful state (ascending limb of the
      // length-tension relation), and because a reader seeing two thin filaments
      // cross at the centre should be able to confirm it is intended.
      thin_filament_double_overlap: {
        present: thinCrossesMline,
        overshoot_past_mline_nm: Math.max(0, thin.transform.end_nm - mlineX),
      },
      titin_strands_drawn: strandOffsets.length,
      titin_regions: scene.titin.map((region) => ({
        id: region.id,
        band: region.band,
        mechanical_class: region.mechanical_class,
      })),
      highlighted_titin_region: /** @type {string|null} */ (null),
      presentation_overlay: {
        continuity_trace: titinPath?.segments?.length ? {
          segments: titinPath.segments.map((segment) => ({
            region_id: segment.region_id,
            X_start: segment.X_start,
            X_end: segment.X_end,
          })),
          coordinate_basis: 'exact canonical Level-0 segment endpoints',
          render_only: true,
        } : null,
        region_radius_scale: {
          guided_all_regions: presentationMode === 'guided'
            ? TITIN_RENDER_STYLE.guided_radius_scale : 1,
          N2A: TITIN_RENDER_STYLE.disordered_radius_scale,
          PEVK: TITIN_RENDER_STYLE.disordered_radius_scale,
          not_claimed: 'molecular diameter or polymer cross-section',
        },
      },
      mirrored: mirror,
      neighbour_titin: neighbourTitin,
      // Carried through from the descriptors so the render is self-documenting.
      // Component evidence is ALWAYS reported — those components are drawn in
      // every scene, lattice or not. Lattice-specific claims are merged in only
      // when the transverse layer is present, so nothing is claimed that is not
      // on screen. (Previously this was lattice-only, which left the axial view
      // reporting no evidence at all for filaments that plainly have some.)
      evidence: {
        // Components carry PER-CLAIM evidence ({ length: 'MEASURED',
        // primitive_choice: 'SCHEMATIC', … }). Flattening each component to a
        // single class would discard exactly the distinction the spec is careful
        // about — that a filament's length is measured while its cylindrical
        // shape is schematic — so each claim is reported as "component.claim".
        ...Object.fromEntries(
          [...scene.sarcomere, ...scene.titin]
            .filter((c) => c.evidence && c.id !== 'lattice')
            .flatMap((c) => Object.entries(c.evidence)
              .map(([claim, cls]) => [`${c.id}.${claim}`, cls])),
        ),
        ...(lat ? lat.provenance.evidence_by_claim : {}),
      },
      not_claimed: lat
        ? lat.provenance.not_claimed
        // Without the transverse layer the scene is an explicitly axial
        // idealization, and saying nothing is not claimed would be the stronger
        // (and false) statement.
        : ['transverse filament arrangement (single filament pair drawn on-axis)',
          'interfilament spacing', 'titin copy number per thick filament',
          'radial position of titin on the filament surface'],
      render_only: [
        'titin tube radius (render width, not a molecular diameter)',
        lat
          ? 'Z-disc / M-line transverse extent (drawn to span the lattice patch)'
          : 'Z-disc / M-line transverse extent (drawn to a nominal width)',
        'radial titin path through the I-band (no thick filament to follow there)',
        'smooth CatmullRom interpolation between domain positions',
        'SC-2 continuity trace (exact Level-0 centreline; screen-readable overlay)',
        'reduced N2A/PEVK tube radius (visual distinction, not molecular diameter)',
      ],
    };
    this._built = true;
    return this.root;
  }

  /**
   * Add small Three.js anchor markers for biological annotations.
   *
   * Text remains in the accessible HTML panel; each world-space marker carries
   * the complete descriptor in userData so a future picking layer can expose the
   * same wording without inventing a second annotation record.
   *
   * @param {Array<{id:string,anchor_nm:{x:number,y:number,z:number}}>} annotations
   */
  setAnnotations(annotations) {
    if (!this._built) throw new Error('setAnnotations: nothing built yet.');
    const previous = this.root.getObjectByName('annotations');
    if (previous) this.root.remove(previous);
    const group = new THREE.Group();
    group.name = 'annotations';
    for (const annotation of annotations) {
      const material = new THREE.SpriteMaterial({
        color: COMPONENT_COLOR.annotation,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
        // World-unit sizing made a harmless overview marker expand into an
        // 80+ px square during region focus, obscuring the structure it labels.
        // Anchors remain model coordinates; only marker footprint is screen-space.
        sizeAttenuation: false,
      });
      this.disposables.add(material);
      const marker = new THREE.Sprite(material);
      marker.name = `annotation_${annotation.id}`;
      marker.position.set(
        annotation.anchor_nm.x,
        annotation.anchor_nm.y,
        annotation.anchor_nm.z,
      );
      marker.scale.setScalar(ANNOTATION_SCREEN_SCALE);
      marker.renderOrder = 10;
      marker.userData.annotation = annotation;
      group.add(marker);
    }
    this.root.add(group);
    if (this.manifest) {
      this.manifest.annotations = {
        count: annotations.length,
        ids: annotations.map((annotation) => annotation.id),
        marker_geometry: 'fixed-size screen-space Three.js Sprite anchors; text in accessible HTML',
      };
    }
    return group;
  }

  /**
   * Axial path of one titin strand, offset onto its lattice radius.
   *
   * In the A-band titin lies on the thick-filament surface, so the strand sits
   * at the offset the lattice layer computed. In the I-band there is no thick
   * filament to follow and the real radial path is unresolved, so the offset is
   * tapered linearly to zero at the Z-disc. That taper is declared render-only
   * in the manifest — it exists to avoid drawing titin floating in empty space
   * at a radius no measurement supports, not to assert a path.
   */
  _titinPath(domains, off, aBandStartNm) {
    const pts = domains.instances.map((d) => {
      const x = d.position_nm.x;
      const f = x >= aBandStartNm ? 1 : x / aBandStartNm;   // taper across the I-band
      return {
        x,
        y: (off.y || 0) * f + (d.position_nm.y || 0),
        z: (off.z || 0) * f + (d.position_nm.z || 0),
      };
    });
    return pts.sort((a, b) => a.x - b.x);
  }

  /**
   * Folded domains as one InstancedMesh per archetype (MASTER_PLAN Phase 7:
   * InstancedMesh for repeated domains).
   *
   * Batching by ARCHETYPE rather than by region is what makes this correct as
   * well as fast: every instance in a batch shares one geometry, and the plan
   * guarantees the archetype is never deformed (`scale_policy`: length
   * differences are expressed as spacing, not scale). So a single geometry per
   * archetype is not an optimization that loses information — it is the honest
   * encoding of the claim that these domains are copies of one fold.
   *
   * @param {object} batchesResult model.instancing.batchesAt(sl)
   * @param {object} strandOffset  the strand's transverse offset (see _titinPath)
   * @param {number} aBandStartNm  taper reference for the I-band radial path
   */
  _domainInstances(batchesResult, strandOffset, aBandStartNm, strandIndex) {
    const group = new THREE.Group();
    group.name = `titin_domains_strand_${strandIndex}`;
    for (const batch of batchesResult.batches) {
      const g = batch.geometry;
      // ONE geometry per archetype, shared by every sub-batch below: the shape
      // claim is per-archetype, and the plan guarantees it is never deformed.
      const geom = this._track(this._archetypeGeometry(g));

      // A single mesh renders one opacity, so it can carry only one evidence
      // class. Rather than collapse the batch to its WEAKEST member — which would
      // draw 121 MEASURED Fn3 domains at SCHEMATIC transparency and understate
      // what is known about them — split the archetype into one InstancedMesh per
      // evidence class. Geometry is still shared, so this costs one extra draw
      // call per class present, not extra memory, and every domain renders at its
      // own confidence.
      const byEvidence = new Map();
      for (const t of batch.transforms) {
        const cls = this._weakestEvidence([t.evidence.effective]);
        if (!byEvidence.has(cls)) byEvidence.set(cls, []);
        byEvidence.get(cls).push(t);
      }

      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const axisY = new THREE.Vector3(0, 1, 0);
      const direction = new THREE.Vector3();
      const one = new THREE.Vector3(1, 1, 1);
      const baseDomainColor = new THREE.Color(COMPONENT_COLOR.titin);
      for (const [evidence, members] of byEvidence) {
        const mesh = new THREE.InstancedMesh(
          // Instance colours carry selection, so the material must be white;
          // Three.js multiplies instanceColor by material.color. Evidence stays on
          // the material's opacity and therefore cannot be promoted by selection.
          geom, this._material(0xffffff, evidence), members.length,
        );
        members.forEach((t, i) => {
          const x = t.position_nm.x;
          // Same I-band taper as the tube path, so domains sit ON their strand.
          const f = x >= aBandStartNm ? 1 : x / aBandStartNm;
          // Capsules/ellipsoids are built Y-long. Align that axis with the full
          // 3D direction emitted by InstancingPlan: earlier code used only the
          // tilt magnitude and silently discarded azimuth, so alternating domains
          // rendered with the same lean even though the continuity audit used
          // opposite leans.
          const tilt = THREE.MathUtils.degToRad(t.rotation.tilt_deg_from_axis || 0);
          const azimuth = THREE.MathUtils.degToRad(t.rotation.azimuth_deg || 0);
          direction.set(
            Math.cos(tilt),
            Math.sin(tilt) * Math.cos(azimuth),
            Math.sin(tilt) * Math.sin(azimuth),
          ).normalize();
          q.setFromUnitVectors(axisY, direction);
          m.compose(
            new THREE.Vector3(
              x,
              (strandOffset.y || 0) * f + (t.position_nm.y || 0),
              (strandOffset.z || 0) * f + (t.position_nm.z || 0),
            ),
            q, one,
          );
          mesh.setMatrixAt(i, m);
          mesh.setColorAt(i, baseDomainColor);
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        // The archetype name is the stable part; the class is a suffix so a
        // caller can still find all meshes for an archetype by prefix.
        mesh.name = byEvidence.size === 1
          ? `domains_${batch.archetype}`
          : `domains_${batch.archetype}__${evidence.replace(/ /g, '_')}`;
        mesh.userData = {
          archetype: batch.archetype,
          count: members.length,
          archetype_total: batch.count,
          primitive: g.primitive,
          preserves: g.preserves,
          not_claimed: g.not_claimed,
          representative_pdb_id: batch.representative_structure?.pdb_id,
          evidence_rendered: evidence,
          instance_regions: members.map((member) => member.region),
          base_color: COMPONENT_COLOR.titin,
        };
        group.add(mesh);
      }
    }
    return group;
  }

  /** Build the archetype primitive named by the descriptor. Vocabulary only. */
  _archetypeGeometry(g) {
    const rLat = g.lateral_diameter_nm / 2;
    if (g.primitive === 'capsule') {
      // Total length must equal axial_length_nm: CapsuleGeometry's `length` is
      // the cylindrical section only, so the two hemispherical caps (2*rLat) are
      // subtracted. Getting this wrong would silently lengthen every domain.
      const cyl = Math.max(1e-6, g.axial_length_nm - 2 * rLat);
      return new THREE.CapsuleGeometry(rLat, cyl, 4, 8);
    }
    if (g.primitive === 'ellipsoid') {
      const geom = new THREE.SphereGeometry(1, 16, 12);
      geom.scale(rLat, g.axial_length_nm / 2, rLat);
      return geom;
    }
    throw new Error(`unsupported archetype primitive "${g.primitive}" — the render `
      + 'vocabulary must be extended deliberately, not guessed at.');
  }

  /**
   * The weakest evidence class present, by the EVIDENCE_STYLE ordering.
   *
   * Matching is by LONGEST prefix so that "STRONGLY INFERRED (…)" resolves to
   * STRONGLY INFERRED and never falls through to the weaker INFERRED — an error
   * that would understate confidence in a whole batch.
   */
  _weakestEvidence(list) {
    const order = ['MEASURED', 'STRONGLY INFERRED', 'MODELED', 'INFERRED', 'SCHEMATIC', 'UNKNOWN'];
    const byLength = [...order].sort((a, b) => b.length - a.length);
    let worst = 0;
    for (const e of list) {
      const up = String(e).toUpperCase();
      const match = byLength.find((k) => up.startsWith(k));
      // An unrecognized label is treated as UNKNOWN rather than silently ignored:
      // an unreadable provenance string is not evidence of confidence.
      const idx = match ? order.indexOf(match) : order.length - 1;
      if (idx > worst) worst = idx;
    }
    return order[worst];
  }

  /**
   * Highlight one biological titin region while retaining evidence opacity.
   *
   * Region tubes have one material each. Folded domains remain batched by
   * archetype/evidence and use InstancedMesh instance colours, so highlighting
   * does not create per-domain meshes or destroy the Phase-5 instancing contract.
   * Passing null clears the selection.
   *
   * @param {string|null} regionId
   */
  setTitinRegionHighlight(regionId) {
    if (!this._built) throw new Error('setTitinRegionHighlight: nothing built yet.');
    const known = (this.manifest?.titin_regions || []).map((region) => region.id);
    if (regionId !== null && !known.includes(regionId)) {
      throw new Error(
        `setTitinRegionHighlight: unknown region '${regionId}'. Known: ${known.join(', ')}`,
      );
    }

    const base = new THREE.Color(COMPONENT_COLOR.titin);
    const highlight = new THREE.Color(COMPONENT_COLOR.titin_highlight);
    const dim = new THREE.Color(COMPONENT_COLOR.titin_dim);
    const active = regionId !== null;
    const result = {
      region_id: regionId,
      highlighted_tubes: 0,
      dimmed_tubes: 0,
      highlighted_domains: 0,
      dimmed_domains: 0,
      highlighted_trace_segments: 0,
      dimmed_trace_segments: 0,
    };

    this.root.traverse((object) => {
      const tubeRegion = object.userData?.titin_region;
      if (tubeRegion && object.material?.color) {
        const selected = active && tubeRegion === regionId;
        object.material.color.copy(active ? (selected ? highlight : dim) : base);
        if (active) {
          if (selected) result.highlighted_tubes += 1;
          else result.dimmed_tubes += 1;
        }
      }

      const traceRegion = object.userData?.titin_trace_region;
      if (traceRegion && object.material?.color) {
        const selected = active && traceRegion === regionId;
        object.material.color.copy(active ? (selected ? highlight : dim) : highlight);
        if (active) {
          if (selected) result.highlighted_trace_segments += 1;
          else result.dimmed_trace_segments += 1;
        }
      }

      const instanceRegions = object.userData?.instance_regions;
      if (!object.isInstancedMesh || !Array.isArray(instanceRegions)) return;
      for (let i = 0; i < instanceRegions.length; i += 1) {
        const selected = active && instanceRegions[i] === regionId;
        object.setColorAt(i, active ? (selected ? highlight : dim) : base);
        if (active) {
          if (selected) result.highlighted_domains += 1;
          else result.dimmed_domains += 1;
        }
      }
      if (object.instanceColor) object.instanceColor.needsUpdate = true;
    });

    this.highlightedTitinRegion = regionId;
    if (this.manifest) this.manifest.highlighted_titin_region = regionId;
    return result;
  }

  /**
   * Emphasize titin for Guided mode using colour alone. Evidence opacity is
   * intentionally never read or written here.
   */
  setPresentationEmphasis(mode) {
    if (!this._built) throw new Error('setPresentationEmphasis: nothing built yet.');
    if (!['guided', 'evidence'].includes(mode)) {
      throw new Error(`setPresentationEmphasis: unknown mode '${mode}'.`);
    }
    const identity = {
      thick_filament: COMPONENT_COLOR.thick_filament,
      myosin_head: COMPONENT_COLOR.myosin_head,
      thin_filament: COMPONENT_COLOR.thin_filament,
      zdisc: COMPONENT_COLOR.zdisc,
      mline: COMPONENT_COLOR.mline,
      lattice_guide: COMPONENT_COLOR.lattice_guide,
    };
    const roleOf = (name) => {
      if (name.startsWith('thick_filament')) return 'thick_filament';
      if (name.startsWith('myosin_heads')) return 'myosin_head';
      if (name.startsWith('thin_filament')) return 'thin_filament';
      if (name === 'zdisc') return 'zdisc';
      if (name === 'mline') return 'mline';
      if (name.startsWith('lattice_guide')) return 'lattice_guide';
      return null;
    };
    let recolored = 0;
    this.root.traverse((object) => {
      const role = roleOf(object.name || '');
      if (!role || !object.material?.color) return;
      object.material.color.set(mode === 'guided' ? GUIDED_COMPONENT_COLOR[role] : identity[role]);
      recolored += 1;
    });
    this.presentationEmphasis = mode;
    if (this.manifest) this.manifest.presentation_emphasis = mode;
    return { mode, recolored_objects: recolored, preserves_evidence_opacity: true };
  }

  /**
   * Set which biological components are visible.
   *
   * Visibility is applied by walking the built tree and matching object names,
   * NOT by rebuilding with different inputs. That distinction matters
   * scientifically: hiding the thick filament must not change where titin's
   * A-band segment is anchored, and re-deriving the scene from a reduced
   * component set would risk exactly that. The geometry is identical; only what
   * is drawn changes.
   *
   * Unknown component names throw. A silently-ignored name would let a caller
   * believe a component was hidden while it was still on screen — the same defect
   * class as a spec directive that no code realises.
   *
   * @param {Record<string, boolean>} visibility component name -> visible
   * @returns {Record<string, number>} objects toggled per component
   */
  setComponentVisibility(visibility) {
    if (!this._built) throw new Error('setComponentVisibility: nothing built yet.');
    const unknown = Object.keys(visibility).filter((k) => !Object.hasOwn(COMPONENTS, k));
    if (unknown.length) {
      throw new Error(
        `setComponentVisibility: unknown component(s) ${unknown.join(', ')}. `
        + `Known components: ${Object.keys(COMPONENTS).join(', ')}`,
      );
    }
    /** @type {Record<string, number>} */
    const touched = {};
    for (const [component, visible] of Object.entries(visibility)) {
      const match = COMPONENTS[component];
      let n = 0;
      this.root.traverse((o) => {
        if (o.name && match(o.name)) { o.visible = visible; n += 1; }
      });
      touched[component] = n;
    }
    this.componentVisibility = { ...(this.componentVisibility || {}), ...visibility };
    return touched;
  }

  /** Which components are currently hidden (empty when everything is drawn). */
  hiddenComponents() {
    return Object.entries(this.componentVisibility || {})
      .filter(([, v]) => v === false).map(([k]) => k);
  }

  /** Remove and dispose everything under the root, leaving it reusable. */
  clear() {
    this.root.clear();
    for (const d of this.disposables) d.dispose?.();
    this.disposables = new Set();
    this.manifest = null;
    this._built = false;
    this.highlightedTitinRegion = null;
    this.presentationEmphasis = null;
  }
}
