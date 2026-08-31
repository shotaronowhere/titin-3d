/** SC-27A gates: five-beat Tour, contextual Research, and science immutability. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { canonicalPublicBindings } from '../src/model/SpecLoader.js';
import {
  canonicalEvidenceClass,
  createEvidenceChip,
  evidenceLanguage,
} from '../src/presentation/EvidenceChip.js';
import { tourControlBudget } from '../src/presentation/TourView.js';
import { Viewer } from '../src/render/Viewer.js';

const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const presentation = json('data/presentation.json');
const scenes = json('data/scenes.json');
const renderStyle = json('data/render_style.json');
const gates = json('data/release_gates.json');
const page = readFileSync('src/index.template.html', 'utf8');
const readme = readFileSync('README.md', 'utf8');
const releasePackBuilder = readFileSync('scripts/build_release_pack.mjs', 'utf8');

const BEATS = Object.freeze([
  'meet_sarcomere',
  'follow_titin',
  'stretch_spring',
  'scaffold_thick_filament',
  'knowledge_recap',
]);

test('SC27A: the public Tour is exactly five ordered beats with one transition each', () => {
  assert.equal(presentation.schema, 'titin-presentation/3');
  assert.deepEqual(presentation.guided_chapters.map(({ id }) => id), BEATS);
  assert.deepEqual(Object.keys(scenes.scenes), BEATS);
  for (const [index, beat] of presentation.guided_chapters.entries()) {
    assert.ok(beat.visual_question?.trim(), `${beat.id} needs a visual question`);
    assert.ok(beat.narration?.trim(), `${beat.id} needs complete presenter narration`);
    assert.equal(beat.next_actions.length, 1, `${beat.id} has one primary transition`);
    const words = beat.lay_summary.trim().split(/\s+/);
    assert.ok(words.length <= 30, `${beat.id} lay summary is ${words.length} words`);
    assert.equal((beat.lay_summary.match(/[.!?](?:[\"')\]]+)?(?:\s|$)/g) || []).length, 1,
      `${beat.id} lay summary is one sentence`);
    assert.equal(beat.order, index + 1);
  }
  assert.equal(presentation.guided_chapters.at(-1).next_actions[0].action,
    'story.meet_sarcomere');
});

test('SC27A: every v1 chapter alias canonicalizes directly to a final v3 beat', () => {
  const aliases = presentation.chapter_aliases.aliases;
  assert.deepEqual(aliases, {
    orientation: 'meet_sarcomere',
    architecture: 'stretch_spring',
    molecular_architecture: 'stretch_spring',
    elastic_regions: 'stretch_spring',
    anchors: 'follow_titin',
    inspect_anchors: 'follow_titin',
    anchored_scaffold: 'scaffold_thick_filament',
    evidence_audit: 'knowledge_recap',
    provenance_pipeline: 'knowledge_recap',
  });
  for (const target of Object.values(aliases)) assert.ok(BEATS.includes(target));
});

test('SC27A: protected public claim bindings migrate without editing the claim ledger', () => {
  const migrations = presentation.public_binding_migrations;
  assert.deepEqual(canonicalPublicBindings('scope_badge',
    'data/presentation.json#/guided_chapters/0', migrations),
  ['data/presentation.json#/guided_chapters/0']);
  assert.deepEqual(canonicalPublicBindings('titin_region_architecture',
    'data/presentation.json#/guided_chapters/2', migrations),
  ['data/presentation.json#/guided_chapters/2']);
  assert.deepEqual(canonicalPublicBindings('titin_region_architecture',
    'data/presentation.json#/guided_chapters/3', migrations),
  ['data/presentation.json#/guided_chapters/2']);
  assert.deepEqual(canonicalPublicBindings('zdisc_telethonin_topology',
    'data/scenes.json#/scenes/inspect_anchors', migrations),
  ['data/scenes.json#/scenes/follow_titin']);
  assert.deepEqual(canonicalPublicBindings('n2a_interaction_hub_card',
    'data/scenes.json#/scenes/knowledge_recap', migrations), [
    'data/scenes.json#/scenes/scaffold_thick_filament',
    'data/scenes.json#/scenes/knowledge_recap',
  ]);
});

test('SC27A: one presentation mapping covers every canonical evidence class', () => {
  const expected = {
    MEASURED: 'Measured',
    MODELED: 'Modeled',
    'STRONGLY INFERRED': 'Inferred',
    INFERRED: 'Inferred',
    SCHEMATIC: 'Schematic',
    UNKNOWN: 'Not known',
  };
  assert.deepEqual(Object.fromEntries(Object.entries(expected).map(([raw]) => [
    raw, evidenceLanguage(presentation, `${raw} (qualified)`).label,
  ])), expected);
  assert.equal(canonicalEvidenceClass('UNKNOWN (unresolved in situ)'), 'UNKNOWN');
  assert.equal(canonicalEvidenceClass('MEASURED_IN_VITRO'), null);
  assert.throws(() => evidenceLanguage(presentation, 'APPROVED'), /unmapped canonical/);
  assert.deepEqual(presentation.evidence_language.guided_recap_classes, [
    'MEASURED', 'MODELED', 'STRONGLY INFERRED', 'SCHEMATIC', 'UNKNOWN',
  ]);
  assert.equal(evidenceLanguage(presentation, 'STRONGLY INFERRED').ambiguous, true);
  assert.equal(evidenceLanguage(presentation, 'INFERRED').ambiguous, true);
  assert.equal(evidenceLanguage(presentation, 'MEASURED').ambiguous, false);
  const ownerDocument = {
    createElement: () => ({ className: '', dataset: {}, title: '', textContent: '' }),
  };
  assert.equal(createEvidenceChip(ownerDocument, evidenceLanguage(presentation, 'INFERRED'), {
    research: true,
  }).textContent, 'Inferred · scientific class: inferred');
});

test('SC27A: the five-beat merge preserves every v2 scientific non-claim', () => {
  const previous = JSON.parse(readFileSync(
    new URL('../test/fixtures/sc27a_v2_not_claimed.json', import.meta.url), 'utf8',
  ));
  const current = new Set(presentation.guided_chapters.flatMap((chapter) => chapter.not_claimed));
  for (const statement of previous) assert.ok(current.has(statement), statement);
});

test('SC27A: TourView declares four controls except for the contextual stretch beat', () => {
  for (const [chapterIndex, chapterId] of BEATS.entries()) {
    const budget = tourControlBudget({ chapterId, chapterIndex, chapterCount: BEATS.length });
    assert.equal(budget.visibleChromeAffordances, chapterId === 'stretch_spring' ? 7 : 4);
    assert.ok(budget.tabbableChromeTargets <= budget.visibleChromeAffordances);
  }
  assert.equal(tourControlBudget({ chapterId: BEATS[0], chapterIndex: 0,
    chapterCount: BEATS.length }).tabbableChromeTargets, 3);
});

test('SC27A: a zero-height first layout is deferred rather than treated as corrupt', () => {
  const receiver = {
    container: { clientHeight: 0, clientWidth: 0 },
    camera: { fov: 35 },
    _pendingMeasuredFraming: null,
  };
  assert.equal(Viewer.prototype._contentCentreOffsetNm.call(receiver, 100, 120, 'test'), 0);
  const callback = () => {};
  Viewer.prototype._rememberMeasuredFraming.call(receiver, callback);
  assert.equal(receiver._pendingMeasuredFraming, callback);
  assert.throws(() => Viewer.prototype._contentCentreOffsetNm.call(receiver, 100, NaN, 'test'),
    /finite pixel position/);
});

test('SC27A: the presentation palette names its contrast and non-claim contracts', () => {
  const theme = renderStyle.presentation;
  assert.equal(theme.stage_background.lightest, '#0e1116');
  assert.equal(theme.titin_emphasis.identity_color, '#ff5d7d');
  assert.ok(theme.titin_emphasis.halo_opacity_max <= 0.32);
  assert.ok(theme.titin_emphasis.contour.width_px > 0);
  assert.ok(theme.declared_contrast_ratios.thin_to_thick_filament >= 1.7);
  assert.match(theme.titin_emphasis.meaning, /not molecular envelopes|not molecular/i);
});

test('SC27A: user-facing vocabulary and accessible grouping use Tour and Research', () => {
  for (const retired of [
    'Loading guided route',
    'Current guided claim',
    'Evidence-mode only',
    'current chapter and sarcomere length',
    'admitted for Evidence mode only',
    'Evidence-only doublet spacing',
    'withheld in Guided mode',
  ]) assert.ok(!page.includes(retired), `retired user-facing phrase remains: ${retired}`);
  assert.ok(!readme.includes('The Evidence drawer shows a build fingerprint'));
  assert.ok(!readme.includes('SC-5 Evidence-mode expert cards'));
  assert.ok(!readme.includes('Evidence-only, off by default'));
  assert.match(readme, /MyBPCContext\.js[^\n]+\n\s+Research-only, off by default/);
  assert.match(page, /id="sceneDetails" role="group" aria-label="Controls for this scientific scene"/);
  assert.match(page, /id="buildFingerprint" role="group" aria-label="Candidate identity"/);
  assert.match(releasePackBuilder, /guided_chapters: 'Tour beats'/);
  assert.match(releasePackBuilder, /evidence_mode: 'Research workbench'/);
});

test('SC27A: every protected scientific input remains byte-identical to SC-26', () => {
  const expected = {
    'data/sarcomere.json': 'de959c99df017ab61760b0dae934e02dca2727e06b6c99cc9e56ae6815d30e0a',
    'data/titin.json': '7d060801a816aacd864e0c16c390154f0457b58a5881cf4caa620c2bf77fdca9',
    'data/titin_sequence_features.json': '93ddde035429517cd2448182717df2177ce82e75b0f64c650bd958ad805cddc5',
    'data/structural_states.json': '569713b992b5d3dbaa26af59afefab76a7f05763735c94b8fbef76408738cf9a',
    'data/geometry_sources.json': '060978ad60b8d3a36f0e13befaaa0070195d4852da16cdb0ae24a072bd36e6ff',
    'data/geometry_strategy.json': '7d9836233d05cec540fb67b6a908a20ac579b86c30f393865a1f0a3bbd900e0f',
    'data/context_measurements.json': '1a2aedd179ba16eb6cca150b7d114aeb382e1c2414dca8b52e906ae6ad9e42d7',
    'data/domain_backbones.json': '62ae7aea19d8ac5ae6e88e5ff41b283daefe2a5de61fb18840bb872ec8f71d82',
    'data/mechanical_parameters.json': 'c7fbf33ce82469f1fc346526e58e84c7c5434ad2b926ed05c37d27c443414cc3',
    'data/claim_support.json': 'f4fb9575dbdabad76d9eadc57bde0fa9dc46d6d3b5df3081abf592351a6227d4',
    'data/scientific_decisions.json': '52e6a97c3cb8001c685d04d3684cc835ef8f58b44749ef522777f664d3118de5',
  };
  for (const [path, digest] of Object.entries(expected)) {
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), digest, path);
  }
});

test('SC27A: implementation never claims human or release evidence', () => {
  assert.equal(gates.release_ready, false);
  assert.equal(gates.lay_comprehension.status, 'PENDING');
  assert.equal(gates.expert_review.status, 'PENDING');
  assert.deepEqual(gates.lay_comprehension.results, []);
  assert.deepEqual(gates.expert_review.reviewers, []);
});

test('SC27A: history, viewport, and all-family overlay truth share atomic runtime gates', () => {
  assert.match(page, /function restorePresentationFromHash\(\)[\s\S]*?rebuild\(true, \{ renderOverlay: false \}\)[\s\S]*?renderChapter\(\{ renderOverlay: false \}\)[\s\S]*?renderScienceOverlay\(\{ transient: true \}\)/);
  assert.match(page, /const MOBILE_RESEARCH_QUERY[\s\S]*?function mobileResearchActive/);
  assert.match(page, /window\.addEventListener\('resize', scheduleViewportSync\)/);
  assert.match(page, /mobileResearchMedia\.addEventListener\('change', scheduleViewportSync\)/);
  assert.match(page, /function auditPaintedOverlayLayout/);
  assert.match(page, /dataset\.terminusLayout/);
  assert.match(page, /suppressed:compact-stage/);
  assert.match(page, /function syncInspectHintSurface/);
});
