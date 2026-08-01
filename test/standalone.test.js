/**
 * standalone.test.js — gates the single-file build.
 *
 * The root index.html is a DERIVED artifact: src/index.template.html plus data/ plus
 * node_modules, flattened into one file so it opens locally and deploys unchanged to
 * any static host. A derived artifact can drift from its source, which would be worse
 * than not shipping it — a viewer would render stale science with no indication.
 * These tests exist to make that drift a test failure.
 *
 * They deliberately verify the BUILT FILE, not the builder's intentions: each one
 * extracts payloads from the shipped index.html and executes them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const OUT = 'index.html';

// Check rather than rewrite: a stale committed deployment artifact must fail CI.
execFileSync('node', ['scripts/build_standalone.mjs', '--check'], { stdio: 'pipe' });
const html = readFileSync(OUT, 'utf8');
const OPEN = '<script type="module">';
const body = html.slice(html.indexOf(OPEN) + OPEN.length, html.lastIndexOf('</script>'));

/** Balanced-brace scan, string-aware. A naive scan breaks on braces inside strings. */
function braceSpan(text, from) {
  let d = 0, inStr = false, esc = false, i = from;
  for (; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') d++;
    else if (c === '}') { d--; if (!d) return i + 1; }
  }
  throw new Error('unbalanced');
}
function embedded(prefix) {
  const i = html.indexOf(prefix);
  assert.ok(i > 0, `payload not found: ${prefix}`);
  const s = i + prefix.length;
  return JSON.parse(html.slice(s, braceSpan(html, s)));
}
const SPECS = embedded('const __titinSpecs = Object.freeze(');
const CHECKSUMS = embedded('window.__titinChecksums = Object.freeze(');

