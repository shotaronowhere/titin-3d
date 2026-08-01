/**
 * Phase 7 tests — the transverse lattice layer and the Three.js context view.
 *
 * These assert PROPERTIES that must hold, deriving expected values from the
 * hexagonal identities or the spec rather than pasting in numbers the code
 * produced. A test that hardcodes the current output only proves the code has
 * not changed; these prove it is right.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { LatticeGeometry, RADIAL_TITIN_POLICY } from '../src/geometry/LatticeGeometry.js';
import { SarcomereScene, EVIDENCE_STYLE, evidenceStyle } from '../src/render/SarcomereScene.js';
import { VIEWS } from '../src/render/Viewer.js';

const SQRT3 = Math.sqrt(3);
const model = await TitinModel.create(nodeReader());
const lattice = new LatticeGeometry(model.spec, model.geometry);
const STATES = [1900, 2200, 2400, 3000];

// ---------------------------------------------------------------- lattice ----

test('PHASE7: hexagonal identities hold at every state', () => {
  for (const sl of STATES) {
    const d10 = model.geometry.latticeD10(sl);
    const a = lattice.latticeConstant(sl);
    assert.ok(Math.abs(a - (2 * d10) / SQRT3) < 1e-12, `a != 2*d10/sqrt3 at ${sl}`);
    assert.ok(Math.abs(lattice.myosinActinCentre(sl) - a / SQRT3) < 1e-12);
    // d_MA = 2*d10/3 is the same identity by a different route.
    assert.ok(Math.abs(lattice.myosinActinCentre(sl) - (2 * d10) / 3) < 1e-12);
  }
});

test('PHASE7: patch thick-filament count matches 1+3N(N+1)', () => {
  for (const rings of [0, 1, 2, 3, 4]) {
    const p = lattice.latticePatch(2200, rings);
    assert.equal(p.thick.length, 1 + 3 * rings * (rings + 1));
  }
});

test('PHASE7: every thin filament sits exactly at a trigonal point', () => {
  const p = lattice.latticePatch(2200, 3);
  assert.ok(p.thin.length > 0);
  for (const t of p.thin) {
    let nearest = Infinity;
    for (const k of p.thick) nearest = Math.min(nearest, Math.hypot(t.y - k.y, t.z - k.z));
    assert.ok(Math.abs(nearest - p.myosin_actin_centre_nm) < 1e-9,
      `thin filament ${nearest} from nearest thick, expected ${p.myosin_actin_centre_nm}`);
  }
});

test('PHASE7: nearest thick-thick distance equals the lattice constant', () => {
  const p = lattice.latticePatch(2200, 2);
  let min = Infinity;
  for (let i = 0; i < p.thick.length; i += 1)
    for (let j = i + 1; j < p.thick.length; j += 1)
      min = Math.min(min, Math.hypot(p.thick[i].y - p.thick[j].y, p.thick[i].z - p.thick[j].z));
  assert.ok(Math.abs(min - p.lattice_constant_nm) < 1e-9);
});

test('PHASE7: 1 thick : 2 thin stoichiometry emerges as the patch grows', () => {
  // The spec records 1:2 as MEASURED. It must be REPRODUCED by trigonal
  // occupancy, not assumed: finite patches fall short because boundary
  // triangles are incomplete, so the ratio must rise monotonically toward 2.
  const ratios = [1, 2, 3, 5, 8].map((r) => lattice.latticePatch(2200, r).stoichiometry.ratio);
  for (let i = 1; i < ratios.length; i += 1)
    assert.ok(ratios[i] > ratios[i - 1], `ratio not increasing: ${ratios}`);
  for (const r of ratios) assert.ok(r < 2, 'a finite patch cannot reach the 1:2 limit');
  assert.ok(ratios.at(-1) > 1.7, `ratio should approach 2, got ${ratios.at(-1)}`);
});

test('PHASE7: spec lattice triple is recovered at its own reference SL', () => {
  // The stored d10/a/d_MA are NOT resting values; the component note says
  // SL=2.85 um. Inverting the constant-volume law must recover that.
  const sl = lattice.storedD10ImpliedSL;
  assert.ok(Math.abs(sl - 2850) < 2, `implied SL ${sl} should be ~2850 nm`);
  assert.ok(Math.abs(lattice.latticeConstant(sl) - lattice.storedLatticeConstant) < 0.01);
  assert.ok(Math.abs(lattice.myosinActinCentre(sl) - lattice.storedMyosinActin) < 0.01);
});

test('PHASE7: surface separation is derived from the live lattice and declared radii', () => {
  // Literature surface distances depend on species, temperature and osmotic
  // compression. This construction must use its own d10 and radii exactly; it
  // must not be fitted to an unrelated experimental interval.
  const [lo, hi] = model.spec.sarcomere.sarcomere_length_states_nm.working_range;
  for (let sl = lo; sl <= hi; sl += 50) {
    const sep = lattice.surfaceSeparation(sl);
    const expected = (2 * model.geometry.latticeD10(sl)) / 3
      - lattice.thickRadius - lattice.thinRadius;
    assert.ok(Math.abs(sep - expected) < 1e-12, `surface separation mismatch at SL=${sl}`);
  }
});

test('PHASE7: filaments never interpenetrate over the supported range', () => {
  for (let sl = model.geometry.slMin; sl <= model.geometry.slMax; sl += 25)
    assert.ok(lattice.surfaceSeparation(sl) > 0, `interpenetration at SL=${sl}`);
});

test('PHASE7: lattice is evaluated at the same clamped SL as the axial layer', () => {
  // These diverged once: the axial layer clamps to its keyframe range but the
  // closed-form lattice law does not, so a scene at SL=1500 drew 1900 nm
  // filaments inside a 1500 nm lattice (3.6 nm surface-separation disagreement).
  for (const sl of [1500, 1900, 2200, 3000, 4400]) {
    const p = lattice.latticePatch(sl, 1);
    const axial = model.geometry.geometryAt(sl);
    assert.equal(p.sarcomere_length_nm, axial.sarcomere_length_nm);
    assert.equal(p.was_clamped, axial.was_clamped);
    assert.ok(Math.abs(p.d10_nm - axial.lattice_d10_nm) < 1e-12);
  }
});

test('PHASE7: calculator-calibrated absolute d10 is MODELED, not mislabelled MEASURED', () => {
  const claims = lattice.provenance().evidence_by_claim;
  assert.match(claims.d10_absolute, /^MODELED/);
  assert.equal(claims.d10_length_and_preparation_response, 'MEASURED');
  const specClaims = model.spec.sarcomere.components
    .find((component) => component.id === 'lattice').evidence_by_claim;
  assert.match(specClaims.d10_absolute_value, /^MODELED/);
  assert.equal(specClaims.d10_length_and_preparation_response, 'MEASURED');
});

test('PHASE7: titin strand count equals the MEASURED copy number', () => {
  const n = model.spec.sarcomere.copy_number.titin_per_half_thick_filament;
  assert.equal(lattice.titinAzimuths().length, n);
  assert.equal(lattice.titinStrandOffsets(2200).length, n);
});

test('PHASE7: strand offsets are six-fold symmetric on the filament surface', () => {
  const offs = lattice.titinStrandOffsets(2200);
  const rThick = model.spec.sarcomere.components
    .find((c) => c.id === 'thick_filament').dimensions_nm.diameter / 2;
  // Symmetry: the offsets must sum to zero transversely.
  assert.ok(Math.abs(offs.reduce((s, o) => s + o.y, 0)) < 1e-9);
  assert.ok(Math.abs(offs.reduce((s, o) => s + o.z, 0)) < 1e-9);
  // Each strand lies on the thick-filament surface, at equal angular spacing.
  for (const o of offs) {
    assert.ok(Math.abs(Math.hypot(o.y, o.z) - rThick) < 1e-9);
    assert.equal(o.radius_nm, rThick);
  }
  const gaps = offs.map((o, i) => (offs[(i + 1) % offs.length].azimuth_deg - o.azimuth_deg + 360) % 360);
  for (const g of gaps) assert.ok(Math.abs(g - 360 / offs.length) < 1e-9);
});

test('PHASE7: the azimuthal arrangement is never claimed above SCHEMATIC', () => {
  // The spec's unknowns list declares this UNKNOWN. The render must say so.
  assert.match(RADIAL_TITIN_POLICY.evidence_class, /^SCHEMATIC/);
  assert.equal(lattice.provenance().evidence_by_claim.titin_azimuthal_arrangement, 'SCHEMATIC');
  assert.ok(RADIAL_TITIN_POLICY.does_not_claim.length >= 3);
  const specUnknown = model.spec.sarcomere.unknowns
    .find((u) => /azimuthal/i.test(u.item));
  assert.ok(specUnknown, 'spec must carry an entry for the azimuthal arrangement');
});

test('PHASE7: a spec/renderer divergence is declared, never silent', () => {
  // Session 15: PDB 8G4L resolved the arrangement, so the spec entry is no longer
  // UNKNOWN. The renderer still draws the six-fold schematic. That gap is legitimate
  // (cardiac source vs skeletal scope) but it must be DECLARED — the failure mode
  // this guards is a spec that claims MEASURED while the renderer draws otherwise.
  const specEntry = model.spec.sarcomere.unknowns.find((u) => /azimuthal/i.test(u.item));
  const stillUnknown = /UNKNOWN/.test(specEntry.class);
  const div = RADIAL_TITIN_POLICY.known_divergence_from_measurement;

  if (!stillUnknown) {
    assert.ok(div, 'spec no longer declares UNKNOWN, so the renderer must declare its divergence');
    assert.ok(div.measured_in, 'the divergence must name where the measurement lives');
    assert.ok(div.source, 'the divergence must name the structure that resolved it');
    assert.ok(div.why_not_yet_adopted, 'a retained schematic needs a stated reason');
    // Superseding must preserve the original reasoning, not overwrite it.
    assert.ok(specEntry.superseded, 'a superseded unknown must keep its prior reasoning');
    assert.ok(specEntry.superseded.previous_class);
  }
  // Either way the render itself is still schematic and must say so.
  assert.match(RADIAL_TITIN_POLICY.evidence_class, /^SCHEMATIC/);
  assert.equal(lattice.provenance().evidence_by_claim.titin_azimuthal_arrangement, 'SCHEMATIC');
});

test('PHASE7: the declared divergence magnitudes match the measured arrangement', () => {
  const div = RADIAL_TITIN_POLICY.known_divergence_from_measurement;
  if (!div) return;
  // Recompute rather than trust the literals: equal 60 deg spacing cannot reproduce
  // a 30 deg intra-pair gap, so the best achievable azimuthal error over the (free,
  // unclaimed) schematic phase is 15 deg and the worst is 30 deg.
  const meas = [47.2, 77.2, 167.2, 197.2, 287.2, 317.2];
  const sch = [0, 60, 120, 180, 240, 300];
  let best = Infinity, worst = -Infinity;
  for (let ph = 0; ph < 60; ph += 0.1) {
    const e = Math.max(...meas.map((m) => Math.min(...sch.map((s) => {
      const d = Math.abs(((m - (s + ph) + 180) % 360 + 360) % 360 - 180);
      return d;
    }))));
    best = Math.min(best, e); worst = Math.max(worst, e);
  }
  assert.ok(Math.abs(div.max_azimuthal_error_deg.best_case_phase - best) < 0.2,
    `declared best-case ${div.max_azimuthal_error_deg.best_case_phase} vs computed ${best.toFixed(2)}`);
  assert.ok(Math.abs(div.max_azimuthal_error_deg.worst_case_phase - worst) < 0.2,
    `declared worst-case ${div.max_azimuthal_error_deg.worst_case_phase} vs computed ${worst.toFixed(2)}`);
  // Radial error against the rendered shell radius the renderer actually uses.
  const offs = lattice.titinStrandOffsets(2200);
  const rendered = offs[0].radius_nm;
  assert.ok(Math.abs(div.max_radial_error_nm - Math.abs(8.57 - rendered)) < 0.02,
    `declared radial error ${div.max_radial_error_nm} vs 8.57-${rendered}`);
});

test('PHASE7: latticePatch rejects an invalid ring count', () => {
  for (const bad of [-1, 1.5, NaN, 'two'])
    assert.throws(() => lattice.latticePatch(2200, bad), /non-negative integer/);
});

// ----------------------------------------------------------- scene layer ----

test('PHASE7: the lattice layer is opt-in and does not perturb the axial scene', () => {
  const plain = model.sceneAt(2200);
  assert.equal('lattice' in plain, false);
  const withLat = model.strategy.sceneAt(2200, { lattice, latticeRings: 1 });
  assert.ok(withLat.lattice);
  // Every axial descriptor must be byte-identical with and without the lattice.
  assert.deepEqual(withLat.sarcomere, plain.sarcomere);
  assert.deepEqual(withLat.titin, plain.titin);
});

test('PHASE7: verifyScene passes with the lattice at every state', () => {
  for (const sl of STATES) {
    const sc = model.strategy.sceneAt(sl, { lattice, latticeRings: 2 });
    const { errors, notes } = model.strategy.verifyScene(sc);
    assert.deepEqual(errors, [], `SL=${sl}: ${errors.join('; ')}`);
    // The idealization caveat must always reach the reader.
    assert.ok(notes.some((n) => /constant-volume idealization/.test(n)));
  }
});

// ---------------------------------------------------------------- render ----

test('PHASE7: scene uses the primitive vocabulary the plan specifies', () => {
  const sc = model.strategy.sceneAt(2200, { lattice, latticeRings: 1 });
  const s = new SarcomereScene();
  const root = s.build(sc, model.domainInstancesAt(2200));
  const kinds = new Set();
  root.traverse((o) => {
    if (o.isInstancedMesh) kinds.add('InstancedMesh');
    else if (o.isMesh) kinds.add(o.geometry.type);
  });
  for (const want of ['CylinderGeometry', 'BoxGeometry', 'TubeGeometry', 'InstancedMesh'])
    assert.ok(kinds.has(want), `missing ${want}; got ${[...kinds].join(', ')}`);
  s.clear();
});

test('PHASE7: filament meshes match their descriptor extents exactly', () => {
  // The renderer must not re-derive geometry. Measure the built meshes and
  // compare against the descriptors they came from.
  const sc = model.strategy.sceneAt(2200, { lattice, latticeRings: 1 });
  const s = new SarcomereScene();
  const root = s.build(sc, model.domainInstancesAt(2200));
  root.updateMatrixWorld(true);
  for (const id of ['thick_filament', 'thin_filament']) {
    const d = sc.sarcomere.find((x) => x.id === id).transform;
    const mesh = root.getObjectByName(`${id}_central`);
    assert.ok(mesh, `${id}_central not built`);
    const box = new THREE.Box3().setFromObject(mesh);
    assert.ok(Math.abs((box.max.x - box.min.x) - d.length_nm) < 1e-6,
      `${id} length ${box.max.x - box.min.x} != descriptor ${d.length_nm}`);
    assert.ok(Math.abs(box.min.x - d.start_nm) < 1e-6);
    assert.ok(Math.abs(box.max.x - d.end_nm) < 1e-6);
  }
  s.clear();
});

test('PHASE7: shared components are drawn once, half-scoped components twice', () => {
  const sc = model.strategy.sceneAt(2200, { lattice, latticeRings: 1 });
  const s = new SarcomereScene();
  const root = s.build(sc, model.domainInstancesAt(2200));
  const count = {};
  root.traverse((o) => { if (o.isMesh) count[o.name] = (count[o.name] || 0) + 1; });
  // The thick filament spans the whole A-band and the M-line sits on the mirror
  // plane: mirroring either would draw a coincident duplicate.
  assert.equal(count.thick_filament_central, 1);
  assert.equal(count.thick_filament_lattice, 1);
  assert.equal(count.mline, 1);
  // Z-disc, thin filament and titin belong to one half each.
  assert.equal(count.zdisc, 2);
  assert.equal(count.thin_filament_central, 2);
  assert.equal(count.titin_strand_0, 2);
  s.clear();
});

test('PHASE7: the mirror preserves handedness (no inside-out geometry)', () => {
  // A reflection has determinant -1 and inverts triangle winding, which makes
  // the whole mirrored half render inside-out under back-face culling. The
  // repeat must therefore be a rotation.
  const sc = model.strategy.sceneAt(2200, { lattice, latticeRings: 1 });
  const s = new SarcomereScene();
  const root = s.build(sc, model.domainInstancesAt(2200));
  root.updateMatrixWorld(true);
  const mirrored = root.getObjectByName('half_sarcomere_mirrored');
  assert.ok(mirrored);
  assert.ok(mirrored.matrixWorld.determinant() > 0,
    'mirrored half has negative determinant — winding inverted');
  s.clear();
});

test('PHASE7: full repeating unit spans one sarcomere length', () => {
  for (const sl of STATES) {
    const sc = model.strategy.sceneAt(sl, { lattice, latticeRings: 1 });
    const s = new SarcomereScene();
    const root = s.build(sc, model.domainInstancesAt(sl));
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    // Z-disc centres sit at 0 and SL; the boxes extend a half Z-disc beyond each.
    const zHalf = model.spec.sarcomere.components
      .find((c) => c.id === 'zdisc').dimensions_nm.width_X / 2;
    assert.ok(Math.abs(box.min.x + zHalf) < 1e-6, `min.x ${box.min.x} != -${zHalf}`);
    assert.ok(Math.abs(box.max.x - (sl + zHalf)) < 1e-6, `max.x ${box.max.x} != ${sl + zHalf}`);
    s.clear();
  }
});

test('PHASE7: titin halves meet at the M-line without crossing it', () => {
  for (const sl of STATES) {
    const sc = model.strategy.sceneAt(sl, { lattice, latticeRings: 1 });
    const s = new SarcomereScene();
    const root = s.build(sc, model.domainInstancesAt(sl));
    root.updateMatrixWorld(true);
    const mlineX = sc.sarcomere.find((x) => x.id === 'mline').transform.position_nm;
    const b0 = new THREE.Box3().setFromObject(
      root.getObjectByName('half_sarcomere').getObjectByName('titin'));
    const b1 = new THREE.Box3().setFromObject(
      root.getObjectByName('half_sarcomere_mirrored').getObjectByName('titin'));
    assert.ok(b0.max.x <= mlineX + 1e-6, `titin crosses the M-line at SL=${sl}`);
    assert.ok(b1.min.x >= mlineX - 1e-6);
    // The two halves must be reflections of each other about the M-line.
    assert.ok(Math.abs((mlineX - b0.max.x) - (b1.min.x - mlineX)) < 1e-6,
      'titin halves are not symmetric about the M-line');
    s.clear();
  }
});

test('PHASE7: thin-filament double overlap is reported below SL~2150', () => {
  // Thin-filament length is SL-invariant, so at short SL the pointed ends from
  // opposite halves interdigitate past the M-line. This is real physiology (the
  // ascending limb of the length-tension relation) and must be reported, not
  // clipped away.
  const at = (sl) => {
    const sc = model.strategy.sceneAt(sl, { lattice, latticeRings: 1 });
    const s = new SarcomereScene();
    s.build(sc, model.domainInstancesAt(sl));
    const m = s.manifest.thin_filament_double_overlap;
    s.clear();
    return m;
  };
  const short = at(1900);
  assert.equal(short.present, true);
  // Overshoot = thin length + Z-disc half-width - SL/2, from spec dimensions.
  const thinLen = model.spec.sarcomere.components
    .find((c) => c.id === 'thin_filament').dimensions_nm.length_X;
  const zHalf = model.spec.sarcomere.components
    .find((c) => c.id === 'zdisc').dimensions_nm.width_X / 2;
  assert.ok(Math.abs(short.overshoot_past_mline_nm - (thinLen + zHalf - 1900 / 2)) < 1e-6);
  assert.equal(at(2400).present, false);
  assert.equal(at(2400).overshoot_past_mline_nm, 0);
});

test('PHASE7: the manifest declares what the render does not claim', () => {
  const sc = model.strategy.sceneAt(2200, { lattice, latticeRings: 1 });
  const s = new SarcomereScene();
  s.build(sc, model.domainInstancesAt(2200));
  const man = s.manifest;
  assert.equal(man.evidence.titin_azimuthal_arrangement, 'SCHEMATIC');
  assert.ok(man.not_claimed.some((x) => /azimuthal/.test(x)));
  assert.ok(man.render_only.some((x) => /tube radius/.test(x)));
  assert.ok(man.render_only.some((x) => /radial titin path/.test(x)));
  assert.equal(man.units, 'nanometres (1 scene unit = 1 nm)');
  s.clear();
});

test('PHASE7: weaker evidence renders more transparent, monotonically', () => {
  const order = ['MEASURED', 'STRONGLY INFERRED', 'INFERRED', 'SCHEMATIC', 'UNKNOWN'];
  for (let i = 1; i < order.length; i += 1)
    assert.ok(EVIDENCE_STYLE[order[i]].opacity < EVIDENCE_STYLE[order[i - 1]].opacity,
      `${order[i]} must be more transparent than ${order[i - 1]}`);
  // Parenthetical qualifiers must still resolve, and the longest prefix wins so
  // "STRONGLY INFERRED" never falls through to "INFERRED".
  assert.equal(evidenceStyle('STRONGLY INFERRED (axial tilt)').opacity,
    EVIDENCE_STYLE['STRONGLY INFERRED'].opacity);
  assert.equal(evidenceStyle('SCHEMATIC (arrangement) over MEASURED (copy number)').opacity,
    EVIDENCE_STYLE.SCHEMATIC.opacity);
});

// -------------------------------------------------- domain InstancedMesh ----

test('PHASE7: repeated domains are drawn as InstancedMesh, one batch per archetype', () => {
  const batches = model.instancing.batchesAt(2200);
  const sc = model.strategy.sceneAt(2200, { lattice, latticeRings: 1 });
  const s = new SarcomereScene();
  const root = s.build(sc, model.domainInstancesAt(2200), { domainBatches: batches });
  const names = [];
  root.traverse((o) => { if (o.isInstancedMesh) names.push(o.name); });
  for (const b of batches.batches) {
    assert.ok(names.some((n) => n.startsWith(`domains_${b.archetype}`)),
      `no InstancedMesh for ${b.archetype}`);
  }
  // Draw calls scale with archetypes x evidence classes present, NOT with the
  // 284 domains — that is the point of instancing.
  const domainMeshes = names.filter((n) => n.startsWith('domains_'));
  assert.ok(domainMeshes.length <= batches.batches.length * 5 * 2,
    `too many domain draw calls: ${domainMeshes.length}`);
  assert.ok(domainMeshes.length < 284, 'domains are not being instanced');
  // Every batched domain must be drawn exactly once per half.
  let drawn = 0;
  root.traverse((o) => { if (o.name?.startsWith('domains_')) drawn += o.count; });
  assert.equal(drawn, batches.totals.batched * 2, 'domain instance count mismatch');
  s.clear();
});

test('PHASE7: archetype primitives reproduce their descriptor dimensions', () => {
  // A capsule's `length` argument is the cylindrical section only; forgetting the
  // two hemispherical caps would silently lengthen every domain by its diameter.
  const s = new SarcomereScene();
  for (const b of model.instancing.batchesAt(2200).batches) {
    const geom = s._archetypeGeometry(b.geometry);
    geom.computeBoundingBox();
    const bb = geom.boundingBox;
    assert.ok(Math.abs((bb.max.y - bb.min.y) - b.geometry.axial_length_nm) < 1e-6,
      `${b.archetype}: axial ${bb.max.y - bb.min.y} != ${b.geometry.axial_length_nm}`);
    assert.ok(Math.abs((bb.max.x - bb.min.x) - b.geometry.lateral_diameter_nm) < 1e-6,
      `${b.archetype}: lateral != ${b.geometry.lateral_diameter_nm}`);
    geom.dispose();
  }
});

test('PHASE7: an unknown archetype primitive is refused, not guessed at', () => {
  const s = new SarcomereScene();
  assert.throws(() => s._archetypeGeometry({ primitive: 'torus', axial_length_nm: 4, lateral_diameter_nm: 2 }),
    /unsupported archetype primitive/);
});

test('PHASE7: every domain instance sits at its descriptor position', () => {
  const batches = model.instancing.batchesAt(2200);
  const sc = model.strategy.sceneAt(2200, { lattice, latticeRings: 1 });
  const s = new SarcomereScene();
  const root = s.build(sc, model.domainInstancesAt(2200), { domainBatches: batches, domainStrands: [0] });
  // Instances are split across one mesh per (archetype, evidence class), so the
  // check collects every drawn X and matches it against the descriptor set —
  // stronger than indexing by position, because it also proves nothing was
  // dropped or duplicated by the split.
  const m4 = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const half = root.getObjectByName('half_sarcomere');
  for (const b of batches.batches) {
    const drawn = [];
    half.traverse((o) => {
      if (o.isInstancedMesh && o.userData.archetype === b.archetype) {
        for (let i = 0; i < o.count; i += 1) {
          o.getMatrixAt(i, m4);
          v.setFromMatrixPosition(m4);
          drawn.push(v.clone());
        }
      }
    });
    const strand = sc.lattice.titin_strands.offsets.find((o) => o.strand_index === 0);
    const aBandStart = sc.sarcomere.find((x) => x.id === 'thick_filament').transform.start_nm;
    const want = b.transforms.map((t) => {
      const f = t.position_nm.x >= aBandStart ? 1 : t.position_nm.x / aBandStart;
      return {
        x: t.position_nm.x,
        y: t.position_nm.y + strand.y * f,
        z: t.position_nm.z + strand.z * f,
      };
    }).sort((x, y) => x.x - y.x);
    drawn.sort((x, y) => x.x - y.x);
    assert.equal(drawn.length, want.length, `${b.archetype}: instance count changed`);
    for (let i = 0; i < want.length; i += 1) {
      // Tolerance is InstancedMesh Float32Array matrix precision (~1e-4 at
      // x ~ 1000 nm), not slack in the placement.
      for (const axis of ['x', 'y', 'z']) {
        assert.ok(Math.abs(drawn[i][axis] - want[i][axis]) < 1e-3,
          `${b.archetype}[${i}]: ${axis} ${drawn[i][axis]} != ${want[i][axis]}`);
      }
    }
  }
  s.clear();
});

test('PHASE7: renderer consumes full tilt azimuth, not only tilt magnitude', () => {
  const s = new SarcomereScene();
  const sc = model.contextSceneAt(2200, { rings: 1 });
  const batches = model.instancing.batchesAt(2200);
  const root = s.build(sc, model.domainInstancesAt(2200), {
    domainBatches: batches, domainStrands: [0],
  });
  const half = root.getObjectByName('half_sarcomere');
  const targets = batches.batches.flatMap((b) => b.transforms)
    .filter((t) => ['Aband_super.55', 'Aband_super.56'].includes(t.domain_id));
  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const axis = new THREE.Vector3();
  for (const target of targets) {
    let found = false;
    half.traverse((o) => {
      if (found || !o.isInstancedMesh || o.userData.archetype !== target.domain_class) return;
      for (let i = 0; i < o.count; i += 1) {
        o.getMatrixAt(i, m4);
        pos.setFromMatrixPosition(m4);
        if (Math.abs(pos.x - target.position_nm.x) > 1e-3) continue;
        axis.set(0, 1, 0).transformDirection(m4);
        const th = THREE.MathUtils.degToRad(target.rotation.tilt_deg_from_axis);
        const az = THREE.MathUtils.degToRad(target.rotation.azimuth_deg);
        assert.ok(axis.distanceTo(new THREE.Vector3(
          Math.cos(th), Math.sin(th) * Math.cos(az), Math.sin(th) * Math.sin(az),
        )) < 1e-4, `${target.domain_id}: rendered axis ${axis.toArray()}`);
        found = true;
        break;
      }
    });
    assert.ok(found, `${target.domain_id}: rendered instance not found`);
  }
  s.clear();
});

test('PHASE7: the two unbatched path records are the N2A coil and PEVK', () => {
  // 287 records: 285 folded components are batched, while the N2A composite's
  // WLC path and the PEVK WLC path remain unbatched. N2A.1's generic Ig component
  // is included in the folded batch; this check concerns only the path records.
  const batches = model.instancing.batchesAt(2200);
  const batched = new Set(batches.batches.flatMap((b) => b.transforms.map((t) => t.domain_id)));
  const unbatched = model.domainInstancesAt(2200).instances
    .filter((d) => !batched.has(d.domain_id));
  assert.equal(unbatched.length, 2);
  assert.deepEqual(unbatched.map((d) => d.domain_class).sort(), ['N2A', 'PEVK']);
});

test('PHASE7: a batch renders the weakest evidence among its members', () => {
  const s = new SarcomereScene();
  assert.equal(s._weakestEvidence(['MEASURED', 'INFERRED']), 'INFERRED');
  assert.equal(s._weakestEvidence(['MEASURED', 'MEASURED']), 'MEASURED');
  // Longest-prefix match: STRONGLY INFERRED must not degrade to INFERRED.
  assert.equal(s._weakestEvidence(['STRONGLY INFERRED (x)', 'MEASURED']), 'STRONGLY INFERRED');
  assert.equal(s._weakestEvidence(['MEASURED', 'SCHEMATIC (y)']), 'SCHEMATIC');
  // An unreadable provenance string is not evidence of confidence.
  assert.equal(s._weakestEvidence(['MEASURED', 'probably fine']), 'UNKNOWN');
});

test('PHASE7: domain detail is opt-in and defaults to the central strand', () => {
  const sc = model.strategy.sceneAt(2200, { lattice, latticeRings: 1 });
  const s1 = new SarcomereScene();
  const r1 = s1.build(sc, model.domainInstancesAt(2200));
  let n1 = 0; r1.traverse((o) => { if (o.name?.startsWith('domains_')) n1 += 1; });
  assert.equal(n1, 0, 'domains must not be drawn unless requested');
  assert.equal(s1.manifest.domains, null);
  s1.clear();

  const batches = model.instancing.batchesAt(2200);
  const s2 = new SarcomereScene();
  s2.build(sc, model.domainInstancesAt(2200), { domainBatches: batches });
  assert.deepEqual(s2.manifest.domains.strands_with_domain_detail, [0]);
  s2.clear();
});

// ------------------------------------------- lattice accounting + viewer ----

test('PHASE7: every lattice site is actually drawn, at every ring count', () => {
  for (const rings of [1, 2, 3]) {
    const s = new SarcomereScene();
    s.build(model.contextSceneAt(2200, { rings }), model.domainInstancesAt(2200));
    const L = s.manifest.lattice;
    assert.equal(L.thick_drawn, L.thick_sites, `rings=${rings}: thick drawn != sites`);
    assert.equal(L.thin_drawn, L.thin_sites, `rings=${rings}: thin drawn != sites`);
    s.clear();
  }
});

test('PHASE7: a degenerate lattice is refused rather than miscounted', () => {
  // rings=0 yields one thick filament and no complete triangles, so there is no
  // trigonal thin site. Drawing it would show the on-axis axial idealization
  // while the manifest claimed a lattice.
  const s = new SarcomereScene();
  assert.throws(
    () => s.build(model.contextSceneAt(2200, { rings: 0 }), model.domainInstancesAt(2200)),
    /no trigonal thin sites/,
  );
});

test('PHASE7: model.contextSceneAt adds the lattice; sceneAt still does not', () => {
  assert.equal('lattice' in model.sceneAt(2200), false,
    'the axial scene must stay exactly what pre-Phase-7 callers expect');
  assert.ok(model.contextSceneAt(2200, { rings: 1 }).lattice);
  // Both must satisfy the same forbidden rules.
  assert.deepEqual(model.verifyScene(model.sceneAt(2200)).errors, []);
  assert.deepEqual(model.verifyScene(model.contextSceneAt(2200, { rings: 1 })).errors, []);
});

test('PHASE7: domains render at their own evidence class, not the batch minimum', () => {
  // Fn3 placement is MEASURED for 121 instances and SCHEMATIC for 11. Collapsing
  // the archetype to its weakest member would draw all 132 at SCHEMATIC opacity
  // and understate what is known about the majority.
  const batches = model.instancingPlanAt(2200);
  const s = new SarcomereScene();
  const root = s.build(model.contextSceneAt(2200, { rings: 1 }),
    model.domainInstancesAt(2200), { domainBatches: batches, domainStrands: [0] });

  for (const b of s.manifest.domains.batches) {
    const total = Object.values(b.by_evidence).reduce((x, y) => x + y, 0);
    assert.equal(total, b.count, `${b.archetype}: by_evidence does not sum to count`);
  }
  // Each (archetype, class) pair must exist as its own mesh with the right count.
  const half = root.getObjectByName('half_sarcomere');
  for (const b of s.manifest.domains.batches) {
    const classes = Object.keys(b.by_evidence);
    for (const cls of classes) {
      const name = classes.length === 1
        ? `domains_${b.archetype}`
        : `domains_${b.archetype}__${cls.replace(/ /g, '_')}`;
      const mesh = half.getObjectByName(name);
      assert.ok(mesh, `missing ${name}`);
      assert.equal(mesh.count, b.by_evidence[cls], `${name}: wrong instance count`);
      assert.equal(mesh.userData.evidence_rendered, cls);
      assert.ok(mesh.material.opacity <= EVIDENCE_STYLE[cls].opacity + 1e-9,
        `${name} renders more opaque than its class allows`);
    }
  }
  s.clear();
});

test('PHASE7: one geometry per archetype is shared across its evidence classes', () => {
  // Splitting by evidence must cost draw calls, not memory: the shape claim is
  // per-archetype and the plan never deforms an archetype.
  const batches = model.instancingPlanAt(2200);
  const s = new SarcomereScene();
  const root = s.build(model.contextSceneAt(2200, { rings: 1 }),
    model.domainInstancesAt(2200), { domainBatches: batches, domainStrands: [0] });
  const geoms = new Set();
  root.traverse((o) => { if (o.name?.startsWith('domains_')) geoms.add(o.geometry); });
  assert.equal(geoms.size, batches.batches.length,
    'expected exactly one geometry per archetype');
  s.clear();
});

test('PHASE7: a shared geometry is disposed exactly once', () => {
  // With geometry shared across evidence classes, a flat list of disposables
  // would call dispose() once per user of the resource.
  const s = new SarcomereScene();
  s.build(model.contextSceneAt(2200, { rings: 1 }), model.domainInstancesAt(2200),
    { domainBatches: model.instancingPlanAt(2200) });
  let calls = 0;
  for (const d of s.disposables) {
    const orig = d.dispose.bind(d);
    d.dispose = () => { calls += 1; orig(); };
  }
  const n = s.disposables.size;
  s.clear();
  assert.equal(calls, n, 'dispose() did not run exactly once per resource');
});

test('PHASE7: the instanced-mesh inventory matches the built tree', () => {
  const s = new SarcomereScene();
  const root = s.build(model.contextSceneAt(2200, { rings: 1 }),
    model.domainInstancesAt(2200), { domainBatches: model.instancingPlanAt(2200) });
  const real = new Set();
  root.traverse((o) => { if (o.isInstancedMesh) real.add(o.name); });
  assert.deepEqual(s.manifest.primitives_used.instanced_mesh, [...real].sort(),
    'the manifest inventory disagrees with what was drawn');
  s.clear();
});

test('PHASE7: mirrored InstancedMesh batches keep their instance matrices', () => {
  // The mirrored half is a clone(); if clone() dropped instanceMatrix the second
  // half would render its domains stacked at the origin.
  const batches = model.instancing.batchesAt(2200);
  const s = new SarcomereScene();
  const root = s.build(model.contextSceneAt(2200, { rings: 1 }),
    model.domainInstancesAt(2200), { domainBatches: batches });
  const NAME = 'domains_Ig_like__INFERRED';
  const a = root.getObjectByName('half_sarcomere').getObjectByName(NAME);
  const b = root.getObjectByName('half_sarcomere_mirrored').getObjectByName(NAME);
  assert.ok(a && b, `both halves must carry ${NAME}`);
  const m1 = new THREE.Matrix4();
  const m2 = new THREE.Matrix4();
  a.getMatrixAt(5, m1);
  b.getMatrixAt(5, m2);
  assert.ok(m1.elements.every((v, i) => Math.abs(v - m2.elements[i]) < 1e-9),
    'clone() lost the instance matrices');
  s.clear();
});

test('PHASE7: every state the user can reach builds and verifies', () => {
  // The viewer exposes a continuous slider and four independent toggles. Any
  // combination is reachable in two clicks, so all of them must be as verified
  // as the four keyframes — this is the guarantee the UI is making.
  let n = 0;
  for (let sl = 1900; sl <= 3000; sl += 50) {
    for (const showLattice of [true, false]) {
      for (const showDomains of [true, false]) {
        for (const mirror of [true, false]) {
          const scene = showLattice
            ? model.contextSceneAt(sl, { rings: 1 })
            : model.sceneAt(sl);
          assert.deepEqual(model.verifyScene(scene).errors, [], `SL=${sl} failed verification`);
          const s = new SarcomereScene();
          s.build(scene, model.domainInstancesAt(sl), {
            mirror,
            titinStrands: showLattice,
            domainBatches: showDomains ? model.instancingPlanAt(sl) : null,
          });
          // The panel always has something to display in these three fields.
          assert.ok(s.manifest.render_only.length > 0, `SL=${sl}: empty render_only`);
          assert.ok(Object.keys(s.manifest.evidence).length > 0, `SL=${sl}: no evidence`);
          if (s.manifest.lattice) {
            assert.equal(s.manifest.lattice.thick_drawn, s.manifest.lattice.thick_sites);
          }
          s.clear();
          n += 1;
        }
      }
    }
  }
  assert.ok(n >= 184, `expected a full sweep, ran ${n}`);
});

test('PHASE7: every manifest evidence value maps to a known style', () => {
  // The panel renders each evidence value at its class opacity. An unmatched
  // string would silently fall back and misreport confidence.
  const s = new SarcomereScene();
  s.build(model.contextSceneAt(2200, { rings: 1 }), model.domainInstancesAt(2200),
    { domainBatches: model.instancingPlanAt(2200) });
  const classes = Object.keys(EVIDENCE_STYLE).sort((a, b) => b.length - a.length);
  for (const [k, v] of Object.entries(s.manifest.evidence)) {
    const hit = classes.find((c) => String(v).toUpperCase().startsWith(c));
    assert.ok(hit, `evidence "${k}" = "${v}" matches no known class`);
  }
  s.clear();
});

test('PHASE7: camera presets are directions, so they hold at any length', () => {
  // A preset stored as a POSITION would be wrong the moment SL changed.
  for (const [name, v] of Object.entries(VIEWS)) {
    assert.ok(Array.isArray(v.dir) && v.dir.length === 3, `${name} is not a direction`);
    assert.ok(Math.hypot(...v.dir) > 0, `${name} has a zero direction`);
    assert.equal(typeof v.label, 'string');
  }
});

test('PHASE7: clear() releases every GPU resource it allocated', () => {
  const sc = model.strategy.sceneAt(2200, { lattice, latticeRings: 2 });
  const s = new SarcomereScene();
  s.build(sc, model.domainInstancesAt(2200));
  assert.ok(s.disposables.size > 0);
  let disposed = 0;
  for (const d of s.disposables) {
    const orig = d.dispose.bind(d);
    d.dispose = () => { disposed += 1; orig(); };
  }
  const n = s.disposables.size;
  s.clear();
  assert.equal(disposed, n, 'not every geometry/material was disposed');
  assert.equal(s.disposables.size, 0);
  assert.equal(s.root.children.length, 0);
  assert.equal(s.manifest, null);
});

test('PHASE7: build() is idempotent — rebuilding does not accumulate meshes', () => {
  const sc = model.strategy.sceneAt(2200, { lattice, latticeRings: 1 });
  const s = new SarcomereScene();
  s.build(sc, model.domainInstancesAt(2200));
  const count = () => { let n = 0; s.root.traverse((o) => { if (o.isMesh) n += 1; }); return n; };
  const first = count();
  s.build(sc, model.domainInstancesAt(2200));
  assert.equal(count(), first, 'rebuild accumulated meshes');
  s.clear();
});

// ---------------------------------------------------------------------------
// Trigonal-site completeness.
//
// Guards a defect actually found (not hypothetical): the enumeration anchored
// triangles only at in-patch cells, so a triangle anchored outside the patch
// with all three corners inside was dropped — 5 sites at rings=1 instead of 6,
// breaking the patch's own 6-fold symmetry. It was caught by comparing the
// RENDERED scene against this list, because the mirrored half drew a thin
// filament at a trigonal position the list did not contain.
// ---------------------------------------------------------------------------

test('PHASE7: trigonal site count is exactly 6*rings^2 at every ring count', () => {
  for (const rings of [0, 1, 2, 3, 4]) {
    const p = model.latticePatchAt(2200, rings);
    assert.equal(p.thin.length, 6 * rings * rings,
      `rings=${rings}: a hexagon of side ${rings} tiles into 6*rings^2 unit triangles`);
    assert.equal(p.thick.length, 1 + 3 * rings * (rings + 1),
      `rings=${rings}: centred hexagonal number`);
  }
});

test('PHASE7: both site sets carry the 6-fold symmetry of the lattice', () => {
  const rot = ([y, z]) => [
    y * Math.cos(Math.PI / 3) - z * Math.sin(Math.PI / 3),
    y * Math.sin(Math.PI / 3) + z * Math.cos(Math.PI / 3),
  ];
  for (const rings of [1, 2, 3]) {
    const p = model.latticePatchAt(2200, rings);
    for (const name of ['thick', 'thin']) {
      const pts = p[name].map((s) => [s.y, s.z]);
      for (const q of pts) {
        const r = rot(q);
        assert.ok(pts.some((o) => Math.hypot(r[0] - o[0], r[1] - o[1]) < 1e-9),
          `rings=${rings} ${name}: rotating (${q[0].toFixed(3)},${q[1].toFixed(3)}) by 60 deg `
          + 'left the site set — the patch is not 6-fold symmetric');
      }
    }
  }
});

test('PHASE7: trigonal sites are the centroids of complete lattice triangles', () => {
  // Independent construction: every thin site must sit at distance a/sqrt(3)
  // from exactly three thick sites (its triangle's corners) and no closer to
  // any other, which is what "trigonal position" means.
  for (const rings of [1, 2, 3]) {
    const p = model.latticePatchAt(2200, rings);
    const a = p.lattice_constant_nm;
    const expect = a / SQRT3;
    for (const t of p.thin) {
      const d = p.thick.map((s) => Math.hypot(s.y - t.y, s.z - t.z)).sort((x, y) => x - y);
      assert.ok(Math.abs(d[0] - expect) < 1e-6 && Math.abs(d[2] - expect) < 1e-6,
        `thin site (${t.y.toFixed(2)},${t.z.toFixed(2)}): three nearest thick sites should all `
        + `be a/sqrt(3)=${expect.toFixed(4)} away, got ${d.slice(0, 3).map((x) => x.toFixed(4))}`);
      assert.ok(d[3] > expect + 1e-6, 'a fourth thick site was equidistant');
    }
  }
});

test('PHASE7: every drawn filament occupies a declared lattice site', () => {
  // The render must not place structure the descriptor list does not contain,
  // and must realize every site the list declares. This is the check that
  // caught the dropped trigonal site.
  const scene = new SarcomereScene();
  for (const sl of STATES) {
    const patch = model.latticePatchAt(sl, 1);
    const root = scene.build(model.contextSceneAt(sl, { rings: 1 }), model.domainInstancesAt(sl));
    root.updateMatrixWorld(true);

    for (const [tagPrefix, declared] of [['thick_filament', patch.thick], ['thin_filament', patch.thin]]) {
      const drawn = [];
      const m = new THREE.Matrix4();
      const v = new THREE.Vector3();
      root.traverse((o) => {
        if (!o.geometry || !(o.name || '').startsWith(tagPrefix)) return;
        const n = o.isInstancedMesh ? o.count : 1;
        for (let k = 0; k < n; k += 1) {
          if (o.isInstancedMesh) { o.getMatrixAt(k, m); m.premultiply(o.matrixWorld); } else m.copy(o.matrixWorld);
          v.set(0, 0, 0).applyMatrix4(m);
          drawn.push([v.y, v.z]);
        }
      });
      assert.ok(drawn.length > 0, `${tagPrefix}: nothing drawn at SL=${sl}`);
      // Each drawn axis lands on a declared site (mirroring maps sites to sites).
      for (const [y, z] of drawn) {
        const near = declared.some((s) => Math.hypot(s.y - y, s.z - z) < 1e-3);
        assert.ok(near, `SL=${sl} ${tagPrefix}: drawn at (${y.toFixed(3)},${z.toFixed(3)}) `
          + 'which is not a declared lattice site');
      }
      // Every declared site is realized by at least one drawn filament.
      for (const s of declared) {
        const hit = drawn.some(([y, z]) => Math.hypot(s.y - y, s.z - z) < 1e-3);
        assert.ok(hit, `SL=${sl} ${tagPrefix}: declared site (${s.y.toFixed(3)},${s.z.toFixed(3)}) `
          + 'is never drawn');
      }
    }
    scene.clear();
  }
});

// ------------------------------------------------- clamp provenance (session 14) ----
// A scene requested outside the keyframe range [1900, 3000] is EVALUATED at the
// clamped SL. The lattice layer used to read its SL from the already-clamped
// geometry object, so latticePatch() never saw the out-of-range request and
// reported was_clamped:false — the descriptor claimed a scene at SL 1600 was
// built at 1600 when it was actually built at 1900. These lock the repair.

test('PHASE7: an out-of-range SL request is reported as clamped', () => {
  for (const sl of [1500, 1600, 1700, 3200, 3400, 4400]) {
    const sc = model.contextSceneAt(sl, { rings: 2 });
    assert.equal(sc.lattice.sarcomere_length_requested_nm, sl,
      `the lattice layer lost the original request at SL=${sl}`);
    assert.equal(sc.lattice.was_clamped, true,
      `SL=${sl} is outside the keyframe range but was_clamped is false`);
    assert.notEqual(sc.lattice.evaluated_at_sl_nm, sl,
      `SL=${sl} claims to have been evaluated at the unsupported value`);
  }
});

test('PHASE7: an in-range SL request is not reported as clamped', () => {
  for (const sl of [1900, 2200, 2600, 3000]) {
    const sc = model.contextSceneAt(sl, { rings: 2 });
    assert.equal(sc.lattice.was_clamped, false, `in-range SL=${sl} reported as clamped`);
    assert.equal(sc.lattice.evaluated_at_sl_nm, sl);
    assert.equal(sc.lattice.sarcomere_length_requested_nm, sl);
  }
});

test('PHASE7: clamping changes provenance only, never the geometry', () => {
  // The repair must not move a single filament: latticePatch() applies the same
  // clamp, so the lattice at a clamped request must be identical to the lattice
  // at the clamp boundary.
  for (const [req, bound] of [[1500, 1900], [1600, 1900], [3400, 3000], [4400, 3000]]) {
    const a = model.contextSceneAt(req, { rings: 2 });
    const b = model.contextSceneAt(bound, { rings: 2 });
    assert.equal(a.lattice.transform.lattice_constant_nm, b.lattice.transform.lattice_constant_nm);
    assert.equal(a.lattice.transform.d10_nm, b.lattice.transform.d10_nm);
    assert.equal(a.lattice.thick_sites.length, b.lattice.thick_sites.length);
    for (let i = 0; i < a.lattice.thick_sites.length; i += 1) {
      assert.ok(Math.abs(a.lattice.thick_sites[i].y - b.lattice.thick_sites[i].y) < 1e-12);
      assert.ok(Math.abs(a.lattice.thick_sites[i].z - b.lattice.thick_sites[i].z) < 1e-12);
    }
  }
});

test('PHASE7: the axial and transverse layers agree on the evaluated SL', () => {
  // The two layers clamp independently; if they ever disagree the scene draws
  // filaments at one SL and a lattice at another.
  for (const sl of [1500, 1900, 2200, 3000, 4400]) {
    const sc = model.contextSceneAt(sl, { rings: 2 });
    assert.equal(sc.lattice.evaluated_at_sl_nm, sc.sarcomere_length_nm,
      `axial layer at ${sc.sarcomere_length_nm} but lattice at ${sc.lattice.evaluated_at_sl_nm}`);
  }
});
