/** SC-12 gates: the didactic controls are on the stage, in both audience modes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SWEEP, sweepLength } from '../src/presentation/StretchSweep.js';
import { GUIDED_COMPONENT_COLOR, COMPONENT_COLOR } from '../src/render/SarcomereScene.js';

const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');

const between = (startId, endMarker) => {
  const start = page.indexOf(`id="${startId}"`);
  assert.ok(start > -1, `${startId} is missing`);
  const end = page.indexOf(endMarker, start);
  assert.ok(end > -1, `${endMarker} after ${startId} is missing`);
  return [start, end];
};

test('SC12: the primary controls live on the stage, not in the drawer', () => {
  const [barStart, barEnd] = between('stageBar', '</div><!-- /stageBar -->');
  for (const id of ['sl', 'presets', 'views', 'stagePlay', 'filamentContextToggle']) {
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
  for (const id of ['scales', 'closeups', 'toggles', 'components', 'regions',
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
  assert.match(page, /outside_working_range[\s\S]{0,220}sweepRange/,
    'the sweep bounds must be filtered by the reviewed working range');
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
