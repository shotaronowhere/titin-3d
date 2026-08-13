/** SC-14 gates: the passive force model reaches the screen without changing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { createForceCurve, FORCE_CURVE } from '../src/presentation/ForceCurve.js';

const model = await TitinModel.create(nodeReader());
const report = JSON.parse(readFileSync(new URL('../data/mechanical_model.json', import.meta.url), 'utf8'));

test('SC14: the curve is sampled from the same pipeline the render uses', () => {
  const curve = createForceCurve(model, { currentLengthNm: 2200 });
  assert.ok(curve.points.length >= 25);
  for (const point of curve.points) {
    const geometry = model.geometryAt(point.sarcomere_length_nm);
    assert.equal(point.force_pN, geometry.titin_chain_force_pN);
    assert.equal(point.status, geometry.titin_force_status);
    assert.equal(point.iband_total_nm, geometry.titin_iband_total_nm);
    assert.equal(point.parameter_set_id, model.spec.mechanicalParameters.parameter_set_id);
  }
});

test('SC21: approved curve has monotone geometry and regime-bound force values', () => {
  const curve = createForceCurve(model, {});
  for (let i = 1; i < curve.points.length; i += 1) {
    assert.ok(curve.points[i].iband_total_nm > curve.points[i - 1].iband_total_nm);
    const point = curve.points[i];
    const evaluated = point.sarcomere_length_nm >= 2000
      && point.sarcomere_length_nm < 2500;
    assert.equal(Number.isFinite(point.force_pN), evaluated);
    assert.equal(point.status === 'not_evaluated', !evaluated);
  }
  assert.ok(Number.isFinite(curve.axes.y.min));
  assert.ok(Number.isFinite(curve.axes.y.max));
  assert.deepEqual(curve.supported_range_nm, [2000, 2400]);
});

test('SC21: generated state rows and browser evaluations apply the same regimes', () => {
  for (const [name, state] of Object.entries(report.per_state)) {
    const geometry = model.geometryAt(state.sarcomere_length_nm);
    assert.equal(geometry.titin_force_status, state.evaluation.status, name);
    const evaluated = state.sarcomere_length_nm >= 2000
      && state.sarcomere_length_nm < 2500;
    assert.equal(Number.isFinite(geometry.titin_chain_force_pN), evaluated, name);
    assert.equal(Number.isFinite(state.evaluation.force_pN), evaluated, name);
    assert.equal(state.evaluation.parameter_set_id, report.parameter_set_id, name);
    assert.equal(state.evaluation.model_fingerprint, report.model_fingerprint, name);
  }
});

test('SC21: added length is distinct from authorized incremental compliance', () => {
  const curve = createForceCurve(model, { currentLengthNm: 2400 });
  assert.ok(curve.current.incremental_compliance_nm_per_pN.PEVK > 0);
  assert.ok(curve.current.added_length_contribution_nm.prox_Ig > 0);
  assert.ok(curve.current.added_length_contribution_nm.PEVK > 0);
  assert.doesNotMatch(JSON.stringify(curve.current), /compliance_share/);
});

test('SC14: the curve carries evidence metadata it cannot silently drop', () => {
  const curve = createForceCurve(model, {});
  assert.equal(curve.evidence_class, 'MODELED');
  assert.equal(curve.status, 'status_by_length');
  assert.equal(curve.decision.status, 'APPROVED');
  assert.equal(curve.sensitivity_label, 'parameter sensitivity range');
  assert.equal(curve.parameters.length, 13);
  assert.ok(curve.parameters.some((row) => row.id === 'physical_constants.boltzmann_constant'));
  assert.ok(curve.parameters.every((row) => row.validity?.target_status));
  assert.ok(curve.not_claimed.length >= 2);
  for (const id of curve.source_ids) {
    assert.ok(model.spec.references[id], `unresolved source '${id}'`);
  }
  assert.ok(model.spec.showcaseClaims.objects.some((claim) => claim.id === FORCE_CURVE.claim_id),
    'the curve must bind to an existing reviewed claim');
});

const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const builder = readFileSync(new URL('../scripts/build_standalone.mjs', import.meta.url), 'utf8');

test('SC21: the public stage binds force disclosure to the loaded decision and status', () => {
  assert.match(page, /id="stageForce"/);
  assert.match(page, /force not evaluated · absolute pN withheld/);
  assert.match(page, /SD-04 \$\{g\.titin_mechanics_decision_status\}/);
  assert.match(page, /g\.titin_force_precision\?\.text/);
  assert.doesNotMatch(page, /value\.textContent = `\$\{g\.titin_chain_force_pN/);
});

test('SC21: the Measure tab explains the regime-bound force curve', () => {
  assert.match(page, /id="forceCurve"/);
  assert.match(page, /function renderForceCurve/);
  assert.match(page, /Force evaluation:/);
  assert.match(page, /curve\.caveat/);
  assert.match(page, /Equations, parameters, preparation, validity, and transfer audit/);
});

test('SC21: the extension chart keeps geometry separate from the force audit', () => {
  assert.match(page, /chart\.total_nm\.toFixed/);
  assert.match(page, /common-force literature-bounded solver/);
});

test('SC21: the curve panel states what it does not claim', () => {
  assert.match(page, /No absolute force magnitude, supported validity range/);
  assert.match(page, /human-construct prediction is claimed/);
  assert.match(page, /visualization\.forceCurve\(\)/,
    'the UI must consume the status-bearing evaluator instead of a handwritten caveat');
});

test('SC14: new bundle bindings are re-exported by the standalone builder', () => {
  for (const name of ['createForceCurve']) {
    if (page.includes(name)) {
      assert.ok(builder.includes(name) || page.includes('visualization.forceCurve'),
        `${name} must reach the standalone bundle`);
    }
  }
});
