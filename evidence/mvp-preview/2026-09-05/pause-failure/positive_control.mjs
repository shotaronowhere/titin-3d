// Positive control for the pause/resume regression in test/browser/stretch.spec.js.
// It runs the SAME value-setter instrumentation and the SAME `min(writes) >= paused`
// predicate as that test, but triggers a real endpoint REPLAY — the one path that does
// reset to the working minimum. If the predicate cannot see that reset, the regression is
// vacuous. Exits 0 when the predicate correctly reports the reset. Run from anywhere:
//
//   node evidence/mvp-preview/2026-09-05/pause-failure/positive_control.mjs
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { waitForReady } from '../../../../test/browser/helpers.js';

const root = resolve(import.meta.dirname, '../../../..');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(pathToFileURL(resolve(root, 'index.html')).href);
  await waitForReady(page);
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await page.locator('#sl').fill('2400');            // sit at the working maximum
  await page.waitForFunction(
    () => /Replay stretch/.test(document.querySelector('#stagePlay').textContent),
  );
  const paused = Number(await page.locator('#sl').inputValue());
  await page.evaluate(() => {
    window.__resumeLengths = [];
    const input = document.querySelector('#sl');
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(input, 'value', {
      get() { return descriptor.get.call(this); },
      set(value) { window.__resumeLengths.push(Number(value)); descriptor.set.call(this, value); },
    });
  });
  await page.locator('#stagePlay').click();          // explicit endpoint replay: DOES reset
  await page.waitForFunction(
    () => document.querySelector('#sl').value === '2400', null, { timeout: 30_000 },
  );
  const writes = await page.evaluate(() => window.__resumeLengths);
  const min = Math.min(...writes);
  process.stdout.write([
    `start value              : ${paused}`,
    `writes recorded          : ${writes.length}, first three = ${writes.slice(0, 3).join(', ')}`,
    `min(writes)              : ${min}`,
    `predicate min >= start   : ${min >= paused}  <- must be false for the test to bite`,
    `reset write 2000 observed: ${writes.includes(2000)}`,
    '',
  ].join('\n'));
  process.exitCode = min >= paused ? 1 : 0;
} finally {
  await browser.close();
}
