/**
 * Phase 7 smoke test: build the full scene across the SL range the UI exposes,
 * confirm it produces geometry, that the manifest tracks SL, and that clear()
 * releases everything. The unit tests exercise pieces at fixed SL; this walks
 * the whole slider range the way a user would.
 */
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { SarcomereScene } from '../src/render/SarcomereScene.js';

const model = await TitinModel.create(nodeReader());
for (const sl of [1600, 1900, 2200, 2600, 3000, 3400]) {
  const sc = model.contextSceneAt(sl, { rings: 2 });
  const s = new SarcomereScene();
  const root = s.build(sc, model.domainInstancesAt(sl),
                       { titinStrands: true, mirror: true, rings: 2 });
  let meshes = 0, tris = 0;
  root.traverse((o) => {
    if (o.isMesh || o.isInstancedMesh) {
      meshes += 1;
      const g = o.geometry;
      const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      tris += n * (o.isInstancedMesh ? o.count : 1);
    }
  });
  const man = s.manifest;
  console.log(`SL ${sl}: meshes ${meshes}, tris ${Math.round(tris)}, ` +
              `unknowns ${man?.not_claimed?.length ?? '?'}`);
  if (meshes === 0) throw new Error(`no geometry at SL ${sl}`);
  s.clear();
  let after = 0;
  s.root.traverse((o) => { if (o.isMesh || o.isInstancedMesh) after += 1; });
  if (after !== 0) throw new Error(`clear() left ${after} meshes at SL ${sl}`);
}
console.log('headless build + clear across the full SL range: OK');

// The triangle count is invariant across SL (fixed-topology primitives), so it
// cannot show the scene responds to SL. Measure the world-space axial extent and
// the A-band extent instead: total must track SL, A-band must NOT move.
console.log('\nSL   axial extent   A-band extent   lattice a');
for (const sl of [1600, 1900, 2200, 2600, 3000, 3400]) {
  const sc = model.contextSceneAt(sl, { rings: 2 });
  const s = new SarcomereScene();
  const root = s.build(sc, model.domainInstancesAt(sl),
                       { titinStrands: true, mirror: true, rings: 2 });
  const box = new (await import('three')).Box3().setFromObject(root);
  const thick = sc.sarcomere.find((d) => d.id === 'thick_filament');
  const patch = model.latticePatchAt(sl, 2);
  console.log(`${sl}  ${(box.max.x - box.min.x).toFixed(1)} nm    ` +
              `${thick.transform.length_nm.toFixed(1)} nm      ${patch.lattice_constant_nm.toFixed(2)} nm`);
  s.clear();
}
