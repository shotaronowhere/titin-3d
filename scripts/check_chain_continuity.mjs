// Ad-hoc verification: does the emitted azimuth policy keep the polypeptide
// connected and on axis? Reconstructs each domain's end points from the
// per-instance transforms the InstancingPlan actually emits.
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';

const m = await TitinModel.create(nodeReader());
const D = Math.PI / 180;

for (const sl of [1900, 2200, 2400, 3000]) {
  const p = m.instancingPlanAt(sl);
  const all = p.batches.flatMap((b) =>
    b.transforms.map((t) => ({ ...t, L: b.geometry.axial_length_nm })));
  const byreg = {};
  for (const t of all) (byreg[t.region] = byreg[t.region] || []).push(t);

  // End points in 3D. A domain of folded length L, tilted by theta from the axis
  // and rotated by az about it, extends +-(L/2) along its own long axis.
  const endPt = (t, sign) => {
    const th = (t.rotation.tilt_deg_from_axis || 0) * D;
    const az = (t.rotation.azimuth_deg || 0) * D;
    const h = sign * (t.L / 2);
    return {
      x: t.position_nm.x + h * Math.cos(th),
      y: h * Math.sin(th) * Math.cos(az),
      z: h * Math.sin(th) * Math.sin(az),
    };
  };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

  console.log(`\n== SL=${sl} ==`);
  console.log('region        n   max3DGap   linkerBudget   overrun   maxAmp   netDrift');
  for (const [r, list] of Object.entries(byreg)) {
    list.sort((a, b) => a.position_nm.x - b.position_nm.x);
    let maxGap = 0; let maxAmp = 0; let drift = 0; let worstOverrun = 0; let budgetAt = 0;
    for (let i = 0; i < list.length; i++) {
      maxAmp = Math.max(maxAmp, Math.abs(endPt(list[i], +1).y));
      const th = (list[i].rotation.tilt_deg_from_axis || 0) * D;
      const az = (list[i].rotation.azimuth_deg || 0) * D;
      drift += list[i].L * Math.sin(th) * Math.cos(az);
      if (i + 1 < list.length) {
        const gap = dist(endPt(list[i], +1), endPt(list[i + 1], -1));
        // The linker that must span this junction: whatever axial slack the model
        // already reports between these two domains.
        const budget = Math.max(list[i].spacing.interdomain_linker_nm || 0,
                                list[i + 1].spacing.interdomain_linker_nm || 0);
        if (gap > maxGap) { maxGap = gap; budgetAt = budget; }
        worstOverrun = Math.max(worstOverrun, gap - budget);
      }
    }
    console.log(`${r.padEnd(13)}${String(list.length).padStart(3)}   `
      + `${maxGap.toFixed(4).padStart(8)}   ${budgetAt.toFixed(3).padStart(12)}   `
      + `${worstOverrun.toFixed(4).padStart(7)}   ${maxAmp.toFixed(3).padStart(6)}   ${drift.toFixed(3).padStart(8)}`);
  }
}
