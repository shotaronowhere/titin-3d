# SC-27A implementation plan — final UX and visual overhaul

> **Design authority:**
> `docs/superpowers/specs/2026-08-24-sc27a-ux-overhaul-design.md`
>
> **Governing release plan:**
> `docs/superpowers/plans/2026-08-09-titin-mvp-readiness-synthesis.md`
>
> **Starting candidate:** app revision `5bae463fa933662cc215e7eb994165694236aa4b`, model
> fingerprint `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6`.
>
> **Result:** one UX-complete, fully verified candidate ready to freeze for SC-27B. This plan does
> not execute final human validation or set `release_ready: true`.

---

## 1. Objective

Replace the current multi-surface Guided interface with a five-beat Tour and reorganize Explore as
a contextual Research workbench, while preserving the scientific model, exact evidence, URL state,
reproducible exports, accessibility contracts, and standalone build.

This is a presentation sprint. It does not improve, simplify, or reinterpret the scientific model.

---

## 2. Non-negotiable invariants

| Invariant | Enforcement |
|---|---|
| Scientific model fingerprint does not change | Compare final fingerprint with `7badc8e270e7…`; protected-input diff check |
| Force and regional mechanics do not change | Existing JS/Python parity, mechanics, and export tests |
| Claims, evidence classes, sources, decisions, and locators do not change | Protected-file diff check plus existing validators |
| URL v2 and control-scene vocabulary remain supported | SceneController/unit/browser migration tests |
| Existing state/force/region/claim downloads remain deterministic | SC-26 export tests and manifest checks |
| Offline standalone remains complete | `check:build`, file/HTTP smoke, external-network-denied tests |
| Accessibility contracts are preserved or strengthened | axe, keyboard, touch, reduced motion, zoom, focus tests |
| Human evidence is not invented | Formative and final protocols require real participants; otherwise remain pending |

### 2.1 Protected files

Implementation must fail immediately if the final diff changes any of these without an explicit
owner decision to abandon this UX-only sprint:

```
data/sarcomere.json
data/titin.json
data/titin_sequence_features.json
data/structural_states.json
data/geometry_sources.json
data/geometry_strategy.json
data/context_measurements.json
data/domain_backbones.json
data/mechanical_parameters.json
data/claim_support.json
data/scientific_decisions.json
docs/scientific-decisions/**
```

`data/release_gates.json` may change only for presentation/contrast/test declarations and later
evidence references. Existing PASS/PENDING/FAIL statuses are not upgraded by implementation.

### 2.2 Primary implementation surface

Expected files:

- `data/presentation.json`
- `data/scenes.json`
- `data/render_style.json`
- `src/index.template.html`
- `src/presentation/StoryController.js`
- `src/presentation/SceneController.js`
- `src/presentation/StageLayout.js`
- `src/presentation/ClaimView.js`
- `src/presentation/ClaimViewRenderer.js`
- `src/presentation/AnnotationCatalog.js`
- `src/render/Viewer.js`
- `src/render/SarcomereScene.js`
- presentation/render validators and tests
- browser suites, visual-matrix records, release pack, and documentation

Do not refactor geometry, mechanics, provenance, or export modules merely because the UI changes.

---

## 3. Delivery strategy

Implement as reviewable, green commits. Do not combine a camera change, palette change, chapter
migration, test-fixture regeneration, and generated-artifact refresh in one opaque diff.

Recommended branch: `codex/sc-27a-ux-overhaul`.

Recommended commit sequence:

1. Design targets and baseline evidence
2. Presentation schema v3 and five-beat content
3. Tour shell and control removal
4. Hero composition and route locator
5. Figure/ground palette and stage theme
6. Hit-grid regeneration and review
7. Contextual object/evidence path and Research workbench
8. Responsive/accessibility convergence
9. UX regression gates and test-contract migration
10. Formative remediation
11. Generated-artifact convergence and SC-27A handoff

Each source-changing commit runs the bounded tests named in its task. The full repository gate runs
only after the final source change and again after generated artifacts converge.

---

## 4. Task 0 — Baseline and design target lock

### 4.1 Capture the baseline

Record the current state before source changes:

- exact model, app, build-input, export-contract, raw-standalone, and manifest identities;
- screenshots at 375×812, 390×844, 768×1024, 1024×768, 1280×720, and 1440×900;
- cold-open and per-chapter visible/tabbable chrome counts;
- viewport word counts;
- story/client scroll dimensions;
- document/canvas horizontal overflow before and after focusing each control;
- geometry-share diagnostic;
- six object-contrast ratios and titin-dominance margin;
- tour pacing; and
- current relevant browser-test results.

