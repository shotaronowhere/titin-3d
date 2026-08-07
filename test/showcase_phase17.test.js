/** SC-17 gates: the showcase is legible from the back of a room. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';

const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const model = await TitinModel.create(nodeReader());

test('SC17: a presentation text scale exists and is user-controlled', () => {
  assert.match(page, /<button id="textScale"[^>]*aria-pressed="false"/);
  assert.match(page, /data-text-scale="large"/);
});

test('SC17: no shipped rule is smaller than 9 px, and large mode floors at 12 px', () => {
  const sizes = [...page.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((hit) => Number(hit[1]));
  assert.ok(sizes.length > 10);
  assert.ok(Math.min(...sizes) >= 9, `smallest shipped font-size is ${Math.min(...sizes)}px`);
  assert.match(page, /\[data-text-scale="large"\][\s\S]{0,600}font-size: 1[2-9]px/);
});

test('SC17: every declared presenter shortcut is bound to a key', () => {
  const shortcuts = model.spec.presentation.presenter_shortcuts;
  assert.ok(shortcuts.length >= 3);
  assert.match(page, /const PRESENTER_KEYS/);
  for (const shortcut of shortcuts) {
    assert.ok(page.includes(shortcut.action),
      `presenter shortcut '${shortcut.id}' declares action '${shortcut.action}' that nothing binds`);
  }
  // Stronger than the presence check above, which a stray mention in a comment
  // would satisfy: the letter map is keyed by ACTION, so every action the record
  // declares has to appear in the map itself.
  const map = page.match(/const PRESENTER_KEY_BY_ACTION = Object\.freeze\(\{([\s\S]*?)\}\)/);
  assert.ok(map, 'the key map must be declared literally, not assembled at runtime');
  for (const shortcut of shortcuts) {
    assert.ok(map[1].includes(`'${shortcut.action}'`),
      `presenter shortcut '${shortcut.id}' has no letter in PRESENTER_KEY_BY_ACTION`);
  }
  // Digits step the guided route; a bare letter must not fire while typing.
  assert.match(page, /event\.target instanceof HTMLInputElement/);
  assert.match(page, /event\.metaKey \|\| event\.ctrlKey \|\| event\.altKey/);
  // Nor may it steal a key the stage's own keyboard route has already handled.
  assert.match(page, /event\.defaultPrevented/);
});

test('SC17: the shortcuts are discoverable, not folklore', () => {
  assert.match(page, /id="shortcutHelp"/);
  const help = page.match(/id="shortcutHelp"[^>]*>([\s\S]*?)<\/span>/);
  assert.ok(help, 'the help line must carry the key list');
  const bound = [...page.matchAll(/'[a-z._]+': '([a-z])',/g)].map((hit) => hit[1]);
  assert.ok(bound.length >= 3);
  for (const key of [...bound, 'g']) {
    assert.match(help[1], new RegExp(`(^|\\s)${key}\\s`),
      `the on-canvas help does not name the '${key}' key`);
  }
  assert.match(help[1], /space/);
});

test('SC17: the page names titin one colour', () => {
  const chapter = model.spec.presentation.guided_chapters
    .find((entry) => entry.id === 'orientation');
  assert.ok(!/\bin red\b/.test(chapter.lay_summary),
    'titin is #ff5d7d — pink — everywhere else in the copy');
  assert.match(chapter.lay_summary, /\bpink\b/);
  // The page quoted that sentence back in a comment; a fixed word in one place
  // and the old word in the other is the same drift with an extra hop.
  assert.ok(!page.includes('shown in red'),
    'the page still quotes the superseded copy');
});
