/**
 * Phase 8 tests — the mechanical basis of I-band extension.
 *
 * Same discipline as the earlier phases: assert PROPERTIES that follow from the
 * physics, the primary source, or the spec's own declared policy — never values
 * pasted back from what the code printed. Several of these exist specifically
 * because an earlier draft got them wrong:
 *
 *   - a PEVK law that switched branches at 12 pN, which introduced a 14.7 nm
 *     DISCONTINUITY in chain length (the source reproduces the whole
 *     physiological range with one parameterisation, so the switch was the
 *     model's invention, not the physics);
 *   - an N2A folded-bundle transition whose 7 pN midpoint came from
 *     misattributing the *Ig domain's* 6-8 pN refolding force to N2A;
 *   - treating a WLC's contour length as reachable, when the pure-entropic form
 *     only approaches it asymptotically.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { EVIDENCE_CLASSES } from '../src/model/SpecLoader.js';
import { SarcomereScene, EVIDENCE_STYLE, evidenceStyle } from '../src/render/SarcomereScene.js';
import {
  MechanicalModel,
  wlcForce, wlcExtension, ewlcExtension, gInverse, gMarkoSiggia,
} from '../src/geometry/MechanicalModel.js';
import { execFileSync } from 'node:child_process';

const CHAIN_LC_FROM_SPEC = new Set(['prox_Ig', 'PEVK', 'dist_Ig']);
const model = await TitinModel.create(nodeReader());
const mech = new MechanicalModel(
  model.spec.titin, model.spec.mechanicalParameters, model.spec.identity.model_fingerprint,
);
const IBAND_ORDER = mech.order;
const KT_PN_NM = mech.kT_pN_nm;
const INVERSE_ITERATIONS = model.spec.mechanicalParameters.solver.inverse_iterations;
const states = model.spec.states.states;

/* ---------------------------------------------------- primary-source checks */

test('kT at the sourced temperature is 4.14 pN nm', () => {
  // 300 K is the temperature of the pnas.95.14.8052 experiments; the sourced
  // persistence lengths are only valid at the T they were measured at.
  assert.ok(Math.abs(KT_PN_NM - 4.1419) < 0.001, `kT = ${KT_PN_NM}`);
});

test('reproduces the PEVK force-extension datapoints its source reports', () => {
  // pnas.95.14.8052: "~1.5 pN at 20% relative extension ... 8 pN at 50%",
  // pure-entropic WLC with A = 0.65 nm. If these do not come back, the formula
  // or the parameter is not the one that paper used.
  assert.ok(Math.abs(wlcForce(0.20, 0.65, KT_PN_NM) - 1.5) <= 1.0);
  assert.ok(Math.abs(wlcForce(0.50, 0.65, KT_PN_NM) - 8.0) <= 0.5);
});

test("independently confirms the source's own stated validity boundary", () => {
  // The paper states PEVK is a pure entropic spring only "below ~12 pN, or
  // relative extensions <60%". Those are two statements of ONE boundary, so the
  // model must map 60% onto ~12 pN. Nothing was tuned to make this hold.
  const f60 = wlcForce(0.60, 0.65, KT_PN_NM);
  assert.ok(Math.abs(f60 - 12.0) <= 1.0, `60% extension -> ${f60.toFixed(2)} pN, expected ~12`);
});

test('poly-Ig entropic fit limit of ~35 pN sits below, not past, its contour', () => {
  // The source fits poly-Ig with the purely entropic WLC up to ~35 pN. A pure
  // WLC approaches contour asymptotically, so 35 pN must land close to but
  // strictly under 100% — otherwise A = 21 nm would be inconsistent with the
  // quoted fit range.
  const y = gInverse((35.0 * 21.0) / KT_PN_NM, INVERSE_ITERATIONS);
  assert.ok(y > 0.9 && y < 1.0, `y(35 pN) = ${y}`);
});

/* ------------------------------------------------------- law-level checks */

test('g is strictly increasing, so its bisection inverse cannot pick a branch', () => {
  let prev = -Infinity;
  for (let i = 0; i <= 1000; i += 1) {
    const y = (i / 1000) * 0.999;
    const g = gMarkoSiggia(y);
    assert.ok(g > prev, `g not increasing at y=${y}`);
    prev = g;
  }
});

