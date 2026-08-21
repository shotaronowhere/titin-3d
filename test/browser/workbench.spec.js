import { test, expect } from '@playwright/test';
import { failOnPageErrors, waitForReady } from './helpers.js';

failOnPageErrors(test);

async function boot(page, viewport = { width: 1280, height: 720 }) {
  await page.setViewportSize(viewport);
  await page.goto('/index.html#v=2&depth=explore&step=meet_sarcomere&sl=2200&drawer=inspect&scene=overview&confidence=1');
  await waitForReady(page);
}

async function downloadText(page, selector) {
  const event = page.waitForEvent('download');
  await page.locator(selector).click();
  const download = await event;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { name: download.suggestedFilename(), text: Buffer.concat(chunks).toString('utf8') };
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
]) {
  test(`SC26 ${viewport.width}x${viewport.height} expert route exposes inspect, measure, evidence, and handoff`, async ({ page }) => {
    await boot(page, viewport);
    await page.locator('#regions [data-region="prox_Ig"]').click();
    await expect(page.locator('#inspectionWorkbench')).toContainText('Q8WZ42-1');
    await expect(page.locator('#inspectionWorkbench')).toContainText('801-9365 inclusive');
    await expect(page.locator('#inspectionWorkbench')).toContainText('74 contained source features');
    await expect(page.locator('#referenceDomainSummary')).toContainText('285 pinned UniProt DOMAIN features');
    await expect(page.locator('#referenceDomainStrip .reference-strip-region')).toHaveCount(9);

    await page.locator('#tabMeasure').click();
    await expect(page.locator('#forceCurve .force-chart')).toBeVisible();
    await expect(page.locator('#forceCurve')).toContainText('Current extension');
    await expect(page.locator('#forceCurve')).toContainText('Slack/contact/compression');
    await expect(page.locator('#forceCurve')).toContainText('Not claimed:');
    await expect(page.locator('#compliancePlot svg')).toBeVisible();
    await expect(page.locator('#compliancePlot')).toContainText('incremental compliance');
    await expect(page.locator('#forceCurve details > summary')).toContainText('Equations, parameters');

    await page.locator('#tabEvidence').click();
    await expect(page.locator('#claimEvidenceGroups .claim-evidence-group')).toHaveCount(5);
    await expect(page.locator('[data-evidence-group="measured_source_direct"]')).toContainText('Measured / source-direct');
    await expect(page.locator('[data-evidence-group="modeled"]')).toContainText('Modeled');
    await expect(page.locator('[data-evidence-group="unknown"]')).toContainText('Unknown');

    await page.locator('#tabSources').click();
    await expect(page.locator('.research-actions button')).toHaveCount(4);
    await page.locator('#reproductionToggle').click();
    await expect(page.locator('#reproductionWorksheet')).toBeVisible();
    await expect(page.locator('#reproductionWorksheet')).toContainText('python3 scripts/mechanical_model.py');
    await expect(page.locator('#reproductionWorksheet')).toContainText('Node 20.19.2');
    await expect(page.locator('#reproductionWorksheet')).toContainText('data/sarcomere.json');
    await expect(page.locator('#reproductionWorksheet')).toContainText('data/mechanical_parameters.json');
    await expect(page.locator('#reproductionWorksheet')).toContainText('Upstream source SHA-256');
    await expect(page.locator('#reproductionWorksheet')).toContainText('Reference sequence SHA-256');
    await expect(page.locator('#reproductionWorksheet ul li')).toHaveCount(9);
    await expect(page.locator('#exportContractFingerprint')).toHaveText(/^[0-9a-f]{64}$/);
  });
}

test('SC26 Inspect never attributes titin sequence metadata to actin or myosin', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/index.html#v=2&depth=explore&step=meet_sarcomere&sl=2200&drawer=inspect&camera=view.titin_story&scale=context&target=thick_filament&context=1&layers=lattice_rings_1%2Cmirror%2Cshow_lattice&confidence=1');
  await waitForReady(page);
  await expect(page.locator('#inspectionWorkbench')).toContainText('Myosin thick filament');
  await expect(page.locator('#inspectionWorkbench')).toContainText(
    'Q8WZ42-1 sequence metadata is restricted to titin targets',
  );
  await expect(page.locator('#inspectionWorkbench')).toContainText(
    'Not applicable to this non-titin target',
  );
  await expect(page.locator('#inspectionWorkbench')).not.toContainText('34350');
});

