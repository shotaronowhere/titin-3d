# Titin MVP: final implementation handoff

**Status: COMPLETE for the bounded Chrome/Firefox scientist-feedback preview — finalized September 9, 2026 (JST).**

Latest application source: `5d5f02d1a8699579cc775103c0cba793619aaa57`. [Verified package and coverage record](/Users/shotaro/Downloads/artifacts/evidence/mvp-final/2026-09-09/PACKAGE.md). The original instructions below remain as the execution record.

The original planned corrections and interaction work were completed at `dcdb403`. The owner subsequently authorized the bounded final review pass: readable force-chart labels and functioning Large type, optional-locator clearance, an explanation of the opposite titin path, and source records before build identifiers. Firefox's enlarged-label collision was corrected before the final freeze. Scientific data, model mechanics, geometry, camera implementation and all 24 protected data/dependency files are unchanged.

The final candidate passes 618 Node tests and 63 targeted browser checks (39 Chromium, 24 Firefox). A clean checkout reproduced 23 files exactly. The ZIP's 26 files and 21 manifest entries verify; all 24 extracted desktop/phone walkthrough frames were visually inspected, and all 20 extracted exports pass. The earlier broad regression matrix and failed attempts remain separately identified. WebKit, independent scientific/human review, physical hardware/display validation and formal release readiness remain pending; `release_ready` stays false. Section 9.C's two-engine fallback applies.

Prepared September 8, 2026. Audience: the engineer making the final changes and the person reviewing the shareable package.

## 1. Decision and definition of done

Finish a **scientist-feedback preview** in one engineering day. Freeze the scientific model. Correct two misleading statements, make the Stretch comparison visually stable, and make the existing object-to-source evidence route easy to discover. Then verify and package the exact candidate.

The impressive demonstration is a connected sequence: **see where titin sits → change sarcomere length → understand which region extends → inspect the support and limitations behind the picture.** Do not add another scientific subsystem to make that sequence work.

This plan replaces the remaining SC27-B work **for this bounded preview**. It does not complete independent scientific review, human usability research, target-hardware validation, or the formal release gates. `release_ready` stays `false`. Describe the result as an AI-assisted educational visualization with inspectable scientific provenance, not an independently validated scientific simulator.

The minimum acceptable package has both mandatory corrections, passing applicable checks, a working five-beat Tour, truthful scope and force qualifications, functioning evidence and exports, and a verified extracted standalone. The desired package also has the stable Stretch frame and the two discovery improvements below. Optional labels and fallback-slide repairs must not consume the verification window.

**Deliverables:** a small reviewed source diff; regenerated `index.html` and `release/`; fresh verification evidence; a replacement ZIP; updated recipient notes; an external record identifying the ZIP and its contents. Do not publish or message recipients as part of this implementation.

## 2. Starting point and reading order

Repository: `/Users/shotaro/Downloads/artifacts`. Paths in commands below are relative to that root. Line numbers are navigation hints at the reviewed baseline; find functions and IDs again after edits.

Read these first:

1. [Final UX review and evidence](/Users/shotaro/Downloads/artifacts/evidence/mvp-review/2026-09-07/FINAL_UX_REVIEW_AND_MVP_PLAN.md).
2. [Completed September 6 finish plan](/Users/shotaro/Downloads/artifacts/docs/superpowers/plans/2026-09-06-titin-mvp-preview-finish.md). Its completed work is context, not a new to-do list.
3. [Existing delivery record](/Users/shotaro/Downloads/artifacts/evidence/mvp-preview/2026-09-05/DELIVERY.md) and [package record](/Users/shotaro/Downloads/artifacts/evidence/mvp-preview/2026-09-05/PACKAGE.md).
4. The functions named in each task below. Read the nearby event handlers before editing the orchestration.

Reviewed HEAD was `32e8941`, with application revision `557f09aaa6f663b4e1bf958ef6c44357861a4d16`. Reporting/test commits account for the difference. The review freshly passed 617 Node tests and build/pack currency checks; browser matrix results in the old delivery record are historical results on the old application. **Neither result proves the new candidate.**

Expected unchanged model fingerprint:

```text
7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6
```

