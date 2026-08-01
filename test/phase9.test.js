/**
 * Phase 9 — the biological API layer.
 *
 * These tests are about the API's HONESTY, not its plumbing. Three properties
 * carry scientific weight and each has adversarial coverage below:
 *
 *   1. The API never re-derives geometry. Every number it returns must be
 *      identical to the number the Phase 3-8 layers produce, because a second
 *      derivation could drift from the validated one with no way to say which is
 *      authoritative.
 *   2. `placeDomainsAlongPath` cannot be used to redistribute domains uniformly.
 *      The plan forbids uniform scaling; the force-balance partition from Phase 8
 *      is what makes region extension non-uniform, and an API that quietly
 *      re-spaced domains would discard it while still looking plausible.
 *   3. Interpolated geometry is labelled as interpolated. Every sarcomere length
 *      that is not exactly a defined keyframe must carry a caveat naming the
 *      states it sits between.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import {
  createSarcomere, createTitin, createTitinPath, createDomainChain,
  placeDomainsAlongPath, describeLength, regionOfDomain,
  IBAND_REGIONS, PATH_FIDELITY_TOL_NM,
} from '../src/api/titinApi.js';
import { SCALES, TitinVisualization } from '../src/api/TitinVisualization.js';
import { createAnnotations } from '../src/api/TitinAnnotations.js';
import { SarcomereScene, COMPONENTS, EVIDENCE_STYLE } from '../src/render/SarcomereScene.js';
import { EVIDENCE_CLASSES } from '../src/model/SpecLoader.js';
import * as api from '../src/api/titinApi.js';
import { readFileSync } from 'node:fs';

const model = await TitinModel.create(nodeReader());

// ---------------------------------------------------------------------------
// 1. the named API surface exists and speaks biology
// ---------------------------------------------------------------------------

test('PHASE9: every API name the plan specifies is exported and callable', () => {
  for (const [name, fn] of Object.entries({
    createSarcomere, createTitin, createTitinPath, createDomainChain, placeDomainsAlongPath,
  })) {
    assert.equal(typeof fn, 'function', `${name} must be a function`);
  }
  // The two Three.js-facing names are methods on the visualization class, and must
  // be distinct: landing exactly on a defined state and landing between states are
  // different scientific claims.
  for (const m of ['setSarcomereLength', 'setStructuralState']) {
    assert.equal(typeof TitinVisualization.prototype[m], 'function', `${m} missing`);
  }
  assert.notEqual(
    TitinVisualization.prototype.setSarcomereLength,
    TitinVisualization.prototype.setStructuralState,
    'the two setters must not be aliases — one names a state, the other a length',
  );
});

test('PHASE9: createSarcomere returns verified geometry, not a bare mesh spec', () => {
  const s = createSarcomere(model, { state: 'resting' });
  assert.equal(s.sarcomere_length_nm, 2200);
  assert.equal(s.structural_state, 'resting');
  // verifyScene runs the forbidden-transition rules; the API must not hand back a
  // scene that has not been checked against them.
  assert.ok(s.verification, 'scene must carry its verification report');
  // verifyScene reports `errors` (hard rule violations) and `notes` (declared
  // idealizations). Zero errors is the pass condition; notes are expected and are
  // themselves part of the honesty contract, so their presence is asserted too.
  assert.deepEqual(s.verification.errors, [],
    `forbidden-rule violations: ${JSON.stringify(s.verification.errors)}`);
  assert.ok(Array.isArray(s.verification.notes) && s.verification.notes.length > 0,
    'the scene must declare its idealizations rather than presenting them as exact');
});

test('PHASE9: the API passes model numbers through unchanged (no re-derivation)', () => {
  const sl = 2400;
  const direct = model.representation.backboneAt(sl);
  const viaApi = createTitinPath(model, { sarcomereLengthNm: sl });
  assert.equal(viaApi.segments.length, direct.segments.length);
  for (let i = 0; i < direct.segments.length; i += 1) {
    assert.equal(viaApi.segments[i].X_start, direct.segments[i].X_start,
      `segment ${i} X_start diverged — the facade re-derived instead of forwarding`);
    assert.equal(viaApi.segments[i].X_end, direct.segments[i].X_end,
      `segment ${i} X_end diverged — the facade re-derived instead of forwarding`);
  }
});

test('PHASE9: headless biological queries reject out-of-range lengths instead of mislabelling clamps', () => {
  for (const sl of [1600, 3200]) {
    for (const query of [createSarcomere, createTitin, createTitinPath]) {
      assert.throws(
        () => query(model, { sarcomereLengthNm: sl }),
        /outside the modelled range|never silently clamp/i,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// 2. uniform scaling cannot get in
// ---------------------------------------------------------------------------

test('PHASE9: placeDomainsAlongPath refuses explicit uniform-spacing arguments', () => {
  const path = createTitinPath(model, { sarcomereLengthNm: 2200 });
  for (const bad of [{ uniform: true }, { spacing_nm: 4.0 }, { count: 100 }]) {
    assert.throws(
      () => placeDomainsAlongPath(model, path, bad),
      /uniform|spacing|count/i,
      `must refuse ${JSON.stringify(bad)}`,
    );
  }
});

test('PHASE9: placeDomainsAlongPath refuses a rescaled path', () => {
  const path = createTitinPath(model, { sarcomereLengthNm: 2200 });
  // A caller stretches the whole path 1.3x but leaves the length label alone —
  // the classic uniform-scaling error.
  const rescaled = {
    ...path,
    segments: path.segments.map((s) => ({
      ...s, X_start: s.X_start * 1.3, X_end: s.X_end * 1.3,
    })),
  };
  assert.throws(() => placeDomainsAlongPath(model, rescaled), /does not match|fidelity/i);
});

test('PHASE9: placeDomainsAlongPath refuses an even redistribution that preserves the total', () => {
  const path = createTitinPath(model, { sarcomereLengthNm: 2200 });
  // The subtle attack: give each I-band region an equal share of the SAME I-band
  // span. The total is preserved exactly, so a check on total length alone would
  // pass this — but the Phase 8 force-balance partition is destroyed.
  const iband = path.segments.filter((s) => IBAND_REGIONS.includes(s.region_id));
  assert.ok(iband.length >= 2, 'need the I-band regions present to run this test');
  const lo = Math.min(...iband.map((s) => s.X_start));
  const hi = Math.max(...iband.map((s) => s.X_end));
  const each = (hi - lo) / iband.length;
  let cursor = lo;
  const even = new Map();
  for (const s of iband) {
    even.set(s.region_id, { X_start: cursor, X_end: cursor + each });
    cursor += each;
  }
  const flattened = {
    ...path,
    segments: path.segments.map((s) => (even.has(s.region_id)
      ? { ...s, ...even.get(s.region_id) } : s)),
  };
  const totalBefore = hi - lo;
  const ibAfter = flattened.segments.filter((s) => IBAND_REGIONS.includes(s.region_id));
  const totalAfter = Math.max(...ibAfter.map((s) => s.X_end))
    - Math.min(...ibAfter.map((s) => s.X_start));
  assert.ok(Math.abs(totalAfter - totalBefore) < 1e-9,
    'the attack must preserve the I-band total, else it is not the attack we mean to test');
  assert.throws(() => placeDomainsAlongPath(model, flattened), /does not match|fidelity/i);
});

test('PHASE9: the fidelity gate is not merely strict — sub-tolerance noise passes', () => {
  const path = createTitinPath(model, { sarcomereLengthNm: 2200 });
  const noisy = {
    ...path,
    segments: path.segments.map((s) => ({ ...s, X_end: s.X_end + PATH_FIDELITY_TOL_NM / 10 })),
  };
  const out = placeDomainsAlongPath(model, noisy);
  assert.ok(out.fidelity.worst_deviation_nm <= PATH_FIDELITY_TOL_NM,
    'round-trip noise must not be rejected, or the gate is unusable');
});

test('PHASE9: path fidelity requires complete ordered segments and actual control points', () => {
  const path = createTitinPath(model, { sarcomereLengthNm: 2200 });
  const partial = { ...path, segments: path.segments.slice(0, 1) };
  assert.throws(() => placeDomainsAlongPath(model, partial), /exactly|partial/i);

  const noPoints = { ...path, points: [] };
  assert.throws(() => placeDomainsAlongPath(model, noPoints), /control points/i);

  const shifted = {
    ...path,
    points: path.points.map((point) => ({ ...point, x: point.x + 99999 })),
  };
  assert.throws(() => placeDomainsAlongPath(model, shifted), /does not match|fidelity/i);

  const reordered = {
    ...path,
    segments: [path.segments[1], path.segments[0], ...path.segments.slice(2)],
  };
  assert.throws(() => placeDomainsAlongPath(model, reordered), /canonical biological order/i);
});

test('PHASE9: path placement rejects invalid and unknown options even when false or zero', () => {
  const path = createTitinPath(model, { sarcomereLengthNm: 2200 });
  for (const options of [
    { uniform: false }, { uniformSpacing: false }, { spacing_nm: 0 }, { count: 0 },
  ]) {
    assert.throws(() => placeDomainsAlongPath(model, path, options), /refused/i);
  }
  assert.throws(
    () => placeDomainsAlongPath(model, path, { regionId: 'not_a_region' }),
    /unknown region/i,
  );
  assert.throws(
    () => placeDomainsAlongPath(model, path, { includeAband: 'no' }),
    /must be boolean/i,
  );
  assert.throws(
    () => placeDomainsAlongPath(model, path, { mystery: true }),
    /unknown option/i,
  );
});

test('PHASE9: region extension stays non-uniform across the modelled range', () => {
  // The property the uniform-scaling prohibition protects. If every region grew by
  // the same factor, uniform scaling would be indistinguishable from the model and
  // the gate above would be pointless.
  const factors = {};
  for (const r of IBAND_REGIONS) {
    const at = (sl) => {
      const seg = createTitinPath(model, { sarcomereLengthNm: sl })
        .segments.find((s) => s.region_id === r);
      return seg ? seg.X_end - seg.X_start : null;
    };
    const lo = at(1900);
    const hi = at(3000);
    if (lo && hi && lo > 1e-9) factors[r] = hi / lo;
  }
  const vals = Object.values(factors);
  assert.ok(vals.length >= 2, `need >=2 measurable regions, got ${JSON.stringify(factors)}`);
  const spread = Math.max(...vals) / Math.min(...vals);
  assert.ok(spread > 2, `extension factors ${JSON.stringify(factors)} are near-uniform `
    + `(spread ${spread.toFixed(2)}x); the non-uniformity the model encodes is missing`);
});

// ---------------------------------------------------------------------------
// 3. interpolation is disclosed
// ---------------------------------------------------------------------------

test('PHASE9: defined keyframes are never labelled interpolated', () => {
  for (const p of model.presets()) {
    const d = describeLength(model, p.sarcomere_length_nm);
    assert.equal(d.interpolated, false, `${p.name} wrongly flagged interpolated`);
    assert.equal(d.structural_state, p.name);
    assert.equal(d.interpolation_caveat, null);
  }
});

test('PHASE9: every non-keyframe length carries a caveat naming its bracketing states', () => {
  for (const sl of [1950, 2100, 2350, 2500, 2900]) {
    const d = describeLength(model, sl);
    assert.equal(d.interpolated, true, `${sl} nm should be interpolated`);
    assert.ok(d.interpolation_caveat, `${sl} nm has no caveat`);
    assert.match(d.interpolation_caveat, /not directly measured molecular motion/);
    assert.ok(Array.isArray(d.between) && d.between.length === 2,
      `${sl} nm must name the two states it lies between`);
    const [lo, hi] = d.between;
    const names = model.presets().map((p) => p.name);
    assert.ok(names.includes(lo) && names.includes(hi),
      `bracketing states ${lo}/${hi} are not defined states`);
    assert.equal(d.structural_state, null,
      'an interpolated length must not claim to BE a structural state');
  }
});

test('PHASE9: describeLength refuses a non-finite length', () => {
  for (const bad of [NaN, Infinity, undefined, 'resting']) {
    assert.throws(() => describeLength(model, /** @type {any} */ (bad)), /finite/);
  }
});

