/** SC-14 gates: the passive force model reaches the screen without changing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { MechanicalModel } from '../src/geometry/MechanicalModel.js';
import { createForceCurve, FORCE_CURVE } from '../src/presentation/ForceCurve.js';

const model = await TitinModel.create(nodeReader());
const report = JSON.parse(readFileSync(new URL('../data/mechanical_model.json', import.meta.url), 'utf8'));

test('SC14: the curve is sampled from the same pipeline the render uses', () => {
  const curve = createForceCurve(model, { currentLengthNm: 2200 });
  assert.ok(curve.points.length >= 25);
  for (const point of curve.points) {
    const geometry = model.geometryAt(point.sarcomere_length_nm);
    assert.equal(point.force_pN, geometry.titin_chain_force_pN);
    assert.equal(point.iband_total_nm, geometry.titin_iband_total_nm);
  }
});

test('SC14: passive force rises monotonically with sarcomere length', () => {
  const curve = createForceCurve(model, {});
  for (let i = 1; i < curve.points.length; i += 1) {
    assert.ok(curve.points[i].force_pN > curve.points[i - 1].force_pN,
      `force fell between ${curve.points[i - 1].sarcomere_length_nm} and ${curve.points[i].sarcomere_length_nm} nm`);
  }
});

test('SC14: the displayed force agrees with the reviewed per-state report', () => {
  for (const [name, state] of Object.entries(report.per_state)) {
    const geometry = model.geometryAt(state.sarcomere_length_nm);
    assert.ok(Math.abs(geometry.titin_chain_force_pN - state.model_force_pN) < 1e-3,
      `${name}: ${geometry.titin_chain_force_pN} pN vs reported ${state.model_force_pN} pN`);
  }
});

test('SC14: compliance shares sum to one and name the recruitment order', () => {
  const curve = createForceCurve(model, { currentLengthNm: 2400 });
  const shares = Object.values(curve.current.shares);
  assert.ok(Math.abs(shares.reduce((a, b) => a + b, 0) - 1) < 1e-6);
  const mechanical = new MechanicalModel(model.spec.titin);
  const geometry = model.geometryAt(2400);
  const expected = mechanical.complianceShares(geometry.titin_chain_force_pN).share;
  for (const [id, value] of Object.entries(expected)) {
    assert.ok(Math.abs(curve.current.shares[id] - value) < 1e-9, `${id} disagrees`);
  }
  // At the top of the working range PEVK is the dominant compliance.
  const ranked = Object.entries(curve.current.shares).sort((a, b) => b[1] - a[1]);
  assert.equal(ranked[0][0], 'PEVK');
});

test('SC14: the curve carries evidence metadata it cannot silently drop', () => {
  const curve = createForceCurve(model, {});
  assert.equal(curve.evidence_class, 'MODELED');
  assert.ok(curve.not_claimed.length >= 2);
  for (const id of curve.source_ids) {
    assert.ok(model.spec.references[id], `unresolved source '${id}'`);
  }
  assert.ok(model.spec.showcaseClaims.objects.some((claim) => claim.id === FORCE_CURVE.claim_id),
    'the curve must bind to an existing reviewed claim');
});

const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const builder = readFileSync(new URL('../scripts/build_standalone.mjs', import.meta.url), 'utf8');

test('SC14: the stage shows live passive force with its evidence class', () => {
  assert.match(page, /id="stageForce"/);
  assert.match(page, /titin_chain_force_pN/);
  assert.match(page, /MODELED/);
});

test('SC14: the Measure tab draws the curve with labelled axes and units', () => {
  assert.match(page, /id="forceCurve"/);
  assert.match(page, /function renderForceCurve/);
  assert.match(page, /axes\.x\.label/);
  assert.match(page, /axes\.y\.label/);
});

test('SC14: the curve panel states what it does not claim', () => {
  assert.match(page, /curve\.not_claimed/);
});

test('SC14: new bundle bindings are re-exported by the standalone builder', () => {
  for (const name of ['createForceCurve']) {
    if (page.includes(name)) {
      assert.ok(builder.includes(name) || page.includes('visualization.forceCurve'),
        `${name} must reach the standalone bundle`);
    }
  }
});