test('gInverse round-trips g to double precision', () => {
  for (const y of [0.01, 0.1, 0.35, 0.6, 0.85, 0.95, 0.99]) {
    assert.ok(Math.abs(gInverse(gMarkoSiggia(y), INVERSE_ITERATIONS) - y) < 1e-9);
  }
});

test('pure-entropic WLC never reaches its contour length', () => {
  // The asymptote is the reason forceForRegion() must return null rather than a
  // big number for at-contour values.
  for (const F of [1, 10, 100, 1e4, 1e6]) {
    assert.ok(wlcExtension(F, 21.0, 308.0, KT_PN_NM, INVERSE_ITERATIONS) < 308.0,
      `WLC reached contour at ${F} pN`);
  }
});

test('extensible WLC has no contour ceiling — the enthalpic term is real strain', () => {
  assert.ok(ewlcExtension(
    1e4, 0.55, 542.1, 185.0, KT_PN_NM, INVERSE_ITERATIONS,
  ) > 542.1);
});

test('every region extension is monotone increasing in force', () => {
  for (const id of IBAND_ORDER) {
    let prev = -1;
    for (const F of [0, 0.01, 0.1, 0.5, 1, 2, 5, 10, 50, 200]) {
      const z = mech.regionExtension(id, F);
      assert.ok(z >= prev, `${id} not monotone at ${F} pN`);
      prev = z;
    }
  }
});

test('chain length is CONTINUOUS in force — no branch-switch discontinuity', () => {
  // This is the regression test for the rejected 12 pN branch switch, which put
  // a 14.7 nm jump in the chain. A real discontinuity does not shrink when the
  // sampling step shrinks; a steep-but-continuous limb does. So refine 10x and
  // require the max step to fall by roughly 10x.
  const maxStep = (n) => {
    let m = 0;
    let prevX = 1e-4;
    let prevY = mech.chainExtension(prevX);
    for (let i = 1; i <= n; i += 1) {
      const x = Math.exp(Math.log(1e-4) + (Math.log(400) - Math.log(1e-4)) * (i / n));
      const y = mech.chainExtension(x);
      m = Math.max(m, Math.abs(y - prevY));
      prevX = x; prevY = y;
    }
    return m;
  };
  const coarse = maxStep(2000);
  const fine = maxStep(20000);
  assert.ok(coarse / fine > 5.0,
    `step ratio ${(coarse / fine).toFixed(2)} on 10x refinement — a true jump would give ~1`);
  assert.ok(fine < 2.0, `max step ${fine.toFixed(3)} nm at fine sampling`);
});

/* ------------------------------------------- the DERIVED recruitment order */

test('recruitment order is DERIVED, not asserted: compliance migrates Ig -> PEVK', () => {
  // The spec's prose claim (titin.json:mechanical_summary) is
  // "Ig straighten -> N2A -> PEVK". Before Phase 8 nothing in the code derived
  // it. Here it must fall out of the sourced laws alone.
  const byLength = Object.values(states).sort(
    (a, b) => a.sarcomere_length_nm - b.sarcomere_length_nm);
  const igShare = [];
  const pevkShare = [];
  for (const s of byLength) {
    const force = mech.solveDevelopmentForce(s.titin_I_band_total_nm);
    const { share } = mech.developmentCompliance(force);
    igShare.push(share.prox_Ig);
    pevkShare.push(share.PEVK);
  }
  // proximal Ig dominates compliance at the shortest SL...
  assert.ok(igShare[0] > pevkShare[0], 'prox_Ig should dominate at the shortest SL');
  // ...and PEVK dominates at the longest.
  assert.ok(pevkShare.at(-1) > igShare.at(-1), 'PEVK should dominate at the longest SL');
  // and the migration is monotone in both, in opposite directions
  for (let i = 1; i < igShare.length; i += 1) {
    assert.ok(igShare[i] < igShare[i - 1], 'prox_Ig share must fall monotonically with SL');
    assert.ok(pevkShare[i] > pevkShare[i - 1], 'PEVK share must rise monotonically with SL');
  }
});