// ---------------------------------------------------------------------------
// 4. ambiguity is refused rather than silently resolved
// ---------------------------------------------------------------------------

test('PHASE9: an explicit length and a named state together are refused', () => {
  // They can disagree, and silently preferring one would make the returned
  // geometry ambiguous about what it depicts.
  assert.throws(
    () => createTitin(model, { sarcomereLengthNm: 2300, state: 'resting' }),
    /both|either/i,
  );
});

test('PHASE9: an unknown structural state names the states that exist', () => {
  try {
    createTitin(model, { state: 'nonsense' });
    assert.fail('should have thrown');
  } catch (e) {
    for (const p of model.presets()) {
      assert.ok(e.message.includes(p.name), `error should list '${p.name}'`);
    }
  }
});

test('PHASE9: placeDomainsAlongPath refuses a path with no provenance', () => {
  // A hand-built path carries no record of the length it was derived at, so the
  // fidelity check cannot run and placement cannot be re-derived. Refuse rather
  // than guess a length.
  assert.throws(
    () => placeDomainsAlongPath(model, { segments: [{ region_id: 'PEVK', X_start: 0, X_end: 1 }] }),
    /sarcomere_length_nm|createTitinPath/i,
  );
});

// ---------------------------------------------------------------------------
// 5. region attribution
// ---------------------------------------------------------------------------

