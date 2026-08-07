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
 *   simple mesh   -> Z-disc presentation envelope
 *   line loop     -> zero-width M-band midpoint reference
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
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { validateZDiscDetail } from '../geometry/ZDiscDetail.js';
import { validateMBandDetail } from '../geometry/MBandDetail.js';
import { validateMyBPCContext } from '../geometry/MyBPCContext.js';

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

/**
 * SC-5 framing gate for the accessory MyBP-C layer.
 *
 * The reviewed attention budget requires that "Z-disc, M-band, MyBP-C, and
 * molecular-repeat detail appear only in their relevant close-up or expert
 * chapter". The 43 nm stripe spacing resolves even in a whole-sarcomere overview,
 * so the aliasing threshold alone would let the layer decorate the entire A-band
 * of both halves — which reads as "MyBP-C everywhere" rather than as C-zone
 * context. The layer therefore also requires the C-zone to fill at least half the
 * frame, which is true in every A-band-scale close-up and false in the overview
 * and half-sarcomere framings.
 */
export const MYBPC_MIN_VIEW_FRACTION = 0.5;

/**
 * The most a schematic accessory marker may measure relative to the titin tube it
 * sits beside. Subordination is a stated SC-5 gate, so it is clamped structurally
 * rather than left to depend on the caller's default titin render width.
 */
export const MYBPC_MAX_RADIUS_FRACTION_OF_TITIN = 0.75;

/**
 * SC-16. What a presentation envelope renders at once the anchor it encloses is
 * drawn in its own right.
 *
 * The Z-disc slab is 50 nm across and lattice-wide, and its own close-up frames
 * 200 nm. At that range it is not a boundary marker any more, it is a wall in
 * front of the telethonin sandwich, the alpha-actinin connectors and the two
 * opposing titin directions — the entire content of the chapter that camera
 * exists to serve. This value is deliberately BELOW every entry in
 * EVIDENCE_STYLE: opacity encodes confidence, so a subordinated envelope has to
 * sit off the bottom of that scale rather than land on one of its rungs, where
 * it would read as a weaker claim instead of a quieter one. The evidence class
 * itself is never touched — see the ghosting site in build().
 */
export const ENVELOPE_GHOST_OPACITY = 0.14;

/**
 * SC-16.2. How large one domain must render before its measured Cα backbone is
 * drawn instead of the archetype capsule.
 *
 * The capsule is the honest primitive almost everywhere: it preserves axial
 * length and aspect ratio and explicitly claims no surface shape. A backbone is
 * only more informative once a viewer can actually resolve a fold — below that
 * it is a few pixels of noise that costs a hundred-fold more geometry and
 * implies detail the frame cannot show. Twenty times the 2 px aliasing
 * threshold is where a 4 nm domain first spans enough screen for the chain to
 * read as a chain rather than as a smudge; at 1200 px that is a view about
 * 120 nm wide, which the close-up cameras reach and the overview never does.
 *
 * The swap changes the SURFACE only. The backbone is pre-aligned to +Y by
 * scripts/extract_domain_backbones.py, exactly like the capsule, so the
 * instance transform already computed still applies and no position, tilt,
 * azimuth or evidence class moves with it.
 */
export const DOMAIN_BACKBONE_RESOLVE_PX = 40;

/**
 * The Cα trace's rendered radius, as a fraction of the archetype's own measured
 * lateral diameter. A backbone has no thickness of its own — this is a reading
 * width, like TITIN_RENDER_STYLE.trace_px, and taking it from the archetype's
 * measured cross-section means it scales with the fold rather than being a
 * constant the renderer invented.
 */
export const DOMAIN_BACKBONE_RADIUS_FRACTION = 0.09;

/**
 * SC-16. How much of the gap inside a clamp belongs to the molecule being
 * clamped, the rest going to each of the two chains that clamp it.
 *
 * Chapter 4's whole claim is a stoichiometry: two titin N-termini hold one
 * telethonin between them. The descriptor states it by putting the two Z1Z2
 * chains 1.4 nm either side of the telethonin proxy — and the renderer was
 * drawing those chains at a 2.475 nm titin radius and the proxy at 1.5 nm, so
 * all three bodies occupied the same space and the frame showed one rod. The
 * clamped molecule was invisible: measured in the shipped build, none of
 * telethonin's own pixels survived, and hiding titin — not the Z-disc envelope
 * — was what brought it back.
 *
 * This is the SC-15 rule applied to a complex instead of to a chain: a drawn
 * body is never sealed inside the body it is drawn against. Half splits a tight
 * clamp evenly, leaving the three surfaces tangent — what a clamp should look
 * like: they touch, and their identity colours make the boundaries read. It is
 * a ceiling, not a target: where the descriptor already leaves more room than
 * the general render widths need, both bodies keep those widths and nothing is
 * fitted. Render widths only — no coordinate, evidence class or stoichiometry
 * moves.
 */
export const SANDWICH_CLAMPED_RADIUS_FRACTION = 0.5;

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
  alpha_actinin: (n) => n.startsWith('alpha_actinin'),
  telethonin: (n) => n.startsWith('telethonin'),
  mband_crosslinks: (n) => n.startsWith('mband_crosslink'),
  myosin_heads: (n) => n.startsWith('myosin_heads'),
  // SC-5 accessory C-zone context. Its own component so hiding it can be shown to
  // change no titin, filament, overlap, or lattice coordinate.
  mybpc: (n) => n.startsWith('mybpc'),
  // Domain instances are grouped per strand as 'titin_domains_strand_N', but the
  // per-archetype InstancedMeshes inside are named 'domains_<archetype>__<evidence>'.
  // Matching only the group would leave the meshes visible in renderers that walk
  // to leaves, so both are matched.
  titin_domains: (n) => n.startsWith('titin_domains') || n.startsWith('domains_'),
  // The backbone tube ('titin', 'titin_strand_N') but NOT the domain groups.
  titin: (n) => n.startsWith('titin') && !n.startsWith('titin_domains'),
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
  alpha_actinin: 0x38b8c8,
  telethonin: 0xe6edf5,
  mband_crosslink: 0x8d6bc3,
  // SC-0 candidate identity palette. Yellow keeps MyBP-C distinct from both the
  // blue thick-filament family it decorates and the titin family it is not part of.
  mybpc: 0xe2bf45,
  titin: 0xff5d7d,
  titin_neighbour: 0xa43d5c,
  // Selection is an interaction channel, never an evidence channel. Opacity
  // continues to encode confidence while colour temporarily identifies one region.
  titin_highlight: 0xffb0c0,
  titin_dim: 0x6f2e40,
  lattice_guide: 0x556070,
});

/**
 * SC-2 presentation hierarchy. These are colour-only alternatives for Guided
 * mode: evidence opacity, geometry, metadata and visibility remain untouched.
 *
 * SC-12 retuned the two filament families. As shipped they were 1.41 : 1 against
 * each other and the head array was 1.06 : 1 against actin — a hue difference
 * (green-grey against blue-grey) with almost no luminance difference, which is
 * the worst available pair for deuteranopia and vanishes entirely in grayscale.
 * The thick filament was also 1.58 : 1 against the stage, which on a projector
 * with any ambient light is not there at all. Chapter 1 asks the viewer to see
 * titin "beside actin and myosin"; the render was not making that distinction.
 *
 * The fix spends the range BETWEEN the background and titin on two separable
 * steps rather than one flat grey, and it is a change of colour only — opacity
 * still encodes confidence (Global Constraint 7). Against #0e1116: thick
 * filament 1.95 : 1, head array 1.98 : 1, actin 3.45 : 1, with titin left at
 * 6.41 : 1 so the subject keeps the top of the range by a factor of 1.8. Each
 * value is a scaled version of the same identity hue the Evidence palette uses,
 * so switching audience mode dims a colour without redefining it. The crowns
 * cannot also be separated from their own filament by luminance inside that
 * band — they stay distinguished by geometry, as one object with the filament.
 * `data/release_gates.json` → accessibility.object_contrast_pairs records these
 * three ratios and test/showcase_phase12.test.js enforces them.
 */
export const GUIDED_COMPONENT_COLOR = Object.freeze({
  thick_filament: 0x2d4661,
  myosin_head: 0x33475d,
  thin_filament: 0x337467,
  zdisc: 0x343b45,
  mline: 0x2b2530,
  alpha_actinin: 0x2d6470,
  telethonin: 0x8a949f,
  mband_crosslink: 0x4d405a,
  // Present for completeness only: the MyBP-C layer is admitted for Evidence mode,
  // so a Guided build never draws it. A missing entry would set an undefined colour
  // if that ever changed.
  mybpc: 0x5c5230,
  lattice_guide: 0x3c4653,
});

/**
 * SC-10 subject-emphasis channel.
 *
 * `trace_px` is a SCREEN-SPACE width in CSS pixels. It is a reading aid, not a
 * molecular dimension, and it is deliberately independent of the tube radius:
 * inflating the tube would imply a diameter, while a constant-width ribbon
 * makes no dimensional claim at all. Evidence opacity is untouched by every
 * value here — emphasis and confidence stay on separate channels.
 *
 * SC-15 adds the disordered-chain depiction. `coil_amplitude_scale` is a
 * multiple of the same titin render radius, which is already declared not to be
 * a molecular dimension, so the coil makes no dimensional claim either — and it
 * is deliberately below `halo_radius_scale`, so the emphasis envelope always
 * contains the chain it emphasises. `coil_turns` is a ceiling on visual density,
 * and `coil_min_amplitude_nm` is the width below which a wiggle is narrower than
 * the line drawing it and is therefore not drawn at all.
 */
export const TITIN_RENDER_STYLE = Object.freeze({
  guided_radius_scale: 1.65,
  disordered_radius_scale: 0.58,
  continuity_opacity: 0.96,
  trace_px: 4.0,
  trace_px_evidence: 3.0,
  halo_radius_scale: 3.2,
  halo_opacity: 0.16,
  coil_amplitude_scale: 2.6,
  coil_turns: 6,
  coil_min_amplitude_nm: 0.05,
  // Half: a backbone at half a domain's rendered radius leaves the domain
  // standing clearly proud of the chain that carries it, at any zoom, without
  // becoming a hairline that disappears in the overview.
  linker_radius_fraction: 0.5,
  // The two regions titin.json declares as having no folded structure. Named
  // here, once, because both the narrower tube radius and the coil are the same
  // statement about the same two regions — that they are intrinsically
  // disordered — and a second copy of the list could disagree with the first.
  disordered_regions: Object.freeze(['N2A', 'PEVK']),
});