Store non-human baseline artifacts under `evidence/ux/SC-27A/baseline/` with a manifest containing
path, byte count, SHA-256, viewport, state URL, and candidate identities. Confirm this path is not a
standalone/model input.

### 4.2 Produce target frames

Before implementation, produce reviewed high-fidelity frames for:

1. 1440×900 cold open
2. 1280×720 beat 3 with stretch controls
3. 1440×900 selected-object explanation
4. 1440×900 Research Inspect
5. 390×844 Guided cold open
6. 390×844 beat 3
7. 390×844 full-screen Research

Each frame must name:

- stage safe area;
- story/header/drawer bounds;
- exact visible controls;
- type sizes;
- color tokens;
- selected object and evidence chip;
- the full-sarcomere locator behavior; and
- the primary action.

Record an owner disposition for the target set. Code does not begin while the main composition,
control budget, or mobile drawer behavior is unresolved.

### 4.3 Baseline verification

Run:

```sh
npm run check:build
npm run verify:sc26
npm run test:browser:sc24
npm run test:browser:sc25
npm run test:browser:sc26
git diff --check
```

If the baseline fails independently of SC-27A, record and resolve that condition before mixing it
with the redesign.

**Done when:** baseline artifacts are reproducible, target frames are approved, protected-input
digests are recorded, and no unknown failing gate is carried into implementation.

---

## 5. Task 1 — Presentation schema v3 and five-beat curriculum

### 5.1 Schema migration

Update `data/presentation.json` and `StoryController.js` to `titin-presentation/3`:

- exactly five canonical chapters in this order: `meet_sarcomere`, `follow_titin`,
  `stretch_spring`, `scaffold_thick_filament`, `knowledge_recap`;
- explicit `visual_question` per chapter;
- `lay_summary` limited to one sentence/30 words;
- complete `narration` and screen-reader announcements;
- presentation-owned `evidence_language` mapping for all six canonical evidence classes;
- `molecular_architecture → stretch_spring` and `inspect_anchors → follow_titin` aliases;
- existing older aliases canonicalized directly to final v3 IDs;
- claim/source closure preserved for all merged chapters; and
- tour pacing retained within `[110, 190]` seconds.

The merge must preserve these concepts in narration/transcripts:

- sarcomere definition;
- actomyosin motor distinction;
- one continuous titin route;
- elastic I-band versus A-band association;
- domain architecture including Ig, Fn3, N2A, and PEVK boundaries already approved;
- regional extension behavior and approximate force caveat;
- Z-disc and M-line anchors with unresolved-route caveats;
- scaffold and interaction/signaling roles without partner coordinates;
- evidence-class distinctions; and
- explicit rendering/non-claim limitations.

### 5.2 Validation

Update `scripts/validate_presentation.py` and tests to require:

- exactly five canonical chapters in v3;
- exact alias closure with no cycles;
- all six canonical evidence classes mapped exactly once;
- only the approved five Guided labels;
- at most 30 `lay_summary` words;
- one visual question and one primary next transition per nonfinal chapter;
- no duplicate primary action labels;
- current eight-question lay-study coverage; and
- unchanged claim/source existence and source closure.

Regenerate accessible and presenter transcripts only after v3 validation passes. The generated
transcript may change layout/order but not silently lose a concept.

### 5.3 Tests

Update/add:

- `test/presentation.test.js`
- `test/showcase_phase23.test.js`
- `test/standalone.test.js`
- new `test/showcase_phase27a.test.js`

Preserve URL v2. Deep links using either removed chapter ID restore the correct merged chapter and
canonicalize without a warning.

Run:

```sh
npm run validate:presentation
npm run test:sc23
node --test --test-concurrency=1 test/showcase_phase27a.test.js
npm run typecheck
```

**Done when:** five chapters validate, pacing/transcripts retain concept coverage, aliases round-trip,
and the model fingerprint is unchanged.

---

## 6. Task 2 — Tour shell and control-surface reduction

### 6.1 Structure

In `src/index.template.html`, replace the current Learn/Explore/Story header, guided card, permanent
stage bar, scene row, and More sheet with:

- product title;
- bounded scope-details button;
- Research toggle;
- noninteractive five-step progress;
- title and one-sentence takeaway;
- Previous and Next;
- a contextual mechanics region rendered only for `stretch_spring`; and
- a compact selected-object explanation surface.