test('PHASE9: domain-to-region attribution prefers the longest matching id', () => {
  // regionId is positional; the chain is per-region, so attribution is checked
  // across every region rather than on one.
  const chain = { domains: model.representation.domainInstancesAt(2200).instances };
  assert.ok(chain.domains.length > 0, 'no domains placed');
  const known = new Set(model.representation.regions.map((r) => r.id));
  let attributed = 0;
  for (const d of chain.domains) {
    const r = regionOfDomain(model, d);
    if (r === null) continue;
    assert.ok(known.has(r), `attributed to unknown region '${r}'`);
    // The attribution must be a real prefix of the domain id, not a coincidence.
    assert.ok(d.domain_id === r || d.domain_id.startsWith(`${r}.`),
      `'${d.domain_id}' attributed to '${r}' which is not its prefix`);
    attributed += 1;
  }
  assert.ok(attributed > 0, 'no domain was attributed to any region');
});

// ---------------------------------------------------------------------------
// 6. component visibility — the isolated-titin view must really be isolated
// ---------------------------------------------------------------------------

test('PHASE9: every built object is owned by exactly one component', () => {
  // If two components claimed the same object, hiding one would hide the other;
  // if none claimed it, that object could never be hidden and an "isolated" view
  // would silently still draw it.
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(2200, { rings: 1 }), model.domainInstancesAt(2200), {
    domainBatches: model.instancingPlanAt(2200),
    contextDetail: model.contextDetailSceneAt(2200, { rings: 1 }),
    viewWidthNm: 400,
    viewportPx: 1200,
  });
  const structural = new Set([
    'sarcomere', 'half_sarcomere', 'half_sarcomere_mirrored', 'shared_across_halves',
  ]);
  /** @type {string[]} */
  const names = [];
  scene.root.traverse((o) => { if (o.name) names.push(o.name); });
  assert.ok(names.length > 10, 'scene looks empty');
  for (const n of new Set(names)) {
    if (structural.has(n)) continue;
    const owners = Object.entries(COMPONENTS).filter(([, p]) => p(n)).map(([k]) => k);
    assert.equal(owners.length, 1,
      `'${n}' is owned by ${owners.length} components (${owners.join(', ') || 'none'})`);
  }
});