Start with `git status --short` and `git rev-parse HEAD`. If the source has moved, inspect the intervening diff and confirm the defects still exist. Preserve existing untracked review evidence and other work. Use a `codex/` branch for implementation if starting a new branch; do not reset or clean the workspace.

Create a fresh evidence directory, such as `evidence/mvp-final/2026-09-08/`, for this candidate. Record baseline identities, decisions, command exit statuses, screenshots, and final hashes there. Do not overwrite September 5–7 evidence or describe old screenshots as new results.

## 3. Scope, order, and time limit

| Order | Work | Budget | Cut rule |
|---|---|---:|---|
| 0 | Record baseline and lock scope | 15 min | No new backlog analysis |
| 1 | Correct scope and folded-domain inspection | 60 min | Mandatory before sharing |
| 2 | Establish stable Stretch framing; at most two span labels | 90 min | Cut labels first; discard an unstable camera patch |
| 3 | Final evidence action, source placement, force ordering | 60 min | Keep only changes that pass their behavior checks |
| 4 | Small opening/scaffold identification improvements | 30 min | Optional; skip if behind |
| 5 | Fallback decision and recipient documentation | 30 min | Use transcript if SVG repair does not fit |
| 6 | Final verification, reproduction, packaging, rehearsal | 135 min | Protected time; do not spend on polish |
| 7 | Reserve for failures | 60 min | Fix regressions or remove optional changes |
| | **Total cap** | **8 hours** | |

Budgets include focused checks during implementation. At hour 4:45, stop adding features and start the release sequence. If a verification failure needs more than the reserve, remove the responsible optional change, regenerate, and rerun affected checks. A real scientific presentation error, broken primary interaction, or identity mismatch is a blocker; time pressure is not evidence of a pass.

If only 2–3 hours remain, implement Task 1, update notes, verify the smaller candidate, and package it. Keep the existing Tour and use the rehearsal in §10 to present it. Do not substitute an unverified visual overhaul.

**Protected content:** leave the nine `MODEL_INPUTS` in `scripts/build_identity.mjs` unchanged. Also preserve the scientific-scope ledger, scientific claims and decisions, mechanical outputs and parameters, evidence classification, export contracts, and gate truth. No dependency upgrades, force-equation changes, new isoforms, domain-unfolding animation, new anatomy model, renderer rewrite, new bibliography system, or new onboarding flow. Generated release bytes will change normally.

## 4. Task 1 — mandatory scientific presentation corrections

### 1A. Bind the Research scope sentence to canonical data

**Files:** [page template](/Users/shotaro/Downloads/artifacts/src/index.template.html:826), [scope record](/Users/shotaro/Downloads/artifacts/data/scientific_scope.json:77).

The `#scopeDetails` block currently says “Human skeletal-muscle reference construct Q8WZ42-1.” That asserts a tissue-specific scope excluded by the canonical record.

Implementation:

1. Replace that literal construct sentence with a uniquely identified text element, for example `#scopeConstructStatement`.
2. After model initialization, next to the existing `scopeIdentity`, `scopeBadge.title`, and `mechanicsScope` assignments, populate it using `model.scientificScope.publicBadge` and `textContent`.
3. Keep the existing separate explanation that sarcomere length changes passive geometry and does not simulate calcium activation or active contraction.
4. Do not modify `data/scientific_scope.json` to accommodate the erroneous prose. Do not maintain a second hand-written version of its badge text. Do not edit generated `index.html` directly.

**Acceptance:** the built standalone displays the canonical badge wording in Scope details, both through ordinary Research → Inspect and through the scope-badge shortcut. The tissue-specific sentence is absent from generated application UI. Historical records may retain it as a quoted defect. The activation limitation remains visible and accurate.

Add a small browser regression to `test/browser/mvp-preview.spec.js` or the relevant existing scope test: load the canonical expected value from the data record and compare the rendered text. This tests the delivered DOM, not merely the existence of a variable name in source.

### 1B. Treat folded titin domains as a titin aggregate

