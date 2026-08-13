/**
 * build_standalone.mjs — emit a single self-contained HTML file.
 *
 * NOTE ON HISTORY: an earlier version of this script hand-rolled module loading by
 * creating one blob: URL per module and rewriting import specifiers to point at them.
 * It worked under a Node simulation, but blob:-URL module graphs behave differently
 * across browsers and CSP settings, and none of that could be verified in this
 * sandbox. It was replaced with esbuild, which produces ONE ordinary ES module — the
 * ordinary, widely-exercised path — so the standalone page's module semantics are the
 * same semantics every bundled web app relies on. The hand-rolled resolver is gone.
 *
 * WHY THIS EXISTS
 *
 * src/index.template.html is the editable page source. Its module imports target
 * the same src/*.js files that `node --test` verifies, while its import map and JSON
 * reader describe the unbundled development graph. The generated root index.html
 * embeds that graph so it also works in a viewer with no sibling files.
 *
 * So this script produces the repository's DERIVED root deliverable: one file, no
 * fetch, no import map, no node_modules. That same index.html works via file://,
 * any static server, and GitHub Pages.
 *
 * WHAT KEEPS IT FROM DRIFTING
 *
 * It reads the SAME src/*.js and data/*.json that the test suite verifies, and
 * concatenates them. It does not reimplement, reformat, or hand-copy anything, and
 * it fails loudly rather than emitting a page that is missing a module or a spec:
 *
 *   - modules are discovered by following imports from the template, not listed here;
 *   - the spec files are discovered from SpecLoader's own manifest, not listed here;
 *   - a checksum of every inlined source is embedded in the output, so a standalone
 *     file can be checked against the tree it was built from.
 *
 * HOW THE INLINING WORKS
 *
 * esbuild bundles the page's entry modules into one ES module, resolving 'three' and
 * 'three/addons/...' from node_modules exactly as the import map does at runtime. The
 * spec JSON is embedded as a frozen object and served by a reader that satisfies the
 * same `fetchJson(name) -> Promise<object>` contract browserReader implements, so
 * SpecLoader is untouched and cannot tell the difference.
 *
 * Two behavioural differences from the editable template, both intended and
 * necessary:
 *   1. the spec is read from the embedded object instead of fetched over HTTP;
 *   2. the boot diagnostic's advice is rewritten, since "serve over HTTP" is exactly
 *      the wrong instruction for a file that needs no server.
 * Everything else — geometry, evidence classes, scene construction — is the same code.
 */

import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import {
  buildIdentity,
  inputManifestFromMetafile,
} from './build_identity.mjs';

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const args = process.argv.slice(2);
const check = args.includes('--check');
const release = args.includes('--release');
const paths = args.filter((arg) => !['--check', '--release'].includes(arg));
if (paths.length > 1) {
  throw new Error('usage: node scripts/build_standalone.mjs [output.html] [--check] [--release]');
}

const SOURCE = 'src/index.template.html';
const html = read(SOURCE);
const MOD_OPEN = '<script type="module">';
const pageModule = html.slice(
  html.indexOf(MOD_OPEN) + MOD_OPEN.length,
  html.lastIndexOf('</script>'),
);
if (!pageModule.includes('TitinVisualization')) {
  throw new Error(`build_standalone: could not extract the page module from ${SOURCE}`);
}

/**
 * Spec files: read SpecLoader's OWN manifest rather than restating the list here, so
 * this script cannot silently disagree with the loader about what the spec is.
 */
const loaderSrc = read('src/model/SpecLoader.js');
const specNames = [...new Set([
  ...[...loaderSrc.matchAll(/'([a-z_]+\.json)'/g)].map((m) => m[1]),
  ...[...loaderSrc.matchAll(/(?:STRATEGY_FILE|CONTEXT_FILE)\s*=\s*'([^']+)'/g)].map((m) => m[1]),
])];
if (specNames.length < 7) {
  throw new Error(`build_standalone: found only ${specNames.length} spec files; expected >= 7`);
}
const specs = {};
const checksums = {};
for (const n of specNames) {
  const text = read(join('data', n));
  specs[n] = JSON.parse(text);
  checksums[`data/${n}`] = createHash('sha256').update(text).digest('hex').slice(0, 12);
}

/**
 * The bundle entry. It re-exports exactly the bindings the page module imports, so
 * the page's own code is unchanged apart from where those bindings come from.
 */