test('PHASE9: hiding filaments does not move titin', () => {
  // The reason visibility is applied to the built tree rather than by rebuilding
  // from a reduced component set: titin's A-band segment is anchored relative to
  // the thick filament, so a re-derivation could move it.
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(2200, { rings: 1 }), model.domainInstancesAt(2200), {
    domainBatches: model.instancingPlanAt(2200), viewWidthNm: 400, viewportPx: 1200,
  });
  /** @param {SarcomereScene} s */
  const titinCoords = (s) => {
    /** @type {number[]} */
    const out = [];
    s.root.traverse((o) => {
      if (o.name && COMPONENTS.titin(o.name)) out.push(o.position.x, o.position.y, o.position.z);
    });
    return out;
  };
  const before = titinCoords(scene);
  scene.setComponentVisibility(
    Object.fromEntries(TitinVisualization.DETAIL_HIDDEN.map((c) => [c, false])),
  );
  assert.deepEqual(titinCoords(scene), before,
    'titin coordinates changed when other components were hidden');
});

test('PHASE9: the detail view hides all non-titin structure and keeps titin', () => {
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(2200, { rings: 1 }), model.domainInstancesAt(2200), {
    domainBatches: model.instancingPlanAt(2200),
    contextDetail: model.contextDetailSceneAt(2200, { rings: 1 }),
    viewWidthNm: 400,
    viewportPx: 1200,
  });
  const vis = Object.fromEntries(
    Object.keys(COMPONENTS).map((c) => [c, !TitinVisualization.DETAIL_HIDDEN.includes(c)]),
  );
  scene.setComponentVisibility(vis);
  /** @type {Record<string, {visible:number, hidden:number}>} */
  const tally = {};
  scene.root.traverse((o) => {
    if (!o.name) return;
    for (const [c, pred] of Object.entries(COMPONENTS)) {
      if (!pred(o.name)) continue;
      tally[c] ||= { visible: 0, hidden: 0 };
      tally[c][o.visible ? 'visible' : 'hidden'] += 1;
    }
  });
  for (const c of TitinVisualization.DETAIL_HIDDEN) {
    if (!tally[c]) continue; // that layer was not drawn at this zoom
    assert.equal(tally[c].visible, 0, `'${c}' still has visible objects in the detail view`);
  }
  assert.ok(tally.titin && tally.titin.visible > 0, 'the detail view must still show titin');
  assert.deepEqual(
    [...scene.hiddenComponents()].sort(),
    [...TitinVisualization.DETAIL_HIDDEN].sort(),
  );
});