Beat 1 renders direct Titin/Myosin/Actin labels. Later beats render only the current subject and
required landmarks; they do not carry a persistent three-item legend.

Remove the Guided instances of:

- audience Learn button;
- Story toggle/reopen control;
- seven scene buttons;
- scene truth echo;
- More sheet and duplicate scene inventory;
- duplicate `chapterNextActions` buttons;
- Restart;
- permanent Restore previous view;
- permanent slider/Stretch/Reset/Force info outside beat 3; and
- three painted color-key buttons.

The complete scene and component inventories move to Research Inspect. The existing canvas label
hit targets and keyboard selection route remain.

### 6.2 Presentation module boundary

Extract only the new pure view concerns from the 5,000-line template into
`src/presentation/TourView.js`:

- progress rendering;
- visible summary/title rendering;
- Previous/Next state and labels;
- contextual mechanics visibility; and
- control-budget reporting for tests.

`TourView` receives already-resolved presentation state and emits DOM state. It does not read model
files, calculate biology, choose evidence classes, manipulate Three.js, serialize exports, or own
URL history. Keep model/scene orchestration in the existing controllers.

### 6.3 Interaction contracts

- One visible Next action only.
- Previous and Next are the only Tour navigation.
- Number-key shortcuts may remain as accelerators but are not painted as a second navigation
  vocabulary.
- Manual camera interaction does not auto-hide the lesson. The lesson stays compact enough to
  coexist with the stage.
- Escape closes object explanation or Research in last-opened order; it does not silently discard
  the current chapter.
- Focus restoration returns to the invoker.
- Current story step, length, and selection remain serializable.

### 6.4 Tests

Add browser assertions for the exact visible/tabbable definitions in the design contract. Count
actual viewport-intersecting, enabled, `tabIndex >= 0` targets; never label a raw selector count
“focusable.”

Run bounded unit tests, typecheck, build, and affected Guided browser tests after this task.

**Done when:** the cold open has ≤4 visible and ≤3 tabbable chrome targets, every nonstretch beat
has ≤4 visible chrome affordances, beat 3 has ≤7, there is one unique Next action, and every removed
expert route has a named Research destination.

---

## 7. Task 3 — Semantic hero composition and full-sarcomere locator

### 7.1 New presentation camera

Add a presentation-only hero camera/state in `data/scenes.json` and/or `StageLayout.js`:

- shallow longitudinal depth into local filament context;
- titin remains the compositional axis;
- sufficient local geometry fills the hero area;
- no full-route implication when the hero is cropped; and
- safe-area inputs reserve header/story space before the camera is solved.

Do not reuse `closeup.lattice` as the cold-open camera. It proves available geometric depth but does
not teach the longitudinal route.

### 7.2 Full-sarcomere locator

Extend the existing `scienceOverlay` projection path so a compact full-sarcomere locator rail
shows:

- current visible span relative to the mirrored full sarcomere;
- both Z-disc boundaries, the central M-line, and the I/A-band organization;
- one representative titin half-route and its N- and C-terminal anchors; and
- the active beat/region span where relevant.

All positions derive from the current geometry/report. The locator does not duplicate constants or
invent a transverse route. Its label/hit behavior remains accessible and follows the current length.

### 7.3 Layout race

Correct `_contentCentreOffsetNm`/first-frame behavior in `Viewer.js`:

- zero/unmeasurable height defers or skips the content offset;
- a subsequent measured resize applies the correct framing;
- the page does not claim the build is corrupt for a layout race; and
- genuine WebGL absence remains a distinct fallback.

### 7.4 Camera verification

At every release viewport and for beats 1, 2, and 5 assert:

- both Z-disc boundaries, the central M-line, and selected titin termini are in the safe area;
- the current visible-span marker is truthful;
- the selected titin path is not completely occluded;
- every label named by visible copy intersects the viewport and is not covered by chrome; and
- resize, Tour/Research switch, text scaling, and orientation change re-solve the camera.

**Done when:** semantic composition checks pass, target-frame comparison is approved, and no model
or coordinate input changed.

---

## 8. Task 4 — Figure/ground, theme, typography, and titin emphasis

### 8.1 Single source for presentation theme

Extend `data/render_style.json` with validated presentation fields for:

- lightest and darkest stage-background colors;
- Guided component colors;
- halo opacity bound;
- contour color/width meaning;
- chrome accent tokens where shared with the rendered identity; and
- explicit non-claims for screen-space emphasis.

