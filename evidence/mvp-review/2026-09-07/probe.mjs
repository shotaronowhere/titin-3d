// Read-only review probes; no application or scientific inputs are changed.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TitinModel } from '../../../src/model/TitinModel.js';
import { nodeReader } from '../../../src/model/readNode.js';
import { createInspectionView } from '../../../src/presentation/ParameterTable.js';
import { readEmbeddedResearchIdentity } from '../../../scripts/build_identity.mjs';

const standalone = readFileSync(new URL('../../../index.html', import.meta.url));
const identity = readEmbeddedResearchIdentity(standalone);
const model = await TitinModel.create(nodeReader(), { identity });
const inspections = ['titin', 'titin_domains', 'thick_filament'].map(id => {
  const view = createInspectionView(model, { selection: { kind: 'component', id } });
  return { id, label: view.label, accession: view.accession,
    coordinate_frame: view.coordinate_frame, sequence_domain_count: view.sequence_domain_count };
});
const forces = [1900, 2000, 2200, 2400, 2450, 2500, 3000].map(length => {
  const g = model.geometryAt(length);
  return { sarcomere_length_nm: length, force_pN: g.titin_chain_force_pN,
    status: g.titin_force_status, rounded: g.titin_force_precision,
    iband_extension_nm: g.titin_iband_extension_nm };
});
const result = {
  standalone_sha256: createHash('sha256').update(standalone).digest('hex'),
  identity, inspections, forces,
  scope_badge: model.spec.scientificScope.public_badge,
};
writeFileSync(new URL('./probes.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ inspections, forces: forces.map(({ iband_extension_nm, ...row }) => row) }, null, 2));