test('PHASE9: an unknown component name is refused, not ignored', () => {
  // A silently-ignored name would let a caller believe a component was hidden
  // while it was still on screen.
  const scene = new SarcomereScene();
  // rings: 1 — a rings:0 patch has no complete triangles and the renderer refuses
  // it rather than miscount lattice sites, which would mask what this test checks.
  scene.build(model.contextSceneAt(2200, { rings: 1 }), model.domainInstancesAt(2200), {});
  assert.throws(() => scene.setComponentVisibility({ nonsense: false }), /unknown component/i);
  assert.throws(() => scene.setComponentVisibility({ Titin: false }), /unknown component/i);
});

test('PHASE9: setComponentVisibility before build is refused', () => {
  const fresh = new SarcomereScene();
  assert.throws(() => fresh.setComponentVisibility({ titin: false }), /nothing built/i);
});

// ---------------------------------------------------------------------------
// 7. scale vocabulary
// ---------------------------------------------------------------------------

test('PHASE9: the two scales the plan names are the two scales offered', () => {
  assert.deepEqual(Object.keys(SCALES).sort(), ['context', 'detail']);
  assert.equal(SCALES.context, 'context');
  assert.equal(SCALES.detail, 'detail');
});

test('PHASE9: DETAIL_HIDDEN names only real components and never hides titin', () => {
  const known = new Set(Object.keys(COMPONENTS));
  for (const c of TitinVisualization.DETAIL_HIDDEN) {
    assert.ok(known.has(c), `DETAIL_HIDDEN names unknown component '${c}'`);
  }
  assert.ok(!TitinVisualization.DETAIL_HIDDEN.includes('titin'),
    'the titin detail view cannot hide titin');
  assert.ok(!TitinVisualization.DETAIL_HIDDEN.includes('titin_domains'),
    'the titin detail view is the one place domains must be visible');
});

test('PHASE9: detail scale invariants cannot be overridden through build options', () => {
  const fake = { _displayOptions: {} };
  const options = TitinVisualization.prototype._optsForScale.call(fake, SCALES.detail, {
    buildOpts: { showLattice: true, showDomains: false, showContextDetail: true },
  });
  assert.equal(options.showLattice, false);
  assert.equal(options.showDomains, true);
  assert.equal(options.showContextDetail, false);
});

test('PHASE9: a user visibility preference cannot leak filaments into detail scale', () => {
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(2200, { rings: 1 }), model.domainInstancesAt(2200), {});
  const facade = Object.create(TitinVisualization.prototype);
  facade.scale = SCALES.detail;
  facade.viewer = { sarcomere: scene };
  facade._userVisibility = { thick_filament: true, thin_filament: true };
  TitinVisualization.prototype._applyScaleVisibility.call(facade);
  assert.ok(scene.hiddenComponents().includes('thick_filament'));
  assert.ok(scene.hiddenComponents().includes('thin_filament'));
});