Update `Viewer.js`, `SarcomereScene.js`, the template, validators, and tests to consume the declared
record. Eliminate validation that can pass because a color appears only in a comment. The lightest
possible background is the value used for all declared contrast ratios.

### 8.2 Palette

- Desaturate myosin, crowns, and actin at approximately constant relative luminance.
- Recompute, do not assume, every final contrast pair after 8-bit rounding.
- Keep titin's identity color and width multipliers unchanged.
- Increase halo opacity only within the approved design target.
- Add the dark separation contour on the same presentation path.
- Replace full-purity titin borders/pills with neutral or reduced-chroma accents.
- Put background variation behind geometry; do not darken certified objects with an overlay.

### 8.3 Typography

Implement the minimum type scale from the design contract. Audit all user-facing 9–10 px rules.
Move build-only microcopy to Sources & build or raise it. Verify ordinary and Large type at 100%
and 200% browser zoom.

### 8.4 Validation

Update:

- `scripts/validate_render_style.py`
- `scripts/validate_release_gates.py`
- affected phase 12/17/25 tests
- rendered-pixel contrast sampling
- grayscale/color-vision review captures

Run:

```sh
npm run validate:render-style
npm run validate:gates
node --test --test-concurrency=1 test/showcase_phase12.test.js test/showcase_phase17.test.js test/showcase_phase25.test.js test/showcase_phase27a.test.js
npm run typecheck
```

**Done when:** the stage theme has one authoritative record, every declared and rendered contrast
gate passes, titin wins the frame without a geometry-width change, and required Guided copy is not
below the type floor.

---

## 9. Task 5 — Hit-grid regeneration in an isolated commit

After the camera and layout are stable:

```sh
npm run build:hitgrid
npm run check:hitgrid
npm run test:browser:sc25
```

Review the complete `test/fixtures/picking_hit_grid.json` diff:

- every old sample is explained by the new framing;
- no individual sample is hand-added, removed, or nudged;
- titin-first policy and tolerances are unchanged;
- pointer, keyboard, and emulated-touch selection still resolve the same biological targets; and
- hidden hit proxies remain non-rendering and non-scientific.

Commit the reviewed regeneration separately from unrelated source and generated-output changes.

**Done when:** picking coverage is fully regenerated, reviewed, and green at all required
viewports.

---

## 10. Task 6 — Contextual object explanation and Research workbench

### 10.1 Shared evidence chip

Add one presentation component used by:

- selected-object explanation;
- Tour recap;
- Research claim header; and
- relevant measurement cards.

The component reads `presentation.evidence_language`, never an inline switch in the template.
Research displays the raw class when its Guided label is broader.

### 10.2 Object explanation

Refactor the Guided `ClaimView` projection to show only:

- object name;
- one approved lay sentence;
- evidence chip; and
- `Why we know this`.

Keep Previous/Next structure navigation available through the canvas keyboard route, not as three
new persistent card buttons. Close is available and focus-safe.

### 10.3 Research routing

Implement explicit entry intents:

| Invoker | Research destination |
|---|---|
| Header Research | Inspect, current selection or titin default |
| Object `Why we know this` | Evidence, selected object's claim |
| Evidence chip | Evidence, selected claim/class explanation |
| Force readout | Measure, current force and validity |
| Scope button | Inspect, Scope details subsection |
| Source action | Sources & build, contextual filter |

Do not let previously selected drawer tabs override an explicit invocation intent.

### 10.4 Research content order

- Inspect begins with selected target, not scene/camera inventory.
- Measure begins with current value/status, not equations.
- Evidence begins with current claim, not all scientific decisions.
- Sources begins with contextual sources, not hashes.
- Fingerprints and reproduction live below contextual sources/exports.
- Full inventories use collapsed disclosures or explicit “View all” actions.

Every current control and export receives a migration row in the SC-27A report. Nothing disappears
without either an intentional removal ruling or a tested new path.

### 10.5 Expert regression

Update `workbench.spec.js` to execute the same expert outcomes through the new entry points:

1. select proximal Ig;
2. inspect construct/interval/domain count;
3. open Measure and inspect force/compliance/regime;
4. open current claim evidence and limitations;
5. find exact sources;
6. open reproduction/build identity;
7. download all four deterministic exports; and
8. restore the deep link.

**Done when:** expert outcomes and export bytes are preserved, but the initial Research viewport is
contextual and within the word budget.

---

## 11. Task 7 — Responsive and accessibility convergence

### 11.1 Mobile Guided

