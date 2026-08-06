/** SC-12 gates: the didactic controls are on the stage, in both audience modes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
