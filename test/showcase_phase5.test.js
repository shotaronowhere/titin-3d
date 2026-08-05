/** SC-5 gates: the A-band scaffold story and the optional schematic MyBP-C layer. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { createAnnotations } from '../src/api/TitinAnnotations.js';
import { TitinVisualization, SCALES } from '../src/api/TitinVisualization.js';
import {
  COMPONENTS, SarcomereScene, ALIAS_THRESHOLD_PX, MYBPC_MIN_VIEW_FRACTION,
} from '../src/render/SarcomereScene.js';
import { CLOSEUPS, closeUpLandmarks } from '../src/render/Viewer.js';
import { createShowcaseOverlay } from '../src/presentation/ShowcaseOverlay.js';
import { validateMyBPCContext } from '../src/geometry/MyBPCContext.js';
import { checkPresentationSpec } from '../src/presentation/StoryController.js';

const model = await TitinModel.create(nodeReader());
const sl = 2200;
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const LENGTHS = [1900, 2000, 2200, 2400, 3000];

function build({
  mybpc = false, presentationMode = 'evidence', viewWidthNm = 400, titinTubeRadiusNm,
} = {}) {
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(sl, { rings: 1 }), model.domainInstancesAt(sl), {
    latticeScope: 'local',
    mirror: true,
    titinStrands: false,
    titinPath: model.backboneAt(sl),
    mybpcContext: mybpc ? model.mybpcContextAt(sl, { rings: 1 }) : null,
    presentationMode,
    viewWidthNm,
    viewportPx: 1200,
    ...(titinTubeRadiusNm === undefined ? {} : { titinTubeRadiusNm }),
  });
  return scene;
}

// ---------------------------------------------------------------------------
// The A-band story, which must stand on its own before MyBP-C is enabled
// ---------------------------------------------------------------------------

test('SC5: the A-band scaffold story is complete and sourced without MyBP-C', () => {
  const scene = build();
  assert.equal(scene.manifest.mybpc_context, null,
    'MyBP-C is absent unless a caller opts in');
  scene.clear();

  for (const length of LENGTHS) {
    const scaffold = createShowcaseOverlay(model, length).aband_scaffold;
    assert.equal(scaffold.region_id, 'Aband_super');
    assert.equal(scaffold.domains_per_super_repeat, 11);
    assert.equal(scaffold.c_zone_super_repeats, 11);
    assert.equal(scaffold.super_repeat_nm, 45.5);
    assert.equal(scaffold.myosin_repeat_nm, 43.1);
    assert.ok(scaffold.source_ids.length >= 2, 'the scaffold claim carries its sources');
    assert.ok(scaffold.not_claimed.some((entry) => /exact register/i.test(entry)));
    assert.ok(scaffold.not_claimed.some((entry) => /settled causal mechanism/i.test(entry)),
      'the ruler and regulatory roles stay explicitly unsettled');
  }
});

test('SC5: the anchored A-band span is invariant while the I-band spring changes', () => {
  const spans = new Set();
  const iband = new Set();
  for (const length of LENGTHS) {
    const overlay = createShowcaseOverlay(model, length);
    spans.add(Number(overlay.aband_scaffold.anchored_span_nm.toFixed(6)));
    iband.add(Number(overlay.extension_chart.total_nm.toFixed(6)));
    assert.equal(overlay.aband_scaffold.anchored_span_invariant, true);
    // The scaffold translates with the thick filament rather than staying put.
    assert.equal(
      Number(overlay.aband_scaffold.start_nm.toFixed(6)),
      Number(model.geometryAt(length).thick_filament.X_start.toFixed(6)),
    );
  }
  assert.equal(spans.size, 1, `A-band span changed with sarcomere length: ${[...spans]}`);
  assert.equal(iband.size, LENGTHS.length, 'the I-band spring must not be invariant too');
});

// ---------------------------------------------------------------------------
// The optional MyBP-C context layer
// ---------------------------------------------------------------------------

test('SC5: one canonical C-zone feeds the domain block, the bracket, and MyBP-C', () => {
  for (const length of LENGTHS) {
    const zone = model.cZoneAt(length);
    const bracket = createShowcaseOverlay(model, length).brackets
      .find((entry) => entry.id === 'czone');
    assert.equal(bracket.start_nm, zone.start_nm, 'the band bracket must not re-derive it');
    assert.equal(bracket.end_nm, zone.end_nm);
    assert.equal(model.mybpcContextAt(length, { rings: 1 }).c_zone.start_nm, zone.start_nm,
      'MyBP-C must not re-derive it either');

    // The same interval must be where the C-zone domain block is actually placed.
    const cZoneDomains = model.domainInstancesAt(length).instances
      .filter((instance) => instance.zone === 'C_zone');
    assert.equal(cZoneDomains.length, zone.domains);
    const first = cZoneDomains[0].position_nm.x;
    const last = cZoneDomains.at(-1).position_nm.x;
    assert.ok(first > zone.start_nm && last < zone.end_nm,
      `drawn C-zone domains ${first}..${last} fall outside the canonical interval`);
  }
});

test('SC5: MyBP-C uses only the canonical C-zone and its sourced skeletal periodicity', () => {
  for (const length of LENGTHS) {
    const context = model.mybpcContextAt(length, { rings: 1 });
    const zone = model.cZoneAt(length);
    assert.equal(context.c_zone.start_nm, zone.start_nm);
    assert.equal(context.c_zone.end_nm, zone.end_nm);
    // MyBP-C keeps its OWN 43 nm periodicity rather than borrowing titin's 45.5 nm,
    // which would silently assert an exact shared register.
    assert.notEqual(context.stripe_spacing_nm, zone.super_repeat_nm);
    assert.equal(context.stripe_spacing_nm, 43);
    assert.equal(context.molecules_per_stripe, 3);
    assert.equal(context.stripes.length, 11);
    assert.deepEqual(context.source_ids, ['10.1038/s41467-024-46957-7']);
    for (const stripe of context.stripes) {
      assert.ok(stripe.x_nm >= context.c_zone.start_nm && stripe.x_nm <= context.c_zone.end_nm);
    }
  }

  const parameters = model.spec.geometrySources.parameters
    .filter((entry) => entry.component === 'MyBP-C');
  assert.equal(parameters.length, 2);
  for (const record of parameters) {
    assert.equal(record.primary_source, '10.1038/s41467-024-46957-7');
    assert.match(record.muscle_type, /skeletal/i);
    assert.ok(model.provenance.forParameter('MyBP-C', record.parameter).found);
  }
});

test('SC5: MyBP-C is accessory context — Evidence-only, off by default, subordinate', () => {
  const context = model.mybpcContextAt(sl, { rings: 1 });
  assert.deepEqual(context.audience, ['EVIDENCE']);
  assert.equal(context.default_visible, false);
  assert.equal(context.part_of_titin, false);
  assert.equal(model.spec.showcaseClaims.attention_budget.mybpc_default_visibility, false);

  // A default build never carries it, at either scale.
  const facade = Object.create(TitinVisualization.prototype);
  facade._displayOptions = {};
  assert.equal(facade._optsForScale(SCALES.context, {}).showMyBPC, false);
  assert.equal(facade._optsForScale(SCALES.detail, {}).showMyBPC, false);
  assert.ok(TitinVisualization.DETAIL_HIDDEN.includes('mybpc'),
    'the isolated-titin view hides accessory filament proteins');

  // Guided mode may not build the layer at all.
  assert.throws(() => build({ mybpc: true, presentationMode: 'guided' }),
    /admitted for EVIDENCE audiences, not 'guided'/);

  const scene = build({ mybpc: true });
  const report = scene.manifest.mybpc_context;
  assert.equal(report.drawn, true);
  assert.equal(report.molecules_drawn, 33);
  const molecules = scene.root.getObjectByName('mybpc_czone_molecules');
  const titinTube = scene.root.getObjectByName('titin_region_Aband_super_strand_0');
  assert.ok(molecules.userData.render_radius_nm < titinTube.userData.render_radius_nm,
    'MyBP-C markers must stay visually subordinate to titin');
  assert.equal(scene.pickTarget(molecules, 0).target_id, 'mybpc',
    'MyBP-C resolves to its own annotation, not the thick filament');
  scene.clear();

  // Subordination is structural, not a coincidence of the default titin width: a
  // caller that shrinks the titin tube shrinks the accessory marker with it.
  const thin = build({ mybpc: true, titinTubeRadiusNm: 0.4 });
  const thinReport = thin.manifest.mybpc_context;
  assert.ok(thinReport.molecule_render_radius_nm < thinReport.titin_render_radius_nm);
  assert.equal(
    thin.root.getObjectByName('mybpc_czone_molecules').userData.render_radius_nm,
    thinReport.molecule_render_radius_nm,
  );
  thin.clear();
});

test('SC5: MyBP-C detail appears only when the view is framed on its C-zone', () => {
  // The reviewed attention budget confines MyBP-C detail to its relevant close-up.
  // The 43 nm stripe spacing resolves even in an overview, so a second, framing
  // gate is what actually enforces that rule.
  const zone = model.cZoneAt(sl);
  const drawnAt = (viewWidthNm) => {
    const scene = build({ mybpc: true, viewWidthNm });
    const report = scene.manifest.mybpc_context;
    scene.clear();
    return report;
  };
  for (const closeUp of [120, 260, 400, zone.length_nm * 2]) {
    assert.equal(drawnAt(closeUp).drawn, true, `withdrawn at a ${closeUp} nm view`);
  }
  for (const wide of [zone.length_nm * 2 + 1, 1250, 2500]) {
    const report = drawnAt(wide);
    assert.equal(report.drawn, false, `still drawn at a ${wide} nm view`);
    assert.match(report.omitted_because, /below the 50% needed for accessory C-zone detail/);
    assert.ok(report.feature_px > report.alias_threshold_px,
      'the framing gate, not the aliasing gate, is what withdrew it');
  }
});

test('SC5: a C-zone close-up exists and satisfies the framing gate it presupposes', () => {
  const preset = CLOSEUPS.czone;
  assert.ok(preset, 'the layer confined to its close-up must have one');
  for (const length of LENGTHS) {
    const zone = model.cZoneAt(length);
    const [x] = preset.at(closeUpLandmarks(model, length));
    assert.equal(x, (zone.start_nm + zone.end_nm) / 2,
      'the close-up reads the canonical C-zone, it does not re-derive it');
    assert.ok(x > zone.start_nm && x < zone.end_nm);
    // Both gates must pass at this span, or the preset would open on nothing.
    assert.ok(zone.length_nm / preset.spanNm >= MYBPC_MIN_VIEW_FRACTION);
    assert.ok((1200 * 43) / preset.spanNm >= ALIAS_THRESHOLD_PX);
  }
  const scene = build({ mybpc: true, viewWidthNm: preset.spanNm });
  assert.equal(scene.manifest.mybpc_context.drawn, true);
  scene.clear();
});

test('SC5: hiding or withdrawing MyBP-C changes no other coordinate', () => {
  const on = build({ mybpc: true });
  const off = build();
  const comparable = (manifest) => JSON.stringify({
    ...manifest, mybpc_context: null, render_only: null, primitives_used: null,
  });
  assert.equal(comparable(on.manifest), comparable(off.manifest),
    'the optional layer moves no titin, filament, overlap, or lattice coordinate');

  const toggled = on.setComponentVisibility({ mybpc: false });
  assert.ok(toggled.mybpc > 0);
  assert.deepEqual(on.hiddenComponents(), ['mybpc']);
  assert.equal(comparable(on.manifest), comparable(off.manifest),
    'hiding the layer is a change of what is drawn, never of what is claimed');
  on.clear(); off.clear();

  // Zoomed out past its own resolvability, the layer withdraws and says so.
  const far = build({ mybpc: true, viewWidthNm: 40000 });
  assert.equal(far.manifest.mybpc_context.drawn, false);
  assert.match(far.manifest.mybpc_context.omitted_because, /below the 2 px aliasing threshold/);
  assert.equal(far.root.getObjectByName('mybpc_czone_molecules'), undefined);
  far.clear();
});

test('SC5: no MyBP-C molecule bridges to a thin filament or contacts titin', () => {
  for (const length of LENGTHS) {
    const context = model.mybpcContextAt(length, { rings: 1 });
    const dimensions = context.render_dimensions_nm;
    assert.equal(context.reaches_thin_filament, false);
    assert.equal(context.rigid_thick_to_thin_bridge_rendered, false);
    assert.equal(context.titin_contact_rendered, false);
    assert.ok(dimensions.thin_filament_clearance_nm > 0);
    const molecules = context.stripes.flatMap((stripe) => stripe.molecules);
    for (const molecule of molecules) {
      const radius = Math.hypot(molecule.end_nm.y, molecule.end_nm.z);
      assert.ok(radius < dimensions.thin_filament_surface_radius_nm,
        `${molecule.id} reaches the thin-filament surface at SL ${length}`);
    }
    // Not one rigid identical pose repeated across the C-zone.
    assert.ok(new Set(molecules.map((molecule) => molecule.axial_tilt_deg)).size > 1);
  }
});

test('SC5: placement evidence can never be promoted above SCHEMATIC', () => {
  const context = model.mybpcContextAt(sl, { rings: 1 });
  assert.equal(context.placement_evidence_class, 'SCHEMATIC');
  assert.equal(context.evidence_class, 'SCHEMATIC');
  assert.equal(context.cardiac_coordinates_imported, false);

  const promoted = structuredClone(context);
  promoted.placement_evidence_class = 'MEASURED';
  assert.throws(() => validateMyBPCContext(promoted), /must remain SCHEMATIC/);

  const bridged = structuredClone(context);
  bridged.rigid_thick_to_thin_bridge_rendered = true;
  assert.throws(() => validateMyBPCContext(bridged), /rigid thick-to-thin bridge is forbidden/);

  const touching = structuredClone(context);
  const far = touching.render_dimensions_nm.thin_filament_surface_radius_nm;
  touching.render_dimensions_nm.max_outer_radius_nm = far * 2;
  touching.stripes[0].molecules[0].end_nm.y = far + 1;
  touching.stripes[0].molecules[0].end_nm.z = 0;
  assert.throws(() => validateMyBPCContext(touching), /would touch a thin filament/);

  const contacting = structuredClone(context);
  contacting.titin_contact_rendered = true;
  assert.throws(() => validateMyBPCContext(contacting), /never in contact with it/);

  const guidedPromotion = structuredClone(context);
  guidedPromotion.audience = ['GUIDED', 'EVIDENCE'];
  assert.throws(() => validateMyBPCContext(guidedPromotion), /Evidence-only and off by default/);

  const rigidPose = structuredClone(context);
  for (const stripe of rigidPose.stripes) {
    for (const molecule of stripe.molecules) molecule.axial_tilt_deg = 0;
  }
  assert.throws(() => validateMyBPCContext(rigidPose), /identical rigid poses/);

  const driftedStripes = structuredClone(context);
  driftedStripes.stripes[1].x_nm += 5;
  assert.throws(() => validateMyBPCContext(driftedStripes), /reproduce the sourced periodicity/);
});

test('SC5: the module refuses a claim record that no longer admits a schematic layer', () => {
  const promoteClaim = (mutate) => async (name) => {
    const value = await nodeReader()(name);
    if (name === 'showcase_claims.json') {
      mutate(value.objects.find((object) => object.id === 'mybpc_czone_context'), value);
    }
    return value;
  };
  const load = async (mutate) => {
    const spec = await TitinModel.create(promoteClaim(mutate), { validate: false });
    return spec.mybpcContextAt(sl, { rings: 1 });
  };
  return Promise.all([
    assert.rejects(() => load((claim) => { claim.render_evidence_class = 'MEASURED'; }),
      /not admitted as SCHEMATIC/),
    assert.rejects(() => load((claim) => { claim.audience = ['GUIDED', 'EVIDENCE']; }),
      /Evidence mode only/),
    assert.rejects(() => load((_claim, record) => {
      record.attention_budget.mybpc_default_visibility = true;
    }), /keeps MyBP-C off by default/),
  ]);
});

// ---------------------------------------------------------------------------
// Explanations: annotation, expert card, and the page that shows them
// ---------------------------------------------------------------------------

test('SC5: MyBP-C is explained as accessory context with resolved sources', () => {
  assert.deepEqual(
    new Set(model.spec.annotations.components.map((record) => record.target_id)),
    new Set(Object.keys(COMPONENTS)),
    'every pickable component, including MyBP-C, has exactly one annotation',
  );
  const annotation = createAnnotations(model, sl, { scale: SCALES.context })
    .find((record) => record.target_id === 'mybpc');
  assert.ok(annotation, 'MyBP-C is annotated in the context scale');
  assert.equal(annotation.evidence.render_class, 'SCHEMATIC');
  assert.match(annotation.lay_text, /not part of titin/i);
  assert.match(annotation.scope, /no cardiac coordinates are imported/i);
  assert.ok(annotation.not_claimed.some((entry) => /cardiac/i.test(entry)));
  assert.ok(annotation.not_claimed.some((entry) => /rigid thick-to-thin bridge/i.test(entry)));
  assert.ok(annotation.not_claimed.some((entry) => /direct titin/i.test(entry)));
  assert.match(annotation.sources[0].href, /^https:\/\/doi\.org\//);

  const cZone = model.cZoneAt(sl);
  assert.ok(annotation.anchor_nm.x > cZone.start_nm && annotation.anchor_nm.x < cZone.end_nm,
    'the label anchor sits inside the C-zone it explains');

  // The isolated-titin view drops accessory context entirely.
  assert.equal(
    createAnnotations(model, sl, { scale: SCALES.detail })
      .some((record) => record.target_id === 'mybpc'),
    false,
  );
});

test('SC5: an Evidence-mode card records why cardiac coordinates were not imported', () => {
  const cards = model.spec.presentation.expert_cards;
  const mybpcCard = cards.find((card) => card.target_claim_id === 'mybpc_czone_context');
  assert.ok(mybpcCard, 'the admitted MyBP-C layer carries a scope card');
  assert.equal(mybpcCard.audience, 'evidence');
  assert.match(mybpcCard.body, /cardiac/i);
  assert.match(mybpcCard.body, /mix isoforms/i);
  assert.ok(mybpcCard.not_claimed.some((entry) => /cardiac cMyBP-C coordinates/i.test(entry)));

  const scaffoldCard = cards.find((card) => card.target_claim_id === 'titin_region_architecture');
  assert.ok(scaffoldCard, 'the scaffold/ruler framing is separately carded');
  assert.equal(scaffoldCard.audience, 'evidence');
  assert.match(scaffoldCard.body, /remain active proposals/i);
  assert.ok(scaffoldCard.not_claimed.some((entry) => /settled ruler mechanism/i.test(entry)));

  const provenance = model.mybpcProvenance();
  assert.equal(provenance.decision, 'ADMIT_SCHEMATIC');
  assert.equal(provenance.default_visible, false);
  assert.match(provenance.cardiac_omission.why, /skeletal/i);
  assert.equal(provenance.evidence_by_claim.axial_register, 'SCHEMATIC');

  const context = {
    claims: model.spec.showcaseClaims,
    references: model.spec.references,
    sarcomere: model.spec.sarcomere,
    titin: model.spec.titin,
    states: model.spec.states,
  };
  assert.deepEqual(checkPresentationSpec(model.spec.presentation, context), []);

  const withoutCard = structuredClone(model.spec.presentation);
  withoutCard.expert_cards = withoutCard.expert_cards
    .filter((card) => card.target_claim_id !== 'mybpc_czone_context');
  assert.ok(checkPresentationSpec(withoutCard, context)
    .some((problem) => /requires an Evidence-mode expert card/.test(problem)));

  const guidedCard = structuredClone(model.spec.presentation);
  guidedCard.expert_cards[0].audience = 'guided';
  assert.ok(checkPresentationSpec(guidedCard, context)
    .some((problem) => /must be Evidence-mode only/.test(problem)));
});

test('SC5: the page keeps MyBP-C optional, Evidence-scoped, and labelled schematic', () => {
  assert.match(page, /showMyBPC: false/, 'the layer starts off');
  assert.match(page, /\['showMyBPC', 'MyBP-C context \(schematic\)'\]/);
  assert.match(page, /Accessory C-zone context is admitted for Evidence mode only/);
  assert.match(page, /showMyBPC: contextScale\s*\n\s*&& state\.audienceMode === AUDIENCE_MODES\.evidence/);
  assert.match(page, /A-band anchored span/, 'the scaffold story is reported in the drawer');
  assert.match(page, /near-commensurate/);
  assert.match(page, /MyBP-C C-zone context \(schematic, not titin\)/);
  assert.match(page, /function renderExpertCards/);
  assert.match(page, /visualization\.expertCards\(\)/);
  const drawerStart = page.indexOf('id="panel"');
  const drawerEnd = page.indexOf('</aside>', drawerStart);
  const cards = page.indexOf('id="expertCards"');
  assert.ok(cards > drawerStart && cards < drawerEnd,
    'expert cards live in the Evidence drawer only');
});
