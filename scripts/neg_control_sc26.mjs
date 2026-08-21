#!/usr/bin/env node
/** SC-26 in-memory negative controls for deterministic export guards. */

import { readFileSync } from 'node:fs';
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import {
  EXPORT_CONTRACT_FINGERPRINT, FORCE_CSV_COLUMNS, researchExport, validateResearchExport,
} from '../src/presentation/ResearchExport.js';
import {
  readEmbeddedInputManifest, readEmbeddedResearchIdentity,
} from './build_identity.mjs';

const standalone = readFileSync(new URL('../index.html', import.meta.url));
const identity = readEmbeddedResearchIdentity(standalone);
const inputManifest = readEmbeddedInputManifest(standalone);
const model = await TitinModel.create(nodeReader(), { identity });
const base = researchExport({
  model,
  presentationState: {
    depth: 'explore', story_step: 'meet_sarcomere', sarcomere_length_nm: 1900,
    drawer: 'sources', scene_id: 'spring', scale: 'context',
  },
  selection: { kind: 'region', id: 'PEVK' },
  buildIdentity: identity,
  inputManifest,
});

const cases = [
  ['unsupported force coerced to zero', {
    ...base,
    forceCsv: base.forceCsv.replace(/^1900,,,,not_evaluated/m, '1900,0,0,0,not_evaluated'),
  }, /unsupported force/],
  ['CSV candidate identity changed', {
    ...base,
    regionalCsv: base.regionalCsv.replace(
      model.spec.identity.build_inputs_fingerprint, 'different-candidate',
    ),
  }, /mismatched build_inputs_fingerprint/],
  ['generation timestamp injected', (() => {
    const state = JSON.parse(base.stateJson); state.generated_at = 'now';
    return { ...base, stateJson: `${JSON.stringify(state, null, 2)}\n` };
  })(), /forbidden export metadata/],
  ['contract fingerprint changed', {
    ...base,
    forceCsv: base.forceCsv.replace(EXPORT_CONTRACT_FINGERPRINT, '0'.repeat(64)),
  }, /mismatched export_contract_fingerprint/],
  ['header-only force CSV', {
    ...base, forceCsv: `${FORCE_CSV_COLUMNS.join(',')}\n`,
  }, /no data rows/],
  ['invalid RFC quote transition', {
    ...base, forceCsv: base.forceCsv.replace('\n', '\n"closed"junk,'),
  }, /after closing quote/],
  ['invented evaluation status', {
    ...base, forceCsv: base.forceCsv.replace(',not_evaluated,', ',invented_status,'),
  }, /invalid status|disagrees with model status/],
  ['deep-link story-step drift', {
    ...base, deepLink: base.deepLink.replace('step=meet_sarcomere', 'step=stretch_spring'),
  }, /base fields|canonical serialization/],
];

for (const [label, payload, expected] of cases) {
  const problems = validateResearchExport(payload, { model });
  if (!problems.some((problem) => expected.test(problem))) {
    throw new Error(`${label}: expected ${expected}, got:\n  - ${problems.join('\n  - ')}`);
  }
  console.log(`  PASS ${label} rejected`);
}

for (const [label, options, expected] of [
  ['forged app identity', {
    model,
    presentationState: {
      depth: 'explore', story_step: 'meet_sarcomere', sarcomere_length_nm: 1900,
      drawer: 'sources', scene_id: 'spring', scale: 'context',
    },
    selection: { kind: 'region', id: 'PEVK' },
    buildIdentity: { ...identity, app_revision: 'forged-app' }, inputManifest,
  }, /app_revision does not match/],
  ['missing candidate manifest', {
    model,
    presentationState: {
      depth: 'explore', story_step: 'meet_sarcomere', sarcomere_length_nm: 1900,
      drawer: 'sources', scene_id: 'spring', scale: 'context',
    },
    selection: { kind: 'region', id: 'PEVK' }, buildIdentity: identity,
  }, /candidate input manifest is required/],
]) {
  try {
    researchExport(options);
    throw new Error(`${label}: serializer unexpectedly accepted invalid input`);
  } catch (error) {
    if (!expected.test(error.message)) throw error;
    console.log(`  PASS ${label} rejected`);
  }
}

const forgedClaims = researchExport({
  model,
  presentationState: {
    depth: 'explore', story_step: 'meet_sarcomere', sarcomere_length_nm: 2200,
    drawer: 'sources', scene_id: 'spring', scale: 'context',
    claim_support_ids: ['scope_badge'],
  },
  selection: { kind: 'region', id: 'PEVK', claim_support_ids: ['scope_badge'] },
  buildIdentity: identity, inputManifest,
});
if (JSON.parse(forgedClaims.claimsJson).claims.some((claim) => claim.id === 'scope_badge')) {
  throw new Error('caller-provided claim IDs escaped canonical contextual scoping');
}
console.log('  PASS caller-provided claim IDs ignored');
console.log('SC-26 NEGATIVE CONTROLS PASSED');