test('SC26 browser downloads deterministic bytes and unsupported force is blank, not zero', async ({ page }) => {
  await boot(page);
  await page.locator('#tabSources').click();
  const first = await downloadText(page, '#downloadStateExport');
  const second = await downloadText(page, '#downloadStateExport');
  expect(first.name).toBe('titin-state.json');
  expect(first.text).toBe(second.text);
  const state = JSON.parse(first.text);
  expect(state.schema).toBe('titin-state-export/1');
  expect(state.mechanics.status).toBe('supported');
  expect(state.reproduction.candidate_manifest_verified).toBe(true);

  await page.goto('/index.html#v=2&depth=explore&step=meet_sarcomere&sl=1900&drawer=sources&scene=overview&confidence=1');
  await waitForReady(page);
  const force = await downloadText(page, '#downloadForceExport');
  expect(force.name).toBe('force-curve.csv');
  const row = force.text.split('\n').find((line) => line.startsWith('1900,'));
  expect(row).toMatch(/^1900,,,,not_evaluated,/);
});

test('SC26 all four handoff files agree at supported, extrapolated, and omitted states', async ({ page }) => {
  const cases = [
    [2000, 'supported'], [2200, 'supported'], [2400, 'supported'], [1900, 'not_evaluated'],
  ];
  const selectors = [
    '#downloadStateExport', '#downloadForceExport',
    '#downloadRegionalExport', '#downloadClaimsExport',
  ];
  let deterministicReference = null;
  for (const [length, expectedStatus] of cases) {
    await page.goto(`/index.html#v=2&depth=explore&step=meet_sarcomere&sl=${length}&drawer=sources&scene=spring&confidence=1`);
    await waitForReady(page);
    const files = [];
    for (const selector of selectors) files.push(await downloadText(page, selector));
    const [stateFile, forceFile, regionalFile, claimsFile] = files;
    expect(stateFile.name).toBe('titin-state.json');
    expect(forceFile.name).toBe('force-curve.csv');
    expect(regionalFile.name).toBe('regional-extension.csv');
    expect(claimsFile.name).toBe('claim-support.json');
    const state = JSON.parse(stateFile.text);
    expect(state.state.sarcomere_length_nm).toBe(length);
    expect(state.state.story_step).toBe('meet_sarcomere');
    expect(state.state.confidence_display).toBe(true);
    expect(state.mechanics.status).toBe(expectedStatus);
    expect(state.reproduction.pinned_inputs).toHaveLength(9);
    const forceRow = forceFile.text.split('\n').find((line) => line.startsWith(`${length},`));
    expect(forceRow).toBeTruthy();
    const forcePrefix = forceRow.split(',').slice(0, 5);
    expect(forcePrefix[4]).toBe(expectedStatus);
    if (expectedStatus === 'not_evaluated') expect(forcePrefix.slice(1, 4)).toEqual(['', '', '']);
    else expect(forcePrefix.slice(1, 4).every((value) => Number.isFinite(Number(value)))).toBe(true);
    const regionalRows = regionalFile.text.split('\n')
      .filter((line) => line.startsWith(`${length},`));
    expect(regionalRows).toHaveLength(5);
    expect(regionalRows.every((line) => line.split(',')[5] === expectedStatus)).toBe(true);
    const claims = JSON.parse(claimsFile.text);
    expect(claims.context.selection).toEqual({ id: 'PEVK', kind: 'region' });
    expect(claims.claims.map((claim) => claim.id)).toEqual([
      'regional_extension_story', 'titin_region_architecture',
    ]);
    if (length === 2200) deterministicReference = [
      stateFile.text, forceFile.text, regionalFile.text, claimsFile.text,
    ];
  }
  await page.goto('/index.html#v=2&depth=explore&step=meet_sarcomere&sl=2200&drawer=sources&scene=spring&confidence=1');
  await waitForReady(page);
  const repeated = [];
  for (const selector of selectors) repeated.push(await downloadText(page, selector));
  expect(repeated.map((file) => file.text)).toEqual(deterministicReference);
});

test('SC26 network failure leaves local locators and claim export operational', async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:4173)/, (route) => route.abort('failed'));
  await boot(page);
  await page.locator('#regions [data-region="PEVK"]').click();
  await page.locator('#tabSources').click();
  await expect(page.locator('#bibliography')).toContainText('Locator');
  await expect(page.locator('#bibliography')).toContainText('Offline source ID');
  const downloaded = await downloadText(page, '#downloadClaimsExport');
  const claims = JSON.parse(downloaded.text);
  expect(claims.schema).toBe('titin-claim-support-export/1');
  expect(claims.claims.length).toBeGreaterThan(0);
  expect(claims.claims.every((claim) => claim.support.every((row) => row.locator))).toBe(true);
});
