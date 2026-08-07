/**
 * build_release_pack.mjs — emit the SC-9 release and handoff package.
 *
 * The pack is a BUILD PRODUCT with a staleness gate, exactly like the standalone
 * page. A handoff package that is written by hand drifts away from the science
 * the moment either changes; one that is generated and checked cannot.
 *
 *   node scripts/build_release_pack.mjs           # write release/
 *   node scripts/build_release_pack.mjs --check   # fail if the committed pack is stale
 *
 * The fallback deck is plain SVG drawn from the same descriptors the 3-D scene
 * consumes. That is the point: if WebGL or the projector fails mid-demonstration,
 * the deck still says exactly what the application would have said, and it needs
 * no GPU, no browser engine, and no network to open.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { TitinVisualization, SCALES } from '../src/api/TitinVisualization.js';
import { COMPONENTS } from '../src/render/SarcomereScene.js';
import { VIEWS, CLOSEUPS } from '../src/render/Viewer.js';
import { createReleasePack, SLIDE } from '../src/presentation/ReleasePack.js';
import { createVisualMatrix } from '../src/presentation/VisualMatrix.js';
import { buildFingerprint, FINGERPRINT_INPUTS } from './build_fingerprint.mjs';

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));
const OUT = join(ROOT, 'release');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

// --- tiny deterministic SVG helpers ----------------------------------------
const escapeText = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const INK = {
  bg: '#0e1116', panel: '#161b22', edge: '#2b3440', text: '#e6ebf1',
  dim: '#98a4b3', titin: '#ff5d7d', thick: '#4e79a7', thin: '#4fb39f',
  caveat: '#c9b989', rule: '#dfe7f2', accent: '#7aa2d8',
};

function text(x, y, value, { size = 24, fill = INK.text, weight = 400, anchor = 'start' } = {}) {
  return `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" `
    + `font-size="${size}" font-weight="${weight}" fill="${fill}" `
    + `text-anchor="${anchor}">${escapeText(value)}</text>`;
}

/** Deterministic greedy wrap; no measurement, so the same input always wraps the same. */
function wrap(value, perLine) {
  const words = String(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && (line.length + 1 + word.length) > perLine) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

function slideChrome(slide, body) {
  const footnote = wrap(slide.footnote, 150)
    .map((line, index) => text(90, SLIDE.height - 78 + index * 26, line,
      { size: 19, fill: INK.caveat }))
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SLIDE.width}" `
    + `height="${SLIDE.height}" viewBox="0 0 ${SLIDE.width} ${SLIDE.height}">`
    + `<rect width="${SLIDE.width}" height="${SLIDE.height}" fill="${INK.bg}"/>`
    + `<rect x="0" y="0" width="${SLIDE.width}" height="6" fill="${INK.titin}"/>`
    + text(90, 118, slide.title, { size: 52, weight: 650 })
    + text(90, 162, slide.subtitle, { size: 26, fill: INK.dim })
    + body
    + `<line x1="90" y1="${SLIDE.height - 108}" x2="${SLIDE.width - 90}" `
    + `y2="${SLIDE.height - 108}" stroke="${INK.edge}" stroke-width="1"/>`
    + footnote
    + '</svg>\n';
}

function drawText(slide) {
  const body = slide.lines.flatMap((line, index) => {
    if (!line.trim()) return [];
    return wrap(line, 108).map((part, offset) => text(90, 262 + index * 46 + offset * 34, part,
      { size: 28, fill: line.startsWith('·') ? INK.text : INK.dim }));
  }).join('');
  return slideChrome(slide, body);
}