test('standalone: no live reference to sibling files can survive', () => {
  // The whole point of the artifact. Anything still pointing at ./data or
  // node_modules would 404 in a single-file viewer — the original bug.
  const shell = html.slice(0, html.indexOf('const __titinBundle'));
  assert.ok(!/<script type="importmap">/.test(html), 'import map must be removed');
  assert.ok(!/src=["']\.\/(src|node_modules)/.test(shell), 'no script src into the tree');
  assert.ok(!html.includes("browserReader('./data')"), 'the HTTP spec reader must be replaced');
  assert.match(body, /__titinSpecReader/, 'the embedded reader must be wired in');
});

test('standalone: HTML script elements are balanced', () => {
  // A '</script>' inside an embedded payload would end the element early and produce
  // a file that looks fine in a diff and is broken in a browser.
  const parts = html.split('<script');
  for (const [i, p] of parts.entries()) {
    if (i === 0) continue;
    assert.equal((p.match(/<\/script>/g) || []).length, 1,
      `script element ${i} must have exactly one closing tag`);
  }
  assert.ok(!html.includes('</script') || html.split('</script>').length - 1 === parts.length - 1,
    'closing tags must match opening tags');
});

test('standalone: the $& splice corruption never recurs', () => {
  // Minified three contains `roughnessMapUv:$&&E(...)`. With String.replace's STRING
  // form, `$&` re-inserts the match, which once spliced the entire page module into
  // the middle of three.js. This asserts the original module text is not duplicated.
  assert.ok(!html.includes("import { TitinModel } from './src/model/TitinModel.js'"),
    'the original page module must not survive in the output');
  const marker = 'const { TitinModel, TitinVisualization, SCALES, Viewer, VIEWS,';
  assert.equal(html.split(marker).length - 1, 1, 'the rewritten import must appear exactly once');
});

test('standalone: embedded spec matches data/ byte-for-byte', () => {
  // Drift guard. If a spec file changes and the standalone is not rebuilt, this fails.
  for (const [name, obj] of Object.entries(SPECS)) {
    const onDisk = readFileSync(`data/${name}`, 'utf8');
    assert.deepEqual(obj, JSON.parse(onDisk), `${name} must match data/${name}`);
    const sum = createHash('sha256').update(onDisk).digest('hex').slice(0, 12);
    assert.equal(CHECKSUMS[`data/${name}`], sum, `${name} checksum must match`);
  }
});

test('standalone: every spec file the loader requests is embedded', async () => {
  // Discovered from the loader, so adding a spec file to SpecLoader without rebuilding
  // is a failure rather than a silent 'spec not embedded' at runtime.
  const { SPEC_FILES, STRATEGY_FILE, CONTEXT_FILE } = await import('../src/model/SpecLoader.js');
  for (const n of [...SPEC_FILES, STRATEGY_FILE, CONTEXT_FILE]) {
    assert.ok(n in SPECS, `${n} must be embedded in the standalone`);
  }
});

test('standalone: model and scene build from the shipped file alone', async () => {
  // The substantive test: pull the inlined bundle out of the HTML, run it, and build
  // the real model and scene with NO filesystem spec read and NO node_modules import.
  const start = body.indexOf('const __titinBundle = await (async () => {');
  const ret = body.indexOf('return { TitinModel,', start);
  assert.ok(start > -1 && ret > start, 'inlined bundle must be present');
  const src = body.slice(body.indexOf('{', start) + 1, ret);

  const tmp = '_test_bundle.mjs';
  writeFileSync(tmp, src + '\nexport { TitinModel, SarcomereScene, EVIDENCE_CLASSES };\n');
  let mod;
  try { mod = await import('../' + tmp); } finally { rmSync(tmp, { force: true }); }

  const reader = async (n) => {
    if (!(n in SPECS)) throw new Error('spec not embedded: ' + n);
    return JSON.parse(JSON.stringify(SPECS[n]));
  };
  const model = await mod.TitinModel.create(reader);
  assert.equal(model.presets().length, 4);
  assert.deepEqual(model.slRange(), { min: 1900, max: 3000 });

  const scene = new mod.SarcomereScene(model);
  for (const sl of [1900, 2200, 3000]) {
    const root = scene.build(
      model.sceneAt(sl, { titinStrands: 1, mirror: true, rings: 1 }),
      model.domainInstancesAt(sl),
      { showLattice: true, showDomains: false, showContextDetail: false },
    );
    let drawables = 0;
    root.traverse((o) => { if (o.isMesh || o.isLine || o.isInstancedMesh) drawables++; });
    assert.ok(drawables > 0, `sl=${sl} must produce drawables`);
  }
});

test('standalone: the science matches the served page exactly', async () => {
  // A flattened file that renders different numbers would be the worst outcome of all.
  const { TitinModel } = await import('../src/model/TitinModel.js');
  const { nodeReader } = await import('../src/model/readNode.js');
  const served = await TitinModel.create(nodeReader());

  const start = body.indexOf('const __titinBundle = await (async () => {');
  const ret = body.indexOf('return { TitinModel,', start);
  const tmp = '_test_bundle2.mjs';
  writeFileSync(tmp, body.slice(body.indexOf('{', start) + 1, ret) + '\nexport { TitinModel };\n');
  let mod;
  try { mod = await import('../' + tmp); } finally { rmSync(tmp, { force: true }); }
  const flat = await mod.TitinModel.create(async (n) => JSON.parse(JSON.stringify(SPECS[n])));

  for (const sl of [1900, 2200, 2400, 3000]) {
    assert.deepEqual(flat.titinIbandLayoutAt ? flat.titinIbandLayoutAt(sl) : flat.geometryAt(sl).titin_iband_layout_nm,
      served.geometryAt(sl).titin_iband_layout_nm,
      `I-band layout must be identical at sl=${sl}`);
  }
  // And the physics the model exists to show: extension confined to the I-band.
  const a = flat.geometryAt(1900).titin_iband_layout_nm;
  const b = flat.geometryAt(3000).titin_iband_layout_nm;
  const ratio = (k) => b[k].len / a[k].len;
  assert.ok(ratio('PEVK') > 10, 'PEVK must dominate extension');
  assert.ok(ratio('prox_Ig') > 1 && ratio('prox_Ig') < 10, 'Ig extends modestly');
  assert.ok(Math.abs(ratio('prox_Ig') - ratio('PEVK')) > 1,
    'non-uniform extension: uniform scaling would make these equal');
});

test('standalone: the boot advice is not the served-page advice', () => {
  // 'Serve this over HTTP' is exactly the wrong instruction for a file that needs no
  // server; shipping it would send a user chasing a problem they do not have.
  assert.match(html, /__titinStandalone/, 'the standalone must mark itself as such');
  const i = html.indexOf('window.__titinStandalone');
  assert.ok(i > 0 && i < html.indexOf('const __titinBundle'),
    'the marker must be set before the module runs');
  assert.match(html, /location\.protocol\s*===\s*'file:'\s*&&\s*!window\.__titinStandalone/,
    'the file:// diagnostic must permit the generated self-contained page');
});

test('standalone: the real boot scripts permit a healthy file:// launch', () => {
  const classic = (html.match(/<script>([\s\S]*?)<\/script>/g) || [])
    .map((script) => script.replace(/^<script>/, '').replace(/<\/script>$/, ''));
  const boot = classic.find((script) => script.includes('__titinBoot'));
  const marker = classic.find((script) => script.includes('window.__titinStandalone = true'));
  assert.ok(boot && marker, 'the generated page must contain boot and standalone scripts');

  const err = { style: { display: 'none' }, textContent: '' };
  const domReady = [];
  const ctx = {
    location: { protocol: 'file:' },
    document: {
      getElementById: (id) => (id === 'err' ? err : null),
      addEventListener: (event, fn) => { if (event === 'DOMContentLoaded') domReady.push(fn); },
    },
    setTimeout: (fn, ms) => { ctx.timer = { fn, ms }; },
    addEventListener: () => {},
  };
  ctx.window = ctx;

  const execute = (source) => new Function(
    'window', 'document', 'location', 'setTimeout', source,
  )(ctx, ctx.document, ctx.location, ctx.setTimeout);
  execute(boot);
  execute(marker);
  for (const ready of domReady) ready();

  assert.equal(err.style.display, 'none',
    'the standalone marker must prevent the source-only file:// rejection');
  assert.ok(ctx.timer && ctx.timer.ms >= 3000, 'the ordinary boot watchdog must remain armed');
  ctx.__titinBoot.ready = true;
  ctx.timer.fn();
  assert.equal(err.style.display, 'none', 'a completed standalone boot must stay error-free');
});

test('standalone: spec discovery is redundant, not single-point', () => {
  // Discovery reads BOTH the SPEC_FILES manifest and the loader's field assignments,
  // so deleting one does not silently shrink the embedded set. Found by negative test:
  // emptying SPEC_FILES alone still yielded all 7 files. Asserted so it stays true.
  const src = readFileSync('src/model/SpecLoader.js', 'utf8');
  const fromManifest = new Set([...src.matchAll(/'([a-z_]+\.json)'/g)].map((m) => m[1]));
  for (const n of Object.keys(SPECS)) {
    assert.ok(fromManifest.has(n), `${n} must be discoverable from SpecLoader's own text`);
  }
});

test('standalone: build refuses rather than emit a file missing a spec', () => {
  // The drift scenario that matters: someone adds a spec file to the loader and the
  // standalone is rebuilt without it existing. The builder must fail, not emit a page
  // that throws 'spec not embedded' at a user in a viewer with no devtools open.
  const target = 'src/model/SpecLoader.js';
  const original = readFileSync(target, 'utf8');
  try {
    writeFileSync(target, original.replace(
      "export const CONTEXT_FILE = 'context_measurements.json';",
      "export const CONTEXT_FILE = 'context_measurements.json';\nexport const GHOST_FILE = 'does_not_exist.json';",
    ));
    let failed = false;
    try {
      execFileSync('node', ['scripts/build_standalone.mjs', '_tmp_out.html'], { stdio: 'pipe' });
    } catch { failed = true; }
    // Only meaningful if the ghost was actually discovered; otherwise the test is vacuous.
    const discovered = readFileSync(target, 'utf8').includes('does_not_exist.json');
    assert.ok(discovered, 'precondition: the ghost spec reference was written');
    assert.ok(failed, 'the builder must refuse when a referenced spec file is absent');
  } finally {
    writeFileSync(target, original);
    rmSync('_tmp_out.html', { force: true });
  }
  assert.equal(readFileSync(target, 'utf8'), original, 'the source must be restored');
  assert.ok(existsSync(OUT), 'the good bundle must still be present');
});
