/** SC-22 gates: atomic claim views, contextual sources, and one responsive detail owner. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import * as ClaimViewModule from '../src/presentation/ClaimView.js';
import * as ClaimRendererModule from '../src/presentation/ClaimViewRenderer.js';
import { baseEvidence } from '../src/presentation/AnnotationCatalog.js';
import { resolveSourceContext } from '../src/presentation/Bibliography.js';
import { createAnnotations } from '../src/api/TitinAnnotations.js';
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { TitinVisualization } from '../src/api/TitinVisualization.js';

const model = await TitinModel.create(nodeReader());
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const packageRecord = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const releaseGates = JSON.parse(
  readFileSync(new URL('../data/release_gates.json', import.meta.url), 'utf8'),
);
const registry = {
  references: model.spec.references,
  claimSupport: model.spec.claimSupport,
};

test('SC22: claim view and renderer expose one pure public function apiece', () => {
  assert.deepEqual(Object.keys(ClaimViewModule), ['claimViewModel']);
  assert.deepEqual(Object.keys(ClaimRendererModule), ['renderClaimView']);
  const source = readFileSync(new URL('../src/presentation/ClaimView.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bdocument\b|\bwindow\b|createElement/);
  const renderer = readFileSync(
    new URL('../src/presentation/ClaimViewRenderer.js', import.meta.url), 'utf8',
  );
  assert.doesNotMatch(renderer, /claimSupport|references\[|evidence[_ ]rank|source filtering/i);
});

test('SC22: one canonical record supplies complete, source-rich ClaimView data', () => {
  const view = ClaimViewModule.claimViewModel('titin_continuity_trace', registry);
  assert.deepEqual(Object.keys(view), [
    'title', 'plain', 'specialist', 'fields', 'limitations', 'notClaimed', 'sources',
  ]);
  assert.ok(view.title && view.plain && view.specialist);
  assert.ok(view.fields.some((field) => field.evidenceClass === 'STRONGLY INFERRED'));
  assert.ok(view.fields.some((field) => field.evidenceClass === 'SCHEMATIC'));
  assert.ok(view.limitations.length && view.notClaimed.length && view.sources.length);
  for (const source of view.sources) {
    assert.ok(source.title && source.citation && source.id);
    assert.ok(source.species && source.preparation && source.locator);
    assert.ok(source.relationship && source.extractionNote);
  }
});

test('SC22: mixed region fields are canonical values with one semantic status each', () => {
  const annotation = createAnnotations(model, 2200)
    .find((record) => record.target_type === 'titin_region' && record.target_id === 'PEVK');
  const view = ClaimViewModule.claimViewModel(annotation.claim_support_ids[0], {
    ...registry,
    annotation,
    relatedClaimIds: annotation.claim_support_ids,
  });
  const statuses = new Set(view.fields.map((field) => field.evidenceClass));
  assert.ok(statuses.has('MEASURED'));
  assert.ok(statuses.has('SCHEMATIC'));
  assert.ok(statuses.has('MODELED'));
  assert.equal(view.plain, model.spec.claimSupport.claims
    .find((claim) => claim.id === annotation.claim_support_ids[0]).statement);
  assert.doesNotMatch(`${view.plain} ${view.specialist}`, /phospho/i,
    'unsupported annotation prose must not leak into the canonical claim view');
  for (const field of view.fields) {
    assert.notEqual(field.label, field.value, `${field.id} needs an actual value`);
    assert.equal(field.evidenceClass, baseEvidence(field.evidenceClass),
      `${field.id} must expose one semantic evidence token`);
    assert.ok(annotation.claim_support_ids.includes(field.claimId),
      `${field.id} must name its canonical claim record`);
  }
  assert.equal(view.fields.filter((field) => field.label === 'Rendered depiction').length, 1,
    'one object cannot show contradictory duplicate depiction rows');
  assert.throws(() => ClaimViewModule.claimViewModel('scope_badge', {
    ...registry, annotation, relatedClaimIds: ['scope_badge'],
  }), /not canonically bound/i);
});

test('SC22: expert finding status is resolved before the DOM boundary', () => {
  const claims = new Map(model.spec.claimSupport.claims.map((claim) => [claim.id, claim]));
  for (const card of model.spec.presentation.expert_cards) {
    const view = ClaimViewModule.claimViewModel(card.target_claim_id, {
      ...registry,
      presentationRecord: card,
    });
    const findingFields = view.fields.filter((field) => field.statusKind === 'finding');
    assert.deepEqual(
      findingFields.map((field) => field.evidenceClass),
      card.findings.map((finding) => finding.status),
      `${card.id} must preserve the validated expert-card status vocabulary`,
    );
    assert.ok(findingFields.every((field) => field.claimId === card.target_claim_id));
    assert.ok(findingFields.every((field) => (
      field.sourceIds.join('|') === card.source_ids.join('|')
    )), `${card.id} findings must retain their declared contextual citations`);
    const expectedSources = [...new Set([
      ...claims.get(card.target_claim_id).support.map((row) => row.source_id),
      ...card.source_ids,
    ])].sort();
    assert.deepEqual(view.sources.map((source) => source.id).sort(), expectedSources,
      `${card.id} must keep canonical and presentation-context citations`);
  }
  assert.doesNotMatch(page, /finding-\$\{found\.status\}/,
    'the template must not repair scientific status after rendering');
});

test('SC22: every annotation ClaimView is closed over its canonical claim support', () => {
  const claims = new Map(model.spec.claimSupport.claims.map((claim) => [claim.id, claim]));
  for (const annotation of createAnnotations(model, 2200)) {
    const view = ClaimViewModule.claimViewModel(annotation.claim_support_ids[0], {
      ...registry,
      annotation,
      relatedClaimIds: annotation.claim_support_ids,
    });
    const expectedSources = [...new Set(annotation.claim_support_ids.flatMap((id) => (
      claims.get(id).support.map((row) => row.source_id)
    )))].sort();
    assert.deepEqual(view.sources.map((source) => source.id).sort(), expectedSources,
      `${annotation.id} must neither drop nor invent a canonical source`);
    assert.equal(view.plain, claims.get(annotation.claim_support_ids[0]).statement,
      `${annotation.id} plain copy must come from the primary canonical claim`);
    assert.ok(view.fields.every((field) => claims.has(field.claimId)),
      `${annotation.id} field binding must resolve`);
    assert.ok(view.fields.every((field) => field.label !== field.value),
      `${annotation.id} fields must not repeat labels as placeholder values`);
    assert.equal(view.fields.filter((field) => field.label === 'Rendered depiction').length, 1,
      `${annotation.id} needs exactly one depiction classification`);
  }
});

test('SC22: source precedence falls through value, object, chapter, then all', () => {
  const value = { label: 'PEVK persistence length', claimIds: ['force_law_parameter_set'] };
  const object = { label: 'PEVK', claimIds: ['titin_region_architecture'] };
  const chapter = { label: 'Elastic regions', claimIds: ['regional_extension_story'] };
  const contexts = { selectedValue: value, selectedObject: object, currentChapter: chapter };
  assert.equal(resolveSourceContext(registry, contexts).scope, 'value');
  assert.equal(resolveSourceContext(registry, { ...contexts, selectedValue: null }).scope, 'object');
  assert.equal(resolveSourceContext(registry, {
    ...contexts, selectedValue: null, selectedObject: null,
  }).scope, 'chapter');
  assert.equal(resolveSourceContext(registry, {
    requestedScope: 'value', selectedValue: null, selectedObject: object,
    currentChapter: chapter,
  }).scope, 'object', 'clearing a requested value must not yield an empty set');
  assert.equal(resolveSourceContext(registry, { requestedScope: 'all', ...contexts }).scope, 'all');
});

test('SC22: every chapter retains its declared contextual citations', () => {
  const claims = new Map(model.spec.claimSupport.claims.map((claim) => [claim.id, claim]));
  for (const chapter of model.spec.presentation.guided_chapters) {
    const expected = [...new Set([
      ...claims.get(chapter.target_claim_id).support.map((row) => row.source_id),
      ...chapter.source_ids,
    ])].sort();
    const sourceContext = resolveSourceContext(registry, {
      requestedScope: 'chapter',
      currentChapter: {
        label: chapter.title,
        claimIds: [chapter.target_claim_id],
        sourceIds: chapter.source_ids,
      },
    });
    assert.deepEqual(sourceContext.entries.map((source) => source.id).sort(), expected,
      `${chapter.id} contextual Sources filter is incomplete`);
    const view = ClaimViewModule.claimViewModel(chapter.target_claim_id, {
      ...registry,
      presentationRecord: chapter,
    });
    assert.deepEqual(view.sources.map((source) => source.id).sort(), expected,
      `${chapter.id} ClaimView citations are incomplete`);
  }
  assert.match(page, /claimIds: \[chapter\.target_claim_id\],[\s\S]*sourceIds: chapter\.source_ids/);
});

test('SC22: exact parameter source context remains useful offline', () => {
  const curve = Object.create(TitinVisualization.prototype);
  curve.model = model;
  curve._state = { sarcomere_length_nm: 2200 };
  const parameter = curve.forceCurve().parameters.find((row) => row.id === 'PEVK.persistence_length');
  const result = resolveSourceContext(registry, {
    selectedValue: { label: parameter.id, sourceRows: [parameter.source_context] },
  });
  assert.equal(result.scope, 'value');
  assert.equal(result.entries.length, 1);
  const support = result.entries[0].support[0];
  assert.equal(support.claimId, 'force_law_parameter_set');
  assert.equal(support.relationship, 'transfer');
  assert.match(support.locator, /equations 1–2/i);
  assert.match(`${support.species} ${support.muscleOrTissue} ${support.preparation}`, /rat.*psoas/i);
});

test('SC22: facade uses the canonical registries and rejects unknown contexts', () => {
  const facade = Object.create(TitinVisualization.prototype);
  facade.model = model;
  assert.equal(facade.claimView('scope_badge').fields[0].evidenceClass, 'MEASURED');
  assert.equal(facade.sourceContext({
    currentChapter: { label: 'Orientation', claimIds: ['titin_continuity_trace'] },
  }).scope, 'chapter');
  assert.throws(() => facade.sourceContext({ requestedScope: 'scene' }), /unknown requested scope/i);
});

test('SC22: UI gives Evidence drawer sole full-detail ownership and final Sources routing', () => {
  assert.match(page, /#app\[data-mode="evidence"\] #objectInspector \{ display: none; \}/);
  assert.match(page, /#app\[data-mode="guided"\] #objectInspectorClaim \.claim-view-specialist/);
  assert.match(page, /max-height: calc\(100% - var\(--stage-bar-h/);
  assert.match(page, /renderClaimView\(claimViewForAnnotation\(annotation\), document\)/);
  assert.match(page, /Sources for this value[\s\S]*Sources for this object[\s\S]*Sources for this chapter[\s\S]*All sources/);
  assert.match(page, /selectedValue[\s\S]*selectedObject[\s\S]*currentChapter/);
  assert.match(page, /Parameters behind this modeled output/);
  assert.match(page, /Sources for this modeled output/);
  assert.match(page, /parameter\.source_context/);
  assert.match(page, /class: 'force-current-point'[\s\S]*role: 'button'/,
    'the current chart point must itself be selectable');
  assert.match(page, /Modeled chart point at/);
  assert.doesNotMatch(page, /annotation\.lay_text/,
    'tooltips and announcements must use the same canonical ClaimView copy');
  const tabSources = page.indexOf('id="tabSources"');
  for (const prior of ['tabInspect', 'tabMeasure', 'tabEvidence']) {
    assert.ok(tabSources > page.indexOf(`id="${prior}"`), 'Sources must remain the final global tab');
  }
});

test('SC22: governed performance baseline was not replaced by a dirty working tree', () => {
  const baseline = releaseGates.performance.baseline;
  assert.equal(baseline.source_commit, 'ef0ce85');
  assert.equal(baseline.standalone_bytes, 2166960);
  assert.equal(baseline.standalone_regression_tolerance, 0.2);
  assert.equal(Object.hasOwn(baseline, 'working_tree_dirty'), false);
  assert.equal(Object.hasOwn(baseline, 'supersedes'), false);
});

test('SC22: handoff records the required schema, coverage, and ownership matrix', () => {
  const handoff = readFileSync(
    new URL('../docs/sprint-reports/SC-22.md', import.meta.url), 'utf8',
  );
  for (const field of [
    'Starting commit / ending commit',
    'Consumed decision IDs and fingerprints',
    'Tests written first and observed failure',
    'Negative controls',
    'Browser viewports/devices checked',
    'Generated files regenerated',
    'Release-gate fields changed, with evidence',
    'Human-evidence pipeline status',
    'Known limitations and next-sprint obligations',
  ]) assert.match(handoff, new RegExp(field));
  assert.match(handoff,
    /Starting commit \/ ending commit:\s+`[0-9a-f]{40}` \/\s+`[0-9a-f]{40}`\./,
    'handoff must record full starting and ending implementation commits');
  for (const count of [
    '27 canonical claims', '51 support relations', '65 references',
    '12 annotation components', '7 guided chapters', '7 expert cards',
  ]) assert.match(handoff, new RegExp(count));
  assert.match(handoff, /Responsive inspector ownership matrix/);
  assert.match(handoff, /Guided[\s\S]*Evidence[\s\S]*1280×720[\s\S]*375×812/);
});

test('SC22: bounded commands and valid-unrelated-source control are installed', () => {
  assert.match(packageRecord.scripts['test:sc22'], /showcase_phase22\.test\.js/);
  assert.match(packageRecord.scripts['verify:sc22'], /validate:claims/);
  assert.match(packageRecord.scripts['test:browser:evidence'], /evidence\.spec\.js/);
  const output = execFileSync('python3', ['scripts/neg_control_sc22.py'], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8',
  });
  assert.match(output, /PASS/);
});
