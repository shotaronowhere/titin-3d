/** SC-17 gates: the showcase is legible from the back of a room. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');

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
