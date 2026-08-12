#!/usr/bin/env node
/** Build/check the byte-digested SC-20 boundary, render, and viewport evidence bundle. */
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { modelFingerprint } from './build_identity.mjs';
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { SarcomereScene } from '../src/render/SarcomereScene.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'evidence/scientific/SC-20');
const CHECK = process.argv.includes('--check');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

const CAPTURES = Object.freeze([
  ['overview-1280x720.jpg', 1280, 720, 'view.longitudinal', null],
  ['n2a-1280x720.jpg', 1280, 720, 'region.N2A', 'N2A'],
  ['pevk-1280x720.jpg', 1280, 720, 'region.PEVK', 'PEVK'],
  ['distal-ig-1280x720.jpg', 1280, 720, 'region.dist_Ig', 'dist_Ig'],
  ['c-zone-1280x720.jpg', 1280, 720, 'closeup.czone', 'Aband_super'],
  ['kinase-1280x720.jpg', 1280, 720, 'region.kinase', 'kinase'],
  ['m-line-1280x720.jpg', 1280, 720, 'closeup.mline', 'Mline'],
  ['overview-375x812.jpg', 375, 812, 'view.longitudinal', null],
]);

function jpegDimensions(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb,
      0xcd, 0xce, 0xcf].includes(marker)) {
      return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
    }
    if (marker === 0xd9 || marker === 0xda) return null;
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}

function writeOrCheck(relative, text, problems) {
  const path = join(OUT, relative);
  if (CHECK) {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== text) problems.push(`${relative} is stale`);
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
}

const model = await TitinModel.create(nodeReader());
const fingerprint = modelFingerprint({ root: ROOT });
const byRegion = new Map(model.spec.titin.regions.map((row) => [row.id, row]));
const instances = model.domainInstancesAt(2200).instances;
const n2a = instances.filter((row) => row.domain_id.startsWith('N2A.'));
const boundaryAudit = {
  schema: 'titin-sc20-boundary-audit/1',
  model_fingerprint: fingerprint,
  canonical_sequence: 'UniProt Q8WZ42-1 version 4; 34350 aa',
  regions: model.spec.titin.regions.map((row) => ({
    id: row.id,
    start: row.residue_span.start,
    end: row.residue_span.end,
    length_aa: row.residue_span.length_aa,
  })),
  i_band_ig_counts: Object.fromEntries(['prox_Ig', 'N2A', 'dist_Ig']
    .map((id) => [id, byRegion.get(id).domain_composition.Ig_like])),
  domain_totals: model.spec.titin.domain_totals,
  n2a_coordinate_accounting: byRegion.get('N2A').coordinate_accounting,
  n2a_runtime_instances: n2a.map((row) => ({
    domain_id: row.domain_id,
    sequence_position: row.sequence_position,
    folded_domains: row.folded_domains,
    representative_pdb_id: row.representative_pdb_id,
    structured_core: row.structured_core || null,
  })),
  a_m_allocations: Object.fromEntries(['Aband_super', 'kinase', 'Mline'].map((id) => [id, {
    position_nm: byRegion.get(id).resting_axial_position_nm,
    axial_placement: byRegion.get(id).axial_placement,
  }])),
  periodicity_quantities: byRegion.get('Aband_super').periodicity_quantities,
};

const scene = new SarcomereScene();
scene.build(model.contextSceneAt(2200, { rings: 1 }), model.domainInstancesAt(2200), {
  latticeScope: 'local', mirror: false, titinStrands: false,
  titinPath: model.backboneAt(2200), domainBatches: model.instancingPlanAt(2200),
  domainStrands: [0], presentationMode: 'evidence', viewWidthNm: 400, viewportPx: 1280,
});
const renderAudit = {
  schema: 'titin-sc20-render-audit/1',
  model_fingerprint: fingerprint,
  representative_titin: scene.manifest.representative_titin,
  titin_strands_drawn: scene.manifest.titin_strands_drawn,
  disordered_depiction: scene.manifest.disordered_depiction,
};
scene.clear();

const problems = [];
writeOrCheck('boundary-audit.json', stableJson(boundaryAudit), problems);
writeOrCheck('render-audit.json', stableJson(renderAudit), problems);

const auditRows = [
  ['boundary-audit.json', 'boundary_audit'],
  ['render-audit.json', 'render_audit'],
].map(([path, kind]) => {
  const bytes = Buffer.from(path === 'boundary-audit.json'
    ? stableJson(boundaryAudit) : stableJson(renderAudit));
  return { path, kind, bytes: bytes.length, sha256: sha256(bytes) };
});
const captureRows = CAPTURES.map(([path, width, height, camera_preset, selected_region]) => {
  const absolute = join(OUT, path);
  if (!existsSync(absolute)) {
    problems.push(`${path} is missing`);
    return { path, kind: 'manual_capture', viewport: { width, height }, camera_preset,
      selected_region, bytes: null, sha256: null };
  }
  const bytes = readFileSync(absolute);
  const dimensions = jpegDimensions(bytes);
  if (!dimensions || dimensions[0] !== width || dimensions[1] !== height) {
    problems.push(`${path} must be a ${width}x${height} JPEG`);
  }
  return { path, kind: 'manual_capture', viewport: { width, height }, camera_preset,
    selected_region, bytes: bytes.length, sha256: sha256(bytes) };
});
const manifest = {
  schema: 'titin-sc20-implementation-evidence/1',
  model_fingerprint: fingerprint,
  captured_on: '2026-08-12',
  review_semantics: {
    decision_specific_implementation_evidence: 'VERIFIED',
    visual_release_matrix: 'UNREVIEWED_UNTIL_SC-27',
    independent_human_review_claimed: false,
  },
  files: [...auditRows, ...captureRows],
};
writeOrCheck('manifest.json', stableJson(manifest), problems);

if (problems.length) {
  console.error(`SC-20 evidence ${CHECK ? 'check' : 'build'} failed:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`SC-20 evidence: PASS (${manifest.files.length} byte-digested files; `
  + `model ${fingerprint})`);
