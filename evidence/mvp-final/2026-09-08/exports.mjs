// Candidate-specific presenter-route export check; a one-off evidence aid, not a
// release gate. It walks the route a presenter walks — Research → Sources & build
// → the four download buttons — on the standalone candidate opened over file://,
// which is how the shared package will be opened. No dev server is involved.
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { waitForReady } from '../../../test/browser/helpers.js';

const root = resolve(process.argv[2] || '.');
const out = resolve(import.meta.dirname, 'exports');
const resume = process.argv.includes('--resume');
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

  for (const lengthNm of [2000, 2200, 2400, 2450, 1900]) {
    const useExisting = resume && BUTTONS.every(([, name]) => existsSync(resolve(out, `${lengthNm}-${name}`)));
    if (!useExisting) {
      if (await page.locator('#closeEvidence').isVisible()) await page.locator('#closeEvidence').click();
      await page.locator('#sl').fill(String(lengthNm));
      await page.locator('#audienceEvidence').click();
      await page.locator('#tabSources').click();
    }
    const files = {};
    for (const [selector, expected] of BUTTONS) {
      let bytes;
      const name = expected;
      if (useExisting) {
        bytes = readFileSync(resolve(out, `${lengthNm}-${name}`));
      } else {
        const [download] = await Promise.all([
          page.waitForEvent('download'), page.locator(selector).click(),
        ]);
        if (download.suggestedFilename() !== expected) throw new Error(`${selector} produced ${download.suggestedFilename()}, expected ${expected}`);
        const stream = await download.createReadStream();
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        bytes = Buffer.concat(chunks);
        writeFileSync(resolve(out, `${lengthNm}-${name}`), bytes);
      }
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
    if (!forceRow) throw new Error(`Missing force row at ${lengthNm}`);
    const forceCells = forceRow.split(',').slice(1, 4);
    if (state.state.sarcomere_length_nm !== lengthNm) throw new Error(`Wrong exported length: ${lengthNm}`);
    const expectedStatus = lengthNm === 1900 ? 'not_evaluated' : lengthNm === 2450 ? 'extrapolated' : 'supported';
    if (state.mechanics.status !== expectedStatus || forceRow.split(',')[4] !== expectedStatus) throw new Error(`Wrong force status at ${lengthNm}`);
    if (expectedStatus !== 'not_evaluated' && !forceCells.every(cell => cell !== '' && Number.isFinite(Number(cell)))) throw new Error(`Missing evaluated force at ${lengthNm}`);
    if (lengthNm === 1900 && !forceCells.every(cell => cell === '')) throw new Error('Unsupported force is not blank');
    for (const key of ['model_fingerprint', 'app_revision', 'build_inputs_fingerprint']) {
      if (state.build[key] !== manifest[key]) throw new Error(`Export identity mismatch: ${key}`);
    }
    if (!state.reproduction.candidate_manifest_verified) throw new Error('Candidate manifest not verified');
    if (JSON.stringify(claims.build) !== JSON.stringify(state.build)) throw new Error('Claim/state identity differs');
    results.push({
      sarcomere_length_nm: lengthNm,
      download_attempt: useExisting ? 'first attempt, complete state preserved and revalidated' : 'current attempt',
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
  process.stdout.write(`Verified ${results.length * BUTTONS.length} downloaded files across ${results.length} states; no page errors.\n`);
} finally {
  await browser.close();
}