**Files:** [inspection resolver](/Users/shotaro/Downloads/artifacts/src/presentation/ParameterTable.js:169), [inspection UI](/Users/shotaro/Downloads/artifacts/src/index.template.html:3785), [SC26 tests](/Users/shotaro/Downloads/artifacts/test/showcase_phase26.test.js), [workbench browser tests](/Users/shotaro/Downloads/artifacts/test/browser/workbench.spec.js).

`createInspectionView()` recognizes titin regions and component `titin`, but omits component `titin_domains`. Architecture therefore selects “Folded titin domains” while reporting that it is a non-titin target.

Smallest resolver change:

```js
const isTitinTarget = annotation.target_type === 'titin_region'
  || annotation.target_id === 'titin'
  || annotation.target_id === 'titin_domains';
```

Keep the existing region lookup and mapped feature logic. This extension grants **reference-level metadata**, not a fictional contiguous residue selection.

Required outcomes:

| Selection | Reference metadata | Selected interval/count behavior |
|---|---|---|
| `titin` | Canonical accession/construct/frame/length and full-reference count | Existing aggregate behavior retained |
| `titin_domains` | Same reference metadata as titin | No fabricated contiguous residue interval; full-reference count explicitly labeled as reference-wide |
| A mapped titin region, e.g. `prox_Ig` | Canonical reference plus real mapping | Preserve its actual interval and regional feature count |
| Actin or myosin component | No titin reference attribution | Existing null/not-applicable semantics retained |

At this frozen model, the full-reference domain count is 285; `prox_Ig` has 74 mapped features and interval 801–9365. Read those values through the existing model/mapping APIs in production. Do not make the aggregate count look like a count of domains currently visible in the viewport.

Extend the existing unit tests for aggregate/reference/region/non-titin distinctions. Add a browser assertion using the **Architecture scene button**, so the real scene-selected target is exercised. Keep the existing myosin browser regression and cover actin in the unit cases. The UI must not say “non-titin” for Folded titin domains.

**Task 1 completion gate:** both corrections are present in the built artifact, focused tests pass, and the model fingerprint is unchanged. Complete this before visual polish.

## 5. Task 2 — make Stretch a stable visual comparison

**Primary file:** [page orchestration](/Users/shotaro/Downloads/artifacts/src/index.template.html). Reuse [existing viewer framing](/Users/shotaro/Downloads/artifacts/src/render/Viewer.js) through `visualization.frameStretchSweep()`.

### The behavior to implement

When the normal guided Stretch lesson appears, it already uses the camera that fits the working-range maximum. Pressing Stretch changes geometry within that frame. Pause, resume, slider changes, and endpoint Replay retain the frame at the same viewport size. Navigation into the beat preserves current sarcomere length.

The existing explicit endpoint Replay reset is correct: an explicit replay from 2400 nm resets to 2000 nm and stretches again. Ordinary navigation and URL restoration must not reset length. Reduced motion still reaches the endpoint through its existing behavior.

### Integration sequence

1. Trace `applyChapter()`, `renderChapter()`, `applyCameraPreset()`, `syncAudienceMode()`, `restorePresentationFromHash()`, the initial boot sequence, chapter-view restoration, `toggleSweep()`, and the manual-camera handler. The existing `renderChapter()` measures the new card in a `requestAnimationFrame`; `applyChapter()` currently applies the camera before rendering that card. `syncAudienceMode()` also schedules a later camera application. A fix in only `toggleSweep()` cannot solve entry framing.
2. Add one narrow policy/helper for applying the guided Stretch comparison frame. Use the existing `STRETCH_CHAPTER_ID`, resolved scene/camera state, and working range. Do not use `storyStep` alone: a manually adjusted Custom camera or a restored Research close-up must remain intentional. Do not set `sweepPresentationActive` merely to force entry framing; it also controls presentation behavior.
3. Establish the frame after the new chapter DOM and its measured card height are current. Coalesce or guard deferred work so a callback from an outgoing chapter cannot frame a newly selected chapter incorrectly. Prefer a current-state check plus a cancellable/replaceable pending frame request over a collection of unrelated timeouts.
4. Route applicable entry/restore and audience-layout reframing through that same policy. Ensure the later `syncAudienceMode()` callback cannot replace the Stretch comparison frame with ordinary hero framing. Keep unrelated view and close-up behavior unchanged.
5. Call the existing `visualization.frameStretchSweep(sweepRange.max, unobscuredFrameOptions(...))`; retain its geometry, margins, and supported range. Ensure the first comparison frame is settled before the first geometry frame of a sweep. Do not restart a camera animation on every slider input or animation tick.
6. Keep `toggleSweep()` able to establish the frame defensively when the user starts Stretch from another scene/Custom view. In the normal lesson it should produce no visible camera jump. Preserve the existing stop/pause/resume state machine, explicit endpoint reset, and working-range refusal.
7. Respect manual orbit/pan and the existing “Custom”/restore behavior. Reapply the teaching frame when the user intentionally restores the lesson, not continuously after manual camera input. Recompute its layout offset on an actual relevant layout/viewport change.

