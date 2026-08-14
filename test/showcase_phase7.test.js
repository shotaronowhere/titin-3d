/** SC-7 gates: the guided narrative, expert depth, and the build-pipeline chapter. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { TitinVisualization, SCALES } from '../src/api/TitinVisualization.js';
import { COMPONENTS } from '../src/render/SarcomereScene.js';
import { Viewer, VIEWS, CLOSEUPS } from '../src/render/Viewer.js';
import { StoryController, checkPresentationSpec } from '../src/presentation/StoryController.js';
import {
  createProvenancePipeline, validateProvenancePipeline, PIPELINE_STAGE_IDS,
} from '../src/presentation/ProvenancePipeline.js';

const model = await TitinModel.create(nodeReader());
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const presentation = model.spec.presentation;
const { min, max } = model.slRange();
const controller = new StoryController(presentation, {
  views: Object.keys(VIEWS),
  closeups: Object.keys(CLOSEUPS),
  scales: Object.values(SCALES),
  targets: [...model.titinRegions().map((region) => region.id), ...Object.keys(COMPONENTS)],
  hiddenTargetsByScale: { [SCALES.detail]: TitinVisualization.DETAIL_HIDDEN },
  minLength: min,
  maxLength: max,
}, model.spec.scenes);
const specContext = {
  claims: model.spec.showcaseClaims,
  claimSupport: model.spec.claimSupport,
  references: model.spec.references,
  sarcomere: model.spec.sarcomere,
  titin: model.spec.titin,
  states: model.spec.states,
  annotations: model.spec.annotations,
  scenes: model.spec.scenes,
};
const words = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;

// ---------------------------------------------------------------------------
// The main guided route
// ---------------------------------------------------------------------------

test('SC7: the route retains seven deterministic presentation steps', () => {
  assert.deepEqual(controller.chapters.map((chapter) => chapter.id), [
    'meet_sarcomere', 'follow_titin', 'molecular_architecture', 'stretch_spring',
    'inspect_anchors', 'scaffold_thick_filament', 'knowledge_recap',
  ]);
  assert.deepEqual(controller.chapters.map((chapter) => chapter.order),
    [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(controller.chapters.at(-1).id, 'knowledge_recap',
    'the complete titin route ends the presentation');
  assert.deepEqual(checkPresentationSpec(presentation, specContext), []);
});

test('SC7: every chapter owns one takeaway, camera, configuration, and source set', () => {
  for (const chapter of controller.chapters) {
    const scene = chapter.recommended_state;
    assert.ok(chapter.title.trim());
    // One 25-45 word takeaway that is not a dense paragraph.
    const count = words(chapter.lay_summary);
    assert.ok(count >= 25 && count <= 45, `${chapter.id}: ${count} words`);
    const sentences = chapter.lay_summary.split(/[.!?](?=\s|$)/)
      .map((part) => part.trim()).filter(Boolean);
    assert.ok(sentences.length >= 2 && sentences.length <= 3,
      `${chapter.id}: ${sentences.length} sentences`);
    assert.ok(Math.max(...sentences.map(words)) <= 30,
      `${chapter.id}: has a sentence a reader has to unpack`);

    assert.ok(chapter.expert_expansion.trim(), `${chapter.id}: no expert expansion`);
    assert.ok(chapter.not_claimed.length, `${chapter.id}: no non-claim`);
    assert.ok(chapter.source_ids.length >= 1, `${chapter.id}: no source`);
    for (const source of chapter.source_ids) {
      assert.ok(model.spec.references[source], `${chapter.id}: unresolved source ${source}`);
    }
    // One deterministic camera and one visibility configuration.
    assert.match(scene.camera_preset, /^(view|closeup|region)\.[A-Za-z0-9_]+$/);
    assert.equal(scene.selected_component_or_region, chapter.target.id);
    for (const field of ['show_lattice', 'show_domains', 'show_context_detail', 'mirror']) {
      assert.equal(typeof scene.visibility[field], 'boolean', `${chapter.id}.${field}`);
    }
  }
  // The route is a route: it does not park on one shot the whole way through.
  assert.ok(new Set(controller.chapters
    .map((chapter) => chapter.recommended_state.camera_preset)).size >= 4);
  assert.ok(new Set(controller.chapters.map((chapter) => chapter.target.id)).size >= 4);
});

test('SC7: each chapter covers the subject the plan assigned it', () => {
  const chapter = (id) => controller.chapter(id);
  const all = (id) => `${chapter(id).lay_summary} ${chapter(id).expert_expansion}`;
  assert.match(all('meet_sarcomere'), /motor/i);
  assert.match(all('meet_sarcomere'), /sarcomere/i);
  assert.match(all('molecular_architecture'), /Ig|domain/i);
  assert.match(all('stretch_spring'), /PEVK|disordered/i);
  // Both anchors, not just the one the camera frames.
  assert.match(all('inspect_anchors'), /telethonin/i);
  assert.match(all('inspect_anchors'), /M-band/);
  assert.doesNotMatch(chapter('scaffold_thick_filament').lay_summary, /MyBP-C/,
    'Guided mode never draws MyBP-C, so its lay copy must not promise it');
  assert.match(all('scaffold_thick_filament'), /repeat|periodicit/i);
  assert.match(all('knowledge_recap'), /Measured[\s\S]*schematic/i);
  assert.match(all('knowledge_recap'), /spring[\s\S]*scaffold/i);
});

test('SC7: the tour is paced to the plan window without opening the drawer', () => {
  const pacing = presentation.tour_pacing;
  assert.ok(pacing.reading_words_per_minute > 0);
  assert.ok(pacing.basis.trim());
  const [low, high] = pacing.target_seconds;
  const total = controller.chapters.reduce((sum, chapter) => sum
    + words(chapter.narration) + words(chapter.state_change_announcement), 0);
  const seconds = (total / pacing.reading_words_per_minute) * 60
    + controller.chapters.length * pacing.chapter_transition_seconds;
  assert.ok(seconds >= low && seconds <= high,
    `tour runs ${seconds.toFixed(0)} s, outside ${low}-${high} s`);
  // "Approximately two to three minutes" is the plan's wording; hold the declared
  // window to it so a future edit cannot widen the gate instead of the copy.
  assert.ok(low >= 100 && high <= 200, 'the declared window must still mean 2-3 minutes');
  // No chapter opens the evidence inventory.
  for (const chapter of controller.chapters) {
    assert.equal(controller.stateForChapter(chapter.id).evidence_display, false);
  }
});

test('SC7: every chapter transition is deterministic and resettable', () => {
  for (const chapter of controller.chapters) {
    const first = controller.stateForChapter(chapter.id);
    assert.deepEqual(controller.stateForChapter(chapter.id), first,
      `${chapter.id}: applying the same chapter twice must give the same state`);
    // Every chapter state is fully expressible as a shareable URL, which is what
    // makes it reproducible rather than merely repeatable in this session.
    const restored = controller.parse(controller.serialize(first));
    assert.deepEqual(restored.issues, []);
    assert.deepEqual(restored.state, first);
  }
  // Restart returns to chapter one, not to wherever the user wandered.
  assert.equal(controller.chapters[0].id, presentation.initial_state.story_step);
});

// ---------------------------------------------------------------------------
// Expert depth
// ---------------------------------------------------------------------------

test('SC7: the reviewed expert deep dives are all present and Evidence-scoped', () => {
  const cards = presentation.expert_cards;
  const byClaim = new Map(cards.map((card) => [card.target_claim_id, card]));
  for (const claimId of ['n2a_interaction_hub_card', 'titin_kinase_card',
    'length_dependent_activation_card', 'mybpc_czone_context', 'titin_region_architecture']) {
    assert.ok(byClaim.has(claimId), `no expert card for '${claimId}'`);
  }
  // Alternative splicing, and the unresolved-question set the plan names.
  const isoform = cards.find((card) => card.id === 'isoform_diversity_card');
  assert.ok(isoform, 'the isoform-diversity statement is missing');
  assert.match(isoform.body, /alternative splicing/i);
  assert.match(isoform.body, /adds no second isoform|no second isoform/i);
  const unresolved = cards.find((card) => card.id === 'unresolved_questions_card');
  assert.ok(unresolved);
  for (const topic of [/azimuthal|azimuth/i, /M-band/i, /active mechanics|time-resolved/i]) {
    assert.match(unresolved.body + unresolved.findings.map((f) => f.text).join(' '), topic);
  }
  for (const card of cards) {
    assert.equal(card.audience, 'evidence');
    assert.ok(card.title.trim() && card.body.trim());
  }
});

test('SC7: expert cards separate established findings from proposed mechanisms', () => {
  const cards = presentation.expert_cards;
  for (const card of cards) {
    assert.ok(card.findings.length, `${card.id}: no findings`);
    for (const found of card.findings) {
      assert.ok(['ESTABLISHED', 'PROPOSED', 'OPEN'].includes(found.status),
        `${card.id}: bad status ${found.status}`);
      assert.ok(found.text.trim());
    }
  }
  const statuses = (id) => new Set(cards.find((card) => card.id === id)
    .findings.map((found) => found.status));
  // Every card whose subject is a mechanism must mark that mechanism PROPOSED.
  for (const id of ['kinase_signaling_card', 'length_activation_card', 'n2a_hub_card']) {
    assert.ok(statuses(id).has('PROPOSED'), `${id} presents a mechanism as settled`);
  }
  // And each of those must still name what IS established, or the card would read
  // as though nothing about titin signalling is known.
  for (const id of ['kinase_signaling_card', 'n2a_hub_card']) {
    assert.ok(statuses(id).has('ESTABLISHED'), `${id} concedes too much`);
  }
  assert.deepEqual(statuses('unresolved_questions_card'), new Set(['OPEN']));

  // The rule is enforced, not merely honoured by the current copy.
  const promoted = structuredClone(presentation);
  const target = promoted.expert_cards.find((card) => card.id === 'length_activation_card');
  target.findings = target.findings.filter((found) => found.status !== 'PROPOSED');
  assert.ok(checkPresentationSpec(promoted, specContext)
    .some((problem) => /marks nothing PROPOSED/.test(problem)));
  const invented = structuredClone(presentation);
  invented.expert_cards[0].findings[0].status = 'SETTLED';
  assert.ok(checkPresentationSpec(invented, specContext)
    .some((problem) => /invalid finding status/.test(problem)));
});

test('SC7: expert cards resolve to real citations through the facade', () => {
  const facade = Object.create(TitinVisualization.prototype);
  facade.model = model;
  const cards = facade.expertCards();
  assert.equal(cards.length, presentation.expert_cards.length);
  for (const card of cards) {
    assert.ok(Object.isFrozen(card) && Object.isFrozen(card.findings));
    assert.ok(card.sources.length, `${card.id}: no resolved source`);
    for (const source of card.sources) {
      assert.match(source.href, /^https:\/\//);
      assert.ok(source.citation && !source.citation.includes(source.id));
    }
  }
  // A derived Phase-6 measurement cites deposited entries rather than a DOI. It
  // had no link route at all until SC-7, so any card citing one threw on render.
  const kinase = cards.find((card) => card.id === 'kinase_signaling_card');
  const derived = kinase.sources.find((source) => source.id.includes('Phase 6 measurement'));
  assert.ok(derived, 'the kinase card cites its measured structural proxy');
  assert.equal(derived.href, 'https://www.rcsb.org/structure/1TKI');
  assert.match(derived.title, /1TKI/);
  // Every reference in the registry must be resolvable, not just the cited ones.
  for (const id of Object.keys(model.spec.references)) {
    assert.doesNotThrow(() => facade.sources([id]), `unresolvable reference '${id}'`);
  }
});

// ---------------------------------------------------------------------------
// The AI/provenance chapter
// ---------------------------------------------------------------------------

test('SC7: the pipeline counts its figures from the loaded records', () => {
  const pipeline = createProvenancePipeline(model);
  assert.deepEqual(pipeline.stages.map((stage) => stage.id), [...PIPELINE_STAGE_IDS]);
  assert.equal(pipeline.counted_at_runtime, true);

  const stage = (id) => pipeline.stages.find((entry) => entry.id === id);
  assert.equal(stage('primary_records').count, Object.keys(model.spec.references).length);
  assert.equal(stage('measurement').count, model.spec.geometrySources.parameters.length);
  assert.equal(stage('specification').count,
    model.spec.sarcomere.components.length + model.spec.titin.regions.length);
  assert.equal(stage('executable_model').count, Object.keys(model.spec.states.states).length);
  assert.equal(stage('procedural_render').count,
    model.spec.geometryStrategy.primitive_vocabulary.length);
  assert.equal(stage('validation').count,
    model.spec.showcaseClaims.global_negative_controls.length
    + model.spec.states.transition_rules.forbidden.length);

  // A figure written into the copy would drift from the data it describes; these
  // move when the records do.
  const grown = structuredClone(model);
  grown.spec.references['10.9999/added-for-this-test'] = { identifier: 'x' };
  assert.equal(createProvenancePipeline(grown).stages[0].count,
    stage('primary_records').count + 1);

  for (const entry of pipeline.stages) {
    assert.ok(entry.records.length, `${entry.id}: names no inspectable record`);
  }
});

test('SC7: the pipeline message stays a provenance claim, not an AI claim', () => {
  const pipeline = createProvenancePipeline(model);
  assert.equal(pipeline.claim_id, 'ai_provenance_pipeline');
  assert.equal(pipeline.evidence_class, 'SCHEMATIC');
  for (const expected of ['that AI is a scientific authority',
    'that passing tests proves every biological interpretation',
    'that procedural geometry is experimental density']) {
    assert.ok(pipeline.not_claimed.includes(expected), `missing non-claim: ${expected}`);
  }
  const chapter = controller.chapter('knowledge_recap');
  assert.ok(chapter.claim_ids.includes('ai_provenance_pipeline'));
  assert.ok(!chapter.presentation_features.includes('provenance_pipeline'),
    'the final visual frame must return to the complete titin route');
  assert.match(chapter.lay_summary, /passive spring/i);

  assert.throws(() => validateProvenancePipeline({
    ...pipeline, stages: pipeline.stages.slice(0, 3),
  }), /incomplete or reordered/);
  assert.throws(() => validateProvenancePipeline({
    ...pipeline, stages: [...pipeline.stages].reverse(),
  }), /incomplete or reordered/);
  assert.throws(() => validateProvenancePipeline({
    ...pipeline,
    stages: pipeline.stages.map((stage) => ({ ...stage, records: [] })),
  }), /names no inspectable record/);
  assert.throws(() => validateProvenancePipeline({
    ...pipeline, not_claimed: ['something else', 'and another', 'and a third'],
  }), /AI-authority non-claim/);
});

// ---------------------------------------------------------------------------
// Motion and page wiring
// ---------------------------------------------------------------------------

test('SC7: reduced motion lands on the identical state without animating', () => {
  // The gate is scientific EQUIVALENCE, not merely immediacy: the same chapter
  // transition must end at the same camera pose whether or not it animated.
  const stub = (reduced) => {
    const viewer = Object.create(Viewer.prototype);
    viewer.camera = new THREE.PerspectiveCamera(35, 1.6, 1, 10000);
    viewer.camera.position.set(0, 0, 100);
    viewer.controls = { target: new THREE.Vector3(), update: () => {} };
    viewer.prefersReducedMotion = reduced;
    viewer._sceneRadius = 1000;
    return viewer;
  };
  const destination = new THREE.Vector3(180, -40, 620);
  const target = new THREE.Vector3(300, 0, 0);

  const animated = stub(false);
  assert.equal(animated._moveCamera(destination, target,
    { animate: true, durationMs: 650, now: 0 }), true, 'a transition should start');
  assert.ok(animated.camera.position.distanceTo(destination) > 1,
    'the animated camera has not arrived yet');
  animated._advanceCameraTransition(650);

  const immediate = stub(true);
  assert.equal(immediate._moveCamera(destination, target, { animate: true }), false,
    'reduced motion must not start a transition at all');
  assert.equal(immediate._cameraTransition, null);

  // Identical end state, reached two ways.
  assert.ok(animated.camera.position.distanceTo(immediate.camera.position) < 1e-9);
  assert.ok(animated.controls.target.distanceTo(immediate.controls.target) < 1e-9);
  assert.ok(immediate.camera.position.distanceTo(destination) < 1e-9);

  // And every camera move funnels through that one gate, so no chapter transition
  // can reach the camera by a path that skips the preference.
  const source = readFileSync(new URL('../src/render/Viewer.js', import.meta.url), 'utf8');
  assert.equal((source.match(/this\._moveCamera\(/g) || []).length, 3,
    'frame, closeUp and focusSpan must share the one reduced-motion path');
});

test('SC7: the page renders the route, the cards, and the counted pipeline', () => {
  assert.match(page, /id="chapterProgress"/);
  assert.match(page, /Chapter \$\{index \+ 1\} of \$\{story\.chapters\.length\}/,
    'progress must follow the real chapter count');
  assert.match(page, /id="provenancePipeline"/);
  assert.match(page, /id="guidedPipeline"/);
  assert.match(page, /function renderProvenancePipeline/);
  assert.match(page, /visualization\.provenancePipeline\(\)/);
  assert.match(page, /activeFeatures\(\)\.has\('provenance_pipeline'\)/);
  assert.match(page, /renderProvenancePipeline\(\);/);
  const claimRenderer = readFileSync(
    new URL('../src/presentation/ClaimViewRenderer.js', import.meta.url), 'utf8',
  );
  assert.match(claimRenderer,
    /field\.statusKind === 'finding'[\s\S]*finding-\$\{field\.evidenceClass\}/,
    'the renderer must visibly preserve an already-resolved established/proposed split');
  assert.doesNotMatch(page, /finding-\$\{found\.status\}/,
    'the page must not classify a finding after the ClaimView DOM boundary');
  const drawerStart = page.indexOf('id="panel"');
  const drawerEnd = page.indexOf('</aside>', drawerStart);
  const pipelineAt = page.indexOf('id="provenancePipeline"');
  assert.ok(pipelineAt > drawerStart && pipelineAt < drawerEnd);
  const guidedAt = page.indexOf('id="guidedPipeline"');
  assert.ok(guidedAt < drawerStart, 'the guided copy lives on the stage, not in the drawer');
});