/** Nanometres floored to a picometre, for report values that must not round up. */
const floorPm = (nm) => Math.floor(nm * 1000) / 1000;

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
    /**
     * Screen-space line materials need the renderer size to compute their width,
     * and they early-out of raycasting while the resolution is still zero. The
     * Viewer owns that size, so the scene exposes the set rather than guessing.
     * @type {Set<import('three/addons/lines/LineMaterial.js').LineMaterial>}
     */
    this.screenSpaceLineMaterials = new Set();
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
   * Screen-space line width and Line2 raycasting are both computed from the
   * renderer's pixel size. A material whose resolution is still (0,0) draws at
   * the wrong width AND silently refuses to be picked, so the Viewer calls this
   * after every build and every resize.
   *
   * @param {number} width
   * @param {number} height
   * @returns {{materials_updated: number}}
   */
  setLineResolution(width, height) {
    if (!(width > 0) || !(height > 0)) {
      throw new Error(`setLineResolution: expected a positive size, got ${width}x${height}`);
    }
    for (const material of this.screenSpaceLineMaterials) material.resolution.set(width, height);
    return { materials_updated: this.screenSpaceLineMaterials.size };
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

  /** A Z-disc presentation slab spanning the selected lattice context. */
  _slab(centreXNm, widthXNm, extentNm, color, evidence, name) {
    const geom = this._track(new THREE.BoxGeometry(widthXNm, extentNm, extentNm));
    const mesh = new THREE.Mesh(geom, this._material(color, evidence));
    mesh.position.set(centreXNm, 0, 0);
    mesh.name = name;
    // Published so a later presentation pass can be checked against what the
    // envelope was drawn from. SC-16 lowers this slab's opacity at the close-up,
    // and "the evidence class did not move" is only assertable if the class the
    // material came from is on the object rather than implied by it.
    mesh.userData.evidence_rendered = evidence;
    return mesh;
  }

  /**
   * An exact M-band midpoint reference. Its ring has no axial extent and never
   * borrows the 160 nm thick-filament bare-zone interval as a protein width.
   */
  _mbandMidpoint(centreXNm, thickRadiusNm, evidence) {
    const ringRadius = thickRadiusNm * 1.45;
    const points = Array.from({ length: 64 }, (_, index) => {
      const angle = (2 * Math.PI * index) / 64;
      return new THREE.Vector3(
        centreXNm, ringRadius * Math.cos(angle), ringRadius * Math.sin(angle),
      );
    });
    const geometry = this._track(new THREE.BufferGeometry().setFromPoints(points));
    const style = evidenceStyle(evidence);
    const material = new THREE.LineBasicMaterial({
      color: COMPONENT_COLOR.mline,
      transparent: style.opacity < 1,
      opacity: style.opacity,
      depthWrite: false,
    });
    this.disposables.add(material);
    const line = new THREE.LineLoop(geometry, material);
    line.name = 'mline';
    line.renderOrder = 9;
    line.userData.reference_kind = 'sarcomere_midpoint';
    line.userData.axial_extent_nm = null;
    line.userData.render_only = 'ring radius; zero-width coordinate marker, not M1 density';
    return line;
  }

  /** Variable-length schematic connectors, batched into one InstancedMesh. */
  _segmentInstances(segments, radiusNm, color, evidence, name) {
    if (!segments.length) return null;
    const geometry = this._track(new THREE.CylinderGeometry(radiusNm, radiusNm, 1, 8, 1));
    const mesh = new THREE.InstancedMesh(
      geometry, this._material(color, evidence), segments.length,
    );
    const up = new THREE.Vector3(0, 1, 0);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const v = new THREE.Vector3();
    const middle = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const matrix = new THREE.Matrix4();
    segments.forEach((segment, index) => {
      a.set(segment.start_nm.x, segment.start_nm.y, segment.start_nm.z);
      b.set(segment.end_nm.x, segment.end_nm.y, segment.end_nm.z);
      v.subVectors(b, a);
      const length = v.length();
      if (!(length > 0)) throw new Error(`_segmentInstances: '${segment.id}' has zero length.`);
      middle.addVectors(a, b).multiplyScalar(0.5);
      rotation.setFromUnitVectors(up, v.divideScalar(length));
      matrix.compose(middle, rotation, new THREE.Vector3(1, length, 1));
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = name;
    mesh.userData.segment_ids = segments.map((segment) => segment.id);
    mesh.userData.render_radius_nm = radiusNm;
    return mesh;
  }

  /** Small polarity marker for the antiparallel Z1Z2 sandwich schematic. */
  _directionMarker(marker, sizeNm, color, name) {
    const geometry = this._track(new THREE.ConeGeometry(sizeNm * 0.45, sizeNm, 8));
    const mesh = new THREE.Mesh(geometry, this._material(color, 'SCHEMATIC'));
    const direction = new THREE.Vector3(marker.direction, 0, 0);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    mesh.position.set(marker.at_nm.x, marker.at_nm.y, marker.at_nm.z);
    mesh.name = name;
    mesh.userData.direction = marker.direction;
    return mesh;
  }

  /**
   * The curve a titin path is drawn along.
   *
   * Defined once because it is not the polyline through the descriptor's points:
   * a Catmull-Rom through a corner OVERSHOOTS between the points either side of
   * it. Measuring the polyline instead of this curve is how the Z-disc sandwich
   * came out 0.49 nm from its own axis while the arithmetic said 1.4 nm — the
   * drawn tube and the number describing it have to come from the same object.
   *
   * @param {Array<{x:number,y?:number,z?:number}>} points
   */
  _titinCurve(points) {
    return new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p.x, p.y ?? 0, p.z ?? 0)),
      false, 'catmullrom', 0.4,
    );
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
    const curve = this._titinCurve(points);
    const segs = tubularSegments ?? Math.max(24, points.length * 6);
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
   * SC-15 disordered-chain depiction.
   *
   * A transverse sinusoid between two FIXED endpoints. The amplitude falls as the
   * region approaches its contour length, which is the visual statement "this part
   * is being pulled straight" — the one thing the extension chart asserts and the
   * render never showed. It is SCHEMATIC: no measured conformation exists to draw,
   * and the endpoints, which are canonical, never move.
   *
   * Every sample's X is a convex combination of the two canonical endpoints, so
   * the detour is purely transverse by construction rather than by inspection.
   *
   * @param {Array<{x:number,y?:number,z?:number}>} points  canonical path points
   * @param {{amplitudeNm:number, turns:number}} opts
   * @returns {Array<{x:number,y:number,z:number}>}
   */
  _coilPath(points, { amplitudeNm, turns }) {
    const flat = points.map((p) => ({ x: p.x, y: p.y ?? 0, z: p.z ?? 0 }));
    if (flat.length < 2 || !(amplitudeNm > 0) || !(turns > 0)) return flat;
    const first = flat[0];
    const last = flat[flat.length - 1];
    const span = last.x - first.x;
    if (!(span > 0)) return flat;
    // Six samples per turn is the coarsest spacing at which a CatmullRom through
    // the samples still reads as the sinusoid it was sampled from rather than as
    // a polygon; below that the curve visibly clips its own extrema.
    const SAMPLES = Math.max(48, Math.ceil(turns * 6));
    const out = [];
    for (let i = 0; i <= SAMPLES; i += 1) {
      const t = i / SAMPLES;
      const x = first.x + span * t;
      const baseY = first.y + (last.y - first.y) * t;
      const baseZ = first.z + (last.z - first.z) * t;
      // A raised-cosine envelope pins the ends exactly on the canonical endpoints.
      const envelope = 0.5 * (1 - Math.cos(2 * Math.PI * t));
      const phase = 2 * Math.PI * turns * t;
      out.push({
        x,
        y: baseY + amplitudeNm * envelope * Math.sin(phase),
        z: baseZ + amplitudeNm * envelope * Math.cos(phase) * 0.6,
      });
    }
    // Floating-point drift in `first.x + span * t` must not reach the canonical
    // interval: the endpoints are restated, not recomputed.
    out[0] = { ...first };
    out[out.length - 1] = { ...last };
    return out;
  }

  /**
   * SC-15. How wide a coil one disordered region earns at this state, and how
   * many turns that coil is drawn with.
   *
   * `fraction` is the region's canonical axial span over the contour length the
   * descriptor carries from the spec — the same `max_end2end_nm` the mechanical
   * model uses as Lc. A slack chain (small fraction) has a lot of length to put
   * somewhere and gets a wide coil; a chain near its contour has nowhere left to
   * put it and is drawn essentially straight. Nothing here is a measurement.
   *
   * The turn count is a LEGIBILITY constraint, not a claim: at the resting state
   * N2A holds a 39 nm contour inside a ~5 nm axial span, and a fixed six turns
   * there would put the coil's pitch an order of magnitude below the tube's own
   * diameter, fusing the turns into an opaque bead that reads as a fold — the one
   * thing this region provably is not. The pitch is therefore held at or above
   * one tube diameter, so the turn count follows continuously from the span and
   * what is drawn stays a chain the eye can trace. Continuously, not in steps:
   * the stretch sweep animates through these states, and a turn appearing at a
   * threshold would read as a rendering fault.
   *
   * @param {{X_start:number, X_end:number}} segment  canonical Level-0 interval
   * @param {number|undefined} contourNm  descriptor contour length, if declared
   * @param {{amplitudeBasisNm:number, tubeRadiusNm:number}} render
   * @returns {{amplitudeNm:number, turns:number, fraction:number|null}}
   */
  _disorderedCoil(segment, contourNm, { amplitudeBasisNm, tubeRadiusNm }) {
    const none = { amplitudeNm: 0, turns: 0, fraction: /** @type {number|null} */ (null) };
    const spanNm = segment.X_end - segment.X_start;
    // A descriptor without a declared contour gets no coil at all rather than a
    // guessed one: an invented contour would make the amplitude a claim.
    const contour = typeof contourNm === 'number' ? contourNm : 0;
    if (!(spanNm > 0) || !(contour > 0) || !(amplitudeBasisNm > 0) || !(tubeRadiusNm > 0)) {
      return none;
    }
    const fraction = Math.min(1, spanNm / contour);
    const amplitudeNm = amplitudeBasisNm * TITIN_RENDER_STYLE.coil_amplitude_scale * (1 - fraction);
    if (!(amplitudeNm > TITIN_RENDER_STYLE.coil_min_amplitude_nm)) {
      return { ...none, fraction };
    }
    const turns = THREE.MathUtils.clamp(
      spanNm / (2 * tubeRadiusNm), 1, TITIN_RENDER_STYLE.coil_turns,
    );
    return { amplitudeNm, turns, fraction };
  }

  /**
   * SC-10 emphasis halo: a wider, additively blended shell around the same path.
   *
   * It is a READING AID on the presentation channel. It writes no depth, is never
   * raycast, carries no evidence class, and its radius is a multiple of a render
   * width that is already declared not to be a molecular dimension. Emphasis is
   * therefore expressible without moving a single opacity that encodes confidence.
   *
   * @param {Array<{x:number,y?:number,z?:number}>} points
   * @param {number} radiusNm  the tube radius this halo surrounds
   * @param {string} name
   */
  _titinHalo(points, radiusNm, name) {
    const pts = points.map((p) => new THREE.Vector3(p.x, p.y ?? 0, p.z ?? 0));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
    const geom = this._track(new THREE.TubeGeometry(
      curve, Math.max(24, pts.length * 4),
      radiusNm * TITIN_RENDER_STYLE.halo_radius_scale, 8, false,
    ));
    const material = new THREE.MeshBasicMaterial({
      color: COMPONENT_COLOR.titin_highlight,
      transparent: true,
      opacity: TITIN_RENDER_STYLE.halo_opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    this.disposables.add(material);
    const mesh = new THREE.Mesh(geom, material);
    mesh.name = name;
    mesh.renderOrder = 11;
    mesh.userData.emphasis_channel = 'presentation';
    mesh.userData.render_meaning = 'reading aid around the titin path; not a molecular envelope';
    // Never pickable: the halo is not the molecule.
    return this._unpickable(mesh);
  }

  /**
   * Take one object out of the raycast set without hiding it.
   *
   * `Object3D.prototype.raycast` is a no-op, so an object carrying it is drawn
   * and never hit. The alternative — a layer or `visible = false` — would also
   * stop it being drawn, which is the opposite of what an emphasis object is for.
   *
   * @template {THREE.Object3D} T
   * @param {T} object
   * @returns {T}
   */
  _unpickable(object) {
    object.raycast = THREE.Object3D.prototype.raycast;
    return object;
  }

  /**
   * Re-apply the no-pick rule across a CLONED subtree.
   *
   * `Object3D.copy()` deep-copies userData but not own function properties, and
   * `clone()` rebuilds each node from its class prototype — so the mirrored
   * half's halos come back with `Mesh.prototype.raycast` and become pickable
   * again. A 3.2x-radius shell in front of titin that answers a raycast resolves
   * to no target at all (`pickTarget` has no mapping for it), so it would
   * silently swallow clicks aimed at the molecule it exists to emphasise.
   *
   * userData survives the clone, which is why it is the marker read here rather
   * than the override that did not.
   *
   * @param {THREE.Object3D} root
   * @returns {number} how many objects were restored
   */
  _restoreEmphasisPicking(root) {
    let restored = 0;
    root.traverse((object) => {
      if (object.userData?.emphasis_channel !== 'presentation') return;
      this._unpickable(object);
      restored += 1;
    });
    return restored;
  }

  /**
   * Exact Level-0 AXIAL endpoints for one canonical segment, carried on the
   * representative strand's declared transverse display offset. Keeping this
   * screen-readable trace at y=z=0 while the biological tube sits on the thick-
   * filament surface would falsely depict a second titin through the myosin core.
   * The offset is schematic and changes no source-backed X coordinate.
   */
  _titinContinuityTrace(segment, off, aBandStartNm, presentationMode = 'guided') {
    const at = (x) => {
      const f = x >= aBandStartNm ? 1 : x / aBandStartNm;
      return [x, (off.y || 0) * f, (off.z || 0) * f];
    };
    const geometry = new LineGeometry();
    geometry.setPositions([...at(segment.X_start), ...at(segment.X_end)]);
    this.disposables.add(geometry);
    const material = new LineMaterial({
      color: COMPONENT_COLOR.titin_highlight,
      // CSS pixels: worldUnits stays false (the default) so the ribbon keeps a
      // constant reading width at every camera distance.
      linewidth: presentationMode === 'guided'
        ? TITIN_RENDER_STYLE.trace_px
        : TITIN_RENDER_STYLE.trace_px_evidence,
      transparent: true,
      opacity: TITIN_RENDER_STYLE.continuity_opacity,
      depthTest: false,
      depthWrite: false,
    });
    this.disposables.add(material);
    this.screenSpaceLineMaterials.add(material);
    const line = new Line2(geometry, material);
    line.name = `titin_continuity_trace_${segment.region_id}`;
    line.renderOrder = 12;
    line.userData.titin_trace_region = segment.region_id;
    line.userData.base_color = COMPONENT_COLOR.titin_highlight;
    line.userData.coordinate_basis = 'exact canonical Level-0 axial segment endpoints; '
      + 'schematic representative-strand transverse offset';
    line.userData.a_band_radial_offset_nm = Math.hypot(off.y || 0, off.z || 0);
    line.userData.azimuth_evidence = off.evidence_class || 'SCHEMATIC';
    line.userData.render_width_px = material.linewidth;
    line.userData.render_width_meaning = 'screen-space reading width; not a molecular dimension';
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
    if (!Array.isArray(crownsByFilament) || !Array.isArray(sites)
        || crownsByFilament.length !== sites.length) {
      throw new Error(`_crownHeads: crown/site count mismatch (`
        + `${crownsByFilament?.length ?? 'invalid'} crowns for ${sites?.length ?? 'invalid'} sites).`);
    }
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
      presentationMode = 'evidence', latticeScope = 'patch',
      // Phase 7b. `contextDetail` is the OPT-IN payload from
      // model.contextDetailSceneAt(); omitting it leaves every pre-7b caller
      // getting exactly the scene it was written against. viewWidthNm is what the
      // camera actually shows, and it drives the aliasing gate — a caller that
      // does not supply it gets the A-band zoom width, at which the crown array
      // resolves, rather than a silently-empty detail layer.
      contextDetail = null, anchorDetail = null, mybpcContext = null,
      viewWidthNm = 400, viewportPx = 1200,
    } = opts;
    if (!['guided', 'evidence'].includes(presentationMode)) {
      throw new Error(`build: unknown presentationMode '${presentationMode}'.`);
    }
    if (!['local', 'patch'].includes(latticeScope)) {
      throw new Error(`build: unknown latticeScope '${latticeScope}'. Use 'local' or 'patch'.`);
    }
    if (!(Number.isFinite(viewWidthNm) && viewWidthNm > 0)
        || !(Number.isFinite(viewportPx) && viewportPx > 0)) {
      throw new Error('build: viewWidthNm and viewportPx must be positive finite values.');
    }
    if (anchorDetail) {
      if (anchorDetail.target === 'zdisc') validateZDiscDetail(anchorDetail);
      else if (anchorDetail.target === 'mline') validateMBandDetail(anchorDetail);
      else throw new Error(`build: unknown anchor-detail target '${anchorDetail.target}'.`);
      if (anchorDetail.target === 'mline' && !mirror) {
        throw new Error('build: M-band detail requires mirrored titin from both half-sarcomeres.');
      }
    }
    if (mybpcContext) {
      validateMyBPCContext(mybpcContext);
      // The layer is admitted for Evidence mode only. Refusing here rather than
      // silently skipping keeps a Guided caller's request visible as an error.
      if (!mybpcContext.audience.some((audience) => audience.toLowerCase() === presentationMode)) {
        throw new Error(
          `build: the MyBP-C context layer is admitted for `
          + `${mybpcContext.audience.join('/')} audiences, not '${presentationMode}'.`,
        );
      }
    }
    /**
     * The Phase 7b report. Fields beyond the always-present ones are attached only
     * when the corresponding layer draws or is withheld, so the record is typed as
     * an open map rather than a closed literal.
     * @type {Record<string, any>|null}
    */
    let contextDetailReport = null;
    /** @type {Record<string, any>|null} */
    let anchorDetailReport = null;
    /** @type {Record<string, any>|null} */
    let mybpcReport = null;
    let mybpcResolves = false;
    let anchorDetailResolves = false;
    if (mybpcContext) {
      const featurePx = (viewportPx * mybpcContext.resolvability.feature_nm) / viewWidthNm;
      const cZoneLengthNm = mybpcContext.c_zone.length_nm;
      const cZoneViewFraction = cZoneLengthNm / viewWidthNm;
      const resolvable = featurePx >= ALIAS_THRESHOLD_PX;
      const framed = cZoneViewFraction >= MYBPC_MIN_VIEW_FRACTION;
      mybpcResolves = resolvable && framed;
      mybpcReport = {
        drawn: false,
        c_zone_length_nm: cZoneLengthNm,
        c_zone_view_fraction: Number(cZoneViewFraction.toFixed(3)),
        min_view_fraction: MYBPC_MIN_VIEW_FRACTION,
        claim_id: mybpcContext.claim_id,
        evidence_class: mybpcContext.evidence_class,
        placement_evidence_class: mybpcContext.placement_evidence_class,
        audience: [...mybpcContext.audience],
        default_visible: mybpcContext.default_visible,
        part_of_titin: false,
        titin_contact_rendered: false,
        rigid_thick_to_thin_bridge_rendered: false,
        reaches_thin_filament: false,
        cardiac_coordinates_imported: false,
        feature: mybpcContext.resolvability.feature,
        feature_nm: mybpcContext.resolvability.feature_nm,
        feature_px: Number(featurePx.toFixed(2)),
        alias_threshold_px: ALIAS_THRESHOLD_PX,
        // Both reasons are reported separately: "too small to resolve" and "you are
        // not looking at the C-zone" are different facts about the same withdrawal.
        ...(mybpcResolves ? {} : {
          omitted_because: !resolvable
            ? `${mybpcContext.resolvability.feature} resolves to ${featurePx.toFixed(2)} px, `
              + `below the ${ALIAS_THRESHOLD_PX} px aliasing threshold`
            : `the C-zone fills ${(cZoneViewFraction * 100).toFixed(0)}% of the view, below the `
              + `${MYBPC_MIN_VIEW_FRACTION * 100}% needed for accessory C-zone detail`,
        }),
      };
    }
    if (anchorDetail) {
      const anchorResolvability = anchorDetail.resolvability[presentationMode]
        ?? anchorDetail.resolvability;
      if (!(Number.isFinite(anchorResolvability?.feature_nm)
          && anchorResolvability.feature_nm > 0) || !anchorResolvability.feature) {
        throw new Error(`build: ${anchorDetail.target} detail has no ${presentationMode} resolvability record.`);
      }
      const anchorFeaturePx = (viewportPx * anchorResolvability.feature_nm) / viewWidthNm;
      anchorDetailReport = {
        target: anchorDetail.target,
        drawn: false,
        evidence_class: anchorDetail.evidence_class,
        feature: anchorResolvability.feature,
        feature_nm: anchorResolvability.feature_nm,
        feature_render_only: Boolean(anchorResolvability.render_only),
        // Rounded only for reporting. The gate uses the unrounded value, so a
        // 1.996 px feature cannot be promoted to 2.00 px and admitted accidentally.
        feature_px: Number(anchorFeaturePx.toFixed(2)),
        alias_threshold_px: ALIAS_THRESHOLD_PX,
        // SC-16. Always present, so the audit record distinguishes "nothing
        // needed subordinating at this anchor" from "the step never ran".
        envelope_ghosted: false,
      };
      anchorDetailResolves = anchorFeaturePx >= ALIAS_THRESHOLD_PX;
    }

    const find = (id) => scene.sarcomere.find((s) => s.id === id);
    const thick = find('thick_filament');
    const thin = find('thin_filament');
    const zdisc = find('zdisc');
    const mline = find('mline');
    const lat = scene.lattice;

    if (lat && lat.thin_sites.length === 0) {
      throw new Error('lattice patch contains no trigonal thin sites — a patch '
        + 'this small cannot support the 1:2 arrangement. Use the axial scene '
        + '(sceneAt) instead of a degenerate lattice.');
    }

    // The promoted context view answers one question: where is titin relative to
    // its immediate contractile-filament neighbours? A central thick filament has
    // six equidistant nearest thin filaments in the hexagonal lattice. Keep exactly
    // those six in `local`; the complete descriptor patch remains available in
    // Evidence mode as `patch`. Sorting makes the selection independent of the
    // lattice generator's site enumeration when callers provide a larger patch.
    const localThinSites = lat
      ? [...lat.thin_sites]
        .sort((a, b) => Math.hypot(a.y, a.z) - Math.hypot(b.y, b.z))
        .slice(0, 6)
      : [];
    const drawnThinSites = lat && latticeScope === 'local' ? localThinSites : lat?.thin_sites;
    const centralThickSites = lat
      ? lat.thick_sites.filter((site) => Math.hypot(site.y, site.z) < 1e-9)
      : [];
    if (lat && latticeScope === 'local'
        && (localThinSites.length !== 6 || centralThickSites.length !== 1)) {
      throw new Error('local lattice context requires one central thick site and '
        + `six nearest thin sites; received ${centralThickSites.length} and ${localThinSites.length}.`);
    }

    // Transverse extent of the slabs: the lattice patch if present, otherwise a
    // slab just wide enough to read as a disc against the central filaments.
    const patchExtent = lat && latticeScope === 'local'
      ? 2 * Math.max(...localThinSites.map((s) => Math.hypot(s.y, s.z)))
        + 2 * thin.transform.diameter_nm
      : lat
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
      lat ? drawnThinSites[0] : { y: 0, z: 0 },
    ));

    // ---- Z-disc context and M-band midpoint reference ----
    // The Z-disc slab remains a presentation envelope. In its own close-up it is
    // ghosted so the supported local topology stays readable instead of appearing
    // buried inside an opaque universal plate.
    //
    // This changes the OPACITY OF A PRESENTATION ENVELOPE, not an evidence class:
    // userData.evidence_rendered is deliberately left alone, the material's colour
    // is untouched, and the manifest records that the change happened. It is
    // applied here, where the mesh is in hand, rather than by traversing the tree
    // from the anchor-detail branch below — at that point `half` has not been
    // added to `this.root` yet, so a traversal would silently find nothing and
    // report a ghosting that never occurred.
    //
    // The opacity is SET, not scaled. The previous form multiplied the evidence
    // opacity by 0.35, which left a 0.82 envelope at 0.287 — and a 0.287 slab has
    // a front face and a back face, so roughly half the light from the anchor
    // still never arrives. That is a dimmed wall, not a ghost, which is what the
    // shipped close-up showed. Scaling also tied the result to the evidence class:
    // a spec edit that raised the envelope's confidence would have made the
    // close-up more occluded, which is the evidence contract running backwards.
    // `transparent` and `depthWrite` are set explicitly rather than inherited from
    // _material(), so a future change to the base style cannot quietly restore an
    // occluder underneath a ghosted opacity.
    const zdiscMesh = this._slab(
      zdisc.transform.position_nm, zdisc.transform.width_nm, patchExtent,
      COMPONENT_COLOR.zdisc, zdisc.evidence, 'zdisc',
    );
    if (anchorDetail?.target === 'zdisc' && anchorDetailResolves) {
      if (!anchorDetailReport) throw new Error('build: missing Z-disc detail report.');
      zdiscMesh.material.transparent = true;
      zdiscMesh.material.opacity = ENVELOPE_GHOST_OPACITY;
      zdiscMesh.material.depthWrite = false;
      zdiscMesh.userData.presentation_muted_for_detail = true;
      zdiscMesh.userData.envelope_ghosted = true;
      anchorDetailReport.envelope_ghosted = true;
    }
    half.add(zdiscMesh);
    // The midpoint marker is sarcomere-scoped and therefore drawn once below.

    // ---- neighbouring structure: the lattice patch, as InstancedMesh ----
    let latticeCounts = null;
    if (lat) {
      // The central filament is drawn individually above, so it is excluded here
      // to avoid two meshes occupying the same coordinates.
      const others = latticeScope === 'patch'
        ? lat.thick_sites.filter((s) => Math.hypot(s.y, s.z) > 1e-9)
        : [];
      const thinOthers = drawnThinSites.slice(1);
      if (others.length) {
        shared.add(this._filamentInstances(
          others, thick.transform.start_nm, thick.transform.end_nm,
          thick.transform.diameter_nm / 2,
          COMPONENT_COLOR.thick_filament, thick.evidence, 'thick_filament_lattice',
        ));
      }
      half.add(this._filamentInstances(
        thinOthers, thin.transform.start_nm, thin.transform.end_nm,
        thin.transform.diameter_nm / 2,
        COMPONENT_COLOR.thin_filament, thin.evidence, 'thin_filament_lattice',
      ));
      latticeCounts = {
        scope: latticeScope,
        thick_drawn: others.length + 1,
        thin_drawn: thinOthers.length + 1,
        thick_sites: lat.thick_sites.length,
        thin_sites: lat.thin_sites.length,
        omitted_neighbour_thick: latticeScope === 'local' ? lat.thick_sites.length - 1 : 0,
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
          const headSites = latticeScope === 'local' ? centralThickSites : lat.thick_sites;
          // contextDetail carries one identical-phase crown descriptor per site in
          // the requested patch. Local context draws only the central thick
          // filament, so filter BOTH arrays together. Passing seven crown records
          // with one site used to crash every close-up on sites[1].y.
          const headCrowns = latticeScope === 'local'
            ? contextDetail.crowns.slice(0, 1)
            : contextDetail.crowns;
          const headMesh = this._crownHeads(headCrowns, headSites, 'myosin_heads');
          if (headMesh) {
            half.add(headMesh);
            contextDetailReport.heads_drawn = true;
            contextDetailReport.head_instances = headMesh.count;
            contextDetailReport.thick_filaments_detailed = headSites.length;
          }
        } else {
          contextDetailReport.heads_omitted_because =
            `crown spacing resolves to ${crownPx.toFixed(2)} px, below the `
            + `${ALIAS_THRESHOLD_PX} px aliasing threshold — drawing them would show a `
            + 'moire periodicity the filament does not have';
        }
        if (crossoverPx >= ALIAS_THRESHOLD_PX && contextDetail.twist) {
          half.add(this._thinTwist(contextDetail.twist, drawnThinSites, 'thin_filament_twist',
            contextDetail.twist.evidence_class));
          contextDetailReport.twist_drawn = true;
          contextDetailReport.thin_filaments_detailed = drawnThinSites.length;
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
    const axialFallback = {
      strand_index: 0, y: 0, z: 0, radius_nm: 0, azimuth_deg: null,
      evidence_class: 'SCHEMATIC — isolated axial presentation',
      policy: 'axial_without_lattice',
    };
    // With a lattice present, even ONE representative titin must retain the
    // surface offset already declared for the six-strand model. Replacing it with
    // y=z=0 buries the A-band tube inside the myosin cylinder and contradicts the
    // spec's “A-band titin bound along surface” relationship. Zero offset is valid
    // only for the explicitly isolated axial scene, where no thick filament is
    // being shown as spatial context.
    const latticeStrandOffsets = lat?.titin_strands?.offsets || [];
    const strandOffsets = lat
      ? (titinStrands ? latticeStrandOffsets : latticeStrandOffsets.slice(0, 1))
      : [axialFallback];
    if (!strandOffsets.length) {
      throw new Error('lattice scene contains no titin surface offsets; refusing '
        + 'to substitute an axial strand inside the thick filament.');
    }

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
    // SC-16.2. Decide ONCE, here, whether each archetype draws its measured
    // backbone or its capsule — the decision is a property of the frame, not of
    // the strand, so every copy of the molecule must resolve identically.
    const backboneSwap = this._resolveDomainBackbones(
      domainBatches, opts.domainBackbones ?? null, viewWidthNm, viewportPx,
    );
    const regionDescriptors = new Map(scene.titin.map((region) => [region.id, region]));
    // SC-15. Which regions get the coil, and how wide. Resolved once, before the
    // strand loop: the coil is a function of the canonical interval and the
    // spec's contour length, both of which are the same on every strand, so
    // every copy of the molecule must show the same slack — and the halo, drawn
    // in a second pass, has to trace the same path its tube does.
    const disorderedRegions = TITIN_RENDER_STYLE.disordered_regions;
    /** @type {Map<string, {amplitudeNm:number, turns:number, fraction:number|null}>} */
    const coils = new Map();
    /** @type {Record<string, number|null>} */
    const contourLengths = {};
    let disorderedAmplitudeNm = 0;
    for (const segment of titinPath?.segments || []) {
      if (!disorderedRegions.includes(segment.region_id)) continue;
      const contourNm = regionDescriptors.get(segment.region_id)?.extension_model?.max_end2end_nm;
      contourLengths[segment.region_id] = contourNm ?? null;
      // The pitch basis is the region's own style radius, not whatever width the
      // strand about to be drawn ends up using: the coil is one shape belonging
      // to one molecule, and six copies of it in a lattice must not disagree.
      const coil = this._disorderedCoil(segment, contourNm, {
        amplitudeBasisNm: titinRadius,
        tubeRadiusNm: titinRadius * TITIN_RENDER_STYLE.disordered_radius_scale,
      });
      coils.set(segment.region_id, coil);
      disorderedAmplitudeNm = Math.max(disorderedAmplitudeNm, coil.amplitudeNm);
    }
    // SC-15. Where the folded domains are actually DRAWN, the backbone is a
    // linker, not a pipe.
    //
    // The Guided titin tube is 1.65 x (thin diameter / 6) = 2.475 nm in radius,
    // and an Ig archetype's rendered cross-section is 2.636 nm across — so the
    // chapter that claims "folded Ig and Fn3 domains alternate" was drawing a
    // smooth rod with all 77 of its domains sealed inside it, at every camera
    // distance. No framing can fix that; the tube has to get out of the way.
    //
    // The cap is half the narrowest DRAWN archetype's rendered cross-section,
    // and that number comes from the instancing plan — measured coordinates —
    // rather than from a constant chosen here. It applies only to regions whose
    // folded domains are on screen, so a disordered region keeps the width it
    // needs to read as a chain, and only on strands that draw domains at all.
    // Like the tube it narrows, it is a render width and claims no diameter.
    const drawnArchetypeRadii = (domainBatches?.batches || [])
      .map((batch) => batch.geometry?.lateral_diameter_nm)
      .filter((diameter) => Number.isFinite(diameter) && diameter > 0)
      .map((diameter) => diameter / 2);
    const linkerRadiusNm = drawnArchetypeRadii.length
      ? Math.min(...drawnArchetypeRadii) * TITIN_RENDER_STYLE.linker_radius_fraction
      : null;
    const foldedRegions = new Set(
      (domains?.instances || [])
        .filter((instance) => instance.folded_domains)
        .map((instance) => instance.domain_id.split('.')[0]),
    );
    /**
     * The path one region is DRAWN along: the canonical control points, coiled
     * between their own fixed endpoints when the region is a slack disordered
     * chain. Shared by the tube and its emphasis halo so the two cannot disagree.
     *
     * @param {{region_id:string, X_start:number, X_end:number}} segment
     * @param {{strand_index:number, y?:number, z?:number}} off
     */
    const displayPath = (segment, off) => {
      const canonical = this._titinRegionPath(domains, segment, off, aBandStart);
      const coil = coils.get(segment.region_id);
      if (!coil?.amplitudeNm) return canonical;
      return this._coilPath(canonical, coil);
    };
    for (const off of strandOffsets) {
      const domainsOnThisStrand = Boolean(domainBatches)
        && domainStrands.includes(off.strand_index);
      if (domainsOnThisStrand) {
        titinGroup.add(this._domainInstances(
          domainBatches, off, aBandStart, off.strand_index, backboneSwap.byArchetype,
        ));
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
          const renderRadiusScale = disorderedRegions.includes(segment.region_id)
            ? TITIN_RENDER_STYLE.disordered_radius_scale : 1;
          const coil = coils.get(segment.region_id);
          const styleRadiusNm = titinRadius * renderRadiusScale;
          const linked = domainsOnThisStrand
            && linkerRadiusNm !== null
            && foldedRegions.has(segment.region_id);
          const radiusNm = linked ? Math.min(styleRadiusNm, linkerRadiusNm) : styleRadiusNm;
          const tube = this._titinTube(
            displayPath(segment, off),
            radiusNm, COMPONENT_COLOR.titin, evidence,
            `titin_region_${segment.region_id}_strand_${off.strand_index}`,
            undefined,
            [segment.X_start, segment.X_end],
          );
          tube.userData.titin_region = segment.region_id;
          tube.userData.base_color = COMPONENT_COLOR.titin;
          tube.userData.evidence_rendered = evidence;
          tube.userData.render_radius_nm = radiusNm;
          // The region's own style scale, unchanged by the linker cap: one says
          // which region this is, the other says whether its beads are on screen.
          tube.userData.render_radius_scale = renderRadiusScale;
          tube.userData.render_radius_narrowed_for_domains = radiusNm < styleRadiusNm;
          // The interval the tube was built from, restated on the object so a
          // reader — or the SC-15 gate — can confirm the coil moved nothing.
          tube.userData.axial_range_nm = [segment.X_start, segment.X_end];
          tube.userData.disordered_depiction = coil?.amplitudeNm
            ? 'schematic coil' : null;
          strand.add(tube);
        }
        // One x-ray trace is enough to make the molecule's continuity explicit.
        // Drawing it on all lattice copies would turn a reading aid into clutter.
        if (off.strand_index === 0) {
          const traces = new THREE.Group();
          traces.name = 'titin_continuity_traces';
          for (const segment of titinPath.segments) {
            traces.add(this._titinContinuityTrace(segment, off, aBandStart, presentationMode));
            // The halo follows the CANONICAL path, not the coil. It is a "the
            // molecule runs through here" reading aid, and a 3.2x shell swept
            // along a coil turns into a chain of overlapping lobes that reads as
            // structure — the opposite of a subordinate emphasis channel. Kept
            // straight, it is the envelope and the coil is the chain inside it.
            traces.add(this._titinHalo(
              this._titinRegionPath(domains, segment, off, aBandStart),
              titinRadius,
              `titin_halo_${segment.region_id}`,
            ));
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

    // ---- SC-3 Z-disc local topology (close-up + resolvability gated) ----
    if (anchorDetail?.target === 'zdisc') {
      if (!anchorDetailReport) throw new Error('build: missing Z-disc detail report.');
      if (anchorDetailResolves) {
        const detailGroup = new THREE.Group();
        detailGroup.name = 'zdisc_anchor_detail';
        const actinRadius = thin.transform.diameter_nm / 2;
        detailGroup.add(this._segmentInstances(
          anchorDetail.actin_network.segments,
          actinRadius,
          COMPONENT_COLOR.thin_filament,
          anchorDetail.actin_network.evidence_class,
          'thin_filament_zdisc_interdigitating',
        ));
        const generalAlpha = anchorDetail.alpha_actinin.general_context;
        const exactDoublets = anchorDetail.alpha_actinin.doublet_detail;
        const doubletsDrawn = exactDoublets.audience
          .some((audience) => audience.toLowerCase() === presentationMode);
        const doubletPairs = new Set(
          exactDoublets.crosslink_sets.map((set) => set.pair_index),
        );
        // In Evidence mode, replace the generic single on each measured pair with
        // its two-member doublet. Guided retains the broader, topology-only
        // alpha-actinin context without exposing the exact ~6 nm measurement.
        const alphaConnectors = [
          ...generalAlpha.connectors.filter((connector) => (
            !doubletsDrawn || !doubletPairs.has(connector.pair_index)
          )),
          ...(doubletsDrawn ? exactDoublets.connectors : []),
        ];
        detailGroup.add(this._segmentInstances(
          alphaConnectors,
          actinRadius / 3,
          COMPONENT_COLOR.alpha_actinin,
          doubletsDrawn ? exactDoublets.evidence_class : generalAlpha.evidence_class,
          'alpha_actinin_zdisc_crosslinks',
        ));

        // The existing canonical titin remains the authoritative full path. These
        // two short overlays are a finite topology glyph: both Z1Z2 fragments share
        // an interval around telethonin, then diverge toward opposing sarcomeres.
        // This communicates the measured 2:1 sandwich without claiming an atomic
        // fit or a resolved complete in-situ route.
        //
        // The glyph is drawn to fit the room the descriptor gives it. At the
        // general titin and actin render widths the two chains and the proxy all
        // occupy the same 1.4 nm, so the three bodies merge into one rod and the
        // 2:1 stoichiometry — the chapter's entire claim — becomes undrawable.
        // Widths only: every coordinate, evidence class and colour is untouched.
        const clearanceNm = this._sandwichClearanceNm(anchorDetail.telethonin_complex);
        if (clearanceNm === null) {
          // Unreachable through a valid descriptor: validateZDiscDetail already
          // requires telethonin to lie between the two Z1Z2 proxies. Refused
          // rather than defaulted, because the default would be the general
          // widths — the exact state in which the clamp swallows what it clamps.
          throw new Error('build: the Z1Z2 chains leave the telethonin proxy no '
            + 'transverse clearance, so the 2:1 sandwich cannot be drawn as one.');
        }
        const clampedRadius = Math.min(
          actinRadius / 3, clearanceNm * SANDWICH_CLAMPED_RADIUS_FRACTION,
        );
        const clampRadius = Math.min(titinRadius, clearanceNm - clampedRadius);
        // One definition, so the object and the manifest cannot disagree about
        // whether this frame narrowed anything.
        const fittedToClamp = clampedRadius < actinRadius / 3 || clampRadius < titinRadius;
        for (const chain of anchorDetail.telethonin_complex.titin_chains) {
          const canonical = chain.uses_existing_titin;
          const tube = this._titinTube(
            chain.complex_points_nm,
            clampRadius,
            canonical ? COMPONENT_COLOR.titin : COMPONENT_COLOR.titin_neighbour,
            anchorDetail.telethonin_complex.evidence_class,
            canonical
              ? 'titin_zdisc_canonical_z1z2_sandwich_proxy'
              : 'titin_zdisc_opposing_z1z2',
          );
          tube.userData.topology = canonical
            ? 'canonical Z1Z2 fragment in finite 2:1 sandwich proxy'
            : 'second, antiparallel Z1Z2 fragment in finite 2:1 sandwich proxy';
          tube.userData.render_only = 'local binding-topology overlay; full lateral route unresolved';
          tube.userData.render_radius_nm = clampRadius;
          tube.userData.render_radius_fitted_to_clamp = fittedToClamp;
          detailGroup.add(tube);
        }
        detailGroup.add(this._segmentInstances(
          [anchorDetail.telethonin_complex.telethonin_proxy],
          clampedRadius,
          COMPONENT_COLOR.telethonin,
          anchorDetail.telethonin_complex.evidence_class,
          'telethonin_zdisc_sandwich',
        ));
        for (const marker of anchorDetail.telethonin_complex.direction_markers) {
          detailGroup.add(this._directionMarker(
            marker,
            actinRadius,
            COMPONENT_COLOR.titin_highlight,
            `titin_zdisc_direction_${marker.id}`,
          ));
        }
        detailGroup.userData.evidence_class = anchorDetail.evidence_class;
        detailGroup.userData.universal_lattice_rendered = false;
        half.add(detailGroup);
        anchorDetailReport = {
          ...anchorDetailReport,
          drawn: true,
          actin_segments: anchorDetail.actin_network.segments.length,
          alpha_actinin_crosslinks: alphaConnectors.length,
          alpha_actinin_doublets_rendered: doubletsDrawn,
          ...(doubletsDrawn ? {
            alpha_actinin_doublet_spacing_nm: exactDoublets.spacing_nm,
          } : {}),
          telethonin_stoichiometry: anchorDetail.telethonin_complex.stoichiometry,
          // SC-16. The widths the glyph was drawn at, and the descriptor number
          // they were derived from. Render-only: the clearance is read off the
          // spec's own chain offsets, so this records a fit, not a measurement.
          // Floored to a picometre, not rounded to nearest. These three stand in
          // an exact relation — the two radii sum to at most the clearance — and
          // rounding each to nearest can break it by one step, leaving an audit
          // record that contradicts the invariant it exists to document. A sum of
          // floors is a multiple of the same step and still at most the clearance,
          // so flooring cannot.
          sandwich_render_fit: {
            clamp_clearance_nm: floorPm(clearanceNm),
            clamped_render_radius_nm: floorPm(clampedRadius),
            clamp_render_radius_nm: floorPm(clampRadius),
            // False where the descriptor already leaves more room than the
            // general widths need, so nothing had to be narrowed.
            fitted_to_clamp: fittedToClamp,
            render_only: 'reading widths fitted to the descriptor\'s own chain separation; '
              + 'not molecular dimensions',
          },
          titin_chain_directions: anchorDetail.telethonin_complex.titin_chains
            .map((chain) => chain.direction),
          // Topology is supported; the proxy's 21 nm display span is not a measured
          // complex dimension and therefore is deliberately absent from the report.
          telethonin_finite_overlap_rendered: true,
          universal_lattice_rendered: false,
          source_ids: [...new Set([
            ...anchorDetail.actin_network.source_ids,
            ...(doubletsDrawn ? exactDoublets.source_ids : generalAlpha.source_ids),
            ...anchorDetail.telethonin_complex.source_ids,
          ])],
          not_claimed: [...new Set([
            anchorDetail.actin_network.not_claimed,
            doubletsDrawn ? exactDoublets.not_claimed : generalAlpha.not_claimed,
            anchorDetail.telethonin_complex.not_claimed,
            anchorDetail.omission.not_claimed,
          ].flat())],
        };
      } else {
        anchorDetailReport.omitted_because = `${anchorDetailReport.feature} resolves to `
          + `${anchorDetailReport.feature_px.toFixed(2)} px, below the `
          + `${ALIAS_THRESHOLD_PX} px aliasing threshold`;
      }
    }

    // ---- SC-5 optional MyBP-C C-zone context (Evidence + resolvability gated) ----
    // Drawn into `half` because the C-zone belongs to a half thick filament: the
    // mirror reproduces the opposite half's stripes from the same descriptor rather
    // than from a second set of numbers.
    if (mybpcContext) {
      if (!mybpcReport) throw new Error('build: missing MyBP-C context report.');
      if (mybpcResolves) {
        const group = new THREE.Group();
        group.name = 'mybpc_czone_context';
        const molecules = mybpcContext.stripes.flatMap((stripe) => stripe.molecules);
        // Subordination by construction: whatever the descriptor asks for, and
        // whatever titin tube radius the caller chose, an accessory marker never
        // renders as wide as the titin it sits beside.
        const moleculeRadius = Math.min(
          mybpcContext.render_dimensions_nm.molecule_radius_nm,
          titinRadius * MYBPC_MAX_RADIUS_FRACTION_OF_TITIN,
        );
        group.add(this._segmentInstances(
          molecules,
          moleculeRadius,
          COMPONENT_COLOR.mybpc,
          // Placement evidence, not claim evidence: the depicted path is schematic
          // even though presence and periodicity are measured in fast skeletal muscle.
          mybpcContext.placement_evidence_class,
          'mybpc_czone_molecules',
        ));
        group.userData.part_of_titin = false;
        group.userData.titin_contact_rendered = false;
        group.userData.rigid_thick_to_thin_bridge_rendered = false;
        group.userData.render_only = mybpcContext.render_only;
        half.add(group);
        mybpcReport = {
          ...mybpcReport,
          drawn: true,
          stripes_drawn: mybpcContext.stripes.length,
          molecules_drawn: molecules.length,
          molecules_per_stripe: mybpcContext.molecules_per_stripe,
          molecule_render_radius_nm: moleculeRadius,
          titin_render_radius_nm: titinRadius,
          stripe_spacing_nm: mybpcContext.stripe_spacing_nm,
          c_zone: { ...mybpcContext.c_zone },
          thin_filament_clearance_nm:
            mybpcContext.render_dimensions_nm.thin_filament_clearance_nm,
          axial_register_policy: mybpcContext.axial_register_policy,
          pose_policy: mybpcContext.pose_policy,
          source_ids: [...mybpcContext.source_ids],
          not_claimed: [...mybpcContext.not_claimed],
        };
      }
    }

    this.root.add(half);

    // ---- the full repeating unit: the half, repeated through the M-line ----
    if (mirror) {
      const mirrored = new THREE.Group();
      mirrored.name = 'half_sarcomere_mirrored';
      const mirroredHalf = half.clone();
      // clone() drops own-property raycast overrides; see _restoreEmphasisPicking.
      this._restoreEmphasisPicking(mirroredHalf);
      mirrored.add(mirroredHalf);
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

    // One coordinate marker at the shared sarcomere midpoint. It is deliberately
    // a ring, not a solid transverse block and not the 160 nm bare zone.
    shared.add(this._mbandMidpoint(
      mline.transform.position_nm,
      thick.transform.diameter_nm / 2,
      mline.evidence?.axial_position ?? mline.evidence,
    ));

    // ---- SC-3 M-band relationship context (close-up + resolvability gated) ----
    // No envelope is ghosted here, and that is a finding rather than an omission.
    // SC-16 subordinates a presentation envelope that occludes the anchor inside
    // it; the M-band's only marker is the zero-width LineLoop added just above,
    // which has no axial extent and already refuses to write depth, so it cannot
    // stand in front of the crosslinks it labels. The report's `envelope_ghosted`
    // therefore stays false, truthfully.
    if (anchorDetail?.target === 'mline') {
      if (!anchorDetailReport) throw new Error('build: missing M-band detail report.');
      if (anchorDetailResolves) {
        const detailGroup = new THREE.Group();
        detailGroup.name = 'mband_anchor_detail';
        detailGroup.add(this._filamentInstances(
          anchorDetail.context_thick_slices,
          anchorDetail.context_thick_slices[0].start_nm,
          anchorDetail.context_thick_slices[0].end_nm,
          anchorDetail.context_thick_slices[0].diameter_nm / 2,
          COMPONENT_COLOR.thick_filament,
          thick.evidence,
          'thick_filament_mband_neighbour_slices',
        ));
        detailGroup.add(this._segmentInstances(
          anchorDetail.crosslinks,
          anchorDetail.render_dimensions_nm.crosslink_radius,
          COMPONENT_COLOR.mband_crosslink,
          anchorDetail.evidence_class,
          'mband_crosslink_sparse_context',
        ));
        detailGroup.userData.m1_density_rendered = false;
        detailGroup.userData.midpoint_has_width = false;
        shared.add(detailGroup);
        anchorDetailReport = {
          ...anchorDetailReport,
          drawn: true,
          midpoint_nm: anchorDetail.midpoint.x_nm,
          midpoint_has_width: false,
          bare_zone: anchorDetail.bare_zone,
          crosslinks_drawn: anchorDetail.crosslinks.length,
          crosslink_identity_policy: anchorDetail.crosslink_claim.identity_policy,
          required_visible_titin_halves:
            anchorDetail.titin_relationship.required_visible_halves,
          m1_density_rendered: false,
          source_ids: [...new Set([
            ...anchorDetail.bare_zone.source_ids,
            ...anchorDetail.crosslink_claim.source_ids,
            ...anchorDetail.m1_omission.source_ids,
          ])],
          not_claimed: [
            anchorDetail.midpoint.not_claimed,
            anchorDetail.bare_zone.not_claimed,
            anchorDetail.crosslink_claim.not_claimed,
            anchorDetail.m1_omission.not_claimed,
          ].flat(),
        };
      } else {
        anchorDetailReport.omitted_because = `${anchorDetailReport.feature} resolves to `
          + `${anchorDetailReport.feature_px.toFixed(2)} px, below the `
          + `${ALIAS_THRESHOLD_PX} px aliasing threshold`;
      }
    }
    this.root.add(shared);

    this.manifest = {
      sarcomere_length_nm: scene.sarcomere_length_nm,
      units: 'nanometres (1 scene unit = 1 nm)',
      primitives_used: {
        cylinder: ['thick_filament', 'thin_filament'],
        box: ['zdisc'],
        line_loop: ['mline_midpoint_reference'],
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
      anchor_detail: anchorDetailReport,
      // SC-5. `null` when the optional layer was not requested; a record with
      // `omitted_because` when it was requested but would not resolve. Both states
      // are auditable, and neither can be confused with a silent failure.
      mybpc_context: mybpcReport,
      domains: domainBatches ? {
        strands_with_domain_detail: domainStrands,
        // SC-16.2. Which archetypes drew their measured Cα backbone at this
        // framing, and for the rest, exactly why the capsule stayed.
        backbones: backboneSwap.report,
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
      representative_titin: {
        strand_index: strandOffsets[0].strand_index,
        a_band_surface_bound: Boolean(lat),
        a_band_start_nm: aBandStart,
        a_band_transverse_offset_nm: {
          y: strandOffsets[0].y || 0,
          z: strandOffsets[0].z || 0,
          radius: Math.hypot(strandOffsets[0].y || 0, strandOffsets[0].z || 0),
        },
        thick_filament_radius_nm: thick.transform.diameter_nm / 2,
        azimuth_deg: strandOffsets[0].azimuth_deg,
        azimuth_evidence: strandOffsets[0].evidence_class,
        placement_policy: strandOffsets[0].policy,
        i_band_transverse_path: lat
          ? 'SCHEMATIC render-only linear taper from the A-band surface offset to the Z-disc axis'
          : 'isolated axial presentation; no transverse filament relationship shown',
      },
      titin_emphasis: {
        channel: 'presentation',
        trace_px: presentationMode === 'guided'
          ? TITIN_RENDER_STYLE.trace_px
          : TITIN_RENDER_STYLE.trace_px_evidence,
        halo_radius_scale: TITIN_RENDER_STYLE.halo_radius_scale,
        halo_opacity: TITIN_RENDER_STYLE.halo_opacity,
        evidence_opacity_unchanged: true,
        meaning: 'screen-space reading width and an additive halo; neither is a molecular dimension',
      },
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
          coordinate_basis: 'exact canonical Level-0 axial segment endpoints',
          transverse_display_basis: lat
            ? 'representative titin surface offset in A-band; schematic linear I-band taper'
            : 'isolated axial presentation',
          render_only: true,
        } : null,
        region_radius_scale: {
          guided_all_regions: presentationMode === 'guided'
            ? TITIN_RENDER_STYLE.guided_radius_scale : 1,
          // Built from the one declared list rather than restated, so this record
          // cannot drift from the scale the renderer actually applied.
          ...Object.fromEntries(disorderedRegions
            .map((id) => [id, TITIN_RENDER_STYLE.disordered_radius_scale])),
          not_claimed: 'molecular diameter or polymer cross-section',
        },
        // SC-15. Reported whenever domains are drawn, because a reader comparing
        // two frames should be able to see that the backbone narrowed and why.
        domain_linker: domainBatches ? {
          regions_with_drawn_domains: [...foldedRegions].sort(),
          strands: [...domainStrands],
          radius_cap_nm: linkerRadiusNm === null ? null : Number(linkerRadiusNm.toFixed(4)),
          uncapped_region_radius_nm: Number(titinRadius.toFixed(4)),
          basis: 'half the narrowest drawn archetype rendered cross-section, from '
            + 'the instancing plan; a render width, not a molecular diameter',
          reason: 'a backbone wider than the domains it carries hides them at every '
            + 'camera distance',
        } : null,
      },
      // SC-15. Reported as its own record, and always — an amplitude of zero is
      // the auditable statement "at this length the chain is drawn straight",
      // which a missing key could not distinguish from a layer that failed.
      disordered_depiction: {
        regions: [...disorderedRegions],
        evidence_class: 'SCHEMATIC',
        amplitude_nm: Number(disorderedAmplitudeNm.toFixed(4)),
        amplitude_by_region: Object.fromEntries(
          [...coils].map(([id, coil]) => [id, Number(coil.amplitudeNm.toFixed(4))]),
        ),
        turns_by_region: Object.fromEntries(
          [...coils].map(([id, coil]) => [id, Number(coil.turns.toFixed(3))]),
        ),
        span_over_contour: Object.fromEntries(
          [...coils].map(([id, coil]) => [
            id, coil.fraction === null ? null : Number(coil.fraction.toFixed(4)),
          ]),
        ),
        contour_length_nm: contourLengths,
        contour_source: 'titin.json regions[].extension_model.max_end2end_nm — the '
          + 'same contour MechanicalModel resolves as Lc',
        meaning: 'transverse coil amplitude encodes how far the region is from its '
          + 'contour length; it is a depiction of disorder, not a measured conformation',
        not_claimed: [
          'a measured or predicted conformation for the disordered segments',
          'a coil pitch, handedness, or transverse amplitude with any molecular meaning',
        ],
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
          ? latticeScope === 'local'
            ? 'Z-disc transverse extent (drawn to span the immediate filament neighbourhood)'
            : 'Z-disc transverse extent (drawn to span the lattice patch)'
          : 'Z-disc transverse extent (drawn to a nominal width)',
        'M-band midpoint ring size (coordinate marker, not M1 density or M-band width)',
        'radial titin path through the I-band (no thick filament to follow there)',
        'smooth CatmullRom interpolation between domain positions',
        'SC-2 continuity trace (exact Level-0 axial endpoints; representative '
          + 'schematic transverse display offset)',
        'reduced N2A/PEVK tube radius (visual distinction, not molecular diameter)',
        'SC-10 continuity-trace ribbon width (screen-space width in CSS pixels, held '
          + 'constant at every camera distance; a reading width, not a molecular dimension)',
        'SC-10 titin emphasis halo (additive reading aid around the titin path; not a '
          + 'molecular envelope, and it moves no opacity that encodes confidence)',
        ...(mybpcReport?.drawn ? [
          'SC-5 MyBP-C stripe register, azimuth, reach, and pose (schematic C-zone '
            + 'context on one representative thick filament; no titin contact and no '
            + 'thick-to-thin bridge is depicted)',
        ] : []),
      ],
    };
    this._built = true;
    return this.root;
  }

  /**
   * Register canonical annotation descriptors without drawing detached squares.
   * SC-4 labels attach directly to raycast biological geometry through a DOM/SVG
   * leader overlay; adding marker sprites would create pickable-looking objects
   * that are not the structures they explain.
   */
  setAnnotations(annotations) {
    if (!this._built) throw new Error('setAnnotations: nothing built yet.');
    this.annotationRecords = new Map(annotations.map((annotation) => [
      `${annotation.target_type}:${annotation.target_id}`, annotation,
    ]));
    if (this.manifest) {
      this.manifest.annotations = {
        count: annotations.length,
        ids: annotations.map((annotation) => annotation.id),
        marker_geometry: 'none — direct raycasting plus DOM/SVG leader overlay',
      };
    }
    return this.annotationRecords;
  }

  /** Resolve one raycast leaf/instance to stable biological vocabulary. */
  pickTarget(object, instanceId = null) {
    if (!object) return null;
    const ancestors = [];
    for (let cursor = object; cursor; cursor = cursor.parent) ancestors.push(cursor);
    const mirrored = ancestors.some((candidate) => candidate.name === 'half_sarcomere_mirrored');

    const instanceIndex = Number.isInteger(instanceId) ? Number(instanceId) : null;
    for (const candidate of ancestors) {
      const regions = candidate.userData?.instance_regions;
      if (candidate.isInstancedMesh && instanceIndex !== null
          && Array.isArray(regions) && regions[instanceIndex]) {
        return {
          target_type: 'titin_region',
          target_id: regions[instanceIndex],
          domain_id: candidate.userData.instance_domain_ids?.[instanceIndex] || null,
          instance_id: instanceIndex,
          archetype: candidate.userData.archetype || null,
          mirrored,
        };
      }
      const region = candidate.userData?.titin_region
        || candidate.userData?.titin_trace_region;
      if (region) return { target_type: 'titin_region', target_id: region, mirrored };
    }

    const names = ancestors.map((candidate) => candidate.name || '');
    const has = (predicate) => names.some(predicate);
    if (has((name) => name.startsWith('titin_zdisc_')
      || name.startsWith('titin_zdisc_direction_'))) {
      return { target_type: 'titin_region', target_id: 'Z1Z2', mirrored };
    }
    const mappings = [
      // Before the thick-filament rule: MyBP-C decorates that filament but is a
      // separate accessory protein, and resolving it to 'thick_filament' would
      // explain it with the wrong annotation.
      ['mybpc', (name) => name.startsWith('mybpc')],
      ['myosin_heads', (name) => name.startsWith('myosin_heads')],
      ['thin_filament_twist', (name) => name.startsWith('thin_filament_twist')],
      ['alpha_actinin', (name) => name.startsWith('alpha_actinin')],
      ['telethonin', (name) => name.startsWith('telethonin')],
      ['mband_crosslinks', (name) => name.startsWith('mband_crosslink')],
      ['thick_filament', (name) => name.startsWith('thick_filament')],
      ['thin_filament', (name) => name.startsWith('thin_filament')],
      ['zdisc', (name) => name === 'zdisc'],
      ['mline', (name) => name === 'mline'],
    ];
    for (const [targetId, predicate] of mappings) {
      if (has(predicate)) return { target_type: 'component', target_id: targetId, mirrored };
    }
    return null;
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
   * @param {number} strandIndex
   * @param {Map<string, {points: Array<{x:number,y:number,z:number}>,
   *   evidenceClass: string, notClaimed: string[]}>} [backboneSwap]
   *   archetypes whose measured Cα backbone resolves at this framing (SC-16.2).
   */
  _domainInstances(batchesResult, strandOffset, aBandStartNm, strandIndex, backboneSwap) {
    const group = new THREE.Group();
    group.name = `titin_domains_strand_${strandIndex}`;
    for (const batch of batchesResult.batches) {
      const g = batch.geometry;
      // ONE geometry per archetype, shared by every sub-batch below: the shape
      // claim is per-archetype, and the plan guarantees it is never deformed.
      const swap = backboneSwap?.get(batch.archetype) ?? null;
      const geom = this._track(swap
        ? this._backboneGeometry(swap.points, g)
        : this._archetypeGeometry(g));

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
          // What the surface actually is. `primitive` keeps naming the descriptor's
          // assignment either way, so a reader can see both what was specified and
          // what this frame drew.
          primitive: g.primitive,
          surface: swap ? 'measured_calpha_backbone' : g.primitive,
          surface_evidence_class: swap ? swap.evidenceClass : null,
          preserves: g.preserves,
          // Reported exactly as the archetype declares it, including "surface
          // shape". Drawing a backbone does not retire that disclaimer: the path
          // is ONE deposition's, repeated across every instance of the archetype,
          // so this domain's own surface is still not being claimed. What the
          // swap adds is a second, narrower list — the backbone file's — which
          // says precisely that.
          not_claimed: g.not_claimed,
          surface_not_claimed: swap ? swap.notClaimed : null,
          representative_pdb_id: batch.representative_structure?.pdb_id,
          evidence_rendered: evidence,
          instance_regions: members.map((member) => member.region),
          instance_domain_ids: members.map((member) => member.domain_id),
          base_color: COMPONENT_COLOR.titin,
        };
        group.add(mesh);
      }
    }
    return group;
  }

  /**
   * SC-16. The transverse room the descriptor leaves between the clamped
   * molecule and the chains clamping it, over the interval where they overlap.
   *
   * Derived from the descriptor rather than restated, so a spec that moved the
   * chains moves the drawn widths with it and the sandwich cannot silently close
   * up again. Measured on `_titinCurve` — the curve the tube is actually built
   * from, not the polyline through the points, which is a different shape. The
   * sampling is twenty times denser than the stations TubeGeometry itself uses
   * and converges by ~128 steps; the residual against an 8192-step reference is
   * under 1e-5 nm, four orders below the picometre the report resolves.
   *
   * @param {object} complex anchorDetail.telethonin_complex
   * @returns {number|null} nanometres, or null if the chains never overlap it
   */
  _sandwichClearanceNm(complex) {
    const proxy = complex.telethonin_proxy;
    const axisY = ((proxy.start_nm.y ?? 0) + (proxy.end_nm.y ?? 0)) / 2;
    const axisZ = ((proxy.start_nm.z ?? 0) + (proxy.end_nm.z ?? 0)) / 2;
    const lo = Math.min(proxy.start_nm.x, proxy.end_nm.x);
    const hi = Math.max(proxy.start_nm.x, proxy.end_nm.x);
    const STEPS = 512;
    const point = new THREE.Vector3();
    let clearance = Infinity;
    for (const chain of complex.titin_chains) {
      const curve = this._titinCurve(chain.complex_points_nm);
      for (let step = 0; step <= STEPS; step += 1) {
        curve.getPoint(step / STEPS, point);
        if (point.x < lo || point.x > hi) continue;
        clearance = Math.min(clearance, Math.hypot(point.y - axisY, point.z - axisZ));
      }
    }
    return Number.isFinite(clearance) && clearance > 0 ? clearance : null;
  }

  /**
   * SC-16.2. Which archetypes draw a measured Cα backbone at this framing.
   *
   * The gate is the same shape as every other detail gate in this file: a
   * feature size in nanometres, divided into the pixels the camera actually
   * gives it, compared against a declared threshold. What differs is the
   * threshold — a backbone is not withheld because it would alias, it is
   * withheld because below this size it says less than the capsule while
   * implying more.
   *
   * Returns `{ byArchetype, report }` where `report` is the manifest record and
   * names, per archetype, what was drawn and why.
   *
   * @param {object|null} domainBatches model.instancingPlanAt(sl), or null
   * @param {object|null} backbones     data/domain_backbones.json, or null
   * @param {number} viewWidthNm
   * @param {number} viewportPx
   */
  _resolveDomainBackbones(domainBatches, backbones, viewWidthNm, viewportPx) {
    /**
     * @type {Map<string, {points: Array<{x:number,y:number,z:number}>,
     *   evidenceClass: string, notClaimed: string[], record: Record<string, any>}>}
     */
    const byArchetype = new Map();
    if (!domainBatches) return { byArchetype, report: null };
    /** @type {Record<string, any>} */
    const archetypes = {};
    let swapped = 0;
    for (const batch of domainBatches.batches) {
      const axialNm = batch.geometry?.axial_length_nm;
      const domainPx = (viewportPx * axialNm) / viewWidthNm;
      const available = backbones?.archetypes?.[batch.archetype] ?? null;
      /** @type {Record<string, any>} */
      const record = {
        archetype: batch.archetype,
        drawn: 'capsule',
        domain_axial_length_nm: axialNm,
        domain_px: Number(domainPx.toFixed(2)),
        resolve_threshold_px: DOMAIN_BACKBONE_RESOLVE_PX,
        // Whether the ONLY thing standing between this archetype and its backbone
        // is the camera. Viewer.checkDetailLOD rebuilds on a threshold crossing and
        // must gate on this rather than on the px comparison alone: an archetype
        // with no usable backbone would otherwise read as permanently "should have
        // swapped" and rebuild the scene on every frame.
        swappable: false,
      };
      if (!available) {
        record.omitted_because = 'no measured backbone is available for this archetype';
      } else if (available.pdb_id !== batch.representative_structure?.pdb_id) {
        // The mesh stamps representative_pdb_id from the instancing plan. Drawing
        // coordinates from a different deposition under that label would put two
        // provenances on one object, so refuse rather than reconcile silently.
        record.omitted_because = `the backbone is from ${available.pdb_id} but this archetype's `
          + `representative structure is ${batch.representative_structure?.pdb_id}`;
      } else if (domainPx < DOMAIN_BACKBONE_RESOLVE_PX) {
        record.swappable = true;
        record.omitted_because = `one domain renders ${domainPx.toFixed(2)} px, below the `
          + `${DOMAIN_BACKBONE_RESOLVE_PX} px at which a fold reads as a chain`;
      } else {
        record.swappable = true;
        byArchetype.set(batch.archetype, {
          points: available.ca_nm.map(([x, y, z]) => ({ x, y, z })),
          evidenceClass: available.evidence_class,
          notClaimed: backbones?.meta?.not_claimed ? [...backbones.meta.not_claimed] : [],
          record,
        });
        swapped += 1;
        Object.assign(record, {
          drawn: 'measured_calpha_backbone',
          pdb_id: available.pdb_id,
          source_id: available.source_id,
          // The SURFACE is measured. Each instance keeps the evidence class its
          // own placement earned; this never promotes one.
          surface_evidence_class: available.evidence_class,
          residue_count: available.residue_count,
          sha256_pinned_in_manifest: available.sha256_pinned_in_manifest,
        });
      }
      archetypes[batch.archetype] = record;
    }
    return {
      byArchetype,
      report: {
        archetypes_swapped: swapped,
        resolve_threshold_px: DOMAIN_BACKBONE_RESOLVE_PX,
        radius_fraction_of_lateral_diameter: DOMAIN_BACKBONE_RADIUS_FRACTION,
        radius_meaning: 'screen-reading width for a Cα trace; not a molecular dimension',
        source_available: Boolean(backbones),
        not_claimed: backbones?.meta?.not_claimed ? [...backbones.meta.not_claimed] : [],
        archetypes,
      },
    };
  }

  /**
   * A measured Cα trace as a tube, in the archetype capsule's own frame.
   *
   * The points arrive centred on their centroid with the principal axis on +Y,
   * which is how the capsule is built, so this is a drop-in replacement for it:
   * the caller's instance matrix is untouched.
   *
   * The Cα positions are measured; the curve BETWEEN them is a smooth render, as
   * every backbone cartoon is, and the tube radius is a reading width. Neither
   * is a claim — the curve passes exactly through each measured position, which
   * is the only part of this surface the data supports.
   */
  _backboneGeometry(points, g) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
    );
    const radius = (g.lateral_diameter_nm / 2) * DOMAIN_BACKBONE_RADIUS_FRACTION;
    // One tube segment per residue step: fewer would cut corners off the fold,
    // more would spend geometry on a curve the screen cannot resolve.
    return new THREE.TubeGeometry(curve, Math.max(16, points.length), radius, 5, false);
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
      alpha_actinin: COMPONENT_COLOR.alpha_actinin,
      telethonin: COMPONENT_COLOR.telethonin,
      mband_crosslink: COMPONENT_COLOR.mband_crosslink,
      mybpc: COMPONENT_COLOR.mybpc,
      lattice_guide: COMPONENT_COLOR.lattice_guide,
    };
    const roleOf = (name) => {
      if (name.startsWith('thick_filament')) return 'thick_filament';
      if (name.startsWith('myosin_heads')) return 'myosin_head';
      if (name.startsWith('thin_filament')) return 'thin_filament';
      if (name === 'zdisc') return 'zdisc';
      if (name === 'mline') return 'mline';
      if (name.startsWith('alpha_actinin')) return 'alpha_actinin';
      if (name.startsWith('telethonin')) return 'telethonin';
      if (name.startsWith('mband_crosslink')) return 'mband_crosslink';
      if (name.startsWith('mybpc')) return 'mybpc';
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
    // Disposed above with everything else; this set only tracks WHICH of them
    // need a renderer resolution, so it is emptied rather than disposed again.
    this.screenSpaceLineMaterials.clear();
    this.manifest = null;
    this._built = false;
    this.highlightedTitinRegion = null;
    this.presentationEmphasis = null;
    this.annotationRecords = new Map();
  }
}