test('A-band titin bears the chain force but does NOT extend', () => {
  // structural_states.transition_rules.forbidden: "Do not extend the A-band".
  // The mechanical model must only ever partition the I-BAND total.
  assert.deepEqual(IBAND_ORDER, ['prox_Ig', 'N2A', 'PEVK', 'dist_Ig']);
  for (const id of IBAND_ORDER) {
    const region = model.spec.titin.regions.find((r) => r.id === id);
    assert.equal(region.band, 'I-band', `${id} must be an I-band region`);
  }
});

/* --------------------------------------------- total preservation & audit */

test('force partition preserves the I-band total exactly', () => {
  // This is what guarantees the mechanical layer cannot disturb filament
  // positions, overlap, the M-line or the lattice — only titin's internal
  // region boundaries move.
  for (const s of Object.values(states)) {
    const p = mech.partition(s.titin_I_band_total_nm);
    assert.ok(Math.abs(p.total_nm - s.titin_I_band_total_nm) < 1e-6,
      `total drifted by ${p.total_nm - s.titin_I_band_total_nm}`);
  }
});

test('partition is labelled MODELED, a defined class ranking below STRONGLY INFERRED', () => {
  // MODELED became the sixth evidence class in session 9 (authorised by the
  // project owner). It is DERIVED, not observed, so it must rank strictly below
  // STRONGLY INFERRED and must never present as MEASURED. Asserting the RANK
  // rather than a frozen string keeps this test meaningful if the wording moves.
  const p = mech.partition(275.0);
  assert.ok(p.evidence_class.startsWith('MODELED'), p.evidence_class);
  assert.ok(EVIDENCE_CLASSES.includes('MODELED'), 'MODELED must be in the vocabulary');
  const rank = (c) => EVIDENCE_CLASSES.indexOf(c); // index 0 = strongest
  assert.ok(rank('MODELED') > rank('STRONGLY INFERRED'),
    'MODELED must be weaker than STRONGLY INFERRED');
  assert.ok(rank('MODELED') < rank('INFERRED'),
    'MODELED must be stronger than INFERRED');
  assert.equal(
    model.spec.states.meta.evidence_by_claim.I_band_titin_extension_partition
      .startsWith('MODELED'), true);
  // the label is only honest if the record backs it: law named, inputs classed
  for (const st of Object.values(states)) {
    const pv = st.titin_I_band_extension_provenance;
    assert.ok(/pnas\.95\.14\.8052/.test(pv.model_basis || ''),
      'MODELED partition must cite the law it was computed from');
    assert.ok(Object.keys(pv.modeled_from || {}).length >= 3,
      'MODELED partition must declare the class of every model input');
    for (const c of Object.values(pv.modeled_from))
      assert.ok(/^(MEASURED|STRONGLY INFERRED)/.test(c),
        `MODELED input too weak: ${c}`);
  }
});

test('the weakest-link lattice places MODELED at its documented rung', () => {
  // A modelled value combined with a weaker claim must yield the weaker one —
  // otherwise modelling would launder confidence upward.
  const s = new SarcomereScene();
  assert.equal(s._weakestEvidence(['MEASURED', 'MODELED']), 'MODELED');
  assert.equal(s._weakestEvidence(['MODELED', 'STRONGLY INFERRED']), 'MODELED');
  assert.equal(s._weakestEvidence(['MODELED', 'SCHEMATIC']), 'SCHEMATIC');
  assert.equal(s._weakestEvidence(['MODELED', 'UNKNOWN']), 'UNKNOWN');
  // parenthetical qualifiers must resolve, not fall through
  assert.equal(s._weakestEvidence(['MODELED (series force balance)', 'MEASURED']), 'MODELED');
  assert.ok(evidenceStyle('MODELED (series force balance)').opacity
    < EVIDENCE_STYLE['STRONGLY INFERRED'].opacity);
  assert.ok(evidenceStyle('MODELED (series force balance)').opacity
    > EVIDENCE_STYLE.INFERRED.opacity);
  s.clear();
});

test('development diagnostic force rises monotonically with sarcomere length', () => {
  const byLength = Object.values(states).sort(
    (a, b) => a.sarcomere_length_nm - b.sarcomere_length_nm);
  let prev = -1;
  for (const s of byLength) {
    const F = mech.solveDevelopmentForce(s.titin_I_band_total_nm);
    assert.ok(F > prev, 'passive force must increase with stretch');
    prev = F;
  }
});