function drawAxial(slide) {
  const left = 130;
  const right = SLIDE.width - 130;
  const span = slide.axis.end_nm - slide.axis.start_nm;
  const x = (nm) => left + ((nm - slide.axis.start_nm) / span) * (right - left);
  const parts = [];
  // Titin regions as one continuous chain of segments.
  const regionY = 470;
  slide.regions.forEach((region, index) => {
    const x0 = x(region.start_nm);
    const x1 = x(region.end_nm);
    parts.push(`<rect x="${x0.toFixed(2)}" y="${regionY}" width="${Math.max(2, x1 - x0).toFixed(2)}" `
      + `height="38" fill="${INK.titin}" opacity="${index % 2 ? 0.72 : 0.95}"/>`);
    if (x1 - x0 > 58) {
      parts.push(text((x0 + x1) / 2, regionY - 14, region.id.replace(/_/g, ' '),
        { size: 19, fill: INK.dim, anchor: 'middle' }));
    }
  });
  // Band and zone brackets, majors above, minors and the midpoint below.
  const laneY = { major: 330, minor: 604, marker: 604 };
  for (const bracket of slide.brackets) {
    const y = laneY[bracket.lane] ?? 604;
    const x0 = x(bracket.start_nm);
    const x1 = x(bracket.end_nm);
    if (bracket.kind === 'marker') {
      parts.push(`<line x1="${x0.toFixed(2)}" y1="${y - 26}" x2="${x0.toFixed(2)}" `
        + `y2="${y + 26}" stroke="${INK.rule}" stroke-width="3"/>`);
      parts.push(text(x0, y + 52, bracket.label, { size: 19, fill: INK.dim, anchor: 'middle' }));
      continue;
    }
    parts.push(`<line x1="${x0.toFixed(2)}" y1="${y}" x2="${x1.toFixed(2)}" y2="${y}" `
      + `stroke="${INK.accent}" stroke-width="3"/>`);
    for (const edge of [x0, x1]) {
      parts.push(`<line x1="${edge.toFixed(2)}" y1="${y - 12}" x2="${edge.toFixed(2)}" `
        + `y2="${y + 12}" stroke="${INK.accent}" stroke-width="3"/>`);
    }
    parts.push(text((x0 + x1) / 2, y - 22, `${bracket.label} · ${bracket.evidence_class}`,
      { size: 19, fill: INK.dim, anchor: 'middle' }));
  }
  for (const terminus of slide.termini) {
    parts.push(text(x(terminus.x_nm), regionY + 74, terminus.label,
      { size: 20, fill: INK.titin, anchor: terminus.x_nm > span / 2 ? 'end' : 'start' }));
  }
  parts.push(text(left, SLIDE.height - 160, `${slide.axis.start_nm.toFixed(0)} nm`,
    { size: 20, fill: INK.dim }));
  parts.push(text(right, SLIDE.height - 160, `${slide.axis.end_nm.toFixed(0)} nm`,
    { size: 20, fill: INK.dim, anchor: 'end' }));
  return slideChrome(slide, parts.join(''));
}

function drawBars(slide) {
  const left = 300;
  const width = SLIDE.width - left - 260;
  const max = Math.max(...slide.series.flatMap((series) => series.values.map((v) => v.value_nm)));
  const parts = [];
  slide.series.forEach((series, seriesIndex) => {
    const top = 250 + seriesIndex * 320;
    parts.push(text(90, top - 12, `${series.label} · total ${series.total_nm.toFixed(1)} nm`,
      { size: 26, weight: 650 }));
    series.values.forEach((value, index) => {
      const y = top + index * 58;
      const barWidth = Math.max(3, (value.value_nm / max) * width);
      parts.push(text(280, y + 26, value.label, { size: 22, fill: INK.dim, anchor: 'end' }));
      parts.push(`<rect x="${left}" y="${y + 6}" width="${barWidth.toFixed(2)}" height="26" `
        + `rx="4" fill="${INK.titin}" opacity="0.9"/>`);
      parts.push(text(left + barWidth + 14, y + 26, `${value.value_nm.toFixed(1)} nm · ${value.mechanism}`,
        { size: 20, fill: INK.dim }));
    });
  });
  parts.push(text(90, 218, `Evidence: ${slide.evidence_class}`, { size: 22, fill: INK.caveat }));
  return slideChrome(slide, parts.join(''));
}

