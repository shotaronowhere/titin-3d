/** SC-17 gates: the showcase is legible from the back of a room. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { COMPONENT_COLOR, GUIDED_COMPONENT_COLOR } from '../src/render/SarcomereScene.js';
import {
  PRESENTER_KEY_BY_ACTION, STAGE_KEYS, presenterKeyGuide, presenterKeys, unboundShortcutIds,
} from '../src/presentation/PresenterKeys.js';

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
  assert.match(page, /const PRESENTER_KEYS = presenterKeys\(presentation\)/,
    'the page must resolve its keys from the shared module, not restate them');
  // The map is keyed by ACTION, so every action the record declares has to
  // resolve to a key. Asserted against the module rather than against the
  // page's source text: a grep for the action string would be satisfied by a
  // mention in a comment, and would fail on a page that binds correctly through
  // an import — which is exactly what this one does.
  assert.deepEqual(unboundShortcutIds(model.spec.presentation), [],
    'every declared shortcut must have a letter in PRESENTER_KEY_BY_ACTION');
  const bound = presenterKeys(model.spec.presentation);
  for (const shortcut of shortcuts) {
    assert.equal(bound[PRESENTER_KEY_BY_ACTION[shortcut.action]], shortcut.action,
      `presenter shortcut '${shortcut.id}' declares action '${shortcut.action}' that nothing binds`);
  }
  // And the page must actually DO each action it resolves, not merely hold it.
  for (const action of new Set(Object.values(bound))) {
    const verb = action.startsWith('story.') ? "action.startsWith('story.')" : `action === '${action}'`;
    assert.ok(page.includes(verb), `nothing in the page acts on '${action}'`);
  }
  // The two stage verbs the record does not declare are bound as well, and no
  // key is claimed twice.
  for (const { key, action } of STAGE_KEYS) assert.equal(bound[key], action);
  assert.equal(new Set(Object.keys(bound)).size,
    shortcuts.length + STAGE_KEYS.length,
    'two actions must not compete for one key');
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
  // Every key the page binds is named on the stage — including the two the
  // record does not declare, which are otherwise discoverable nowhere.
  for (const key of Object.keys(presenterKeys(model.spec.presentation))) {
    const written = key === ' ' ? 'space' : key;
    assert.match(help[1], new RegExp(`(^|\\s)${written}\\s`),
      `the on-canvas help does not name the '${written}' key`);
  }
  assert.match(help[1], /1–7 chapters/);
});

test('SC17: the printed script names the keys the page binds', () => {
  // A handout that lists a key the page does not bind fails at a lectern rather
  // than in CI, so the release pack resolves the keys from the same module the
  // page does instead of restating them.
  const guide = presenterKeyGuide(model.spec.presentation);
  const keys = Object.keys(presenterKeys(model.spec.presentation));
  assert.equal(guide.length, keys.length + 1, 'the chapter digits are a row too');
  assert.equal(guide[0].keys, `1–${model.spec.presentation.guided_chapters.length}`);
  for (const row of guide) {
    assert.ok(row.label.trim(), `${row.keys} is printed without saying what it does`);
  }
  const preflight = readFileSync(new URL('../release/PREFLIGHT.md', import.meta.url), 'utf8');
  const script = readFileSync(new URL('../release/PRESENTER_SCRIPT.md', import.meta.url), 'utf8');
  for (const row of guide) {
    assert.ok(script.includes(`\`${row.keys}\``),
      `the presenter script does not name the '${row.keys}' key`);
  }
  assert.match(preflight, /presenter keys/i);
});

test('SC17: orientation is claim-bound while titin retains one identity colour', () => {
  const chapter = model.spec.presentation.guided_chapters
    .find((entry) => entry.id === 'meet_sarcomere');
  assert.ok(chapter.claim_ids.includes('sarcomere_definition'));
  assert.ok(chapter.claim_ids.includes('actomyosin_motor_function'));
  assert.ok(chapter.claim_ids.includes('titin_continuity_trace'));
  assert.match(chapter.lay_summary, /sarcomere[\s\S]*Z-discs/i);
  assert.match(chapter.lay_summary,
    /(?:ATP|\(ATP\))-powered myosin[\s\S]*titin[\s\S]*not the motor/i);
  assert.equal(COMPONENT_COLOR.titin, 0xff5d7d);
  assert.equal(Object.hasOwn(GUIDED_COMPONENT_COLOR, 'titin'), false,
    'Guided mode must inherit, not redefine, titin identity colour');
  assert.match(page, /--titin:\s*#ff5d7d/i,
    'the UI identity channel must consume the same single titin colour');
});
