/** SC-1 gates: presentation contract, dual-audience shell, and URL state. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { TitinVisualization, SCALES } from '../src/api/TitinVisualization.js';
import { COMPONENTS } from '../src/render/SarcomereScene.js';
import { VIEWS, CLOSEUPS } from '../src/render/Viewer.js';
import { StoryController, AUDIENCE_MODES } from '../src/presentation/StoryController.js';

const model = await TitinModel.create(nodeReader());
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const { min, max } = model.slRange();
const controller = new StoryController(model.spec.presentation, {
  views: Object.keys(VIEWS),
  closeups: Object.keys(CLOSEUPS),
  scales: Object.values(SCALES),
  targets: [...model.titinRegions().map((region) => region.id), ...Object.keys(COMPONENTS)],
  hiddenTargetsByScale: { [SCALES.detail]: TitinVisualization.DETAIL_HIDDEN },
  minLength: min,
  maxLength: max,
}, model.spec.scenes);

test('SC1: presentation.json is required and cross-file validated at runtime', () => {
  assert.equal(model.spec.presentation.schema, 'titin-presentation/2');
  assert.equal(model.spec.scenes.schema, 'titin-semantic-scenes/1');
  assert.equal(model.spec.showcaseClaims.schema, 'titin-showcase-claim-audit/2');
  assert.deepEqual(controller.chapters.map((chapter) => chapter.id),
    ['meet_sarcomere', 'follow_titin', 'molecular_architecture', 'stretch_spring',
      'inspect_anchors', 'scaffold_thick_filament', 'knowledge_recap']);
});

test('SC1: every supported public URL state round-trips exactly', () => {
  const expected = {
    audience_mode: AUDIENCE_MODES.evidence,
    story_step: 'stretch_spring',
    sarcomere_length_nm: 2375,
    scale: SCALES.detail,
    camera_preset: 'region.PEVK',
    selected_component_or_region: 'PEVK',
    evidence_display: true,
  };
  const hash = controller.serialize(expected);
  assert.equal(hash,
    '#mode=evidence&step=stretch_spring&sl=2375&scale=detail&camera=region.PEVK&target=PEVK&evidence=1');
  assert.deepEqual(controller.parse(hash), { state: expected, issues: [] });
  assert.throws(() => controller.serialize({ ...expected, audience_mode: 'guided', evidence_display: true }),
    /cannot serialize unsupported state/i);

  const componentTarget = {
    ...expected,
    scale: SCALES.context,
    camera_preset: 'view.longitudinal',
    selected_component_or_region: 'thick_filament',
  };
  assert.deepEqual(controller.parse(controller.serialize(componentTarget)),
    { state: componentTarget, issues: [] });
});

test('SC1: bad URL fields fail visibly and use documented defaults', () => {
  const decoded = controller.parse(
    '#mode=expert&step=missing&sl=9999&scale=atoms&camera=free.1&target=ghost&evidence=yes&extra=x',
  );
  assert.ok(decoded.issues.length >= 8, decoded.issues.join('\n'));
  assert.match(decoded.issues.join(' '), /Unknown URL field 'extra'/);
  assert.deepEqual(decoded.state, model.spec.presentation.initial_state);

  const incompatible = controller.parse(
    '#mode=guided&step=meet_sarcomere&sl=2200&scale=detail&camera=closeup.zdisc&target=Z1Z2&evidence=1',
  );
  assert.equal(incompatible.state.evidence_display, false);
  assert.equal(incompatible.state.camera_preset, 'view.longitudinal');
  assert.match(incompatible.issues.join(' '), /cannot be displayed inside Guided mode/);
  assert.match(incompatible.issues.join(' '), /unavailable at the detail scale/);

  const hiddenTarget = controller.parse(
    '#mode=evidence&step=meet_sarcomere&sl=2200&scale=detail&camera=view.longitudinal&target=thick_filament&evidence=1',
  );
  assert.equal(hiddenTarget.state.selected_component_or_region, null);
  assert.match(hiddenTarget.issues.join(' '), /Target 'thick_filament'.*unavailable at scale 'detail'/);
});

test('SC1: public facade reports audience/story/selection without adding activation', () => {
  const facade = Object.create(TitinVisualization.prototype);
  facade.model = model;
  facade.scale = SCALES.context;
  facade._state = { sarcomere_length_nm: 2200, structural_state: 'resting' };
  facade._presentationState = {
    audience_mode: AUDIENCE_MODES.guided,
    story_step: null,
    selected_component_or_region: null,
    regulatory_state: null,
    camera_preset: 'view.longitudinal',
    evidence_display: false,
  };
  const result = facade.setPresentationState({
    audience_mode: AUDIENCE_MODES.evidence,
    story_step: 'meet_sarcomere',
    selected_component_or_region: 'PEVK',
    camera_preset: 'region.PEVK',
    evidence_display: true,
  });
  assert.deepEqual(result, {
    audience_mode: 'evidence', story_step: 'meet_sarcomere',
    selected_component_or_region: 'PEVK', regulatory_state: null,
    camera_preset: 'region.PEVK', evidence_display: true,
    sarcomere_length_nm: 2200, structural_state: 'resting', scale: 'context',
  });
  assert.throws(() => facade.setPresentationState({ regulatory_state: 'activated' }),
    /not available.*does not encode activation/i);
  assert.throws(() => facade.setPresentationState({ story_step: 'invented' }), /unknown story_step/i);
  facade.scale = SCALES.detail;
  assert.throws(() => facade.setPresentationState({ selected_component_or_region: 'thick_filament' }),
    /not visible.*detail scale/i);
});

test('SC1: Guided has a full stage and Evidence owns the complete legacy inspector', () => {
  assert.match(page, /id="app" data-mode="guided"/);
  assert.match(page, /id="scopeBadge"[\s\S]*?id="scopeIdentity"[\s\S]*?id="scopeState"/);
  assert.match(page, /id="guidedCard"[\s\S]*?id="chapterSummary"[\s\S]*?id="chapterEvidenceLink"/);
  const guidedEnd = page.indexOf('</section>', page.indexOf('id="guidedCard"'));
  const rawEvidence = page.indexOf('id="evidence"');
  assert.ok(rawEvidence > guidedEnd, 'raw evidence inventory must not be inside the Guided card');
  const drawerStart = page.indexOf('id="panel"');
  const drawerEnd = page.indexOf('</aside>', drawerStart);
  // SC-12 split this gate. Raw EVIDENCE must stay out of the Guided card — that
  // was the original intent and it still holds. The primary didactic CONTROLS
  // deliberately moved to the stage bar, because a length control a novice
  // cannot reach cannot teach what changes with sarcomere length.
  for (const id of [
    'scales', 'closeups', 'toggles', 'components', 'regions',
    'metrics', 'legend', 'evidence', 'annotations', 'notClaimed', 'notes',
  ]) {
    const location = page.indexOf(`id="${id}"`);
    assert.ok(location > drawerStart && location < drawerEnd,
      `existing readout/control '${id}' must remain in the Evidence drawer`);
  }
  const barStart = page.indexOf('id="stageBar"');
  const barEnd = page.indexOf('</div><!-- /stageBar -->', barStart);
  for (const id of ['sl', 'presets', 'views']) {
    const location = page.indexOf(`id="${id}"`);
    assert.ok(location > barStart && location < barEnd,
      `primary control '${id}' must be on the stage bar`);
  }
  assert.match(page, /#app\[data-mode="evidence"\] #panel \{ display: block; \}/);
  assert.match(page, /@media \(max-width: 700px\)[\s\S]*?#panel \{ position: fixed;/);
  assert.match(page, /addEventListener\('hashchange', restorePresentationFromHash\)/,
    'pasting a shared hash into an already-open page must restore it immediately');
  assert.match(page, /function applyChapterVisibility[\s\S]*?recommended_state\?\.visibility/,
    'chapter visibility must have one restoration path');
  assert.ok((page.match(/applyChapterVisibility\(state\.storyStep\)/g) || []).length >= 2,
    'initial and live URL restoration must apply deterministic chapter visibility');
  assert.match(page, /function openEvidence[\s\S]*?closeEvidence[\s\S]*?event\.key === 'Escape'/,
    'the responsive Evidence drawer must manage entry, return, and Escape focus paths');
  assert.match(page, /id="componentTargetReadout"[\s\S]*?function syncComponentButtons/,
    'a component URL target must have a distinct visible readout');
  assert.match(page, /classList\.toggle\('selected-target', selected\)[\s\S]*?aria-current/,
    'component targeting must remain distinct from visibility aria-pressed state');
});

test('SC1: length presets distinguish geometry, activation, and working-range status', () => {
  const presets = model.spec.presentation.length_presets;
  assert.equal(presets.length, model.presets().length);
  assert.equal(presets.every((preset) => preset.activation_independent), true);
  assert.deepEqual(presets.filter((preset) => preset.outside_working_range)
    .map((preset) => preset.sarcomere_length_nm), [1900, 3000]);
  assert.match(page, /display\.label[\s\S]*OUTSIDE RANGE/);
  assert.match(page, /activationStatement/);
});

test('SC1: runtime validation rejects a presentation target that does not exist', async () => {
  const source = nodeReader();
  const reader = async (name) => {
    const value = await source(name);
    if (name === 'presentation.json') {
      value.guided_chapters[0].target.id = 'ghost_region';
      value.guided_chapters[0].recommended_state.selected_component_or_region = 'ghost_region';
    }
    return value;
  };
  await assert.rejects(() => TitinModel.create(reader), /targets unknown component 'ghost_region'/i);
});
