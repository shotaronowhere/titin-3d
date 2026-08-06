/** SC-13 gates: reading order, disclosure, and where sources sit. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');

test('SC13: specialist depth is disclosed, not dumped', () => {
  assert.match(page, /<details id="objectInspectorDetails"/);
  assert.match(page, /<summary[^>]*>For specialists<\/summary>/);
  // Evidence mode opens it; Guided leaves it closed.
  assert.match(page, /objectInspectorDetails'\)\.open = state\.audienceMode === AUDIENCE_MODES\.evidence/);
});

test('SC13: the card reads lay text before detail and citations last', () => {
  const order = ['objectInspectorTitle', 'objectInspectorEvidence', 'objectInspectorLay',
    'objectInspectorDetails', 'objectInspectorSources'];
  const positions = order.map((id) => page.indexOf(`id="${id}"`));
  assert.ok(positions.every((value) => value > -1), `missing: ${order[positions.indexOf(-1)]}`);
  for (let i = 1; i < positions.length; i += 1) {
    assert.ok(positions[i] > positions[i - 1], `${order[i]} must follow ${order[i - 1]}`);
  }
});

test('SC13: citations are one compact line, not a stack of full-width links', () => {
  assert.match(page, /\.object-sources \{[^}]*font-size: 9px/);
  assert.match(page, /Sources: /);
});

test('SC13: the card is placed by the tested layout function', () => {
  assert.match(page, /inspectorPlacement\(\{/);
  assert.ok(!/let left = point\.x_px < width \/ 2 \? point\.x_px \+ gap/.test(page),
    'the ad-hoc placement arithmetic must be gone');
});

test('SC13: the chapter card names the selection instead of repeating it', () => {
  assert.match(page, /guidedSelectionText'\)\.textContent = ''/,
    'the duplicated lay paragraph in the guided card must go');
});

test('SC13: the card can step between structures with the pointer', () => {
  assert.match(page, /<button id="objectInspectorPrevious"/);
  assert.match(page, /<button id="objectInspectorNext"/);
});

test('SC13: the drawer is tabbed and sources come last', () => {
  const ids = ['tabInspect', 'tabMeasure', 'tabEvidence', 'tabSources'];
  const positions = ids.map((id) => page.indexOf(`id="${id}"`));
  assert.ok(positions.every((value) => value > -1));
  for (let i = 1; i < positions.length; i += 1) {
    assert.ok(positions[i] > positions[i - 1], `${ids[i]} must follow ${ids[i - 1]}`);
  }
  assert.match(page, /<div id="drawerTabs" role="tablist"/);
  for (const id of ids) {
    assert.match(page, new RegExp(`<button id="${id}"[^>]*role="tab"`));
  }
});

test('SC13: opening the drawer lands on controls, not on an essay', () => {
  assert.match(page, /state\.drawerTab = 'inspect'/,
    'the default tab must be the one with the controls on it');
  const inspect = page.indexOf('id="panelInspect"');
  const evidence = page.indexOf('id="panelEvidence"');
  assert.ok(inspect < evidence);
  const scales = page.indexOf('id="scales"');
  assert.ok(scales > inspect && scales < evidence, 'the scale control belongs on the Inspect tab');
});

test('SC13: an empty selection hides its heading instead of leaving it dangling', () => {
  assert.match(page, /selectedStructureHeading'\)\.hidden = !annotation/);
});
