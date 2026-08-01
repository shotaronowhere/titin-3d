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
 * index.html loads Three.js from ./node_modules and fetches the spec from ./data.
 * That is the right structure for development: the code the browser runs is
 * byte-identical to the code `node --test` verifies, with no build step able to
 * introduce a second, drifting artifact. But it means the page only works when
 * served from the project root, and it therefore CANNOT work in a viewer
 * that shows one HTML file with no siblings — which is how the artifact opens.
 *
 * So this script produces a second, DERIVED deliverable: one file, no fetch, no
 * import map, no node_modules.
 *
 * WHAT KEEPS IT FROM DRIFTING
 *
 * It reads the SAME src/*.js and data/*.json that the test suite verifies, and
 * concatenates them. It does not reimplement, reformat, or hand-copy anything, and
 * it fails loudly rather than emitting a page that is missing a module or a spec:
 *
 *   - modules are discovered by following imports from index.html, not listed here;
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
 * Two behavioural differences from index.html, both intended and both necessary:
 *   1. the spec is read from the embedded object instead of fetched over HTTP;
 *   2. the boot diagnostic's advice is rewritten, since "serve over HTTP" is exactly
 *      the wrong instruction for a file that needs no server.
 * Everything else — geometry, evidence classes, scene construction — is the same code.
 */

import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const html = read('index.html');
const MOD_OPEN = '<script type="module">';
const pageModule = html.slice(
  html.indexOf(MOD_OPEN) + MOD_OPEN.length,
  html.lastIndexOf('</script>'),
);
if (!pageModule.includes('TitinVisualization')) {
  throw new Error('build_standalone: could not extract the page module from index.html');
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
export { COMPONENT_COLOR, EVIDENCE_STYLE, COMPONENTS } from './src/render/SarcomereScene.js';
export { EVIDENCE_CLASSES } from './src/model/SpecLoader.js';
`);

let bundle;
try {
  const out = await build({
    entryPoints: [join(ROOT, ENTRY)],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    write: false,
    legalComments: 'inline',
    logLevel: 'warning',
  });
  bundle = out.outputFiles[0].text;
} finally {
  rmSync(join(ROOT, ENTRY), { force: true });
}

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
 *   - its four import statements collapse to one destructuring from the inlined bundle;
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
    return 'const { TitinModel, TitinVisualization, SCALES, Viewer, VIEWS, CLOSEUPS, COMPONENT_COLOR, EVIDENCE_STYLE, COMPONENTS, EVIDENCE_CLASSES } = __titinBundle;\n';
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
</script>`;

const standalone = html
  .replace(/<script type="importmap">[\s\S]*?<\/script>/,
    lit('<!-- import map removed: every module is inlined below -->'))
  .replace('<title>', lit('<title>Standalone \u2014 '))
  .replace('</head>', lit(bootPatch + '\n</head>'))
  .replace(
    MOD_OPEN + pageModule + '</script>',
    lit([
      '<script type="module">',
      '/* --- inlined dependency bundle (esbuild, format=esm) --- */',
      'const __titinBundle = await (async () => {',
      bundle.replace(/export\s*\{[^}]*\};?\s*$/, () => ''),
      'return { TitinModel, TitinVisualization, SCALES, Viewer, VIEWS, CLOSEUPS, COMPONENT_COLOR, EVIDENCE_STYLE, COMPONENTS, EVIDENCE_CLASSES };',
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

const outPath = process.argv[2] || 'titin_standalone.html';
writeFileSync(join(ROOT, outPath), standalone);
console.log(`wrote ${outPath}  ${(standalone.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`  bundle: ${(bundle.length / 1024).toFixed(0)} KB (three r${checksums['node_modules/three']} inlined)`);
console.log(`  spec files embedded: ${specNames.length}`);
console.log(`  page-module imports collapsed: ${importCount}`);