Read variable initialization order before adding calls: `sweepRange` is currently declared near the bottom of the module. A new early call must not access it before initialization. Do not expose private Three.js internals or introduce a new public API just to test this change.

### Verification

Extend `test/browser/stretch.spec.js`, which already checks sweep geometry and unobscured bounds **after** playback begins. Add entry and camera-stability coverage:

- At 1280×720 and 390×844, enter beat 3 from beat 2. Check that the Z-to-M extent fits the unobscured stage **before pressing Stretch**.
- After the entry camera settles, capture `viewSpanNm()` and project a fixed pair of world-space anchors using the public projection API. Compare the same immutable anchors after start, pause, resume, and replay. At an unchanged viewport the fixed projection should remain within approximately one CSS pixel; moving biological endpoints are not a valid camera-stability probe.
- Use condition polling to wait for settlement. Do not add arbitrary sleeps or globally loosen the suite's timeouts. Retain existing locally justified pause-start timing allowances.
- Preserve existing tests for intermediate-length resume, explicit endpoint replay, reduced motion, leaving the beat, and Research round trips. Include direct beat-3 URL entry and back/forward restoration; ensure manual Custom camera state is not silently overwritten.
- Visually compare entry and endpoint screenshots. Neither ruler scale nor model position should jump solely because Stretch was pressed. The expanding I-band must remain visible above the card.

**Optional labels, within the same budget:** use the existing projected canonical bracket anchors and overlay collision handling in `renderScienceOverlay()`. At most two new spans: “I-band: extensible region” and “A-band span: fixed in this model.” The second is a statement about the model's allocation, not universal molecular rigidity. Reuse existing claim support. Do not turn these into new controls or add an unfolding claim. If labels collide with termini, the locator, or card on phone, cut them and keep the stable frame plus current explanation.

**Stop rule:** if a narrow integration cannot pass entry, restore, and playback checks within the budget, remove the camera patch and record the known camera transition in the delivery note. Do not ship partially coordinated camera callbacks.

## 6. Task 3 — reveal the expert payoff

### 3A. One concrete evidence action at the end

**Files:** `src/index.template.html`, `src/presentation/TourView.js`, `test/showcase_phase27a.test.js`, `test/browser/ux-overhaul.spec.js`, and the existing evidence/Tour browser suite.

Add a real `<button type="button">` with label **Inspect titin’s evidence** to the final guided card. Show it only for the final beat. Make it visually primary; retain Replay and Previous. Keep DOM order logical for keyboard navigation. Do not add a sixth beat or another modal.

Use existing functions in this order:

1. Resolve and pin component `titin` through `selectNamedTarget('component', 'titin')`.
2. Only if selection succeeds, call `openEvidence(theButton, 'evidence')`.

This must select titin even if a previous interaction selected myosin. Keep selection/model/URL decisions in the page controller; `TourView` only projects state to DOM. Pass the added element to the view if it controls visibility there. Do not duplicate claim HTML or source filtering.

The existing chrome budget is four controls on ordinary beats and seven on Stretch. A final evidence button deliberately changes the final beat to **five**. Update `tourControlBudget()` and the corresponding declared and real-DOM assertions specifically for that beat; do not raise the global ceiling. Hidden earlier-beat buttons must not be tabbable.

**Acceptance:** mouse and keyboard activation open Research → Evidence for titin; canonical claims and qualifications are present; closing Research returns focus to the visible final action; Replay still returns to beat 1; no duplicate visible action appears on other beats. Do not claim to have fixed unrelated selected-object invoker focus behavior.

