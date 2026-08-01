// Negative controls for the Phase-5 guards. Each mutation should trip exactly the
// guard it targets; a guard that cannot fail is worthless.
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { InstancingPlan } from '../src/geometry/InstancingPlan.js';

const m = await TitinModel.create(nodeReader());
const base = m.verifyInstancing(2200);
let passed = 0;
let failed = 0;
function record(ok, message) {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`);
}
record(base.errors.length === 0, `unmodified baseline is clean (errors=${base.errors.length})`);

const cases = [
  ['deform archetype (scale 1 -> 1.5)', (p) => {
    const orig = p._transform.bind(p);
    p._transform = (d, i, a) => ({ ...orig(d, i, a), scale: 1.5 });
  }],
  ['constant azimuth (breaks chain / drifts off axis)', (p) => {
    const orig = p._transform.bind(p);
    p._transform = (d, i, a) => {
      const t = orig(d, i, a);
      if (t.rotation.azimuth_deg != null) t.rotation.azimuth_deg = 0;
      return t;
    };
  }],
  ['Fn3 batched as Ig_like (wrong exemplar)', (p) => {
    const orig = p._batch.bind(p);
    p._batch = (key, members) => orig(key === 'Fn3' ? 'Ig_like' : key, members);
  }],
  ['drop representative structure', (p) => {
    p.archetypes = JSON.parse(JSON.stringify(p.archetypes));
    delete p.archetypes.Ig_like.representative_structure;
  }],
  ['erase coordinate-derived geometry provenance', (p) => {
    const orig = p._batch.bind(p);
    p._batch = (key, members) => ({ ...orig(key, members), geometry_derived_from_coordinates: false });
  }],
  ['claim a deliberately broken D/C-zone junction is MEASURED', (p) => {
    const orig = p._transform.bind(p);
    p._transform = (d, i, a) => {
      const t = orig(d, i, a);
      if (t.domain_id === 'Aband_super.58') {
        t.position_nm = { ...t.position_nm, y: t.position_nm.y + 10 };
        t.evidence.placement = 'MEASURED';
      }
      if (t.domain_id === 'Aband_super.59') {
        t.evidence.placement = 'MEASURED';
      }
      return t;
    };
  }],
];

for (const [label, mutate] of cases) {
  const p = new InstancingPlan(m.spec ?? { geometryStrategy: m.instancing.spec.geometryStrategy },
                               m.representation);
  p.archetypes = m.instancing.archetypes;
  mutate(p);
  let res;
  try { res = p.verify(2200); } catch (e) { res = { errors: [`THREW: ${e.message}`], notes: [] }; }
  const first = res.errors[0] ? res.errors[0].slice(0, 96) : '(none)';
  record(res.errors.length > 0, `[${label}] rejected with ${res.errors.length} error(s) :: ${first}`);
}

// --- controls added during Phase-5 review ---
console.log('\n-- review-added controls --');

// (7) Per-region azimuth: break ONE region only. The old batch-level check passed
//     this, because the batch still contained two distinct azimuth values.
{
  const p = new InstancingPlan({ geometryStrategy: { domain_archetypes: m.instancing.archetypes } },
                               m.representation);
  p.archetypes = m.instancing.archetypes;
  const orig = p._transform.bind(p);
  p._transform = (d, i, a) => {
    const t = orig(d, i, a);
    if (t.region === 'prox_Ig' && t.rotation.azimuth_deg != null) t.rotation.azimuth_deg = 0;
    return t;
  };
  const res = p.verify(2200);
  const az = res.errors.filter((e) => /share one azimuth/.test(e));
  record(az.length > 0,
    `[constant azimuth in ONE region only] azimuthErrors=${az.length} :: ${az[0] ? az[0].slice(0, 90) : '(none)'}`);
}

// (8) Undocumented undepicted domain: simulate dropping the now-depicted N2A fold.
//     The shortfall must become a hard error rather than disappearing silently.
{
  const spec = { geometryStrategy: JSON.parse(JSON.stringify(m.instancing.spec.geometryStrategy)) };
  delete spec.geometryStrategy.undepicted_declared_domains;
  const rep = Object.create(m.representation);
  rep.domainInstancesAt = (...args) => {
    const result = m.representation.domainInstancesAt(...args);
    return { ...result, instances: result.instances.filter((d) => d.domain_id !== 'N2A.1') };
  };
  const p = new InstancingPlan(spec, rep);
  p.archetypes = m.instancing.archetypes;
  const res = p.verify(2200);
  const und = res.errors.filter((e) => /undocumented omission/.test(e));
  record(und.length > 0,
    `[undocumented undepicted domain] errors=${und.length} :: ${und[0] ? und[0].slice(0, 100) : '(none)'}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
