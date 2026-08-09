#!/usr/bin/env node
/** Verify raw candidate bytes, embedded identities, manifest v2, and its detached checksum. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { readEmbeddedBuildIdentity } from './build_identity.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function verifyArtifactBytes(bytes, manifest) {
  const problems = [];
  if (manifest?.schema !== 'titin-release-manifest/2') {
    return ['manifest schema is not titin-release-manifest/2'];
  }
  const actual = { bytes: bytes.byteLength, sha256: sha256(bytes) };
  if (manifest.standalone?.path !== 'index.html') {
    problems.push(`standalone path is '${manifest.standalone?.path}', expected 'index.html'`);
  }
  for (const field of ['bytes', 'sha256']) {
    if (manifest.standalone?.[field] !== actual[field]) {
      problems.push(`standalone ${field} mismatch: manifest ${manifest.standalone?.[field]}, actual ${actual[field]}`);
    }
  }
  let embedded;
  try { embedded = readEmbeddedBuildIdentity(bytes); }
  catch (error) { problems.push(error.message); return problems; }
  for (const field of ['model_fingerprint', 'app_revision', 'build_inputs_fingerprint']) {
    if (manifest[field] !== embedded[field]) {
      problems.push(`${field} mismatch: manifest ${manifest[field]}, embedded ${embedded[field]}`);
    }
  }
  return problems;
}

export function verifyManifestChecksum(manifestBytes, checksumText) {
  const expected = `${sha256(manifestBytes)}  MANIFEST.json\n`;
  return checksumText === expected
    ? []
    : [`detached manifest checksum mismatch; expected '${expected.trim()}'`];
}

function argumentsFrom(argv) {
  const parsed = { file: null, manifest: null, url: null };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (!['--file', '--manifest', '--url'].includes(flag) || !argv[index + 1]) {
      throw new Error('usage: verify_artifact_identity.mjs --file <index.html> --manifest <MANIFEST.json> [--url <staging-url>]');
    }
    parsed[flag.slice(2)] = argv[++index];
  }
  if (!parsed.file || !parsed.manifest) {
    throw new Error('both --file and --manifest are required');
  }
  return parsed;
}

async function main() {
  const args = argumentsFrom(process.argv.slice(2));
  const filePath = resolve(args.file);
  const manifestPath = resolve(args.manifest);
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const problems = verifyArtifactBytes(readFileSync(filePath), manifest);

  const checksumPath = join(dirname(manifestPath), 'MANIFEST.sha256');
  if (!existsSync(checksumPath)) problems.push(`${checksumPath} is missing`);
  else problems.push(...verifyManifestChecksum(
    manifestBytes,
    readFileSync(checksumPath, 'utf8'),
  ));

  if (basename(manifestPath) !== 'MANIFEST.json') {
    problems.push(`manifest filename is '${basename(manifestPath)}', expected 'MANIFEST.json'`);
  }

  if (args.url) {
    const response = await fetch(args.url, { redirect: 'follow' });
    if (!response.ok) problems.push(`staging fetch failed: ${response.status} ${response.statusText}`);
    else problems.push(...verifyArtifactBytes(Buffer.from(await response.arrayBuffer()), manifest)
      .map((problem) => `staging: ${problem}`));
  }

  if (problems.length) {
    throw new Error(`artifact identity verification failed:\n  - ${problems.join('\n  - ')}`);
  }
  console.log(`artifact identity verified: ${filePath}`);
  console.log(`  model ${manifest.model_fingerprint}`);
  console.log(`  app ${manifest.app_revision}`);
  console.log(`  build inputs ${manifest.build_inputs_fingerprint}`);
  console.log(`  index.html ${manifest.standalone.sha256}`);
  console.log(`  manifest ${sha256(manifestBytes)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