### 3B. Move the existing source action above the long explanation

In `src/index.template.html`, move `#selectedEvidenceSourcesLink` immediately after the selected-object heading and before `#selectedEvidence`. Keep its existing ID, event handler, `openObjectSources()` path, and hidden-state updates in `renderSelectedEvidence()`.

**Acceptance:** with titin selected, “Sources for this object” is visible on first arrival in the Evidence tab at desktop and phone sizes. Activation opens Sources filtered to the selected object; an exact source locator can still be expanded. With no selection, the heading/action remain appropriately hidden. Do not move or suppress the claims themselves.

### 3C. Put the force answer before the long explanation

**Entry points:** `renderForceCurve()` around line 3148 and `#panelMeasure`/`#passiveForceHeading` markup. The renderer currently appends `status, scope, limitations, chart, readout, ...`. The static introductory paragraphs above it also consume height.

Reorder existing content so the Passive force section reads:

1. Heading and compact canonical model/transfer status.
2. Current rounded value with units **per titin**, or its withheld state. Keep regime warnings and the explanation that parameter sensitivity is not a confidence interval adjacent to the result.
3. Existing chart, when applicable.
4. Full existing limitations, regional contribution table, source links, and parameter audit.

Move duplicated/long introductory prose below the result if necessary, while retaining the qualification needed to interpret it. Do not add a new compact numerical calculation, rescale the force, or infer muscle force from per-titin values. Do not hide extrapolated/unsupported status in a collapsed section. Prefer DOM reordering over new disclosure state.

Keep the existing stage-force link's tab selection, heading focus, sticky-tab scroll offset, and close-focus behavior. At 390×844, the current result and its essential qualification must be visible on first arrival; the chart should begin in that initial viewport. Full caveats remain reachable by ordinary scrolling.

**Check the existing regimes:** 2000, 2200, 2400 nm supported model outputs; 2450 nm extrapolated; 1900, 2500, and 3000 nm withheld by the current model. These are verification inputs, not new hard-coded UI thresholds. Ensure no stale supported value survives a move into a withheld state. Preserve export null/blank semantics rather than converting absence to zero. Extend existing force-route assertions for layout/order; reuse model/export tests for numerical semantics.

## 7. Task 4 — optional visual identification

This is a 30-minute presentation pass, not a redesign. Use existing canonical presentation data, annotation targets, colors, and claims. Any added anatomical wording must be supported by the current records; if it requires new scientific adjudication, leave it out.

- Opening: clarify the existing full-sarcomere locator as “One sarcomere” and identify the enlarged half. A short muscle-fiber-to-repeating-sarcomeres context line is sufficient if supported. Preserve the titin/actin/myosin labels already present.
- Route: use the existing terminal anchors to make the Z-disc and central M-line readable; retain N/C terminology where necessary.
- Scaffold: retain the current C-zone close-up and locator. Add or improve identification of titin and myosin only if the existing overlay can place both cleanly.

Do not distort the biological aspect ratio to make the molecule thicker, invent a cartoon spring, imply exact molecular packing, or replace evidence opacity with decorative effects. Skip any label that crowds the phone layout. Capture before/after frames only for changes retained in the candidate.

## 8. Task 5 — fallback and documentation

### Fallback decision

Read [the measured fallback defects](/Users/shotaro/Downloads/artifacts/evidence/mvp-preview/2026-09-05/FALLBACK_SLIDE_FINDINGS.md). The generator is [scripts/build_release_pack.mjs](/Users/shotaro/Downloads/artifacts/scripts/build_release_pack.mjs:93).

If repairing within the budget:

- `drawText()`: replace fixed source-row placement plus wrap offsets with a running vertical cursor advanced for every wrapped line and paragraph gap. Ensure the final line remains above the footer.
- `drawBars()`: reserve a bounded label column or wrap labels within a reserved width; advance row/series positions using their occupied height. Separate the evidence line from the first series title. Do not solve overflow by shrinking all text to illegibility.
- `drawAxial()`: align or constrain long boundary labels within the slide's safe text bounds. Do not move the represented biological boundary to fit its caption.
- Regenerate through `npm run pack` and render all six SVG slides at their intended 1920×1080 size. Inspect for overlap, clipping, and text legibility; bounding-box checks supplement visual review. Preserve values, units, evidence labels, and footer qualifications.

