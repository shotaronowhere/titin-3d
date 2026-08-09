#!/usr/bin/env node
/** Validate the SC-18 embedded-candidate versus post-candidate evidence boundary. */
import { readFileSync } from 'node:fs';

import { SPEC_FILES, STRATEGY_FILE, CONTEXT_FILE, BACKBONE_FILE } from '../src/model/SpecLoader.js';
import {
  MODEL_INPUTS,
  buildInputsFingerprint,
  modelFingerprint,
  readEmbeddedBuildIdentity,
  readEmbeddedInputManifest,
  validateArtifactBoundary,
} from './build_identity.mjs';

export function validateCurrentBoundary() {
  const standalone = readFileSync('index.html');
  const manifest = JSON.parse(readFileSync('release/MANIFEST.json', 'utf8'));
  const inputs = readEmbeddedInputManifest(standalone);
  const identity = readEmbeddedBuildIdentity(standalone);
  const actualSpecFiles = [...SPEC_FILES, STRATEGY_FILE, CONTEXT_FILE, BACKBONE_FILE]
    .map((name) => `data/${name}`).sort();
  const problems = validateArtifactBoundary({
    specFiles: actualSpecFiles,
    modelInputs: MODEL_INPUTS,
    buildInputs: inputs.inputs.map((row) => row.path),
    candidateArtifacts: manifest.artifacts.map((row) => row.path),
  });
  if (JSON.stringify(inputs.spec_files) !== JSON.stringify(actualSpecFiles)) {
    problems.push('embedded spec-file classification differs from SpecLoader');
  }
  if (JSON.stringify(inputs.model_inputs) !== JSON.stringify([...MODEL_INPUTS])) {
    problems.push('embedded model-input classification differs from MODEL_INPUTS');
  }
  if (identity.model_fingerprint !== modelFingerprint()) {
    problems.push('embedded model fingerprint does not reproduce from MODEL_INPUTS');
  }
  if (identity.build_inputs_fingerprint !== buildInputsFingerprint(inputs)) {
    problems.push('embedded build-input fingerprint does not reproduce from raw inputs');
  }
  return problems;
}

const problems = validateCurrentBoundary();
if (problems.length) {
  console.error(`artifact boundary validation failed:\n  - ${problems.join('\n  - ')}`);
  process.exitCode = 1;
} else {
  console.log('artifact boundary validated: embedded inputs and post-candidate evidence are disjoint');
}
