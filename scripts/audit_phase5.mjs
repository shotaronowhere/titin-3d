// Phase-5 audit: declared-vs-instanced domain accounting + verify() output at
// every reference sarcomere length.
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';

const m = await TitinModel.create(nodeReader());

console.log('== declared vs instanced ==');
const rows = m.instancing.declaredVsInstanced(2200);
if (rows.length === 0) console.log('  (all declared domains instanced)');
for (const r of rows) {
  console.log(`  ${r.region}/${r.domain_class}: declared ${r.declared}, instanced ${r.instanced}, `
    + `assembly '${r.assembly}', documented=${!!r.documented}`);
}

console.log('\n== verify() across states ==');
for (const sl of [1900, 2200, 2400, 3000]) {
  const v = m.verifyInstancing(sl);
  console.log(`  SL=${sl} errors=${v.errors.length} notes=${v.notes.length}`);
  for (const e of v.errors.slice(0, 3)) console.log(`     ERR ${e.slice(0, 110)}`);
}

console.log('\n== notes at SL=2200 ==');
for (const n of m.verifyInstancing(2200).notes) console.log(`  - ${n.slice(0, 150)}`);
