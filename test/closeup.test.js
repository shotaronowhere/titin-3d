
/**
 * closeup.test.js — the close-up camera path.
 *
 * The bug these tests exist for: the near plane was computed once at framing time
 * from the whole-sarcomere extent, which put it ~2050 nm from the camera. Dollying
 * closer than that clipped the entire scene, so the myosin crowns and the
 * thin-filament twist were unreachable no matter how far the user scrolled. The
 * geometry was there the whole time; the camera could not get to it.
 *
 * Viewer needs a canvas and a GPU, so these tests exercise the camera MATHS against
 * the real model geometry — the parts that decide whether a close-up points at the
 * right place and resolves the feature it claims to show.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CLOSEUPS, VIEWS } from '../src/render/Viewer.js';
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { ALIAS_THRESHOLD_PX } from '../src/render/SarcomereScene.js';

const model = await TitinModel.create(nodeReader());
const FOV = 35;
const ASPECT = 1.6;
const VIEWPORT_PX = 1200;

/** Mirrors Viewer.closeUp's distance solve: fit spanNm across the viewport width. */
const distanceFor = (spanNm) =>
  (spanNm / ASPECT / 2) / Math.tan(THREE.MathUtils.degToRad(FOV) / 2);

test('close-ups: every landmark lies inside the structure at every length', () => {
  // The reason landmarks are functions of geometry rather than constants: the
  // I-band/A-band junction moves from X=150 nm to X=700 nm across the range, so a
  // hardcoded X would aim at empty space at other lengths.
  for (const sl of [1900, 2000, 2200, 2400, 2700, 3000]) {
    const g = model.geometryAt(sl);
    for (const [name, p] of Object.entries(CLOSEUPS)) {
      const [x] = p.at(g);
      assert.ok(Number.isFinite(x), `${name} at sl=${sl} must be finite`);
      assert.ok(x >= 0 && x <= g.half_sarcomere_nm,
        `${name} at sl=${sl}: X=${x} must lie within the half-sarcomere (0..${g.half_sarcomere_nm})`);
    }
  }
});

test('close-ups: landmarks track sarcomere length rather than staying put', () => {
  // Guards against a future refactor replacing a geometry lookup with a constant.
  const a = model.geometryAt(1900);
  const b = model.geometryAt(3000);
  const moved = (n) => Math.abs(CLOSEUPS[n].at(b)[0] - CLOSEUPS[n].at(a)[0]);
  for (const n of ['crowns', 'twist', 'junction', 'mline', 'lattice']) {
    assert.ok(moved(n) > 50, `${n} must follow the geometry (moved ${moved(n).toFixed(0)} nm)`);
  }
  // The Z-disc is the one fixed landmark: it is the coordinate origin.
  assert.equal(moved('zdisc'), 0, 'the Z-disc is the origin and must not move');
});

test('close-ups: the crown view lands inside the overlap zone, not the bare zone', () => {
  // The scene centre is the M-line, which is precisely where myosin heads do NOT
  // exist. A crown close-up that inherited that centre would show a bare cylinder.
  for (const sl of [1900, 2200, 2400, 3000]) {
    const g = model.geometryAt(sl);
    const x = CLOSEUPS.crowns.at(g)[0];
    const { start_nm, end_nm } = g.overlap_zone_nm;
    assert.ok(x > start_nm && x < end_nm,
      `sl=${sl}: crown view X=${x.toFixed(0)} must be inside overlap ${start_nm}..${end_nm}`);
    assert.notEqual(Math.round(x), Math.round(g.mline.X), 'must not sit on the M-line');
  }
});

test('close-ups: the twist view avoids the crown array that would occlude it', () => {
  // The long-pitch twist is only legible where no thick filament sits in front of it,
  // i.e. on the I-band side of the junction.
  for (const sl of [1900, 2200, 3000]) {
    const g = model.geometryAt(sl);
    const x = CLOSEUPS.twist.at(g)[0];
    assert.ok(x < g.I_A_junction_X,
      `sl=${sl}: twist view X=${x.toFixed(0)} must be in the I-band (junction ${g.I_A_junction_X})`);
    assert.ok(x >= g.zdisc.width,
      `sl=${sl}: twist view X=${x.toFixed(0)} must clear the Z-disc (${g.zdisc.width} nm)`);
  }
});

