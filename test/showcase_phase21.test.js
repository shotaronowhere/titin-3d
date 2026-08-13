/** SC-21 gates: one parameter authority, status-bearing mechanics, fail-closed SD-04. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

import { modelFingerprint, MODEL_INPUTS } from '../scripts/build_identity.mjs';
import { MechanicalModel, formatForceEstimate } from '../src/geometry/MechanicalModel.js';
import { TitinModel } from '../src/model/TitinModel.js';
import { Spec } from '../src/model/SpecLoader.js';
import { nodeReader } from '../src/model/readNode.js';
import { sourceHref } from '../src/presentation/AnnotationCatalog.js';
import { createForceCurve } from '../src/presentation/ForceCurve.js';
import { createReleasePack, validateReleasePack } from '../src/presentation/ReleasePack.js';

const parameters = JSON.parse(readFileSync(
  new URL('../data/mechanical_parameters.json', import.meta.url), 'utf8',
));
const report = JSON.parse(readFileSync(
  new URL('../data/mechanical_model.json', import.meta.url), 'utf8',
));
const states = JSON.parse(readFileSync(
  new URL('../data/structural_states.json', import.meta.url), 'utf8',
));
const model = await TitinModel.create(nodeReader());
const mechanics = new MechanicalModel(
  model.spec.titin, model.spec.mechanicalParameters, model.spec.identity.model_fingerprint,
);

function approvedParameterFixture() {
  return structuredClone(parameters);
}

test('SC21: the parameter record is required, model-identifying, and decision-bound', () => {
  assert.equal(parameters.schema, 'titin-mechanical-parameters/1');
  assert.deepEqual(model.spec.mechanicalParameters, parameters);
  assert.ok(MODEL_INPUTS.includes('data/mechanical_parameters.json'));
  assert.equal(parameters.decision.id, 'SD-04');
  assert.equal(parameters.decision.status, 'APPROVED');
  assert.equal(parameters.decision.approved_reviewer, null);
  assert.match(parameters.decision.approved_authority, /citation-backed literature adjudication/);
  assert.equal(report.parameter_set_id, parameters.parameter_set_id);
  assert.equal(report.model_fingerprint, modelFingerprint());
});

test('SC21: every law parameter carries units, uncertainty, source, preparation, and transfer', () => {
  const rows = [
    ...Object.values(parameters.physical_constants),
    ...parameters.regions.flatMap((region) => Object.values(region.parameters)),
  ];
  assert.ok(rows.length >= 13);
  for (const row of rows) {
    assert.ok(row.unit);
    assert.ok(row.uncertainty?.kind);
    assert.ok(Object.hasOwn(row.uncertainty, 'lower'));
    assert.ok(Object.hasOwn(row.uncertainty, 'upper'));
    assert.ok(row.source_id);
    assert.ok(row.source_locator);
    assert.ok(row.species);
    assert.ok(row.preparation);
    assert.ok(row.applicability);
    assert.ok(row.transfer_rationale);
    assert.ok(row.validity?.target_status);
    assert.ok(Object.hasOwn(row.validity, 'approved_range'));
    assert.ok(row.validity.reason);
    assert.equal(row.approved_reviewer, null);
    assert.equal(row.approved_authority, parameters.decision.approved_authority);
    assert.equal(row.decision_status, 'APPROVED');
  }
  assert.equal(
    sourceHref('SI-2019', model.spec.references['SI-2019']),
    'https://www.bipm.org/en/publications/si-brochure',
  );
});

test('SC21: JavaScript contains algorithms but no duplicated material constants', () => {
  const source = readFileSync(new URL('../src/geometry/MechanicalModel.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /A_nm:\s*(?:21|0\.35|0\.55)/);
  assert.doesNotMatch(source, /K0_pN:\s*185/);
  assert.doesNotMatch(source, /T_KELVIN|CHAIN_PARAMETERS|IBAND_ORDER/);
  assert.match(source, /mechanicalParameters\.physical_constants/);
  assert.match(source, /mechanicalParameters\.topology\.region_order/);
});

test('SC21: approved SD-04 emits force only inside its length regimes', () => {
  const expected = new Map([
    [1900, 'not_evaluated'], [2000, 'supported'], [2200, 'supported'],
    [2400, 'supported'], [2450, 'extrapolated'], [2500, 'not_evaluated'],
    [3000, 'not_evaluated'],
  ]);
  for (const [length, status] of expected) {
    const geometry = model.geometryAt(length);
    assert.equal(geometry.titin_force_status, status);
    if (status === 'not_evaluated') {
      assert.equal(geometry.titin_chain_force_pN, null);
      assert.equal(geometry.titin_force_sensitivity, null);
    } else {
      assert.ok(Number.isFinite(geometry.titin_chain_force_pN));
      assert.ok(geometry.titin_force_sensitivity.force_pN.min
        <= geometry.titin_chain_force_pN);
      assert.ok(geometry.titin_force_sensitivity.force_pN.max
        >= geometry.titin_chain_force_pN);
    }
    assert.equal(geometry.mechanical_parameter_set_id, parameters.parameter_set_id);
    assert.equal(geometry.mechanical_model_fingerprint, model.spec.identity.model_fingerprint);
  }
});

test('SC21: target evaluation cannot be confused with the development geometry solve', () => {
  const evaluation = mechanics.evaluateSarcomereLength(2200, { totalNm: 275 });
  assert.equal(evaluation.status, 'supported');
  assert.ok(Number.isFinite(evaluation.force_pN));
  assert.ok(evaluation.sensitivity.force_pN.min <= evaluation.force_pN);
  assert.ok(evaluation.sensitivity.force_pN.max >= evaluation.force_pN);
  assert.ok(Math.abs(Object.values(evaluation.region_extension_nm)
    .reduce((sum, value) => sum + value, 0) - 275) < 1e-9,
  'the public evaluation should retain the force-balanced regional geometry');
  assert.throws(() => mechanics.solveForce(275), /not a public evaluation/);
  const partition = mechanics.partition(275, { sarcomereLengthNm: 2200 });
  assert.ok(Number.isFinite(partition.force_pN));
  assert.equal(partition.status, 'supported');
  assert.equal('development_force_pN' in partition, false);
  assert.ok(Math.abs(partition.total_nm - 275) < 1e-9);
});

test('SC21: both solver ports reject targets outside their configured force bracket', () => {
  assert.throws(
    () => mechanics.solveDevelopmentForce(1e9),
    /outside the solver bracket/,
  );
  const probe = `
import sys
sys.path.insert(0, 'scripts')
import mechanical_model as model
chain = model.chain_parameters(model.load('titin.json'), model.load('mechanical_parameters.json'))
try:
    model.solve_force(chain, 1e9)
except ValueError as error:
    assert 'outside the solver bracket' in str(error)
else:
    raise AssertionError('unreachable target escaped the Python solver')
`;
  execFileSync('python3', ['-c', probe], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8',
  });
});

test('SC21: decision validation admits honest citation-backed and qualified-human provenance', () => {
  const probe = `
import copy, sys
sys.path.insert(0, 'scripts')
from scientific_common import decision_payload_sha256, load_json, ROOT
from validate_scientific_decisions import validate
record = load_json(ROOT / 'data/scientific_decisions.json')
claims = load_json(ROOT / 'data/claim_support.json')
assert not validate(record, claims)
approved = copy.deepcopy(record)
row = approved['decisions']['SD-04']
row['status'] = 'APPROVED'
row['reviewer'] = {
    'name': 'Qualified Mechanics Reviewer',
    'affiliation': 'Independent Mechanics Institute',
    'role': row['required_reviewer_role'],
}
row['independent_human_review_status'] = 'COMPLETED'
row['ruling'] = {
    'parameter_set_id': 'titin-q8wz42-1-mechanics-v1',
    'target_accession': 'Q8WZ42-1',
    'approved_supported_range_nm': [2000.0, 2400.0],
    'slack_or_buckling_boundary_nm': 1950.0,
    'unfolding_materiality_boundary_nm': 2600.0,
    'approved_sensitivity_scenario_ids': ['approved_lower_transfer'],
    'public_force_output': 'AUTHORIZED_BY_REGIME',
    'implementation_record': 'approved-fixture://SC-21-decision-validator',
}
row['public_caveat'] = 'Approximate passive force per titin under the approved regime.'
row['reviewed_payload_sha256'] = decision_payload_sha256(row)
row['implementation_verification']['reviewer'] = copy.deepcopy(row['reviewer'])
problems = validate(approved, claims)
assert not problems, problems
row['reviewer']['affiliation'] = ''
problems = validate(approved, claims)
assert any('specialist-review provenance' in problem for problem in problems), problems
`;
  execFileSync('python3', ['-c', probe], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8',
  });
});

test('SC21: generated outputs contain identities and regime-authorized evaluations', () => {
  assert.equal(report.schema, 'titin-mechanical-model/2');
  assert.equal(report.force_pN, null);
  assert.equal(report.evaluation_status, 'status_by_length');
  assert.equal(report.sensitivity.status, 'approved');
  assert.equal(report.sensitivity.force_pN, null);
  for (const [name, row] of Object.entries(report.per_state)) {
    const evaluated = row.sarcomere_length_nm >= 2000 && row.sarcomere_length_nm < 2500;
    assert.equal(row.evaluation.status, evaluated ? 'supported' : 'not_evaluated', name);
    assert.equal(Number.isFinite(row.evaluation.force_pN), evaluated, name);
    assert.equal(Array.isArray(row.evaluation.sensitivity_pN), evaluated, name);
    assert.ok(Math.abs(Object.values(row.evaluation.region_extension_nm)
      .reduce((sum, value) => sum + value, 0) - row.titin_I_band_total_nm) < 1e-9, name);
    for (const id of mechanics.order) {
      assert.ok(Math.abs(row.evaluation.region_extension_nm[id]
        - row.model_partition_nm[id]) < 0.01, `${name} ${id}`);
    }
    assert.equal(row.evaluation.incremental_compliance_share !== null, evaluated, name);
    assert.equal(row.evaluation.parameter_set_id, parameters.parameter_set_id, name);
    assert.equal(row.evaluation.model_fingerprint, report.model_fingerprint, name);
    assert.equal(row.parameter_sensitivity_range.force_pN !== null, evaluated, name);
    assert.equal(row.regional_incremental_compliance_nm_per_pN.values !== null, evaluated, name);
  }
  for (const [name, state] of Object.entries(states.states)) {
    const provenance = state.titin_I_band_extension_provenance;
    const evaluated = state.sarcomere_length_nm >= 2000 && state.sarcomere_length_nm < 2500;
    assert.equal(provenance.force_evaluation_status, evaluated ? 'supported' : 'not_evaluated', name);
    assert.equal(Number.isFinite(provenance.common_force_pN), evaluated, name);
    assert.equal(provenance.parameter_set_id, parameters.parameter_set_id, name);
  }
});

test('SC21: release pack exports the exact canonical parameter record', () => {
  const released = readFileSync(
    new URL('../release/mechanical_parameters.json', import.meta.url), 'utf8',
  );
  const canonical = readFileSync(
    new URL('../data/mechanical_parameters.json', import.meta.url), 'utf8',
  );
  assert.equal(released, canonical);
  const manifest = JSON.parse(readFileSync(
    new URL('../release/MANIFEST.json', import.meta.url), 'utf8',
  ));
  assert.ok(manifest.artifacts.some(
    (artifact) => artifact.path === 'release/mechanical_parameters.json',
  ));
});

test('SC21: release validation supports a complete approved authority but rejects partial approval', () => {
  const pack = createReleasePack(model);
  assert.doesNotThrow(() => validateReleasePack(pack));
  const approved = structuredClone(pack);
  approved.scientific_authority.mechanics = {
    ...approved.scientific_authority.mechanics,
    decision_status: 'APPROVED',
    decision_reviewer: {
      name: 'Qualified Mechanics Reviewer',
      affiliation: 'Independent Mechanics Institute',
      role: 'Titin passive-mechanics and single-molecule force-law specialist',
    },
    independent_human_review_status: 'COMPLETED',
    public_force: 'AUTHORIZED_BY_REGIME',
    evaluation_status: 'status_by_length',
    approved_supported_range_nm: [2000, 2400],
    sensitivity_status: 'approved',
  };
  approved.scientific_authority.decision_statuses['SD-04'] = 'APPROVED';
  approved.scientific_authority.mechanics_sprint_status =
    'APPROVED_PENDING_IMPLEMENTATION_VERIFICATION';
  assert.doesNotThrow(() => validateReleasePack(approved));
  const complete = structuredClone(approved);
  complete.scientific_authority.mechanics_sprint_status = 'COMPLETE';
  complete.scientific_authority.mechanics.implementation_verification = {
    status: 'VERIFIED',
    reviewer_name: 'Qualified Mechanics Reviewer',
    implemented_model_fingerprint: complete.identity.model_fingerprint,
  };
  assert.doesNotThrow(() => validateReleasePack(complete));
  approved.scientific_authority.mechanics.approved_supported_range_nm = null;
  assert.throws(() => validateReleasePack(approved), /approved mechanics authority is incomplete/);

  const falselyComplete = structuredClone(pack);
  falselyComplete.scientific_authority.mechanics = {
    ...approved.scientific_authority.mechanics,
    approved_supported_range_nm: [2000, 2400],
  };
  falselyComplete.scientific_authority.decision_statuses['SD-04'] = 'APPROVED';
  falselyComplete.scientific_authority.mechanics_sprint_status = 'COMPLETE';
  assert.throws(
    () => validateReleasePack(falselyComplete),
    /completion lacks matching implementation verification/,
  );
});

test('SC21: every sensitivity scenario is source-bound and remains non-probabilistic', () => {
  assert.deepEqual(parameters.regime_policy.approved_supported_range_nm, [2000, 2400]);
  assert.equal(parameters.regime_policy.slack_or_buckling_boundary_nm, 2000);
  assert.equal(parameters.regime_policy.unfolding_materiality_boundary_nm, 2500);
  assert.equal(parameters.sensitivity_policy.approved_scenarios.length, 9);
  assert.equal(parameters.sensitivity_policy.status, 'approved');
  assert.equal(parameters.sensitivity_policy.label, 'parameter sensitivity range');
  for (const scenario of parameters.sensitivity_policy.approved_scenarios) {
    assert.ok(scenario.source_ids.length);
    assert.ok(scenario.interpretation);
    for (const sourceId of scenario.source_ids) assert.ok(model.spec.references[sourceId]);
  }
  assert.match(parameters.sensitivity_policy.reason, /confidence interval/i);
});

test('SC21: approved-regime scaffold honors both omission boundaries and PEVK-rise scenarios', () => {
  const approved = approvedParameterFixture();
  const approvedMechanics = new MechanicalModel(
    model.spec.titin, approved, model.spec.identity.model_fingerprint,
  );
  assert.equal(approvedMechanics.statusAt(1900), 'not_evaluated');
  assert.equal(approvedMechanics.statusAt(2000), 'supported');
  assert.equal(approvedMechanics.statusAt(2400), 'supported');
  assert.equal(approvedMechanics.statusAt(2450), 'extrapolated');
  assert.equal(approvedMechanics.statusAt(2500), 'not_evaluated');

  const centralContour = approvedMechanics.chain.PEVK.Lc_nm;
  const scenario = approvedMechanics.chainWithOverrides({ 'PEVK.residue_rise': 0.38 });
  assert.ok(Math.abs(scenario.PEVK.Lc_nm - centralContour * (0.38 / 0.34)) < 1e-12);
  assert.throws(
    () => approvedMechanics.chainWithOverrides({
      'PEVK.residue_rise': 0.38,
      'PEVK.contour_length': 500,
    }),
    /redundantly overrides both PEVK residue rise and contour length/,
  );
  const evaluation = approvedMechanics.evaluateSarcomereLength(2200, { totalNm: 275 });
  assert.equal(evaluation.status, 'supported');
  assert.ok(Number.isFinite(evaluation.force_pN));
  assert.ok(evaluation.sensitivity_pN.every(Number.isFinite));
  assert.ok(Math.abs(Object.values(evaluation.region_extension_nm)
    .reduce((sum, value) => sum + value, 0) - 275) < 1e-9);
  assert.ok(Math.abs(Object.values(evaluation.incremental_compliance_share)
    .reduce((sum, value) => sum + value, 0) - 1) < 1e-12);

  const python = `
import json, sys
sys.path.insert(0, 'scripts')
import mechanical_model as model
parameters = json.load(sys.stdin)
chain = model.chain_parameters(model.load('titin.json'), parameters)
print(json.dumps(model.public_evaluation(
    parameters, 'test-fingerprint', 2200, 275, chain
), separators=(',', ':')))
`;
  const pythonEvaluation = JSON.parse(execFileSync('python3', ['-c', python], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8', input: JSON.stringify(approved),
  }));
  assert.equal(pythonEvaluation.status, evaluation.status);
  assert.ok(Math.abs(pythonEvaluation.force_pN - evaluation.force_pN) < 1e-9);
  assert.equal(pythonEvaluation.precision.text, evaluation.precision.text);
  for (const key of ['min', 'max']) {
    assert.ok(Math.abs(pythonEvaluation.sensitivity.force_pN[key]
      - evaluation.sensitivity.force_pN[key]) < 1e-9);
  }
});

test('SC21: approved evaluations conserve length and stay continuous and monotone by regime', () => {
  const approvedMechanics = new MechanicalModel(
    model.spec.titin, approvedParameterFixture(), model.spec.identity.model_fingerprint,
  );
  const lengths = [2000, 2025, 2100, 2200, 2300, 2400, 2450, 2499];
  let previousForce = -Infinity;
  const previousExtension = Object.fromEntries(approvedMechanics.order.map((id) => [id, -Infinity]));
  for (const sarcomereLengthNm of lengths) {
    const totalNm = model.geometryAt(sarcomereLengthNm).titin_iband_total_nm;
    const evaluation = approvedMechanics.evaluateSarcomereLength(
      sarcomereLengthNm, { totalNm },
    );
    assert.notEqual(evaluation.status, 'not_evaluated', sarcomereLengthNm);
    assert.ok(evaluation.force_pN > previousForce, sarcomereLengthNm);
    previousForce = evaluation.force_pN;
    assert.ok(Math.abs(Object.values(evaluation.region_extension_nm)
      .reduce((sum, value) => sum + value, 0) - totalNm) < 1e-9, sarcomereLengthNm);
    assert.ok(evaluation.sensitivity.force_pN.min <= evaluation.force_pN);
    assert.ok(evaluation.sensitivity.force_pN.max >= evaluation.force_pN);
    const audit = approvedMechanics.auditPartition(evaluation.region_extension_nm);
    assert.equal(audit.consistent, true, sarcomereLengthNm);
    for (const id of approvedMechanics.order) {
      assert.ok(evaluation.region_extension_nm[id] > previousExtension[id],
        `${id} was not monotone at ${sarcomereLengthNm} nm`);
      previousExtension[id] = evaluation.region_extension_nm[id];
    }
  }
  for (const boundary of [2400]) {
    const evaluate = (sarcomereLengthNm) => approvedMechanics.evaluateSarcomereLength(
      sarcomereLengthNm,
      { totalNm: model.geometryAt(sarcomereLengthNm).titin_iband_total_nm },
    );
    const left = evaluate(boundary - 1e-4);
    const right = evaluate(boundary + 1e-4);
    assert.notEqual(left.status, right.status);
    assert.ok(Math.abs(left.force_pN - right.force_pN) < 1e-4, boundary);
  }
  assert.equal(approvedMechanics.statusAt(1999.999), 'not_evaluated');
  assert.equal(approvedMechanics.statusAt(2500), 'not_evaluated');
});

test('SC21: uncertainty formatting obeys sensitivity place and significant-digit cap', () => {
  assert.equal(formatForceEstimate({ status: 'not_evaluated', force_pN: null }).text,
    'not evaluated');
  const approximate = formatForceEstimate({ status: 'supported', force_pN: 12.345 });
  assert.equal(approximate.text, '≈12 pN');
  const bounded = formatForceEstimate({
    status: 'supported', force_pN: 12.345,
    sensitivity: { force_pN: { min: 11.75, max: 12.94 } },
  });
  assert.equal(bounded.text, '12 ± 1 pN');
});

test('SC21: approved presenter data includes regimes, marker precision, and sensitivity', () => {
  const files = structuredClone(model.spec._raw);
  files['mechanical_parameters.json'] = approvedParameterFixture();
  const approvedModel = new TitinModel(new Spec(files, model.spec.identity));
  const curve = createForceCurve(approvedModel, { currentLengthNm: 2200 });
  assert.equal(curve.current.status, 'supported');
  assert.ok(Number.isFinite(curve.current.force_pN));
  assert.match(curve.current.precision.text, /pN$/);
  assert.ok(curve.current.sensitivity.force_pN.min <= curve.current.force_pN);
  assert.ok(curve.current.sensitivity.force_pN.max >= curve.current.force_pN);
  assert.deepEqual(curve.supported_range_nm, [2000, 2400]);
  assert.ok(curve.points.some((point) => point.status === 'supported'));
  assert.ok(curve.points.some((point) => point.status === 'extrapolated'));
  assert.ok(curve.points.some((point) => point.status === 'not_evaluated'));
  assert.ok(Number.isFinite(curve.axes.y.min) && Number.isFinite(curve.axes.y.max));
});

test('SC21: validators and destructive controls pass', () => {
  const cwd = new URL('..', import.meta.url);
  const validation = execFileSync('python3', ['scripts/validate_mechanical_parameters.py'], {
    cwd, encoding: 'utf8',
  });
  const negative = execFileSync('python3', ['scripts/neg_control_mechanical_parameters.py'], {
    cwd, encoding: 'utf8',
  });
  assert.match(validation, /PASS/);
  assert.match(negative, /19\/19/);
  assert.match(negative, /approved fixture accepted/);
});

test('SC21: the public mechanics surface is status-bearing and one-click auditable', () => {
  const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
  assert.match(page, /dataset\.evaluationStatus = curve\.status/);
  assert.match(page, /Force evaluation:/);
  assert.match(page, /force not evaluated · absolute pN withheld · SD-04/);
  assert.match(page, /Equations, parameters, preparation, validity, and transfer audit/);
  assert.match(page, /Added regional length is shown separately from incremental/);
  assert.match(page, /function numericForceChart/);
  assert.match(page, /supported_range_nm/);
  assert.match(page, /stroke-dasharray/);
  assert.match(page, /parameter sensitivity range/i);
  assert.match(page, /approximate passive force per titin/);
  assert.doesNotMatch(page, /titin_chain_force_pN\.toFixed/);
});
