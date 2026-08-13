/** SC-19 gates: scope, sequence authority, claim entailment, and decisions. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { Spec, SPEC_FILES } from '../src/model/SpecLoader.js';
import { scopeLedger } from '../src/model/ScientificScope.js';
import { decisionLedger } from '../src/model/ScientificDecisions.js';
import { mapFeaturesToRegions } from '../src/model/SequenceFeatures.js';
import { nodeReader } from '../src/model/readNode.js';
import { MODEL_INPUTS, readEmbeddedInputManifest } from '../scripts/build_identity.mjs';

const model = await TitinModel.create(nodeReader());
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const standalone = readFileSync(new URL('../index.html', import.meta.url));
const report = JSON.parse(readFileSync(
  new URL('../docs/scientific-decisions/SC-19/region-feature-report.json', import.meta.url), 'utf8',
));

test('SC19: all four authority records are mandatory standalone spec inputs', () => {
  for (const file of [
    'scientific_scope.json', 'titin_sequence_features.json',
    'claim_support.json', 'scientific_decisions.json',
  ]) assert.ok(SPEC_FILES.includes(file), `${file} is not required by SpecLoader`);
  assert.ok(MODEL_INPUTS.includes('data/titin_sequence_features.json'));
  for (const buildOnly of [
    'data/scientific_scope.json', 'data/claim_support.json', 'data/scientific_decisions.json',
  ]) assert.ok(!MODEL_INPUTS.includes(buildOnly), `${buildOnly} polluted quantitative identity`);
  const manifest = readEmbeddedInputManifest(standalone);
  const paths = new Set(manifest.inputs.map((row) => row.path));
  for (const file of SPEC_FILES) assert.ok(paths.has(`data/${file}`), `${file} is not embedded/hashed`);
});

test('SC19: scope has no tissue overclaim or literal public fallback', () => {
  const scope = scopeLedger(model.spec);
  assert.equal(scope.sequence.isoform_id, 'Q8WZ42-1');
  assert.equal(scope.sequence.tissue_or_muscle_claim, null);
  assert.match(scope.publicBadge, /Q8WZ42-1.*citation-reviewed/i);
  assert.match(scope.mechanics.display_label, /rat\/rabbit.*SD-04 APPROVED WITH LIMITS.*approximate passive pN per titin/i);
  assert.ok(scope.render.reference_molecule_policy);
  assert.ok(scope.excludedClaims.length);
  assert.match(page, /\$\('scopeIdentity'\)\.textContent = model\.scientificScope\.publicBadge/);
  assert.doesNotMatch(page, /Human skeletal N2A titin/i);
  assert.throws(() => scopeLedger({ scientificScope: {
    ...model.spec.scientificScope, public_badge: '',
  } }), /public_badge/);
});

test('SC19: all five decision statuses are normalized and visibly rendered', () => {
  const decisions = decisionLedger(model.spec);
  assert.deepEqual(decisions.counts, { PENDING: 0, APPROVED: 4, DEFERRED: 1 });
  assert.match(decisions.badgeText, /SD-01 approved/i);
  assert.match(decisions.badgeText, /SD-02 deferred/i);
  assert.match(decisions.badgeText, /SD-03 approved/i);
  assert.match(decisions.badgeText, /SD-04 approved/i);
  assert.match(decisions.badgeText, /SD-05 approved/i);
  assert.match(page, /id="scopeDecisions"/);
  assert.match(page, /id="scientificDecisionStatus"/);
  assert.match(page, /model\.scientificDecisions\.badgeText/);
});

test('SC19: pinned features map deterministically and retain the adjudication discrepancy', () => {
  const mapped = mapFeaturesToRegions(model.spec.sequenceFeatures, model.spec.titin.regions, {
    expectedCoordinateFrame: 'canonical',
  });
  assert.equal(mapped.unassignedFeatures.length, 0);
  assert.equal(mapped.multiplyAssignedFeatures.length, 0);
  assert.equal(mapped.boundaryProblems.length, 0);
  const n2a = report.regions.find((row) => row.region_id === 'N2A');
  const distal = report.regions.find((row) => row.region_id === 'dist_Ig');
  assert.deepEqual([n2a.declared_domain_counts.Ig_like, n2a.contained_domain_counts.Ig_like], [1, 0]);
  assert.deepEqual([distal.declared_domain_counts.Ig_like, distal.contained_domain_counts.Ig_like], [15, 16]);
  assert.ok(report.regions.every((row) => row.density_signal_only === true));
});

test('SC19: coordinate-frame mismatch throws rather than becoming a warning', () => {
  assert.throws(() => mapFeaturesToRegions(model.spec.sequenceFeatures, model.spec.titin.regions, {
    expectedCoordinateFrame: 'isoform-relative',
  }), /coordinate frame/);
});

test('SC19: every visible claim resolves to its exact atomic support record', () => {
  const support = new Map(model.spec.claimSupport.claims.map((row) => [row.id, row]));
  for (const [index, object] of model.spec.showcaseClaims.objects.entries()) {
    const claim = support.get(object.claim_support_id);
    assert.ok(claim, object.id);
    assert.equal(claim.claim_class, object.claim_evidence_class);
    assert.equal(claim.render_class, object.render_evidence_class);
    assert.ok(claim.support.length);
    assert.ok(claim.public_bindings.includes(`data/showcase_claims.json#/objects/${index}/claim`));
    assert.equal(claim.review.status, 'PENDING');
    assert.equal(claim.review.reviewer, null);
  }
  for (const required of [
    'sequence_region_partition', 'aband_periodicity_relation', 'force_law_parameter_set',
    'pevk_phosphorylation', 'sarcomere_definition', 'actomyosin_motor_function',
  ]) assert.ok(support.has(required), `known claim audit missing ${required}`);
  assert.deepEqual(new Set(model.spec.claimSupport.evidence_classes), new Set([
    'MEASURED', 'STRONGLY INFERRED', 'MODELED', 'INFERRED', 'SCHEMATIC', 'UNKNOWN',
  ]));
  assert.ok(!model.spec.claimSupport.evidence_classes.includes('direct'));
  for (const [index, annotation] of model.spec.annotations.components.entries()) {
    assert.ok(annotation.claim_support_ids?.length, `${annotation.id} has no claim binding`);
    for (const id of annotation.claim_support_ids) {
      const claim = support.get(id);
      assert.ok(claim, `${annotation.id} -> ${id}`);
      assert.ok(claim.public_bindings.includes(`data/annotations.json#/components/${index}`),
        `${annotation.id} is absent from ${id}'s public bindings`);
    }
  }
  assert.ok(support.get('force_law_parameter_set').public_bindings
    .some((path) => path.includes('stageForce')));
});

test('SC19: runtime rejects a valid pointer rebound to the wrong public claim', () => {
  const files = structuredClone(model.spec._raw);
  const claim = files['claim_support.json'].claims.find((row) => row.id === 'scope_badge');
  claim.public_bindings[0] = 'data/showcase_claims.json#/objects/1/claim';
  const result = new Spec(files).check();
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((problem) => /scope_badge.*exact public binding/i.test(problem)));
});

test('SC20: all five owner-authorized decisions are honest and packet-byte bound', () => {
  assert.equal(model.spec.scientificDecisions.sprint_status, 'DECISIONS_CONSUMABLE_SC20');
  assert.deepEqual(Object.keys(model.spec.scientificDecisions.decisions), [
    'SD-01', 'SD-02', 'SD-03', 'SD-04', 'SD-05',
  ]);
  const expected = {
    'SD-01': 'APPROVED', 'SD-02': 'DEFERRED', 'SD-03': 'APPROVED',
    'SD-05': 'APPROVED',
  };
  for (const [id, decision] of Object.entries(model.spec.scientificDecisions.decisions)) {
    if (id === 'SD-04') assert.ok(['DEFERRED', 'APPROVED'].includes(decision.status), id);
    else assert.equal(decision.status, expected[id], id);
    if (decision.reviewer === null) {
      assert.equal(decision.adjudicator.human_expert, false, id);
      assert.equal(decision.independent_human_review_status, 'NOT_PERFORMED', id);
    } else {
      assert.equal(decision.status, 'APPROVED', id);
      assert.equal(decision.reviewer.role, decision.required_reviewer_role, id);
      assert.ok(decision.reviewer.name && decision.reviewer.affiliation, id);
    }
    assert.ok(decision.ruling, id);
    for (const packet of decision.evidence_packet) {
      const bytes = readFileSync(new URL(`../${packet.path}`, import.meta.url));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), packet.sha256, packet.path);
    }
  }
});

test('SC19: registry closure and human entailment stay separate', () => {
  assert.match(model.spec.claimSupport.semantic_entailment, /Named human review only/i);
  assert.match(readFileSync(new URL('../scripts/validate_citations.py', import.meta.url), 'utf8'),
    /never claim semantic entailment/i);
  assert.doesNotMatch(readFileSync(new URL('../scripts/validate_citations.py', import.meta.url), 'utf8'),
    /requests|urllib|fetch\(/i);
});