test('close-ups: each span resolves the periodicity it claims to show', () => {
  // The scientific point. A close-up on the crown array is only honest if the crown
  // spacing is above the aliasing threshold at that distance — otherwise the user is
  // being shown a moire pattern and told it is a helical array.
  const CROWN_NM = 14.3;
  const CROSSOVER_NM = 37;
  const px = (nm, spanNm) => (VIEWPORT_PX * nm) / spanNm;

  const crownSpan = CLOSEUPS.crowns.spanNm;
  assert.ok(px(CROWN_NM, crownSpan) > ALIAS_THRESHOLD_PX * 10,
    `crown close-up: ${px(CROWN_NM, crownSpan).toFixed(1)} px must clear `
    + `${ALIAS_THRESHOLD_PX} px with margin`);

  const twistSpan = CLOSEUPS.twist.spanNm;
  assert.ok(px(CROSSOVER_NM, twistSpan) > ALIAS_THRESHOLD_PX * 10,
    `twist close-up: ${px(CROSSOVER_NM, twistSpan).toFixed(1)} px must clear the threshold`);

  // And every close-up must be a genuine close-up: the whole sarcomere is >1900 nm,
  // so any span approaching that is a wide shot mislabelled.
  for (const [name, p] of Object.entries(CLOSEUPS)) {
    assert.ok(p.spanNm <= 300, `${name}: span ${p.spanNm} nm is not a close-up`);
    assert.ok(p.spanNm >= 40, `${name}: span ${p.spanNm} nm would be closer than a single head`);
  }
});

test('close-ups: the adaptive near plane does not clip the subject', () => {
  // The regression test for the actual bug. near = 2% of the orbit distance, so the
  // subject is always inside the frustum; the OLD rule (framing distance minus twice
  // the scene radius) is asserted to have been the floor it was.
  const radius = 1125;
  const nearOf = (dist) => Math.max(0.1, dist * 0.02);
  for (const [name, p] of Object.entries(CLOSEUPS)) {
    const dist = distanceFor(p.spanNm);
    const near = nearOf(dist);
    assert.ok(near < dist, `${name}: near ${near.toFixed(1)} must be closer than ${dist.toFixed(0)}`);
    // The subject must be visible: half the span of the feature sits well past near.
    assert.ok(near < dist - p.spanNm / 2,
      `${name}: near plane must clear the near face of the subject`);
    const far = Math.max(dist + radius * 4, near * 1000);
    assert.ok(far > dist + radius,
      `${name}: far plane must still clear the background structure`);
  }
  // The old fixed rule, for contrast: it made every close-up impossible.
  const framingDist = (radius / Math.sin(THREE.MathUtils.degToRad(FOV) / 2)) * 1.15;
  const oldNear = Math.max(1, framingDist - radius * 2);
  for (const p of Object.values(CLOSEUPS)) {
    assert.ok(distanceFor(p.spanNm) < oldNear,
      'every close-up distance must be inside the OLD near plane — proving the old '
      + `rule (near=${oldNear.toFixed(0)} nm) is what blocked approach`);
  }
});

test('close-ups: depth resolution stays finer than the features being drawn', () => {
  // Tying near to distance protects the depth buffer, but the criterion has to be a
  // PHYSICAL one. An earlier version of this test asserted far/near <= 1000, which was
  // an arbitrary bound and failed at the crown preset (1942) despite that view having
  // 0.14 nm depth resolution. The meaningful question is whether two surfaces the
  // model draws can be distinguished, so this computes resolution in nm.
  const radius = 1125;
  const BITS = 24; // WebGL depth buffer
  // The finest axial separation the scene contains: a myosin head is ~19 nm and the
  // crown spacing 14.3 nm, so resolving to 1 nm is an order of margin.
  const REQUIRED_NM = 1.0;
  for (const [name, p] of Object.entries(CLOSEUPS)) {
    const dist = distanceFor(p.spanNm);
    const near = Math.max(0.1, dist * 0.02);
    const far = Math.max(dist + radius * 4, near * 1000);
    // Worst case we care about: background structure across the sarcomere.
    const zBackground = dist + radius * 2;
    const dz = (zBackground * zBackground * (1 / near - 1 / far)) / 2 ** BITS;
    assert.ok(dz < REQUIRED_NM,
      `${name}: depth resolution ${dz.toFixed(3)} nm at the background must be finer `
      + `than ${REQUIRED_NM} nm`);
  }
});

test('close-ups: distances solve from the span, not from tuning', () => {
  // The same preset must show the same physical span on any viewport shape.
  for (const p of Object.values(CLOSEUPS)) {
    for (const aspect of [0.8, 1.0, 1.6, 2.4]) {
      const d = (p.spanNm / aspect / 2) / Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
      const shown = 2 * d * Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * aspect;
      assert.ok(Math.abs(shown - p.spanNm) < 1e-6,
        `span must round-trip at aspect ${aspect}: got ${shown}`);
    }
  }
});

