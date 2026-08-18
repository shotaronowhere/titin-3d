/**
 * capture_visual_matrix.mjs — emit the SC-24 semantic screenshot manifest.
 *
 * This environment has no browser, so this script does not take screenshots. It
 * produces the thing that makes the capture reproducible by anyone who does have
 * one: for every cell, the viewport to set and the URL hash to open, generated
 * from the same StoryController the application uses and round-trip checked at
 * construction.
 *
 *   node scripts/capture_visual_matrix.mjs              # human checklist
 *   node scripts/capture_visual_matrix.mjs --json       # machine manifest
 *   node scripts/capture_visual_matrix.mjs --check      # gate: matrix is well formed
 *
 * Capture against the committed standalone index.html, not a dev server, so what
 * is reviewed is what ships. Pin the device pixel ratio to 1 and disable
 * animation; the two option axes that are not URL state — the optional MyBP-C
 * layer and the reduced-motion preference — are named per cell.
 */

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { TitinVisualization, SCALES } from '../src/api/TitinVisualization.js';
import { COMPONENTS } from '../src/render/SarcomereScene.js';
import { VIEWS, CLOSEUPS } from '../src/render/Viewer.js';
import { createVisualMatrix } from '../src/presentation/VisualMatrix.js';

const model = await TitinModel.create(nodeReader());
const { min, max } = model.slRange();
const regionTargets = model.titinRegions().map((region) => region.id);
const componentTargets = Object.keys(COMPONENTS);
const matrix = createVisualMatrix(model, {
  views: Object.keys(VIEWS),
  closeups: Object.keys(CLOSEUPS),
  scales: Object.values(SCALES),
  targets: [...regionTargets, ...componentTargets],
  regionTargets,
  componentTargets,
  hiddenTargetsByScale: { [SCALES.detail]: TitinVisualization.DETAIL_HIDDEN },
  minLength: min,
  maxLength: max,
});

const args = process.argv.slice(2);

if (args.includes('--check')) {
  const viewports = new Set(matrix.cells.map((cell) => cell.viewport_id));
  const groups = new Set(matrix.cells.map((cell) => cell.group));
  const missing = matrix.required_groups.filter((group) => !groups.has(group));
  if (missing.length || viewports.size !== matrix.viewports.length) {
    console.error(`visual matrix incomplete: missing groups ${missing.join(', ') || 'none'}, `
      + `${viewports.size}/${matrix.viewports.length} viewports used`);
    process.exit(1);
  }
  console.log(`visual matrix is well formed (${matrix.cells.length} reproducible cells, `
    + `${matrix.viewports.length} viewports, ${groups.size} groups)`);
} else if (args.includes('--json')) {
  console.log(JSON.stringify(matrix, null, 2));
} else {
  const viewport = new Map(matrix.viewports.map((entry) => [entry.id, entry]));
  console.log('# SC-8 visual capture checklist\n');
  console.log(`${matrix.cells.length} cells. ${matrix.purpose}\n`);
  console.log('Capture rules:');
  for (const rule of matrix.capture_rules) console.log(`  - ${rule}`);
  console.log('\nLegacy cell disposition:');
  for (const row of matrix.legacy_disposition) {
    console.log(`  - ${row.old_cell_id} -> ${row.new_cell_id}: ${row.reason}`);
  }
  let group = null;
  for (const cell of matrix.cells) {
    if (cell.group !== group) {
      group = cell.group;
      console.log(`\n## ${group}`);
    }
    const { width, height } = viewport.get(cell.viewport_id);
    const options = Object.entries(cell.options)
      .filter(([, value]) => value !== false && value !== null)
      .map(([key, value]) => `${key}=${value}`);
    console.log(`  [ ] ${cell.id}`);
    console.log(`      ${width}x${height}  ${cell.url_hash}`);
    if (options.length) console.log(`      options: ${options.join(', ')}`);
    console.log(`      ${cell.label}`);
  }
  console.log('\nRecord captured cell IDs in data/release_gates.json:visual_matrix.captured_cells,');
  console.log('with a named reviewer and date, before that gate may be marked PASS.');
}