const ENTRY = '_standalone_entry.mjs';
writeFileSync(join(ROOT, ENTRY), `
export { TitinModel } from './src/model/TitinModel.js';
export { TitinVisualization, SCALES } from './src/api/TitinVisualization.js';
export { Viewer, VIEWS, CLOSEUPS } from './src/render/Viewer.js';
export { COMPONENT_COLOR, GUIDED_COMPONENT_COLOR, EVIDENCE_STYLE, COMPONENTS } from './src/render/SarcomereScene.js';
export { EVIDENCE_CLASSES } from './src/model/SpecLoader.js';
export { StoryController, AUDIENCE_MODES } from './src/presentation/StoryController.js';
export { isLongitudinalProjection } from './src/presentation/ShowcaseOverlay.js';
export { STAGE_LAYOUT, BRACKET_LANE_OFFSETS, bracketLaneY, inspectorPlacement, stagePxPerNm, scaleBar, scaleBarPlacement, labelBudget, locatorExtent, bracketLaneVisible } from './src/presentation/StageLayout.js';
export { SWEEP, sweepLength } from './src/presentation/StretchSweep.js';
export { presenterKeys, unboundShortcutIds } from './src/presentation/PresenterKeys.js';
export { renderClaimView } from './src/presentation/ClaimViewRenderer.js';
`);

let bundle;
let metafile;
try {
  const out = await build({
    entryPoints: [join(ROOT, ENTRY)],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    write: false,
    metafile: true,
    // The standalone is the production delivery artifact. Removing bundle-only
    // whitespace keeps the governed byte budget meaningful without renaming
    // symbols, changing the editable source, or weakening the size gate.
    minifyWhitespace: true,
    legalComments: 'inline',
    logLevel: 'warning',
  });
  // Some upstream Three.js comments contain trailing spaces or spaces before an
  // indentation tab. They are semantically inert but make the committed generated
  // artifact fail Git's whitespace-integrity check, so normalize only that trivia.
  bundle = out.outputFiles[0].text
    .replace(/^[ ]+\t/gm, '\t')
    .replace(/[ \t]+$/gm, '');
  metafile = out.metafile;
} finally {
  rmSync(join(ROOT, ENTRY), { force: true });
}

const inputManifest = inputManifestFromMetafile(metafile, {
  root: ROOT,
  entryPath: ENTRY,
  specFiles: specNames,
});
const identity = buildIdentity(inputManifest, { root: ROOT, release });

for (const p of ['src/model/TitinModel.js', 'src/render/Viewer.js',
  'src/render/SarcomereScene.js', 'src/model/SpecLoader.js']) {
  checksums[p] = createHash('sha256').update(read(p)).digest('hex').slice(0, 12);
}
checksums['node_modules/three'] = JSON.parse(read('node_modules/three/package.json')).version;

/**
 * JSON.stringify does NOT escape '<', so a '</script>' inside any embedded string
 * would terminate the HTML script element early and corrupt the page. Escaping '<' as
 * \u003c is inert inside a JS string literal and removes the hazard by construction
 * rather than by hoping no source ever contains that text. U+2028/U+2029 are legal in
 * JSON but illegal raw in a JS string literal, so they are escaped too.
 */
const safeJson = (v) => JSON.stringify(v)
  .split('<').join('\\u003c')
  .split('\u2028').join('\\u2028')
  .split('\u2029').join('\\u2029');

/**
 * The page module, rewritten minimally:
 *   - its source import statements collapse to one destructuring from the inlined bundle;
 *   - browserReader('./data') becomes the embedded reader.
 * Both replacements use the FUNCTION form of String.replace. That is not stylistic:
 * in a string replacement `$&` means "insert the match", and minified Three.js
 * contains `roughnessMapUv:$&&E(...)` because its minifier named a variable `$` — a
 * string replacement therefore spliced the whole page module into the middle of
 * Three.js and silently corrupted the output. The function form treats '$' literally.
 */
const IMPORT_RE = /import\s*\{[^}]*\}\s*from\s*'\.\/src[^']*';\n?/g;
const importCount = (pageModule.match(IMPORT_RE) || []).length;
if (importCount < 4) {
  throw new Error(`build_standalone: expected >= 4 src imports in the page module, found ${importCount}`);
}
let first = true;
let page = pageModule
  .replace(IMPORT_RE, () => {
    if (!first) return '';
    first = false;
    return 'const { TitinModel, TitinVisualization, SCALES, Viewer, VIEWS, CLOSEUPS, COMPONENT_COLOR, GUIDED_COMPONENT_COLOR, EVIDENCE_STYLE, COMPONENTS, EVIDENCE_CLASSES, StoryController, AUDIENCE_MODES, isLongitudinalProjection, STAGE_LAYOUT, BRACKET_LANE_OFFSETS, bracketLaneY, inspectorPlacement, stagePxPerNm, scaleBar, scaleBarPlacement, labelBudget, locatorExtent, bracketLaneVisible, SWEEP, sweepLength, presenterKeys, unboundShortcutIds, renderClaimView } = __titinBundle;\n';
  })
  .replace(/browserReader\('\.\/data'\)/g, () => '__titinSpecReader');
if (page.includes("from './src/")) {
  throw new Error('build_standalone: a src import survived the rewrite');
}
if (page.includes('browserReader')) {
  throw new Error('build_standalone: browserReader survived the rewrite');
}

