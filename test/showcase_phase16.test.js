/** SC-16 gates: the anchor close-up shows the anchor. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import {
  ALIAS_THRESHOLD_PX, ENVELOPE_GHOST_OPACITY, EVIDENCE_STYLE, SarcomereScene,
} from '../src/render/SarcomereScene.js';

const model = await TitinModel.create(nodeReader());
const sl = 2200;

/**
 * Build one context scene the way the Viewer does at a close-up.
 *
 * `SarcomereScene.build(scene, domains, opts)` takes DESCRIPTORS, not the model,
 * and `anchorDetail` is the resolved descriptor rather than a target name — the
 * Viewer resolves it at `src/render/Viewer.js:317` before handing it over. The
 * default `viewWidthNm` is the 200 nm span `CLOSEUPS.zdisc` actually frames, so
 * these tests gate the frame the tour delivers rather than an invented one.
 */
function build(target = null, { viewWidthNm = 200, presentationMode = 'guided' } = {}) {
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(sl, { rings: 1 }), model.domainInstancesAt(sl), {
    latticeScope: 'local',
    mirror: true,
    titinStrands: false,
    titinPath: model.backboneAt(sl),
    presentationMode,
    anchorDetail: target ? model.anchorDetailAt(sl, target, { rings: 1 }) : null,
    viewWidthNm,
    viewportPx: 1200,
  });
  return scene;
}

/** Every drawn copy of a named envelope — the half AND its mirror. */
const envelopes = (scene, name) => {
  const found = [];
  scene.root.traverse((object) => {
    if (object.name === name && object.material) found.push(object);
  });
  return found;
};

const envelopeOpacity = (scene) => {
  const opacities = envelopes(scene, 'zdisc').map((mesh) => mesh.material.opacity);
  assert.ok(opacities.length > 0, 'the Z-disc envelope must be drawn at all');
  assert.equal(new Set(opacities).size, 1,
    'the mirrored half must render the same envelope as the half it mirrors');
  return opacities[0];
};

test('SC16: the Z-disc envelope stays solid in the overview', () => {
  const scene = build(null);
  assert.ok(envelopeOpacity(scene) > 0.5, 'the overview envelope must still read as a boundary');
  scene.clear();
});

test('SC16: the envelope ghosts when its own detail is drawn', () => {
  const scene = build('zdisc');
  assert.equal(scene.manifest.anchor_detail.drawn, true);
  assert.equal(scene.manifest.anchor_detail.envelope_ghosted, true);
  assert.ok(envelopeOpacity(scene) <= 0.18,
    'a lattice-wide slab at close range hides the topology the close-up exists to show');
  scene.clear();
});

// Both flags happen to be inherited correctly today, because the envelope's
// evidence style is already below 1 and the shipped mute cleared depthWrite. They
// are pinned anyway: a lowered `opacity` does nothing while `transparent` is
// false, and a slab that writes depth occludes the detail whatever its alpha
// says, so either one reverting would restore the wall while the opacity gate
// above still passed.
test('SC16: the ghost is actually blended and stops writing depth', () => {
  const scene = build('zdisc');
  for (const mesh of envelopes(scene, 'zdisc')) {
    assert.equal(mesh.material.transparent, true,
      'an opacity below 1 on an opaque material is a no-op: the slab still renders solid');
    assert.equal(mesh.material.depthWrite, false,
      'a depth-writing slab occludes the telethonin sandwich no matter how faint it is');
    assert.equal(mesh.userData.envelope_ghosted, true);
    // SC-3's gate: the envelope still declares that it was subordinated.
    assert.equal(mesh.userData.presentation_muted_for_detail, true);
  }
  scene.clear();
});

test('SC16: ghosting is a visibility choice, not an evidence downgrade', () => {
  const scene = build('zdisc');
  const solid = build(null);
  const ghosted = envelopes(scene, 'zdisc')[0];
  const opaque = envelopes(solid, 'zdisc')[0];
  assert.ok(ghosted.userData.evidence_rendered,
    'the envelope must publish the evidence class it was drawn from');
  assert.deepEqual(ghosted.userData.evidence_rendered, opaque.userData.evidence_rendered,
    'the evidence class must not change with the camera');
  // Opacity encodes confidence (Global Constraint 7), so the ghost is declared
  // fainter than every evidence class rather than borrowing one of their values:
  // no reader can mistake a subordinated envelope for a less certain claim.
  assert.ok(ENVELOPE_GHOST_OPACITY
    < Math.min(...Object.values(EVIDENCE_STYLE).map((style) => style.opacity)));
  scene.clear(); solid.clear();
});

test('SC16: an envelope whose detail is withheld keeps its boundary', () => {
  // Zoomed out past the aliasing gate the anchor topology is not drawn, so there
  // is nothing for the slab to occlude and it goes back to marking the boundary.
  const scene = build('zdisc', { viewWidthNm: 5000 });
  assert.equal(scene.manifest.anchor_detail.drawn, false);
  assert.equal(scene.manifest.anchor_detail.envelope_ghosted, false);
  assert.ok(envelopeOpacity(scene) > 0.5);
  scene.clear();
});

// The M-band close-up reaches the same branch, and its reference marker is a
// zero-width LineLoop that already refuses to write depth — there is no solid
// envelope in front of the crosslinks to subordinate. The manifest says so
// rather than leaving the field absent, so "nothing needed ghosting" and "the
// ghosting step was skipped" are distinguishable in the audit record.
test('SC16: the M-band reference marker never needed ghosting', () => {
  const scene = build('mline', { viewWidthNm: 220 });
  assert.equal(scene.manifest.anchor_detail.drawn, true);
  assert.equal(scene.manifest.anchor_detail.envelope_ghosted, false);
  assert.deepEqual(scene.manifest.primitives_used.line_loop, ['mline_midpoint_reference']);
  for (const marker of envelopes(scene, 'mline')) {
    assert.equal(marker.material.depthWrite, false);
    assert.equal(marker.userData.axial_extent_nm, null,
      'a marker with no axial extent cannot occlude the detail it labels');
  }
  scene.clear();
});

test('SC16: the ghosted frame still contains the anchor it exists to show', () => {
  const scene = build('zdisc');
  for (const name of [
    'telethonin_zdisc_sandwich',
    'alpha_actinin_zdisc_crosslinks',
    'titin_zdisc_canonical_z1z2_sandwich_proxy',
    'titin_zdisc_opposing_z1z2',
  ]) {
    assert.ok(scene.root.getObjectByName(name), `${name} must be drawn behind the ghost`);
  }
  const directions = scene.manifest.anchor_detail.titin_chain_directions;
  assert.equal(new Set(directions).size, 2,
    'the chapter claims two titin N-termini arriving from opposite sarcomeres');
  scene.clear();
});

test('SC16: the ghost is a render decision made at the framed span', () => {
  // The same slab, the same evidence, two cameras: the only thing that changed
  // is how many pixels the anchor feature occupies. Ghosting has to follow the
  // resolvability gate the rest of the detail layer already obeys.
  const near = build('zdisc');
  const far = build('zdisc', { viewWidthNm: 5000 });
  assert.ok(near.manifest.anchor_detail.feature_px >= ALIAS_THRESHOLD_PX);
  assert.ok(far.manifest.anchor_detail.feature_px < ALIAS_THRESHOLD_PX);
  assert.notEqual(near.manifest.anchor_detail.envelope_ghosted,
    far.manifest.anchor_detail.envelope_ghosted);
  near.clear(); far.clear();
});
