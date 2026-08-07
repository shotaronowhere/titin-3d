/**
 * The build fingerprint, defined once.
 *
 * The SC-9 preflight asks a presenter to compare the hosted page against the
 * offline file and confirm they are the same build. That comparison is only
 * meaningful if both derive their identity the same way, so the digest lives here
 * and is imported by the standalone builder (which stamps it into the page) and
 * by the release-pack builder (which prints it on every artifact).
 *
 * It covers exactly what determines the science on screen: the specification
 * records. Presentation code changes are caught separately by the standalone
 * staleness gate; a fingerprint that moved on every source edit would be a
 * version string, not a statement about the data being shown.
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));

export const FINGERPRINT_INPUTS = Object.freeze([
  'data/sarcomere.json',
  'data/titin.json',
  'data/structural_states.json',
  'data/geometry_sources.json',
  'data/references.json',
  'data/showcase_claims.json',
  'data/presentation.json',
  'data/annotations.json',
  'data/geometry_strategy.json',
  'data/context_measurements.json',
  'data/mechanical_model.json',
  // SC-16.2. These are drawn, not just consulted: at the deepest zoom the domain
  // surface IS these coordinates. Two builds whose fingerprints matched while
  // their backbones differed would make the preflight's same-build comparison say
  // the wrong thing about the science on screen.
  'data/domain_backbones.json',
]);

export function buildFingerprint() {
  const hash = createHash('sha256');
  for (const path of FINGERPRINT_INPUTS) {
    hash.update(`${path}\n${readFileSync(join(ROOT, path), 'utf8')}`);
  }
  return hash.digest('hex').slice(0, 12);
}
