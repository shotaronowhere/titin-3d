#!/usr/bin/env node
/**
 * build_picking_hit_grid.mjs — generate the SC-25 picking hit-grid fixture.
 *
 *   node scripts/build_picking_hit_grid.mjs            # write the fixture
 *   node scripts/build_picking_hit_grid.mjs --check    # regenerate and compare
 *
 * The fixture is a set of RULES plus the samples those rules produce. Nothing in
 * it is chosen by hand and nothing in it is a screen coordinate: a sample names a
 * titin path, an arc-length offset along it, a ring radius in CSS pixels, and a
 * direction. `test/browser/picking.spec.js` re-derives the pixel positions in the
 * running page, which is what stops the fixture becoming a list of coordinates
 * that happened to work.
 *
 * The one browser-derived decision here is VISIBILITY: an offset is kept only
 * when its projection lands inside the canvas with the declared edge margin. That
 * is a property of the camera and the render — the plan asks for a grid built
 * "from projected visible titin paths" — and it involves no picking at all. The
 * resolver is never consulted while the fixture is built.
 *
 * Sample points come from the renderer's own `titinPickPaths()`, so the grid
 * samples the molecule that is DRAWN rather than the canonical backbone the
 * drawing is derived from.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { TitinVisualization, SCALES } from '../src/api/TitinVisualization.js';
import { COMPONENTS } from '../src/render/SarcomereScene.js';
import { VIEWS, CLOSEUPS } from '../src/render/Viewer.js';
import { SceneController } from '../src/presentation/SceneController.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = join(ROOT, 'test/fixtures/picking_hit_grid.json');
const CHECK = process.argv.includes('--check');
const PORT = 4181;

/**
 * The reviewed sampling rules. Fixed before any sample was generated and before
 * the resolver ran once: the intended-hit radius is derived from the reviewed
 * `emphasized_titin_tolerance_px`, not measured from what the resolver achieves.
 */
export const HIT_GRID_RULES = Object.freeze({
  path_sample_spacing_nm: 30,
  ring_radii_px: Object.freeze([0, 4, 8, 14]),
  directions_per_ring: 6,
  first_direction_deg: 0,
  intended_hit_max_ring_px: 8,
  edge_margin_px: 24,
  sample_origin: 'renderer titin pick centreline for the representative strand',
  offset_measure: 'cumulative arc length along the drawn polyline',
  intended_hit_rule: 'ring_px <= intended_hit_max_ring_px',
  visibility_rule:
    'an offset is sampled only when its projection is visible and at least '
    + 'edge_margin_px inside the canvas',
});

/** Release viewports the grid is generated at. */
export const HIT_GRID_VIEWPORTS = Object.freeze([
  Object.freeze({ id: 'laptop', width: 1280, height: 720 }),
  Object.freeze({ id: 'mobile', width: 375, height: 812 }),
]);

/** Offsets and directions one kept path offset expands to, in fixed order. */
export function ringSamples(rules) {
  const samples = [];
  for (const ring of rules.ring_radii_px) {
    const directions = ring === 0 ? 1 : rules.directions_per_ring;
    for (let index = 0; index < directions; index += 1) {
      samples.push({
        ring_px: ring,
        direction_deg: ring === 0
          ? rules.first_direction_deg
          : rules.first_direction_deg + (360 / rules.directions_per_ring) * index,
        intended_titin_hit: ring <= rules.intended_hit_max_ring_px,
      });
    }
  }
  return samples;
}