If all known defects are not fixed and checked within the budget, **recommend `release/LEARN_TRANSCRIPT.md` as the WebGL fallback** in the new scientist note and delivery record. Keep the generated pack structurally complete; disclose that the SVG deck still has known layout limitations and do not recommend it as the primary fallback. Do not delete manifest entries by hand or create a slide player.

### Documents to produce/update

Write new `SCIENTIST_NOTE.md`, `DELIVERY.md`, and `PACKAGE.md` in the new evidence directory. Package the first two at the archive root, where their relative links must work. Keep the package hash in the external `PACKAGE.md`, outside the ZIP.

The scientist note needs only opening instructions, the short route in §10, truthful reference/activation/force qualifications, the chosen fallback, and three feedback prompts: scientific misinterpretation, what the stretch lesson teaches, and whether the source trail is useful. Ask for feedback; do not claim the recipients endorsed anything.

Update README's stale September 6 paragraph: the old timeout, second-browser checks, and packaging were subsequently resolved. Point to the new handoff/candidate record, distinguish completed engineering from pending human review, and state retained limitations. Preserve historical records rather than rewriting past verification outcomes.

Record each optional change as **implemented and verified**, **cut**, or **retained limitation**. Do not mark a task complete because this plan describes it. No new test-count claims until the final commands have run.

## 9. Verification and release sequence

### A. During implementation

Use the pinned runtime/dependencies (`.node-version`, `package-lock.json`). Use `npm ci` only when installation is needed; do not upgrade dependencies. Regenerate the standalone before browser testing:

```sh
npm run build
npm run pack
npm run typecheck
node --test --test-concurrency=1 test/showcase_phase26.test.js test/showcase_phase27a.test.js test/mvp_preview.test.js
npx playwright test test/browser/mvp-preview.spec.js test/browser/stretch.spec.js --project=chromium
```

Run the relevant evidence/workbench/UX tests as those tasks are completed. Some tests read embedded identity from `index.html`; testing stale generated bytes gives misleading results. Do not interpret a dirty development build as a final release candidate.

### B. Freeze source, then generate the candidate

1. Inspect the diff and `git diff --check`. Confirm protected scientific files and dependency locks are unchanged. Review test changes for removed assertions, new skips, inflated timeouts, and broad selector weakening.
2. Commit the intentional source, test, and generator changes with explicit paths. Never use `git add .` in this shared workspace. Preserve unrelated untracked evidence.
3. With application inputs clean, run:

```sh
npm run build:release
npm run pack
npm run verify
npm run verify:identity
```

4. Record the resulting application revision, build-input fingerprint, model fingerprint, standalone hash, and manifest hash. Expect a new application identity for template/controller changes and the unchanged model fingerprint above.
5. `npm run verify` already contains the full Node suite and repository validators. A passing gate validator means gate records are truthful; it does not mean `release_ready: true`. Keep complete logs and real exit statuses. If piping through `tee`, enable shell `pipefail` so the logger cannot hide a failed command.

Do not patch fingerprints or generated manifests. If a source fix is necessary after this point, commit it, rebuild, repack, and reverify the affected candidate. Later evidence/README-only commits normally do not move application identity; verify this rather than assuming HEAD must equal the embedded revision.

### C. Fresh browser checks on the frozen standalone

Run one Playwright invocation at a time; the config owns port 4173 and uses one worker. Do not run competing browser suites or performance captures in parallel.

```sh
npx playwright test test/browser/mvp-preview.spec.js test/browser/stretch.spec.js test/browser/learn.spec.js test/browser/evidence.spec.js test/browser/workbench.spec.js test/browser/smoke.spec.js test/browser/ux-overhaul.spec.js --project=chromium --grep-invert '@sweep'
npx playwright test test/browser/mvp-preview.spec.js test/browser/stretch.spec.js test/browser/learn.spec.js test/browser/evidence.spec.js --project=firefox
npx playwright test test/browser/mvp-preview.spec.js test/browser/stretch.spec.js test/browser/learn.spec.js test/browser/evidence.spec.js --project=webkit
```

