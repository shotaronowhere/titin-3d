/**
 * SC-8 integrated destructive controls.
 *
 * The plan lists seven things the showcase must be able to REJECT. Each is
 * exercised here against the real model and the real validators, in one place, so
 * the release gate has a single auditable answer rather than seven scattered
 * assertions a reader has to go and find.
 *
 * Two of the controls are about invariance rather than rejection — a selection
 * must not move geometry, and length must not imply activation. An invariance
 * check that nothing can fail is worthless, so those are run twice: once against
 * the real implementation, which must pass, and once against a deliberate
 * saboteur, which must be caught. That is what shows the check has teeth.
 */

import assert from 'node:assert/strict';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { SarcomereScene } from '../src/render/SarcomereScene.js';
import { TitinVisualization } from '../src/api/TitinVisualization.js';
import { validateMyBPCContext } from '../src/geometry/MyBPCContext.js';
import { validateZDiscDetail } from '../src/geometry/ZDiscDetail.js';
import { checkPresentationSpec } from '../src/presentation/StoryController.js';

const SL = 2200;
const model = await TitinModel.create(nodeReader());
const passed = [];

function control(name, run) {
  try {
    run();
  } catch (error) {
    console.error(`  FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  passed.push(name);
  console.log(`  PASS rejected ${name}`);
}

/** Load a model from a mutated spec, bypassing cross-file validation. */
async function mutatedModel(mutate) {
  const source = nodeReader();
  return TitinModel.create(async (name) => {
    const value = await source(name);
    mutate(name, value);
    return value;
  }, { validate: false });
}

function expectThrows(fn, pattern, label) {
  assert.throws(fn, pattern, label);
}

async function expectRejects(fn, pattern, label) {
  await assert.rejects(fn, pattern, label);
}

console.log('== SC-8 integrated destructive controls ==');

// 1 — an unapproved cardiac MyBP-C coordinate adopted into the retained model.
const cardiacMyBPC = await mutatedModel((name, value) => {
  if (name !== 'geometry_sources.json') return;
  for (const parameter of value.parameters) {
    if (parameter.component === 'MyBP-C') {
      parameter.primary_source = 'PDB:8G4L';
      parameter.muscle_type = 'cardiac';
    }
  }
});
control('a cardiac source substituted for the skeletal MyBP-C parameters', () => {
  expectThrows(() => cardiacMyBPC.mybpcContextAt(SL, { rings: 1 }),
    /no longer cites the admitted fast-skeletal source/);
});

// 2 — a schematic MyBP-C path promoted to measured placement evidence.
control('a MyBP-C placement promoted above SCHEMATIC', () => {
  const promoted = structuredClone(model.mybpcContextAt(SL, { rings: 1 }));
  promoted.placement_evidence_class = 'MEASURED';
  expectThrows(() => validateMyBPCContext(promoted), /must remain SCHEMATIC/);
});

// 3 — an M-line box assigned the bare-zone width.
const mlineBox = await mutatedModel((name, value) => {
  if (name !== 'sarcomere.json') return;
  const thick = value.components.find((component) => component.id === 'thick_filament');
  const mline = value.components.find((component) => component.id === 'mline');
  mline.dimensions_nm.width_X = thick.dimensions_nm.bare_zone_center;
});
control('an M-line given the 160 nm bare-zone width', () => {
  expectThrows(() => mlineBox.mbandDetailAt(SL, { rings: 1 }),
    /would restore the forbidden bare-zone slab/);
});

// 4 — a single titin chain inserted into the telethonin sandwich.
control('a single-chain telethonin sandwich', () => {
  const single = structuredClone(model.zdiscDetailAt(SL, { rings: 1 }));
  single.telethonin_complex.titin_chains = [single.telethonin_complex.titin_chains[0]];
  single.telethonin_complex.stoichiometry.titin_z1z2 = 1;
  expectThrows(() => validateZDiscDetail(single),
    /two titin Z1Z2 chains and one telethonin/);
});

// 5 — a presentation claim with neither a source nor a SCHEMATIC designation.
control('a presentation claim with no source and no SCHEMATIC status', () => {
  const stripped = structuredClone(model.spec.presentation);
  const chapter = stripped.guided_chapters[0];
  chapter.source_ids = [];
  chapter.evidence_class = 'MEASURED';
  const problems = checkPresentationSpec(stripped, {
    claims: model.spec.showcaseClaims,
    claimSupport: model.spec.claimSupport,
    references: model.spec.references,
    sarcomere: model.spec.sarcomere,
    titin: model.spec.titin,
    states: model.spec.states,
    annotations: model.spec.annotations,
    scenes: model.spec.scenes,
  });
  assert.ok(problems.some((problem) => /no source_ids or SCHEMATIC designation/.test(problem)),
    `expected an unsourced-claim problem, got: ${problems.join('; ')}`);
});

// 6 — automatic coupling of a short sarcomere length to biochemical activation.
control('sarcomere length coupled to activation', () => {
  const facade = Object.create(TitinVisualization.prototype);
  facade.model = model;
  facade.scale = 'context';
  facade._state = { sarcomere_length_nm: 1900 };
  facade._presentationState = {
    audience_mode: 'guided',
    story_step: null,
    selected_component_or_region: null,
    regulatory_state: null,
    camera_preset: 'view.longitudinal',
    evidence_display: false,
  };
  // The public state refuses to carry activation at all.
  expectThrows(() => facade.setPresentationState({ regulatory_state: 'activated' }),
    /not available.*does not encode activation/i);
  // And the record refuses to describe a length preset as activation-dependent.
  const coupled = structuredClone(model.spec.presentation);
  coupled.length_presets.find((preset) => preset.sarcomere_length_nm === 1900)
    .activation_independent = false;
  const problems = checkPresentationSpec(coupled, {
    claims: model.spec.showcaseClaims,
    claimSupport: model.spec.claimSupport,
    references: model.spec.references,
    sarcomere: model.spec.sarcomere,
    titin: model.spec.titin,
    states: model.spec.states,
    annotations: model.spec.annotations,
    scenes: model.spec.scenes,
  });
  assert.ok(problems.some((problem) => /separate geometry from activation/.test(problem)),
    `expected an activation-coupling problem, got: ${problems.join('; ')}`);
});

// 7 — a selected region that changes geometry or evidence opacity.
function selectionSnapshot(scene) {
  const rows = [];
  scene.root.traverse((object) => {
    if (!object.material || !object.geometry) return;
    const position = object.geometry.getAttribute?.('position');
    rows.push([
      object.name,
      object.material.opacity,
      object.position.toArray().join(','),
      position ? position.count : null,
      position ? Array.from(position.array.slice(0, 12)).join(',') : null,
    ].join('|'));
  });
  return rows.sort().join('\n');
}

function buildScene() {
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(SL, { rings: 1 }), model.domainInstancesAt(SL), {
    latticeScope: 'local',
    mirror: true,
    titinStrands: false,
    titinPath: model.backboneAt(SL),
    domainBatches: model.instancingPlanAt(SL),
    domainStrands: [0],
    presentationMode: 'evidence',
    viewWidthNm: 2500,
    viewportPx: 1200,
  });
  return scene;
}

control('a selection that moves geometry or changes evidence opacity', () => {
  // The real implementation must leave both untouched.
  const scene = buildScene();
  const before = selectionSnapshot(scene);
  scene.setTitinRegionHighlight('PEVK');
  assert.equal(selectionSnapshot(scene), before,
    'the real selection channel moved geometry or opacity');
  scene.setTitinRegionHighlight(null);
  scene.clear();

  // A saboteur that also dims the selection must be caught by that same check,
  // or the invariance above would be unfalsifiable.
  const sabotaged = buildScene();
  const baseline = selectionSnapshot(sabotaged);
  sabotaged.setTitinRegionHighlight('PEVK');
  sabotaged.root.traverse((object) => {
    if (object.userData?.titin_region === 'PEVK' && object.material) {
      object.material.opacity *= 0.5;
    }
  });
  assert.notEqual(selectionSnapshot(sabotaged), baseline,
    'the invariance check failed to notice a selection that changed opacity');
  sabotaged.clear();
});

console.log(`\nSHOWCASE RELEASE NEGATIVE CONTROLS ${process.exitCode ? 'FAILED' : 'PASSED'}`
  + ` (${passed.length}/7 controls)`);
if (passed.length !== 7) {
  console.error(`expected 7 controls, ${passed.length} passed`);
  process.exitCode = 1;
}