test('PHASE9: annotations carry anchors, evidence, sources, and Three.js markers', () => {
  for (const scale of Object.values(SCALES)) {
    const annotations = createAnnotations(model, 2200, { scale });
    assert.ok(annotations.length >= 4, `${scale} annotations missing`);
    for (const annotation of annotations) {
      assert.ok(annotation.label && annotation.target_id);
      assert.ok(Number.isFinite(annotation.anchor_nm.x));
      assert.ok(EVIDENCE_CLASSES.includes(annotation.evidence_class));
      assert.ok(annotation.sources.length > 0, `${annotation.id} has no source`);
      assert.ok(Array.isArray(annotation.not_claimed));
    }
  }

  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(2200, { rings: 1 }), model.domainInstancesAt(2200), {});
  const annotations = createAnnotations(model, 2200, { scale: SCALES.context });
  const group = scene.setAnnotations(annotations);
  assert.equal(group.children.length, annotations.length);
  assert.equal(scene.manifest.annotations.count, annotations.length);
  for (const marker of group.children) assert.ok(marker.userData.annotation);
});

test('PHASE9: index.html consumes the biological visualization facade', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /import \{ TitinVisualization, SCALES \} from '\.\/src\/api\/TitinVisualization\.js'/);
  assert.match(html, /TitinVisualization\.create/);
  assert.doesNotMatch(html, /new Viewer\s*\(/,
    'the page must not bypass the facade by constructing the low-level viewer');
});

test('PHASE9: index.html visibly consumes the interpolation caveat', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="stateCaveat"/,
    'the page needs a dedicated visible interpolation disclosure');
  assert.match(html, /report\.clamp_note\s*\|\|\s*report\.interpolation_caveat/,
    'render() must consume the facade caveat instead of discarding it');
  assert.match(html, /caveat\.textContent\s*=\s*disclosure/,
    'disclosure must be written as visible text');
});