function drawLattice(slide) {
  const view = slide.view;
  const half = view.shared_frame.half_extent_nm;
  const size = 470;
  const parts = [];
  view.panels.forEach((panel, index) => {
    const originX = 300 + index * 760;
    const originY = 560;
    const scale = (size / 2) / half;
    const px = (y) => originX + y * scale;
    const py = (z) => originY + z * scale;
    parts.push(`<rect x="${originX - size / 2 - 26}" y="${originY - size / 2 - 26}" `
      + `width="${size + 52}" height="${size + 52}" rx="10" fill="${INK.panel}" `
      + `stroke="${INK.edge}"/>`);
    for (const site of panel.ghost_thick || []) {
      parts.push(`<circle cx="${px(site.y).toFixed(2)}" cy="${py(site.z).toFixed(2)}" `
        + `r="${(site.radius_nm * scale).toFixed(2)}" fill="none" stroke="${INK.thick}" `
        + `stroke-width="1.5" stroke-dasharray="4 4" opacity="0.55"/>`);
    }
    for (const site of panel.thin) {
      parts.push(`<circle cx="${px(site.y).toFixed(2)}" cy="${py(site.z).toFixed(2)}" `
        + `r="${(site.radius_nm * scale).toFixed(2)}" fill="${INK.thin}" opacity="0.85"/>`);
    }
    for (const site of panel.thick) {
      parts.push(`<circle cx="${px(site.y).toFixed(2)}" cy="${py(site.z).toFixed(2)}" `
        + `r="${(site.radius_nm * scale).toFixed(2)}" fill="${INK.thick}"/>`);
    }
    const line = panel.dimension_line;
    parts.push(`<line x1="${px(line.from_nm.y).toFixed(2)}" y1="${py(line.from_nm.z).toFixed(2)}" `
      + `x2="${px(line.to_nm.y).toFixed(2)}" y2="${py(line.to_nm.z).toFixed(2)}" `
      + `stroke="${INK.rule}" stroke-width="3"/>`);
    parts.push(text(originX + 18, originY - (line.value_nm * scale) / 2,
      `d10 ${line.value_nm.toFixed(1)} nm`, { size: 22, fill: INK.rule, weight: 650 }));
    parts.push(text(originX, originY + size / 2 + 62,
      `${panel.id === 'current' ? 'Current' : panel.state_id} · ${panel.sarcomere_length_nm} nm`,
      { size: 24, weight: 650, anchor: 'middle' }));
    parts.push(text(originX, originY + size / 2 + 92, panel.status_label,
      { size: 19, fill: INK.dim, anchor: 'middle' }));
  });
  parts.push(text(90, 232, 'Same centre, same scale, orthographic — dashed circles ghost the other state',
    { size: 22, fill: INK.dim }));
  return slideChrome(slide, parts.join(''));
}

function drawFlow(slide) {
  const parts = [];
  slide.stages.forEach((stage, index) => {
    const y = 240 + index * 122;
    parts.push(`<rect x="90" y="${y}" width="${SLIDE.width - 180}" height="94" rx="8" `
      + `fill="${INK.panel}" stroke="${INK.edge}"/>`);
    parts.push(`<circle cx="128" cy="${y + 47}" r="9" fill="${INK.accent}"/>`);
    parts.push(text(162, y + 40, stage.label, { size: 27, weight: 650 }));
    parts.push(text(162, y + 74, `${stage.count} ${stage.count_label}`,
      { size: 21, fill: INK.titin }));
    parts.push(text(SLIDE.width - 110, y + 74, stage.records.join('  ·  '),
      { size: 17, fill: INK.dim, anchor: 'end' }));
    if (index < slide.stages.length - 1) {
      parts.push(`<line x1="128" y1="${y + 94}" x2="128" y2="${y + 122}" `
        + `stroke="${INK.accent}" stroke-width="2"/>`);
    }
  });
  return slideChrome(slide, parts.join(''));
}

const DRAW = { text: drawText, axial: drawAxial, bars: drawBars, lattice: drawLattice, flow: drawFlow };

// --- markdown artifacts -----------------------------------------------------
const row = (cells) => `| ${cells.join(' | ')} |`;