The explicit `@sweep` exclusion limits the large parameterized Chromium sweep; it does **not** exclude the dedicated `stretch.spec.js` interaction tests. Record this coverage boundary. Confirm selection with Playwright `--list` if test names/tags change. Do not report the historical full matrix as a fresh run.

If a browser cannot launch, distinguish infrastructure failure from assertion failure. Do not invent a pass. Protect Chromium and at least one second engine on the changed route; any omitted engine must be stated in delivery with no claim of verified support for that candidate. Use the reserve before dropping coverage. An assertion failure on a promised primary route requires a fix or removal of the responsible optional change.

### D. Visual and interaction acceptance matrix

Inspect the **new built standalone**, not source markup, at these sizes:

| Viewport/condition | Required observation |
|---|---|
| 1280×720 desktop | Five beats; entry/endpoint Stretch comparison; final CTA; first-screen source action; force result; scope; Architecture classification |
| 390×844 phone emulation | Fresh-load opening, stretch, recap, evidence/source, and force routes; no page-level horizontal overflow or covered primary controls |
| 375-pixel width | Existing supported narrow Stretch checks remain green |
| Keyboard | Next/Previous, Stretch/Replay, final evidence action, tab navigation, close and focus return |
| Reduced motion | Existing endpoint and replay semantics; no indefinite running state |
| State restoration | Direct Stretch URL, back/forward, Research round trip, intentional Custom camera, preserved current length |
| Desktop-to-phone resize | Inspect changed framing; fix regressions introduced here, disclose pre-existing limitations if retained |

Capture only useful evidence: opening, Stretch before/after at the same viewport, scaffold if edited, final CTA, evidence/source landing, phone force, corrected scope, and folded-domain audit. Store actual image formats/extensions and dimensions correctly. Browser emulation is not physical-device evidence, and this review is not a layperson learning study.

### E. Exports and clean reproduction

Use the existing workbench/export tests. Verify a state export, regional CSV, force CSV, and claim-support export from the candidate. Repeated exports at an unchanged state remain deterministic apart from fields explicitly allowed by the contract. At 1900 nm unsupported force remains blank/null; at 2450 nm extrapolation remains explicit. Candidate identity must match the new manifest, not the old September 6 values.

Commit generated outputs with explicit paths once final checks pass. Create a separate clean temporary checkout/worktree of the committed candidate, install pinned dependencies if needed, and regenerate `index.html` and the release pack there. Compare file sets and bytes for the standalone and complete release tree against the frozen candidate. Keep build identity tied to the actual Git history; a source-only file copy without Git is not equivalent. Do not disturb the primary checkout or copy unknown stale artifacts into the clean one.

### F. Package and verify the extracted content

Use a fresh temporary staging directory with one top-level `titin-sarcomere-preview/` directory. Copy only:

```text
index.html
LICENSE
release/                   (complete generated tree)
SCIENTIST_NOTE.md           (new note, at package root)
DELIVERY.md                 (new delivery record, at package root)
```

Retain the standalone's bundled third-party license notice. Exclude repository metadata, `node_modules`, tests, and the evidence tree. Name the ZIP with the delivery date and new short application revision; do not overwrite the September 6 ZIP. Use a fresh path and refuse accidental replacement. ZIP timestamps can differ; reproducibility is established by the extracted content, while the ZIP hash identifies the specific archive delivered.

Extract the ZIP to another fresh directory. Run the repository verifier with **both** extracted paths:

```sh
node scripts/verify_artifact_identity.mjs \
  --file /ABS/EXTRACTED/titin-sarcomere-preview/index.html \
  --manifest /ABS/EXTRACTED/titin-sarcomere-preview/release/MANIFEST.json
```

Replace `/ABS/EXTRACTED` with the actual extraction location. This verifier does not iterate the manifest artifact list. Separately compare byte length and SHA-256 of the standalone and every listed artifact against the extracted files. This minimal Node check can be run from the repository:

```sh
node --input-type=module - /ABS/EXTRACTED/titin-sarcomere-preview <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2]);
const manifest = JSON.parse(readFileSync(resolve(root, 'release/MANIFEST.json'), 'utf8'));
const rows = [manifest.standalone, ...manifest.artifacts];
for (const row of rows) {
  const path = resolve(root, row.path);
  assert.ok(path.startsWith(root + sep), `Outside package: ${row.path}`);
  const bytes = readFileSync(path);
  assert.equal(bytes.length, row.bytes, `${row.path}: bytes`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256, `${row.path}: sha256`);
}
console.log(`Verified ${rows.length} manifest entries in extracted package.`);
JS
```

Also compare the entire extracted file set and bytes against staging, including `LICENSE`, both notes, and manifest/checksum files; these are not all covered by the artifact rows. Verify every relative link in the two packaged notes resolves inside the package or points to an intentional external source. Do not pin the old package's file count if the generator legitimately changes it.

Open the **extracted** `index.html` using `file://` and rehearse §10. Observe page errors and network requests; the core walkthrough must not depend on non-file requests. Do not click external source websites during that offline assertion. Expand the in-app source locator and download a state export; check its identity and `candidate_manifest_verified` status. Exercise the selected fallback from the recipient note.

After all checks, write the ZIP byte size and SHA-256 plus extracted candidate identities in the external `PACKAGE.md`. Mark the old ZIP superseded by the new one. A ZIP cannot contain a truthful hash of itself; if you change a packaged note, rebuild the ZIP and repeat extracted verification. After final reporting commits, run `npm run check:build`, `npm run check:pack`, and `npm run verify:identity` once more to confirm the committed handoff still identifies the delivered bytes.

## 10. Two-minute presentation rehearsal

Use this as a product acceptance test, not a promise of measured learning outcomes:

1. **Opening, 15 seconds:** identify the sarcomere context and titin. Establish that this view explains a reference model with explicit scope.
2. **Route, 20 seconds:** follow one titin from the Z-disc to the M-line using the locator and endpoints.
3. **Stretch, 35 seconds:** enter at an intermediate supported length, point out the I-band, and press Stretch. The viewer should see regional extension without confusing camera motion. Demonstrate Replay once if time permits.
4. **Scaffold, 20 seconds:** use the existing close-up to identify titin's relationship to the thick filament. Do not imply an exact experimentally resolved pose where the depiction is schematic.
5. **Evidence, 30 seconds:** activate the final titin-evidence action if implemented; otherwise use the existing titin selection route. Open Sources for this object and expand one exact locator. Show the preparation and limitation alongside the support.

The force panel is an optional researcher branch after the main route: identify the per-titin estimate, model regime, and sensitivity interpretation before discussing its magnitude. Do not let force caveats consume the whole opening demonstration.

## 11. Final handoff checklist and deferred work

The engineer's completion message must state what actually shipped, which optional items were cut, the checks run with outcomes, remaining limitations, and the exact replacement ZIP path/hash. Link the new delivery/package records. Keep the distinction between source revision, generated artifact hash, and ZIP hash clear.

Required review questions before calling the preview finished:

- Are both original misleading statements corrected in the extracted artifact?
- Is the model fingerprint unchanged, with no new scientific or readiness claims?
- Does every retained UX change work through real navigation, keyboard, and phone layouts?
- Does Stretch preserve length on navigation and reset only on explicit endpoint replay?
- Are force regime/sensitivity limitations and canonical object-to-source provenance intact?
- Do the final logs, screenshots, exports, manifest, extracted files, and ZIP identify the same candidate?
- Can a recipient complete the short route and use the promised fallback without repository access?

Deferred beyond this deadline: new mechanics/isoforms, anatomical expansion, broader renderer work, comprehensive accessibility audit, known Research Large type behavior, unrelated object-invoker focus issues, extreme short-screen polishing, physical-device/performance claims, exhaustive URL/tooltip audits, independent scientist adjudication, formative layperson studies, and hosting parity. None should silently re-enter this one-day plan. Fix only regressions introduced by the retained changes and blockers to the promised preview route.

**Stop when the bounded package passes.** The next useful work is researcher feedback on the actual artifact, not another speculative code sprint.
