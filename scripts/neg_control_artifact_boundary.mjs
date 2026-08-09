#!/usr/bin/env node
/** Destructive controls for every identity surface; canonical files are never edited. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { readEmbeddedInputManifest, validateArtifactBoundary } from './build_identity.mjs';

const inputs = readEmbeddedInputManifest(readFileSync('index.html'));
const manifest = JSON.parse(readFileSync('release/MANIFEST.json', 'utf8'));
const baseline = {
  specFiles: [...inputs.spec_files],
  modelInputs: [...inputs.model_inputs],
  buildInputs: inputs.inputs.map((row) => row.path),
  candidateArtifacts: manifest.artifacts.map((row) => row.path),
};

assert.deepEqual(validateArtifactBoundary(baseline), []);
let passed = 0;
for (const surface of Object.keys(baseline)) {
  for (const forbidden of ['data/release_gates.json', 'evidence/expert-reviews/fabricated.json']) {
    const mutation = structuredClone(baseline);
    mutation[surface].push(forbidden);
    const problems = validateArtifactBoundary(mutation);
    assert.ok(problems.some((problem) => problem.includes(forbidden)),
      `${surface} accepted ${forbidden}`);
    console.log(`PASS ${surface} rejects ${forbidden}`);
    passed++;
  }
}
console.log(`ARTIFACT-BOUNDARY NEGATIVE CONTROLS PASSED (${passed}/8)`);
