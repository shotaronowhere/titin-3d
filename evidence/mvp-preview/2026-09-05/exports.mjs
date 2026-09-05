// Candidate-specific presenter-route export check; a one-off evidence aid, not a
// release gate. It walks the route a presenter walks — Research → Sources & build
// → the four download buttons — on the standalone candidate opened over file://,
// which is how the shared package will be opened. No dev server is involved.
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { waitForReady } from '../../../test/browser/helpers.js';

const root = resolve(import.meta.dirname, '../../..');
const out = resolve(import.meta.dirname, 'exports');
mkdirSync(out, { recursive: true });

const indexPath = resolve(root, 'index.html');
const manifest = JSON.parse(readFileSync(resolve(root, 'release/MANIFEST.json'), 'utf8'));
const BUTTONS = [
  ['#downloadStateExport', 'titin-state.json'],
  ['#downloadForceExport', 'force-curve.csv'],
  ['#downloadRegionalExport', 'regional-extension.csv'],
  ['#downloadClaimsExport', 'claim-support.json'],
];

const browser = await chromium.launch();
const errors = [];
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (error) => errors.push(error.message));
  // file:// drops the fragment and the page canonicalizes to its defaults, so the
  // route has to be driven by the same clicks a presenter makes.
  await page.goto(pathToFileURL(indexPath).href);
  await waitForReady(page);
  // Beat 3 is where the Tour exposes the length control, and Research is entered
  // from there; the length survives the round trip. Research itself has no slider,
  // so this is the order a presenter actually uses.
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();

  for (const lengthNm of [2400, 1900]) {
    if (await page.locator('#closeEvidence').isVisible()) {
      await page.locator('#closeEvidence').click();
    }
    await page.locator('#sl').fill(String(lengthNm));
    await page.locator('#audienceEvidence').click();
    await page.locator('#tabSources').click();
    const files = {};
    for (const [selector, expected] of BUTTONS) {
      const event = page.waitForEvent('download');
      await page.locator(selector).click();
      const download = await event;
      const stream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      const name = download.suggestedFilename();
      if (name !== expected) throw new Error(`${selector} produced ${name}, expected ${expected}`);
      writeFileSync(resolve(out, `${lengthNm}-${name}`), bytes);
      files[name] = { bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex'), text: bytes.toString('utf8') };
    }
    const state = JSON.parse(files['titin-state.json'].text);
    const claims = JSON.parse(files['claim-support.json'].text);
    const forceRow = files['force-curve.csv'].text.split('\n')
      .find((line) => line.startsWith(`${lengthNm},`));
    const regionalRows = files['regional-extension.csv'].text.trim().split('\n').length - 1;
    // force-curve.csv columns are
    // sarcomere_length_nm,force_pN_min,force_pN_central,force_pN_max,status,reason,...
    // so the three force cells of the unsupported row must be empty strings. A zero
    // would read as a measured "no force" rather than a value the model declines
    // to evaluate, which is the distinction this preview is not allowed to blur.
    const forceCells = (forceRow ?? '').split(',').slice(1, 4);
    results.push({
      sarcomere_length_nm: lengthNm,
      mechanics_status: state.mechanics.status,
      force_cells_min_central_max: forceCells,
      force_cells_blank: forceCells.every((cell) => cell === ''),
      force_csv_row: forceRow,
      candidate_manifest_verified: state.reproduction.candidate_manifest_verified,
      model_fingerprint: state.build.model_fingerprint,
      app_revision: state.build.app_revision,
      build_inputs_fingerprint: state.build.build_inputs_fingerprint,
      export_contract_fingerprint: state.build.export_contract_fingerprint,
      claims_build_matches_state: JSON.stringify(claims.build) === JSON.stringify(state.build),
      pinned_inputs: state.reproduction.pinned_inputs?.length ?? null,
      claim_schema: claims.schema ?? null,
      regional_data_rows: regionalRows,
      files: Object.fromEntries(Object.entries(files)
        .map(([name, row]) => [name, { bytes: row.bytes, sha256: row.sha256 }])),
    });
  }
  await page.close();
  if (errors.length) throw new Error(JSON.stringify(errors));
  writeFileSync(resolve(import.meta.dirname, 'exports.json'), `${JSON.stringify({
    route: 'file:// standalone → Research → Sources & build → four download buttons',
    index_sha256: createHash('sha256').update(readFileSync(indexPath)).digest('hex'),
    manifest_index_sha256: manifest.standalone.sha256,
    manifest_model_fingerprint: manifest.model_fingerprint,
    manifest_app_revision: manifest.app_revision,
    manifest_build_inputs_fingerprint: manifest.build_inputs_fingerprint,
    manifest_export_contract_fingerprint: manifest.export_contract_fingerprint,
    note: 'Presenter-route download check on the standalone candidate. Not human usability evidence.',
    states: results,
    page_errors: errors,
  }, null, 2)}\n`);
  process.stdout.write(`Downloaded ${results.length * BUTTONS.length} files across ${results.length} states; no page errors.\n`);
} finally {
  await browser.close();
}
