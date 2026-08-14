/** SC-23 gates: lay curriculum, declarative scenes, reversible state, and transcripts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { TitinVisualization, SCALES } from '../src/api/TitinVisualization.js';
import { COMPONENTS } from '../src/render/SarcomereScene.js';
import { VIEWS, CLOSEUPS } from '../src/render/Viewer.js';
import { StoryController, checkSemanticScenes } from '../src/presentation/StoryController.js';
import { resolveSourceContext } from '../src/presentation/Bibliography.js';
import { createReleasePack, validateReleasePack } from '../src/presentation/ReleasePack.js';
import { SWEEP, sweepElapsedAtLength, sweepLength } from '../src/presentation/StretchSweep.js';

const model = await TitinModel.create(nodeReader());
const presentation = model.spec.presentation;
const scenes = model.spec.scenes;
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const packageRecord = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const report = readFileSync(new URL('../docs/sprint-reports/SC-23.md', import.meta.url), 'utf8');
const { min, max } = model.slRange();
const controller = new StoryController(presentation, {
  views: Object.keys(VIEWS),
  closeups: Object.keys(CLOSEUPS),
  scales: Object.values(SCALES),
  targets: [...model.titinRegions().map((region) => region.id), ...Object.keys(COMPONENTS)],
  hiddenTargetsByScale: { [SCALES.detail]: TitinVisualization.DETAIL_HIDDEN },
  minLength: min,
  maxLength: max,
}, scenes);

const chapterIds = [
  'meet_sarcomere', 'follow_titin', 'molecular_architecture', 'stretch_spring',
  'inspect_anchors', 'scaffold_thick_filament', 'knowledge_recap',
];
const requiredFields = [
  'id', 'legacy_ids', 'title', 'learning_objective', 'lay_summary', 'claim_ids',
  'semantic_scene_id', 'source_filter', 'state_change_announcement',
  'recommended_state', 'next_actions',
];

test('SC23: schema v2 carries the ordered seven-outcome curriculum within its reviewed budget', () => {
  assert.equal(presentation.schema, 'titin-presentation/2');
  assert.equal(presentation.version, 2);
  assert.deepEqual(presentation.guided_chapters.map((chapter) => chapter.id), chapterIds);
  for (const chapter of presentation.guided_chapters) {
    for (const field of requiredFields) assert.ok(Object.hasOwn(chapter, field), `${chapter.id}.${field}`);
    const words = chapter.lay_summary.trim().split(/\s+/).length;
    assert.ok(words >= 25 && words <= 45, `${chapter.id} has ${words} words`);
    assert.equal(chapter.narration, chapter.lay_summary);
    assert.match(chapter.state_change_announcement, /length/i);
    assert.ok(chapter.claim_ids.length > 0);
  }
});

test('SC23: text alone teaches the required concepts and expands first-use vocabulary', () => {
  const text = presentation.guided_chapters.map((chapter) => chapter.narration).join('\n');
  for (const pattern of [
    /sarcomere.*repeating contractile unit.*Z-discs/is,
    /adenosine triphosphate \(ATP\)-powered myosin.*actin/is,
    /titin.*passive spring.*scaffold.*not the motor/is,
    /Z-disc.*M-line.*I-band.*elastic.*A-band.*thick filament/is,
    /folded immunoglobulin-like \(Ig\).*fibronectin type III \(Fn3\)/is,
    /disordered PEVK spring.*does not place Fn3.*elastic I-band/is,
    /I-band lengthens.*A-band.*approximately fixed.*rising passive force/is,
    /added length.*incremental compliance—how readily the next small stretch occurs/is,
    /telethonin.*not the sole force path.*M-line.*unresolved/is,
    /representative molecule.*copy number.*azimuth.*register.*not encoded/is,
    /passive spring.*thick-filament scaffold.*interaction\/signaling platform/is,
    /Measured comes from observations.*inferred from interpretation.*modeled from equations.*schematic means illustrative/is,
  ]) assert.match(text, pattern);
  for (const expansion of [
    'adenosine triphosphate (ATP)', 'immunoglobulin-like (Ig)',
    'fibronectin type III (Fn3)', 'disordered PEVK spring',
  ]) assert.ok(text.toLowerCase().indexOf(expansion.toLowerCase()) >= 0,
    `${expansion} is not expanded inline`);
});

test('SC23: scenes are a closed declarative vocabulary with no scientific constants', () => {
  assert.equal(scenes.schema, 'titin-semantic-scenes/1');
  assert.equal(scenes.primary_presenter_scene_id, 'meet_sarcomere');
  assert.deepEqual(Object.keys(scenes.scenes), chapterIds);
  const forbidden = /coordinate|force_value|evidence_class|(?:^|_)nm(?:$|_)/i;
  const visit = (value, path = '') => {
    if (Array.isArray(value)) value.forEach((child, index) => visit(child, `${path}[${index}]`));
    else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        assert.doesNotMatch(key, forbidden, `${path}.${key}`);
        visit(child, `${path}.${key}`);
      }
    } else assert.notEqual(typeof value, 'number', `${path} contains a biological constant`);
  };
  visit(scenes.scenes);
  const context = {
    presentation,
    claimSupport: model.spec.claimSupport,
    sarcomere: model.spec.sarcomere,
    titin: model.spec.titin,
    annotations: model.spec.annotations,
  };
  assert.deepEqual(checkSemanticScenes(scenes, context), []);
  const rejected = (mutate, pattern) => {
    const corrupted = structuredClone(scenes);
    mutate(corrupted.scenes.meet_sarcomere);
    assert.match(checkSemanticScenes(corrupted, context).join('\n'), pattern);
  };
  rejected((scene) => { scene.spacing = 43.78; }, /unexpected fields.*spacing/i);
  rejected((scene) => { scene.label = 43.78; }, /forbidden numeric scientific value/i);
  rejected((scene) => { scene.label = 'MEASURED'; }, /forbidden evidence-class value/i);
  rejected((scene) => { scene.selection.note = 'display only'; },
    /selection has unexpected fields.*note/i);
  for (const chapter of presentation.guided_chapters) {
    const scene = controller.scene(chapter.semantic_scene_id);
    assert.ok(scene, chapter.semantic_scene_id);
    assert.deepEqual(scene.claim_ids, chapter.claim_ids);
    assert.equal(scene.length_policy.kind, 'preserve');
  }
  assert.equal(controller.scene('invented_scene'), null);
});

test('SC23: legacy links resolve visibly and serialize only canonical chapter IDs', () => {
  const aliases = presentation.chapter_aliases.aliases;
  assert.deepEqual(aliases, {
    orientation: 'meet_sarcomere',
    architecture: 'molecular_architecture',
    elastic_regions: 'stretch_spring',
    anchors: 'inspect_anchors',
    anchored_scaffold: 'scaffold_thick_filament',
    evidence_audit: 'knowledge_recap',
    provenance_pipeline: 'knowledge_recap',
  });
  for (const [legacy, canonical] of Object.entries(aliases)) {
    const decoded = controller.parse(`#mode=guided&step=${legacy}&sl=2317`);
    const recommended = controller.chapter(canonical).recommended_state;
    assert.equal(decoded.state.story_step, canonical);
    assert.equal(decoded.state.sarcomere_length_nm, 2317);
    assert.equal(decoded.state.scale, recommended.scale);
    assert.equal(decoded.state.camera_preset, recommended.camera_preset);
    assert.equal(decoded.state.selected_component_or_region,
      recommended.selected_component_or_region);
    assert.match(decoded.issues.join(' '), /Legacy chapter/);
    assert.match(controller.serialize(decoded.state), new RegExp(`step=${canonical}`));
  }
});

test('SC23: chapter navigation preserves length and the sweep starts at the current value', () => {
  for (const chapter of presentation.guided_chapters) {
    const state = controller.stateForChapter(chapter.id, { currentLengthNm: 2317 });
    assert.equal(state.sarcomere_length_nm, 2317, chapter.id);
  }
  const bounds = { minNm: 2000, maxNm: 2400, periodMs: SWEEP.period_ms };
  const elapsed = sweepElapsedAtLength(2317, bounds);
  assert.equal(sweepLength(elapsed, bounds), 2317);
  assert.doesNotMatch(page, /function applyChapter[\s\S]{0,2500}slider\.value\s*=\s*chapter\.recommended_state/);
  const actions = presentation.guided_chapters.find((chapter) => chapter.id === 'stretch_spring')
    .next_actions.map((action) => action.label);
  assert.ok(actions.includes('Set demonstration start'));
  assert.ok(actions.includes('Restore previous length'));
  assert.match(page, /demonstrationRestoreLength/);
});

test('SC23: a semantic scene outranks its chapter in contextual source resolution', () => {
  const registry = { references: model.spec.references, claimSupport: model.spec.claimSupport };
  const scene = scenes.scenes.stretch_spring;
  const chapter = presentation.guided_chapters.find((row) => row.id === 'inspect_anchors');
  const resolved = resolveSourceContext(registry, {
    semanticScene: { label: scene.label, claimIds: scene.claim_ids },
    currentChapter: { label: chapter.title, claimIds: chapter.claim_ids },
  });
  assert.equal(resolved.scope, 'scene');
  assert.match(resolved.label, /Stretch/);
});

test('SC23: text and screen-reader transcripts share sequence, claims, announcements, and pacing', () => {
  const pack = createReleasePack(model);
  assert.equal(validateReleasePack(pack), pack);
  assert.equal(pack.transcripts.schema, 'titin-transcripts/1');
  assert.ok(pack.transcripts.estimated_seconds >= 110 && pack.transcripts.estimated_seconds <= 190);
  assert.deepEqual(pack.transcripts.text_only.map((row) => row.id), chapterIds);
  assert.deepEqual(pack.transcripts.screen_reader.map((row) => row.id), chapterIds);
  for (let index = 0; index < chapterIds.length; index += 1) {
    const text = pack.transcripts.text_only[index];
    const spoken = pack.transcripts.screen_reader[index];
    assert.deepEqual(spoken.claim_ids, text.claim_ids);
    assert.ok(spoken.spoken_sequence.includes(text.state_change_announcement));
    assert.ok(spoken.spoken_sequence.includes(text.narration));
  }
  assert.equal(pack.scientific_authority.presentation_content_review.release_ready, true);
  assert.equal(pack.scientific_authority.presentation_content_review.sprint_status,
    'COMPLETE');
  for (const claim of pack.scientific_authority.presentation_content_review.required_claims) {
    assert.equal(claim.review_status, 'APPROVED');
    assert.equal(claim.approval_authority, 'PROJECT_OWNER');
    assert.equal(claim.independent_human_review_status, 'NOT_PERFORMED');
  }
  const corrupted = structuredClone(pack);
  corrupted.transcripts.screen_reader[0].spoken_sequence.splice(1, 1);
  assert.throws(() => validateReleasePack(corrupted), /transcripts are missing concepts, inaccessible/i);
  const authorityErased = structuredClone(pack);
  authorityErased.scientific_authority.presentation_content_review
    .required_claims[0].approval_authority = null;
  assert.throws(() => validateReleasePack(authorityErased), /content-review authority is missing/i);
});

test('SC23: generated transcripts, package gates, and handoff record are present', () => {
  for (const name of ['LEARN_TRANSCRIPT.md', 'SCREEN_READER_TRANSCRIPT.md']) {
    assert.ok(existsSync(new URL(`../release/${name}`, import.meta.url)), `${name} missing`);
  }
  assert.match(packageRecord.scripts['test:sc23'], /showcase_phase23\.test\.js/);
  assert.match(packageRecord.scripts['verify:sc23'], /check:build.*check:pack.*test:sc23.*neg_control_sc23/s);
  assert.match(packageRecord.scripts['test:browser:sc23'], /learn\.spec\.js/);
  assert.match(report, /orientation.*meet_sarcomere/s);
  assert.match(report, /Status: \*\*COMPLETE\*\*/);
  assert.match(report, /actomyosin_motor_function.*APPROVED/s);
  assert.match(report, /1280×720.*375×812/s);
});

test('SC23: the final frame returns to the complete titin route and actionable recap', () => {
  const final = presentation.guided_chapters.at(-1);
  assert.equal(final.id, 'knowledge_recap');
  assert.equal(final.recommended_state.camera_preset, 'view.titin_story');
  assert.equal(final.recommended_state.selected_component_or_region, 'titin');
  assert.deepEqual(final.next_actions.map((action) => action.label),
    ['Replay stretch', 'Inspect a region', 'Open evidence']);
  assert.ok(!final.presentation_features.includes('provenance_pipeline'));
});
