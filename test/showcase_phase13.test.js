/** SC-13 gates: reading order, disclosure, and where sources sit. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { createBibliography } from '../src/presentation/Bibliography.js';
import { checkPresentationSpec } from '../src/presentation/StoryController.js';
import { createProvenancePipeline } from '../src/presentation/ProvenancePipeline.js';

const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const model = await TitinModel.create(nodeReader());

const specContext = {
  claims: model.spec.showcaseClaims,
  references: model.spec.references,
  sarcomere: model.spec.sarcomere,
  titin: model.spec.titin,
  states: model.spec.states,
  annotations: model.spec.annotations,
};

test('SC13: specialist depth is disclosed, not dumped', () => {
  assert.match(page, /<details id="objectInspectorDetails"/);
  assert.match(page, /<summary[^>]*>For specialists<\/summary>/);
  // Evidence mode opens it; Guided leaves it closed.
  assert.match(page, /objectInspectorDetails'\)\.open = state\.audienceMode === AUDIENCE_MODES\.evidence/);
});

test('SC13: the card reads lay text before detail and citations last', () => {
  const order = ['objectInspectorTitle', 'objectInspectorEvidence', 'objectInspectorLay',
    'objectInspectorDetails', 'objectInspectorSources'];
  const positions = order.map((id) => page.indexOf(`id="${id}"`));
  assert.ok(positions.every((value) => value > -1), `missing: ${order[positions.indexOf(-1)]}`);
  for (let i = 1; i < positions.length; i += 1) {
    assert.ok(positions[i] > positions[i - 1], `${order[i]} must follow ${order[i - 1]}`);
  }
});

test('SC13: citations are one compact line, not a stack of full-width links', () => {
  assert.match(page, /\.object-sources \{[^}]*font-size: 9px/);
  assert.match(page, /Sources: /);
});

test('SC13: the card is placed by the tested layout function', () => {
  assert.match(page, /inspectorPlacement\(\{/);
  assert.ok(!/let left = point\.x_px < width \/ 2 \? point\.x_px \+ gap/.test(page),
    'the ad-hoc placement arithmetic must be gone');
});

test('SC13: the chapter card names the selection instead of repeating it', () => {
  assert.match(page, /guidedSelectionText'\)\.textContent = ''/,
    'the duplicated lay paragraph in the guided card must go');
});

test('SC13: the card can step between structures with the pointer', () => {
  assert.match(page, /<button id="objectInspectorPrevious"/);
  assert.match(page, /<button id="objectInspectorNext"/);
});

test('SC13: the drawer is tabbed and sources come last', () => {
  const ids = ['tabInspect', 'tabMeasure', 'tabEvidence', 'tabSources'];
  const positions = ids.map((id) => page.indexOf(`id="${id}"`));
  assert.ok(positions.every((value) => value > -1));
  for (let i = 1; i < positions.length; i += 1) {
    assert.ok(positions[i] > positions[i - 1], `${ids[i]} must follow ${ids[i - 1]}`);
  }
  assert.match(page, /<div id="drawerTabs" role="tablist"/);
  for (const id of ids) {
    assert.match(page, new RegExp(`<button id="${id}"[^>]*role="tab"`));
  }
});

test('SC13/18: named drawer entries land on their named destination', () => {
  assert.match(page, /function openEvidence\(trigger, targetTab\)/);
  assert.match(page, /openEvidence\(\$\('audienceEvidence'\), 'evidence'\)/);
  assert.match(page, /openEvidence\(\$\('stageMeasureLink'\), 'measure'\)/);
  assert.match(page, /openEvidence\(\$\('stageSourcesLink'\), 'sources'\)/);
  const inspect = page.indexOf('id="panelInspect"');
  const evidence = page.indexOf('id="panelEvidence"');
  assert.ok(inspect < evidence);
  const scales = page.indexOf('id="scales"');
  assert.ok(scales > inspect && scales < evidence, 'the scale control belongs on the Inspect tab');
});

test('SC13: an empty selection hides its heading instead of leaving it dangling', () => {
  assert.match(page, /selectedStructureHeading'\)\.hidden = !annotation/);
});

test('SC13: the bibliography resolves every record in the registry', () => {
  const entries = createBibliography(model.spec.references, { citedIds: ['UniProt:Q8WZ42'] });
  assert.equal(entries.length, Object.keys(model.spec.references).length);
  for (const entry of entries) {
    assert.ok(entry.citation.trim(), `${entry.id} has no citation`);
    assert.ok(/^https?:\/\//.test(entry.href), `${entry.id} has no link`);
    assert.ok(entry.title.trim(), `${entry.id} has no title`);
  }
  assert.equal(entries.find((entry) => entry.id === 'UniProt:Q8WZ42').cited, true);
  // The working bibliography has to be distinguishable from the full corpus,
  // which means the flag has to be false somewhere too.
  assert.ok(entries.some((entry) => entry.cited === false),
    'every record cannot be marked cited by a single-id citation set');
});

test('SC13: the bibliography is stably ordered', () => {
  const once = createBibliography(model.spec.references, {}).map((entry) => entry.id);
  const twice = createBibliography(model.spec.references, {}).map((entry) => entry.id);
  assert.deepEqual(once, twice);
  const citations = createBibliography(model.spec.references, {}).map((entry) => entry.citation);
  assert.deepEqual(citations, [...citations].sort((a, b) => a.localeCompare(b)),
    'a reference list is ordered by citation, not by the registry’s insertion order');
});

test('SC13: the page can copy a citable link to the current view', () => {
  assert.match(page, /visualization\.bibliography\(\)/,
    'the reference list must be resolved by the facade, never restated in the page');
  assert.match(page, /id="copyViewLink"/);
  assert.match(page, /navigator\.clipboard\.writeText/);
  assert.match(page, /model\.spec\.identity/,
    'a citable link must name every candidate identity it came from');
});

test('SC13: every expert card names the biology it is about', () => {
  const cards = model.spec.presentation.expert_cards;
  const regionIds = new Set(model.spec.titin.regions.map((region) => region.id));
  const componentIds = new Set(model.spec.annotations.components.map((entry) => entry.target_id));
  for (const card of cards) {
    assert.ok(Array.isArray(card.related_target_ids) && card.related_target_ids.length,
      `expert card '${card.id}' must name at least one related target`);
    for (const target of card.related_target_ids) {
      assert.ok(regionIds.has(target) || componentIds.has(target),
        `expert card '${card.id}' names unknown target '${target}'`);
    }
  }
  assert.deepEqual(checkPresentationSpec(model.spec.presentation, specContext), []);
});

test('SC13: an unknown related target is rejected by the contract', () => {
  const broken = JSON.parse(JSON.stringify(model.spec.presentation));
  broken.expert_cards[0].related_target_ids = ['not_a_structure'];
  const problems = checkPresentationSpec(broken, specContext);
  assert.ok(problems.some((problem) => problem.includes('not_a_structure')),
    `the validator must reject an unknown related target; got ${JSON.stringify(problems)}`);
});

test('SC13: selecting a structure surfaces its expert card', () => {
  assert.match(page, /function relatedExpertCards\(/);
  assert.match(page, /related_target_ids/);
  assert.match(page, /id="objectInspectorExpertLink"/);
});

test('SC13-5: no pipeline figure is written into the page', () => {
  const { stages } = createProvenancePipeline(model);
  for (const stage of stages) {
    assert.ok(!page.includes(`>${stage.count}<`),
      `the count for '${stage.id}' appears literally in the template; it must be counted, not typed`);
  }
});

test('SC13-5: the pipeline lays across the stage instead of scrolling inside the card', () => {
  const cardStart = page.indexOf('id="guidedCard"');
  const cardEnd = page.indexOf('</section>', page.indexOf('id="guidedCardBody"'));
  const pipeline = page.indexOf('id="guidedPipeline"');
  assert.ok(pipeline > -1 && !(pipeline > cardStart && pipeline < cardEnd),
    'the pipeline must not live inside the chapter card');
  assert.match(page, /#guidedPipeline \.pipeline \{[^}]*grid-template-columns: repeat\(6/,
    'the six counted stages must read as six columns across the stage');
  assert.ok(!/#guidedLattice, #guidedPipeline \{[\s\S]{0,120}overflow-y: auto/.test(page),
    'the band must not be an inner scroll region at any supported width');
});

// The projector floor for the whole page is SC-17.1's gate. This one holds the
// band SC-13 built to it: the counted figure carries at headline size and no
// part of the diagram is set below the floor SC-17 will apply everywhere.
test('SC13-5: the pipeline is typeset for a room, not for a scrolling box', () => {
  const rules = [...page.matchAll(/#guidedPipeline [^{]*\{[^}]*font-size:\s*(\d+(?:\.\d+)?)px/g)]
    .map((hit) => Number(hit[1]));
  assert.ok(rules.length >= 4, `expected the band to set its own type scale, found ${rules.length} rules`);
  assert.ok(Math.min(...rules) >= 9, `the band sets ${Math.min(...rules)}px, below the 9px floor`);
  assert.match(page, /#guidedPipeline \.pipeline-figure \{[^}]*font-size: (2[0-9]|[3-9][0-9])px/,
    'the counted figure is the payload and must carry at display size');
  assert.ok(!/\.pipeline-records \{[^}]*font-size: 8px/.test(page),
    'the 8 px record list must be gone');
});
