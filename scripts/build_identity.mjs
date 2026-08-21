/**
 * SC-18 release identity and candidate/evidence classification.
 *
 * There are five deliberately different identities:
 *   - model_fingerprint: primary quantitative/geometry inputs only;
 *   - app_revision: newest Git commit that changed a discovered application input;
 *   - build_inputs_fingerprint: every deterministic input used to emit index.html;
 *   - model_input_manifest_fingerprint: browser-verifiable binding to the ordered
 *     model-input path/SHA-256 rows embedded in the candidate;
 *   - index_html_sha256: raw output bytes, recorded only in the external manifest.
 *
 * The first four can be embedded because none hashes the generated HTML. The raw
 * HTML digest cannot be embedded without self-reference and therefore lives only
 * in release/MANIFEST.json.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, join, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));

/** Primary, non-generated quantitative/geometry inputs. Order is part of the contract. */
export const MODEL_INPUTS = Object.freeze([
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

/** Files and trees that attest to a candidate and must never create that candidate. */
export const POST_CANDIDATE_PATHS = Object.freeze([
  'data/release_gates.json',
  'docs/human-evidence-pipeline.md',
  'docs/sprint-reports/',
  'evidence/',
  'README.md',
  'PROGRESS.md',
  'SHOWCASE_PREREVIEW_FINDINGS.md',
  'release/MANIFEST.json',
  'release/MANIFEST.sha256',
]);

const GENERATED_BUILD_PATHS = new Set(['index.html']);
const EXTRA_BUILD_INPUTS = Object.freeze([
  '.node-version',
  'package.json',
  'package-lock.json',
  'scripts/build_identity.mjs',
  'scripts/build_standalone.mjs',
  'src/index.template.html',
  // This is generated numerical output, not a primary model input. It still
  // affects the application artifact and therefore belongs to the wider identity.
  'data/mechanical_model.json',
]);

function slash(path) { return path.split(sep).join('/').replace(/^\.\//, ''); }

function rootRelative(path, root) {
  const absolute = isAbsolute(path) ? normalize(path) : normalize(join(root, path));
  const rel = slash(relative(root, absolute));
  if (!rel || rel === '..' || rel.startsWith('../')) {
    throw new Error(`build identity input is outside the repository: ${path}`);
  }
  return rel;
}

function contentReader(root) {
  return (path) => readFileSync(join(root, path));
}

function updateFramed(hash, label, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  hash.update(`${Buffer.byteLength(label)}:${label}${bytes.byteLength}:`);
  hash.update(bytes);
}

/**
 * @param {{root?: string, read?: (path:string)=>Buffer|string}} [options]
 */
export function modelFingerprint({ root = DEFAULT_ROOT, read = contentReader(root) } = {}) {
  const hash = createHash('sha256');
  updateFramed(hash, 'schema', 'titin-model-inputs/1');
  for (const path of MODEL_INPUTS) updateFramed(hash, path, read(path));
  return hash.digest('hex');
}

function packageNameFor(path) {
  const parts = slash(path).split('/');
  const at = parts.lastIndexOf('node_modules');
  if (at < 0 || !parts[at + 1]) return null;
  return parts[at + 1].startsWith('@')
    ? `${parts[at + 1]}/${parts[at + 2] || ''}`
    : parts[at + 1];
}

function dependencyRows(paths, { root, read }) {
  const lock = JSON.parse(String(read('package-lock.json')));
  return [...new Set(paths.map(packageNameFor).filter(Boolean))].sort().map((name) => {
    const locked = lock.packages?.[`node_modules/${name}`];
    if (!locked || typeof locked.version !== 'string' || typeof locked.integrity !== 'string') {
      throw new Error(`bundled dependency '${name}' lacks an exact lockfile version/integrity`);
    }
    const installed = JSON.parse(String(read(`node_modules/${name}/package.json`)));
    if (installed.version !== locked.version) {
      throw new Error(`bundled dependency '${name}' is ${installed.version}, lockfile requires ${locked.version}`);
    }
    return Object.freeze({ name, version: locked.version, integrity: locked.integrity });
  });
}

/**
 * Convert an esbuild metafile into the normalized input set used by identity.
 * The temporary entry is deliberately omitted: its literal source lives in and is
 * covered by build_standalone.mjs. All other graph files are hashed as raw bytes.
 *
 * @param {object} metafile
 * @param {{root?: string, entryPath?: string, specFiles?: string[],
 *   read?: (path:string)=>Buffer|string}} [options]
 */
export function inputManifestFromMetafile(metafile, {
  root = DEFAULT_ROOT,
  entryPath = '_standalone_entry.mjs',
  specFiles = [],
  read = contentReader(root),
} = {}) {
  if (!metafile?.inputs || typeof metafile.inputs !== 'object') {
    throw new Error('inputManifestFromMetafile requires an esbuild metafile');
  }
  const entry = rootRelative(entryPath, root);
  const paths = new Set(EXTRA_BUILD_INPUTS);
  for (const path of Object.keys(metafile.inputs)) {
    const normalized = rootRelative(path, root);
    if (normalized !== entry) paths.add(normalized);
  }
  for (const name of specFiles) paths.add(name.includes('/') ? slash(name) : `data/${name}`);
  for (const path of MODEL_INPUTS) paths.add(path);

  const sorted = [...paths].sort();
  const dependencies = dependencyRows(sorted, { root, read });
  const dependencyNames = new Set(dependencies.map((row) => row.name));
  const inputs = sorted.map((path) => {
    const bytes = Buffer.from(read(path));
    const dependency = packageNameFor(path);
    if (dependency && !dependencyNames.has(dependency)) {
      throw new Error(`dependency input '${path}' has no verified lockfile package`);
    }
    return Object.freeze({
      path,
      kind: dependency ? 'bundled_dependency' : 'repository',
      ...(dependency ? { package: dependency } : {}),
      bytes: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  });
  const manifest = {
    schema: 'titin-build-input-manifest/1',
    model_inputs: [...MODEL_INPUTS],
    spec_files: [...new Set(specFiles.map((name) => (
      name.includes('/') ? slash(name) : `data/${name}`)))].sort(),
    dependencies,
    inputs,
  };
  const boundaryProblems = validateArtifactBoundary({
    specFiles: manifest.spec_files,
    modelInputs: manifest.model_inputs,
    buildInputs: inputs.map((row) => row.path),
    candidateArtifacts: [],
  });
  if (boundaryProblems.length) {
    throw new Error(`invalid artifact input classification:\n  - ${boundaryProblems.join('\n  - ')}`);
  }
  return Object.freeze(manifest);
}

/**
 * Hash one normalized input manifest. The recorded size/digest columns are audit
 * metadata; the fingerprint always rereads raw bytes so neither can become an
 * alternative source of truth.
 *
 * @param {object} manifest
 * @param {{root?: string, read?: (path:string)=>Buffer|string}} [options]
 */
export function buildInputsFingerprint(manifest, {
  root = DEFAULT_ROOT, read = contentReader(root),
} = {}) {
  if (manifest?.schema !== 'titin-build-input-manifest/1' || !Array.isArray(manifest.inputs)) {
    throw new Error('buildInputsFingerprint requires titin-build-input-manifest/1');
  }
  const hash = createHash('sha256');
  updateFramed(hash, 'schema', 'titin-build-inputs/1');
  for (const row of [...(manifest.dependencies || [])]
    .sort((a, b) => a.name.localeCompare(b.name))) {
    updateFramed(hash, `dependency:${row.name}`, `${row.version}\n${row.integrity}`);
  }
  for (const row of [...manifest.inputs].sort((a, b) => a.path.localeCompare(b.path))) {
    updateFramed(hash, row.path, read(row.path));
  }
  return hash.digest('hex');
}

/** Browser-recomputable binding between candidate identity and its model-input rows. */
export function modelInputManifestFingerprint(manifest) {
  if (manifest?.schema !== 'titin-build-input-manifest/1'
      || !Array.isArray(manifest.model_inputs) || !Array.isArray(manifest.inputs)) {
    throw new Error('modelInputManifestFingerprint requires titin-build-input-manifest/1');
  }
  const byPath = new Map(manifest.inputs.map((row) => [row.path, row.sha256]));
  const inputs = MODEL_INPUTS.map((path) => {
    const sha256 = byPath.get(path);
    if (!manifest.model_inputs.includes(path) || !/^[0-9a-f]{64}$/.test(sha256 || '')) {
      throw new Error(`modelInputManifestFingerprint: '${path}' is not checksum-pinned`);
    }
    return { path, sha256 };
  });
  return createHash('sha256').update(JSON.stringify({
    schema: 'titin-model-input-manifest/1', inputs,
  })).digest('hex');
}

function runGit(root, args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return result;
}

/**
 * Resolve application revision from build inputs, not blindly from HEAD.
 * Generated outputs and node_modules never participate in Git dirtiness.
 *
 * @param {{root?: string, repositoryInputs: string[]}} options
 */
export function resolveAppRevision({ root = DEFAULT_ROOT, repositoryInputs }) {
  const paths = [...new Set((repositoryInputs || [])
    .map(slash)
    .filter((path) => path && !path.startsWith('node_modules/')
      && !GENERATED_BUILD_PATHS.has(path)
      && !path.startsWith('release/')))].sort();
  if (!paths.length) throw new Error('cannot resolve app revision without repository build inputs');

  const log = runGit(root, ['log', '-1', '--format=%H', '--', ...paths]);
  const commit = log.stdout.trim();
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error('no Git commit contains the discovered repository build inputs');
  }
  const status = runGit(root, [
    'status', '--porcelain=v1', '--untracked-files=all', '--', ...paths,
  ]).stdout.trim();
  return status ? `${commit}-dirty` : commit;
}

export function requireReleaseRevision(appRevision) {
  if (!/^[0-9a-f]{40}$/.test(appRevision)) {
    throw new Error(`release generation rejected dirty build inputs (${appRevision})`);
  }
  return appRevision;
}

export function buildIdentity(inputManifest, { root = DEFAULT_ROOT, release = false } = {}) {
  const repositoryInputs = inputManifest.inputs
    .filter((row) => row.kind === 'repository')
    .map((row) => row.path);
  const appRevision = resolveAppRevision({ root, repositoryInputs });
  if (release) requireReleaseRevision(appRevision);
  return Object.freeze({
    model_fingerprint: modelFingerprint({ root }),
    app_revision: appRevision,
    build_inputs_fingerprint: buildInputsFingerprint(inputManifest, { root }),
    model_input_manifest_fingerprint: modelInputManifestFingerprint(inputManifest),
  });
}

function embeddedJson(bytes, marker) {
  const text = Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes);
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`embedded payload not found: ${marker}`);
  const from = start + marker.length;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = from; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return JSON.parse(text.slice(from, i + 1));
  }
  throw new Error(`unbalanced embedded payload: ${marker}`);
}

/** Full internal identity used to authenticate SC-26 model-input manifest rows. */
export function readEmbeddedResearchIdentity(bytes) {
  const value = embeddedJson(bytes, 'window.__titinBuild = Object.freeze(');
  for (const field of [
    'model_fingerprint', 'app_revision', 'build_inputs_fingerprint',
    'model_input_manifest_fingerprint',
  ]) {
    if (typeof value[field] !== 'string' || !value[field]) {
      throw new Error(`embedded build identity is missing ${field}`);
    }
  }
  return value;
}

/** Stable three-field public candidate identity retained from SC-18. */
export function readEmbeddedBuildIdentity(bytes) {
  const value = readEmbeddedResearchIdentity(bytes);
  return {
    model_fingerprint: value.model_fingerprint,
    app_revision: value.app_revision,
    build_inputs_fingerprint: value.build_inputs_fingerprint,
  };
}

export function readEmbeddedInputManifest(bytes) {
  const value = embeddedJson(bytes, 'window.__titinInputManifest = Object.freeze(');
  if (value.schema !== 'titin-build-input-manifest/1') {
    throw new Error('embedded build-input manifest has an unsupported schema');
  }
  return value;
}

function normalizedCandidatePath(path, surface) {
  const value = slash(String(path || ''));
  if (surface === 'specFiles' && !value.includes('/')) return `data/${value}`;
  return value;
}

function forbiddenReason(path) {
  for (const rule of POST_CANDIDATE_PATHS) {
    if (rule.endsWith('/') ? path.startsWith(rule) : path === rule) return rule;
  }
  return null;
}

/** Pure boundary validator used by the real build and its destructive control. */
export function validateArtifactBoundary({
  specFiles = [], modelInputs = [], buildInputs = [], candidateArtifacts = [],
} = {}) {
  const problems = [];
  const surfaces = { specFiles, modelInputs, buildInputs, candidateArtifacts };
  for (const [surface, values] of Object.entries(surfaces)) {
    for (const raw of values || []) {
      const path = normalizedCandidatePath(raw, surface);
      const rule = forbiddenReason(path);
      if (rule) problems.push(`${surface} contains post-candidate path ${path} (${rule})`);
      if (surface === 'buildInputs' && (GENERATED_BUILD_PATHS.has(path)
          || path.startsWith('release/'))) {
        problems.push(`${surface} contains generated output ${path}`);
      }
      if (surface === 'candidateArtifacts'
          && ['release/MANIFEST.json', 'release/MANIFEST.sha256'].includes(path)) {
        problems.push(`${surface} contains self-referential manifest output ${path}`);
      }
    }
  }
  const build = new Set(buildInputs.map((path) => normalizedCandidatePath(path, 'buildInputs')));
  for (const path of [...specFiles, ...modelInputs].map((value) => (
    normalizedCandidatePath(value, specFiles.includes(value) ? 'specFiles' : 'modelInputs')))) {
    if (!build.has(path)) problems.push(`classified input ${path} is absent from buildInputs`);
  }
  if (modelInputs.includes('data/mechanical_model.json')) {
    problems.push('modelInputs contains self-referential generated data/mechanical_model.json');
  }
  return [...new Set(problems)];
}

export const BUILD_IDENTITY_ROOT = DEFAULT_ROOT;