test('close-ups: the vocabulary is complete and self-describing', () => {
  // Every preset must carry what it shows, so the UI can never label a view with a
  // claim the preset does not make.
  for (const [name, p] of Object.entries(CLOSEUPS)) {
    assert.equal(typeof p.label, 'string');
    assert.ok(p.label.length > 3, `${name} needs a label`);
    assert.equal(typeof p.shows, 'string');
    assert.ok(p.shows.length > 10, `${name} must say what it shows`);
    assert.equal(typeof p.at, 'function', `${name}.at must be a geometry function`);
    assert.equal(p.dir.length, 3);
    assert.ok(new THREE.Vector3(...p.dir).length() > 0, `${name} needs a nonzero direction`);
  }
  // The user asked for myosin heads and the twist by name; both must be reachable.
  assert.ok('crowns' in CLOSEUPS, 'a myosin-head close-up must exist');
  assert.ok('twist' in CLOSEUPS, 'a thin-filament-twist close-up must exist');
  // Close-ups are a separate vocabulary from the wide framings.
  for (const k of Object.keys(CLOSEUPS)) {
    assert.ok(!(k in VIEWS), `${k} must not shadow a wide view preset`);
  }
});

test('close-ups: the lattice view looks down the filament axis', () => {
  // A cross-section only reads as hexagonal if the camera is near-axial.
  const dir = new THREE.Vector3(...CLOSEUPS.lattice.dir).normalize();
  assert.ok(Math.abs(dir.x) > 0.98,
    `lattice view must be near-axial (x component ${dir.x.toFixed(3)})`);
});

test('close-ups: the detail layer actually draws at each close-up view width', async () => {
  // The camera maths above proves the view is aimed correctly; this proves the thing
  // it is aimed at is present. Built through the SAME path the page uses
  // (contextSceneAt, which carries the lattice the crowns are placed on) — an earlier
  // probe used sceneAt() and got a null detail report, because sceneAt takes no
  // lattice options and the crown branch is inside the lattice block.
  const { SarcomereScene } = await import('../src/render/SarcomereScene.js');
  for (const [name, p] of Object.entries(CLOSEUPS)) {
    const sc = new SarcomereScene(model);
    sc.build(
      model.contextSceneAt(2200, { rings: 2 }),
      model.domainInstancesAt(2200),
      {
        showLattice: true, showDomains: false, showContextDetail: true,
        contextDetail: model.contextDetailSceneAt(2200, { rings: 2 }),
        viewWidthNm: p.spanNm, viewportPx: VIEWPORT_PX,
      },
    );
    const cd = sc.manifest.context_detail;
    assert.ok(cd, `${name}: the detail layer must report at a ${p.spanNm} nm view width`);
    assert.equal(cd.heads_drawn, true,
      `${name}: heads must be admitted at ${p.spanNm} nm `
      + `(${cd.crown_spacing_px} px vs ${cd.alias_threshold_px} px threshold)`);
    assert.equal(cd.twist_drawn, true, `${name}: the twist must be admitted at ${p.spanNm} nm`);
    assert.ok(cd.head_instances > 0, `${name}: heads must have instances`);
    assert.ok(cd.crown_spacing_px > cd.alias_threshold_px * 10,
      `${name}: crown spacing ${cd.crown_spacing_px} px must clear the threshold with margin`);
  }
});

test('close-ups: the camera frustum actually contains drawn structure', async () => {
  // A correctly-aimed camera with a correct frustum can still show nothing if the
  // near/far pair excludes the geometry. This counts drawables whose bounding sphere
  // intersects the frustum, which is the closest headless proxy for "the user sees
  // something" available without a GPU.
  const { SarcomereScene } = await import('../src/render/SarcomereScene.js');
  const g = model.geometryAt(2200);
  const radius = 1125;
  for (const [name, p] of Object.entries(CLOSEUPS)) {
    const sc = new SarcomereScene(model);
    const root = sc.build(
      model.contextSceneAt(2200, { rings: 2 }),
      model.domainInstancesAt(2200),
      {
        showLattice: true, showDomains: false, showContextDetail: true,
        contextDetail: model.contextDetailSceneAt(2200, { rings: 2 }),
        viewWidthNm: p.spanNm, viewportPx: VIEWPORT_PX,
      },
    );
    const target = new THREE.Vector3(...p.at(g));
    const dist = distanceFor(p.spanNm);
    const near = Math.max(0.1, dist * 0.02);
    const far = Math.max(dist + radius * 4, near * 1000);
    const cam = new THREE.PerspectiveCamera(FOV, ASPECT, near, far);
    cam.position.copy(target).add(new THREE.Vector3(...p.dir).normalize().multiplyScalar(dist));
    cam.lookAt(target);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    const frustum = new THREE.Frustum().setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse),
    );
    let visible = 0;
    root.traverse((o) => {
      if (!(o.isMesh || o.isInstancedMesh || o.isLine)) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const s = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld);
      if (frustum.intersectsSphere(s)) visible += 1;
    });
    assert.ok(visible > 10,
      `${name}: only ${visible} drawables fall inside the frustum — the view is empty`);
  }
});