- Stage and narrative sheet use one non-overlapping grid.
- Story content does not scroll internally.
- Previous/Next remain visible in every beat.
- Beat-3 controls wrap without hiding Next.
- Onboarding and stretch hints share one managed instruction slot and never coexist.
- Scope content cannot establish min-content width larger than the viewport.

### 11.2 Mobile Research

- Research becomes a full-viewport fixed sheet.
- Exactly one content region scrolls.
- Close and current target/tab remain persistent.
- Underlying stage controls are hidden from visual and tab order while the sheet is open.
- Closing restores stage state, selection, scroll, and invoker focus.

### 11.3 Keyboard and focus audit

For every release viewport:

1. collect all effective tab stops in order;
2. focus each one;
3. assert visible focus;
4. assert it intersects the viewport;
5. assert document and canvas horizontal scroll remain zero;
6. assert modal/sheet focus containment only while open; and
7. assert Escape/Close restores the correct invoker.

Test canvas Arrow/Enter inspection, reduced motion, coarse pointer, 200% zoom, screen-reader order,
and no-color evidence comprehension.

### 11.4 Axe and human-accessibility preparation

Run axe by scene/viewport and record violations individually. A clean axe run does not pass the
human accessibility gate. Prepare the exact candidate routes and worksheet the SC-27B accessibility
reviewer will execute after freeze.

**Done when:** responsive browser gates pass, zero mobile displacement/occlusion remains, and every
required action is reachable without pointer, color, or motion.

---

## 12. Task 8 — UX regression suite and contract migration

### 12.1 New suite

Add `test/browser/ux-overhaul.spec.js` and package scripts:

```json
{
  "scripts": {
    "test:sc27a": "node --test --test-concurrency=1 test/showcase_phase27a.test.js test/showcase_phase2.test.js test/showcase_phase8.test.js test/showcase_phase12.test.js test/showcase_phase13.test.js test/showcase_phase17.test.js test/showcase_phase18.test.js test/showcase_phase23.test.js test/showcase_phase24.test.js test/showcase_phase25.test.js test/showcase_phase26.test.js test/presentation.test.js test/standalone.test.js",
    "test:browser:sc27a": "playwright test test/browser/ux-overhaul.spec.js test/browser/controls.spec.js test/browser/learn.spec.js test/browser/stretch.spec.js test/browser/evidence.spec.js test/browser/picking.spec.js test/browser/workbench.spec.js --project=chromium",
    "verify:sc27a": "npm run check:build && npm run check:pack && npm run typecheck && npm run test:sc27a && npm run test:negative && npm run validate:presentation && npm run validate:render-style && npm run validate:gates && npm run check:hitgrid && npm run check:matrix && npm run verify:identity"
  }
}
```

The browser suite implements every automated gate in design §7.1. Put shared measurement functions
in `test/browser/helpers.js`, not in production code.

### 12.2 Existing-test triage

For every touched assertion in phase 2/8/12/13/17/18/23/24/25/26 and browser tests, record:

| Test/assertion | Old intent | Contract or incidental | New assertion/removal reason |
|---|---|---|---|

Examples:

- scene URL restoration: contract, rewrite against Research scene chooser;
- `#stageMore` exists: incidental, delete;
- slider is always visible: incidental, replace with “visible in stretch beat and restorable by URL”;
- evidence is reachable from object: contract, rewrite through `Why we know this`;
- expert exports agree: contract, preserve exactly.

### 12.3 Automated audit artifact

Add a deterministic UX-audit script or browser reporter that writes JSON containing:

- viewport/state;
- visible/tabbable chrome counts;
- word counts;
- bounding/overlap findings;
- scroll dimensions before/after focus traversal;
- story scroll budget;
- contrast results;
- geometry-share diagnostic; and
- candidate identities.

The script never writes PASS for human comprehension or visual quality.

**Done when:** the redesigned UI has stronger behavioral tests than the old UI, every removed test
has a recorded rationale, and no scientific/export contract was weakened.

---

## 13. Task 9 — Formative review and remediation

### 13.1 Lay formative sessions

Run two or three uncoached, titin-naive sessions on the current implementation candidate. These are
formative and not part of the final five-person gate. Record:

- consent for anonymized formative observation;
- candidate identities and device;
- time to first action;
- time to identify titin;
- Tour completion time;
- wrong turns and repeated clicks;
- controls expected but not found;
- answers to the eight final questions as diagnostic only; and
- verbatim confusion/interpretation notes.

