/** SC-9 gates: release artifacts, build identity, rehearsal record, and handoff. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { createReleasePack, validateReleasePack, SLIDE } from '../src/presentation/ReleasePack.js';
import {
  MODEL_INPUTS, modelFingerprint, readEmbeddedBuildIdentity,
} from '../scripts/build_identity.mjs';

const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const standaloneBytes = readFileSync(new URL('../index.html', import.meta.url));
const standalone = standaloneBytes.toString('utf8');
const identity = readEmbeddedBuildIdentity(standaloneBytes);
const model = await TitinModel.create(nodeReader(), { identity });
const gates = JSON.parse(
  readFileSync(new URL('../data/release_gates.json', import.meta.url), 'utf8'),
);
const manifest = JSON.parse(
  readFileSync(new URL('../release/MANIFEST.json', import.meta.url), 'utf8'),
);
const releaseFile = (name) => readFileSync(new URL(`../release/${name}`, import.meta.url), 'utf8');
const pack = createReleasePack(model, { identity });

// ---------------------------------------------------------------------------
// The artifacts the plan names
// ---------------------------------------------------------------------------

test('SC9: every named release artifact exists and is generated, not written', () => {
  for (const name of ['CLAIM_MATRIX.md', 'LIMITATIONS.md', 'PRESENTER_SCRIPT.md',
    'PREFLIGHT.md', 'SCREENSHOT_PACK.md', 'MANIFEST.json', 'MANIFEST.sha256']) {
    assert.ok(existsSync(new URL(`../release/${name}`, import.meta.url)), `${name} is missing`);
  }
  for (const slide of ['scope', 'architecture', 'extension', 'lattice', 'provenance', 'limitations']) {
    assert.ok(existsSync(new URL(`../release/fallback/${slide}.svg`, import.meta.url)),
      `fallback/${slide}.svg is missing`);
  }
  assert.equal(manifest.generated_by, 'scripts/build_release_pack.mjs');
  // The staleness gate is what keeps a handoff package honest as the science moves.
  assert.match(releaseFile('CLAIM_MATRIX.md'), /Do not edit by hand: run `npm run pack`/);
  const scripts = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    .scripts;
  assert.match(scripts['check:pack'], /--check/);
  assert.match(scripts.verify, /check:pack/);
});

test('SC9: the claim matrix restates the audit exactly, with resolvable citations', () => {
  const claims = model.spec.showcaseClaims.objects;
  assert.equal(pack.claim_matrix.length, claims.length);
  const doc = releaseFile('CLAIM_MATRIX.md');
  for (const claim of claims) {
    const row = pack.claim_matrix.find((entry) => entry.id === claim.id);
    assert.ok(row, `${claim.id} missing from the matrix`);
    // The matrix may not soften or strengthen anything the audit decided.
    assert.equal(row.decision, claim.decision);
    assert.equal(row.claim_evidence_class, claim.claim_evidence_class);
    assert.equal(row.render_evidence_class, claim.render_evidence_class);
    assert.deepEqual(row.not_claimed, claim.not_claimed);
    assert.ok(doc.includes(claim.id), `${claim.id} is absent from the rendered matrix`);
    for (const source of row.sources) {
      if (source.href) assert.match(source.href, /^https:\/\//);
      else assert.ok(source.id.startsWith('data/') || source.id.startsWith('scripts/'),
        `${claim.id}: an unlinked source must be an internal record, got ${source.id}`);
    }
  }
});

test('SC9: the limitations sheet carries every recorded non-claim', () => {
  const doc = releaseFile('LIMITATIONS.md');
  const groups = new Map(pack.limitations.map((group) => [group.id, group]));
  for (const id of ['claims', 'global_controls', 'annotations', 'narrative',
    'spec_unknowns', 'forbidden']) {
    assert.ok(groups.has(id), `the sheet is missing the '${id}' group`);
  }
  // Spot-check that the sheet is derived rather than summarised: each source
  // record's non-claims must all appear.
  for (const claim of model.spec.showcaseClaims.objects) {
    for (const entry of claim.not_claimed) {
      assert.ok(groups.get('claims').entries.includes(entry),
        `missing non-claim: ${entry}`);
    }
  }
  for (const control of model.spec.showcaseClaims.global_negative_controls) {
    assert.ok(doc.includes(control), `missing global control: ${control}`);
  }
  const total = pack.limitations.reduce((sum, group) => sum + group.entries.length, 0);
  assert.ok(total >= 100, `only ${total} non-claims reached the sheet`);
});

test('SC9: the presenter script matches the shipped route and its pacing', () => {
  const script = pack.presenter_script;
  const chapters = [...model.spec.presentation.guided_chapters].sort((a, b) => a.order - b.order);
  assert.deepEqual(script.chapters.map((row) => row.id), chapters.map((c) => c.id));
  for (const [index, row] of script.chapters.entries()) {
    // The presenter reads the on-screen copy, so it cannot diverge from it.
    assert.equal(row.say, chapters[index].lay_summary);
    assert.equal(row.if_asked, chapters[index].expert_expansion);
    assert.match(row.show, /\d+ nm, (context|detail) scale/);
  }
  const [low, high] = script.target_seconds;
  assert.ok(script.estimated_seconds >= low && script.estimated_seconds <= high,
    `${script.estimated_seconds} s is outside the declared ${low}-${high} s window`);
  const doc = releaseFile('PRESENTER_SCRIPT.md');
  assert.match(doc, /you do not need to open it\s*\n?to finish the tour|do not need to open it/);
  for (const row of script.chapters) assert.ok(doc.includes(row.title));
});

test('SC9: the preflight keeps its seven steps and points at a real fallback', () => {
  assert.equal(pack.preflight.length, 7);
  assert.deepEqual(pack.preflight.map((step) => step.step), [1, 2, 3, 4, 5, 6, 7]);
  const doc = releaseFile('PREFLIGHT.md');
  for (const step of pack.preflight) {
    assert.ok(doc.includes(step.action), `step ${step.step} is missing from the checklist`);
    assert.ok(step.expected.trim(), `step ${step.step} states no expectation`);
  }
  // The plan is explicit that the live narrative must not depend on external links.
  assert.match(doc, /Do not plan to open external citations/);
  for (const value of Object.values(identity)) {
    assert.ok(doc.includes(value), 'the preflight must name all candidate identities');
  }
});

// ---------------------------------------------------------------------------
// Build identity — the comparison the preflight turns on
// ---------------------------------------------------------------------------

test('SC9/18: the standalone reports three non-self-referential candidate identities', () => {
  assert.match(identity.model_fingerprint, /^[0-9a-f]{64}$/);
  assert.match(identity.build_inputs_fingerprint, /^[0-9a-f]{64}$/);
  assert.match(identity.app_revision, /^[0-9a-f]{40}(?:-dirty)?$/);
  assert.equal(manifest.model_fingerprint, identity.model_fingerprint);
  assert.equal(manifest.app_revision, identity.app_revision);
  assert.equal(manifest.build_inputs_fingerprint, identity.build_inputs_fingerprint);
  assert.match(page, /id="buildFingerprint"/);
  assert.match(page, /id="modelFingerprint"/);
  assert.match(page, /id="appRevision"/);
  assert.match(page, /id="buildInputsFingerprint"/);
  assert.match(page, /model\.spec\.identity/);
  const drawerStart = page.indexOf('id="panel"');
  const drawerEnd = page.indexOf('</aside>', drawerStart);
  const location = page.indexOf('id="buildFingerprint"');
  assert.ok(location > drawerStart && location < drawerEnd,
    'the fingerprint must be in the Evidence drawer, where the preflight looks');
});

test('SC9/18: the model fingerprint tracks only explicit primary model inputs', () => {
  const before = modelFingerprint();
  for (const input of MODEL_INPUTS) {
    assert.match(input, /^data\/.*\.json$/, `${input} is not a specification record`);
    assert.ok(existsSync(new URL(`../${input}`, import.meta.url)), `${input} is missing`);
  }
  assert.ok(!MODEL_INPUTS.includes('data/mechanical_model.json'));
  assert.ok(!MODEL_INPUTS.includes('data/release_gates.json'));
  assert.equal(modelFingerprint(), before, 'the fingerprint must be deterministic');
});

// ---------------------------------------------------------------------------
// The fallback deck
// ---------------------------------------------------------------------------

test('SC9: the fallback deck says what the application says, without a GPU', () => {
  for (const slide of pack.fallback_slides) {
    const svg = releaseFile(`fallback/${slide.id}.svg`);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.ok(svg.includes(`viewBox="0 0 ${SLIDE.width} ${SLIDE.height}"`));
    assert.ok(svg.includes(slide.title), `${slide.id}: title missing from the slide`);
    // Every slide carries its caveat, exactly as the interactive build does.
    assert.ok(slide.footnote.trim().length > 20, `${slide.id}: caveat too thin`);
    // No script, no external reference, no network: it must open anywhere. The
    // SVG namespace URI is a required declaration, not a fetch, so it is excluded
    // before looking for anything the renderer would actually go and load.
    const fetchable = svg.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '');
    assert.doesNotMatch(fetchable, /https?:\/\//, `${slide.id}: references a remote resource`);
    assert.doesNotMatch(svg, /<script|<image|xlink:href|<foreignObject/,
      `${slide.id}: embeds something a plain SVG viewer may not render`);
  }
  // The numbers on the slides are the model's numbers.
  const overlay = model.latticeCrossSectionAt(pack.reference_length_nm);
  const lattice = releaseFile('fallback/lattice.svg');
  assert.ok(lattice.includes(`d10 ${overlay.panels[0].d10_nm.toFixed(1)} nm`));
  assert.ok(lattice.includes(String(overlay.panels[1].sarcomere_length_nm)));
  const extension = releaseFile('fallback/extension.svg');
  const chart = model.spec.presentation.scope.working_range_nm[1];
  assert.ok(extension.includes(`${chart} nm`), 'the comparison length must be shown');
  // The deck states the modelled status of the lattice rather than implying measurement.
  assert.match(lattice, /constant-volume idealization/);
});

test('SC9: a release pack missing its provenance is rejected', () => {
  const strip = (mutate) => {
    const copy = structuredClone(pack);
    mutate(copy);
    return copy;
  };
  assert.throws(() => validateReleasePack(strip((p) => { p.claim_matrix[0].sources = []; })),
    /cites no source/);
  assert.throws(() => validateReleasePack(strip((p) => { p.claim_matrix[0].not_claimed = []; })),
    /missing claim, scope, or non-claims/);
  assert.throws(() => validateReleasePack(strip((p) => { p.limitations = p.limitations.slice(0, 2); })),
    /too thin to be a handoff/);
  assert.throws(() => validateReleasePack(strip((p) => { p.preflight.pop(); })),
    /seven reviewed steps/);
  assert.throws(() => validateReleasePack(strip((p) => {
    p.fallback_slides = p.fallback_slides.filter((slide) => slide.id !== 'limitations');
  })), /missing 'limitations'/);
  assert.throws(() => validateReleasePack(strip((p) => { p.fallback_slides[0].footnote = ''; })),
    /lacks a title or its caveat/);
  assert.throws(() => validateReleasePack(strip((p) => {
    p.presenter_script.estimated_seconds = 900;
  })), /outside/);
});

// ---------------------------------------------------------------------------
// The final release definition
// ---------------------------------------------------------------------------

test('SC9: the twelve release conditions are tracked and none is over-claimed', () => {
  const definition = gates.final_release_definition;
  assert.equal(definition.conditions.length, 12);
  assert.equal(definition.status, 'PENDING');
  assert.equal(gates.release_ready, false);

  const sections = new Set(Object.keys(gates).filter((key) => (
    gates[key] && typeof gates[key] === 'object' && 'status' in gates[key]
  )));
  for (const condition of definition.conditions) {
    assert.ok(condition.statement.trim());
    if (condition.status === 'PASS') {
      assert.ok(condition.verified_by, `${condition.id}: passes with no verifier`);
    } else {
      assert.ok(sections.has(condition.blocked_by),
        `${condition.id}: names no real gate as its blocker`);
      assert.notEqual(gates[condition.blocked_by].status, 'PASS',
        `${condition.id}: waits on a gate that already passed`);
    }
  }
  // The conditions that cannot be settled from inside the repository.
  const outstanding = definition.conditions
    .filter((condition) => condition.status !== 'PASS').map((condition) => condition.id);
  assert.deepEqual(outstanding.sort(), [
    'expert_clear', 'lattice_legible', 'novice_comprehension',
    'outputs_agree', 'rehearsal_and_fallback', 'titin_continuity',
  ]);
});

test('SC9: the rehearsal record claims nothing that has not been rehearsed', () => {
  const rehearsal = gates.demo_rehearsal;
  assert.equal(rehearsal.status, 'PENDING');
  assert.equal(rehearsal.rehearsed_by, null);
  assert.equal(rehearsal.rehearsed_on, null);
  assert.equal(rehearsal.checklist, 'release/PREFLIGHT.md');
  assert.ok(rehearsal.checks.length >= 6);
  for (const check of rehearsal.checks) {
    assert.equal(check.status, 'PENDING');
    assert.ok(['browser', 'human'].includes(check.verification),
      `${check.id}: a rehearsal step cannot be automated away`);
  }
  // Release artifacts, by contrast, are all machine-verifiable and do pass.
  assert.equal(gates.release_artifacts.status, 'PASS');
  for (const check of gates.release_artifacts.checks) {
    assert.equal(check.verification, 'automated');
    assert.equal(check.status, 'PASS');
    const files = check.verified_by.split(/[;\s]+/).filter((value) => value.includes('/'));
    assert.ok(files.length, `${check.id}: names no verifier file`);
    for (const file of files) {
      assert.ok(existsSync(new URL(`../${file}`, import.meta.url)),
        `${check.id}: '${file}' does not exist`);
    }
  }
  for (const section of ['demo_rehearsal', 'final_release_definition']) {
    assert.ok(gates.release_blockers.some((entry) => entry.startsWith(section)),
      `${section} is outstanding but not listed as a blocker`);
  }
});

// ---------------------------------------------------------------------------
// Handoff documentation
// ---------------------------------------------------------------------------

test('SC9: the README hands the project over accurately', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  for (const needle of ['Guided', 'Evidence', 'npm run verify', 'index.html',
    'GitHub Pages', 'release/']) {
    assert.ok(readme.includes(needle), `README does not mention ${needle}`);
  }
  // The status statement must not claim a readiness the gates deny.
  assert.match(readme, /not (yet )?release-ready|remain outstanding/i);
  assert.ok(!/release[- ]ready(?!\W*(:|is not|is false))/i.test(
    readme.replace(/not yet release-ready/gi, '')),
  'the README must not assert release readiness');
});