test('development diagnostic stays below the omitted unfolding regime in the working band', () => {
  // The spec classifies 6-8 pN as the physiological fold/unfold force and
  // 150-300 pN (AFM) as EXTREME / non-physiological. Within the stated working
  // range (2.0-2.4 um) the model must stay well under the AFM regime, or it
  // would be depicting forces the spec forbids depicting as ordinary.
  for (const s of Object.values(states)) {
    if (s.sarcomere_length_nm > 2400) continue;
    const F = mech.solveDevelopmentForce(s.titin_I_band_total_nm);
    assert.ok(F < 6.0,
      `SL ${s.sarcomere_length_nm}: ${F.toFixed(2)} pN reaches the fold/unfold regime`);
  }
});

test('audit reports unreachable values as null, never as a huge force', () => {
  // This used to read extended_reference, which placed N2A and dist_Ig AT their
  // contour lengths. The Phase-8 correction removed those at-contour values from
  // the spec, so the input is now CONSTRUCTED: the test is about the audit's
  // handling of an unreachable value, not about any particular keyframe.
  const at = { ...mech.partition(275.0).extension_nm };
  at.dist_Ig = mech.chain.dist_Ig.Lc_nm;            // exactly at contour
  const audit = mech.auditPartition(at);
  assert.ok(audit.unreachable_at_finite_force.includes('dist_Ig'),
    JSON.stringify(audit.unreachable_at_finite_force));
  assert.equal(audit.implied_force_pN.dist_Ig, undefined);
  // beyond contour is likewise unreachable, not a huge number
  const beyond = { ...at, prox_Ig: mech.chain.prox_Ig.Lc_nm * 1.5 };
  const a2 = mech.auditPartition(beyond);
  assert.ok(a2.unreachable_at_finite_force.includes('prox_Ig'));
  for (const id of a2.unreachable_at_finite_force) {
    assert.equal(a2.implied_force_pN[id], undefined,
      `${id} must be reported as unreachable, never as a finite force`);
  }
  // and a region pinned at the rigid folded-domain floor implies ZERO force,
  // which is reported separately rather than as a divide-by-zero in the spread
  const floored = { ...mech.partition(275.0).extension_nm, N2A: mech.chain.N2A.rigid_nm };
  const a3 = mech.auditPartition(floored);
  assert.ok(a3.at_rigid_floor.includes('N2A'), JSON.stringify(a3.at_rigid_floor));
  assert.ok(Number.isFinite(a3.spread), 'spread must stay finite with a floored region');
});

test('N2A can never be shorter than the folded Ig domain it contains', () => {
  // titin.json:domain_composition gives N2A one folded Ig-like domain. A bare WLC
  // let the region fall to 0.3 nm at the contracted state, well under a folded
  // domain (~4.0 nm, geometry_sources[10], MEASURED) -- physically impossible.
  assert.equal(mech.chain.N2A.law, 'folded_plus_wlc');
  for (const F of [0, 1e-6, 0.01, 0.1, 1, 10, 100]) {
    assert.ok(mech.regionExtension('N2A', F) >= mech.chain.N2A.rigid_nm - 1e-9,
      `N2A collapsed below its folded domain at F=${F} pN`);
  }
  // and every keyframe respects the floor
  for (const [name, st] of Object.entries(states)) {
    if (!st.titin_I_band_extension_nm) continue;
    assert.ok(st.titin_I_band_extension_nm.N2A >= mech.chain.N2A.rigid_nm - 1e-6,
      `${name}: N2A ${st.titin_I_band_extension_nm.N2A} nm is under the folded domain`);
  }
});