Do not coach which control to use. Do not reuse these participants in SC-27B.

### 13.2 Specialist formative workflow

At least one relevant specialist performs:

- identify the modeled construct and scope;
- inspect one region and its exact locator;
- distinguish claim and render status;
- inspect one modeled mechanics value and limitation;
- locate one unresolved/non-claimed statement;
- reproduce or inspect an export; and
- return to the Tour without state loss.

### 13.3 Disposition

Classify findings:

- **Critical:** wrong scientific interpretation caused by UI, blocked Tour/source path, unreachable
  control, or state corruption.
- **Major:** recurring navigation failure, titin/motor confusion, hidden continuation, or unreadable
  target.
- **Minor:** friction that does not block comprehension or evidence access.

Any Critical or recurring Major finding is remediated before freeze. Source changes invalidate prior
visual captures and require affected automated/formative routes to be rerun. Formative records remain
historical and are never silently replaced.

**Done when:** no unresolved Critical or recurring Major formative finding remains, or SC-27A is
explicitly marked blocked rather than frozen.

---

## 14. Task 10 — Final convergence and SC-27A handoff

### 14.1 Final source verification

After the last source change:

```sh
npm run build
npm run pack
npm run verify:sc27a
npm run test:browser:sc27a
npm run test:browser
npm run verify
npm run check:hitgrid
npm run check:matrix
npm run check:build
npm run check:pack
npm run verify:identity
git diff --check
```

Run the complete Firefox/WebKit matrix required by SC-27A after Chromium is green. Confirm offline
file/HTTP launch and denied-external-network behavior.

### 14.2 Identity and protected-input audit

- Compare protected-file digests with Task 0.
- Assert model fingerprint exactly equals the SC-26 fingerprint.
- Refresh app/build-input/standalone/manifest identities only after the last source change.
- Confirm generated evidence/transcript/report files do not enter model or standalone inputs.
- Confirm `release_ready` and all human/expert/accessibility/deployment gates remain pending.

### 14.3 Handoff report

Create `docs/sprint-reports/SC-27A.md` containing:

- start/final identities;
- design decisions and target frames;
- five-beat migration and alias table;
- old-control → new-path inventory;
- before/after UX metrics;
- palette/contrast calculations;
- hit-grid review;
- test-contract triage;
- browser/accessibility matrix;
- anonymized formative findings and dispositions;
- protected-input/model-fingerprint proof;
- remaining limitations; and
- explicit readiness for candidate freeze or a blocking reason.

### 14.4 Freeze boundary

SC-27A ends before final human evidence. The owner freezes the verified candidate, records its exact
identities, and then begins SC-27B in the governing order:

1. final browser/accessibility matrix and human accessibility review;
2. preregistered five-person lay study;
3. independent sequence/structure and mechanics review;
4. target-hardware/projector rehearsal;
5. reproduce/promote/deployment parity; and
6. release decision.

**Done when:** one UX-complete candidate is reproducible, fully green, model-identical to SC-26, and
ready to freeze for SC-27B.

---

## 15. Final acceptance checklist

- [ ] Target desktop/mobile frames reviewed before implementation.
- [ ] Exactly five canonical Guided beats; removed IDs migrate silently.
- [ ] Cold open ≤4 visible and ≤3 tabbable chrome targets; every beat within its exact budget.
- [ ] One unique Next action and one Tour navigation vocabulary.
- [ ] No Guided internal story scroll at release viewports or 200% zoom.
- [ ] Semantic hero plus truthful full-sarcomere locator and representative half-route.
- [ ] Titin visually dominant without scientific width/geometry changes.
- [ ] Presentation theme has one authoritative data record.
- [ ] Required type meets the default floor.
- [ ] Object → evidence → exact source path works contextually.
- [ ] Research defaults to selected content, not hashes or the full evidence wall.
- [ ] Mobile Research is full-screen with one scroll container.
- [ ] Focus traversal causes zero document/canvas horizontal displacement.
- [ ] Every SC-26 expert artifact and deterministic export remains available.
- [ ] URL v2, history, aliases, and control-scene vocabulary round-trip.
- [ ] Hit grid regenerated and reviewed in isolation.
- [ ] Contract/incidental test triage recorded.
- [ ] Formative review has no unresolved Critical or recurring Major finding.
- [ ] Protected scientific files and model fingerprint unchanged.
- [ ] Full Node, validator, negative-control, browser, build, pack, and identity gates pass.
- [ ] `release_ready` remains false pending SC-27B.