test('PHASE9: isolated-titin scale cannot retain a context-only close-up claim', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /state\.scale\s*=\s*scale;\s*state\.closeup\s*=\s*null/,
    'switching scale must clear the selected context landmark');
  assert.match(html, /syncCloseups\(null\)/,
    'switching scale must also clear the visible close-up readout');
  assert.match(html, /\$\('closeups'\)\.children\)\s*b\.disabled\s*=\s*detail/,
    'context-only close-up controls must be disabled in isolated-titin scale');
  assert.match(html, /hiddenComponents[\s\S]*?k\.startsWith\(`\$\{component\}\.\`\)/,
    'the evidence panel must omit components hidden by the active scale');
  assert.match(html, /state\.scale\s*===\s*SCALES\.detail[\s\S]*?titin\|domain\|catmullrom/i,
    'the isolated-scale non-claims must describe titin rather than hidden context geometry');
});

// ---------------------------------------------------------------------------
// The page must not restate the evidence vocabulary.
//
// index.html previously hardcoded a five-class list that predated MODELED, so a
// modelled claim silently displayed as UNKNOWN — four rungs weaker than the truth.
// This gate makes that defect class impossible to reintroduce in the page.
// ---------------------------------------------------------------------------
test('PHASE9: index.html imports the evidence vocabulary instead of restating it', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /import \{[^}]*EVIDENCE_CLASSES[^}]*\} from '\.\/src\/model\/SpecLoader\.js'/,
    'the page must import EVIDENCE_CLASSES from the loader');

  // No array literal in the page may enumerate evidence classes.
  const literals = html.match(/\[[^\][]*'(?:MEASURED|UNKNOWN|SCHEMATIC|INFERRED|MODELED)'[^\][]*\]/g) || [];
  assert.deepEqual(literals, [],
    `the page restates the evidence vocabulary: ${JSON.stringify(literals)}`);

  // Every class in the canonical ladder must have a render style, or the panel
  // would draw a real class with no colour.
  const missing = EVIDENCE_CLASSES.filter((c) => !(c in EVIDENCE_STYLE));
  assert.deepEqual(missing, [], `evidence classes with no render style: ${missing}`);
});

test('PHASE9: all seven plan-named API entry points exist', () => {
  // The plan names these exactly; a rename would silently break the documented
  // biological vocabulary even while tests on internals kept passing.
  for (const n of ['createSarcomere', 'createTitin', 'createTitinPath',
    'createDomainChain', 'placeDomainsAlongPath']) {
    assert.equal(typeof api[n], 'function', `titinApi must export ${n}`);
  }
  for (const n of ['setSarcomereLength', 'setStructuralState']) {
    assert.equal(typeof TitinVisualization.prototype[n], 'function',
      `TitinVisualization must implement ${n}`);
  }
});


// ---------------------------------------------------------------------------
// The page must fail LOUDLY.
//
// Reported symptom: "index.html doesn't show anything besides the legend and
// slider." That is the exact signature of the module never executing — the panel
// headings and the range input are static markup, so they render with zero JS,
// while the canvas and every JS-filled container stay empty. The module's own
// fail() writes into #err, which is unreachable when the module never starts.
//
// The two commonest causes are opening the page as a file:// URL (which blocks both
// ES module resolution and the fetch() of data/*.json) and serving from the wrong
// directory (404s on ./data and ./node_modules). Both previously produced a blank
// page whose only explanation was in the devtools console.
// ---------------------------------------------------------------------------
test('PHASE9: the page reports boot failure visibly, not only to the console', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  // The diagnostic must be a CLASSIC script. A module cannot report its own
  // failure to load, so putting the watchdog in one would defeat its purpose.
  const classic = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
  const boot = classic.find((s) => s.includes('__titinBoot'));
  assert.ok(boot, 'the boot diagnostic must live in a classic (non-module) script');

  assert.match(boot, /location\.protocol\s*===\s*'file:'/,
    'it must detect the file:// case, which blocks modules and fetch outright');
  assert.match(boot, /getElementById\('err'\)/,
    'it must write into the visible #err box, not just the console');
  assert.match(boot, /addEventListener\('error'[\s\S]*?true\)/,
    'module resolution failures need a capture-phase listener; they do not bubble');
  assert.match(boot, /unhandledrejection/,
    'a rejected fetch of the spec must also surface');
  assert.match(boot, /http\.server|npm run serve/,
    'the message must tell the reader how to serve the page correctly');

  // The watchdog must be armed by a success signal, or it fires on a healthy page.
  // A false alarm in an error channel teaches the reader to ignore it.
  assert.match(html, /window\.__titinBoot\.ready\s*=\s*true/,
    'the module must signal success so the watchdog does not false-alarm');
  // Guarded, not bare: if the classic script were blocked (strict CSP), a bare
  // assignment would throw at the end of an otherwise-working page.
  assert.match(html, /if \(window\.__titinBoot\) window\.__titinBoot\.ready = true/,
    'the success signal must not throw when the diagnostic script is absent');
  const readyAt = html.indexOf('__titinBoot.ready = true');
  const startAt = html.indexOf('visualization.start(');
  assert.ok(readyAt > startAt,
    'the success signal must come AFTER the render loop starts, or it would mask a '
    + 'failure in start() itself');

  // #err must be able to show. It is display:none until a failure sets it.
  assert.match(html, /#err\s*\{[^}]*display:\s*none/,
    '#err is hidden until something goes wrong');
  assert.ok(html.indexOf('id="err"') > -1, 'the #err box must exist in the markup');
});

test('PHASE9: package.json documents how to serve the page', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(pkg.scripts.serve, 'a serve script makes the correct invocation discoverable');
  // Serving from the project root is the point: ./data and ./node_modules must resolve.
  assert.match(pkg.scripts.serve, /http\.server|serve|vite|http-server/,
    'serve must start a static HTTP server');
});

// ---------------------------------------------------------------------------
// The boot diagnostic must WORK, not merely be present.
//
// The gate above checks the page's source text. That is not the same as checking
// behaviour: a diagnostic that is present but never fires, or one that fires on a
// healthy page, would both pass a text check while being useless or harmful. So the
// classic script is extracted and EXECUTED against a minimal fake DOM under the
// three scenarios that matter.
// ---------------------------------------------------------------------------
test('PHASE9: the boot diagnostic fires on failure and stays silent on success', () => {

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const boot = (html.match(/<script>([\s\S]*?)<\/script>/g) || []).find(function (s) { return s.includes('__titinBoot'); })
  .replace(/^<script>/, '').replace(/<\/script>$/, '');

function fakeDom(protocol) {
  const err = { style: { display: 'none' }, textContent: '' };
  const listeners = {}; const domListeners = [];
  const ctx = {
    location: { protocol },
    document: {
      getElementById: function (id) { if (id === 'err') { return err; } return null; },
      addEventListener: function (ev, fn) { if (ev === 'DOMContentLoaded') { domListeners.push(fn); } },
    },
    window: null,
    setTimeout: function (fn, ms) { ctx.__timer = { fn: fn, ms: ms }; return 1; },
    addEventListener: function (ev, fn) { if (!listeners[ev]) { listeners[ev] = []; } listeners[ev].push(fn); },
  };
  ctx.window = ctx;
  return { ctx: ctx, err: err, domListeners: domListeners, listeners: listeners };
}

function run(protocol, finishModule, timerFires) {
  const d = fakeDom(protocol);
  new Function('window', 'document', 'location', 'setTimeout', boot)(
    d.ctx, d.ctx.document, d.ctx.location, d.ctx.setTimeout);
  (d.listeners.error || []).forEach(function (fn) {
    fn({ target: { src: './node_modules/three/build/three.module.js' } });
  });
  d.domListeners.forEach(function (fn) { fn(); });
  if (finishModule) { d.ctx.window.__titinBoot.ready = true; }
  if (timerFires && d.ctx.__timer) { d.ctx.__timer.fn(); }
  return { shown: d.err.style.display === 'block', text: d.err.textContent, timer: d.ctx.__timer };
}
  // 1. file:// — blocks ES modules and fetch(); nothing can run.
  const fileUrl = run('file:', false, false);
  assert.ok(fileUrl.shown, 'a file:// page must show a visible explanation');
  assert.match(fileUrl.text, /file:\/\/ URL/, 'it must name the actual cause');
  assert.match(fileUrl.text, /http\.server|npm run serve/, 'it must give the remedy');

  // 2. http:// but a subresource 404s — served from the wrong directory.
  const missing = run('http:', false, true);
  assert.ok(missing.shown, 'a page whose module never finished must say so');
  assert.match(missing.text, /three\.module\.js/,
    'the failed resource must be named, or the reader cannot act on it');

  // 3. Healthy page. The watchdog MUST NOT fire — a false alarm in an error channel
  //    is as damaging as a missed one, because it trains the reader to ignore it.
  const healthy = run('http:', true, true);
  assert.equal(healthy.shown, false,
    'the diagnostic must stay silent when the module completes');
  assert.ok(healthy.timer.ms >= 3000,
    'the watchdog must allow time for the async spec fetch before concluding failure');
});

// ---------------------------------------------------------------------------
// describeLength takes a bare number while its neighbours take options objects.
// Found during the session-11 review by passing {state} to it, as every adjacent
// function accepts. The asymmetry is intentional (it answers a question about a
// length rather than building geometry at one), so the DIAGNOSTIC must carry the
// fix — '[object Object]' tells the caller nothing.
// ---------------------------------------------------------------------------
test('PHASE9: describeLength explains the options-object mistake instead of printing [object Object]', () => {
  assert.throws(
    () => describeLength(model, /** @type {any} */ ({ state: 'resting' })),
    (e) => {
      assert.ok(!/\[object Object\]\s*$/.test(e.message),
        'the message must not end at [object Object]');
      assert.match(e.message, /bare number, not an options object/);
      assert.match(e.message, /resolveLength/, 'it must name the function that converts');
      return true;
    },
  );
  assert.throws(
    () => describeLength(model, /** @type {any} */ ({ sarcomereLengthNm: 2200 })),
    /sarcomereLengthNm/,
    'passing {sarcomereLengthNm} should point at the field to unwrap');
  // The documented number form must keep working unchanged.
  const d = describeLength(model, 2200);
  assert.equal(d.sarcomere_length_nm, 2200);
});
