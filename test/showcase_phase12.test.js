/** SC-12 gates: the didactic controls are on the stage, in both audience modes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SWEEP, sweepLength } from '../src/presentation/StretchSweep.js';
import { GUIDED_COMPONENT_COLOR, COMPONENT_COLOR } from '../src/render/SarcomereScene.js';
import { labelBudget, locatorExtent, bracketLaneVisible } from '../src/presentation/StageLayout.js';
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';

const model = await TitinModel.create(nodeReader());
const annotations = JSON.parse(
  readFileSync(new URL('../data/annotations.json', import.meta.url), 'utf8'),
);

const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');

const between = (startId, endMarker) => {
  const start = page.indexOf(`id="${startId}"`);
  assert.ok(start > -1, `${startId} is missing`);
  const end = page.indexOf(endMarker, start);
  assert.ok(end > -1, `${endMarker} after ${startId} is missing`);
  return [start, end];
};

test('SC12/SC24: compact semantic primary controls live on the stage', () => {
  const [barStart, barEnd] = between('stageBar', '</div><!-- /stageBar -->');
  for (const id of [
    'sl', 'stagePlay', 'stageReset', 'sceneControls', 'sceneDetailsToggle', 'stageMore',
  ]) {
    const at = page.indexOf(`id="${id}"`);
    assert.ok(at > barStart && at < barEnd, `${id} must be inside the stage bar`);
  }
});

test('SC12: the stage bar is visible in both audience modes', () => {
  assert.ok(!/#app\[data-mode="evidence"\] #stageBar \{ display: none/.test(page),
    'the stage bar must not be hidden in Evidence mode');
  assert.ok(!/#app\[data-mode="guided"\] #stageBar \{ display: none/.test(page),
    'the stage bar must not be hidden in Guided mode');
});

test('SC12: the readouts stay in the Evidence drawer', () => {
  const drawerStart = page.indexOf('id="panel"');
  const drawerEnd = page.indexOf('</aside>', drawerStart);
  for (const id of ['scales', 'views', 'closeups', 'toggles', 'components', 'regions',
    'metrics', 'legend', 'evidence', 'annotations', 'notClaimed', 'notes']) {
    const at = page.indexOf(`id="${id}"`);
    assert.ok(at > drawerStart && at < drawerEnd, `${id} must remain in the drawer`);
  }
});

test('SC12: Guided mode carries an on-canvas legend', () => {
  assert.match(page, /id="stageLegend"/);
  assert.match(page, /function syncStageLegend/);
});

test('SC12: every stage control is a real, labelled button or input', () => {
  assert.match(page, /<button id="stagePlay"[^>]*aria-pressed="false"/);
  assert.match(page, /id="sl"[^>]*step="1"[^>]*aria-label=/);
  const tabindexes = [...page.matchAll(/tabindex="(-?\d+)"/g)].map((hit) => Number(hit[1]));
  assert.ok(tabindexes.every((value) => value <= 0));
});

// ---------------------------------------------------------------------------
// Task 12.2 — the stretch sweep
// ---------------------------------------------------------------------------

test('SC12: the sweep is a closed triangle between the two working-range ends', () => {
  const bounds = { minNm: 2000, maxNm: 2400, periodMs: 6000 };
  assert.equal(sweepLength(0, bounds), 2000);
  assert.equal(sweepLength(3000, bounds), 2400);
  assert.equal(sweepLength(6000, bounds), 2000);
  assert.equal(sweepLength(9000, bounds), 2400);      // second cycle
  assert.equal(sweepLength(-3000, bounds), 2400);     // negative time is defined
});

test('SC12: the sweep is monotone on each limb and always an integer', () => {
  const bounds = { minNm: 2000, maxNm: 2400, periodMs: 6000 };
  let previous = -Infinity;
  for (let t = 0; t <= 3000; t += 100) {
    const value = sweepLength(t, bounds);
    assert.equal(Number.isInteger(value), true);
    assert.ok(value >= previous, `not monotone at ${t} ms`);
    previous = value;
  }
});

test('SC12: a non-positive period is rejected rather than dividing by zero', () => {
  assert.throws(() => sweepLength(0, { minNm: 2000, maxNm: 2400, periodMs: 0 }),
    /periodMs must be positive/);
});

test('SC12: the page refuses to autoplay and honours reduced motion', () => {
  assert.match(page, /prefersReducedMotion[\s\S]{0,400}stagePlay/,
    'reduced motion must disable or shorten the sweep');
  assert.ok(!/stagePlay[\s\S]{0,200}\.click\(\)/.test(page), 'the sweep must never start itself');
});

test('SC12: the sweep stays inside the declared working range', () => {
  // The 1,900 nm and 3,000 nm presets are declared outside the working range;
  // sweeping through them would animate as ordinary physiology something the
  // presentation record explicitly says is not.
  assert.match(page,
    /sweepRange\s*=\s*\{[\s\S]{0,180}presentation\.scope\.working_range_nm\[0\][\s\S]{0,100}presentation\.scope\.working_range_nm\[1\]/,
    'the sweep bounds must consume the reviewed working range directly');
  assert.equal(SWEEP.reduced_motion_period_ms < SWEEP.period_ms, true);
});

// ---------------------------------------------------------------------------
// Task 12.2a — actin and myosin separable by luminance, not hue alone
// ---------------------------------------------------------------------------

const relLum = (hex) => {
  const c = [16, 8, 0].map((s) => ((hex >> s) & 255) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const BG = 0x0e1116;

test('SC12-2a: the two filament families are separable by luminance alone', () => {
  // Luminance, not hue: this then holds in grayscale and under every CVD simulation.
  assert.ok(ratio(GUIDED_COMPONENT_COLOR.thin_filament, GUIDED_COMPONENT_COLOR.thick_filament) >= 1.7,
    'actin and myosin must not be the same brightness');
  assert.ok(ratio(GUIDED_COMPONENT_COLOR.thin_filament, GUIDED_COMPONENT_COLOR.myosin_head) >= 1.7,
    'actin and the head array must not be the same brightness');
});

test('SC12-2a: context stays visible without competing with titin', () => {
  for (const role of ['thick_filament', 'thin_filament', 'myosin_head']) {
    assert.ok(ratio(GUIDED_COMPONENT_COLOR[role], BG) >= 1.9,
      `${role} must separate from the stage on a projector`);
    assert.ok(ratio(GUIDED_COMPONENT_COLOR[role], BG) <= ratio(COMPONENT_COLOR.titin, BG) / 1.8,
      `${role} must stay well below titin — the subject keeps the top of the range`);
  }
});

// ---------------------------------------------------------------------------
// Task 12.2b — the declared attention budget, enforced against the render
// ---------------------------------------------------------------------------

const budget = model.spec.showcaseClaims.attention_budget;

// The numbers come from the reviewed record, so this test cannot drift from it —
// and cannot be satisfied by hard-coding a number in the layout module either.
test('SC12-2b: the drawn label set obeys the reviewed budget', () => {
  const candidates = ['zdisc', 'iband', 'aband_half', 'czone', 'bare_zone', 'mband_center']
    .map((id, i) => ({ id, priority: i, x: i * 40 }));
  assert.ok(labelBudget(candidates, 'desktop', budget).length
    <= budget.guided_secondary_context_labels_desktop_max);
  assert.ok(labelBudget(candidates, 'mobile', budget).length
    <= budget.guided_secondary_context_labels_mobile_max);
});

test('SC12-2b: it drops the lowest priority first, never the anchor in view', () => {
  const candidates = [
    { id: 'aband_half', priority: 1, x: 300 },
    { id: 'bare_zone', priority: 3, x: 700 },
    { id: 'iband', priority: 2, x: 120 },
  ];
  const kept = labelBudget(candidates, 'mobile', budget).map((c) => c.id);
  assert.deepEqual(kept, ['aband_half', 'iband']);
});

test('SC12-2b: Evidence mode is not subject to the guided budget', () => {
  const candidates = Array.from({ length: 6 }, (_, i) => ({ id: `b${i}`, priority: i, x: i * 40 }));
  assert.equal(labelBudget(candidates, 'desktop', budget, { audience: 'evidence' }).length, 6);
});

test('SC12-2b: a label that would collide with a kept one is dropped, not overlapped', () => {
  // The occlusion_rule the same record declares: "hide a lower-priority label
  // before allowing overlap". Two labels 12 px apart cannot both be drawn.
  const kept = labelBudget([
    { id: 'iband', priority: 1, x: 400 },
    { id: 'aband_half', priority: 2, x: 412 },
  ], 'desktop', budget).map((c) => c.id);
  assert.deepEqual(kept, ['iband']);
});

test('SC12-2b: a budget record without its declared keys is refused, not guessed', () => {
  // Silently treating a missing budget as "unlimited" is how a reviewed
  // declaration stops constraining anything.
  assert.throws(() => labelBudget([{ id: 'a', priority: 0, x: 0 }], 'desktop', {}),
    /attention budget/i);
  assert.throws(() => labelBudget([{ id: 'a', priority: 0, x: 0 }], 'phablet', budget),
    /viewport class/i);
});

test('SC12-2b: the page enforces the budget it reads from the claims record', () => {
  assert.match(page, /labelBudget\(/, 'the overlay must run its candidates through the budget');
  assert.match(page, /showcaseClaims\.attention_budget/,
    'the budget must be READ from the reviewed record, never restated in the page');
  assert.ok(!/guided_secondary_context_labels_desktop_max:\s*\d/.test(page),
    'the page must not restate the budget numbers');
});

// ---------------------------------------------------------------------------
// Task 12.2c — a locator for close-ups, in the lane the brackets vacate
// ---------------------------------------------------------------------------

test('SC12-2c: the locator and the brackets are never both drawn', () => {
  for (const span of [1100, 800, 400, 200, 70, 20]) {
    const loc = locatorExtent(span, 550, 1100);
    assert.notEqual(loc.visible, bracketLaneVisible(span, 1100),
      `at a ${span} nm camera span exactly one of locator/brackets must hold the lane`);
  }
});

test('SC12-2c: the shaded extent is the camera span, to scale', () => {
  const loc = locatorExtent(220, 110, 1100);
  assert.ok(Math.abs((loc.to01 - loc.from01) - 220 / 1100) < 1e-9);
  assert.ok(Math.abs(loc.from01 - 0) < 1e-9);
});

test('SC12-2c: a view wider than the model clamps instead of overflowing', () => {
  const loc = locatorExtent(4000, 550, 1100);
  assert.equal(loc.from01, 0);
  assert.equal(loc.to01, 1);
});

test('SC12-2c: a stage with no measurable span draws no locator', () => {
  // Same discipline as the scale bar: a locator claiming a wrong extent is
  // worse than no locator.
  for (const bad of [null, 0, -1, NaN, Infinity]) {
    assert.equal(locatorExtent(bad, 550, 1100).visible, false);
    assert.equal(locatorExtent(220, 110, bad).visible, false);
    assert.equal(bracketLaneVisible(bad, 1100), false);
  }
});

test('SC12-2c: the locator follows the camera along the model', () => {
  const near = locatorExtent(200, 100, 1100);
  const far = locatorExtent(200, 1000, 1100);
  assert.ok(far.from01 > near.from01 && far.to01 > near.to01);
  // A camera at the far end cannot shade past the end of the model.
  assert.ok(far.to01 <= 1 && near.from01 >= 0);
});

test('SC12-2c: the page draws the locator only in the lane the brackets vacate', () => {
  assert.match(page, /locatorExtent\(/);
  assert.match(page, /bracketLaneVisible\(/);
  // One decision, used twice: the two cannot disagree about who holds the lane.
  assert.match(page, /const laneHoldsBrackets = [\s\S]{0,200}bracketLaneVisible\(/);
  assert.match(page, /if \(showBands && laneHoldsBrackets\)/);
  assert.match(page, /if \(!laneHoldsBrackets/);
});

test('SC12-2c: the stage declares the locator as presentation geometry', () => {
  const meaning = annotations.meta.stage_render_meaning;
  assert.match(meaning, /locator/i);
  assert.match(meaning, /camera/i);
});
