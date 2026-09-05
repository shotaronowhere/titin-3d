// Offline walkthrough of an EXTRACTED distribution package; a one-off evidence aid,
// not a release gate. Takes the extracted package root as its argument and drives the
// primary Tour route, the force route, one export, and all six static fallback slides
// over file://, recording every non-file request so "offline" is checked, not assumed.
//
//   node evidence/mvp-preview/2026-09-05/package_walkthrough.mjs /abs/extracted/package
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { waitForReady } from '../../../test/browser/helpers.js';

const packageRoot = process.argv[2];
if (!packageRoot) throw new Error('usage: package_walkthrough.mjs <extracted package root>');
const out = resolve(import.meta.dirname, 'package-frames');
mkdirSync(out, { recursive: true });

const BEATS = [
  ['Beat 1 of 5', 'Meet the sarcomere'],
  ['Beat 2 of 5', 'Follow one giant molecule'],
  ['Beat 3 of 5', 'Build and stretch the spring'],
  ['Beat 4 of 5', 'Scaffold the thick filament'],
  ['Beat 5 of 5', 'What do we know?'],
];
const SLIDES = ['scope', 'architecture', 'extension', 'lattice', 'provenance', 'limitations'];

const browser = await chromium.launch();
const pageErrors = [];
const offPackageRequests = [];
const beats = [];
const slides = [];
let mechanics = null;
let stateExport = null;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith('file:')) offPackageRequests.push(request.url());
  });

  await page.goto(pathToFileURL(resolve(packageRoot, 'index.html')).href);
  await waitForReady(page);

  for (const [index, [progress, headline]] of BEATS.entries()) {
    if (index > 0) await page.locator('#chapterNext').click();
    await page.waitForFunction(
      (text) => document.querySelector('#chapterProgress')?.textContent.trim() === text, progress,
    );
    const card = (await page.locator('#guidedCard').innerText()).replace(/\s+/g, ' ');
    if (!card.includes(headline)) throw new Error(`${progress} card is missing "${headline}"`);
    await page.screenshot({ path: resolve(out, `beat-${index + 1}.png`) });
    beats.push({ progress, headline, headline_present: true });

    if (index === 2) {
      await page.locator('#stagePlay').click();
      await page.waitForFunction(
        () => document.querySelector('#sl').value === '2400', null, { timeout: 30_000 },
      );
      await page.waitForFunction(
        () => /Replay stretch/.test(document.querySelector('#stagePlay').textContent),
      );
      const announcement = await page.locator('#objectAnnouncement').innerText();
      const chip = (await page.locator('#stageForce').innerText()).replace(/\s+/g, ' ');
      await page.screenshot({ path: resolve(out, 'stretch-endpoint.png') });
      await page.locator('#stageForce').click();
      await page.waitForFunction(() => document.activeElement?.id === 'passiveForceHeading');
      const forcePanel = (await page.locator('#panelMeasure').innerText()).replace(/\s+/g, ' ');
      await page.screenshot({ path: resolve(out, 'force-route.png') });

      // Sources & build, from where the force route already put us in Research.
      await page.locator('#tabSources').click();
      const download = page.waitForEvent('download');
      await page.locator('#downloadStateExport').click();
      const file = await download;
      const stream = await file.createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      stateExport = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      await page.locator('#closeEvidence').click();
      await page.waitForFunction(
        () => document.querySelector('#chapterProgress')?.textContent.trim() === 'Beat 3 of 5',
      );
      mechanics = {
        endpoint_length_nm: Number(await page.locator('#sl').inputValue()),
        announcement,
        tour_force_chip: chip,
        research_states_sensitivity: /sensitivity/i.test(forcePanel),
        research_states_not_a_confidence_interval: /not a confidence interval/i.test(forcePanel),
        export_download: file.suggestedFilename(),
      };
    }
  }

  // The slides declare their own 1920x1080 viewBox; screenshotting them through the
  // 1280-wide Tour viewport would clip them and make an edge defect look like a crop.
  await page.setViewportSize({ width: 1920, height: 1080 });
  for (const slide of SLIDES) {
    const path = resolve(packageRoot, `release/fallback/${slide}.svg`);
    await page.goto(pathToFileURL(path).href);
    const rendered = await page.evaluate(() => {
      const root = document.querySelector('svg');
      if (!root) return null;
      const box = root.getBoundingClientRect();
      return {
        width: Math.round(box.width),
        height: Math.round(box.height),
        text_nodes: document.querySelectorAll('svg text').length,
        first_text: document.querySelector('svg text')?.textContent.trim() ?? null,
      };
    });
    if (!rendered || rendered.width <= 0 || rendered.text_nodes === 0) {
      throw new Error(`fallback slide ${slide}.svg did not render readable content`);
    }
    await page.screenshot({ path: resolve(out, `fallback-${slide}.png`) });
    slides.push({ slide, ...rendered });
  }

  await page.close();
  if (pageErrors.length) throw new Error(JSON.stringify(pageErrors));
  writeFileSync(resolve(import.meta.dirname, 'package_walkthrough.json'), `${JSON.stringify({
    package_root: packageRoot,
    index_sha256: createHash('sha256')
      .update(readFileSync(resolve(packageRoot, 'index.html'))).digest('hex'),
    note: 'Offline route walkthrough of the extracted package. Not human usability evidence.',
    beats,
    mechanics,
    export_build: stateExport?.build ?? null,
    export_candidate_manifest_verified: stateExport?.reproduction?.candidate_manifest_verified ?? null,
    fallback_slides: slides,
    off_package_requests: offPackageRequests,
    page_errors: pageErrors,
  }, null, 2)}\n`);
  process.stdout.write(`Walked ${beats.length} beats and ${slides.length} fallback slides; `
    + `${offPackageRequests.length} off-package requests; ${pageErrors.length} page errors.\n`);
} finally {
  await browser.close();
}
