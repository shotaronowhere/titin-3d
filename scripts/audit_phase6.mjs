// Phase-6 audit — what the level-2 structural proxy layer actually claims.
// Run: node scripts/audit_phase6.mjs
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';

const m = await TitinModel.create(nodeReader());
const p = m.structuralProxies();

console.log(`level ${p.level} | available: ${p.available.join(', ')}`);
console.log(`asset format: ${p.asset_format}`);

for (const c of p.available) {
  const x = p.proxies[c];
  console.log(`\n=== ${c} (${x.primitive}) ===`);
  console.log(`  in use:   axial ${x.axial_length_nm} nm  lateral ${x.lateral_diameter_nm} nm`);
  console.log(`  measured: N-C ${x.measured.n_to_c_axial_nm} nm  PC1 `
    + `${x.measured.longest_principal_extent_nm} nm  Rg ${x.measured.radius_of_gyration_nm} nm`);
  console.log(`  n independent entries: ${x.measured.n_independent_entries} `
    + `(${x.measured.entries_used.join(', ')})`);
  console.log(`  enclosure of chosen primitive: `
    + `${(x.fit_quality.enclosure_of_chosen_primitive * 100).toFixed(2)}%`);
  console.log(`  axial provenance: ${x.axial_length_provenance}`);
  console.log(`  axial evidence class: ${x.axial_length_evidence_class} | `
    + `from this pipeline: ${x.axial_length_from_this_pipeline}`);
  console.log(`  orientation: ${x.orientation_claim}`);
}

const v = m.verifyStructuralProxies();
console.log(`\nverifyStructuralProxies: ${v.errors.length} error(s)`);
for (const e of v.errors) console.log(`  ERROR: ${e}`);
for (const n of v.notes) console.log(`  note:  ${n}`);
