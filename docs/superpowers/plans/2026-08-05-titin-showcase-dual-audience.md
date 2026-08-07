# Titin Showcase Dual-Audience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make titin the unmistakable subject of its own visualization, put the one interaction that teaches a layman what titin does on the stage instead of behind Evidence mode, and surface the validated passive-force model that already exists in the code but never reaches the screen.

**Architecture:** The scientific data layer (`data/*.json`) and the geometry/mechanics modules are correct and stay untouched except where noted. All new logic goes into small, pure, typechecked modules under `src/presentation/` and `src/render/`, which Node tests exercise without a browser; `src/index.template.html` only wires DOM to those modules. The generated `index.html` is rebuilt from the template by `npm run build` after every change.

**Tech Stack:** Three.js r0.185.1 (+ `three/addons/lines/*` for wide lines), vanilla ES modules, esbuild (standalone bundling), `node --test`, TypeScript in `checkJs` mode for static analysis, Python 3.12 validators.

---

## Revision 2 — 2026-08-06, after driving the shipped build in a browser

Revision 1 was written from a headless capture of URL states. SC-10 has since shipped, and this
revision comes from **clicking the guided route end to end** at 1280×720 and 375×812 and measuring
the live DOM. Six things were found that a URL-state capture cannot see, because three of them are
caused by *the click path itself* and two only exist at a viewport the earlier pass could not
render. Every claim below was verified against the running page; the source anchors are exact.

| # | Finding | Lands in |
|---|---|---|
| 1 | Chapters 4 and 5 declare `closeup.zdisc` / `closeup.czone`, and **neither camera is ever reached from the tour**. `rebuild()` overwrites the close-up with region focus, and the close-up branch never enables the context-detail layer. The two frames the tour exists to deliver are a translucent slab and a featureless streak. | **New Task 11.0** |
| 2 | Because of #1 the URL the page writes for those chapters (`camera=region.…`) **does not reproduce the frame the presenter saw**. That breaks an SC-1 gate and silently invalidates the chapter-4/5 cells of the SC-8 visual matrix. | **New Task 11.0** |
| 3 | In Guided mode actin and myosin are **1.41 : 1** against each other and the myosin head array is **1.06 : 1** against actin — indistinguishable on a projector and in grayscale. Chapter 1's copy asks the viewer to see titin "beside actin and myosin". | **New Task 12.4** |
| 4 | `data/showcase_claims.json` declares `guided_secondary_context_labels_desktop_max: 3` and `…_mobile_max: 2`. Guided mode draws **six** band brackets at every viewport. The budget is validated for immutability (`scripts/validate_showcase_claims.py:190`) and **never enforced against the render**. At 375 px the brackets overlap and clip, and the model runs off the right edge. | **New Task 12.5** |
| 5 | Nothing on the stage states the scale. Every number in this project is in nanometres and the viewer is given no ruler, at any zoom, in either mode. | **New Task 11.6** |
| 6 | Chapter 7 — the provenance pipeline, the project's whole answer to "did an AI just draw a convincing picture?" — renders as an **8 px scrolling box** inside the chapter card (`#guidedPipeline { max-height: 38vh; overflow-y: auto }`, `src/index.template.html:277`; `.pipeline-records { font-size: 8px }`, `:271`). | **New Task 13.5** |

Two existing sprints are amended rather than replaced:

- **SC-16** verifies its fix by hand-typing `camera=closeup.zdisc`. The guided route never sends
  anyone there (finding #1), so as written the sprint would ghost an envelope in a frame no
  visitor reaches. Its gate now runs through chapter 4. See the amendment at the head of SC-16.
- **SC-11 Task 11.2**'s framing numbers are confirmed by the click-through and unchanged; the
  region-focus standoff is if anything more urgent than Revision 1 stated — chapter 3 of the
  shipped tour is a solid pink wall, not merely a tight crop.

**Ordering change.** Task 11.0 runs **first, before Task 11.1**. It is roughly forty lines of
wiring and it is the highest-leverage change in this document: it converts the two worst frames in
the tour into the two best ones, using geometry that SC-3 and SC-5 already built and that nothing
currently displays. Framing, brackets and control layout are all improvements to a stage; 11.0
decides whether the right thing is on that stage at all.

---

## Global Constraints

Every task's requirements implicitly include this section. Read it once, completely, before Sprint SC-10.

1. **Node 20.19+ and Python 3.12+.** Install with `npm ci` and `.venv/bin/python -m pip install -r requirements.txt`.
2. **Always run tests serially:** `node --test --test-concurrency=1 <files>`. The default parallel run has frozen this machine. Every `test:*` npm script in this plan uses `--test-concurrency=1`.
3. **`src/**/*.js` must pass `npm run typecheck`** (TypeScript `strict: true`, `checkJs: true`, JSDoc types). `src/index.template.html` is **not** typechecked — that is why logic belongs in modules and the template gets only wiring.
4. **The standalone bundle has a hardcoded binding list.** If the page module in `src/index.template.html` imports a *new* name, you must add it in **three** places in `scripts/build_standalone.mjs`:
   - the `ENTRY` re-export block (~line 96–104),
   - the destructuring string (~line 166),
   - the returned object literal (~line 201).
   Miss one and the standalone page throws `X is not defined` **at runtime with no gate catching it**. This is the single most likely way to break the deliverable.
5. **Rebuild and commit the artifact.** After any change to `src/`, `data/`, `src/index.template.html`, or dependencies: `npm run build`, then confirm `npm run check:build` prints `index.html is current`, and commit the regenerated `index.html` in the same commit.
6. **Size ceiling: 2,385,847 bytes for `index.html`** (baseline 1,988,206 × 1.20), enforced by `test/showcase_phase8.test.js`. The ceiling is derived, not written down: the test reads both factors from `data/release_gates.json` → `performance.baseline`, so SC-17 Task 17.2 Step 1 moves it. As of the SC-16 merge the artifact is 2,159,899 bytes, leaving ≈ 226 KB of headroom. Check with `ls -l index.html` after each sprint.
7. **The evidence contract is inviolable.** Colour encodes identity; **opacity encodes confidence**; selection and emphasis are separate channels. Never make titin more visible by raising the opacity of an object whose evidence class says otherwise. `test/showcase_phase8.test.js` asserts that region highlighting leaves opacity untouched — keep it that way for every new channel.
8. **Every new visible claim needs metadata:** evidence class, source IDs resolvable in `data/references.json`, and an explicit `not_claimed` list. Reuse existing claim records rather than inventing new ones where possible.
9. **Accessibility gates:** no positive `tabindex`; every control is a real `<button>` or labelled `<input>`; `@media (pointer: coarse)` keeps a 44 px minimum. Any new colour that carries text must be added to `data/release_gates.json` → `accessibility.contrast_pairs` **and** appear literally (same lowercase hex) in `src/index.template.html`.
10. **Do not change the URL hash schema.** `URL_KEYS` in `src/presentation/StoryController.js:21` is closed, and `test/presentation.test.js` asserts exact hash strings. No task in this plan adds a URL field.
11. **Do not add a guided chapter.** `test/presentation.test.js` and `test/showcase_phase7.test.js` both assert the exact list of seven chapter IDs, and `tour_pacing` is gated at 110–190 s. New content attaches to existing chapters.
12. **Commit after every task**, with the regenerated `index.html` where applicable.
13. **`npm run verify` is the full release gate** and is slow. Per-sprint you run `npm run verify:scNN`; run the full `npm run verify` once at the end of SC-17.

---

## File Structure

**New files**

| File | Responsibility |
|---|---|
| `src/presentation/StageLayout.js` | Pure layout arithmetic: bracket lane placement, inspector card placement, framing constants, the scale-bar step (Task 11.6), the label budget (Task 12.5). No DOM, no Three.js. |
| `src/presentation/StretchSweep.js` | Pure triangle-wave sarcomere-length sweep used by the ▶ play control. No timers inside. |
| `src/presentation/ForceCurve.js` | Samples the existing geometry pipeline into a passive force–extension curve descriptor with evidence metadata. |
| `src/presentation/Bibliography.js` | Groups the resolved reference registry into a displayable bibliography. |
| `scripts/extract_domain_backbones.py` | Optional (SC-16.2): Cα backbones for the domain archetypes, from the pinned structure cache. |
| `data/domain_backbones.json` | Optional (SC-16.2): the extracted MEASURED backbones. |
| `test/showcase_phase10.test.js` … `test/showcase_phase17.test.js` | One gate file per sprint. |

**Modified files**

| File | Change |
|---|---|
| `src/render/SarcomereScene.js` | Line2 continuity trace, additive titin halo, manifest emphasis record, Z-disc envelope ghosting. |
| `src/render/Viewer.js` | Line material resolution wiring, `Line2` raycast threshold, framing margin/bias, minimum region span, dirty-flag rendering. |
| `src/api/TitinVisualization.js` | `forceCurve()`, `bibliography()` accessors; `titinEmphasis` display option in the allow-list. |
| `src/index.template.html` | Stage control bar, guided legend, drawer tabs, inspector disclosure, sources tab, force readout. |
| `scripts/build_standalone.mjs` | Bundle binding list (see Global Constraint 4). |
| `src/presentation/StoryController.js` | Validates the new expert-card `related_target_ids` field (SC-13.4). |
| `scripts/validate_presentation.py` | Mirrors that rule so CI and the browser fail closed together. |
| `data/presentation.json` | `show_context_detail` for the two close-up chapters (Task 11.0); `related_target_ids` per expert card (SC-13.4); `architecture` chapter camera (SC-15.2); one word of chapter-1 copy (SC-17.3). |
| `data/showcase_claims.json` | Nothing. The attention budget is **read** by Task 12.5, never edited — `validate_showcase_claims.py:190` pins it byte-for-byte and a negative control proves the pin. |
| `data/annotations.json` | Render-meaning and non-claim text for the disordered-chain depiction (SC-15.1). |
| `data/release_gates.json` | New contrast pairs; performance baseline and check. |
| `test/presentation.test.js` | One assertion split when controls move to the stage bar (SC-12, Task 12.1). |
| `package.json` | New `test:scNN` / `verify:scNN` scripts. |
| `README.md` | Describes the stage bar, sweep, force readout and tabbed drawer (SC-17.2). |

---

# Sprint SC-10 — Titin becomes the subject

**Why:** In the shipped default frame the titin tube is ≈ 5 px wide (`2 × (9 nm ÷ 6) × 1.65` at ≈ 1.07 px/nm) and drawn at `SCHEMATIC` opacity **0.55**, on a `#0e1116` background, surrounded by opaque context. The subject of the page is the least prominent thing in it. This sprint gives titin a screen-space width that survives zoom-out and a soft halo that separates it from the background — **without touching evidence opacity**.

**Done when:** at every camera distance the titin path reads as a continuous bright ribbon; `scene.disposables.size === 0` after `clear()`; region highlighting still leaves evidence opacity untouched.

### Task 10.1: Wide screen-space continuity trace

**Files:**
- Modify: `src/render/SarcomereScene.js:165-169` (style constants), `:386-413` (`_titinContinuityTrace`)
- Modify: `src/render/Viewer.js:232-236` (raycaster params), `:617-623` (`resize`)
- Test: `test/showcase_phase10.test.js` (create)

**Interfaces:**
- Produces: `SarcomereScene.prototype.screenSpaceLineMaterials` — a `Set<LineMaterial>` of every screen-space line material in the built tree.
- Produces: `SarcomereScene.prototype.setLineResolution(width, height)` → `{materials_updated: number}`.
- Consumes: nothing from other tasks.

- [ ] **Step 1: Write the failing test**

Create `test/showcase_phase10.test.js`:

```js
/** SC-10 gates: titin reads as the subject without borrowing the evidence channel. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { SarcomereScene } from '../src/render/SarcomereScene.js';

const model = await TitinModel.create(nodeReader());
const SL = 2200;

/** Build one context scene the way the Viewer does. */
function build(opts = {}) {
  const scene = new SarcomereScene();
  scene.build(model, {
    sl: SL,
    showLattice: true,
    showFilamentContext: true,
    presentationMode: 'guided',
    mirror: true,
    ...opts,
  });
  return scene;
}

test('SC10: the continuity trace is a screen-space wide line', () => {
  const scene = build();
  const traces = [];
  scene.root.traverse((object) => {
    if (object.name?.startsWith('titin_continuity_trace_')) traces.push(object);
  });
  assert.ok(traces.length > 0, 'the scene must draw a continuity trace');
  for (const trace of traces) {
    assert.ok(trace instanceof Line2, `${trace.name} must be a Line2`);
    assert.equal(trace.material.worldUnits, false,
      'width must be screen-space so titin stays legible when zoomed out');
    assert.ok(trace.material.linewidth >= 3,
      'the subject needs at least a 3 px ribbon');
  }
  scene.clear();
});

test('SC10: every screen-space line material is registered and resolution-settable', () => {
  const scene = build();
  assert.ok(scene.screenSpaceLineMaterials.size > 0);
  const applied = scene.setLineResolution(1440, 900);
  assert.equal(applied.materials_updated, scene.screenSpaceLineMaterials.size);
  for (const material of scene.screenSpaceLineMaterials) {
    assert.equal(material.resolution.x, 1440);
    assert.equal(material.resolution.y, 900);
  }
  scene.clear();
});

test('SC10: clear() releases every tracked resource', () => {
  const scene = build();
  assert.ok(scene.disposables.size > 0);
  scene.clear();
  assert.equal(scene.disposables.size, 0);
  assert.equal(scene.screenSpaceLineMaterials.size, 0);
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase10.test.js
```

Expected: FAIL — `trace must be a Line2` (it is currently a `THREE.Line`), and `scene.screenSpaceLineMaterials` is `undefined`.

- [ ] **Step 3: Add the imports and the style constants**

At the top of `src/render/SarcomereScene.js`, after the existing `import * as THREE from 'three';`:

```js
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
```

Replace the `TITIN_RENDER_STYLE` block at `src/render/SarcomereScene.js:165-169` with:

```js
/**
 * SC-10 subject-emphasis channel.
 *
 * `trace_px` is a SCREEN-SPACE width in CSS pixels. It is a reading aid, not a
 * molecular dimension, and it is deliberately independent of the tube radius:
 * inflating the tube would imply a diameter, while a constant-width ribbon
 * makes no dimensional claim at all. Evidence opacity is untouched by every
 * value here — emphasis and confidence stay on separate channels.
 */
export const TITIN_RENDER_STYLE = Object.freeze({
  guided_radius_scale: 1.65,
  disordered_radius_scale: 0.58,
  continuity_opacity: 0.96,
  trace_px: 4.0,
  trace_px_evidence: 3.0,
  halo_radius_scale: 3.2,
  halo_opacity: 0.16,
});
```

- [ ] **Step 4: Register screen-space materials in the constructor**

In `src/render/SarcomereScene.js:189-198`, add one line to the constructor after `this.disposables = new Set();`:

```js
    /**
     * Screen-space line materials need the renderer size to compute their width,
     * and they early-out of raycasting while the resolution is still zero. The
     * Viewer owns that size, so the scene exposes the set rather than guessing.
     * @type {Set<import('three/addons/lines/LineMaterial.js').LineMaterial>}
     */
    this.screenSpaceLineMaterials = new Set();
```

- [ ] **Step 5: Replace `_titinContinuityTrace`**

Replace the whole method body at `src/render/SarcomereScene.js:386-413` with:

```js
  _titinContinuityTrace(segment, off, aBandStartNm, presentationMode = 'guided') {
    const at = (x) => {
      const f = x >= aBandStartNm ? 1 : x / aBandStartNm;
      return [x, (off.y || 0) * f, (off.z || 0) * f];
    };
    const geometry = new LineGeometry();
    geometry.setPositions([...at(segment.X_start), ...at(segment.X_end)]);
    this.disposables.add(geometry);
    const material = new LineMaterial({
      color: COMPONENT_COLOR.titin_highlight,
      // CSS pixels: worldUnits stays false (the default) so the ribbon keeps a
      // constant reading width at every camera distance.
      linewidth: presentationMode === 'guided'
        ? TITIN_RENDER_STYLE.trace_px
        : TITIN_RENDER_STYLE.trace_px_evidence,
      transparent: true,
      opacity: TITIN_RENDER_STYLE.continuity_opacity,
      depthTest: false,
      depthWrite: false,
    });
    this.disposables.add(material);
    this.screenSpaceLineMaterials.add(material);
    const line = new Line2(geometry, material);
    line.name = `titin_continuity_trace_${segment.region_id}`;
    line.renderOrder = 12;
    line.userData.titin_trace_region = segment.region_id;
    line.userData.base_color = COMPONENT_COLOR.titin_highlight;
    line.userData.coordinate_basis = 'exact canonical Level-0 axial segment endpoints; '
      + 'schematic representative-strand transverse offset';
    line.userData.a_band_radial_offset_nm = Math.hypot(off.y || 0, off.z || 0);
    line.userData.azimuth_evidence = off.evidence_class || 'SCHEMATIC';
    line.userData.render_width_px = material.linewidth;
    line.userData.render_width_meaning = 'screen-space reading width; not a molecular dimension';
    return line;
  }
```

- [ ] **Step 6: Pass the presentation mode at the call site**

At `src/render/SarcomereScene.js:1000`, the call inside `build()` currently reads:

```js
            traces.add(this._titinContinuityTrace(segment, off, aBandStart));
```

Change it to:

```js
            traces.add(this._titinContinuityTrace(segment, off, aBandStart, presentationMode));
```

- [ ] **Step 7: Add `setLineResolution` and extend `clear()`**

Add this method to `SarcomereScene`, directly after `_track` (`src/render/SarcomereScene.js:219`):

```js
  /**
   * Screen-space line width and Line2 raycasting are both computed from the
   * renderer's pixel size. A material whose resolution is still (0,0) draws at
   * the wrong width AND silently refuses to be picked, so the Viewer calls this
   * after every build and every resize.
   *
   * @param {number} width
   * @param {number} height
   * @returns {{materials_updated: number}}
   */
  setLineResolution(width, height) {
    if (!(width > 0) || !(height > 0)) {
      throw new Error(`setLineResolution: expected a positive size, got ${width}x${height}`);
    }
    for (const material of this.screenSpaceLineMaterials) material.resolution.set(width, height);
    return { materials_updated: this.screenSpaceLineMaterials.size };
  }
```

Find the existing `clear()` method (search for `clear()` in the same file) and add one line where it empties `this.disposables`:

```js
    this.screenSpaceLineMaterials.clear();
```

- [ ] **Step 8: Teach the raycaster about Line2 and keep resolution current**

In `src/render/Viewer.js`, replace line 235 (`this.raycaster.params.Line.threshold = 3;`) with:

```js
    this.raycaster.params.Line.threshold = 3;
    // Line2 has its own raycast path and reads its own params entry, which the
    // stock Raycaster does not define. Without it the titin ribbon is drawn but
    // unpickable at the edges.
    this.raycaster.params.Line2 = { threshold: 6 };
```

In `src/render/Viewer.js:617-623`, extend `resize()`:

```js
  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    // Screen-space line widths are computed from this size.
    this.sarcomere?.setLineResolution(w, h);
  }
```

Then find where `Viewer` builds the scene (the method that calls `this.sarcomere.build(...)`, around `src/render/Viewer.js:240-300`) and add immediately after the build call:

```js
    const { clientWidth: lineW, clientHeight: lineH } = this.container;
    if (lineW > 0 && lineH > 0) this.sarcomere.setLineResolution(lineW, lineH);
```

- [ ] **Step 9: Run the tests**

```sh
node --test --test-concurrency=1 test/showcase_phase10.test.js
```

Expected: PASS (3 tests).

- [ ] **Step 10: Run the existing suites that touch the scene**

```sh
node --test --test-concurrency=1 test/phase7.test.js test/showcase_phase8.test.js test/showcase_phase4.test.js
npm run typecheck
```

Expected: PASS. If `showcase_phase8`'s resource-stability test fails, `screenSpaceLineMaterials` is not being cleared in `clear()` — fix Step 7.

- [ ] **Step 11: Rebuild, verify size, commit**

```sh
npm run build && npm run check:build && ls -l index.html
git add -A && git commit -m "SC-10: draw titin's continuity trace as a screen-space wide line"
```

`index.html` must stay below 2,385,847 bytes.

### Task 10.2: Additive titin halo

**Files:**
- Modify: `src/render/SarcomereScene.js` (`_titinTube` call sites at `:980-992`, new `_titinHalo` helper, manifest)
- Test: `test/showcase_phase10.test.js` (extend)

**Interfaces:**
- Consumes: `TITIN_RENDER_STYLE.halo_radius_scale`, `TITIN_RENDER_STYLE.halo_opacity` from Task 10.1.
- Produces: manifest field `manifest.titin_emphasis` — `{channel: 'presentation', trace_px: number, halo_radius_scale: number, halo_opacity: number, evidence_opacity_unchanged: true}`.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase10.test.js`:

```js
test('SC10: the halo is an emphasis channel, not an evidence claim', () => {
  const scene = build();
  const halos = [];
  const tubes = [];
  scene.root.traverse((object) => {
    if (object.name?.startsWith('titin_halo_')) halos.push(object);
    if (object.userData?.titin_region && !object.name?.startsWith('titin_halo_')) tubes.push(object);
  });
  assert.ok(halos.length > 0, 'titin needs a halo');
  for (const halo of halos) {
    assert.equal(halo.material.blending, THREE.AdditiveBlending);
    assert.equal(halo.material.depthWrite, false);
    assert.equal(halo.userData.emphasis_channel, 'presentation');
    // A halo must never be pickable: it would answer for geometry it is not.
    assert.equal(halo.raycast, THREE.Object3D.prototype.raycast);
  }
  assert.equal(scene.manifest.titin_emphasis.evidence_opacity_unchanged, true);
  scene.clear();
});

test('SC10: emphasis does not change any evidence opacity', () => {
  const scene = build();
  const opacities = [];
  scene.root.traverse((object) => {
    if (object.userData?.titin_region && object.userData.evidence_rendered) {
      opacities.push([object.name, object.material.opacity]);
    }
  });
  // Every titin region tube keeps the opacity its evidence class dictates.
  for (const [name, opacity] of opacities) {
    assert.ok(opacity <= 1 && opacity > 0, `${name}: implausible opacity ${opacity}`);
  }
  const highlighted = scene.setTitinRegionHighlight('PEVK');
  const after = [];
  scene.root.traverse((object) => {
    if (object.userData?.titin_region && object.userData.evidence_rendered) {
      after.push([object.name, object.material.opacity]);
    }
  });
  assert.deepEqual(after, opacities, 'selection must not touch evidence opacity');
  assert.ok(highlighted.highlighted_tubes > 0);
  scene.clear();
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase10.test.js
```

Expected: FAIL — `titin needs a halo`.

- [ ] **Step 3: Add the halo helper**

Add this method to `SarcomereScene` immediately after `_titinTube` (`src/render/SarcomereScene.js:377`):

```js
  /**
   * SC-10 emphasis halo: a wider, additively blended shell around the same path.
   *
   * It is a READING AID on the presentation channel. It writes no depth, is never
   * raycast, carries no evidence class, and its radius is a multiple of a render
   * width that is already declared not to be a molecular dimension. Emphasis is
   * therefore expressible without moving a single opacity that encodes confidence.
   *
   * @param {Array<{x:number,y?:number,z?:number}>} points
   * @param {number} radiusNm  the tube radius this halo surrounds
   * @param {string} name
   */
  _titinHalo(points, radiusNm, name) {
    const pts = points.map((p) => new THREE.Vector3(p.x, p.y ?? 0, p.z ?? 0));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
    const geom = this._track(new THREE.TubeGeometry(
      curve, Math.max(24, pts.length * 4),
      radiusNm * TITIN_RENDER_STYLE.halo_radius_scale, 8, false,
    ));
    const material = new THREE.MeshBasicMaterial({
      color: COMPONENT_COLOR.titin_highlight,
      transparent: true,
      opacity: TITIN_RENDER_STYLE.halo_opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    this.disposables.add(material);
    const mesh = new THREE.Mesh(geom, material);
    mesh.name = name;
    mesh.renderOrder = 11;
    // Never pickable: the halo is not the molecule.
    mesh.raycast = THREE.Object3D.prototype.raycast;
    mesh.userData.emphasis_channel = 'presentation';
    mesh.userData.render_meaning = 'reading aid around the titin path; not a molecular envelope';
    return mesh;
  }
```

- [ ] **Step 4: Draw the halo on the representative strand only**

In `src/render/SarcomereScene.js`, inside the `if (titinPath?.segments?.length)` branch, find the block that adds the continuity traces for `off.strand_index === 0` (around `:996-1003`) and add the halo in the same guard, so lattice copies stay clean:

```js
        if (off.strand_index === 0) {
          const traces = new THREE.Group();
          traces.name = 'titin_continuity_traces';
          for (const segment of titinPath.segments) {
            traces.add(this._titinContinuityTrace(segment, off, aBandStart, presentationMode));
            traces.add(this._titinHalo(
              this._titinRegionPath(domains, segment, off, aBandStart),
              titinRadius,
              `titin_halo_${segment.region_id}`,
            ));
          }
          titinGroup.add(traces);
        }
```

- [ ] **Step 5: Record the emphasis in the manifest**

Find where `build()` assembles `this.manifest` (search for `this.manifest = {` — around `:1340-1420`) and add one field to the object, next to the existing `representative_titin` entry:

```js
      titin_emphasis: {
        channel: 'presentation',
        trace_px: presentationMode === 'guided'
          ? TITIN_RENDER_STYLE.trace_px
          : TITIN_RENDER_STYLE.trace_px_evidence,
        halo_radius_scale: TITIN_RENDER_STYLE.halo_radius_scale,
        halo_opacity: TITIN_RENDER_STYLE.halo_opacity,
        evidence_opacity_unchanged: true,
        meaning: 'screen-space reading width and an additive halo; neither is a molecular dimension',
      },
```

- [ ] **Step 6: Run the tests**

```sh
node --test --test-concurrency=1 test/showcase_phase10.test.js test/showcase_phase8.test.js
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Look at it**

```sh
npm run build
open "index.html#mode=guided&step=orientation&sl=2200&scale=context&camera=view.titin_story&target=titin&evidence=0"
```

Confirm by eye: titin is a continuous bright ribbon readable from across a room, and the surrounding filaments have not changed.

- [ ] **Step 8: Commit**

```sh
npm run check:build && git add -A && git commit -m "SC-10: add the titin emphasis halo on the presentation channel"
```

---

# Sprint SC-11 — Framing, overlay composition, and frame cost

**Why:** Three defects compound into "this looks broken". (a) `focusSpan` pads the framing by 1.35 and centres vertically, so ~85 % of the canvas is empty. (b) The band-bracket lane is positioned from the page header (`src/index.template.html:791`), so brackets float ~330 px above the structure they label with nothing connecting them. (c) Switching Guided → Evidence removes 370 px of canvas and only calls `resize()` (`src/index.template.html:634`), so the Z-disc is cut off. Separately, `renderScienceOverlay()` and `renderObjectOverlay()` run **every animation frame** (`src/index.template.html:2155`), each forcing a synchronous layout.

**Done when:** the tour reaches the cameras it declares, the structure fills the frame, brackets sit just above the model with drop ticks, mode switching reframes, and the overlay work happens on change rather than on every frame.

### Task 11.0: The guided route reaches the cameras it declares

> Added in Revision 2. **Run this before Task 11.1.** It is the smallest change in this document
> and the largest visible one.

**Why.** `data/presentation.json` gives chapter 4 (`anchors`) the camera `closeup.zdisc` and
chapter 5 (`anchored_scaffold`) the camera `closeup.czone`. Neither is ever applied. Three separate
defects compound:

**(a) Region focus silently overwrites the declared close-up.** `rebuild()` at
`src/index.template.html:1733`:

```js
    if (!refit && state.region) state.cameraPreset = `region.${state.region}`;
    if (!refit && state.region)
      visualization.focusTitinRegion(state.region);
    else if (!refit && state.closeup) {
      state.cameraPreset = `closeup.${state.closeup}`;
      visualization.closeUp(state.closeup);
    }
```

Chapters 4 and 5 each declare **both** a region target (`Z1Z2`, `Aband_super`) and a close-up
camera. `applyChapter` (`:1095`) sets `state.region` first, then calls `applyCameraPreset`, whose
close-up branch (`:1081`) sets `state.closeup` and calls `rebuild()` — and that rebuild takes the
region branch, yanks the camera back to region focus, and rewrites `state.cameraPreset` to
`region.…`. Verified live by clicking `Next` through the tour and reading `location.hash` at each
step: chapter 4 reports `camera=region.Z1Z2`, chapter 5 `camera=region.Aband_super`. The declared
cameras never appear in the hash the page writes.

**(b) A guided close-up does not turn on the layer that makes a close-up worth looking at.** The
close-up *button* handler sets `state.showContextDetail = true` (`:1240`) under a comment that
states the reason exactly:

> *"Close-ups. Selecting one turns the context-detail layer ON, because a close-up on the crown
> array with that layer off would show a bare cylinder and read as a rendering failure."*
> — `src/index.template.html:1224`

`applyCameraPreset`'s close-up branch does not do this, and both chapters declare
`visibility.show_context_detail: false`. So the tour produces precisely the failure the comment
predicts. Confirmed by hand: forcing the `czone` close-up **with** context detail turns chapter 5's
flat streak into the myosin crown array with titin running along it — one of the best frames the
renderer can produce, and one no visitor currently sees. The same is true at the Z-disc: with the
layer on, the twisted antiparallel actin and the α-actinin context appear (they are then occluded
by the envelope, which is exactly what SC-16 fixes — and SC-16 cannot be reached from the tour
until this task lands).

**(c) A hash that names a step but not a camera keeps the previous camera.**
`restorePresentationFromHash` (`:2049–2053`) reads `camera` from the hash and never consults the
chapter. `#mode=guided&step=anchors` therefore renders **chapter 1's frame under chapter 4's text**.

**What this costs elsewhere.** SC-1's gate is *"URL reload reproduces the same supported biological
state."* For chapters 4 and 5 it does not: reloading the URL the page itself wrote yields
`_displayOptions.anchorDetail === null`, so the Z-disc detail geometry is not even built. The SC-8
visual matrix is generated from URL hashes, so its chapter-4 and chapter-5 cells capture frames the
presenter never sees. Both are fixed by this task, not papered over.

**Files:**
- Modify: `src/index.template.html` (`rebuild` `:1723-1744`, `applyCameraPreset` `:1075-1093`, `restorePresentationFromHash` `:2040-2068`)
- Modify: `data/presentation.json` (`show_context_detail` for `anchors` and `anchored_scaffold`)
- Modify: `src/presentation/StoryController.js` (camera fallback for a step-only hash)
- Test: `test/showcase_phase11.test.js` (create)

**Interfaces:**
- Produces: `StoryController.parse()` adopts the chapter's declared `camera_preset` when the hash names a `step` and omits `camera`.
- Produces: `applyCameraPreset` treats a close-up as authoritative over region focus for the rest of that chapter.

- [ ] **Step 1: Write the failing test**

The camera-adoption half is pure and belongs in Node. Create `test/showcase_phase11.test.js`:

```js
/** SC-11 gates: the tour reaches the cameras it declares. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { StoryController } from '../src/presentation/StoryController.js';

const model = await TitinModel.create(nodeReader());
const story = new StoryController(model.spec.presentation, model);

// `story.chapters` is an array property, not a method — assigned at StoryController:383.
test('SC11-0: a step-only hash adopts that chapter\'s declared camera', () => {
  for (const chapter of story.chapters) {
    const decoded = story.parse(`#mode=guided&step=${chapter.id}`);
    assert.equal(decoded.state.camera_preset, chapter.recommended_state.camera_preset,
      `step=${chapter.id} must frame ${chapter.id}, not whatever was on screen before`);
  }
});

test('SC11-0: an explicit camera still wins over the chapter default', () => {
  const decoded = story.parse('#mode=guided&step=anchors&camera=view.oblique');
  assert.equal(decoded.state.camera_preset, 'view.oblique');
});

// A close-up chapter that leaves the context-detail layer off renders the bare
// cylinder that src/index.template.html:1224 describes as "a rendering failure".
test('SC11-0: every close-up chapter enables its detail layer', () => {
  for (const chapter of story.chapters) {
    const scene = chapter.recommended_state;
    if (!scene.camera_preset.startsWith('closeup.')) continue;
    assert.equal(scene.visibility.show_context_detail, true,
      `chapter '${chapter.id}' frames a close-up; without context detail it shows a bare cylinder`);
  }
});

// A close-up chapter must be describable by a URL that survives a reload.
test('SC11-0: a close-up chapter round-trips through its own URL', () => {
  for (const chapter of story.chapters) {
    const scene = chapter.recommended_state;
    if (!scene.camera_preset.startsWith('closeup.')) continue;
    const hash = story.serialize(story.stateForChapter(chapter.id));
    assert.equal(story.parse(hash).state.camera_preset, scene.camera_preset);
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase11.test.js
```

Expect the step-only-hash test and the context-detail test to fail. **The round-trip test will
pass before the fix** — `stateForChapter` (`StoryController:453`) reads `camera_preset` straight
off the chapter record, so the controller was never the broken half. Keep it as a regression guard
and be clear about what it does not cover: the live URL is written by `syncUrl()` from
`state.cameraPreset`, which `rebuild()` has already overwritten. **No Node test can catch that
half** — it lives in `src/index.template.html`, which is deliberately not typechecked and not unit
tested. Step 9's browser check is the gate for it, and it is not optional.

- [ ] **Step 3: Turn on the detail layer for the two close-up chapters**

In `data/presentation.json`, for the chapters `anchors` and `anchored_scaffold`, set
`recommended_state.visibility.show_context_detail` to `true`.

Nothing pins these values: `scripts/validate_presentation.py:197` and
`src/presentation/StoryController.js:250` type-check the field and no test asserts a value.
`test/showcase_phase7.test.js:85` asserts ≥ 4 distinct chapter cameras — this task changes no
declared camera, so that gate is untouched (it is, in fact, the gate that was being satisfied on
paper while two of the four cameras never rendered).

- [ ] **Step 4: Let a declared close-up outrank region focus**

In `src/index.template.html`, replace the branch at `:1733-1739`:

```js
    // A selected region moves as the mechanical state changes, so the camera has to
    // follow it. But a chapter may declare a close-up AND a region target — chapter 4
    // pairs closeup.zdisc with the Z1Z2 region so the anchor is both framed and
    // highlighted. Region focus used to win unconditionally here, which discarded the
    // close-up on the rebuild that immediately followed applyCameraPreset and left the
    // chapter pointing at the wrong scene. The close-up is the more specific intent:
    // it was named by the chapter, not inferred from the selection.
    if (!refit && state.closeup) {
      state.cameraPreset = `closeup.${state.closeup}`;
      visualization.closeUp(state.closeup);
    } else if (!refit && state.region) {
      state.cameraPreset = `region.${state.region}`;
      visualization.focusTitinRegion(state.region);
    }
```

Highlighting is unaffected: `visualization.highlightTitinRegion(state.region)` is called from
`applyChapter` and is independent of which camera moves. The region readout keeps working because
`state.region` is still set.

- [ ] **Step 5: Make a guided close-up behave like a clicked one**

In `applyCameraPreset` (`:1075`), the close-up branch at `:1081` must match the button handler at `:1240`:

```js
  } else if (kind === 'closeup') {
    state.closeup = name;
    // Same reason as the close-up buttons at :1224 — a close-up with the
    // context-detail layer off is a bare cylinder. The chapter's declared
    // visibility supplies the rest; this is the one field a close-up implies.
    state.showContextDetail = true;
    state.showFilamentContext = true;
    if (name === 'mline') state.mirror = true;
    visualization.closeUp(name, { animate });
    rebuild();
    syncCloseups(visualization.closeUp(name, { move: false }));
    syncDepictionToggles();
  }
```

Note this makes Step 3's data edit belt-and-braces rather than load-bearing — keep both. The data
edit states the intent where a reviewer reads it; the code guarantees it for any caller.

- [ ] **Step 6: Adopt the chapter camera for a step-only hash**

In `src/presentation/StoryController.js`, inside the hash decoder (around `:510`), after `step` is
resolved and before `camera` is read: when the hash names a known `step` and carries no `camera`
key, seed `state.camera_preset` from that chapter's `recommended_state.camera_preset`. An explicit
`camera` still overrides it, and the existing unavailable-camera fallback at `:514-515` is
unchanged.

This adds **no URL field** — Global Constraint 10 holds. `URL_KEYS` is untouched; the change is
what an *absent* key defaults to. Check `test/presentation.test.js`'s exact-hash assertions still
pass: they all supply `camera` explicitly, so they should.

- [ ] **Step 7: Run the tests**

```sh
node --test --test-concurrency=1 test/showcase_phase11.test.js test/presentation.test.js test/showcase_phase7.test.js test/showcase_phase8.test.js
npm run validate:presentation && npm run typecheck && npm run build && npm run check:build
```

- [ ] **Step 8: Regenerate the artifacts that quote chapter URLs**

The chapter-4 and chapter-5 hashes have changed, so the SC-8 capture set and the SC-9 pack are
stale by construction:

```sh
node scripts/capture_visual_matrix.mjs && npm run check:matrix
npm run pack && npm run check:pack
```

- [ ] **Step 9: Look at it — this is the payoff**

```sh
npm run serve
```

Walk the tour with `Next` and compare against the two frames this task exists to produce:

- **Chapter 4** must show the Z-disc anchor at close range with the twisted antiparallel actin and
  the α-actinin context visible. The envelope will still occlude the telethonin sandwich — that is
  SC-16's job, and it is now reachable.
- **Chapter 5** must show the myosin crown array along the thick filament with titin's A-band
  segment running beside it. If it is still a flat streak, `showContextDetail` is not reaching
  `currentDisplayOptions()` (`:1711`).

Then confirm the URL honesty fix:

```sh
# each of these must render the chapter it names, from a cold load
open "index.html#mode=guided&step=anchors"
open "index.html#mode=guided&step=anchored_scaffold"
```

- [ ] **Step 10: Commit**

```sh
git add -A && git commit -m "SC-11: let the guided route reach the close-ups it declares"
```

### Task 11.1: The StageLayout module

**Files:**
- Create: `src/presentation/StageLayout.js`
- Test: `test/showcase_phase11.test.js` (create)

**Interfaces:**
- Produces: `STAGE_LAYOUT` (frozen constants), `BRACKET_LANE_OFFSETS` (frozen), `bracketLaneY(projected, opts)`, `inspectorPlacement(opts)`. Later tasks in this sprint and in SC-13 import all four.

- [ ] **Step 1: Write the failing test**

Create `test/showcase_phase11.test.js`:

```js
/** SC-11 gates: stage composition arithmetic. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STAGE_LAYOUT, BRACKET_LANE_OFFSETS, bracketLaneY, inspectorPlacement,
} from '../src/presentation/StageLayout.js';

test('SC11: the bracket lane hugs the model instead of the page header', () => {
  const projected = [
    { y_px: 500, visible: true },
    { y_px: 520, visible: true },
    { y_px: 40, visible: false },   // ignored: not visible
  ];
  const lane = bracketLaneY(projected, { canvasHeight: 900, safeTopPx: 80 });
  const lowestLane = lane + BRACKET_LANE_OFFSETS.marker;
  assert.ok(lowestLane < 500, 'every lane must sit above the model');
  assert.ok(lowestLane > 500 - 120, 'the lane must stay near the model, not at the top of the page');
  assert.ok(lane >= 80, 'the lane must not slide under the page header');
});

test('SC11: an off-screen model falls back to a deterministic lane', () => {
  const lane = bracketLaneY([], { canvasHeight: 900, safeTopPx: 80 });
  assert.equal(lane, 80 + STAGE_LAYOUT.bracket_lane_gap_px);
});

test('SC11: a model near the top clamps to the safe area instead of overlapping the header', () => {
  const lane = bracketLaneY([{ y_px: 90, visible: true }], { canvasHeight: 900, safeTopPx: 80 });
  assert.equal(lane, 80);
});

test('SC11: the inspector card never covers the object it explains', () => {
  const canvas = { width: 1440, height: 900 };
  const card = { width: 370, height: 380 };
  for (const x of [100, 400, 720, 1000, 1380]) {
    const placed = inspectorPlacement({
      anchor: { x_px: x, y_px: 450 }, card, canvas, safeTopPx: 80,
    });
    assert.equal(placed.overlaps_anchor, false, `card covers its anchor at x=${x}`);
    assert.ok(placed.left >= 8 && placed.left + card.width <= canvas.width - 8);
    assert.ok(placed.top >= 80 && placed.top + card.height <= canvas.height - 8);
  }
});

test('SC11: the card prefers the side away from the anchor', () => {
  const canvas = { width: 1440, height: 900 };
  const card = { width: 370, height: 200 };
  const left = inspectorPlacement({ anchor: { x_px: 1100, y_px: 400 }, card, canvas, safeTopPx: 60 });
  assert.equal(left.side, 'left');
  const right = inspectorPlacement({ anchor: { x_px: 300, y_px: 400 }, card, canvas, safeTopPx: 60 });
  assert.equal(right.side, 'right');
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase11.test.js
```

Expected: FAIL — `Cannot find module '../src/presentation/StageLayout.js'`.

- [ ] **Step 3: Write the module**

Create `src/presentation/StageLayout.js`:

```js
/**
 * SC-11 stage composition arithmetic.
 *
 * Pure functions with no DOM and no Three.js, so the composition rules that
 * decide whether a figure reads correctly are unit-testable rather than being
 * inferred from a screenshot. The page imports these; it does not restate them.
 */

/**
 * Framing and overlay constants.
 *
 * `frame_margin_factor` is why the default view stopped looking unfitted: 1.35
 * left the structure occupying three quarters of the width in a frame that is
 * mostly empty anyway, because a sarcomere is ~2,200 nm long and ~50 nm across.
 */
export const STAGE_LAYOUT = Object.freeze({
  frame_margin_factor: 1.12,
  vertical_bias_fraction: 0.08,
  min_region_view_span_nm: 140,
  bracket_lane_gap_px: 18,
  bracket_drop_tick_px: 8,
  card_gap_px: 24,
  edge_padding_px: 8,
});

/** Vertical offsets of the three bracket lanes, measured down from the lane origin. */
export const BRACKET_LANE_OFFSETS = Object.freeze({ major: 0, minor: 24, marker: 45 });

const LANE_STACK_PX = BRACKET_LANE_OFFSETS.marker;

/**
 * Y coordinate of the topmost bracket lane, in container-local CSS pixels.
 *
 * Anchored to the projected model rather than to the page header, so the labels
 * stay attached to the thing they measure at every camera distance.
 *
 * @param {Array<{y_px:number, visible:boolean}>} projected
 * @param {{canvasHeight:number, safeTopPx:number}} opts
 * @returns {number}
 */
export function bracketLaneY(projected, { canvasHeight, safeTopPx }) {
  const tops = (projected || [])
    .filter((point) => point && point.visible && Number.isFinite(point.y_px))
    .map((point) => point.y_px);
  if (!tops.length) return safeTopPx + STAGE_LAYOUT.bracket_lane_gap_px;
  const modelTop = Math.min(...tops);
  const lane = modelTop - STAGE_LAYOUT.bracket_lane_gap_px - LANE_STACK_PX;
  const floor = Math.max(safeTopPx, 0);
  const ceiling = Math.max(floor, canvasHeight - LANE_STACK_PX - 24);
  return Math.max(floor, Math.min(lane, ceiling));
}

/**
 * Place a pinned explanation card so it never covers its own anchor.
 *
 * @param {{
 *   anchor: {x_px:number, y_px:number},
 *   card: {width:number, height:number},
 *   canvas: {width:number, height:number},
 *   safeTopPx: number,
 *   gapPx?: number,
 * }} opts
 * @returns {{left:number, top:number, side:'left'|'right', overlaps_anchor:boolean}}
 */
export function inspectorPlacement({ anchor, card, canvas, safeTopPx, gapPx = STAGE_LAYOUT.card_gap_px }) {
  const pad = STAGE_LAYOUT.edge_padding_px;
  const fits = (left) => left >= pad && left + card.width <= canvas.width - pad;
  const toLeft = anchor.x_px - card.width - gapPx;
  const toRight = anchor.x_px + gapPx;
  // Prefer the side with more room; fall back to the other before clamping, so
  // a clamp is the last resort rather than the first behaviour.
  const preferred = anchor.x_px > canvas.width / 2 ? toLeft : toRight;
  const alternate = preferred === toLeft ? toRight : toLeft;
  let left = fits(preferred) ? preferred : (fits(alternate) ? alternate : preferred);
  left = Math.max(pad, Math.min(canvas.width - card.width - pad, left));
  let top = anchor.y_px - card.height / 2;
  top = Math.max(safeTopPx, Math.min(canvas.height - card.height - pad, top));
  const overlapsAnchor = anchor.x_px >= left && anchor.x_px <= left + card.width
    && anchor.y_px >= top && anchor.y_px <= top + card.height;
  return {
    left,
    top,
    side: left > anchor.x_px ? 'right' : 'left',
    overlaps_anchor: overlapsAnchor,
  };
}
```

- [ ] **Step 4: Run the tests**

```sh
node --test --test-concurrency=1 test/showcase_phase11.test.js
npm run typecheck
```

Expected: PASS (5 tests), zero TypeScript diagnostics.

- [ ] **Step 5: Commit**

```sh
git add src/presentation/StageLayout.js test/showcase_phase11.test.js
git commit -m "SC-11: add pure stage composition arithmetic"
```

### Task 11.2: Tighter framing and a region-focus standoff

**Files:**
- Modify: `src/render/Viewer.js:346-370` (`frame`), `:462-480` (`focusSpan`)
- Test: `test/showcase_phase11.test.js` (extend)

**Interfaces:**
- Consumes: `STAGE_LAYOUT` from Task 11.1.
- Produces: `focusSpan` return value gains `min_span_applied: boolean`.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase11.test.js`:

```js
import { STAGE_LAYOUT as LAYOUT } from '../src/presentation/StageLayout.js';
import * as THREE from 'three';
import { Viewer } from '../src/render/Viewer.js';

/** focusSpan is arithmetic on the camera; exercise it without a WebGL context. */
function stubViewer(aspect = 1440 / 900) {
  const viewer = Object.create(Viewer.prototype);
  viewer.camera = new THREE.PerspectiveCamera(50, aspect, 1, 10000);
  viewer.controls = { target: new THREE.Vector3(), update() {} };
  viewer.prefersReducedMotion = true;
  viewer._moveCamera = function moveCamera(position, target) {
    this.camera.position.copy(position);
    this.controls.target.copy(target);
  };
  viewer._updateFrustum = () => {};
  return viewer;
}

test('SC11: a small region focus keeps a minimum readable span', () => {
  const viewer = stubViewer();
  const tiny = viewer.focusSpan(100, 106.8);          // N2A at ~6.8 nm
  assert.equal(tiny.min_span_applied, true);
  assert.ok(tiny.view_span_nm >= LAYOUT.min_region_view_span_nm - 1,
    `view span ${tiny.view_span_nm} nm is too tight to read a region in context`);
});

test('SC11: a large span uses the tighter margin', () => {
  const viewer = stubViewer();
  const wide = viewer.focusSpan(0, 1100);
  assert.equal(wide.min_span_applied, false);
  const ratio = wide.view_span_nm / 1100;
  assert.ok(ratio > 1.05 && ratio < 1.2,
    `margin ratio ${ratio.toFixed(3)} should be near ${LAYOUT.frame_margin_factor}`);
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase11.test.js
```

Expected: FAIL — `min_span_applied` is `undefined`.

- [ ] **Step 3: Rewrite `focusSpan`**

At the top of `src/render/Viewer.js`, add:

```js
import { STAGE_LAYOUT } from '../presentation/StageLayout.js';
```

Replace `src/render/Viewer.js:462-480` with:

```js
  focusSpan(startNm, endNm, opts = {}) {
    if (!Number.isFinite(startNm) || !Number.isFinite(endNm) || endNm <= startNm) {
      throw new Error(`focusSpan: expected a positive finite range, got ${startNm}..${endNm}`);
    }
    const physicalSpan = endNm - startNm;
    const margined = physicalSpan * STAGE_LAYOUT.frame_margin_factor;
    // A 6.8 nm region framed at 1.12x puts the camera INSIDE the tube and shows a
    // featureless wall. A region is only meaningful in series with its
    // neighbours, so a floor keeps that context in frame.
    const viewSpan = Math.max(margined, STAGE_LAYOUT.min_region_view_span_nm);
    const minSpanApplied = viewSpan > margined;
    const target = new THREE.Vector3((startNm + endNm) / 2, 0, 0);
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const distance = (viewSpan / this.camera.aspect / 2) / Math.tan(fov / 2);
    const direction = new THREE.Vector3(0.12, 0.25, 1).normalize();
    this._moveCamera(target.clone().add(direction.multiplyScalar(distance)), target, opts);
    return {
      target_nm: target.toArray().map((n) => Number(n.toFixed(1))),
      region_span_nm: Number(physicalSpan.toFixed(3)),
      view_span_nm: Number(this.visibleWidthAtDistance(distance).toFixed(1)),
      distance_nm: Number(distance.toFixed(1)),
      min_span_applied: minSpanApplied,
      animated: Boolean(opts.animate && !this.prefersReducedMotion),
    };
  }
```

- [ ] **Step 4: Tighten the bounding-sphere framing too**

In `src/render/Viewer.js:360-361`, replace the hardcoded margin:

```js
    // 1.15 leaves a small margin so the structure does not touch the frame edge.
    const distance = (radius / Math.sin(fov / 2)) * 1.15;
```

with:

```js
    const distance = (radius / Math.sin(fov / 2)) * STAGE_LAYOUT.frame_margin_factor;
```

- [ ] **Step 5: Run the tests**

```sh
node --test --test-concurrency=1 test/showcase_phase11.test.js test/phase10.test.js test/showcase_phase6.test.js test/closeup.test.js
npm run typecheck
```

Expected: PASS. If a close-up test asserts an exact `view_span_nm`, update that expectation and note the new constant in the commit message — the close-up presets state their own `spanNm` and are unaffected by `focusSpan`.

- [ ] **Step 6: Commit**

```sh
npm run build && npm run check:build
git add -A && git commit -m "SC-11: tighten framing and give region focus a readable standoff"
```

### Task 11.3: Brackets that attach to the model, and reframing on mode switch

**Files:**
- Modify: `src/index.template.html:747-830` (`renderScienceOverlay`), `:626-657` (`setAudienceMode`)
- Modify: `scripts/build_standalone.mjs` (bundle bindings — Global Constraint 4)
- Test: `test/showcase_phase11.test.js` (extend)

**Interfaces:**
- Consumes: `bracketLaneY`, `BRACKET_LANE_OFFSETS`, `STAGE_LAYOUT` from Task 11.1.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase11.test.js`:

```js
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const builder = readFileSync(new URL('../scripts/build_standalone.mjs', import.meta.url), 'utf8');

test('SC11: the page derives the bracket lane from the model, not the header', () => {
  assert.match(page, /import \{[^}]*bracketLaneY[^}]*\} from '\.\/src\/presentation\/StageLayout\.js'/);
  assert.match(page, /bracketLaneY\(/);
  assert.ok(!/const laneY = Math\.min\(height \* 0\.32/.test(page),
    'the header-relative lane must be gone');
  assert.match(page, /BRACKET_LANE_OFFSETS/,
    'lane offsets must come from the module, not be restated in the page');
});

test('SC11: brackets drop a tick to the axis they measure', () => {
  assert.match(page, /bracket_drop_tick_px/);
});

test('SC11: changing audience mode reframes the camera', () => {
  assert.match(page, /function syncAudienceMode[\s\S]{0,600}applyCameraPreset\(/,
    'the canvas changes width on mode switch, so the framing must be recomputed');
});

test('SC11: every StageLayout binding the page imports is re-exported by the bundle', () => {
  const imported = page.match(/import \{([^}]*)\} from '\.\/src\/presentation\/StageLayout\.js'/);
  assert.ok(imported, 'the page must import StageLayout');
  for (const name of imported[1].split(',').map((part) => part.trim()).filter(Boolean)) {
    assert.ok(builder.includes(name),
      `scripts/build_standalone.mjs must re-export '${name}' or the standalone page breaks`);
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase11.test.js
```

Expected: FAIL — the page does not import `StageLayout`.

- [ ] **Step 3: Import the module in the page**

In `src/index.template.html`, in the page module's import block (around line 512), add:

```js
import { STAGE_LAYOUT, BRACKET_LANE_OFFSETS, bracketLaneY, inspectorPlacement } from './src/presentation/StageLayout.js';
```

- [ ] **Step 4: Add the bindings to the standalone builder (all three places)**

In `scripts/build_standalone.mjs`:

1. In the `ENTRY` template literal (~line 96–104), add:

```js
export { STAGE_LAYOUT, BRACKET_LANE_OFFSETS, bracketLaneY, inspectorPlacement } from './src/presentation/StageLayout.js';
```

2. In the destructuring replacement string (~line 166), extend the name list to:

```js
'const { TitinModel, TitinVisualization, SCALES, Viewer, VIEWS, CLOSEUPS, COMPONENT_COLOR, EVIDENCE_STYLE, COMPONENTS, EVIDENCE_CLASSES, StoryController, AUDIENCE_MODES, isLongitudinalProjection, STAGE_LAYOUT, BRACKET_LANE_OFFSETS, bracketLaneY, inspectorPlacement } = __titinBundle;\n'
```

3. In the returned object literal (~line 201), extend it identically:

```js
'return { TitinModel, TitinVisualization, SCALES, Viewer, VIEWS, CLOSEUPS, COMPONENT_COLOR, EVIDENCE_STYLE, COMPONENTS, EVIDENCE_CLASSES, StoryController, AUDIENCE_MODES, isLongitudinalProjection, STAGE_LAYOUT, BRACKET_LANE_OFFSETS, bracketLaneY, inspectorPlacement };',
```

- [ ] **Step 5: Use the lane function in `renderScienceOverlay`**

In `src/index.template.html`, inside `renderScienceOverlay`, replace lines 789–798 (the `canvasRect` / `headerBottom` / `laneY` block and the per-bracket `y` computation) with:

```js
    const canvasRect = $('canvas').getBoundingClientRect();
    const safeTopPx = $('stageHeader').getBoundingClientRect().bottom - canvasRect.top + 16;
    const laneY = bracketLaneY([...projected.values()], { canvasHeight: height, safeTopPx });
    for (const bracket of activeShowcaseOverlay.brackets) {
      const start = projected.get(`${bracket.id}:start`);
      const end = projected.get(`${bracket.id}:end`);
      if (!start || !end || (!start.visible && !end.visible)) continue;
      const x1 = Math.max(12, Math.min(width - 12, start.x_px));
      const x2 = Math.max(12, Math.min(width - 12, end.x_px));
      const y = laneY + (BRACKET_LANE_OFFSETS[bracket.lane] ?? BRACKET_LANE_OFFSETS.major);
```

Leave the rest of the loop body unchanged.

- [ ] **Step 6: Add drop ticks so a bracket points at its own boundary**

Still inside the same loop, in the `else if (Math.abs(x2 - x1) > 8)` branch, after the existing bracket `path` is pushed, add:

```js
        // Without a tick the label floats: the reader has to guess which
        // boundary a bracket end refers to.
        const tick = STAGE_LAYOUT.bracket_drop_tick_px;
        for (const [x, point] of [[x1, start], [x2, end]]) {
          if (!point.visible) continue;
          nodes.push(svgElement('path', {
            d: `M ${x} ${y + 5} V ${Math.min(point.y_px, y + 5 + tick)}`,
            class: 'science-bracket minor',
          }));
        }
```

- [ ] **Step 7: Reframe when the canvas changes width**

In `src/index.template.html:626-635`, replace the last line of `syncAudienceMode`:

```js
  requestAnimationFrame(() => visualization.resize());
```

with:

```js
  // Evidence mode takes ~370 px of canvas. Resizing alone keeps the old framing
  // and crops the Z-disc, so the named camera preset is re-applied at the new
  // aspect ratio.
  requestAnimationFrame(() => {
    visualization.resize();
    applyCameraPreset({ animate: false });
    renderScienceOverlay();
  });
```

`applyCameraPreset` is declared later in the module; that is fine because it is a hoisted function declaration and this runs inside a callback.

- [ ] **Step 8: Run the tests**

```sh
node --test --test-concurrency=1 test/showcase_phase11.test.js test/presentation.test.js test/standalone.test.js
npm run build && npm run check:build
```

Expected: PASS, and the build prints `page-module imports collapsed: 8`.

- [ ] **Step 9: Look at it**

```sh
open "index.html#mode=evidence&step=orientation&sl=2200&scale=context&camera=view.titin_story&target=titin&evidence=1"
```

Confirm: the Z-disc is fully in frame, and the band brackets sit just above the filaments with short ticks pointing down at the boundaries.

- [ ] **Step 10: Commit**

```sh
git add -A && git commit -m "SC-11: attach band brackets to the model and reframe on mode switch"
```

### Task 11.4: Stop doing layout work on every frame

**Files:**
- Modify: `src/index.template.html:2148-2155` (the frame callback), `src/render/Viewer.js` (`start`)
- Test: `test/showcase_phase11.test.js` (extend)

**Interfaces:**
- Produces: page-level `markStageDirty()` function; `Viewer.prototype.start` keeps its existing `(onStateChange, onFrame)` signature.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase11.test.js`:

```js
test('SC11: overlay work is dirty-flagged, not run on every frame', () => {
  assert.match(page, /function markStageDirty\(\)/);
  // The per-frame callback must consult the flag before doing DOM measurement.
  assert.match(page, /\}, \(\) => \{\s*if \(!stageDirty[\s\S]{0,200}renderScienceOverlay\(\); renderObjectOverlay\(\);/,
    'the frame callback must early-out when nothing changed');
  assert.match(page, /controls\.addEventListener\('change', markStageDirty\)|markStageDirty\(\)/);
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase11.test.js
```

Expected: FAIL — `markStageDirty` does not exist.

- [ ] **Step 3: Add the dirty flag**

In `src/index.template.html`, near the other module-level state declarations (around line 707, next to `let objectOverlaySignature = null;`), add:

```js
// The overlays measure DOM geometry and write inline styles, which forces a
// synchronous layout. Doing that on every animation frame is why Evidence mode
// — whose drawer holds a large DOM — became frame-bound. The overlays now run
// when something that can move them has actually changed.
let stageDirty = true;
function markStageDirty() { stageDirty = true; }
```

- [ ] **Step 4: Consume the flag in the frame callback**

Replace `src/index.template.html:2155`:

```js
}, () => { renderScienceOverlay(); renderObjectOverlay(); });
```

with:

```js
}, ({ camera_moving: cameraMoving } = {}) => {
  if (!stageDirty && !cameraMoving) return;
  stageDirty = false;
  renderScienceOverlay(); renderObjectOverlay();
});
```

- [ ] **Step 5: Report camera motion from the Viewer**

`Viewer.start` lives at `src/render/Viewer.js:683-697` and currently calls `onFrame()` with no arguments (line 693). The camera moves for exactly two reasons: an animated transition (`this._cameraTransition`, already tracked at line 192) or the OrbitControls changing it. OrbitControls emits `change` for both direct input and damped settling, so one listener covers both.

In the constructor, next to the existing `this._onControlStart` (line 207), add:

```js
    // Overlays must keep up while the camera moves, and must not run when it is
    // still. OrbitControls fires 'change' for direct input and for damped
    // settling, so this one flag covers every camera move it can cause.
    this._controlsMoved = false;
    this._onControlChange = () => { this._controlsMoved = true; };
    this.controls.addEventListener('change', this._onControlChange);
```

In `dispose()` (line 704-713), next to the existing `removeEventListener('start', …)`, add:

```js
    this.controls.removeEventListener('change', this._onControlChange);
```

In `start()`, replace line 693:

```js
      if (onFrame) onFrame();
```

with:

```js
      if (onFrame) {
        onFrame({ camera_moving: Boolean(this._cameraTransition) || this._controlsMoved });
        this._controlsMoved = false;
      }
```

- [ ] **Step 6: Mark dirty wherever state changes**

Add a `markStageDirty();` call at the end of each of these page functions in `src/index.template.html`: `rebuild`, `applyChapter`, `setAudienceMode`, `selectRegion`, `setPinnedSelection`, `clearPinnedSelection`, and the `resize` handler. Also add `window.addEventListener('resize', markStageDirty);` next to the existing hashchange listener.

- [ ] **Step 7: Run the tests and measure**

```sh
node --test --test-concurrency=1 test/showcase_phase11.test.js test/presentation.test.js test/phase10.test.js
npm run typecheck && npm run build && npm run check:build
```

Then open the page, switch to Evidence mode, and confirm in DevTools ▸ Performance that idle frames no longer show `Recalculate Style` / `Layout` entries.

- [ ] **Step 8: Commit**

```sh
git add -A && git commit -m "SC-11: run stage overlays on change instead of every frame"
```

### Task 11.4a: A scale bar, because every number here is in nanometres

> Added in Revision 2. Runs after Task 11.4 and before the sprint wiring in Task 11.5.

**Why.** Nothing on the stage says how big anything is, at any zoom, in either mode. This is a
project whose entire vocabulary is nanometres — 45.5 nm super-repeat, 39.83 nm `d10`, 6.8 nm N2A,
a 620 nm anchored span — and a viewer has no way to convert what they see into any of them. It
also matters more than usual here because the renderer *withdraws* detail below a resolvability
threshold (`anchor_detail.feature_px < alias_threshold_px`); a viewer who cannot see the scale
cannot tell an honest LOD withdrawal from a missing feature.

A scale bar is the cheapest credibility this page can buy. It is also pure arithmetic: the
projection already gives px/nm, and choosing a nice round span for a given pixel budget is a
textbook function that belongs in `StageLayout` with a Node test.

**Files:**
- Modify: `src/presentation/StageLayout.js` (add `scaleBar`)
- Modify: `src/index.template.html` (draw it in the science overlay; update on the same dirty flag as Task 11.4)
- Test: `test/showcase_phase11.test.js` (extend)

**Interfaces:**
- Produces: `scaleBar(pxPerNm, maxPx) -> { nm, px, label }` — pure, no DOM.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase11.test.js`:

```js
import { scaleBar } from '../src/presentation/StageLayout.js';

test('SC11-4a: the bar picks a round span that fits the budget', () => {
  for (const pxPerNm of [0.05, 0.3, 1.07, 4.2, 17, 120]) {
    const bar = scaleBar(pxPerNm, 160);
    assert.ok(bar.px > 0 && bar.px <= 160, 'the bar must fit its pixel budget');
    assert.ok(bar.px >= 40, 'a bar under 40 px cannot be read');
    // 1-2-5 sequence across decades: the span is always a number a viewer can hold.
    const mantissa = bar.nm / 10 ** Math.floor(Math.log10(bar.nm));
    assert.ok([1, 2, 5].includes(Math.round(mantissa * 1e6) / 1e6),
      `${bar.nm} nm is not a 1-2-5 round number`);
    assert.ok(Math.abs(bar.px - bar.nm * pxPerNm) < 1e-6,
      'the drawn length must equal the labelled span, not approximate it');
  }
});

test('SC11-4a: the label switches unit without changing the measurement', () => {
  assert.match(scaleBar(0.02, 160).label, /µm$/);   // wide field
  assert.match(scaleBar(20, 160).label, /nm$/);     // molecular close-up
});
```

The `bar.px === bar.nm * pxPerNm` assertion is the one that matters: it is the same discipline
SC-6 applied to the `d10` dimension line — the drawn length must *be* the measurement, not carry a
label that claims it.

- [ ] **Step 2: Run it, watch it fail, then write `scaleBar`**

1-2-5 selection: take the largest `nm` from the 1-2-5 sequence whose `nm × pxPerNm ≤ maxPx`; if
that falls below the 40 px readability floor, step up one place in the sequence and let the bar
exceed nothing — `maxPx` should be generous enough (160 px on a 1280 px stage) that this cannot
happen for any reachable zoom. Format as `µm` at or above 1,000 nm, otherwise `nm`.

- [ ] **Step 3: Draw it**

Bottom-left of the stage, above the existing `drag: orbit · wheel/pinch: zoom` hint, in the science
overlay so it participates in the Task 11.4 dirty flag rather than running per frame. A plain
bracketed rule and one label — no box, no fill. Derive `pxPerNm` from the same projection the
brackets use; do **not** add a second camera query.

It is presentation geometry, so it is declared as such: add it to the render-meaning text for the
stage in `data/annotations.json` alongside the brackets and the continuity trace.

- [ ] **Step 4: Verify, and check it survives a close-up**

```sh
node --test --test-concurrency=1 test/showcase_phase11.test.js
npm run typecheck && npm run build && npm run check:build
```

In the browser, walk chapters 1 → 5 and confirm the bar re-scales — after Task 11.0 the tour spans
roughly 1,100 nm at chapter 1 down to a ~200 nm close-up at chapter 4, so the bar should visibly
change span and, at some point, unit.

- [ ] **Step 5: Commit**

```sh
git add -A && git commit -m "SC-11: put a scale bar on the stage"
```

### Task 11.5: Sprint wiring

- [ ] **Step 1: Add the npm scripts**

In `package.json`, add:

```json
"test:sc10": "node --test --test-concurrency=1 test/showcase_phase10.test.js test/showcase_phase8.test.js test/standalone.test.js",
"verify:sc10": "npm run check:build && npm run typecheck && npm run test:sc10",
"test:sc11": "node --test --test-concurrency=1 test/showcase_phase11.test.js test/presentation.test.js test/phase10.test.js test/standalone.test.js",
"verify:sc11": "npm run check:build && npm run typecheck && npm run test:sc11 && npm run validate:presentation",
```

- [ ] **Step 2: Run both sprint gates**

```sh
npm run verify:sc10 && npm run verify:sc11
```

Expected: PASS.

- [ ] **Step 3: Commit**

```sh
git add package.json && git commit -m "SC-10/11: add sprint verification scripts"
```

---

# Sprint SC-12 — The stage control bar

**Why:** The sarcomere-length slider lives inside `#panel` (`src/index.template.html:437-441`), and `#panel` is `display: none` outside Evidence mode. A visitor in Guided mode therefore **cannot stretch the sarcomere** — the one interaction that answers the project's own lay-comprehension question *"What changes as the sarcomere lengthens?"* (`data/release_gates.json` → `lay_comprehension.protocol.questions`). Guided mode also has no legend, so *"shown in red beside actin and myosin"* leaves a novice unable to tell the two dark cylinders apart.

**Design rule for this sprint:** the stage bar is present in **both** modes. Guided is a reduced *explanation* set, not a reduced *control* set.

**Done when:** length, presets, a stretch sweep, camera views, filament context, and a legend are one click away from the first frame in both modes, and the drawer keeps its readouts.

### Task 12.1: Relocate the primary controls and update the placement gate

**Files:**
- Modify: `src/index.template.html` (markup + CSS)
- Modify: `test/presentation.test.js:126-133`
- Test: `test/showcase_phase12.test.js` (create)

**Interfaces:**
- Produces: DOM ids `stageBar`, `stageLengthReadout`, `sl` (moved, same id), `presets` (moved, same id), `views` (moved, same id), `stagePlay`, `stageLegend`.

- [ ] **Step 1: Write the failing test**

Create `test/showcase_phase12.test.js`:

```js
/** SC-12 gates: the didactic controls are on the stage, in both audience modes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');

const between = (startId, endMarker) => {
  const start = page.indexOf(`id="${startId}"`);
  assert.ok(start > -1, `${startId} is missing`);
  const end = page.indexOf(endMarker, start);
  assert.ok(end > -1, `${endMarker} after ${startId} is missing`);
  return [start, end];
};

test('SC12: the primary controls live on the stage, not in the drawer', () => {
  const [barStart, barEnd] = between('stageBar', '</div><!-- /stageBar -->');
  for (const id of ['sl', 'presets', 'views', 'stagePlay', 'filamentContextToggle']) {
    const at = page.indexOf(`id="${id}"`);
    assert.ok(at > barStart && at < barEnd, `${id} must be inside the stage bar`);
  }
});

test('SC12: the stage bar is visible in both audience modes', () => {
  assert.ok(!/#app\[data-mode="evidence"\] #stageBar \{ display: none/.test(page),
    'the stage bar must not be hidden in Evidence mode');
  assert.ok(!/#app\[data-mode="guided"\] #stageBar \{ display: none/.test(page),
    'the stage bar must not be hidden in Guided mode');
});

test('SC12: the readouts stay in the Evidence drawer', () => {
  const drawerStart = page.indexOf('id="panel"');
  const drawerEnd = page.indexOf('</aside>', drawerStart);
  for (const id of ['scales', 'closeups', 'toggles', 'components', 'regions',
    'metrics', 'legend', 'evidence', 'annotations', 'notClaimed', 'notes']) {
    const at = page.indexOf(`id="${id}"`);
    assert.ok(at > drawerStart && at < drawerEnd, `${id} must remain in the drawer`);
  }
});

test('SC12: Guided mode carries an on-canvas legend', () => {
  assert.match(page, /id="stageLegend"/);
  assert.match(page, /function syncStageLegend/);
});

test('SC12: every stage control is a real, labelled button or input', () => {
  assert.match(page, /<button id="stagePlay"[^>]*aria-pressed="false"/);
  assert.match(page, /id="sl"[^>]*step="1"[^>]*aria-label=/);
  const tabindexes = [...page.matchAll(/tabindex="(-?\d+)"/g)].map((hit) => Number(hit[1]));
  assert.ok(tabindexes.every((value) => value <= 0));
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase12.test.js
```

Expected: FAIL — `stageBar is missing`.

- [ ] **Step 3: Update the existing placement gate first, and say why**

In `test/presentation.test.js`, replace the id list at lines 127–133 with:

```js
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
```

- [ ] **Step 4: Fix the SC-2 proxy assertion for the same reason**

`test/showcase_phase2.test.js:255` asserts that `filamentContextToggle` appears **before** `guidedCard` in the document, and its own message states the intent: *"the immediate actin/myosin control must be in the stage header, not the Evidence drawer."* The stage bar is inserted after `#stageChrome`, so the positional proxy would fail while the intent still holds. Replace that line with the intent itself:

```js
  const drawerOpen = page.indexOf('id="panel"');
  const drawerClose = page.indexOf('</aside>', drawerOpen);
  const toggleAt = page.indexOf('id="filamentContextToggle"');
  assert.ok(toggleAt > -1 && !(toggleAt > drawerOpen && toggleAt < drawerClose),
    'the immediate actin/myosin control must be on the stage, not in the Evidence drawer');
```

- [ ] **Step 5: Add the stage bar markup**

In `src/index.template.html`, immediately **after** the closing `</div>` of `#stageChrome` (line 395) and **before** `<div id="interactionHelp">`, insert:

```html
      <div id="stageBar">
        <div class="stage-row stage-row-primary">
          <label class="stage-label" for="sl">Sarcomere length</label>
          <input type="range" id="sl" step="1" aria-label="Sarcomere length in nanometres">
          <output class="stage-readout" id="stageLengthReadout" for="sl">— nm</output>
          <div class="row stage-presets" id="presets"></div>
          <button id="stagePlay" aria-pressed="false"
            aria-label="Play a stretch sweep across the working range">&#9654; Stretch</button>
        </div>
        <div class="stage-row stage-row-secondary">
          <span class="stage-label">View</span>
          <div class="row" id="views"></div>
          <button id="filamentContextToggle" class="on" aria-pressed="true"
            aria-label="Show actin and myosin filament context"
            title="Show one central myosin thick filament and its six nearest actin thin filaments around the surface-bound representative titin">Actin + myosin</button>
          <div id="stageLegend" aria-label="Colour key"></div>
          <button id="stageEvidenceLink">Evidence &amp; sources</button>
        </div>
      </div><!-- /stageBar -->
```

Then **delete** from the drawer: the `<h2>Sarcomere length</h2>` block's `<input type="range" id="sl" …>` and `<div class="row" id="presets"></div>` (lines 437–440), the `<h2>View</h2>` + `<div class="row" id="views"></div>` block (lines 444–445), and the `filamentContextToggle` button from the brand block (lines 361–363). Keep `slReadout`, `activationStatement` and `stateCaveat` in the drawer.

Replace the drawer's now-empty length section with a pointer:

```html
    <h2>Sarcomere length</h2>
    <div class="sl" id="slReadout">— <small>nm</small></div>
    <div class="sub" style="margin:0 0 6px">Set it on the stage bar below the model.</div>
    <div class="activation-note" id="activationStatement"></div>
    <div class="note warn" id="stateCaveat" hidden></div>
```

- [ ] **Step 6: Add the CSS**

In the `<style>` block of `src/index.template.html`, after the `#interactionHelp` rule (line 152), add:

```css
  #stageBar { position: absolute; left: 0; right: 0; bottom: 0; z-index: 6;
    display: flex; flex-direction: column; gap: 6px; padding: 9px 12px 10px;
    background: linear-gradient(to top, rgb(14 17 22 / 96%), rgb(14 17 22 / 74%));
    border-top: 1px solid var(--edge); backdrop-filter: blur(10px); }
  .stage-row { display: flex; align-items: center; gap: 8px 10px; flex-wrap: wrap; }
  .stage-row-primary #sl { flex: 1 1 220px; min-width: 160px; width: auto; }
  .stage-label { color: var(--dim); font-size: 10px; text-transform: uppercase;
    letter-spacing: .08em; font-weight: 700; }
  .stage-readout { font-variant-numeric: tabular-nums; font-size: 15px; font-weight: 650;
    min-width: 84px; }
  .stage-presets { margin: 0; }
  #stagePlay.on { background: var(--titin); border-color: var(--titin); color: #2a0a13; }
  #stageLegend { display: flex; gap: 10px; flex-wrap: wrap; margin-left: auto;
    color: var(--dim); font-size: 10px; }
  #stageLegend .key { margin: 0; }
  #guidedCard { margin-bottom: 92px; }
  #interactionHelp { bottom: 96px; }
  @media (max-width: 700px) {
    .stage-row-secondary #stageLegend { display: none; }
    #guidedCard { margin-bottom: 118px; }
  }
```

Also change the `#stageChrome` rule to leave room: `padding: 14px 14px 96px;`.

- [ ] **Step 7: Wire the new controls**

In the page module, add next to the other handlers:

```js
$('stageEvidenceLink').onclick = () => openEvidence($('stageEvidenceLink'));
```

And add the legend renderer, called from `render(report)`:

```js
// A novice cannot act on "shown in red beside actin and myosin" without a key.
// The swatches read the palette actually in use, so Guided's subdued context
// colours and Evidence's identity palette are both described correctly.
function syncStageLegend(report) {
  const guided = state.audienceMode === AUDIENCE_MODES.guided;
  const palette = guided ? GUIDED_COMPONENT_COLOR : COMPONENT_COLOR;
  const hidden = new Set(report?.hidden_components || []);
  const entries = [['titin', 'Titin', COMPONENT_COLOR.titin]];
  if (state.showFilamentContext && !hidden.has('thick_filament')) {
    entries.push(['thick_filament', 'Myosin', palette.thick_filament]);
  }
  if (state.showFilamentContext && !hidden.has('thin_filament')) {
    entries.push(['thin_filament', 'Actin', palette.thin_filament]);
  }
  $('stageLegend').replaceChildren(...entries.map(([id, label, colour]) => {
    const row = document.createElement('div');
    row.className = 'key';
    row.dataset.component = id;
    const swatch = document.createElement('div');
    swatch.className = 'sw';
    swatch.style.background = hex(colour);
    row.append(swatch, document.createTextNode(label));
    return row;
  }));
}
```

Import `GUIDED_COMPONENT_COLOR` in the page module's `SarcomereScene` import line, and add it to all three places in `scripts/build_standalone.mjs` (Global Constraint 4). Call `syncStageLegend(report);` from `render(report)` next to `syncDepictionToggles()`.

- [ ] **Step 8: Run the tests**

```sh
node --test --test-concurrency=1 test/showcase_phase12.test.js test/presentation.test.js test/phase10.test.js test/showcase_phase8.test.js
npm run typecheck && npm run build && npm run check:build
```

Expected: PASS.

- [ ] **Step 9: Commit**

```sh
git add -A && git commit -m "SC-12: put length, presets, views, context and a legend on the stage"
```

### Task 12.2: The stretch sweep

**Files:**
- Create: `src/presentation/StretchSweep.js`
- Modify: `src/index.template.html` (play button wiring), `scripts/build_standalone.mjs`
- Test: `test/showcase_phase12.test.js` (extend)

**Interfaces:**
- Produces: `SWEEP` (frozen constants) and `sweepLength(elapsedMs, {minNm, maxNm, periodMs})` → integer nm.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase12.test.js`:

```js
import { SWEEP, sweepLength } from '../src/presentation/StretchSweep.js';

test('SC12: the sweep is a closed triangle between the two working-range ends', () => {
  const bounds = { minNm: 2000, maxNm: 2400, periodMs: 6000 };
  assert.equal(sweepLength(0, bounds), 2000);
  assert.equal(sweepLength(3000, bounds), 2400);
  assert.equal(sweepLength(6000, bounds), 2000);
  assert.equal(sweepLength(9000, bounds), 2400);      // second cycle
  assert.equal(sweepLength(-3000, bounds), 2400);     // negative time is defined
});

test('SC12: the sweep is monotone on each limb and always an integer', () => {
  const bounds = { minNm: 2000, maxNm: 2400, periodMs: 6000 };
  let previous = -Infinity;
  for (let t = 0; t <= 3000; t += 100) {
    const value = sweepLength(t, bounds);
    assert.equal(Number.isInteger(value), true);
    assert.ok(value >= previous, `not monotone at ${t} ms`);
    previous = value;
  }
});

test('SC12: a non-positive period is rejected rather than dividing by zero', () => {
  assert.throws(() => sweepLength(0, { minNm: 2000, maxNm: 2400, periodMs: 0 }),
    /periodMs must be positive/);
});

test('SC12: the page refuses to autoplay and honours reduced motion', () => {
  assert.match(page, /prefersReducedMotion[\s\S]{0,400}stagePlay/,
    'reduced motion must disable or shorten the sweep');
  assert.ok(!/stagePlay[\s\S]{0,200}\.click\(\)/.test(page), 'the sweep must never start itself');
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase12.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

Create `src/presentation/StretchSweep.js`:

```js
/**
 * SC-12 stretch sweep.
 *
 * A pure function of elapsed time, so the demo motion is testable without a
 * timer, a browser, or a frame loop. The caller owns requestAnimationFrame and
 * therefore owns cancellation, which is what makes the sweep interruptible.
 *
 * It is a TRIANGLE, not a sine: the ends are the two states an audience is
 * being asked to compare, so the sweep spends its time travelling between them
 * rather than lingering at the midpoint.
 */
export const SWEEP = Object.freeze({
  period_ms: 6000,
  /** Reduced-motion users get the endpoints without the travel. */
  reduced_motion_period_ms: 2000,
});

/**
 * Sarcomere length at a point in the sweep.
 *
 * @param {number} elapsedMs
 * @param {{minNm:number, maxNm:number, periodMs?:number}} bounds
 * @returns {number} integer nanometres
 */
export function sweepLength(elapsedMs, { minNm, maxNm, periodMs = SWEEP.period_ms }) {
  if (!(periodMs > 0)) throw new Error('sweepLength: periodMs must be positive');
  if (!Number.isFinite(minNm) || !Number.isFinite(maxNm) || maxNm <= minNm) {
    throw new Error(`sweepLength: expected minNm < maxNm, got ${minNm}..${maxNm}`);
  }
  const phase = (((elapsedMs % periodMs) + periodMs) % periodMs) / periodMs;
  const triangle = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  return Math.round(minNm + (maxNm - minNm) * triangle);
}
```

- [ ] **Step 4: Wire the play button**

Add the import to the page module and to all three places in `scripts/build_standalone.mjs`:

```js
import { SWEEP, sweepLength } from './src/presentation/StretchSweep.js';
```

Then add the controller next to the other handlers in `src/index.template.html`:

```js
// The sweep is the demo moment: it makes "different regions extend differently"
// something you watch rather than something you are told. It is always
// user-initiated, stops on any other interaction, and never runs at a speed the
// operating system has been told the user does not want.
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let sweepHandle = null;
let sweepStartedAt = 0;

function stopSweep() {
  if (sweepHandle === null) return;
  cancelAnimationFrame(sweepHandle);
  sweepHandle = null;
  $('stagePlay').classList.remove('on');
  $('stagePlay').setAttribute('aria-pressed', 'false');
}

function stepSweep(now) {
  const periodMs = prefersReducedMotion ? SWEEP.reduced_motion_period_ms : SWEEP.period_ms;
  const value = sweepLength(now - sweepStartedAt, {
    minNm: sweepRange.min, maxNm: sweepRange.max, periodMs,
  });
  if (Number(slider.value) !== value) { slider.value = value; rebuild(); }
  sweepHandle = requestAnimationFrame(stepSweep);
}

// The working range, not the slider's full range: the illustrative 3,000 nm
// reference is outside the declared comparison interval and must not be swept
// through as if it were ordinary physiology.
const workingPresets = presentation.length_presets.filter((preset) => !preset.outside_working_range);
const sweepRange = {
  min: Math.min(...workingPresets.map((preset) => preset.sarcomere_length_nm)),
  max: Math.max(...workingPresets.map((preset) => preset.sarcomere_length_nm)),
};

$('stagePlay').onclick = () => {
  if (sweepHandle !== null) { stopSweep(); return; }
  sweepStartedAt = performance.now();
  $('stagePlay').classList.add('on');
  $('stagePlay').setAttribute('aria-pressed', 'true');
  sweepHandle = requestAnimationFrame(stepSweep);
};
slider.addEventListener('pointerdown', stopSweep);
slider.addEventListener('keydown', stopSweep);
$('canvas').addEventListener('pointerdown', stopSweep);
```

Add `stopSweep();` as the first line of `applyChapter` and of `setAudienceMode`.

- [ ] **Step 5: Run the tests and try it**

```sh
node --test --test-concurrency=1 test/showcase_phase12.test.js
npm run typecheck && npm run build && npm run check:build
open "index.html#mode=guided&step=elastic_regions&sl=2200&scale=detail&camera=region.PEVK&target=PEVK&evidence=0"
```

Press **▶ Stretch** and confirm the regional bars move while titin extends, and that dragging the slider stops the sweep.

- [ ] **Step 6: Commit**

```sh
git add -A && git commit -m "SC-12: add the user-initiated stretch sweep"
```

### Task 12.2a: Make actin and myosin tellable apart

> Added in Revision 2. Runs with the legend from Task 12.1 — a legend that names two colours a
> viewer cannot distinguish is worse than no legend, because it asserts a difference that is not
> on screen.

**Why.** Guided mode dims the context through `GUIDED_COMPONENT_COLOR`
(`src/render/SarcomereScene.js:151-164`). Computed against the shipped tokens and the `#0e1116`
stage:

| Pair | Ratio |
|---|---|
| `thin_filament #3b514b` vs `thick_filament #26384b` | **1.41 : 1** |
| `thin_filament #3b514b` vs `myosin_head #3b5368` | **1.06 : 1** |
| `thick_filament #26384b` vs background | 1.58 : 1 |
| `titin #ff5d7d` vs background | 6.41 : 1 |

Actin and the myosin head array are separated by **six hundredths of a contrast ratio** — they
differ in hue alone (green-grey against blue-grey), which is the worst available pair for
deuteranopia and vanishes completely in grayscale. Chapter 1's copy is *"shown in red beside actin
and myosin"*; the viewer is being asked to read a distinction the render does not make. The myosin
filament itself is at 1.58 : 1 against the background — on a projector with any ambient light it
is not there at all.

This is not an argument for brightening the context. Titin's 6.41 : 1 dominance is correct and the
whole point of SC-10. The fix is to spend the *available* dynamic range between the background and
titin on two separable steps instead of one flat grey.

**Files:**
- Modify: `src/render/SarcomereScene.js` (`GUIDED_COMPONENT_COLOR`)
- Modify: `data/release_gates.json` (new `accessibility.object_contrast_pairs`)
- Modify: `scripts/validate_release_gates.py` (compute the new block the same way the text pairs are computed)
- Test: `test/showcase_phase12.test.js` (extend)

**Interfaces:**
- Produces: `accessibility.object_contrast_pairs` — object-versus-object minimums, checked by the same luminance function as the text pairs.

- [ ] **Step 1: Write the failing test**

```js
import { GUIDED_COMPONENT_COLOR, COMPONENT_COLOR } from '../src/render/SarcomereScene.js';

const relLum = (hex) => {
  const c = [16, 8, 0].map((s) => ((hex >> s) & 255) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const BG = 0x0e1116;

test('SC12-2a: the two filament families are separable by luminance alone', () => {
  // Luminance, not hue: this then holds in grayscale and under every CVD simulation.
  assert.ok(ratio(GUIDED_COMPONENT_COLOR.thin_filament, GUIDED_COMPONENT_COLOR.thick_filament) >= 1.7,
    'actin and myosin must not be the same brightness');
  assert.ok(ratio(GUIDED_COMPONENT_COLOR.thin_filament, GUIDED_COMPONENT_COLOR.myosin_head) >= 1.7,
    'actin and the head array must not be the same brightness');
});

test('SC12-2a: context stays visible without competing with titin', () => {
  for (const role of ['thick_filament', 'thin_filament', 'myosin_head']) {
    assert.ok(ratio(GUIDED_COMPONENT_COLOR[role], BG) >= 1.9,
      `${role} must separate from the stage on a projector`);
    assert.ok(ratio(GUIDED_COMPONENT_COLOR[role], BG) <= ratio(COMPONENT_COLOR.titin, BG) / 1.8,
      `${role} must stay well below titin — the subject keeps the top of the range`);
  }
});
```

- [ ] **Step 2: Retune the guided context tokens**

Targets, not prescriptions — satisfy the test and keep the identity hues from the visual grammar
(`data/showcase_claims.json` → `visual_grammar`): myosin family stays blue, actin family stays
ochre/green per the grammar's own assignment. Roughly: put the myosin filament near 2.0 : 1 and
actin near 3.5 : 1 against the background, and keep the head array within one step of its
filament so it still reads as part of the same object.

**Do not touch opacity.** Global Constraint 7: opacity encodes confidence. This task moves colour
only, and `test/showcase_phase8.test.js`'s opacity invariance must still pass.

- [ ] **Step 3: Add the gate to the release record**

`data/release_gates.json` currently records `accessibility.contrast_pairs` for **text**. Add a
sibling `object_contrast_pairs` with the same shape (`id`, `foreground`, `background`,
`min_ratio`, `where`) for the three pairs above, and extend `scripts/validate_release_gates.py` to
compute them with the function it already uses. Add one destructive control to
`scripts/neg_control_release_gates.py`: flattening `thin_filament` onto `myosin_head` must fail.

- [ ] **Step 4: Verify against the words**

```sh
node --test --test-concurrency=1 test/showcase_phase12.test.js test/showcase_phase8.test.js
npm run validate:gates && npm run typecheck && npm run build && npm run check:build
```

In the browser at chapter 1, with the legend on: read chapter 1's sentence and point at each of the
three things it names. If you cannot, the numbers passed and the task did not.

Then check it in grayscale — a screenshot desaturated in any image tool is enough — and confirm all
three are still distinct. That is the check the ratios were chosen to make redundant; run it once
anyway.

- [ ] **Step 5: Commit**

```sh
git add -A && git commit -m "SC-12: separate actin and myosin by luminance, not hue alone"
```

### Task 12.2b: Enforce the declared attention budget, and survive a phone

> Added in Revision 2. Runs after the stage bar exists, because the bar competes for the same
> space as everything below.

**Why.** `data/showcase_claims.json` declares:

```text
guided_secondary_context_labels_desktop_max: 3
guided_secondary_context_labels_mobile_max:  2
label_priority: [selected titin region, current anchor or band, one essential context protein, secondary context]
occlusion_rule: hide a lower-priority label before allowing overlap, detachment from its anchor,
                or obstruction of the highlighted titin path
```

Guided mode draws **six** band brackets — *Z-disc, I-band, A-band · half, C-zone, bare zone, M-band
center* — at every viewport, with no priority and no occlusion handling.
`scripts/validate_showcase_claims.py:190` pins the budget record byte-for-byte and a negative
control proves the pin, but **nothing checks the render against it**. A reviewed declaration that
the product ignores is worse than no declaration; it is exactly the kind of thing the expert claim
review is designed to catch.

At 375 × 812 the consequence is visible rather than theoretical, and Revision 1 could not capture
it. Measured on the shipped build: the six brackets stack into three overlapping rows, *"M-band
center"* clips at the right edge, the model itself runs off the right edge, and the header, scope
badge and bracket lane consume the top ~500 px while the chapter card takes the bottom ~450 px —
leaving the sarcomere a ~60 px strip. Task 12.1's stage bar will claim more of that same space.

**Files:**
- Modify: `src/presentation/StageLayout.js` (add `labelBudget`)
- Modify: `src/index.template.html` (consume it in `renderScienceOverlay`; narrow-viewport stage rules)
- Test: `test/showcase_phase12.test.js` (extend)

**Interfaces:**
- Produces: `labelBudget(candidates, viewportClass, budgetRecord) -> candidates[]` — pure; **reads** the budget from `model.spec.showcaseClaims.attention_budget` and never restates it.

- [ ] **Step 1: Write the failing test**

```js
import { labelBudget } from '../src/presentation/StageLayout.js';

const budget = model.spec.showcaseClaims.attention_budget;

// The numbers come from the reviewed record, so this test cannot drift from it —
// and cannot be satisfied by hard-coding a number in the layout module either.
test('SC12-2b: the drawn label set obeys the reviewed budget', () => {
  const candidates = ['zdisc', 'iband', 'aband_half', 'czone', 'bare_zone', 'mband_center']
    .map((id, i) => ({ id, priority: i, x: i * 40 }));
  assert.ok(labelBudget(candidates, 'desktop', budget).length
    <= budget.guided_secondary_context_labels_desktop_max);
  assert.ok(labelBudget(candidates, 'mobile', budget).length
    <= budget.guided_secondary_context_labels_mobile_max);
});

test('SC12-2b: it drops the lowest priority first, never the anchor in view', () => {
  const candidates = [
    { id: 'aband_half', priority: 1, x: 300 },
    { id: 'bare_zone', priority: 3, x: 700 },
    { id: 'iband', priority: 2, x: 120 },
  ];
  const kept = labelBudget(candidates, 'mobile', budget).map((c) => c.id);
  assert.deepEqual(kept, ['aband_half', 'iband']);
});

test('SC12-2b: Evidence mode is not subject to the guided budget', () => {
  const candidates = Array.from({ length: 6 }, (_, i) => ({ id: `b${i}`, priority: i, x: i * 40 }));
  assert.equal(labelBudget(candidates, 'desktop', budget, { audience: 'evidence' }).length, 6);
});
```

The third test states the boundary deliberately: the budget's own key is
`guided_secondary_context_labels_*`. Evidence mode is where a specialist asks for everything at
once, and clipping it there would be a regression, not a fix.

- [ ] **Step 2: Write `labelBudget` and consume it**

Sort by `priority`, take the first *n* for the viewport class, then apply the occlusion rule to
what survives: drop any remaining label whose projected box overlaps a higher-priority one or the
highlighted titin path. `viewportClass` is derived from the canvas width in the page, not from a
media query, so the same rule applies to a narrow desktop window as to a phone.

Which three survive on desktop is a presentation judgement — take *I-band*, *A-band · half* and
whichever bracket the current chapter is about, so chapter 5 keeps *C-zone* and chapter 4 keeps
*Z-disc*. That is `label_priority`'s "current anchor or band" clause, applied literally.

- [ ] **Step 3: Fix the narrow-viewport stage**

At `< 768 px`, three things must change and none of them is a font size:

1. **The model must fit.** Task 11.2's framing margin is applied to a landscape stage; at 375 px
   the half-sarcomere is clipped. Reframe on the narrow breakpoint using the same `focusSpan`
   path, and confirm the Z-disc and the M-band centre are both inside the canvas.
2. **The chapter card becomes a bottom sheet with a peek state** — title and chapter number
   visible, body expanding on tap — so the stage keeps more than a 60 px strip. Existing
   `#guidedLattice, #guidedPipeline { max-height: 38vh }` (`:277`) already anticipates this
   problem; the sheet replaces the workaround.
3. **The scope badge collapses into the header** as a single line at this width, rather than
   holding its own 90 px block above the stage.

- [ ] **Step 4: Verify at three widths**

```sh
node --test --test-concurrency=1 test/showcase_phase12.test.js test/showcase_phase2.test.js
npm run validate:showcase && npm run typecheck && npm run build && npm run check:build
```

Then walk the tour at 1920×1080, 1280×720 and 375×812. At 375 px: no bracket may clip or overlap,
no part of the model may leave the canvas, and both anchors must be reachable. Add the 375×812
guided cells to the SC-8 capture set if they are not already there, and re-run
`npm run check:matrix`.

- [ ] **Step 5: Commit**

```sh
git add -A && git commit -m "SC-12: enforce the reviewed label budget and fix the narrow stage"
```

### Task 12.2c: A locator for close-ups, in the lane the brackets vacate

> Added in Revision 2. Runs last in this sprint, after 12.2b decides what the bracket lane holds.

**Why.** The band brackets are suppressed when the camera is too close for them to mean anything —
correctly, and it is already observable: chapters 3, 4 and 5 of the shipped tour draw none. The
result is that at exactly the moment a viewer most needs to know where they are, the page tells
them least. Chapter 3 frames a 70 nm PEVK segment, chapter 4 a ~200 nm Z-disc, chapter 5 the
C-zone; each arrives as an unlabelled field with no relationship to the molecule the previous
chapter just introduced. After Task 11.0 makes those close-ups real, the disorientation gets
worse, not better, because the frames actually change.

**This adds no chrome.** The locator occupies the bracket lane and is drawn *only* when the
brackets are not — the two are mutually exclusive by construction, which is also how the gate is
written.

**Files:**
- Modify: `src/presentation/StageLayout.js` (add `locatorExtent`)
- Modify: `src/index.template.html` (`renderScienceOverlay`)
- Test: `test/showcase_phase12.test.js` (extend)

**Interfaces:**
- Produces: `locatorExtent(cameraSpanNm, cameraCentreNm, modelSpanNm) -> { from01, to01, visible }` — pure.

- [ ] **Step 1: Write the failing test**

```js
import { locatorExtent, bracketLaneVisible } from '../src/presentation/StageLayout.js';

test('SC12-2c: the locator and the brackets are never both drawn', () => {
  for (const span of [1100, 800, 400, 200, 70, 20]) {
    const loc = locatorExtent(span, 550, 1100);
    assert.notEqual(loc.visible, bracketLaneVisible(span, 1100),
      `at a ${span} nm camera span exactly one of locator/brackets must hold the lane`);
  }
});

test('SC12-2c: the shaded extent is the camera span, to scale', () => {
  const loc = locatorExtent(220, 110, 1100);
  assert.ok(Math.abs((loc.to01 - loc.from01) - 220 / 1100) < 1e-9);
  assert.ok(Math.abs(loc.from01 - 0) < 1e-9);
});

test('SC12-2c: a view wider than the model clamps instead of overflowing', () => {
  const loc = locatorExtent(4000, 550, 1100);
  assert.equal(loc.from01, 0);
  assert.equal(loc.to01, 1);
});
```

- [ ] **Step 2: Draw it**

A single flat strip the width of the model's projected extent: the half-sarcomere in miniature with
its Z-disc, I-band/A-band boundary and M-band centre marked as ticks, and the current camera span
shaded. One line of type: `viewing 220 nm of 1,100 nm · Z-disc`. Nothing interactive — it is an
orientation aid, not a control, and making it draggable would put a second navigation model on the
stage.

Like the brackets, the scale bar and the continuity trace, it is presentation geometry: declare it
in `data/annotations.json`'s render-meaning text with the others. It moves no coordinate; the tick
positions come from the same canonical records the brackets use, not from new arithmetic.

- [ ] **Step 3: Verify across the tour**

```sh
node --test --test-concurrency=1 test/showcase_phase12.test.js
npm run typecheck && npm run build && npm run check:build
```

Walk chapters 1 → 5. Chapters 1, 2 and 6, 7 keep brackets and show no locator; chapters 3, 4 and 5
show a locator and no brackets; the lane never holds both and never sits empty.

- [ ] **Step 4: Commit**

```sh
git add -A && git commit -m "SC-12: show where a close-up is looking"
```

### Task 12.3: Sprint wiring and contrast records

**Files:**
- Modify: `data/release_gates.json` (`accessibility.contrast_pairs`), `package.json`

- [ ] **Step 1: Add contrast pairs for the new surfaces**

In `data/release_gates.json`, append to `accessibility.contrast_pairs` (keep the existing entries):

```json
{
  "id": "stage_bar_label",
  "foreground": "#98a4b3",
  "background": "#0e1116",
  "min_ratio": 4.5,
  "where": "stage bar control labels over the stage gradient"
},
{
  "id": "stage_readout",
  "foreground": "#e6ebf1",
  "background": "#0e1116",
  "min_ratio": 4.5,
  "where": "sarcomere length readout on the stage bar"
},
{
  "id": "stage_play_active",
  "foreground": "#2a0a13",
  "background": "#ff5d7d",
  "min_ratio": 4.5,
  "where": "active stretch-sweep button"
}
```

Every hex above must appear literally (lowercase) in `src/index.template.html` — `#2a0a13` comes from the `#stagePlay.on` rule added in Task 12.1 Step 5.

- [ ] **Step 2: Add the sprint scripts**

```json
"test:sc12": "node --test --test-concurrency=1 test/showcase_phase12.test.js test/presentation.test.js test/showcase_phase8.test.js test/standalone.test.js",
"verify:sc12": "npm run check:build && npm run typecheck && npm run test:sc12 && npm run validate:gates && npm run validate:presentation",
```

- [ ] **Step 3: Run the gate**

```sh
npm run verify:sc12
```

Expected: PASS. A contrast failure means a hex in the record does not appear in the page — fix the CSS or the record so they agree.

- [ ] **Step 4: Commit**

```sh
git add -A && git commit -m "SC-12: record stage-bar contrast pairs and sprint gate"
```

---

# Sprint SC-13 — The inspector card, the drawer, and sources

**Why:** The pinned card already has the right anatomy (title → evidence chip → lay text → detail → citations) but shows five labelled paragraphs at once, lands on top of the object it describes, and repeats its lay text verbatim in the chapter card (`src/index.template.html:1490-1492`). The drawer opens on two screens of prose — *Selected structure* (an empty heading when nothing is picked), *Current guided claim*, *Expert cards* — with every control below the fold, and the citations sit near the **top**. There is no consolidated bibliography anywhere: 46 records in `data/references.json` are reachable only one claim at a time.

**Done when:** a novice sees two sentences and a small citation line; a specialist expands one disclosure for everything else; the drawer is tabbed with **Sources & build** last.

### Task 13.1: Progressive disclosure and a compact citation line

**Files:**
- Modify: `src/index.template.html:340-352` (markup), `:1389-1405` (`detailBlock`), `:1468-1498` (`renderPinnedSelection`), CSS
- Test: `test/showcase_phase13.test.js` (create)

**Interfaces:**
- Consumes: `inspectorPlacement` from Task 11.1.

- [ ] **Step 1: Write the failing test**

Create `test/showcase_phase13.test.js`:

```js
/** SC-13 gates: reading order, disclosure, and where sources sit. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');

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
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase13.test.js
```

Expected: FAIL — `<details id="objectInspectorDetails"` is missing.

- [ ] **Step 3: Restructure the card markup**

Replace `src/index.template.html:340-352` with:

```html
    <section id="objectInspector" aria-label="Pinned structure explanation" hidden>
      <div class="object-inspector-head">
        <div>
          <div class="object-inspector-title" id="objectInspectorTitle"></div>
          <div class="object-evidence" id="objectInspectorEvidence"></div>
        </div>
        <div class="object-inspector-nav">
          <button id="objectInspectorPrevious" aria-label="Previous structure">&#8249;</button>
          <button id="objectInspectorNext" aria-label="Next structure">&#8250;</button>
          <button id="objectInspectorClose" aria-label="Close pinned structure explanation">Close</button>
        </div>
      </div>
      <div class="object-instance" id="objectInspectorInstance" hidden></div>
      <div class="object-lay" id="objectInspectorLay"></div>
      <details id="objectInspectorDetails">
        <summary class="object-disclosure">For specialists</summary>
        <div class="object-detail" id="objectInspectorDetail"></div>
      </details>
      <div class="object-sources" id="objectInspectorSources"></div>
    </section>
```

- [ ] **Step 4: Update the CSS**

Replace the `.object-sources` rule (line 176) and add the new ones:

```css
  .object-sources { display: flex; gap: 4px 8px; flex-wrap: wrap; margin-top: 8px;
    padding-top: 6px; border-top: 1px solid var(--edge); color: var(--dim); font-size: 9px;
    line-height: 1.5; }
  .object-sources a, #chapterSources a { color: #a9c9f2; text-decoration: underline;
    text-underline-offset: 2px; }
  .object-disclosure { cursor: pointer; color: var(--dim); font-size: 10px; font-weight: 600;
    margin-top: 8px; padding-top: 7px; border-top: 1px solid var(--edge); list-style: none; }
  .object-disclosure::before { content: "▸ "; }
  details[open] > .object-disclosure::before { content: "▾ "; }
  .object-inspector-nav { display: flex; gap: 4px; }
```

- [ ] **Step 5: Render the compact citation line**

In `src/index.template.html`, add this helper beside `sourceLinks` (line 1380) and use it for the card:

```js
/**
 * One muted line rather than a stack of full-width links. The full title stays
 * available on hover and to assistive technology, so compactness costs nothing
 * a reader actually needs.
 */
function sourceLine(sources) {
  const fragment = document.createDocumentFragment();
  fragment.append(document.createTextNode('Sources: '));
  sources.forEach((source, index) => {
    if (index) fragment.append(document.createTextNode(' · '));
    const link = document.createElement('a');
    link.href = source.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.textContent = source.citation; link.title = source.title;
    fragment.append(link);
  });
  return fragment;
}
```

In `renderPinnedSelection` (line 1483), replace:

```js
  $('objectInspectorSources').replaceChildren(...sourceLinks(annotation.sources));
```

with:

```js
  $('objectInspectorSources').replaceChildren(sourceLine(annotation.sources));
  $('objectInspectorDetails').open = state.audienceMode === AUDIENCE_MODES.evidence;
```

And replace lines 1490–1492 with:

```js
  $('guidedSelection').hidden = false;
  $('guidedSelectionLabel').textContent = `Selected: ${annotation.label}`;
  // The full explanation is in the pinned card; repeating it here made the
  // reader parse the same paragraph twice.
  $('guidedSelectionText').textContent = '';
```

- [ ] **Step 6: Use the tested placement function**

In `renderObjectOverlay` (line 1631–1640), replace the placement arithmetic with:

```js
  card.style.left = '0px'; card.style.top = '0px';
  const headerBottom = $('stageHeader').getBoundingClientRect().bottom
    - $('canvas').getBoundingClientRect().top + 8;
  const placed = inspectorPlacement({
    anchor: { x_px: point.x_px, y_px: point.y_px },
    card: { width: card.offsetWidth, height: card.offsetHeight },
    canvas: { width, height },
    safeTopPx: headerBottom,
    gapPx: pinnedPick ? STAGE_LAYOUT.card_gap_px : 14,
  });
  const left = placed.left;
  const top = placed.top;
  card.style.left = `${left}px`; card.style.top = `${top}px`;
```

- [ ] **Step 7: Wire the prev/next buttons**

Add beside the close handler (line 1532):

```js
// The keyboard could already walk the visible structures; the pointer could not.
function stepPinnedSelection(direction) {
  const available = availableAnnotations();
  if (!available.length) return;
  const current = available.findIndex((annotation) => (
    annotation.target_type === pinnedPick?.target_type
      && annotation.target_id === pinnedPick?.target_id
  ));
  const next = available[(current + direction + available.length) % available.length];
  setPinnedSelection({
    target_type: next.target_type,
    target_id: next.target_id,
    sarcomere_length_nm: visualization.currentState().sarcomere_length_nm,
    scale: state.scale,
  });
}
$('objectInspectorPrevious').onclick = () => stepPinnedSelection(-1);
$('objectInspectorNext').onclick = () => stepPinnedSelection(1);
```

- [ ] **Step 8: Run the tests**

```sh
node --test --test-concurrency=1 test/showcase_phase13.test.js test/showcase_phase4.test.js test/showcase_phase8.test.js
npm run typecheck && npm run build && npm run check:build
```

- [ ] **Step 9: Commit**

```sh
git add -A && git commit -m "SC-13: disclose specialist depth and compact the card citations"
```

### Task 13.2: A tabbed drawer with sources last

**Files:**
- Modify: `src/index.template.html` (drawer markup, CSS, tab wiring)
- Test: `test/showcase_phase13.test.js` (extend)

**Interfaces:**
- Produces: DOM ids `drawerTabs`, `tabInspect`, `tabMeasure`, `tabEvidence`, `tabSources`, and panels `panelInspect`, `panelMeasure`, `panelEvidence`, `panelSources`.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase13.test.js`:

```js
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

test('SC13: opening the drawer lands on controls, not on an essay', () => {
  assert.match(page, /state\.drawerTab = 'inspect'/,
    'the default tab must be the one with the controls on it');
  const inspect = page.indexOf('id="panelInspect"');
  const evidence = page.indexOf('id="panelEvidence"');
  assert.ok(inspect < evidence);
  const scales = page.indexOf('id="scales"');
  assert.ok(scales > inspect && scales < evidence, 'the scale control belongs on the Inspect tab');
});

test('SC13: an empty selection hides its heading instead of leaving it dangling', () => {
  assert.match(page, /selectedStructureHeading'\)\.hidden = !annotation/);
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase13.test.js
```

- [ ] **Step 3: Restructure the drawer**

In `src/index.template.html`, immediately after the `.drawer-head` div (line 410), insert the tab list:

```html
    <div id="drawerTabs" role="tablist" aria-label="Evidence drawer sections">
      <button id="tabInspect" role="tab" aria-selected="true" aria-controls="panelInspect">Inspect</button>
      <button id="tabMeasure" role="tab" aria-selected="false" aria-controls="panelMeasure">Measure</button>
      <button id="tabEvidence" role="tab" aria-selected="false" aria-controls="panelEvidence">Evidence</button>
      <button id="tabSources" role="tab" aria-selected="false" aria-controls="panelSources">Sources &amp; build</button>
    </div>
```

Then wrap the existing drawer content in four panels, moving whole blocks without editing their internals:

- `<div id="panelInspect" role="tabpanel" aria-labelledby="tabInspect">` contains: `<h2 id="selectedStructureHeading">Selected structure</h2>` + `#selectedEvidence`, then `Scale`/`#scales`, `Close-up`/`#closeups`/`#closeupReadout`, `Detail`/`#toggles`, `Components`/`#components`/`#componentTargetReadout`, `Titin regions`/`#regions`/`#regionReadout`, `Inspect structures`/`#annotations`.
- `<div id="panelMeasure" role="tabpanel" aria-labelledby="tabMeasure" hidden>` contains: `Sarcomere length` readout block, `Geometry at this length`/`#metrics`, `Lattice cross-section`/`#latticeCrossSection`, `Legend`/`#legend`.
- `<div id="panelEvidence" role="tabpanel" aria-labelledby="tabEvidence" hidden>` contains: `Current guided claim`/`#chapterEvidence`, `Expert cards`/`#expertCards`, `Evidence`/`#evidenceToggle`/`#evidence`, `Not claimed by this render`/`#notClaimed`, `#notes`.
- `<div id="panelSources" role="tabpanel" aria-labelledby="tabSources" hidden>` contains: `How this model was built`/`#provenancePipeline`, a new `<h2>Bibliography</h2>` + `<div id="bibliography"></div>`, and a new `<h2>Cite this view</h2>` + `<button id="copyViewLink">Copy link to this view</button>` + `<div class="sub" id="copyViewStatus" aria-live="polite"></div>`.

Give the `Selected structure` heading the id `selectedStructureHeading` so it can be hidden.

- [ ] **Step 4: Add tab CSS**

```css
  #drawerTabs { display: flex; gap: 4px; position: sticky; top: 74px; z-index: 3;
    margin: 0 -18px 12px; padding: 8px 18px; background: rgb(22 27 34 / 96%);
    border-bottom: 1px solid var(--edge); backdrop-filter: blur(10px); }
  #drawerTabs button { flex: 1 1 auto; }
  #drawerTabs button[aria-selected="true"] { background: var(--accent); color: #0e1116;
    border-color: var(--accent); }
```

- [ ] **Step 5: Wire the tabs**

Add `drawerTab: 'inspect'` to the `state` object literal (line 530), and:

```js
const DRAWER_TABS = [
  ['inspect', 'tabInspect', 'panelInspect'],
  ['measure', 'tabMeasure', 'panelMeasure'],
  ['evidence', 'tabEvidence', 'panelEvidence'],
  ['sources', 'tabSources', 'panelSources'],
];
function syncDrawerTabs() {
  for (const [id, tabId, panelId] of DRAWER_TABS) {
    const selected = state.drawerTab === id;
    $(tabId).setAttribute('aria-selected', String(selected));
    $(panelId).hidden = !selected;
  }
}
for (const [id, tabId] of DRAWER_TABS) {
  $(tabId).onclick = () => { state.drawerTab = id; syncDrawerTabs(); };
}
syncDrawerTabs();
```

In `renderSelectedEvidence` (line 1453), add as the first line after `const box = $('selectedEvidence');`:

```js
  $('selectedStructureHeading').hidden = !annotation;
```

- [ ] **Step 6: Run the tests**

```sh
node --test --test-concurrency=1 test/showcase_phase13.test.js test/presentation.test.js test/showcase_phase8.test.js test/phase10.test.js
npm run typecheck && npm run build && npm run check:build
```

- [ ] **Step 7: Commit**

```sh
git add -A && git commit -m "SC-13: tab the drawer and put sources last"
```

### Task 13.3: The bibliography and "cite this view"

**Files:**
- Create: `src/presentation/Bibliography.js`
- Modify: `src/api/TitinVisualization.js`, `src/index.template.html`, `scripts/build_standalone.mjs`
- Test: `test/showcase_phase13.test.js` (extend)

**Interfaces:**
- Produces: `createBibliography(references, {citedIds})` → `Array<{id, citation, href, title, cited: boolean}>` sorted by citation; `TitinVisualization.prototype.bibliography()` → the same array with `citedIds` taken from the loaded spec.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase13.test.js`:

```js
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { createBibliography } from '../src/presentation/Bibliography.js';

const model = await TitinModel.create(nodeReader());

test('SC13: the bibliography resolves every record in the registry', () => {
  const entries = createBibliography(model.spec.references, { citedIds: ['UniProt:Q8WZ42'] });
  assert.equal(entries.length, Object.keys(model.spec.references).length);
  for (const entry of entries) {
    assert.ok(entry.citation.trim(), `${entry.id} has no citation`);
    assert.ok(/^https?:\/\//.test(entry.href), `${entry.id} has no link`);
    assert.ok(entry.title.trim(), `${entry.id} has no title`);
  }
  assert.equal(entries.find((entry) => entry.id === 'UniProt:Q8WZ42').cited, true);
});

test('SC13: the bibliography is stably ordered', () => {
  const once = createBibliography(model.spec.references, {}).map((entry) => entry.id);
  const twice = createBibliography(model.spec.references, {}).map((entry) => entry.id);
  assert.deepEqual(once, twice);
  assert.deepEqual([...once].sort((a, b) => a.localeCompare(b)).length, once.length);
});

test('SC13: the page can copy a citable link to the current view', () => {
  assert.match(page, /id="copyViewLink"/);
  assert.match(page, /navigator\.clipboard\.writeText/);
  assert.match(page, /__titinBuild\?\.fingerprint/,
    'a citable link must name the build it came from');
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase13.test.js
```

- [ ] **Step 3: Write the module**

Create `src/presentation/Bibliography.js`:

```js
/**
 * SC-13 bibliography.
 *
 * The registry is already the single source of citations; this only groups and
 * orders it for display. Resolution goes through resolveSources so a record that
 * cannot produce a link fails here exactly as it fails everywhere else, rather
 * than rendering a dead entry in a reference list.
 */
import { resolveSources } from './AnnotationCatalog.js';

/**
 * @param {Record<string, any>} references
 * @param {{citedIds?: Array<string>}} [opts]
 * @returns {Array<{id:string, citation:string, href:string, title:string, cited:boolean}>}
 */
export function createBibliography(references, { citedIds = [] } = {}) {
  const ids = Object.keys(references || {}).sort((a, b) => a.localeCompare(b));
  const cited = new Set(citedIds);
  return resolveSources(references, ids)
    .map((source) => ({ ...source, cited: cited.has(source.id) }))
    .sort((a, b) => a.citation.localeCompare(b.citation) || a.id.localeCompare(b.id));
}
```

- [ ] **Step 4: Expose it on the facade**

In `src/api/TitinVisualization.js`, next to `sources()` (line 534), add:

```js
  /**
   * The whole reference registry, ordered for display. `cited` marks the records
   * this build's annotations and chapters actually use, so a reader can tell the
   * working bibliography from the full corpus.
   */
  bibliography() {
    const citedIds = new Set();
    for (const component of this.model.spec.annotations?.components || []) {
      for (const id of component.source_ids || []) citedIds.add(id);
    }
    for (const chapter of this.model.spec.presentation?.guided_chapters || []) {
      for (const id of chapter.source_ids || []) citedIds.add(id);
    }
    return createBibliography(this.model.spec.references, { citedIds: [...citedIds] });
  }
```

and import it at the top of that file:

```js
import { createBibliography } from '../presentation/Bibliography.js';
```

- [ ] **Step 5: Render it and add the copy button**

In `src/index.template.html`, add and call once during setup:

```js
function renderBibliography() {
  const entries = visualization.bibliography();
  $('bibliography').replaceChildren(...entries.map((entry) => {
    const row = document.createElement('div');
    row.className = 'bib-row';
    const link = document.createElement('a');
    link.href = entry.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.textContent = entry.citation;
    const title = document.createElement('span');
    title.className = 'bib-title';
    title.textContent = ` — ${entry.title}`;
    row.append(link, title);
    if (entry.cited) row.dataset.cited = 'true';
    return row;
  }));
}
renderBibliography();

// A screenshot in a talk is only reproducible if the reader can get back to the
// exact state it came from, in the exact build it came from.
$('copyViewLink').onclick = async () => {
  const fingerprint = window.__titinBuild?.fingerprint || 'unpinned development source';
  const text = `${window.location.href}\n(build ${fingerprint})`;
  try {
    await navigator.clipboard.writeText(text);
    $('copyViewStatus').textContent = 'Link and build copied to the clipboard.';
  } catch {
    $('copyViewStatus').textContent = text;
  }
};
```

CSS:

```css
  .bib-row { font-size: 10px; line-height: 1.5; margin-bottom: 5px; color: var(--dim); }
  .bib-row[data-cited="true"] { border-left: 2px solid var(--titin); padding-left: 7px; }
  .bib-title { color: var(--dim); }
```

- [ ] **Step 6: Run the tests**

```sh
node --test --test-concurrency=1 test/showcase_phase13.test.js test/showcase_phase4.test.js
npm run typecheck && npm run build && npm run check:build
```

- [ ] **Step 7: Add the sprint script and commit**

```json
"test:sc13": "node --test --test-concurrency=1 test/showcase_phase13.test.js test/showcase_phase4.test.js test/presentation.test.js test/standalone.test.js",
"verify:sc13": "npm run check:build && npm run typecheck && npm run test:sc13 && npm run validate:annotations && npm run validate:presentation",
```

```sh
npm run verify:sc13 && git add -A && git commit -m "SC-13: add the bibliography and a citable view link"
```

### Task 13.4: Bind the expert cards to the biology they describe

**Why:** `data/presentation.json` already ships **seven** reviewed expert cards, including `n2a_hub_card` (the UN2A core and CARP binding), `kinase_signaling_card` (the kinase domain near the A/M junction), `length_activation_card`, `isoform_diversity_card` and `unresolved_questions_card`. Each binds to an ADMITTED claim in `data/showcase_claims.json`. The content is not missing — it is **unreachable**: seven dense cards render as one stacked wall in a single scrolling column, with no index and no link from the structure each one is about. Selecting the `kinase` region tells you nothing about the kinase card that exists.

**Files:**
- Modify: `data/presentation.json` (add `related_target_ids` to each expert card)
- Modify: `src/presentation/StoryController.js` (validate the new field), `scripts/validate_presentation.py` (mirror the rule)
- Modify: `src/index.template.html` (surface the matching card on selection)
- Test: `test/showcase_phase13.test.js` (extend)

**Interfaces:**
- Produces: expert card field `related_target_ids: string[]` — every entry must be a known component id or titin region id.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase13.test.js`:

```js
import { checkPresentationSpec } from '../src/presentation/StoryController.js';

const specContext = {
  claims: model.spec.showcaseClaims,
  references: model.spec.references,
  sarcomere: model.spec.sarcomere,
  titin: model.spec.titin,
  states: model.spec.states,
  annotations: model.spec.annotations,
};

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
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase13.test.js
```

Expected: FAIL — `related_target_ids` does not exist.

- [ ] **Step 3: Add the field to every card**

In `data/presentation.json`, add `related_target_ids` to each of the seven expert cards. Use only ids that exist in `data/titin.json` → `regions[].id` (`Z1Z2`, `prox_Ig`, `N2A`, `PEVK`, `dist_Ig`, `Aband_super`, `kinase`, `Mline`) or `data/annotations.json` → `components[].target_id` (`titin`, `thick_filament`, `myosin_heads`, `thin_filament`, `thin_filament_twist`, `zdisc`, `alpha_actinin`, `telethonin`, `mline`, `mband_crosslinks`, `mybpc`, `titin_domains`):

```json
"aband_scaffold_card":        ["Aband_super", "thick_filament"]
"mybpc_scope_card":           ["mybpc", "thick_filament"]
"n2a_hub_card":               ["N2A"]
"kinase_signaling_card":      ["kinase", "mline"]
"length_activation_card":     ["mybpc", "thick_filament", "titin"]
"isoform_diversity_card":     ["titin"]
"unresolved_questions_card":  ["titin"]
```

(Write each as a real `"related_target_ids": [...]` member of its card object; the table above is the mapping, not the syntax.)

- [ ] **Step 4: Validate the field in the JS contract**

In `src/presentation/StoryController.js`, inside the `for (const card of presentation.expert_cards || [])` loop (line 260), after the existing `findings` check, add:

```js
    // A card the reader cannot reach from the structure it explains is content
    // that ships but does not arrive. The binding is validated here so a card
    // cannot name a structure the runtime has no way to select.
    if (!Array.isArray(card.related_target_ids) || !card.related_target_ids.length) {
      problems.push(`expert card '${card.id}' must name at least one related target`);
    } else {
      for (const target of card.related_target_ids) {
        if (!componentIds.has(target) && !regionIds.has(target)) {
          problems.push(`expert card '${card.id}' names unknown related target '${target}'`);
        }
      }
    }
```

`componentIds` and `regionIds` are already in scope at that point (they are built at lines 116–127).

- [ ] **Step 5: Mirror the rule in the Python validator**

In `scripts/validate_presentation.py`, in the expert-card section, add the equivalent check so CI and the browser fail closed together:

```python
        targets = card.get("related_target_ids")
        require(isinstance(targets, list) and len(targets) > 0,
                f"expert card '{card.get('id')}' must name at least one related target")
        for target in targets or []:
            require(target in component_ids or target in region_ids,
                    f"expert card '{card.get('id')}' names unknown related target '{target}'")
```

Use whatever the file already calls its component and region id sets; if it does not build them yet, build them the same way the chapter-target check does (`scripts/validate_presentation.py:168`).

- [ ] **Step 6: Surface the card on selection**

In `src/index.template.html`, add to the inspector card markup, between the `<details>` and `.object-sources`:

```html
      <div class="object-expert-link"><button id="objectInspectorExpertLink" hidden></button></div>
```

and add the lookup plus wiring:

```js
/** Expert cards whose declared biology matches a selected structure. */
function relatedExpertCards(targetId) {
  if (!targetId) return [];
  return visualization.expertCards()
    .filter((card) => (card.related_target_ids || []).includes(targetId));
}
```

In `renderPinnedSelection`, after the sources line is set:

```js
  const related = relatedExpertCards(annotation.target_id);
  const expertLink = $('objectInspectorExpertLink');
  expertLink.hidden = related.length === 0;
  if (related.length) {
    expertLink.textContent = `Expert card: ${related[0].title}`;
    expertLink.onclick = () => {
      openEvidence(expertLink);
      state.drawerTab = 'evidence';
      syncDrawerTabs();
      const card = $('expertCards').querySelector(`[data-card="${related[0].id}"]`);
      card?.scrollIntoView({ block: 'center' });
      card?.animate?.(
        [{ outline: '2px solid #ff5d7d' }, { outline: '2px solid transparent' }],
        { duration: 1400 },
      );
    };
  }
```

`renderExpertCards` already stamps `box.dataset.card = card.id` (`src/index.template.html:1416`), so the lookup has something to find, and `expertCards()` spreads the whole record (`src/api/TitinVisualization.js:576` — `...card`), so `related_target_ids` reaches the page with no facade change.

- [ ] **Step 7: Run the tests**

```sh
node --test --test-concurrency=1 test/showcase_phase13.test.js test/showcase_phase5.test.js test/showcase_phase7.test.js test/presentation.test.js
npm run validate:presentation && npm run validate:spec
npm run typecheck && npm run build && npm run check:build
```

Expected: PASS. `showcase_phase5` is the SC-5 expert-card gate; if it enumerates card fields, extend it rather than weakening it.

- [ ] **Step 8: Commit**

```sh
git add -A && git commit -m "SC-13: bind expert cards to the structures they explain"
```

### Task 13.5: Give the provenance chapter the stage

> Added in Revision 2.

**Why.** Chapter 7 is the argument. Everything else on the page can be dismissed as a nice
rendering; the counted pipeline — *46 cited records → 33 sourced parameters → 13 evidence-classified
specifications → 4 structural states → procedural render → negative controls*, each figure counted
from the loaded records at render time so the diagram cannot drift from the data — is the part that
answers *"did an AI just draw something convincing?"* with *"no, and here is the audit trail."*
The plan's own SC-7 section says the message is **"AI helped build and audit a reproducible model
whose claims remain tied to evidence."**

It is currently rendered as a scrolling box inside the chapter card:
`#guidedLattice, #guidedPipeline { max-height: 38vh; overflow-y: auto }`
(`src/index.template.html:277`), with `.pipeline-label` at 10 px, `.pipeline-detail` at 9 px and
`.pipeline-records` at **8 px** (`:268-271`). Six stages in a ~300 px column means the viewer sees
two and a half of them and has to scroll a card to reach the rest — during the part of a talk where
the presenter is making the credibility claim. On a projector, 8 px is not readable at all, and
`release/PREFLIGHT.md` includes a projector rehearsal.

The content is finished and correct. This is a layout task.

**Files:**
- Modify: `src/index.template.html` (`renderProvenancePipeline` `:915`, `.pipeline-*` rules `:263-273`, chapter-7 layout)
- Test: `test/showcase_phase13.test.js` (extend)

- [ ] **Step 1: Lay the pipeline across the stage, not down the card**

When the active chapter is `provenance_pipeline`, the six stages render as a **horizontal band
across the full stage width** — six columns, each with its stage name, its counted figure at
display size, and its one-line detail — with the 3-D scene dimmed behind it rather than competing.
No inner scroll region at any supported width: six columns at 1280 px is ~200 px each, which is
ample for a two-word label and a number. Below the narrow breakpoint (Task 12.2b) it becomes two
rows of three.

The chapter card keeps the chapter title, the takeaway sentence and the navigation, exactly as
every other chapter does. It stops being a container for the diagram.

- [ ] **Step 2: Set the type at presentation size**

The counted figure is the payload — it carries at the size a headline would. Stage names one step
down, details one step below that, and the `data/*.json` record names (`.pipeline-records`) at the
smallest step but not below the presentation scale's floor from Task 17.1. Delete the 8 px rule;
if a record list will not fit at the floor size, truncate the list and put the remainder in the
Sources & build tab (Task 13.3), which is where a reader who wants file names is already going.

- [ ] **Step 3: Keep the counting honest**

`src/presentation/ProvenancePipeline.js` counts from the loaded records at render time. This task
must not introduce a single hand-written figure into the new layout — every number still comes
from that module. Extend `test/showcase_phase13.test.js`:

```js
test('SC13-5: no pipeline figure is written into the page', () => {
  const template = readFileSync('src/index.template.html', 'utf8');
  const stages = visualization.provenancePipeline().stages;
  for (const stage of stages) {
    assert.ok(!template.includes(`>${stage.count}<`),
      `the count for '${stage.id}' appears literally in the template; it must be counted, not typed`);
  }
});
```

- [ ] **Step 4: Verify on a projector-shaped frame**

```sh
node --test --test-concurrency=1 test/showcase_phase13.test.js test/showcase_phase7.test.js
npm run typecheck && npm run build && npm run check:build
```

At 1920×1080, all six stages must be visible at once with no scrolling, and every figure legible
from across a room. Re-run `npm run check:matrix` — chapter 7's cells change.

- [ ] **Step 5: Commit**

```sh
git add -A && git commit -m "SC-13: render the provenance pipeline across the stage"
```

---

# Sprint SC-14 — Passive force: the expert payload

**Why:** `src/geometry/MechanicalModel.js` solves a Marko–Siggia WLC / extensible-WLC **series force balance** with persistence lengths taken from primary sources and **no fitted parameters**, validated in `data/mechanical_model.json` against published PEVK forces to ±0.5 pN. `GeometryEngine.geometryAt()` already returns `titin_chain_force_pN` at every sarcomere length (`src/geometry/GeometryEngine.js:166`), and the page already has that object in `render()` (`const g = model.geometryAt(requestedSL)`). **Nothing in the UI reads it.** Titin's biomechanical role is force; this sprint puts it on screen at the cost of one module and a small SVG.

Measured cost: 33 samples of `geometryAt` take ≈ 51 ms, so the curve is built once and memoised; only the current-length marker moves.

**Done when:** the stage bar shows the live passive force with its evidence class, and the Measure tab shows the force–extension curve with the four regional compliance shares.

### Task 14.1: The ForceCurve module

**Files:**
- Create: `src/presentation/ForceCurve.js`
- Test: `test/showcase_phase14.test.js` (create)

**Interfaces:**
- Produces: `FORCE_CURVE` (frozen metadata) and `createForceCurve(model, {samples, currentLengthNm})` returning:

```js
{
  points: Array<{sarcomere_length_nm: number, force_pN: number, iband_total_nm: number}>,
  current: {sarcomere_length_nm: number, force_pN: number, shares: Record<string, number>} | null,
  axes: {x: {label: string, min: number, max: number}, y: {label: string, min: number, max: number}},
  evidence_class: 'MODELED',
  claim_id: 'regional_extension_story',
  source_ids: Array<string>,
  not_claimed: Array<string>,
  basis: string,
}
```

- [ ] **Step 1: Write the failing test**

Create `test/showcase_phase14.test.js`:

```js
/** SC-14 gates: the passive force model reaches the screen without changing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { MechanicalModel } from '../src/geometry/MechanicalModel.js';
import { createForceCurve, FORCE_CURVE } from '../src/presentation/ForceCurve.js';

const model = await TitinModel.create(nodeReader());
const report = JSON.parse(readFileSync(new URL('../data/mechanical_model.json', import.meta.url), 'utf8'));

test('SC14: the curve is sampled from the same pipeline the render uses', () => {
  const curve = createForceCurve(model, { currentLengthNm: 2200 });
  assert.ok(curve.points.length >= 25);
  for (const point of curve.points) {
    const geometry = model.geometryAt(point.sarcomere_length_nm);
    assert.equal(point.force_pN, geometry.titin_chain_force_pN);
    assert.equal(point.iband_total_nm, geometry.titin_iband_total_nm);
  }
});

test('SC14: passive force rises monotonically with sarcomere length', () => {
  const curve = createForceCurve(model, {});
  for (let i = 1; i < curve.points.length; i += 1) {
    assert.ok(curve.points[i].force_pN > curve.points[i - 1].force_pN,
      `force fell between ${curve.points[i - 1].sarcomere_length_nm} and ${curve.points[i].sarcomere_length_nm} nm`);
  }
});

test('SC14: the displayed force agrees with the reviewed per-state report', () => {
  for (const [name, state] of Object.entries(report.per_state)) {
    const geometry = model.geometryAt(state.sarcomere_length_nm);
    assert.ok(Math.abs(geometry.titin_chain_force_pN - state.model_force_pN) < 1e-3,
      `${name}: ${geometry.titin_chain_force_pN} pN vs reported ${state.model_force_pN} pN`);
  }
});

test('SC14: compliance shares sum to one and name the recruitment order', () => {
  const curve = createForceCurve(model, { currentLengthNm: 2400 });
  const shares = Object.values(curve.current.shares);
  assert.ok(Math.abs(shares.reduce((a, b) => a + b, 0) - 1) < 1e-6);
  const mechanical = new MechanicalModel(model.spec.titin);
  const geometry = model.geometryAt(2400);
  const expected = mechanical.complianceShares(geometry.titin_chain_force_pN).share;
  for (const [id, value] of Object.entries(expected)) {
    assert.ok(Math.abs(curve.current.shares[id] - value) < 1e-9, `${id} disagrees`);
  }
  // At the top of the working range PEVK is the dominant compliance.
  const ranked = Object.entries(curve.current.shares).sort((a, b) => b[1] - a[1]);
  assert.equal(ranked[0][0], 'PEVK');
});

test('SC14: the curve carries evidence metadata it cannot silently drop', () => {
  const curve = createForceCurve(model, {});
  assert.equal(curve.evidence_class, 'MODELED');
  assert.ok(curve.not_claimed.length >= 2);
  for (const id of curve.source_ids) {
    assert.ok(model.spec.references[id], `unresolved source '${id}'`);
  }
  assert.ok(model.spec.showcaseClaims.objects.some((claim) => claim.id === FORCE_CURVE.claim_id),
    'the curve must bind to an existing reviewed claim');
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase14.test.js
```

- [ ] **Step 3: Write the module**

Create `src/presentation/ForceCurve.js`:

```js
/**
 * SC-14 passive force–extension curve.
 *
 * This module SAMPLES the existing pipeline; it does not re-derive anything. The
 * force comes from GeometryEngine, which gets it from MechanicalModel's series
 * force balance, whose parameters are sourced and unfitted. A second
 * implementation here would be a second thing to keep in agreement with the
 * science, so there isn't one.
 *
 * Sampling cost: ~1.5 ms per point, so the curve is built once per range and
 * memoised. The current-length marker uses the force the render already has.
 */
import { MechanicalModel } from '../geometry/MechanicalModel.js';

export const FORCE_CURVE = Object.freeze({
  samples: 33,
  evidence_class: 'MODELED',
  claim_id: 'regional_extension_story',
  source_ids: Object.freeze(['10.1073/pnas.95.14.8052', '10.1083/jcb.140.4.853']),
  not_claimed: Object.freeze([
    'a measured single-molecule force trace for this sarcomere',
    'total passive muscle tension, which includes non-titin contributions',
    'any active or calcium-dependent force',
  ]),
  basis: 'series force balance over sourced force-extension laws; '
    + 'one common force across the four I-band regions',
});

/** @type {Map<string, any>} */
const memo = new Map();

/**
 * @param {any} model  a loaded TitinModel
 * @param {{samples?: number, currentLengthNm?: number|null}} [opts]
 */
export function createForceCurve(model, { samples = FORCE_CURVE.samples, currentLengthNm = null } = {}) {
  if (!Number.isInteger(samples) || samples < 5) {
    throw new Error(`createForceCurve: samples must be an integer >= 5, got ${samples}`);
  }
  const { min, max } = model.slRange();
  const key = `${min}:${max}:${samples}`;
  let points = memo.get(key);
  if (!points) {
    points = [];
    for (let i = 0; i < samples; i += 1) {
      const sl = Math.round(min + ((max - min) * i) / (samples - 1));
      const geometry = model.geometryAt(sl);
      points.push(Object.freeze({
        sarcomere_length_nm: geometry.sarcomere_length_nm,
        force_pN: geometry.titin_chain_force_pN,
        iband_total_nm: geometry.titin_iband_total_nm,
      }));
    }
    Object.freeze(points);
    memo.set(key, points);
  }

  let current = null;
  if (Number.isFinite(currentLengthNm)) {
    const geometry = model.geometryAt(currentLengthNm);
    const mechanical = new MechanicalModel(model.spec.titin);
    current = Object.freeze({
      sarcomere_length_nm: geometry.sarcomere_length_nm,
      force_pN: geometry.titin_chain_force_pN,
      shares: Object.freeze({ ...mechanical.complianceShares(geometry.titin_chain_force_pN).share }),
    });
  }

  return Object.freeze({
    points,
    current,
    axes: Object.freeze({
      x: Object.freeze({ label: 'sarcomere length (nm)', min: points[0].sarcomere_length_nm, max: points.at(-1).sarcomere_length_nm }),
      y: Object.freeze({ label: 'passive force per titin (pN)', min: 0, max: points.at(-1).force_pN }),
    }),
    evidence_class: FORCE_CURVE.evidence_class,
    claim_id: FORCE_CURVE.claim_id,
    source_ids: FORCE_CURVE.source_ids,
    not_claimed: FORCE_CURVE.not_claimed,
    basis: FORCE_CURVE.basis,
  });
}
```

- [ ] **Step 4: Run the tests**

```sh
node --test --test-concurrency=1 test/showcase_phase14.test.js
npm run typecheck
```

Expected: PASS (5 tests). If the monotonicity test fails at the lowest lengths, the range `min` is below the shortest keyframe — that is a real finding; report it rather than loosening the assertion.

- [ ] **Step 5: Commit**

```sh
git add src/presentation/ForceCurve.js test/showcase_phase14.test.js
git commit -m "SC-14: sample the passive force-extension curve from the existing pipeline"
```

### Task 14.2: The force readout and curve in the page

**Files:**
- Modify: `src/api/TitinVisualization.js`, `src/index.template.html`, `scripts/build_standalone.mjs`
- Test: `test/showcase_phase14.test.js` (extend)

**Interfaces:**
- Produces: `TitinVisualization.prototype.forceCurve(opts)` delegating to `createForceCurve`; DOM ids `stageForce`, `forceCurve`.

- [ ] **Step 1: Write the failing test**

Append to `test/showcase_phase14.test.js`:

```js
const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const builder = readFileSync(new URL('../scripts/build_standalone.mjs', import.meta.url), 'utf8');

test('SC14: the stage shows live passive force with its evidence class', () => {
  assert.match(page, /id="stageForce"/);
  assert.match(page, /titin_chain_force_pN/);
  assert.match(page, /MODELED/);
});

test('SC14: the Measure tab draws the curve with labelled axes and units', () => {
  assert.match(page, /id="forceCurve"/);
  assert.match(page, /function renderForceCurve/);
  assert.match(page, /axes\.x\.label/);
  assert.match(page, /axes\.y\.label/);
});

test('SC14: the curve panel states what it does not claim', () => {
  assert.match(page, /curve\.not_claimed/);
});

test('SC14: new bundle bindings are re-exported by the standalone builder', () => {
  for (const name of ['createForceCurve']) {
    if (page.includes(name)) {
      assert.ok(builder.includes(name) || page.includes('visualization.forceCurve'),
        `${name} must reach the standalone bundle`);
    }
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase14.test.js
```

- [ ] **Step 3: Add the facade method**

In `src/api/TitinVisualization.js`, next to `latticeCrossSection()` (line 554), add:

```js
  /**
   * SC-14 passive force–extension curve for the loaded model. Sampling is
   * memoised inside the module, so calling this per length change is cheap.
   * @param {{samples?: number, currentLengthNm?: number|null}} [opts]
   */
  forceCurve(opts = {}) {
    return createForceCurve(this.model, {
      currentLengthNm: this._state?.sarcomere_length_nm ?? null,
      ...opts,
    });
  }
```

and import it at the top:

```js
import { createForceCurve } from '../presentation/ForceCurve.js';
```

Using the facade means the **page imports nothing new**, so `scripts/build_standalone.mjs` needs no change for this task.

- [ ] **Step 4: Add the stage readout**

In the stage bar's secondary row (Task 12.1), before `#stageLegend`, add:

```html
          <div id="stageForce" title="Passive force carried by one titin molecule at this length"></div>
```

CSS:

```css
  #stageForce { color: #ffd7e0; font-size: 10px; font-variant-numeric: tabular-nums; }
  #stageForce b { color: var(--text); font-size: 13px; font-weight: 650; }
  #stageForce .force-class { color: #e8c16d; font-size: 8px; font-weight: 700;
    letter-spacing: .05em; }
```

In `render(report)`, after `syncStageLegend(report);`, add:

```js
  // Titin's biomechanical role is force. The number is already computed at every
  // length by the series force balance; showing it costs nothing and is the one
  // quantity a muscle mechanics audience will look for first.
  const forceEl = $('stageForce');
  forceEl.replaceChildren();
  if (Number.isFinite(g.titin_chain_force_pN)) {
    const value = document.createElement('b');
    value.textContent = `${g.titin_chain_force_pN.toFixed(2)} pN`;
    const label = document.createElement('span');
    label.textContent = ' passive force / titin ';
    const cls = document.createElement('span');
    cls.className = 'force-class';
    cls.textContent = 'MODELED';
    forceEl.append(value, label, cls);
  }
```

- [ ] **Step 5: Draw the curve on the Measure tab**

Add `<h2>Passive force</h2>` + `<div id="forceCurve"></div>` to `#panelMeasure`, and this renderer:

```js
/**
 * SC-14 force–extension curve.
 *
 * Plain SVG in data coordinates with one linear map, so the shape on screen is
 * the shape in the numbers. The y axis starts at zero: a force plot with a
 * suppressed origin exaggerates every difference on it.
 */
function renderForceCurve() {
  const curve = visualization.forceCurve();
  const W = 300; const H = 150; const PAD = { l: 38, r: 8, t: 8, b: 26 };
  const x = (nm) => PAD.l + ((nm - curve.axes.x.min) / (curve.axes.x.max - curve.axes.x.min))
    * (W - PAD.l - PAD.r);
  const y = (pN) => H - PAD.b - (pN / curve.axes.y.max) * (H - PAD.t - PAD.b);
  const svg = svgElement('svg', {
    viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Passive force per titin molecule against sarcomere length. `
      + `${curve.current ? `At ${curve.current.sarcomere_length_nm} nm the model force is `
        + `${curve.current.force_pN.toFixed(2)} piconewtons.` : ''}`,
  });
  const nodes = [
    svgElement('path', {
      d: `M ${PAD.l} ${PAD.t} V ${H - PAD.b} H ${W - PAD.r}`,
      fill: 'none', stroke: '#3f4b5a', 'stroke-width': 1,
    }),
    svgElement('path', {
      d: curve.points.map((point, index) => `${index ? 'L' : 'M'} `
        + `${x(point.sarcomere_length_nm).toFixed(2)} ${y(point.force_pN).toFixed(2)}`).join(' '),
      fill: 'none', stroke: hex(COMPONENT_COLOR.titin), 'stroke-width': 1.8,
    }),
    svgElement('text', { x: W / 2, y: H - 4, 'text-anchor': 'middle', fill: '#98a4b3', 'font-size': 9 },
      curve.axes.x.label),
    svgElement('text', {
      x: 10, y: H / 2, 'text-anchor': 'middle', fill: '#98a4b3', 'font-size': 9,
      transform: `rotate(-90 10 ${H / 2})`,
    }, curve.axes.y.label),
  ];
  if (curve.current) {
    nodes.push(svgElement('circle', {
      cx: x(curve.current.sarcomere_length_nm), cy: y(curve.current.force_pN), r: 3.5,
      fill: hex(COMPONENT_COLOR.titin_highlight), stroke: '#0e1116', 'stroke-width': 1.5,
    }));
  }
  svg.replaceChildren(...nodes);

  const shares = document.createElement('div');
  shares.className = 'sub';
  if (curve.current) {
    const ranked = Object.entries(curve.current.shares).sort((a, b) => b[1] - a[1]);
    shares.textContent = 'Compliance share at this length: '
      + ranked.map(([id, value]) => `${id} ${(value * 100).toFixed(0)}%`).join(' · ');
  }
  const caveat = document.createElement('div');
  caveat.className = 'lattice-caveat';
  caveat.textContent = `${curve.evidence_class} · ${curve.basis}. `
    + `Not claimed: ${curve.not_claimed.join('; ')}.`;
  $('forceCurve').replaceChildren(svg, shares, caveat);
}
```

Call `renderForceCurve();` from `render(report)` immediately after `renderLatticeCrossSection();`.

- [ ] **Step 6: Add the force line to the guided extension chart**

In `renderExtensionChart`, replace line 843 exactly:

```js
  $('extensionTotal').textContent = `${chart.total_nm.toFixed(1)} nm total · ${chart.evidence_class}`;
```

with:

```js
  // The chart says the regions share out one extension; naming the force they
  // share makes "series force balance" a visible statement rather than a phrase
  // in the evidence class.
  const chainForce = model.geometryAt(Number(slider.value)).titin_chain_force_pN;
  $('extensionTotal').textContent = `${chart.total_nm.toFixed(1)} nm total · ${chart.evidence_class}`
    + (Number.isFinite(chainForce) ? ` · ${chainForce.toFixed(2)} pN common force` : '');
```

- [ ] **Step 7: Run the tests and look**

```sh
node --test --test-concurrency=1 test/showcase_phase14.test.js test/phase8.test.js test/showcase_phase8.test.js
npm run typecheck && npm run build && npm run check:build
open "index.html#mode=evidence&step=elastic_regions&sl=2400&scale=detail&camera=region.PEVK&target=PEVK&evidence=1"
```

Confirm: the Measure tab shows a rising curve with the marker at 2,400 nm and PEVK carrying ~62 % of the compliance.

- [ ] **Step 8: Add the sprint script and commit**

```json
"test:sc14": "node --test --test-concurrency=1 test/showcase_phase14.test.js test/phase8.test.js test/standalone.test.js",
"verify:sc14": "npm run check:build && npm run typecheck && npm run test:sc14 && npm run validate:spec && npm run validate:showcase",
```

```sh
npm run verify:sc14 && git add -A && git commit -m "SC-14: surface passive force and the compliance split"
```

---

# Sprint SC-15 — Make the mechanism visible

**Why:** Chapter 3's chart says *folded domains straighten · disordered chain extends*, and the 3-D view shows a smooth pipe at every length. Chapter 2 claims alternating Ig/Fn3 domains and renders a bare line. The claims are true; the picture does not carry them.

**Scientific guardrail for this sprint:** the disordered-chain depiction is **SCHEMATIC** and must say so. It may not move a single canonical axial coordinate: region start/end X values, domain positions, and the I-band partition all stay exactly as the geometry produced them. Only transverse (y, z) display detail is added, and only between the fixed endpoints.

**Done when:** stretching visibly straightens a coil and separates domain beads, `npm run verify` still passes, and the geometry fingerprint is unchanged.

### Task 15.1: A coil depiction for the disordered regions

**Files:**
- Modify: `src/render/SarcomereScene.js` (`_titinRegionPath` consumers), `src/geometry/TitinRepresentation.js` if the path is built there
- Test: `test/showcase_phase15.test.js` (create)

**Interfaces:**
- Produces: `coilPath(points, {amplitudeNm, turns})` — a private scene helper; and manifest field `manifest.disordered_depiction` — `{regions: string[], evidence_class: 'SCHEMATIC', amplitude_nm: number, meaning: string}`.

- [ ] **Step 1: Write the failing test**

Create `test/showcase_phase15.test.js`:

```js
/** SC-15 gates: the mechanism is visible and still says what it is. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { SarcomereScene } from '../src/render/SarcomereScene.js';

const model = await TitinModel.create(nodeReader());

function build(sl) {
  const scene = new SarcomereScene();
  scene.build(model, {
    sl, showLattice: true, showFilamentContext: true,
    presentationMode: 'guided', mirror: false, showDomains: true,
  });
  return scene;
}

test('SC15: the disordered regions are drawn as a coil and declared schematic', () => {
  const scene = build(2200);
  assert.deepEqual([...scene.manifest.disordered_depiction.regions].sort(), ['N2A', 'PEVK']);
  assert.equal(scene.manifest.disordered_depiction.evidence_class, 'SCHEMATIC');
  assert.ok(scene.manifest.disordered_depiction.meaning.includes('not a measured conformation'));
  scene.clear();
});

test('SC15: coiling never moves a canonical axial coordinate', () => {
  const geometry = model.geometryAt(2200);
  const scene = build(2200);
  const layout = geometry.titin_iband_layout_nm;
  scene.root.traverse((object) => {
    const region = object.userData?.titin_region;
    if (!region || !layout[region]) return;
    const range = object.userData.axial_range_nm;
    if (!range) return;
    assert.ok(Math.abs(range[0] - layout[region].X_start) < 1e-6,
      `${region} start moved: ${range[0]} vs ${layout[region].X_start}`);
    assert.ok(Math.abs(range[1] - layout[region].X_end) < 1e-6,
      `${region} end moved: ${range[1]} vs ${layout[region].X_end}`);
  });
  scene.clear();
});

test('SC15: stretching straightens the coil', () => {
  const short = build(2000);
  const long = build(2400);
  assert.ok(long.manifest.disordered_depiction.amplitude_nm
    < short.manifest.disordered_depiction.amplitude_nm,
  'a chain closer to its contour length must look straighter');
  short.clear(); long.clear();
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase15.test.js
```

- [ ] **Step 3: Add the coil helper**

In `src/render/SarcomereScene.js`, add near `_titinTube`:

```js
  /**
   * SC-15 disordered-chain depiction.
   *
   * A transverse sinusoid between two FIXED endpoints. The amplitude falls as the
   * region approaches its contour length, which is the visual statement "this part
   * is being pulled straight" — the one thing the extension chart asserts and the
   * render never showed. It is SCHEMATIC: no measured conformation exists to draw,
   * and the endpoints, which are canonical, never move.
   *
   * @param {Array<{x:number,y?:number,z?:number}>} points  canonical path points
   * @param {{amplitudeNm:number, turns:number}} opts
   * @returns {Array<{x:number,y:number,z:number}>}
   */
  _coilPath(points, { amplitudeNm, turns }) {
    if (points.length < 2 || amplitudeNm <= 0) return points.map((p) => ({ x: p.x, y: p.y ?? 0, z: p.z ?? 0 }));
    const first = points[0];
    const last = points[points.length - 1];
    const span = last.x - first.x;
    if (!(span > 0)) return points.map((p) => ({ x: p.x, y: p.y ?? 0, z: p.z ?? 0 }));
    const SAMPLES = 48;
    const out = [];
    for (let i = 0; i <= SAMPLES; i += 1) {
      const t = i / SAMPLES;
      const x = first.x + span * t;
      const baseY = (first.y ?? 0) + ((last.y ?? 0) - (first.y ?? 0)) * t;
      const baseZ = (first.z ?? 0) + ((last.z ?? 0) - (first.z ?? 0)) * t;
      // A raised-cosine envelope pins the ends exactly on the canonical endpoints.
      const envelope = 0.5 * (1 - Math.cos(2 * Math.PI * t));
      const phase = 2 * Math.PI * turns * t;
      out.push({
        x,
        y: baseY + amplitudeNm * envelope * Math.sin(phase),
        z: baseZ + amplitudeNm * envelope * Math.cos(phase) * 0.6,
      });
    }
    return out;
  }
```

- [ ] **Step 4: Use it for N2A and PEVK**

In `build()`, inside the `for (const segment of titinPath.segments)` loop (around `:972-992`), compute the amplitude from how close the region is to its contour length and pass the coiled path to `_titinTube`:

```js
          const disordered = ['N2A', 'PEVK'].includes(segment.region_id);
          const canonicalPath = this._titinRegionPath(domains, segment, off, aBandStart);
          let path = canonicalPath;
          let amplitudeNm = 0;
          if (disordered) {
            // `max_end2end_nm` is the field MechanicalModel reads as the contour
            // length (`Lc_from_spec`). There is no `contour_length_nm` key in
            // titin.json — using one would silently fall back to zero amplitude.
            const contour = descriptor?.extension_model?.max_end2end_nm
              || (segment.X_end - segment.X_start);
            const fraction = Math.min(1, (segment.X_end - segment.X_start) / contour);
            // Slack chain -> visible coil; near contour -> effectively straight.
            amplitudeNm = titinRadius * 2.6 * (1 - fraction);
            if (amplitudeNm > 0.05) {
              path = this._coilPath(canonicalPath, { amplitudeNm, turns: 6 });
            }
            disorderedAmplitudeNm = Math.max(disorderedAmplitudeNm, amplitudeNm);
          }
          const tube = this._titinTube(
            path,
            titinRadius * renderRadiusScale, COMPONENT_COLOR.titin, evidence,
            `titin_region_${segment.region_id}_strand_${off.strand_index}`,
            undefined,
            [segment.X_start, segment.X_end],
          );
          tube.userData.axial_range_nm = [segment.X_start, segment.X_end];
          tube.userData.disordered_depiction = disordered ? 'schematic coil' : null;
```

Declare `let disorderedAmplitudeNm = 0;` before the strand loop.

- [ ] **Step 5: Record it in the manifest**

Add to the manifest object:

```js
      disordered_depiction: {
        regions: ['N2A', 'PEVK'],
        evidence_class: 'SCHEMATIC',
        amplitude_nm: Number(disorderedAmplitudeNm.toFixed(4)),
        meaning: 'transverse coil amplitude encodes how far the region is from its '
          + 'contour length; it is a depiction of disorder, not a measured conformation',
      },
```

- [ ] **Step 6: Verify nothing canonical moved**

```sh
node --test --test-concurrency=1 test/showcase_phase15.test.js
node scripts/check_chain_continuity.mjs
node scripts/geometry_fingerprint.mjs
npm run validate && npm run validate:spec
```

Expected: PASS, and the geometry fingerprint must be **unchanged** from before this task. If it changed, the coil moved a canonical coordinate — revert Step 4 and re-derive the path from `segment.X_start`/`X_end` only.

- [ ] **Step 7: Add the annotation copy**

In `data/annotations.json`, extend `component-titin`'s `render_meaning` so the depiction is described where a reader clicks it:

```
"render_meaning": "Pink region-linked tubes and the thin continuity trace identify one continuous titin path; the coiled depiction of N2A and PEVK is a schematic statement of disorder and slack, not a measured conformation; tube width and unresolved transverse routing are not molecular dimensions.",
```

and append to its `not_claimed`: `"a measured conformation for the disordered segments"`.

- [ ] **Step 8: Run the annotation validator and commit**

```sh
npm run validate:annotations && npm run build && npm run check:build
node --test --test-concurrency=1 test/showcase_phase4.test.js test/showcase_phase15.test.js
git add -A && git commit -m "SC-15: depict disordered chain slack and declare it schematic"
```

### Task 15.2: Domains visible where the chapter claims them

**Files:**
- Modify: `data/presentation.json` (chapter camera for `architecture`), `src/index.template.html`
- Test: `test/showcase_phase15.test.js` (extend)

- [ ] **Step 1: Write the failing test**

```js
test('SC15: the architecture chapter frames a span where domains resolve', () => {
  const chapter = model.spec.presentation.guided_chapters
    .find((entry) => entry.id === 'architecture');
  assert.equal(chapter.recommended_state.visibility.show_domains, true);
  assert.ok(chapter.recommended_state.camera_preset.startsWith('region.'),
    'a whole-half-sarcomere framing cannot resolve a 4 nm domain');
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase15.test.js
```

- [ ] **Step 3: Retarget the chapter camera**

In `data/presentation.json`, in the `architecture` chapter, change `recommended_state.camera_preset` from `"view.titin_story"` to `"region.prox_Ig"`, and set `target.id` and `recommended_state.selected_component_or_region` consistently. Keep `"titin_domains"` selected if the chapter's `target.kind` is `component`; the StoryController validates that the target exists at the chosen scale, so run the validators immediately.

- [ ] **Step 4: Validate the presentation contract**

```sh
npm run validate:presentation && npm run validate:spec
node --test --test-concurrency=1 test/showcase_phase7.test.js test/presentation.test.js test/showcase_phase15.test.js
```

If `StoryController` rejects the state, the message names the exact rule; fix the record rather than the controller.

- [ ] **Step 5: Regenerate the capture matrix and commit**

```sh
node scripts/capture_visual_matrix.mjs --check
npm run build && npm run check:build
npm run pack
git add -A && git commit -m "SC-15: frame the architecture chapter where domains resolve"
```

- [ ] **Step 6: Add the sprint script**

```json
"test:sc15": "node --test --test-concurrency=1 test/showcase_phase15.test.js test/showcase_phase7.test.js test/phase7.test.js test/standalone.test.js",
"verify:sc15": "npm run check:build && npm run typecheck && npm run test:sc15 && npm run validate && npm run validate:spec && npm run validate:presentation && npm run validate:annotations && npm run check:matrix",
```

```sh
npm run verify:sc15 && git add package.json && git commit -m "SC-15: add sprint gate"
```

---

# Sprint SC-16 — The anchor close-up

**Why:** Chapter 4 claims two titin N-termini clamp a telethonin molecule. At the `zdisc` close-up the Z-disc envelope — 50 nm wide and *lattice-wide* laterally (`data/sarcomere.json`) — fills the frame at ~7 px/nm and hides the topology the chapter exists to show. `data/annotations.json` already promises the slab "becomes visually subordinate" in the close-up; the render does not do it.

**Done when:** at the Z-disc and M-band close-ups the envelope is a ghost and telethonin, α-actinin and the two opposing titin directions are legible.

> **Revision 2 amendment — this sprint depends on Task 11.0.**
>
> Two corrections from driving the shipped build:
>
> 1. **The guided route does not reach `closeup.zdisc`.** Chapter 4 declares that camera and the
>    page discards it (Task 11.0(a)), so as written this sprint would ghost an envelope in a frame
>    no visitor sees. **Do not start SC-16 before Task 11.0 lands.** Step 5's verification below is
>    amended to walk the tour instead of typing a hash.
> 2. **At the close-up the envelope is opaque, not translucent.** With the context-detail layer on
>    it renders as a solid grey box that hides the twisted antiparallel actin and the α-actinin
>    connectors completely — the topology is *drawn and invisible*, not merely dimmed. The
>    prescribed `opacity 0.14` + `depthWrite: false` is therefore right and the test's
>    `envelopeOpacity(scene) > 0.5` for the overview is correct; just do not read that overview
>    assertion as evidence that the close-up starts from a translucent state.
>
> One addition to Step 3: also clear `depthWrite` on any lattice-guide geometry inside the
> close-up span, for the same reason — an occluder is an occluder regardless of which record it
> came from. Its evidence class is untouched.

### Task 16.1: Ghost the envelope when its own detail is drawn

**Files:**
- Modify: `src/render/SarcomereScene.js` (Z-disc mesh creation and the anchor-detail branch at `:1019-1060`)
- Test: `test/showcase_phase16.test.js` (create)

**Interfaces:**
- Produces: manifest field `manifest.anchor_detail.envelope_ghosted: boolean`.

- [ ] **Step 1: Write the failing test**

Create `test/showcase_phase16.test.js`:

```js
/** SC-16 gates: the anchor close-up shows the anchor. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
import { SarcomereScene } from '../src/render/SarcomereScene.js';

const model = await TitinModel.create(nodeReader());

function build(anchorDetail) {
  const scene = new SarcomereScene();
  scene.build(model, {
    sl: 2200, showLattice: true, showFilamentContext: true,
    presentationMode: 'guided', mirror: true, anchorDetail,
    viewWidthNm: 200,
  });
  return scene;
}

const envelopeOpacity = (scene) => {
  let opacity = null;
  scene.root.traverse((object) => {
    if (object.name === 'zdisc' && object.material) opacity = object.material.opacity;
  });
  return opacity;
};

test('SC16: the Z-disc envelope stays solid in the overview', () => {
  const scene = build(null);
  assert.ok(envelopeOpacity(scene) > 0.5, 'the overview envelope must still read as a boundary');
  scene.clear();
});

test('SC16: the envelope ghosts when its own detail is drawn', () => {
  const scene = build('zdisc');
  assert.equal(scene.manifest.anchor_detail.envelope_ghosted, true);
  assert.ok(envelopeOpacity(scene) <= 0.18,
    'a lattice-wide slab at close range hides the topology the close-up exists to show');
  scene.clear();
});

test('SC16: ghosting is a visibility choice, not an evidence downgrade', () => {
  const scene = build('zdisc');
  let evidence = null;
  scene.root.traverse((object) => {
    if (object.name === 'zdisc') evidence = object.userData.evidence_rendered ?? null;
  });
  const solid = build(null);
  let solidEvidence = null;
  solid.root.traverse((object) => {
    if (object.name === 'zdisc') solidEvidence = object.userData.evidence_rendered ?? null;
  });
  assert.equal(evidence, solidEvidence, 'the evidence class must not change with the camera');
  scene.clear(); solid.clear();
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase16.test.js
```

- [ ] **Step 3: Ghost the envelope**

In `src/render/SarcomereScene.js`, inside the `if (anchorDetail?.target === 'zdisc')` branch (around `:1019`), after the detail group is added, find the Z-disc mesh and lower only its rendered opacity:

```js
        // The envelope is a boundary marker, not the anchor. When the anchor's own
        // topology is drawn, a lattice-wide slab in front of it is pure occlusion.
        // This changes the OPACITY OF A PRESENTATION ENVELOPE, not an evidence
        // class: userData.evidence_rendered is deliberately left alone, and the
        // manifest records that the change happened.
        let ghosted = false;
        this.root.traverse((object) => {
          if (object.name !== 'zdisc' || !object.material) return;
          object.material.transparent = true;
          object.material.opacity = 0.14;
          object.material.depthWrite = false;
          object.userData.envelope_ghosted = true;
          ghosted = true;
        });
        anchorDetailReport.envelope_ghosted = ghosted;
```

Apply the same treatment in the `anchorDetail?.target === 'mline'` branch for the `mline` object if it draws a solid marker at close range.

- [ ] **Step 4: Make sure the report reaches the manifest**

Confirm `anchorDetailReport` is the object assigned to `manifest.anchor_detail`; if the manifest copies fields individually, add `envelope_ghosted: anchorDetailReport.envelope_ghosted ?? false`.

- [ ] **Step 5: Run the tests and look**

```sh
node --test --test-concurrency=1 test/showcase_phase16.test.js test/showcase_phase3.test.js test/showcase_phase8.test.js
npm run typecheck && npm run build && npm run check:build
npm run serve
```

Verify **through the tour**, not through a typed hash: open the page, press `Next` to chapter 4,
and confirm telethonin and the α-actinin connectors are visible and both titin directions read.
Then reload the URL the page wrote for that chapter and confirm you get the same frame — after
Task 11.0 it must name `closeup.zdisc`, and if it still names `region.Z1Z2` then Task 11.0
regressed and this sprint's result is invisible again.

- [ ] **Step 6: Add the sprint script and commit**

```json
"test:sc16": "node --test --test-concurrency=1 test/showcase_phase16.test.js test/showcase_phase3.test.js test/standalone.test.js",
"verify:sc16": "npm run check:build && npm run typecheck && npm run test:sc16 && npm run validate:showcase && npm run validate:annotations",
```

```sh
npm run verify:sc16 && git add -A && git commit -m "SC-16: ghost the anchor envelopes so the anchor is visible"
```

### Task 16.2 (optional, network-dependent): Real domain backbones at maximum zoom

Only attempt this if `npm run fetch:structures` succeeds; the cache is large and the release gate does not require it. Skip without penalty if the network is unavailable.

**Files:**
- Create: `scripts/extract_domain_backbones.py`, `data/domain_backbones.json`
- Modify: `src/render/SarcomereScene.js`, `src/model/SpecLoader.js`
- Test: `test/showcase_phase16.test.js` (extend)

- [ ] **Step 1: Confirm the inputs exist**

```sh
npm run fetch:structures && npm run check:structures
```

Expected: the manifest verifies every SHA-256. If this fails, **stop here** and move to SC-17.

- [ ] **Step 2: Write the extraction script**

Create `scripts/extract_domain_backbones.py`:

```python
"""Extract Cα backbones for the domain archetypes from the pinned structure cache.

The archetype capsules in geometry_strategy.json are built Y-long, so each
backbone is centred on its centroid and rotated to put its principal axis on +Y.
That way swapping a capsule for a backbone changes the SURFACE and nothing else:
the instance transform the renderer already computed still applies.

MEASURED coordinates, from files whose SHA-256 is pinned in the cache manifest.

    .venv/bin/python scripts/extract_domain_backbones.py
"""
import hashlib
import json
from pathlib import Path

try:
    import gemmi
    import numpy as np
except ImportError as exc:                                  # pragma: no cover
    raise SystemExit("gemmi and numpy required: install requirements.txt") from exc

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "structures"
OUT = ROOT / "data" / "domain_backbones.json"

# One archetype, one deposited structure. Both are already cited in
# data/references.json and measured by the Phase-6 pipeline.
ARCHETYPES = {
    "Ig_like": {"pdb_id": "1TIT", "source_id": "PDB:1TIT"},
    "Fn3": {"pdb_id": "8OMW", "source_id": "PDB:8OMW"},
}


def calpha_nm(path: Path) -> list[list[float]]:
    """Cα coordinates of the first polymer chain, in nanometres."""
    block = gemmi.cif.read_file(str(path)).sole_block()
    structure = gemmi.make_structure_from_block(block)
    structure.setup_entities()
    for chain in structure[0]:
        polymer = [r for r in chain if r.entity_type == gemmi.EntityType.Polymer]
        points = [r["CA"][0].pos for r in polymer if r.find_atom("CA", "*")]
        if len(points) >= 20:
            return [[p.x / 10.0, p.y / 10.0, p.z / 10.0] for p in points]
    raise SystemExit(f"extract_domain_backbones: no usable Cα chain in {path.name}")


def aligned(points: list[list[float]]) -> list[list[float]]:
    """Centre on the centroid and put the principal axis on +Y."""
    coords = np.asarray(points, dtype=float)
    coords -= coords.mean(axis=0)
    # Principal axis = first right-singular vector of the centred coordinates.
    axis = np.linalg.svd(coords, full_matrices=False)[2][0]
    if axis[1] < 0:
        axis = -axis                      # keep +Y, not -Y
    target = np.array([0.0, 1.0, 0.0])
    v = np.cross(axis, target)
    s = np.linalg.norm(v)
    if s < 1e-12:
        rotation = np.eye(3)
    else:
        c = float(np.dot(axis, target))
        vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
        rotation = np.eye(3) + vx + vx @ vx * ((1 - c) / (s ** 2))
    return [[round(float(value), 3) for value in row] for row in coords @ rotation.T]


def main() -> None:
    manifest = json.loads((CACHE / "manifest.json").read_text())
    archetypes = {}
    for name, spec in ARCHETYPES.items():
        path = CACHE / f"{spec['pdb_id']}.cif"
        if not path.exists():
            raise SystemExit(f"{path.name} is not cached; run npm run fetch:structures")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        pinned = str(manifest).find(digest) >= 0
        points = aligned(calpha_nm(path))
        archetypes[name] = {
            "pdb_id": spec["pdb_id"],
            "source_id": spec["source_id"],
            "evidence_class": "MEASURED",
            "residue_count": len(points),
            "sha256": digest,
            "sha256_pinned_in_manifest": pinned,
            "frame": "centred on centroid; principal axis on +Y, matching the archetype capsule",
            "ca_nm": points,
        }
    OUT.write_text(json.dumps({
        "schema": "titin-domain-backbones/1",
        "meta": {
            "purpose": "Cα backbones for the domain archetypes, for the deepest close-up only.",
            "not_claimed": [
                "a unique molecular surface for every domain in the chain",
                "an in-situ orientation for any individual domain",
            ],
        },
        "archetypes": archetypes,
    }, indent=1) + "\n")
    total = sum(a["residue_count"] for a in archetypes.values())
    print(f"wrote {OUT.relative_to(ROOT)}  {OUT.stat().st_size // 1024} KB  {total} Cα")


if __name__ == "__main__":
    main()
```

Run it:

```sh
.venv/bin/python scripts/extract_domain_backbones.py
```

Expected: a file well under 40 KB, and `sha256_pinned_in_manifest: true` for both archetypes. A `false` there means the cached file is not the pinned one — stop and re-fetch.

- [ ] **Step 3: Gate the swap on resolvability**

Draw the backbone instead of the archetype capsule **only** when one domain's rendered length exceeds 40 px, reusing the existing `ALIAS_THRESHOLD_PX` machinery pattern, and record in the manifest which archetypes were swapped and why. Below that threshold, the capsule stays.

- [ ] **Step 4: Test, size-check, commit**

```sh
node --test --test-concurrency=1 test/showcase_phase16.test.js
npm run build && ls -l index.html   # must stay under 2,385,847 bytes
npm run validate:spec && npm run check:build
git add -A && git commit -m "SC-16: show measured domain backbones at resolvable zoom"
```

---

# Sprint SC-17 — Presentation readiness

**Why:** `release/PREFLIGHT.md` includes a projector rehearsal, and the drawer's dominant type size is 9–10 px with 8 px in `.pipeline-records`. The release record in `data/release_gates.json` also needs to reflect what these sprints changed, and the release pack is staleness-gated.

### Task 17.1: A presentation type scale

**Files:**
- Modify: `src/index.template.html` (CSS + toggle), `data/release_gates.json`
- Test: `test/showcase_phase17.test.js` (create)

- [ ] **Step 1: Write the failing test**

```js
/** SC-17 gates: the showcase is legible from the back of a room. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');

test('SC17: a presentation text scale exists and is user-controlled', () => {
  assert.match(page, /<button id="textScale"[^>]*aria-pressed="false"/);
  assert.match(page, /data-text-scale="large"/);
});

test('SC17: no shipped rule is smaller than 9 px, and large mode floors at 12 px', () => {
  const sizes = [...page.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((hit) => Number(hit[1]));
  assert.ok(sizes.length > 10);
  assert.ok(Math.min(...sizes) >= 9, `smallest shipped font-size is ${Math.min(...sizes)}px`);
  assert.match(page, /\[data-text-scale="large"\][\s\S]{0,600}font-size: 1[2-9]px/);
});
```

- [ ] **Step 2: Run it, then implement**

Raise every `font-size: 8px` rule to `9px`, and add:

```css
  #app[data-text-scale="large"] { font-size: 15px; }
  #app[data-text-scale="large"] .sub,
  #app[data-text-scale="large"] .note,
  #app[data-text-scale="large"] li,
  #app[data-text-scale="large"] td { font-size: 13px; }
  #app[data-text-scale="large"] .object-lay { font-size: 14px; }
  #app[data-text-scale="large"] .object-detail,
  #app[data-text-scale="large"] .object-sources { font-size: 12px; }
  #app[data-text-scale="large"] #chapterSummary { font-size: 16px; }
```

Add the button to the drawer head and wire it:

```js
$('textScale').onclick = () => {
  const large = $('app').dataset.textScale === 'large';
  if (large) delete $('app').dataset.textScale;
  else $('app').dataset.textScale = 'large';
  $('textScale').setAttribute('aria-pressed', String(!large));
  $('textScale').classList.toggle('on', !large);
  markStageDirty();
};
```

- [ ] **Step 3: Test, build, commit**

```sh
node --test --test-concurrency=1 test/showcase_phase17.test.js test/showcase_phase8.test.js
npm run build && npm run check:build
git add -A && git commit -m "SC-17: add a projector text scale and raise the type floor"
```

### Task 17.2: Update the release record and regenerate everything

**Files:**
- Modify: `data/release_gates.json`, `README.md`
- Regenerate: `index.html`, `release/`

- [ ] **Step 1: Record the new performance baseline**

> **This step moves Global Constraint 6's ceiling.** The 2,385,847 bytes quoted there is not
> written down anywhere — `test/showcase_phase8.test.js:399-404` derives it from
> `performance.baseline.standalone_bytes` × `standalone_regression_tolerance`, both read out of
> the record this step rewrites. Rebaselining from the SC-7 figure (1,988,206) to the post-SC-16
> figure raises the ceiling by roughly 200 KB. That is the intended effect — the sprints since
> SC-7 legitimately added weight — but make it a decision rather than a side effect, and restate
> the new number in Global Constraint 6 so the two do not drift. At the end of SC-16 the artifact
> was **2,159,899 bytes**, leaving ~226 KB against the *existing* ceiling, so SC-17's CSS work
> does not need the headroom to proceed.

Run `ls -l index.html`, then update `data/release_gates.json` → `performance.baseline`:

```json
"recorded_on": "<today's date>",
"standalone_bytes": <the measured size>,
"standalone_regression_tolerance": 0.2,
"basis": "Byte size of the committed standalone index.html at the SC-17 release point, after the SC-10..SC-16 presentation work."
```

- [ ] **Step 2: Add a check for the new capability**

SC-16 already appended three checks to `automated.checks` — `anchor_envelope_ghost_is_not_evidence`,
`clamped_body_not_occluded` and `domain_backbone_provenance` — so this step adds the performance one
only. Do not restate the SC-15 or SC-16 invariants here.

Append to `performance.checks`:

```json
{
  "id": "overlay_on_change",
  "requirement": "stage overlays run on state change, not on every animation frame",
  "verification": "automated",
  "status": "PASS",
  "verified_by": "test/showcase_phase11.test.js"
}
```

- [ ] **Step 3: Update the README**

Add a short paragraph to `README.md` describing the stage control bar, the stretch sweep, the passive-force readout, and the tabbed drawer with the bibliography last. Keep the existing status paragraph honest: the human gates (novice comprehension, expert review, visual capture, projector rehearsal) are still outstanding.

- [ ] **Step 4: Regenerate the pack and run the full gate**

```sh
npm run build
npm run pack
npm run verify
```

`npm run verify` is the slow, exhaustive gate — expect several minutes. Every step must pass.

> **The order above is load-bearing, and SC-16 hit this twice.** `npm run verify` chains
> `check:pack`, which fails closed on a stale pack, so `npm run pack` must run *after* the build
> and *before* the gate. The pack goes stale on two independent triggers, and only the first is
> obvious:
>
> 1. **`MANIFEST.json` records `standalone_bytes` from the built `index.html`.** Any change that
>    alters the artifact's size — including Task 17.1's CSS, which is the whole of that task —
>    makes the pack stale even though no specification record moved.
> 2. **The build fingerprint changes when any `FINGERPRINT_INPUTS` file changes.** SC-16 added
>    `data/domain_backbones.json` to that list (`scripts/build_fingerprint.mjs`), because at the
>    deepest zoom the domain surface *is* those coordinates and a preflight comparing two builds
>    by fingerprint has to notice. The list is twelve files as of SC-16; read it there, not here.
>
> Neither `data/release_gates.json` (Steps 1–2) nor `README.md` (Step 3) is a fingerprint input or
> a pack input, so this task's own edits leave the pack current. Task 17.1 is what will have made
> it stale, via trigger 1.
>
> **Starting position:** at the SC-16 merge (`a3e0461`), every command `npm run verify` chains
> passes on `main` — `npm test` 466/466, `typecheck`, `check:build`, `check:pack`, `check:matrix`,
> `validate`, `validate:spec`, `validate:showcase`, `validate:presentation`, `validate:annotations`,
> `validate:gates`, `test:negative`, `validate:python`. A failure here is therefore something SC-17
> introduced, not inherited debt — read it that way rather than reaching for a regeneration.

- [ ] **Step 5: Re-run the visual capture set**

```sh
node scripts/capture_visual_matrix.mjs --check
node scripts/capture_visual_matrix.mjs > /tmp/capture-checklist.txt
```

Walk the 52 cells by eye at the listed viewports. This is the SC-8 `visual_matrix` gate and it needs a human; record findings in `data/release_gates.json` → `visual_matrix` only after actually looking.

- [ ] **Step 6: Commit**

```sh
git add -A && git commit -m "SC-17: refresh the release record, pack, and documentation"
```

### Task 17.3: Bind the presenter shortcuts, fix the colour copy, and check a phone

**Why:** `data/presentation.json` declares three `presenter_shortcuts` (`restart_guided`, `show_extension`, `open_evidence`); `StoryController` validates them (`src/presentation/StoryController.js:355`) and **no key in the page is bound to any of them** — the only keyboard handlers are Escape (line 692) and the stage's arrow/Enter navigation (line 2110). A presenter driving this from a lectern currently has to find a small button with a mouse. Separately, chapter 1 says titin is shown *in red*, the annotation says *pink*, and the token is `#ff5d7d`.

**Files:**
- Modify: `src/index.template.html` (key bindings, help text), `data/presentation.json` (chapter 1 copy)
- Test: `test/showcase_phase17.test.js` (extend)

- [ ] **Step 1: Write the failing test**

```js
import { TitinModel } from '../src/model/TitinModel.js';
import { nodeReader } from '../src/model/readNode.js';
const model = await TitinModel.create(nodeReader());

test('SC17: every declared presenter shortcut is bound to a key', () => {
  const shortcuts = model.spec.presentation.presenter_shortcuts;
  assert.ok(shortcuts.length >= 3);
  assert.match(page, /const PRESENTER_KEYS/);
  for (const shortcut of shortcuts) {
    assert.ok(page.includes(shortcut.action),
      `presenter shortcut '${shortcut.id}' declares action '${shortcut.action}' that nothing binds`);
  }
  // Digits step the guided route; a bare letter must not fire while typing.
  assert.match(page, /event\.target instanceof HTMLInputElement/);
  assert.match(page, /event\.metaKey \|\| event\.ctrlKey \|\| event\.altKey/);
});

test('SC17: the shortcuts are discoverable, not folklore', () => {
  assert.match(page, /id="shortcutHelp"/);
});

test('SC17: the page names titin one colour', () => {
  const chapter = model.spec.presentation.guided_chapters
    .find((entry) => entry.id === 'orientation');
  assert.ok(!/\bin red\b/.test(chapter.lay_summary),
    'titin is #ff5d7d — pink — everywhere else in the copy');
  assert.match(chapter.lay_summary, /\bpink\b/);
});
```

- [ ] **Step 2: Run it and watch it fail**

```sh
node --test --test-concurrency=1 test/showcase_phase17.test.js
```

- [ ] **Step 3: Bind the keys**

In `src/index.template.html`, extend the existing `document.addEventListener('keydown', …)` block at line 692 by adding, after the Escape handling:

```js
  // Presenter shortcuts. The actions come from the validated presentation record,
  // so a shortcut cannot name a chapter or mode that does not exist. Guarded
  // against firing while a control has focus and against system chords.
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target instanceof HTMLInputElement
      || event.target instanceof HTMLTextAreaElement) return;
  const chapterKey = Number(event.key);
  if (Number.isInteger(chapterKey) && chapterKey >= 1 && chapterKey <= story.chapters.length) {
    event.preventDefault();
    applyChapter(story.chapters[chapterKey - 1].id);
    return;
  }
  const action = PRESENTER_KEYS[event.key.toLowerCase()];
  if (!action) return;
  event.preventDefault();
  if (action.startsWith('story.')) applyChapter(action.slice('story.'.length));
  else if (action === 'mode.evidence') openEvidence($('audienceEvidence'));
  else if (action === 'mode.guided') setAudienceMode(AUDIENCE_MODES.guided);
  else if (action === 'sweep.toggle') $('stagePlay').click();
```

and declare the key map near the other module-level constants, driven by the record:

```js
// One letter per declared shortcut, resolved from the validated record so the
// binding cannot drift from the presenter script in release/PRESENTER_SCRIPT.md.
const PRESENTER_KEY_BY_ID = { restart_guided: 'r', show_extension: 'x', open_evidence: 'e' };
const PRESENTER_KEYS = Object.fromEntries(
  presentation.presenter_shortcuts
    .filter((shortcut) => PRESENTER_KEY_BY_ID[shortcut.id])
    .map((shortcut) => [PRESENTER_KEY_BY_ID[shortcut.id], shortcut.action]),
);
PRESENTER_KEYS.g = 'mode.guided';
PRESENTER_KEYS[' '] = 'sweep.toggle';
```

- [ ] **Step 4: Make them discoverable**

Extend the on-canvas help line (`src/index.template.html:396`):

```html
    <div id="interactionHelp">drag: orbit · wheel/pinch: zoom · right-drag: pan
      · <span id="shortcutHelp">1–7 chapters · space stretch · e evidence · g guided · r restart</span></div>
```

- [ ] **Step 5: Fix the colour word**

In `data/presentation.json`, in the `orientation` chapter's `lay_summary`, change `shown in red beside actin and myosin` to `shown in pink beside actin and myosin`. The word count and sentence count are unchanged, so the SC-7 prose gate still passes.

- [ ] **Step 6: Run the tests**

```sh
node --test --test-concurrency=1 test/showcase_phase17.test.js test/showcase_phase7.test.js test/presentation.test.js
npm run validate:presentation && npm run build && npm run check:build
```

- [ ] **Step 7: Check a phone-sized viewport by hand**

> **Revision 2:** the structural narrow-viewport work moved to **Task 12.2b**, which fixes the
> clipped model, the overlapping bracket lane and the 60 px stage strip that a 375 × 812 capture of
> the shipped build actually shows. What remains here is the final by-hand pass over the
> *controls* after everything else has landed. Do not re-litigate the layout here; if something
> structural is still wrong, it is a Task 12.2b regression.

Open the built page at 390 × 844 (DevTools device emulation) and confirm:
- the stage bar does not overlap the guided card (the `@media (max-width: 700px)` rule raises `#guidedCard { margin-bottom: 118px; }`),
- the drawer still opens as a bottom sheet and its tabs are reachable,
- every stage control clears the 44 px coarse-pointer minimum,
- the length slider can be dragged without starting an orbit.

Fix what does not hold before committing; note anything deferred in `data/geometry_strategy.json` → `followup_register` rather than leaving it silent.

- [ ] **Step 8: Commit**

```sh
git add -A && git commit -m "SC-17: bind presenter shortcuts and name titin one colour"
```

---

## Self-review notes for the implementer

Three failure modes will cost you the most time; check them first when something breaks.

1. **The standalone page works from `npm run serve` but breaks when opened as a file.** You added an import to the page module and missed one of the three places in `scripts/build_standalone.mjs`. No gate catches it; the browser console says `X is not defined`.
2. **Line2 draws nothing, or the ribbon is unpickable.** `material.resolution` is still `(0, 0)`. It must be set after every build and every resize (Task 10.1, Steps 7–8).
3. **`showcase_phase8` resource-stability fails after a render change.** A new geometry or material was created without `this._track(...)` / `this.disposables.add(...)`, or `clear()` does not empty a new collection.
4. **A chapter looks right when you click to it and wrong when you reload its URL.** `rebuild()` rewrites `state.cameraPreset` from live state, so a camera that is set and then overwritten still *looks* applied for one frame while the URL records something else (this is the Task 11.0 defect). Whenever you touch camera state, verify both paths: press `Next` to the chapter, then reload the hash the page wrote. If they differ, the URL is lying and the SC-8 matrix is capturing the lie.

Add the last sprint script before starting SC-17:

```json
"test:sc17": "node --test --test-concurrency=1 test/showcase_phase17.test.js test/showcase_phase7.test.js test/showcase_phase8.test.js test/standalone.test.js",
"verify:sc17": "npm run check:build && npm run check:pack && npm run typecheck && npm run test:sc17 && npm run validate:gates && npm run validate:presentation",
```

Five changes in this plan deliberately touch an existing contract. Each is recorded in the commit that makes it, and none weakens the original intent:

- **Task 12.1** splits `test/presentation.test.js`'s placement assertion so the *readouts* stay in the drawer while the *primary controls* move to the stage bar.
- **Task 12.1** also replaces `test/showcase_phase2.test.js:255`'s positional proxy (*toggle appears before the guided card*) with the intent that proxy stood for (*toggle is not in the Evidence drawer*). The control stays on the stage; only its DOM position changes.
- **Task 13.4** adds a required `related_target_ids` field to every expert card and validates it on both the JS and Python sides. It is required rather than optional on purpose: an unbound card is content that ships without arriving.
- **Task 15.2** retargets the `architecture` chapter camera, which changes the SC-8 capture matrix; the matrix is regenerated and re-checked in the same task.
- **Task 17.3** edits one word of reviewed chapter copy (*red* → *pink*). The SC-7 prose gate counts words and sentences; both are unchanged.

Revision 2 adds three more, each recorded in its own commit:

- **Task 11.0** changes what an *absent* `camera` key in the URL defaults to, and sets
  `show_context_detail: true` for the two close-up chapters in `data/presentation.json`. `URL_KEYS`
  is untouched, so Global Constraint 10 holds; no chapter camera is redeclared, so
  `test/showcase_phase7.test.js:85`'s four-distinct-cameras gate holds. It **does** change the
  chapter-4 and chapter-5 URLs, which makes the SC-8 capture set and the SC-9 pack stale — both
  are regenerated in the same task.
- **Task 12.2a** retunes `GUIDED_COMPONENT_COLOR` and adds `accessibility.object_contrast_pairs`
  to `data/release_gates.json`. Colour only: opacity is untouched and
  `test/showcase_phase8.test.js`'s opacity invariance must still pass.
- **Task 12.2b** makes `attention_budget` executable for the first time. It **reads**
  `data/showcase_claims.json` and must not edit it — `validate_showcase_claims.py:190` pins that
  record byte-for-byte and `neg_control_showcase_claims.py:162` proves the pin.

## What this plan does NOT do, and why

- **No new guided chapter.** Two test files assert the exact seven chapter IDs and `tour_pacing` is gated at 110–190 seconds. New material attaches to existing chapters (SC-14 Task 14.2 Step 6) or to Evidence mode.
- **No new URL field.** `URL_KEYS` is closed and `test/presentation.test.js` asserts exact hash strings; every state this plan adds is either derived (force), ephemeral (the sweep), or view-local (the drawer tab).
- **No change to the geometry or the mechanics.** `MechanicalModel`, `GeometryEngine`, and every `data/*.json` coordinate stay exactly as they are. SC-14 samples the existing pipeline; SC-15 adds transverse display detail between endpoints it is forbidden to move, and proves it with the geometry fingerprint.
- **No post-processing pipeline.** An `UnrealBloomPass` would look good and would cost an `EffectComposer`, a render target, MSAA rework, and a new failure mode on weak GPUs. The Line2 ribbon plus an additive halo (SC-10) buys most of the legibility for none of that. Revisit only if SC-10 proves insufficient on the presentation hardware.
- **No human gates are marked passed.** `lay_comprehension`, `expert_review`, `visual_matrix` and `demo_rehearsal` in `data/release_gates.json` need people; this plan makes them *passable* and leaves them PENDING.

Revision 2 declines three further things, on purpose:

- **No new chapter for the anchors or the scaffold.** Task 11.0 makes chapters 4 and 5 show what
  they already claim. If those frames still under-deliver afterwards, the answer is the close-up's
  content, not an eighth chapter — the seven IDs and the 110–190 s pacing gate stand.
- **No redesign of the guided narrative.** The prose is the strongest thing on the page and
  Revision 1 was right to say so. Every Revision 2 task changes what the viewer *sees* while a
  sentence is on screen; not one changes a sentence.
- **No relaxation of the attention budget.** Task 12.2b reduces the drawn labels to the declared
  maximum rather than raising the maximum to match the render. If three brackets on desktop turns
  out to be too few once the stage bar and locator exist, that is a claim-audit change with a
  reviewer's name on it, not a convenience edit made from inside an implementation sprint.
