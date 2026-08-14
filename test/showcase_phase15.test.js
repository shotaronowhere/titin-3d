/** SC-15 gates: the mechanism is visible and still says what it is. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { SarcomereScene } from '../src/render/SarcomereScene.js';

const model = await TitinModel.create(nodeReader());
const TITIN_RENDER_STYLE = model.spec.renderStyle.titin;

const DISORDERED = ['N2A', 'PEVK', 'post_N2A_unknown'];

/**
 * Build one context scene the way the Viewer does.
 *
 * `SarcomereScene.build(scene, domains, opts)` takes DESCRIPTORS, not the model,
 * so this resolves them here exactly as `Viewer.setSarcomereLength()` does.
 * `mirror: false` is the default because the mirrored half is a cloned group
 * carried by a transform: its userData still records the UNMIRRORED canonical
 * interval, so reading coordinates off it would compare two different frames.
 */
function build(sl, options = {}) {
  const { mirror = false, presentationMode = 'guided' } = options;
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(sl, { rings: 1 }), model.domainInstancesAt(sl), {
    latticeScope: 'local',
    mirror,
    titinStrands: false,
    titinPath: model.backboneAt(sl),
    domainBatches: model.instancingPlanAt(sl),
    domainStrands: [0],
    presentationMode,
    viewWidthNm: 400,
    viewportPx: 1200,
  });
  return scene;
}

test('SC15: unresolved/disordered regions use a seeded irregular ribbon and remain schematic', () => {
  const scene = build(2200);
  const depiction = scene.manifest.disordered_depiction;
  assert.deepEqual([...depiction.regions].sort(), DISORDERED);
  assert.equal(depiction.evidence_class, 'SCHEMATIC');
  assert.ok(depiction.not_claimed.some((claim) => claim.includes('measured or predicted')));
  assert.ok(depiction.amplitude_nm > 0,
    'a resting chain far from its contour length must visibly remain irregular');
  scene.clear();
});

test('SC15: irregular ribbons never move a canonical axial coordinate', () => {
  const geometry = model.geometryAt(2200);
  const scene = build(2200);
  const layout = geometry.titin_iband_layout_nm;
  let checked = 0;
  scene.root.traverse((object) => {
    const region = object.userData?.titin_region;
    if (!region || !layout[region]) return;
    const range = object.userData.axial_range_nm;
    if (!range) return;
    checked += 1;
    assert.ok(Math.abs(range[0] - layout[region].X_start) < 1e-6,
      `${region} start moved: ${range[0]} vs ${layout[region].X_start}`);
    assert.ok(Math.abs(range[1] - layout[region].X_end) < 1e-6,
      `${region} end moved: ${range[1]} vs ${layout[region].X_end}`);
  });
  assert.ok(checked >= DISORDERED.length,
    'every I-band region tube must publish the interval it was built from');
  scene.clear();
});

test('SC15: the irregular ribbon is bounded by the canonical interval it decorates', () => {
  const geometry = model.geometryAt(2200);
  const layout = geometry.titin_iband_layout_nm;
  const scene = build(2200);
  const seen = new Set();
  scene.root.traverse((object) => {
    const region = object.userData?.titin_region;
    if (!DISORDERED.includes(region) || !object.geometry?.getAttribute) return;
    seen.add(region);
    const position = object.geometry.getAttribute('position');
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < position.count; i += 1) {
      min = Math.min(min, position.getX(i));
      max = Math.max(max, position.getX(i));
    }
    // The transverse detour is display-only: the drawn surface still starts and
    // ends exactly on the Level-0 interval, to render precision.
    assert.ok(Math.abs(min - layout[region].X_start) < 1e-3,
      `${region} coil starts at ${min}, not ${layout[region].X_start}`);
    assert.ok(Math.abs(max - layout[region].X_end) < 1e-3,
      `${region} coil ends at ${max}, not ${layout[region].X_end}`);
  });
  assert.deepEqual([...seen].sort(), DISORDERED);
  scene.clear();
});

test('SC15: stretching straightens contour-backed ribbons', () => {
  const short = build(2000);
  const long = build(2400);
  assert.ok(long.manifest.disordered_depiction.amplitude_by_region.PEVK
    < short.manifest.disordered_depiction.amplitude_by_region.PEVK,
  'a chain closer to its contour length must look straighter');
  short.clear(); long.clear();
});

test('SC15: the coil is driven by the same contour length the mechanics use', () => {
  const scene = build(2200);
  const contours = scene.manifest.disordered_depiction.contour_length_nm;
  const spec = new Map(model.spec.titin.regions.map((region) => [region.id, region]));
  for (const region of DISORDERED) {
    const expected = spec.get(region).extension_model.max_end2end_nm ?? null;
    assert.equal(contours[region], expected,
      `${region} must use titin.json's contour or an explicit null fallback`);
  }
  scene.clear();
});

