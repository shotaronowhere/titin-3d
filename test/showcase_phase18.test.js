/** SC-18 gates: release identity, evidence boundary, and urgent UI integrity. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdtempSync, readFileSync, writeFileSync, mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  MODEL_INPUTS,
  buildInputsFingerprint,
  modelFingerprint,
  readEmbeddedBuildIdentity,
  readEmbeddedInputManifest,
  resolveAppRevision,
  requireReleaseRevision,
  validateArtifactBoundary,
} from '../scripts/build_identity.mjs';

const ROOT = new URL('../', import.meta.url);
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const standalone = readFileSync(new URL('../index.html', import.meta.url));
const manifestText = readFileSync(new URL('../release/MANIFEST.json', import.meta.url), 'utf8');
const manifest = JSON.parse(manifestText);

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

test('SC18: the model identity has one explicit, non-self-referential input manifest', () => {
  assert.deepEqual(MODEL_INPUTS, [
    'data/sarcomere.json',
    'data/titin.json',
    'data/titin_sequence_features.json',
    'data/structural_states.json',
    'data/geometry_sources.json',
    'data/geometry_strategy.json',
    'data/context_measurements.json',
    'data/domain_backbones.json',
    'data/mechanical_parameters.json',
  ]);
  assert.ok(!MODEL_INPUTS.includes('data/mechanical_model.json'),
    'a generated file that may carry model identity cannot hash itself');
  assert.ok(!MODEL_INPUTS.includes('data/release_gates.json'),
    'post-candidate evidence cannot change the model it attests to');

  const baseline = modelFingerprint();
  assert.match(baseline, /^[0-9a-f]{64}$/);
  assert.equal(modelFingerprint(), baseline, 'unchanged inputs must reproduce exactly');

  for (const changed of MODEL_INPUTS) {
    const mutated = modelFingerprint({
      read: (path) => Buffer.concat([
        readFileSync(new URL(`../${path}`, import.meta.url)),
        Buffer.from(path === changed ? '\nSC18 destructive byte' : ''),
      ]),
    });
    assert.notEqual(mutated, baseline, `${changed} must affect model identity`);
  }
});

test('SC18: build identity covers the real graph and excludes attestations and outputs', () => {
  const inputs = readEmbeddedInputManifest(standalone);
  const paths = inputs.inputs.map((row) => row.path);
  for (const required of [
    '.node-version', 'package.json', 'package-lock.json',
    'scripts/build_standalone.mjs', 'scripts/build_identity.mjs',
    'src/index.template.html', 'data/mechanical_model.json',
  ]) assert.ok(paths.includes(required), `${required} must affect build identity`);
  assert.ok(paths.some((path) => path.startsWith('src/')), 'the esbuild source graph is absent');
  assert.ok(paths.some((path) => path.startsWith('node_modules/three/')),
    'bundled dependency bytes are absent');
  for (const forbidden of ['index.html', 'data/release_gates.json', 'release/MANIFEST.json']) {
    assert.ok(!paths.includes(forbidden), `${forbidden} must not feed the candidate`);
  }
  assert.ok(!paths.some((path) => path.startsWith('evidence/')),
    'post-candidate evidence must never enter the build graph');
  assert.ok(inputs.dependencies.some((row) => row.name === 'three'
    && row.version === '0.185.1' && /^sha512-/.test(row.integrity)),
  'bundled dependency version and lock integrity must be recorded');

  const baseline = buildInputsFingerprint(inputs);
  assert.match(baseline, /^[0-9a-f]{64}$/);
  assert.equal(buildInputsFingerprint(inputs), baseline,
    'an unchanged input manifest must reproduce exactly');
  for (const changed of [
    'src/index.template.html', 'scripts/build_standalone.mjs',
    'package-lock.json', 'data/references.json',
    paths.find((path) => path.startsWith('node_modules/three/')),
  ]) {
    const mutated = buildInputsFingerprint(inputs, {
      read: (path) => Buffer.concat([
        readFileSync(new URL(`../${path}`, import.meta.url)),
        Buffer.from(path === changed ? '\nSC18 destructive byte' : ''),
      ]),
    });
    assert.notEqual(mutated, baseline, `${changed} must affect build identity`);
  }
});

test('SC18: classification refuses evidence in every candidate identity surface', () => {
  const inputs = readEmbeddedInputManifest(standalone);
  const base = {
    specFiles: inputs.spec_files,
    modelInputs: inputs.model_inputs,
    buildInputs: inputs.inputs.map((row) => row.path),
    candidateArtifacts: manifest.artifacts.map((row) => row.path),
  };
  assert.deepEqual(validateArtifactBoundary(base), []);
  for (const field of ['specFiles', 'modelInputs', 'buildInputs', 'candidateArtifacts']) {
    for (const forbidden of ['data/release_gates.json', 'evidence/fake-review.json']) {
      const changed = structuredClone(base);
      changed[field].push(forbidden);
      assert.ok(validateArtifactBoundary(changed).some((problem) => problem.includes(forbidden)),
        `${field} accepted forbidden ${forbidden}`);
    }
  }
});

test('SC18: app revision follows source inputs and ignores an output-only commit', () => {
  const dir = mkdtempSync(join(tmpdir(), 'titin-sc18-git-'));
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src/app.js'), 'export const value = 1;\n');
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'user.name', 'SC18 test');
  git('config', 'user.email', 'sc18@example.invalid');
  git('add', 'src/app.js');
  git('commit', '-qm', 'source input');
  const sourceCommit = git('rev-parse', 'HEAD');
  const before = resolveAppRevision({ root: dir, repositoryInputs: ['src/app.js'] });
  assert.equal(before, sourceCommit);

  writeFileSync(join(dir, 'index.html'), '<!doctype html>\n');
  git('add', 'index.html');
  git('commit', '-qm', 'generated output only');
  assert.notEqual(git('rev-parse', 'HEAD'), sourceCommit);
  assert.equal(resolveAppRevision({ root: dir, repositoryInputs: ['src/app.js'] }), sourceCommit,
    'the generated-output commit must not change application revision');

  writeFileSync(join(dir, 'src/app.js'), 'export const value = 2;\n');
  const dirty = resolveAppRevision({ root: dir, repositoryInputs: ['src/app.js'] });
  assert.equal(dirty, `${sourceCommit}-dirty`);
  assert.throws(() => requireReleaseRevision(dirty), /dirty build inputs/i);
});

test('SC18: manifest v2 binds raw candidate bytes without hashing itself', () => {
  const identity = readEmbeddedBuildIdentity(standalone);
  assert.equal(manifest.schema, 'titin-release-manifest/2');
  assert.deepEqual({
    model_fingerprint: manifest.model_fingerprint,
    app_revision: manifest.app_revision,
    build_inputs_fingerprint: manifest.build_inputs_fingerprint,
  }, identity);
  assert.deepEqual(manifest.standalone, {
    path: 'index.html',
    bytes: standalone.byteLength,
    sha256: sha256(standalone),
  });
  assert.ok(manifest.artifacts.length > 0);
  assert.deepEqual(manifest.artifacts, [...manifest.artifacts]
    .sort((a, b) => a.path.localeCompare(b.path)));
  for (const row of manifest.artifacts) {
    assert.deepEqual(Object.keys(row), ['path', 'bytes', 'sha256']);
    assert.ok(!['release/MANIFEST.json', 'release/MANIFEST.sha256'].includes(row.path));
    const bytes = readFileSync(new URL(`../${row.path}`, import.meta.url));
    assert.equal(row.bytes, bytes.byteLength, `${row.path} byte count drifted`);
    assert.equal(row.sha256, sha256(bytes), `${row.path} digest drifted`);
  }
  const detached = readFileSync(new URL('../release/MANIFEST.sha256', import.meta.url), 'utf8');
  assert.equal(detached, `${sha256(Buffer.from(manifestText))}  MANIFEST.json\n`);
});

test('SC18: every rendered link container and selected extension state declares contrast', () => {
  assert.match(page, /\.object-sources a,\s*#chapterSources a,\s*#expertCards a,\s*#selectedEvidence a,\s*#bibliography a\s*\{[^}]*color:\s*var\(--source-link\)/s);
  assert.match(page, /--source-link:\s*#a9c9f2/);
  assert.match(page, /\.extension-row\.on\s*\{[^}]*color:\s*#ffe1e8/s);
  assert.match(page, /\.extension-row:disabled[^}]*color:/s,
    'disabled extension rows need a deliberate foreground, not inherited opacity alone');
});

test('SC18: drawer entry routing and camera state tell the truth', () => {
  assert.match(page, /function openEvidence\(trigger,\s*targetTab\)/);
  for (const [id, tab] of [
    ['audienceEvidence', 'evidence'],
    ['stageMeasureLink', 'measure'],
    ['stageSourcesLink', 'sources'],
  ]) {
    assert.match(page, new RegExp(`openEvidence\\(\\$\\('${id}'\\), '${tab}'\\)`),
      `${id} does not route to ${tab}`);
  }
  assert.match(page, /const \[cameraKind\] = state\.cameraPreset\.split\('\.'\)[\s\S]*?const on = cameraKind === 'view'\s*&& b\.dataset\.view === state\.view/,
    'only an actual wide-view camera may leave a wide-view button pressed');
});

test('SC18: release-gate v2 retains pending human evidence and uses stable protocol IDs', () => {
  const gates = JSON.parse(readFileSync(new URL('../data/release_gates.json', import.meta.url)));
  assert.equal(gates.schema, 'titin-showcase-release-gates/2');
  for (const section of [
    'artifact_identity', 'scientific_decisions', 'claim_entailment',
    'mechanical_validity', 'browser_qa', 'deployment_parity',
    'automated', 'visual_matrix', 'accessibility', 'performance',
    'lay_comprehension', 'expert_review', 'demo_rehearsal', 'final_release_definition',
  ]) assert.ok(gates[section], `missing v2 section ${section}`);
  assert.equal(gates.lay_comprehension.protocol.id, 'titin-lay-comprehension/2');
  assert.deepEqual(gates.lay_comprehension.protocol.questions.map((row) => row.id), [
    'define_sarcomere', 'identify_titin_route', 'distinguish_motor', 'explain_stretch',
    'identify_anchors', 'explain_roles', 'find_evidence', 'distinguish_claim_kinds',
  ]);
  assert.equal(gates.expert_review.protocol.id, 'titin-expert-review/2');
  assert.equal(gates.release_ready, false);
  for (const id of ['keyboard_route', 'focus_order', 'touch_targets', 'not_colour_only']) {
    const row = gates.accessibility.checks.find((entry) => entry.id === id);
    assert.equal(row.status, 'PENDING', `${id} still overclaims rendered behavior`);
    assert.ok(['browser', 'human'].includes(row.verification));
  }
  assert.deepEqual(gates.lay_comprehension.evidence_refs, []);
  assert.deepEqual(gates.expert_review.evidence_refs, []);
});
