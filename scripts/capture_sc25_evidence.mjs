#!/usr/bin/env node
/**
 * capture_sc25_evidence.mjs — deterministic screenshots for the SC-25 evidence set.
 *
 *   node scripts/capture_sc25_evidence.mjs
 *
 * Captures the committed standalone build, not a development server, at a pinned
 * device pixel ratio and with reduced motion requested, so a rerun on the same
 * build produces the same bytes. `scripts/build_sc25_evidence.mjs` records and
 * verifies the digests; this file only produces the images.
 *
 * These are automated captures. They show what the renderer draws; they are not a
 * human depiction review, and the evidence manifest records that distinction.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

import { SC25_CAPTURES } from './sc25_capture_set.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'evidence/scientific/SC-25');
const PORT = 4182;

mkdirSync(OUT, { recursive: true });
const server = spawn('node', ['scripts/serve_browser_tests.mjs', '--port', String(PORT)],
  { cwd: ROOT, stdio: 'ignore' });
const browser = await chromium.launch();
try {
  await new Promise((resolve) => { setTimeout(resolve, 1200); });
  for (const [name, width, height, hash] of SC25_CAPTURES) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html${hash}`);
    await page.waitForFunction(() => window.__titinBoot?.ready === true);
    await page.waitForTimeout(900);
    if (name.startsWith('pinned-titin')) {
      await page.locator('#stageLegend button[data-component="titin"]').click();
      await page.waitForTimeout(400);
    } else {
      // The one-time invitation is a first-run state, not a property of the
      // render, so it is dismissed before every capture except its own.
      await page.evaluate(() => {
        const dismiss = document.getElementById('inspectHintDismiss');
        if (dismiss && !document.getElementById('inspectHint').hidden) dismiss.click();
      });
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: join(OUT, name), animations: 'disabled' });
    console.log(`captured ${name} (${width}x${height})`);
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(`SC-25 captures written to ${OUT}`);