test('SC15: the emphasis halo always contains the chain it emphasises', () => {
  // Both are multiples of the same titin render radius, so the coil centreline
  // can never leave the SC-10 halo — the reading aid keeps pointing at the
  // subject at every sarcomere length, without either constant knowing the other
  // at run time.
  assert.ok(TITIN_RENDER_STYLE.irregular_ribbon.maximum_transverse_envelope_radius_scale
    < TITIN_RENDER_STYLE.halo_radius_scale,
    'a coil wider than its own halo would read as escaping the molecule');
  const scene = build(1900);
  const halo = scene.root.getObjectByName('titin_halo_PEVK');
  assert.ok(halo, 'the representative strand must still carry its halo');
  const amplitude = scene.manifest.disordered_depiction.amplitude_by_region.PEVK;
  const tube = scene.root.getObjectByName('titin_region_PEVK_strand_0');
  assert.ok(amplitude > 0, 'the most slack state must be the coiled one');
  assert.ok(amplitude
    < tube.userData.render_radius_nm * TITIN_RENDER_STYLE.halo_radius_scale
      / TITIN_RENDER_STYLE.disordered_radius_scale);
  scene.clear();
});

test('SC15: the architecture chapter frames a span where domains resolve', () => {
  const chapter = model.spec.presentation.guided_chapters
    .find((entry) => entry.id === 'molecular_architecture');
  assert.equal(chapter.recommended_state.visibility.show_domains, true);
  assert.ok(chapter.recommended_state.camera_preset.startsWith('region.'),
    'a whole-half-sarcomere framing cannot resolve a 4 nm domain');
});

test('SC15: the architecture chapter frames a region that actually has domains', () => {
  const chapter = model.spec.presentation.guided_chapters
    .find((entry) => entry.id === 'molecular_architecture');
  const regionId = chapter.recommended_state.camera_preset.split('.')[1];
  const region = model.titinRegions().find((entry) => entry.id === regionId);
  assert.ok(region, `the chapter frames unknown region '${regionId}'`);
  const instances = model.domainInstancesAt(chapter.recommended_state.sarcomere_length_nm)
    .instances.filter((instance) => instance.domain_id.split('.')[0] === regionId);
  assert.ok(instances.filter((instance) => instance.folded_domains).length > 1,
    `${regionId} must contain more than one folded domain for the chapter's claim to be visible`);
});

test('SC15: a drawn domain is never sealed inside the backbone that carries it', () => {
  const scene = build(2200);
  const narrowest = Math.min(...model.instancingPlanAt(2200).batches
    .map((batch) => batch.geometry.lateral_diameter_nm / 2));
  const linker = scene.manifest.presentation_overlay.domain_linker;
  assert.ok(linker, 'a build that draws domains must report how the backbone was narrowed');
  assert.ok(linker.regions_with_drawn_domains.includes('prox_Ig'));
  let checked = 0;
  scene.root.traverse((object) => {
    const region = object.userData?.titin_region;
    if (!region || !linker.regions_with_drawn_domains.includes(region)) return;
    checked += 1;
    assert.ok(object.userData.render_radius_nm < narrowest,
      `${region}: the backbone (${object.userData.render_radius_nm} nm) is not thinner `
      + `than the domains it carries (${narrowest} nm), so they cannot be seen`);
  });
  assert.ok(checked > 0);
  scene.clear();
});

test('SC15: narrowing the backbone is a width, not a change of region identity', () => {
  const scene = build(2200);
  const byName = (name) => scene.root.getObjectByName(name);
  assert.equal(byName('titin_region_prox_Ig_strand_0').userData.render_radius_scale, 1);
  for (const region of DISORDERED) {
    assert.ok(byName(`titin_region_${region}_strand_0`).userData.render_radius_scale < 1,
      `${region} keeps its own disordered style scale`);
  }
  // PEVK has no folded domains, so nothing is hidden and nothing is narrowed:
  // it keeps the width its coil needs to read as a chain.
  assert.equal(byName('titin_region_PEVK_strand_0').userData.render_radius_narrowed_for_domains,
    false);
  scene.clear();
});

test('SC15: a build without domain detail keeps the full-width backbone', () => {
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(2200, { rings: 1 }), model.domainInstancesAt(2200), {
    latticeScope: 'local',
    mirror: false,
    titinStrands: false,
    titinPath: model.backboneAt(2200),
    presentationMode: 'guided',
    viewWidthNm: 400,
    viewportPx: 1200,
  });
  assert.equal(scene.manifest.presentation_overlay.domain_linker, null);
  assert.equal(
    scene.root.getObjectByName('titin_region_prox_Ig_strand_0')
      .userData.render_radius_narrowed_for_domains,
    false,
  );
  scene.clear();
});

test('SC15: the folded regions are never coiled', () => {
  const scene = build(2000);
  scene.root.traverse((object) => {
    const region = object.userData?.titin_region;
    if (!region || DISORDERED.includes(region)) return;
    assert.equal(object.userData.disordered_depiction, null,
      `${region} has folded domains and must not be drawn as a bare coil`);
  });
  scene.clear();
});