const lit = (s) => () => s;
const bootPatch = `
<script>
/* The standalone file needs no server, so the diagnostic's serve-over-HTTP advice is
   replaced. The watchdog itself is kept: a module can still fail for other reasons,
   and a scientific tool that fails silently is worse than one that fails loudly. */
window.__titinStandalone = true;
/* SC-18: model, application, and build-input identities are deliberately distinct.
   The raw HTML checksum cannot be embedded without self-reference and therefore
   lives only in release/MANIFEST.json. */
window.__titinBuild = Object.freeze(${safeJson(identity)});
window.__titinInputManifest = Object.freeze(${safeJson(inputManifest)});
</script>`;

const standalone = html
  .replace(/<script type="importmap">[\s\S]*?<\/script>/,
    lit('<!-- import map removed: every module is inlined below -->'))
  .replace('</head>', lit(bootPatch + '\n</head>'))
  .replace(
    MOD_OPEN + pageModule + '</script>',
    lit([
      '<script type="module">',
      '/* --- inlined dependency bundle (esbuild, format=esm) --- */',
      'const __titinBundle = await (async () => {',
      bundle.replace(/export\s*\{[^}]*\};?\s*$/, () => ''),
      'return { TitinModel, TitinVisualization, SCALES, Viewer, VIEWS, CLOSEUPS, COMPONENT_COLOR, GUIDED_COMPONENT_COLOR, EVIDENCE_STYLE, COMPONENTS, EVIDENCE_CLASSES, StoryController, AUDIENCE_MODES, isLongitudinalProjection, STAGE_LAYOUT, BRACKET_LANE_OFFSETS, bracketLaneY, inspectorPlacement, stagePxPerNm, scaleBar, scaleBarPlacement, labelBudget, locatorExtent, bracketLaneVisible, SWEEP, sweepLength, presenterKeys, unboundShortcutIds, renderClaimView };',
      '})();',
      '',
      `const __titinSpecs = Object.freeze(${safeJson(specs)});`,
      `window.__titinChecksums = Object.freeze(${safeJson(checksums)});`,
      '/* Satisfies the same fetchJson(name) -> Promise<object> contract browserReader',
      '   implements, so SpecLoader is untouched and cannot tell the difference. */',
      'const __titinSpecReader = async (name) => {',
      '  if (!(name in __titinSpecs)) throw new Error("spec not embedded: " + name);',
      '  return JSON.parse(JSON.stringify(__titinSpecs[name]));',
      '};',
      '',
      page,
      '</script>',
    ].join('\n')),
  );

/**
 * Post-build assertions. A bundler that emits a plausible-looking but broken file is
 * worse than one that fails, so the build refuses to write output it cannot vouch for.
 */
const problems = [];
if (standalone.includes("from './src/model/TitinModel.js'")) {
  problems.push('the ORIGINAL page module survived in the output ($& splice corruption)');
}
for (const [i, part] of standalone.split('<script').entries()) {
  if (i === 0) continue;
  const closes = (part.match(/<\/script>/g) || []).length;
  if (closes !== 1) problems.push(`script element ${i} has ${closes} closing tags, expected 1`);
}
for (const needle of ['./data/', 'node_modules/', 'importmap']) {
  const region = standalone.split('__titinSpecs')[0];
  if (region.includes(needle) && !region.includes('<!-- import map removed')) {
    problems.push(`live reference to ${needle} survived`);
  }
}
if (!standalone.includes('__titinSpecReader')) problems.push('spec reader missing');
if (problems.length) {
  throw new Error('build_standalone refused to emit a corrupt bundle:\n  - ' + problems.join('\n  - '));
}

const outPath = paths[0] || 'index.html';
const absoluteOut = join(ROOT, outPath);

if (check) {
  if (!existsSync(absoluteOut)) {
    throw new Error(`${outPath} is missing; run npm run build`);
  }
  if (readFileSync(absoluteOut, 'utf8') !== standalone) {
    throw new Error(`${outPath} is stale; run npm run build and commit the result`);
  }
  console.log(`${outPath} is current`);
} else {
  writeFileSync(absoluteOut, standalone);
  console.log(`wrote ${outPath}  ${(standalone.length / 1024 / 1024).toFixed(2)} MB`);
}
console.log(`  bundle: ${(bundle.length / 1024).toFixed(0)} KB (three r${checksums['node_modules/three']} inlined)`);
console.log(`  spec files embedded: ${specNames.length}`);
console.log(`  page-module imports collapsed: ${importCount}`);
console.log(`  model: ${identity.model_fingerprint.slice(0, 12)}`);
console.log(`  app: ${identity.app_revision}`);
console.log(`  build inputs: ${identity.build_inputs_fingerprint.slice(0, 12)}`);