async function sceneHashes() {
  const model = await TitinModel.create(nodeReader());
  const regions = model.titinRegions().map((region) => region.id);
  const components = Object.keys(COMPONENTS);
  const { min, max } = model.slRange();
  const controller = new SceneController(model.spec.scenes, {
    views: Object.keys(VIEWS),
    closeups: Object.keys(CLOSEUPS),
    scales: Object.values(SCALES),
    targets: [...regions, ...components],
    regionTargets: regions,
    componentTargets: components,
    hiddenTargetsByScale: { [SCALES.detail]: TitinVisualization.DETAIL_HIDDEN },
    minLength: min,
    maxLength: max,
    claimIds: model.spec.claimSupport.claims.map((claim) => claim.id),
  }, { presentation: model.spec.presentation });
  const base = controller.defaultState();
  return controller.order.map((id) => {
    const state = controller.resolveScene(id, base);
    return {
      scene_id: id,
      label: controller.scene(id).label,
      camera_preset: state.camera_preset,
      sarcomere_length_nm: state.sarcomere_length_nm,
      url_hash: controller.serialize(state),
    };
  });
}

/** Sample one scene at one viewport inside the page. */
const collectScene = (rules) => {
  const viz = window.titinVisualization;
  const canvas = document.querySelector('#canvas');
  const rect = canvas.getBoundingClientRect();
  const paths = viz.titinPickPaths().paths;
  const kept = [];
  for (const path of paths) {
    // Cumulative arc length along the polyline the molecule is drawn on.
    const cumulative = [0];
    for (let i = 1; i < path.points.length; i += 1) {
      const a = path.points[i - 1];
      const b = path.points[i];
      cumulative.push(cumulative[i - 1]
        + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
    }
    const total = cumulative.at(-1);
    const offsets = [];
    for (let s = 0; s < total; s += rules.path_sample_spacing_nm) offsets.push(s);
    if (!offsets.length) continue;
    const records = offsets.map((offset) => {
      let index = 1;
      while (index < cumulative.length - 1 && cumulative[index] < offset) index += 1;
      const span = cumulative[index] - cumulative[index - 1];
      const t = span > 0 ? (offset - cumulative[index - 1]) / span : 0;
      const a = path.points[index - 1];
      const b = path.points[index];
      return {
        id: `${path.region_id}@${offset}`,
        offset,
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
      };
    });
    const projected = viz.projectPresentationAnchors(records);
    for (let i = 0; i < records.length; i += 1) {
      const point = projected[i];
      const inside = point.visible
        && point.x_px >= rules.edge_margin_px
        && point.y_px >= rules.edge_margin_px
        && point.x_px <= rect.width - rules.edge_margin_px
        && point.y_px <= rect.height - rules.edge_margin_px;
      if (!inside) continue;
      kept.push({ path_id: path.region_id, path_offset_nm: records[i].offset });
    }
  }
  return {
    canvas: { width: rect.width, height: rect.height },
    path_ids: paths.map((path) => path.region_id),
    kept,
  };
};

async function generate() {
  const scenes = await sceneHashes();
  const server = spawn('node', ['scripts/serve_browser_tests.mjs', '--port', String(PORT)],
    { cwd: ROOT, stdio: 'ignore' });
  const browser = await chromium.launch();
  const rows = [];
  try {
    await new Promise((resolve) => { setTimeout(resolve, 1200); });
    for (const viewport of HIT_GRID_VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });
      for (const scene of scenes) {
        await page.goto(`http://127.0.0.1:${PORT}/index.html${scene.url_hash}`);
        await page.waitForFunction(() => window.__titinBoot?.ready === true);
        await page.waitForTimeout(500);
        const collected = await page.evaluate(collectScene, HIT_GRID_RULES);
        rows.push({
          id: `${scene.scene_id}@${viewport.id}`,
          scene_id: scene.scene_id,
          scene_label: scene.label,
          viewport_id: viewport.id,
          viewport: { width: viewport.width, height: viewport.height },
          url_hash: scene.url_hash,
          sarcomere_length_nm: scene.sarcomere_length_nm,
          camera_preset: scene.camera_preset,
          canvas: collected.canvas,
          target_path_ids: collected.path_ids,
          // Offsets only. Every offset is sampled by the SAME declared ring table,
          // so the fixture cannot contain a hand-added or hand-removed sample: the
          // cross-product is structural rather than asserted.
          path_offsets: collected.kept.map((offset) => [offset.path_id, offset.path_offset_nm]),
        });
      }
      await page.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
  const ringTable = ringSamples(HIT_GRID_RULES);
  const intendedPerOffset = ringTable.filter((ring) => ring.intended_titin_hit).length;
  const offsets = rows.reduce((sum, row) => sum + row.path_offsets.length, 0);
  const samples = offsets * ringTable.length;
  const intended = offsets * intendedPerOffset;
  return {
    schema: 'titin-picking-hit-grid/1',
    purpose: 'Immutable SC-25 picking coverage grid. Samples are generated from the '
      + 'declared rules against the projected visible titin paths of fixed release '
      + 'scenes; no screen coordinate is stored and none was hand-selected.',
    generated_by: 'scripts/build_picking_hit_grid.mjs',
    depth: 'learn',
    contract: {
      immutability: "Samples are the declared rules' cross-product and no screen coordinate is stored, so an individual sample cannot be added, removed, or nudged: `node scripts/build_picking_hit_grid.mjs --check` regenerates from the rules and requires byte equality. Editing a rule, a scene, or a viewport requires an entry in `migrations` stating what changed and why. The fixture may never be edited merely to make the resolver pass.",
      generation_order: "The reviewed picking policy was written first and the sampling rules were derived from it \u2014 the intended-hit radius from `emphasized_titin_tolerance_px`, never from a measurement of what the resolver achieves. The fixture was generated and committed in the same commit as the resolver rather than strictly before it; see docs/sprint-reports/SC-25.md for that disclosure and the structural protections that stand in for the ordering.",
      denominator: 'every sample marked intended_titin_hit, across the complete fixture',
      migrations: [],
    },
    rules: HIT_GRID_RULES,
    // The declared expansion of one kept path offset, in fixed order. This is the
    // fixture's statement of "which samples are intended titin hits".
    ring_samples: ringTable,
    viewports: HIT_GRID_VIEWPORTS.map((viewport) => ({ ...viewport })),
    totals: {
      scenes: rows.length,
      path_offsets: offsets,
      samples_per_offset: ringTable.length,
      samples,
      intended,
    },
    scenes: rows,
  };
}

/**
 * Only when run as a command.
 *
 * `HIT_GRID_RULES` and {@link ringSamples} are the fixture's contract and the
 * SC-25 Node gate imports them, so this module must be importable without side
 * effects. Without this guard the gate launched a browser and REWROTE the fixture
 * before asserting anything about it — which silently repaired every hand-edit the
 * destructive controls exist to catch.
 */
const RUN_AS_COMMAND = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

async function main() {
  const grid = await generate();
  // A regeneration inherits the contract's migration history: the samples are
  // rule-derived and may be rebuilt, but the record of WHY the committed grid ever
  // changed is a human statement and is never regenerated away.
  if (existsSync(FIXTURE)) {
    const previous = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    grid.contract.migrations = previous.contract?.migrations ?? [];
  }
  const text = `${JSON.stringify(grid, null, 2)}\n`;
  if (CHECK) {
    if (!existsSync(FIXTURE)) {
      console.error('picking hit grid: fixture is missing');
      process.exit(1);
    }
    const committed = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    const fresh = JSON.parse(text);
    // Migrations are a human record; everything else must reproduce exactly.
    fresh.contract.migrations = committed.contract.migrations;
    if (JSON.stringify(fresh) !== JSON.stringify(committed)) {
      console.error('picking hit grid: the committed fixture is not what the declared '
        + 'rules produce against the current render');
      process.exit(1);
    }
    console.log(`picking hit grid: PASS (${committed.totals.samples} samples, `
      + `${committed.totals.intended} intended, ${committed.totals.scenes} scene cells)`);
  } else {
    writeFileSync(FIXTURE, text);
    console.log(`picking hit grid written: ${grid.totals.samples} samples, `
      + `${grid.totals.intended} intended, ${grid.totals.scenes} scene cells`);
  }
}

if (RUN_AS_COMMAND) await main();
