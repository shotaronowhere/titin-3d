#!/usr/bin/env node
/** SC-26 hermetic export/schema/determinism validator. */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import {
  researchExport, validateResearchExport,
} from '../src/presentation/ResearchExport.js';
import {
  readEmbeddedInputManifest, readEmbeddedResearchIdentity,
} from './build_identity.mjs';

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));
const standalone = readFileSync(join(ROOT, 'index.html'));
const identity = readEmbeddedResearchIdentity(standalone);
const inputManifest = readEmbeddedInputManifest(standalone);
const model = await TitinModel.create(nodeReader(), { identity });

function typeMatches(type, value) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}

/** Draft-2020-12 subset used by the two closed, checked-in SC-26 schemas. */
function validateSchema(schema, value, root = schema, path = '$') {
  if (schema.$ref) {
    const target = schema.$ref.split('/').slice(1)
      .reduce((cursor, key) => cursor?.[key.replaceAll('~1', '/').replaceAll('~0', '~')], root);
    return target ? validateSchema(target, value, root, path) : [`${path}: unresolved ${schema.$ref}`];
  }
  if (schema.oneOf) {
    const candidates = schema.oneOf.map((candidate) => validateSchema(candidate, value, root, path));
    return candidates.filter((problems) => problems.length === 0).length === 1
      ? [] : [`${path}: does not satisfy exactly one oneOf branch`];
  }
  const problems = [];
  if (Object.hasOwn(schema, 'const') && !Object.is(value, schema.const)) {
    problems.push(`${path}: expected constant ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.some((candidate) => Object.is(candidate, value))) {
    problems.push(`${path}: value is outside enum`);
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => typeMatches(type, value))) {
      problems.push(`${path}: expected ${types.join('|')}`);
      return problems;
    }
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      problems.push(`${path}: string is shorter than ${schema.minLength}`);
    }
    if (schema.pattern && !(new RegExp(schema.pattern)).test(value)) {
      problems.push(`${path}: string does not match ${schema.pattern}`);
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      problems.push(`${path}: has fewer than ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      problems.push(`${path}: has more than ${schema.maxItems} items`);
    }
    if (schema.items) value.forEach((entry, index) => {
      problems.push(...validateSchema(schema.items, entry, root, `${path}/${index}`));
    });
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const required of schema.required || []) {
      if (!Object.hasOwn(value, required)) problems.push(`${path}: missing '${required}'`);
    }
    for (const [key, entry] of Object.entries(value)) {
      if (schema.properties?.[key]) {
        problems.push(...validateSchema(schema.properties[key], entry, root, `${path}/${key}`));
      } else if (schema.additionalProperties === false) {
        problems.push(`${path}: unexpected '${key}'`);
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        problems.push(...validateSchema(schema.additionalProperties, entry, root, `${path}/${key}`));
      }
    }
  }
  return problems;
}

const schemas = new Map();
for (const [path, expected] of [
  ['schemas/titin-state-export.schema.json', 'titin-state-export/1'],
  ['schemas/titin-claim-support-export.schema.json', 'titin-claim-support-export/1'],
]) {
  const schema = JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
  if (schema.$id !== expected || schema.type !== 'object'
      || schema.additionalProperties !== false || !Array.isArray(schema.required)) {
    throw new Error(`${path} does not define the required closed-object JSON Schema.`);
  }
  schemas.set(expected, schema);
}

const lengths = [2000, 2200, 2400, 1900];
const hashes = [];
for (const length of lengths) {
  const options = {
    model,
    presentationState: {
      depth: 'explore', story_step: 'meet_sarcomere', sarcomere_length_nm: length,
      drawer: 'sources', scene_id: 'spring', scale: 'context',
      deepLink: `#v=2&depth=explore&step=meet_sarcomere&sl=${length}&drawer=sources&scene=spring&confidence=1`,
      confidence_display: true,
    },
    selection: { kind: 'region', id: 'PEVK' },
    buildIdentity: identity,
    inputManifest,
  };
  const first = researchExport(options);
  const second = researchExport(options);
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error(`${length} nm exports differ across identical runs.`);
  }
  const problems = validateResearchExport(first, { model });
  if (problems.length) {
    throw new Error(`${length} nm exports are invalid:\n  - ${problems.join('\n  - ')}`);
  }
  const state = JSON.parse(first.stateJson);
  const claims = JSON.parse(first.claimsJson);
  const schemaProblems = [
    ...validateSchema(schemas.get(state.schema), state),
    ...validateSchema(schemas.get(claims.schema), claims),
  ];
  if (schemaProblems.length) {
    throw new Error(`${length} nm JSON Schema validation failed:\n  - ${schemaProblems.join('\n  - ')}`);
  }
  const direct = model.geometryAt(length);
  if (state.mechanics.status !== direct.titin_force_status
      || state.mechanics.parameter_set_id !== direct.mechanical_parameter_set_id) {
    throw new Error(`${length} nm state export disagrees with direct model evaluation.`);
  }
  hashes.push({
    sarcomere_length_nm: length,
    status: direct.titin_force_status,
    state_json_sha256: createHash('sha256').update(first.stateJson).digest('hex'),
    force_csv_sha256: createHash('sha256').update(first.forceCsv).digest('hex'),
    regional_csv_sha256: createHash('sha256').update(first.regionalCsv).digest('hex'),
    claims_json_sha256: createHash('sha256').update(first.claimsJson).digest('hex'),
  });
}

if (process.argv.includes('--json')) console.log(JSON.stringify(hashes, null, 2));
else {
  console.log(`SC-26 RESEARCH EXPORTS VALID (${hashes.length} states)`);
  for (const row of hashes) {
    console.log(`  ${row.sarcomere_length_nm} nm · ${row.status} · state ${row.state_json_sha256.slice(0, 12)}`);
  }
}
