// Geometry fingerprint — a single number per sarcomere length that changes if
// ANY domain coordinate changes. Used to prove that a spec edit which is meant
// to be render-only (e.g. Phase 6 lateral diameter adoption) really did not
// move placement.
//
// Run: node scripts/geometry_fingerprint.mjs
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';

// These four sarcomere lengths are the project's canonical comparison states
// (structural_states.json); their fingerprints are quoted in PROGRESS.md, so
// changing this list would silently invalidate every recorded comparison.
const STATES = [1900, 2200, 2400, 3000];

const m = await TitinModel.create(nodeReader());
const out = {};
for (const sl of STATES) {
  const inst = m.domainInstancesAt(sl).instances;
  let sx = 0; let sy = 0; let sz = 0;
  for (const d of inst) { sx += d.position_nm.x; sy += d.position_nm.y; sz += d.position_nm.z; }
  out[sl] = {
    n: inst.length,
    sx: Number(sx.toFixed(3)),
    sy: Number(sy.toFixed(3)),
    sz: Number(sz.toFixed(3)),
    folded_null: inst.filter((d) => d.folded_length_nm == null).length,
  };
}
console.log(JSON.stringify(out, null, 1));
