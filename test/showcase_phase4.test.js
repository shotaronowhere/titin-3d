/** SC-4 gates: object-linked explanations, picking, evidence access, and accessibility. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { createAnnotations } from '../src/api/TitinAnnotations.js';
import { TitinVisualization, SCALES } from '../src/api/TitinVisualization.js';
import { Viewer } from '../src/render/Viewer.js';
import { COMPONENTS, SarcomereScene } from '../src/render/SarcomereScene.js';
import { checkAnnotationCatalog } from '../src/presentation/AnnotationCatalog.js';

const model = await TitinModel.create(nodeReader());
const sl = 2200;
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');

function build({ target = null, domains = true } = {}) {
  const scene = new SarcomereScene();
  scene.build(model.contextSceneAt(sl, { rings: 1 }), model.domainInstancesAt(sl), {
    latticeScope: 'local', mirror: true, titinStrands: false,
    titinPath: model.backboneAt(sl),
    domainBatches: domains ? model.instancingPlanAt(sl) : null,
    domainStrands: domains ? [0] : [],
    anchorDetail: target ? model.anchorDetailAt(sl, target, { rings: 1 }) : null,
    presentationMode: 'evidence', viewWidthNm: target === 'zdisc' ? 200 : 220,
    viewportPx: 1200,
  });
  return scene;
}

test('SC4: the validated catalog covers every pickable biological component once', () => {
  const catalog = model.spec.annotations;
  assert.equal(catalog.schema, 'titin-object-annotations/1');
  assert.deepEqual(
    new Set(catalog.components.map((record) => record.target_id)),
    new Set(Object.keys(COMPONENTS)),
  );
  const problems = checkAnnotationCatalog(catalog, {
    references: model.spec.references,
    sarcomere: model.spec.sarcomere,
    titin: model.spec.titin,
    claims: model.spec.showcaseClaims,
  });
  assert.deepEqual(problems, []);
});

test('SC4: every annotation exposes complete dual-audience evidence and resolved links', () => {
  for (const scale of Object.values(SCALES)) {
    const annotations = createAnnotations(model, sl, { scale });
    assert.ok(annotations.length >= 10);
    for (const annotation of annotations) {
      for (const field of ['lay_text', 'expert_text', 'scope', 'render_meaning',
        'short_citation', 'resolved_link']) {
        assert.ok(annotation[field], `${annotation.id}: ${field} missing`);
      }
      assert.ok(annotation.evidence.claim_class);
      assert.ok(annotation.evidence.render_class);
      assert.ok(annotation.not_claimed.length, `${annotation.id}: missing non-claim`);
      assert.ok(annotation.sources.length, `${annotation.id}: missing source`);
      for (const source of annotation.sources) {
        assert.match(source.href, /^https:\/\//);
        assert.ok(source.citation && source.title);
        assert.ok(!source.citation.includes(source.id),
          `${annotation.id}: short citation leaked raw identifier ${source.id}`);
      }
      assert.ok(Object.isFrozen(annotation));
      assert.ok(Object.isFrozen(annotation.sources));
    }
  }
});

test('SC4: negative catalog mutations fail closed', () => {
  const context = {
    references: model.spec.references,
    sarcomere: model.spec.sarcomere,
    titin: model.spec.titin,
    claims: model.spec.showcaseClaims,
  };
  const badSource = structuredClone(model.spec.annotations);
  badSource.components[0].source_ids = ['10.invalid/not-a-source'];
  assert.ok(checkAnnotationCatalog(badSource, context)
    .some((problem) => /unresolved source/.test(problem)));

  const promotedRender = structuredClone(model.spec.annotations);
  promotedRender.components[0].claim_evidence_class = 'SCHEMATIC';
  promotedRender.components[0].render_evidence_class = 'MEASURED';
  assert.ok(checkAnnotationCatalog(promotedRender, context)
    .some((problem) => /render evidence is stronger/.test(problem)));

  const duplicateTarget = structuredClone(model.spec.annotations);
  duplicateTarget.components[1].target_id = duplicateTarget.components[0].target_id;
  assert.ok(checkAnnotationCatalog(duplicateTarget, context)
    .some((problem) => /duplicate annotation target/.test(problem)));
});

test('SC4: tubes, instanced domains, and ordinary components resolve to biological IDs', () => {
  const scene = build();
  const regionTube = scene.root.getObjectByName('titin_region_PEVK_strand_0');
  // SC-25 added `pick_proxy` to every resolved target: the hit-priority resolver
  // has to know whether a hit was the drawn molecule or its non-rendering hit
  // area, and a record that omitted it would make the two indistinguishable.
  assert.deepEqual(scene.pickTarget(regionTube), {
    target_type: 'titin_region', target_id: 'PEVK', mirrored: false, pick_proxy: false,
  });
  const thick = scene.root.getObjectByName('thick_filament_central');
  assert.deepEqual(scene.pickTarget(thick), {
    target_type: 'component', target_id: 'thick_filament', mirrored: false, pick_proxy: false,
  });
  let domainMesh = null;
  scene.root.traverse((object) => {
    if (!domainMesh && object.isInstancedMesh && object.userData.instance_domain_ids?.length) {
      domainMesh = object;
    }
  });
  assert.ok(domainMesh);
  const pickedDomain = scene.pickTarget(domainMesh, 0);
  assert.equal(pickedDomain.target_type, 'titin_region');
  assert.equal(pickedDomain.target_id, domainMesh.userData.instance_regions[0]);
  assert.equal(pickedDomain.domain_id, domainMesh.userData.instance_domain_ids[0]);
  assert.equal(pickedDomain.instance_id, 0);
  scene.clear();
});

test('SC4: Z-disc and M-band detail structures are directly pickable', () => {
  const zdisc = build({ target: 'zdisc', domains: false });
  assert.equal(zdisc.pickTarget(
    zdisc.root.getObjectByName('alpha_actinin_zdisc_crosslinks'), 0,
  ).target_id, 'alpha_actinin');
  assert.equal(zdisc.pickTarget(
    zdisc.root.getObjectByName('telethonin_zdisc_sandwich'), 0,
  ).target_id, 'telethonin');
  assert.equal(zdisc.pickTarget(
    zdisc.root.getObjectByName('titin_zdisc_opposing_z1z2'),
  ).target_id, 'Z1Z2');
  zdisc.clear();

  const mband = build({ target: 'mline', domains: false });
  assert.equal(mband.pickTarget(
    mband.root.getObjectByName('mband_crosslink_sparse_context'), 0,
  ).target_id, 'mband_crosslinks');
  mband.clear();
});

test('SC4: annotation registration adds no detached square or sprite geometry', () => {
  const scene = build({ domains: false });
  const annotations = createAnnotations(model, sl, { scale: SCALES.context });
  const registered = scene.setAnnotations(annotations);
  assert.equal(registered.size, annotations.length);
  assert.match(scene.manifest.annotations.marker_geometry, /none.*direct raycasting/i);
  let sprites = 0;
  scene.root.traverse((object) => { if (object.isSprite) sprites += 1; });
  assert.equal(sprites, 0);
  assert.equal(Object.hasOwn(COMPONENTS, 'annotations'), false);
  scene.clear();
});

test('SC4: Viewer raycasting rejects off-canvas input and returns no Three.js object', () => {
  const scene = build({ domains: false });
  const thick = scene.root.getObjectByName('thick_filament_central');
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 10000);
  const recorded = {};
  // Built on the prototype rather than as a bare literal: SC-25's pick() measures
  // screen distance with its own helpers and enforces the reviewed tolerance, so
  // the double has to be a Viewer with stubbed collaborators, not a lookalike.
  const fake = Object.assign(Object.create(Viewer.prototype), {
    renderer: { domElement: { getBoundingClientRect: () => ({
      left: 10, top: 20, right: 210, bottom: 120, width: 200, height: 100,
    }) } },
    camera,
    sarcomere: scene,
    pickPolicy: model.spec.renderStyle.titin.picking,
    raycaster: {
      setFromCamera: (pointer) => { recorded.pointer = pointer.clone(); },
      intersectObject: () => [{
        object: thick, point: new THREE.Vector3(500, 0, 0), distance: 25,
      }],
    },
  });
  assert.equal(Viewer.prototype.pick.call(fake, 5, 30), null);
  const picked = Viewer.prototype.pick.call(fake, 110, 70);
  assert.equal(recorded.pointer.x, 0); assert.equal(recorded.pointer.y, 0);
  assert.deepEqual(picked.anchor_nm, { x: 500, y: 0, z: 0 });
  assert.equal(picked.target_id, 'thick_filament');
  assert.equal(Object.hasOwn(picked, 'object'), false);
  scene.clear();
});

test('SC4: the first browser build has a positive LOD span before camera framing', () => {
  let received = null;
  const fake = {
    buildOpts: { showLattice: false },
    model: {
      sceneAt: () => ({ sarcomere_length_nm: sl }),
      verifyScene: () => ({ errors: [], notes: [] }),
      domainInstancesAt: () => ({ instances: [] }),
      backboneAt: () => ({ points: [], segments: [] }),
    },
    visibleWidthNm: () => 0,
    container: { clientWidth: 1280 },
    sarcomere: {
      build: (_scene, _domains, options) => { received = options; },
      manifest: {},
    },
  };
  Viewer.prototype.setSarcomereLength.call(fake, sl);
  assert.equal(received.viewWidthNm, sl);
  assert.equal(received.viewportPx, 1280);
});

test('SC4: a logical selection re-resolves after orbit-safe projection and rebuild', () => {
  const facade = Object.create(TitinVisualization.prototype);
  facade.model = model;
  facade.scale = SCALES.context;
  facade._state = { sarcomere_length_nm: 2200 };
  const selection = {
    target_type: 'titin_region', target_id: 'PEVK', mirrored: true,
    anchor_nm: { x: 1750, y: 3, z: -2 },
    sarcomere_length_nm: 2200, scale: SCALES.context,
  };
  const same = facade.resolveAnnotation(selection);
  assert.deepEqual(same.anchor_nm, selection.anchor_nm,
    'orbit and resize retain the exact hit anchor in the same rendered state');
  facade._state = { sarcomere_length_nm: 2400 };
  const rebuilt = facade.resolveAnnotation(selection);
  const canonical = facade.annotations().find((record) => record.target_id === 'PEVK');
  assert.equal(rebuilt.anchor_nm.x, 2400 - canonical.anchor_nm.x);
  assert.equal(rebuilt.anchor_nm.z, -canonical.anchor_nm.z);
  assert.deepEqual(rebuilt.sources, canonical.sources,
    'rebuild may move the anchor but cannot rewrite evidence or sources');
});

test('SC4: page wires one synchronized accessible tooltip and pinned explanation path', () => {
  assert.match(page, /id="canvas"[^>]*tabindex="0"/);
  assert.match(page, /id="objectTooltip"[^>]*role="tooltip"/);
  assert.match(page, /id="objectInspector"[^>]*aria-label="Pinned structure explanation"/);
  assert.match(page, /id="objectAnnouncement"[^>]*aria-live="polite"/);
  assert.match(page, /id="objectLeader"/);
  assert.match(page, /visualization\.pickObject\(clientX, clientY\)/);
  assert.match(page, /visualization\.resolveAnnotation\(selection\)/);
  assert.match(page, /event\.pointerType === 'touch' \? 12 : 5/);
  assert.match(page, /\['ArrowLeft', 'ArrowRight', 'Enter', ' '\]/);
  assert.match(page, /event\.key === 'Escape' && pinnedPick/);
  assert.match(page, /renderSelectedEvidence\(annotation\)/);
  assert.match(page, /guidedSelectionLabel/);
  assert.match(page, /syncComponentButtons\(visualization\.currentState\(\)\)/);
  assert.match(page, /renderScienceOverlay\(\); renderObjectOverlay\(\);/,
    'leader anchors must update after every orbit frame');
  assert.match(page, /getComputedStyle\(card\)\.display === 'none'/,
    'responsive drawers must not retain a leader to a CSS-hidden duplicate card');
  assert.match(page, /data-mode="evidence"\] #objectInspector \{ display: none; \}/,
    'phone-width Evidence mode must use its synchronized drawer card only');
  assert.match(page, /target = '_blank'; link\.rel = 'noopener noreferrer'/);
  assert.doesNotMatch(page, /annotation\.sources\.join/,
    'the UI must never stringify raw source IDs');
});
