/** Reproduce the stills from the pinned standalone. Run from the repository root. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { readEmbeddedBuildIdentity } from '../../../scripts/build_identity.mjs';

const out = new URL('.', import.meta.url);
const root = new URL('../../../', import.meta.url);
const origin = 'http://127.0.0.1:4174';
const html = readFileSync(new URL('index.html', root));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const identity = readEmbeddedBuildIdentity(html);
assert.match(identity.app_revision, /^[a-f0-9]{40}$/);
const server = spawn(process.execPath, ['scripts/serve_browser_tests.mjs', '--port', '4174'],
  { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
try {
  await once(server.stdout, 'data');
  assert.equal((await fetch(`${origin}/healthz`)).ok, true);
  browser = await chromium.launch();
  const captures = [];
  const cases = [
    ['default-desktop', 1280, 720, ''],
    ['default-phone', 390, 844, ''],
    ['spring-2000', 1280, 720, '#v=2&depth=learn&step=stretch_spring&sl=2000&drawer=closed&scene=spring&confidence=0'],
    ['spring-2400', 1280, 720, '#v=2&depth=learn&step=stretch_spring&sl=2400&drawer=closed&scene=spring&confidence=0'],
    ['architecture', 1280, 720, '#v=2&depth=learn&step=follow_titin&sl=2000&drawer=closed&scene=architecture&confidence=0'],
  ];
  for (const [name, width, height, hash] of cases) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1,
      reducedMotion: 'reduce', colorScheme: 'dark' });
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => requests.push(request.url()));
    await page.goto(`${origin}/${hash}`);
    await page.waitForFunction(() => window.__titinBoot?.ready === true);
    await page.waitForFunction(() => ['resolved', 'hidden', 'suppressed:compact-stage']
      .includes(document.querySelector('#scienceOverlay').dataset.labelLayout));
    // Wait for layout/renderer to settle after the ready marker; no manual orbit or zoom.
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => {
      const { camera, controls } = window.titinVisualization.viewer;
      return {
        url: location.href, chapter: document.querySelector('#chapterTitle').textContent,
        length_nm: Number(document.querySelector('#sl').value),
        guide_expanded: document.querySelector('#guideToggle').getAttribute('aria-expanded'),
        camera: { position: camera.position.toArray(), target: controls.target.toArray(),
          up: camera.up.toArray(), zoom: camera.zoom, fov: camera.fov, aspect: camera.aspect },
        document_overflow: document.documentElement.scrollWidth > innerWidth,
        overlay_layout: document.querySelector('#scienceOverlay').dataset.labelLayout,
      };
    });
    assert.deepEqual(errors, []);
    assert.equal(state.document_overflow, false);
    assert.deepEqual(requests, [`${origin}/`]);
    const filename = `raw/${name}.png`;
    const bytes = await page.screenshot({ path: new URL(filename, out).pathname });
    captures.push({ filename, sha256: sha256(bytes), viewport: { width, height }, state,
      requests, errors, reduced_motion: true, manual_camera_operations: [] });
    await context.close();
    console.log(`Captured ${name}`);
  }
  const low = captures.find((capture) => capture.filename.includes('spring-2000'));
  const high = captures.find((capture) => capture.filename.includes('spring-2400'));
  assert.deepEqual(low.state.camera, high.state.camera, 'endpoint camera and scale must match');
  writeFileSync(new URL('captures.json', out), JSON.stringify({ captured_at: new Date().toISOString(),
    html_sha256: sha256(html), identity, browser: `Chromium ${browser.version()}`,
    captures }, null, 2) + '\n');
} finally {
  await browser?.close();
  server.kill();
}
