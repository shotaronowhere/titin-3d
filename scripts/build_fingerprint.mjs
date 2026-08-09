/**
 * Backward-compatible model-identity exports.
 *
 * SC-18 separated the old ambiguous data-only "build fingerprint" into model,
 * application, build-input, and raw-artifact identities. New code imports
 * build_identity.mjs directly; these aliases keep older audit callers pointed at
 * the model contract without maintaining a second input list or hash algorithm.
 */
import { MODEL_INPUTS, modelFingerprint } from './build_identity.mjs';

export const FINGERPRINT_INPUTS = MODEL_INPUTS;
export const buildFingerprint = modelFingerprint;