test('every keyframe partition is now mechanically realisable and monotone', () => {
  // The Phase-8 correction's central claim, asserted rather than described.
  const ordered = Object.entries(states)
    .filter(([, v]) => v && v.titin_I_band_extension_nm)
    .sort((a, b) => a[1].sarcomere_length_nm - b[1].sarcomere_length_nm);
  assert.ok(ordered.length >= 4);
  for (const [name, st] of ordered) {
    const a = mech.auditPartition(st.titin_I_band_extension_nm);
    assert.equal(a.consistent, true, `${name}: spread ${a.spread}`);
    assert.ok(a.spread < 1.05, `${name}: per-region forces must agree, got ${a.spread}x`);
    // the total must be preserved exactly -- that is what keeps filament geometry fixed
    const sum = Object.values(st.titin_I_band_extension_nm).reduce((x, y) => x + y, 0);
    assert.ok(Math.abs(sum - st.titin_I_band_total_nm) < 1e-6,
      `${name}: partition sums to ${sum}, total says ${st.titin_I_band_total_nm}`);
  }
  for (const id of ['prox_Ig', 'N2A', 'PEVK', 'dist_Ig']) {
    const vals = ordered.map(([, v]) => v.titin_I_band_extension_nm[id]);
    for (let i = 1; i < vals.length; i += 1) {
      assert.ok(vals[i] >= vals[i - 1] - 1e-6,
        `${id} shrinks under stretch: ${vals.join(' -> ')}`);
    }
  }
});

test('the audit detects a mechanically inconsistent partition', () => {
  // Negative control with teeth: a partition every region agrees on must pass,
  // and one built to disagree must fail. Both are constructed here, not read
  // from the spec, so this test says something about the AUDIT rather than
  // about any particular keyframe.
  const consistent = mech.partition(275.0).extension_nm;
  const good = mech.auditPartition(consistent);
  assert.equal(good.consistent, true, `spread ${good.spread}`);
  assert.ok(good.spread < 1.01, 'a force-balanced partition must imply one common force');

  const skewed = { ...consistent };
  skewed.dist_Ig = mech.chain.dist_Ig.Lc_nm * 0.99;   // near-contour: enormous force
  skewed.PEVK = 5.0;                                   // near-slack: tiny force
  const bad = mech.auditPartition(skewed);
  assert.equal(bad.consistent, false);
  assert.ok(bad.spread > 100, `spread ${bad.spread} should be large`);
});

/* --------------------------------- cross-language agreement with the Python */

