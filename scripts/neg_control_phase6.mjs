// Negative controls for the Phase-6 level-2 guards. A guard that has never
// fired is an untested guard, so each check below is deliberately broken and
// must produce an error. Operates on a deep copy of the strategy; nothing on
// disk is touched.
//
// Run: node scripts/neg_control_phase6.mjs
import { StructuralProxies } from '../src/geometry/StructuralProxies.js';
import { nodeReader } from '../src/model/readNode.js';

const reader = nodeReader();
const strategy = await reader('geometry_strategy.json');
const clone = () => JSON.parse(JSON.stringify(strategy));

let pass = 0;
let fail = 0;
function control(name, mutate, expect) {
  const s = clone();
  mutate(s);
  const { errors } = new StructuralProxies(s).verify();
  const hit = errors.some((e) => expect.test(e));
  if (hit) { pass += 1; } else { fail += 1; }
  console.log(`${hit ? 'PASS' : 'FAIL'}  ${name}`);
  if (!hit) console.log(`      expected ${expect} | got: ${JSON.stringify(errors)}`);
}

// 1. A primitive that does not contain the atoms is not an envelope.
control('poor enclosure is rejected',
  (s) => { s.domain_archetypes.Ig_like.measured_geometry.capsule_enclosure_frac = 0.62; },
  /encloses only 62\.0%/);

// 2. Enclosure must actually be reported for the chosen primitive.
control('missing enclosure figure is rejected',
  (s) => { delete s.domain_archetypes.kinase.measured_geometry.ellipsoid_enclosure_frac; },
  /no enclosure figure/);

// 3. Size-only geometry must disclaim orientation.
control('undisclaimed orientation is rejected',
  (s) => { s.domain_archetypes.kinase.not_claimed = ['something unrelated']; },
  /does not disclaim the orientation/);

// 4. Declining to adopt a measurement requires a recorded reason.
control('unexplained non-adoption is rejected',
  (s) => { delete s.domain_archetypes.Fn3.measured_geometry.axial_length_not_adopted_because; },
  /no reason recorded/);

// 5. Claiming to retain the literature value while carrying a different number.
control('drifted axial length is rejected',
  (s) => { s.domain_archetypes.Ig_like.axial_length_nm = 4.319; },
  /does not equal the literature value/);

// 6. A single entry is not enough to call geometry MEASURED.
control('single-entry measurement is rejected',
  (s) => { s.domain_archetypes.Fn3.measured_geometry.n_independent_entries = 1; },
  /at least 2 required/);

// 7. Control on the control: unmodified spec must be clean.
{
  const { errors } = new StructuralProxies(clone()).verify();
  const ok = errors.length === 0;
  if (ok) { pass += 1; } else { fail += 1; }
  console.log(`${ok ? 'PASS' : 'FAIL'}  unmodified spec is clean`);
  if (!ok) console.log(`      got: ${JSON.stringify(errors)}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