function claimMatrixDoc(pack) {
  const lines = [
    '# Claim and evidence matrix',
    '',
    `Generated from \`data/showcase_claims.json\` — build \`${pack.build_fingerprint}\`.`,
    'Do not edit by hand: run `npm run pack`.',
    '',
    row(['Object', 'Decision', 'Tier', 'Claim evidence', 'Render evidence', 'Sources']),
    row(['---', '---', '---', '---', '---', '---']),
  ];
  for (const claim of pack.claim_matrix) {
    const sources = claim.sources
      .map((source) => (source.href ? `[${source.citation}](${source.href})` : `\`${source.id}\``))
      .join('<br>');
    lines.push(row([`**${claim.name}**<br>\`${claim.id}\``, claim.decision, claim.release_tier,
      claim.claim_evidence_class, claim.render_evidence_class, sources]));
  }
  lines.push('', '## What each object claims, and does not', '');
  for (const claim of pack.claim_matrix) {
    lines.push(`### ${claim.name}`, '', `**Claim.** ${claim.claim}`, '',
      `**Scope.** ${claim.scope}`, '', '**Not claimed.**', '');
    for (const entry of claim.not_claimed) lines.push(`- ${entry}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function limitationsDoc(pack) {
  const lines = [
    '# Scientific limitations and non-claims',
    '',
    `Generated — build \`${pack.build_fingerprint}\`. Run \`npm run pack\` to refresh.`,
    '',
    'Every statement below is recorded in the repository, not written for this sheet.',
    '',
  ];
  for (const group of pack.limitations) {
    lines.push(`## ${group.title}`, '', `Source: \`${group.source}\``, '');
    for (const entry of group.entries) lines.push(`- ${entry}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function presenterDoc(pack) {
  const script = pack.presenter_script;
  const lines = [
    '# Presenter script',
    '',
    `Generated — build \`${pack.build_fingerprint}\`. Estimated ${script.estimated_seconds} s `
    + `(${Math.floor(script.estimated_seconds / 60)} min ${Math.round(script.estimated_seconds % 60)} s), `
    + `target ${script.target_seconds[0]}–${script.target_seconds[1]} s.`,
    '',
    'Read the **Say** line; it is the on-screen copy. The **If asked** line is the '
    + 'expert expansion and lives in the Evidence drawer — you do not need to open it '
    + 'to finish the tour.',
    '',
    '## Keys',
    '',
    'Resolved from the build, not typed here. Nothing needs the mouse.',
    '',
    '| Key | Does |',
    '|---|---|',
    ...script.keys.map((row) => `| \`${row.keys}\` | ${row.label} |`),
    '',
  ];
  for (const chapter of script.chapters) {
    lines.push(`## ${chapter.order}. ${chapter.title}  \`~${chapter.estimated_seconds}s\``, '',
      `**Do.** ${chapter.show}`, '', `**Say.** ${chapter.say}`, '',
      `**If asked.** ${chapter.if_asked}`, '');
    if (chapter.not_claimed.length) {
      lines.push(`**If pushed.** Not claimed: ${chapter.not_claimed.join('; ')}.`, '');
    }
  }
  return `${lines.join('\n')}\n`;
}

function preflightDoc(pack, matrix) {
  const lines = [
    '# Demo-day preflight',
    '',
    `Generated — build \`${pack.build_fingerprint}\`.`,
    '',
    'Run this on the presenting machine, on the presenting display.',
    '',
  ];
  for (const step of pack.preflight) {
    lines.push(`${step.step}. **${step.action}**`, `   - Expect: ${step.expected}`, '');
  }
  lines.push('## Fallback package', '',
    `- \`release/fallback/\` — ${pack.fallback_slides.length} static SVG slides generated from `
    + 'this build. They need no GPU, no browser engine, and no network.',
    `- \`release/SCREENSHOT_PACK.md\` — the ${matrix.cells.length}-cell review set, if you `
    + 'need to show a specific state you cannot reach live.', '',
    '## Build identity', '',
    `The Evidence drawer of both the hosted page and the offline file must read \`${pack.build_fingerprint}\`.`,
    'A mismatch means one of them is stale; prefer the offline file and re-deploy afterwards.', '');
  return `${lines.join('\n')}\n`;
}

function screenshotDoc(pack, matrix) {
  const viewport = new Map(matrix.viewports.map((entry) => [entry.id, entry]));
  const lines = [
    '# Standard screenshot review pack',
    '',
    `Generated — build \`${pack.build_fingerprint}\`. ${matrix.cells.length} cells.`,
    '',
    matrix.purpose,
    '',
    '## Capture rules', '',
  ];
  for (const rule of matrix.capture_rules) lines.push(`- ${rule}`);
  let group = null;
  for (const cell of matrix.cells) {
    if (cell.group !== group) {
      group = cell.group;
      lines.push('', `## ${group.replace(/_/g, ' ')}`, '');
    }
    const { width, height } = viewport.get(cell.viewport_id);
    const options = Object.entries(cell.options)
      .filter(([, value]) => value !== false && value !== null)
      .map(([key, value]) => `${key}=${value}`);
    lines.push(`- [ ] \`${cell.id}\` — ${width}×${height}${options.length ? ` · ${options.join(', ')}` : ''}`);
    lines.push(`      \`${cell.url_hash}\``);
  }
  lines.push('', 'Record captured cell IDs, a reviewer, and a date in',
    '`data/release_gates.json:visual_matrix` before that gate may be marked PASS.', '');
  return `${lines.join('\n')}\n`;
}

// --- assemble ---------------------------------------------------------------
const model = await TitinModel.create(nodeReader());
const fingerprint = buildFingerprint();
const pack = createReleasePack(model, { buildFingerprint: fingerprint });
const { min, max } = model.slRange();
const matrix = createVisualMatrix(model, {
  views: Object.keys(VIEWS),
  closeups: Object.keys(CLOSEUPS),
  scales: Object.values(SCALES),
  targets: [...model.titinRegions().map((region) => region.id), ...Object.keys(COMPONENTS)],
  hiddenTargetsByScale: { [SCALES.detail]: TitinVisualization.DETAIL_HIDDEN },
  minLength: min,
  maxLength: max,
});

const files = new Map([
  ['CLAIM_MATRIX.md', claimMatrixDoc(pack)],
  ['LIMITATIONS.md', limitationsDoc(pack)],
  ['PRESENTER_SCRIPT.md', presenterDoc(pack)],
  ['PREFLIGHT.md', preflightDoc(pack, matrix)],
  ['SCREENSHOT_PACK.md', screenshotDoc(pack, matrix)],
]);
for (const slide of pack.fallback_slides) {
  const draw = DRAW[slide.kind];
  if (!draw) throw new Error(`build_release_pack: no renderer for slide kind '${slide.kind}'`);
  files.set(`fallback/${slide.id}.svg`, draw(slide));
}
files.set('MANIFEST.json', `${JSON.stringify({
  schema: 'titin-release-manifest/1',
  build_fingerprint: fingerprint,
  fingerprint_inputs: FINGERPRINT_INPUTS,
  standalone_bytes: read('index.html').length,
  artifacts: [...files.keys()].sort(),
  fallback_slides: pack.fallback_slides.map((slide) => slide.id),
  screenshot_cells: matrix.cells.length,
  presenter_seconds: pack.presenter_script.estimated_seconds,
  generated_by: 'scripts/build_release_pack.mjs',
}, null, 2)}\n`);

const check = process.argv.includes('--check');
if (check) {
  const problems = [];
  const present = existsSync(OUT)
    ? new Set(readdirSync(OUT, { recursive: true })
      .map((entry) => String(entry).split('\\').join('/'))
      .filter((entry) => entry.includes('.')))
    : new Set();
  for (const [name, content] of files) {
    const path = join(OUT, name);
    if (!existsSync(path)) problems.push(`${name} is missing`);
    else if (readFileSync(path, 'utf8') !== content) problems.push(`${name} is stale`);
    present.delete(name);
  }
  for (const orphan of present) problems.push(`${orphan} is no longer generated`);
  if (problems.length) {
    console.error('release pack is out of date; run npm run pack\n  - '
      + problems.join('\n  - '));
    process.exit(1);
  }
  console.log(`release pack is current (${files.size} artifacts, build ${fingerprint})`);
} else {
  if (existsSync(OUT)) rmSync(OUT, { recursive: true });
  mkdirSync(join(OUT, 'fallback'), { recursive: true });
  for (const [name, content] of files) writeFileSync(join(OUT, name), content);
  console.log(`wrote release/  ${files.size} artifacts, build ${fingerprint}`);
  console.log(`  ${pack.claim_matrix.length} claims, `
    + `${pack.limitations.reduce((sum, group) => sum + group.entries.length, 0)} non-claims, `
    + `${pack.fallback_slides.length} fallback slides, ${matrix.cells.length} screenshot cells`);
}