test('JS port agrees with Python on the configured dense grid and regime boundaries', () => {
  const raw = execFileSync('python3', ['scripts/mechanical_model.py', '--parity-json'], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  const parity = JSON.parse(raw);
  assert.ok(parity.rows.length >= 100, 'parity grid must be dense');
  const tolerance = parity.tolerance;
  for (const row of parity.rows) {
    const evaluation = mech.evaluate(row.titin_I_band_total_nm, {
      sarcomereLengthNm: row.sarcomere_length_nm,
    });
    assert.equal(evaluation.status, row.evaluation_status);
    if (Number.isFinite(row.force_pN)) {
      assert.ok(Math.abs(evaluation.force_pN - row.force_pN) <= tolerance.force_pN);
    } else assert.equal(evaluation.force_pN, row.force_pN);
    assert.equal(evaluation.precision.text, row.precision.text);
    const diagnostic = row.development_diagnostic;
    const force = mech.solveDevelopmentForce(row.titin_I_band_total_nm);
    assert.ok(Math.abs(force - diagnostic.force_pN) <= tolerance.force_pN,
      `force parity failed at SL ${row.sarcomere_length_nm}`);
    const compliance = mech.developmentCompliance(force);
    for (const id of IBAND_ORDER) {
      assert.ok(Math.abs(mech.regionExtension(id, force) - diagnostic.extension_nm[id])
        <= tolerance.extension_nm, `${id} extension parity failed at SL ${row.sarcomere_length_nm}`);
      assert.ok(Math.abs(compliance.share[id] - diagnostic.compliance_share[id]) <= 1e-9,
        `${id} compliance-share parity failed at SL ${row.sarcomere_length_nm}`);
    }
  }
  for (const boundary of [1900, 2000, 2200, 2400, 3000]) {
    assert.ok(parity.rows.some((row) => row.sarcomere_length_nm === boundary),
      `parity grid omits ${boundary} nm boundary/reference`);
  }
  if (model.spec.mechanicalParameters.decision.status === 'APPROVED') {
    const policy = model.spec.mechanicalParameters.regime_policy;
    for (const boundary of [
      ...policy.approved_supported_range_nm,
      policy.slack_or_buckling_boundary_nm,
      policy.unfolding_materiality_boundary_nm,
    ]) {
      assert.ok(parity.rows.some((row) => row.sarcomere_length_nm === boundary),
        `parity grid omits approved regime boundary ${boundary} nm`);
    }
  }
});

test('contour lengths come from the spec, so they cannot drift', () => {
  for (const id of IBAND_ORDER) {
    const spec = model.spec.titin.regions.find((r) => r.id === id);
    if (CHAIN_LC_FROM_SPEC.has(id)) {
      assert.equal(mech.chain[id].Lc_nm, spec.extension_model.max_end2end_nm);
    }
  }
});

/* ------------------------------------------ engine integration (canonical mode) */

test('mechanical mode is the default — live geometry is force-balanced', () => {
  const e = model.geometry;
  assert.equal(e.titinPartitionMode, 'mechanical');
  const g = e.geometryAt(2200);
  assert.ok(g.titin_partition_evidence_class.startsWith('MODELED'));
  assert.equal(g.titin_force_status, 'supported');
  assert.ok(Number.isFinite(g.titin_chain_force_pN),
    'canonical live geometry must expose the SD-04-authorized public evaluation');
});

test('every geometry declares which route produced its titin partition', () => {
  const e = model.geometry;
  try {
    e.setTitinPartitionMode('mechanical');
    const g = e.geometryAt(2200);
    assert.equal(g.titin_partition_mode, 'mechanical');
    assert.ok(g.titin_partition_evidence_class.includes('MODELED'));
    assert.equal(g.titin_force_status, 'supported');
    assert.ok(Number.isFinite(g.titin_chain_force_pN));
  } finally {
    e.setTitinPartitionMode('mechanical');
  }
});

test('an unknown partition mode throws rather than falling back silently', () => {
  assert.throws(() => model.geometry.setTitinPartitionMode('lerp'), /unknown titin partition mode/);
});

test('the partition mode cannot move filaments, overlap, M-line or lattice', () => {
  // The whole safety argument for the mechanical route: it redistributes titin
  // INTERNALLY at fixed total, so nothing else in the sarcomere can move.
  const e = model.geometry;
  const keys = ['I_band_half_width_nm', 'overlap_len_nm', 'lattice_d10_nm',
                'titin_iband_total_nm'];
  for (const sl of [1900, 2050, 2200, 2400, 2700, 3000]) {
    const a = e.setTitinPartitionMode('keyframe').geometryAt(sl);
    const b = e.setTitinPartitionMode('mechanical').geometryAt(sl);
    for (const k of keys) {
      assert.ok(Math.abs(a[k] - b[k]) < 1e-6, `${k} moved at SL ${sl}: ${a[k]} vs ${b[k]}`);
    }
    assert.equal(a.mline.X, b.mline.X);
    assert.equal(a.thick_filament.X_start, b.thick_filament.X_start);
  }
  e.setTitinPartitionMode('mechanical');
});

test('mechanical mode lays titin regions end-to-end with no gap or overlap', () => {
  const e = model.geometry;
  try {
    e.setTitinPartitionMode('mechanical');
    for (const sl of [1900, 2200, 2400, 3000]) {
      const g = e.geometryAt(sl);
      const els = Object.keys(g.titin_iband_layout_nm);
      for (let i = 1; i < els.length; i += 1) {
        assert.ok(Math.abs(g.titin_iband_layout_nm[els[i]].X_start
                         - g.titin_iband_layout_nm[els[i - 1]].X_end) < 1e-9,
          `gap between ${els[i - 1]} and ${els[i]} at SL ${sl}`);
      }
    }
  } finally {
    e.setTitinPartitionMode('mechanical');
  }
});

test('mechanical mode is continuous in SL — no keyframe seams', () => {
  // Keyframe mode is piecewise-linear and has slope kinks at each keyframe.
  // Mechanical mode should not: it is one smooth function of the total.
  const e = model.geometry;
  try {
    e.setTitinPartitionMode('mechanical');
    for (const kf of [2200, 2400]) {
      for (const d of [1e-3, 1e-4]) {
        const lo = e.geometryAt(kf - d).titin_iband_extension_nm;
        const hi = e.geometryAt(kf + d).titin_iband_extension_nm;
        for (const id of IBAND_ORDER) {
          assert.ok(Math.abs(hi[id] - lo[id]) < 0.05,
            `${id} jumps ${(hi[id] - lo[id]).toFixed(4)} nm across the SL ${kf} keyframe`);
        }
      }
    }
  } finally {
    e.setTitinPartitionMode('mechanical');
  }
});
