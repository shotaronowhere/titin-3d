/** SC-6 gates: the orthographic lattice breathing comparison. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { TitinVisualization, SCALES } from '../src/api/TitinVisualization.js';
import { CLOSEUPS } from '../src/render/Viewer.js';
import { validateLatticeCrossSection } from '../src/geometry/LatticeCrossSection.js';
import { checkPresentationSpec } from '../src/presentation/StoryController.js';

const model = await TitinModel.create(nodeReader());
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const LENGTHS = [1900, 2000, 2100, 2200, 2300, 2400, 2700, 3000];

test('SC6: the cross-section is orthographic and cannot foreshorten', () => {
  const view = model.latticeCrossSectionAt(2200);
  assert.equal(view.projection.kind, 'orthographic');
  assert.equal(view.projection.plane, 'YZ');
  assert.equal(view.projection.foreshortening, 'none');

  // Structural, not stylistic: a panel is plane coordinates plus one shared linear
  // scale, so there is no camera, no depth, and nothing that could be divided by w.
  for (const panel of view.panels) {
    for (const site of [...panel.thick, ...panel.thin, ...panel.ghost_thick]) {
      assert.deepEqual(Object.keys(site).filter((key) => key === 'x'), [],
        'a cross-section site must carry no axial coordinate');
      assert.ok(Number.isFinite(site.y) && Number.isFinite(site.z));
    }
    // Every filament is a circle of its own spec radius — never an ellipse, which
    // is what a foreshortened cylinder would have to be.
    const radii = new Set(panel.thick.map((site) => site.radius_nm));
    assert.equal(radii.size, 1, 'thick cross-sections must all share one radius');
    assert.equal(new Set(panel.thin.map((site) => site.radius_nm)).size, 1);
  }
  assert.doesNotMatch(page, /latticeCrossSection[\s\S]{0,2000}PerspectiveCamera/);

  // Closing the loop from descriptor to pixels: the panel builder emits circles
  // with a single radius. An ellipse — rx/ry — is what a foreshortened cylinder
  // would have to be drawn as, so its absence is the render-side form of the gate.
  const panelBody = page.slice(page.indexOf('function latticePanelNode'),
    page.indexOf('function renderLatticeCrossSection'));
  assert.ok(panelBody.length > 500);
  assert.equal((panelBody.match(/svgElement\('circle'/g) || []).length, 3,
    'ghost, thin, and thick are each drawn as circles');
  assert.doesNotMatch(panelBody, /svgElement\('ellipse'|\brx:|\bry:/);
  assert.doesNotMatch(panelBody, /scale\(|rotate\(|matrix\(/,
    'no transform may distort a cross-section circle');
});

test('SC6: cross-section sites are exactly the existing LatticeGeometry output', () => {
  for (const rings of [1, 2, 3]) {
    for (const length of [1900, 2200, 2400, 3000]) {
      const view = model.latticeCrossSectionAt(length, { rings });
      const [current] = view.panels;
      const patch = model.latticePatchAt(length, rings);
      assert.equal(view.derives_second_lattice, false);
      assert.deepEqual(
        current.thick.map((site) => [site.y, site.z]),
        patch.thick.map((site) => [site.y, site.z]),
        'thick sites must be reused verbatim, never re-derived',
      );
      assert.deepEqual(
        current.thin.map((site) => [site.y, site.z]),
        patch.thin.map((site) => [site.y, site.z]),
      );
      assert.equal(current.d10_nm, patch.d10_nm);
      assert.equal(current.lattice_constant_nm, patch.lattice_constant_nm);
    }
  }
});

test('SC6: axial and transverse readouts describe the same state', () => {
  for (const length of LENGTHS) {
    const view = model.latticeCrossSectionAt(length);
    const [current] = view.panels;
    const geometry = model.geometryAt(length);
    assert.equal(current.sarcomere_length_nm, geometry.sarcomere_length_nm);
    // The number under the dimension line is the same number the axial readout
    // shows, because both come from the one constant-volume law.
    assert.equal(current.d10_nm, geometry.lattice_d10_nm);
    assert.equal(current.surface_separation_nm,
      model.latticePatchAt(length, 2).surface_separation_nm);
  }
});

test('SC6: increasing sarcomere length monotonically reduces the displayed d10', () => {
  const sweep = [];
  for (let length = 1900; length <= 3000; length += 25) {
    sweep.push(model.latticeCrossSectionAt(length).panels[0].d10_nm);
  }
  for (let index = 1; index < sweep.length; index += 1) {
    assert.ok(sweep[index] < sweep[index - 1],
      `d10 rose from ${sweep[index - 1]} to ${sweep[index]} as the sarcomere lengthened`);
  }
  // The validator enforces the same direction on the pair it actually draws.
  for (const length of LENGTHS) {
    const view = model.latticeCrossSectionAt(length);
    const [current, comparison] = view.panels;
    const longer = current.sarcomere_length_nm > comparison.sarcomere_length_nm
      ? current : comparison;
    const shorter = longer === current ? comparison : current;
    assert.ok(longer.d10_nm < shorter.d10_nm);
  }
});

test('SC6: both panels share one centre, scale, and projection', () => {
  for (const length of LENGTHS) {
    const view = model.latticeCrossSectionAt(length);
    const frame = view.shared_frame;
    assert.deepEqual(frame.centre_nm, { y: 0, z: 0 });
    assert.ok(frame.half_extent_nm > 0);
    for (const panel of view.panels) {
      assert.equal(panel.shared_frame_id, frame.id);
      assert.equal(panel.rings, frame.rings);
      const reach = Math.max(...[...panel.thick, ...panel.thin]
        .map((site) => Math.hypot(site.y, site.z) + site.radius_nm));
      assert.ok(reach <= frame.half_extent_nm,
        'a panel drawn to its own fit would break the shared scale');
    }
    // The wider lattice actually uses most of the frame, so the shared scale is a
    // real constraint rather than a frame large enough to hide any difference.
    const widest = Math.max(...view.panels.map((panel) => Math.max(
      ...[...panel.thick, ...panel.thin].map((site) => Math.hypot(site.y, site.z) + site.radius_nm),
    )));
    assert.ok(widest / frame.half_extent_nm > 0.9);
  }
});

test('SC6: the comparison state is a defined state inside the declared working band', () => {
  const [min, max] = model.latticeCrossSectionAt(2200).working_range_nm;
  assert.deepEqual([min, max], model.spec.presentation.scope.working_range_nm);
  const states = model.spec.states.states;
  for (const length of LENGTHS) {
    const view = model.latticeCrossSectionAt(length);
    const [current, comparison] = view.panels;
    assert.ok(comparison.state_id in states, 'the comparison must be a named state');
    assert.equal(states[comparison.state_id].sarcomere_length_nm,
      comparison.sarcomere_length_nm);
    assert.ok(comparison.sarcomere_length_nm >= min && comparison.sarcomere_length_nm <= max);
    assert.equal(comparison.outside_working_range, false);
    assert.notEqual(comparison.sarcomere_length_nm, current.sarcomere_length_nm,
      'a degenerate pair would show no breathing at all');
    // Out-of-band displayed states stay visibly labelled as references.
    const outside = length < min || length > max;
    assert.equal(current.outside_working_range, outside);
    assert.equal(current.status_label.includes('OUTSIDE WORKING RANGE'), outside);
  }
  // Ties resolve deterministically, so the same length always draws the same pair.
  const tie = model.latticeCrossSectionAt(2300).panels[1];
  assert.equal(tie.sarcomere_length_nm, 2200);
  assert.equal(model.latticeCrossSectionAt(2300).panels[1].state_id, tie.state_id);
});

test('SC6: the dimension line measures d10 rather than being labelled with it', () => {
  for (const length of LENGTHS) {
    for (const panel of model.latticeCrossSectionAt(length).panels) {
      const line = panel.dimension_line;
      const drawn = Math.hypot(line.to_nm.y - line.from_nm.y, line.to_nm.z - line.from_nm.z);
      assert.ok(Math.abs(drawn - panel.d10_nm) < 1e-9,
        `${panel.id}: drew ${drawn} nm for a ${panel.d10_nm} nm d10`);
      assert.equal(line.value_nm, panel.d10_nm);
      // The line is perpendicular to the (1,0) row it measures to.
      const [a, b] = line.plane_nm;
      const row = { y: b.y - a.y, z: b.z - a.z };
      const span = { y: line.to_nm.y - line.from_nm.y, z: line.to_nm.z - line.from_nm.z };
      assert.ok(Math.abs(row.y * span.y + row.z * span.z) < 1e-6,
        'd10 is a plane spacing, so the dimension line must meet the row at a right angle');
    }
  }
});

test('SC6: the constant-volume caveat travels with the comparison', () => {
  const view = model.latticeCrossSectionAt(2200);
  assert.equal(view.caveat.beside_comparison, true);
  assert.match(view.caveat.scaling_law, /constant-volume idealization/i);
  assert.match(view.caveat.text, /not strictly isovolumetric/i);
  assert.equal(view.evidence_class, 'MODELED');
  assert.equal(view.evidence_by_claim.constant_volume_scaling_law, 'STRONGLY INFERRED');
  assert.match(view.evidence_by_claim.instantaneous_behavior_during_contraction, /^UNKNOWN/);
  assert.equal(view.time_resolved_contraction_implied, false);
  for (const expected of ['time-resolved active contraction', 'strict biological isovolumetry',
    'directly measured human skeletal d10', 'a second lattice solver']) {
    assert.ok(view.not_claimed.includes(expected), `missing non-claim: ${expected}`);
  }
  // The caveat is rendered next to the panels, not only in the evidence inventory.
  const caveatAt = page.indexOf("className = 'lattice-caveat'");
  const panelsAt = page.indexOf("className = 'lattice-pair'");
  assert.ok(caveatAt > panelsAt && caveatAt - panelsAt < 1200,
    'the caveat must be built beside the panels');
});

test('SC6: destructive mutations of the cross-section record fail closed', () => {
  const base = model.latticeCrossSectionAt(2200);
  const mutate = (change) => {
    const copy = structuredClone(base);
    change(copy);
    return copy;
  };
  assert.throws(() => validateLatticeCrossSection(mutate((view) => {
    view.projection.kind = 'perspective';
  })), /orthographic YZ projection/);
  assert.throws(() => validateLatticeCrossSection(mutate((view) => {
    view.panels[1].shared_frame_id = 'other_frame';
  })), /does not use the shared frame/);
  assert.throws(() => validateLatticeCrossSection(mutate((view) => {
    view.panels[0].dimension_line.value_nm *= 1.2;
    view.panels[0].d10_nm *= 1.2;
  })), /dimension line/);
  assert.throws(() => validateLatticeCrossSection(mutate((view) => {
    view.panels[1].sarcomere_length_nm = view.panels[0].sarcomere_length_nm;
  })), /must show different lengths/);
  assert.throws(() => validateLatticeCrossSection(mutate((view) => {
    view.panels[1].outside_working_range = true;
  })), /inside the working band/);
  // Swap only the LENGTHS, leaving each panel's measured lattice untouched: the
  // record then claims the longer sarcomere has the wider lattice.
  assert.throws(() => validateLatticeCrossSection(mutate((view) => {
    const [current, comparison] = view.panels;
    const swap = current.sarcomere_length_nm;
    current.sarcomere_length_nm = comparison.sarcomere_length_nm;
    comparison.sarcomere_length_nm = swap;
  })), /d10 must fall as sarcomere length rises/);
  assert.throws(() => validateLatticeCrossSection(mutate((view) => {
    view.time_resolved_contraction_implied = true;
  })), /may not imply active contraction/);
  assert.throws(() => validateLatticeCrossSection(mutate((view) => {
    view.caveat.beside_comparison = false;
  })), /caveat must render beside the panels/);
  assert.throws(() => validateLatticeCrossSection(mutate((view) => {
    view.not_claimed = ['something else'];
  })), /active-contraction non-claim/);
  assert.throws(() => validateLatticeCrossSection(mutate((view) => {
    view.panels[0].thick[3].y *= 3;
  })), /overflows the shared frame/);
  assert.throws(() => validateLatticeCrossSection(mutate((view) => {
    view.panels[0].ghost_thick[3].z *= 3;
  })), /overflows the shared frame/);
});

test('SC6: the module refuses a working band that drifted from its source', async () => {
  const drift = async (mutate) => {
    const reader = async (name) => {
      const value = await nodeReader()(name);
      mutate(name, value);
      return value;
    };
    const drifted = await TitinModel.create(reader, { validate: false });
    return drifted.latticeCrossSectionAt(2200);
  };
  await assert.rejects(() => drift((name, value) => {
    if (name === 'presentation.json') value.scope.working_range_nm = [1500, 4400];
  }), /does not match the sourced/);
  await assert.rejects(() => drift((name, value) => {
    if (name === 'geometry_sources.json') {
      value.parameters.find((p) => p.parameter === 'Resting/working length').unit = 'nm';
    }
  }), /recorded in 'nm', expected/);
});

test('SC6: the page renders both panels from one shared frame and no camera', () => {
  assert.match(page, /id="latticeCrossSection"/);
  assert.match(page, /function renderLatticeCrossSection/);
  assert.match(page, /visualization\.latticeCrossSection\(\)/);
  assert.match(page, /renderLatticeCrossSection\(\);/);
  assert.match(page, /const half = view\.shared_frame\.half_extent_nm/,
    'both panels must be laid out from the shared frame, not per-panel fits');
  assert.match(page, /viewBox: `\$\{-half\} \$\{-half\}/);
  assert.match(page, /id="guidedLattice"/);
  assert.match(page, /activeFeatures\(\)\.has\('lattice_cross_section'\)/);
  // Hue is the identity channel: a measurement annotation may not wear a protein's
  // colour, or the d10 line would read as titin lying across the lattice.
  assert.match(page, /const DIMENSION_INK = '#dfe7f2'/);
  const panelBody = page.slice(page.indexOf('function latticePanelNode'),
    page.indexOf('function renderLatticeCrossSection'));
  assert.doesNotMatch(panelBody, /COMPONENT_COLOR\.titin/);
  const drawerStart = page.indexOf('id="panel"');
  const drawerEnd = page.indexOf('</aside>', drawerStart);
  const section = page.indexOf('id="latticeCrossSection"');
  assert.ok(section > drawerStart && section < drawerEnd);
  // The perspective down-axis close-up must no longer present ITSELF as the
  // cross-section now that an orthographic one exists.
  assert.doesNotMatch(CLOSEUPS.lattice.shows, /lattice in cross-section$/);
  assert.match(CLOSEUPS.lattice.shows, /orthographic lattice cross-section, not here/);
});

test('SC6: a guided chapter may legally request the comparison', () => {
  // The claim admits both audiences, so the vocabulary must genuinely accept the
  // feature — otherwise the SC-7 chapter that surfaces it could not be written.
  const context = {
    claims: model.spec.showcaseClaims,
    references: model.spec.references,
    sarcomere: model.spec.sarcomere,
    titin: model.spec.titin,
    states: model.spec.states,
  };
  assert.deepEqual(model.spec.showcaseClaims.objects
    .find((object) => object.id === 'lattice_cross_section').audience, ['GUIDED', 'EVIDENCE']);
  const requested = structuredClone(model.spec.presentation);
  requested.guided_chapters[0].presentation_features.push('lattice_cross_section');
  assert.deepEqual(checkPresentationSpec(requested, context), []);

  const invented = structuredClone(model.spec.presentation);
  invented.guided_chapters[0].presentation_features.push('lattice_hologram');
  assert.ok(checkPresentationSpec(invented, context)
    .some((problem) => /invalid presentation_features/.test(problem)),
    'the vocabulary must still be closed');
});

test('SC6: the facade exposes the comparison at the displayed length only', () => {
  const facade = Object.create(TitinVisualization.prototype);
  facade.model = model;
  facade.scale = SCALES.context;
  assert.throws(() => facade.latticeCrossSection(), /set a state before requesting/);
  facade._state = { sarcomere_length_nm: 2400 };
  const view = facade.latticeCrossSection();
  assert.equal(view.panels[0].sarcomere_length_nm, 2400);
  assert.equal(view.panels[1].sarcomere_length_nm, 2200);
});
