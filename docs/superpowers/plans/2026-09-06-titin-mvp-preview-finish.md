# Titin MVP preview — implementation handoff and finish plan

Updated **2026-09-06 JST** at the owner's request to hand the remaining sprint to a junior
engineer. This supplements the original [bounded review/plan](../../../evidence/mvp-review/2026-09-05/REVIEW_AND_PLAN.md).
It is the entry point for finishing this preview; do not restart SC-27A or the full SC-27B programme.

**Status, 2026-09-06: COMPLETE.** The pause timeout is diagnosed and closed as host
starvation, not a defect; the integrated Chromium command is **71/71, exit 0**, and Firefox
and WebKit are green too; exports and the remaining frames are checked; the package is
assembled, extracted, byte-verified and walked offline. A review pass then caught one
shipped statement that asserted an excluded claim, in the hand-written scientist note, and
corrected it. Two things are recorded rather than done: rehearsal on the intended demo
hardware, for which no device or participants were supplied, and four measured layout
defects in the static fallback deck, which re-issue a frozen manifest to fix and so were
left as an owner's call.
Outcomes are in [DELIVERY.md](../../../evidence/mvp-preview/2026-09-05/DELIVERY.md) and
[PACKAGE.md](../../../evidence/mvp-preview/2026-09-05/PACKAGE.md). The sections below are
retained as the record of what was asked for.

## 1. Scope and authority

The owner authorized implementation on 2026-09-05. The intended deliverable is a
**scientist-feedback preview**, with independent scientific validation and human usability
review pending. It is not a claim that the formal release gates pass.

- Keep the nine scientific model inputs and `data/release_gates.json` unchanged.
- Preserve `release_ready: false`, Research capabilities, source/claim bindings, precision
  policy, unsupported-force suppression, and the existing five-beat Tour.
- Do not add isoforms, active contraction, calcium/signaling animation, molecular dynamics,
  a new uncertainty model, a renderer rewrite, or a global layout redesign.
- Do not reopen repeated zero-finding AI closure, the confirmatory cohort, or expert sign-off
  as prerequisites to this specifically labeled feedback preview. Do not mark them complete.
- Treat misleading scientific communication, a broken core route, inaccessible core controls,
  or mismatched delivered bytes as blockers. Record cosmetic issues for later.

The original plan capped the entire sprint at 16 engineering hours. The remaining work should
be a short integration/packaging pass, approximately **2–4 engineering hours**, excluding
availability of demo hardware, humans, or a hosting destination. This is an estimate, not a
new feature budget. Escalate a reproducible core defect that exceeds that remaining scope.

## 2. Repository and candidate checkpoint

Repository: `/Users/shotaro/Downloads/artifacts`; branch: **`codex/mvp-preview`**.

| Commit | Contents |
|---|---|
| `b5ec722` | Review baseline, before this preview sprint |
| `557f09aaa6f663b4e1bf958ef6c44357861a4d16` | Presentation, renderer-note, force-route and replay changes; focused tests; README |
| `8674dd7` | Clean generated `index.html` and `release/` outputs |
| Subsequent handoff commit | This plan, progress/evidence records, and the phase-17 wording assertion adjustment |

The application revision remains `557f09a…` after documentation/test/reporting commits.
`scripts/build_identity.mjs` identifies the newest commit touching application inputs, not
simply repository HEAD. Do not try to make those two values match artificially.

| Frozen identity | Value |
|---|---|
| Model | `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6` |
| Build inputs | `d7970b235a73ab1df2e93e26807cda95cb9b0d769b41eccd4ec2169747cbd33f` |
| Standalone SHA-256 | `b5ee9beb2ea4f7b9c26dd25d5574018952a4f1518c6af12573e4b758086f4f5e` |
| Manifest SHA-256 | `13cb66e61e55cbbc4966219ce22ed35da5cf56b812987c6611d3d59ae6c0d4ac` |

The model fingerprint matches the review baseline. The exact candidate and validation scope
are also in [DELIVERY.md](../../../evidence/mvp-preview/2026-09-05/DELIVERY.md).
Use the manifest as authority if a justified runtime fix creates a newer candidate.

## 3. What changed and where to work

| File / function | Implemented behavior and maintenance constraints |
|---|---|
| `data/presentation.json`, `meet_sarcomere` and `follow_titin` | Short summaries connect muscle fibers to repeating sarcomeres and identify one titin as Z-disc to M-line, half a sarcomere. Myosin/actin motor wording remains source-bound. |
| `data/presentation.json`, `stretch_spring` | Removes the incorrect blanket “disordered N2A/PEVK” summary. Narration identifies four Ig domains and structured UN2A with flexible flanks. Existing DOI sources `10.3389/fphys.2020.00173` and `10.1016/j.jmb.2021.166901` were added to this chapter's source list. |
| `data/presentation.json` + `data/scenes.json`, `stretch_spring` | Both records now use `view.titin_hero`, `context`, local filament context on, domain detail off. PEVK remains the selected region. Keep these two records consistent; the scene validator checks their contract. The existing Research architecture scene still resolves domain detail. |
| `data/presentation.json`, `scaffold_thick_filament.presentation_features` | Removes only `lattice_cross_section` from the Tour. The paired lattice comparison remains in Research Measure. |
| `src/render/Viewer.js`, `renderedSceneNotes` and `setSarcomereLength` | Public notes describe the **built manifest**: local/extended filament counts and representative titin paths per half-sarcomere. Component controls can hide built geometry; the note says so. `model.verifyScene` still runs, and its descriptor notes are retained as `lastVerificationNotes`. Do not change biological copy-number data to match a rendering subset. |
| `src/api/TitinVisualization.js` | Updates the public `notes` property documentation to describe built-scene counts/presentation limitations. Export schemas are unchanged. |
| `src/index.template.html`, `stageForce.onclick` | Opens Research Measure, focuses `passiveForceHeading`, then adjusts the panel scroll position relative to the sticky tab bottom. `scrollIntoView()` alone would put the heading behind the sticky tabs. Closing restores the original force-button focus. |
| `src/index.template.html`, `render` and `renderForceCurve` | Tour shows the authorized **rounded central** force as approximately pN, its regime, and “modeled passive force per titin.” Research retains ± and explains literature-parameter sensitivity versus a confidence interval. Do not replace the rounded central value with raw solver precision or remove unsupported/extrapolated classifications. |
| `src/index.template.html`, `syncSweepControl` | Idle control reads “Replay stretch” only at the working maximum; otherwise “Stretch.” During animation, it leaves the Pause state alone. `render` and `stopSweep` synchronize this label. |
| `src/index.template.html`, `toggleSweep` | On explicit endpoint replay only, set the slider to the working minimum, rebuild, announce the reset, then use the existing Spring frame and sweep. Intermediate starts retain their length. The two bounds come from `presentation.scope.working_range_nm`; do not hardcode them into runtime. |
| `src/index.template.html`, `stepSweep` | Existing animation policy is unchanged: capped time increments, explicit termination at maximum, reduced motion uses the endpoint. This is a likely diagnostic location for the remaining timeout, not a pre-established cause. |
| `README.md`, generated `release/` | Force policy and preview status now agree with the application. Transcripts are generated from canonical presentation data. Never hand-edit `index.html` or generated release files. |

Useful location search:

```sh
rg -n 'syncSweepControl|toggleSweep|stepSweep|passiveForceHeading|stageForce.*onclick' src/index.template.html
rg -n 'renderedSceneNotes|lastVerificationNotes' src/render/Viewer.js
```

The presentation validator requires **one sentence and at most 30 words** in each lay summary.
Changing punctuation/copy can affect both that constraint and the Tour-card height. Keep any
necessary copy edit small and recheck its actual desktop/mobile composition.

## 4. Tests and evidence already completed

All durable evidence is under `evidence/mvp-preview/2026-09-05/`. The directory date identifies
the candidate sprint; this handoff is dated the following day.

| Check | Result and evidence |
|---|---|
| `npm run verify` | **PASS, exit 0; 617/617 Node tests**. Includes build/pack currency, generated science evidence, typecheck, destructive negative controls, scientific/presentation/export/gate validators, matrix structure and Python smoke. `verify.log`. |
| `npm run verify:identity` | **PASS**. Raw bytes/manifest and separation of build inputs from post-candidate evidence. `identity.log`. |
| Detached clean build + pack | **23/23 files byte-identical**; clean worktree afterward. `reproducibility.json`. Dependencies were copied from the existing pinned local installation, not freshly downloaded. |
| Integrated Chromium | **69/70 passed; exit 1**, about 20.6 minutes. `chromium.log`; see the unresolved failure below. |
| New MVP browser regressions | **4/4 passed** within that integrated run: twice-repeated replay, reduced-motion reset sequence, desktop/mobile force focus/disclosure and Research retention. |
| Captures | **16 frames**, no page errors; `captures.json` binds them to the standalone hash. Five beats at 1280×720 and 390×844, endpoints, force details, and 640×360 zoom-equivalent opening/stretch. Capture script is a one-off evidence aid, not a new release gate. |

The integrated Chromium command was:

```sh
npx playwright test test/browser/mvp-preview.spec.js test/browser/stretch.spec.js test/browser/learn.spec.js test/browser/smoke.spec.js test/browser/evidence.spec.js test/browser/ux-overhaul.spec.js --project=chromium --grep-invert '@sweep'
```

It passed all nine smoke tests, including `file://` boot and no-WebGL fallback messaging;
the evidence/learn routes; and the included UX history, semantic-camera, viewport, zoom and
automated-accessibility checks. It **excluded** the large `@sweep` combinatorial UX matrices.
Do not report it as the entire historical SC-27A browser matrix. No fresh Firefox/WebKit result
exists for this candidate yet.

New unit coverage in `test/mvp_preview.test.js` builds local, extended and isolated scenes,
checks public notes against manifest counts, and retains model-verification assertions.
Updated historical fixtures deliberately reflect the new two-camera Tour, retained Research
architecture, rounded Tour force, and corrected N2A wording. The final phase-17 adjustment
checks the passive spring/scaffold distinction in the summary and “not the motor” in the
narration; the completed 617-test verification includes that adjustment.

Desktop beats 1–5, desktop endpoint, mobile opening/stretch/force, and the live desktop force
route were visually inspected. **Remaining stored-frame review:** mobile beats 2/4/5 and
endpoint, the two 640×360 states, and the stored desktop force frame. This is visual QA by an
AI engineer, not a human comprehension result.

## 5. First remaining task: diagnose the pause-start timeout

Failure: `test/browser/stretch.spec.js:123`, “SC24/27A Pause freezes the sweep at an exact
slider value.” After boot → beat 3 → slider 2000 → click Stretch, the test's default
8000 ms poll did not observe a value greater than 2000. It failed at line 129 **before clicking
Pause**, so the result does not establish a failure to freeze after pausing.

Preserved evidence (ordinary Playwright runs overwrite `test-results/`):

- `evidence/mvp-preview/2026-09-05/pause-failure/trace.zip`
- `evidence/mvp-preview/2026-09-05/pause-failure/error-context.md`
- `evidence/mvp-preview/2026-09-05/chromium.log`

The same test passed in an earlier implementation run, and replay/endpoints passed on this
candidate. That is context, **not proof of flakiness**. Additional local build/review work took
place during integrated verification; resource pressure is a hypothesis, not an established cause.

1. Read the trace before changing code. Reproduce in isolation with the existing single worker:

   ```sh
   npx playwright show-trace evidence/mvp-preview/2026-09-05/pause-failure/trace.zip
   npx playwright test test/browser/stretch.spec.js --project=chromium --grep 'Pause freezes' --repeat-each=3
   ```

2. If it fails, inspect the visible play state, slider, announcement, scene URL, page errors,
   page visibility, and the first animation frames. Follow `toggleSweep` → `stepSweep` and
   callers of `stopSweep`, including pointer/keyboard interruptions. Determine whether it
   never starts, is immediately interrupted, or is simply receiving delayed frames.
3. Preserve meaningful assertions: motion must begin, pause must stop below maximum, and the
   length must stay fixed afterward. Also check resume preserves an intermediate value and
   endpoint replay remains explicit. Do not delete the test, enable global retries, or
   increase global timeouts to manufacture green output.
4. If evidence establishes a test-timing issue, make a local, explained readiness/wait change
   and retain the behavioral assertions. If it is a runtime defect, make the smallest fix in
   the existing sweep orchestration and add the specific regression needed.
5. Save the diagnosis and new log under the candidate evidence directory. If isolated runs
   pass, record exactly that; do not label the original result explained without evidence.
   Run the dedicated Stretch/MVP suites in the integrated context before declaring closure.

The already green 69 checks do not need repetition after a **test-only** timing correction.
A runtime change requires a new build and affected integrated coverage, as below.

## 6. Finish validation without restarting the sprint

- Run the main Tour, new replay/force routes and evidence route in a second browser:

  ```sh
  npx playwright test test/browser/mvp-preview.spec.js test/browser/learn.spec.js test/browser/evidence.spec.js --project=firefox
  ```

  Use WebKit instead if that is the intended demonstration browser. Keep the existing timeout
  and engine configuration. If the engine is missing, use the repo's pinned Playwright install
  workflow. Do not claim a second-browser pass based on historical SC-27A logs.

- Check actual export downloads on the standalone candidate:

  ```sh
  npx playwright test test/browser/workbench.spec.js --project=chromium --grep 'browser downloads deterministic bytes'
  ```

  For the presenter walkthrough, use Research → Sources & build and download
  `titin-state.json`, `force-curve.csv`, `regional-extension.csv`, and `claim-support.json`.
  Check their candidate identity and remember unsupported force must remain blank/null, not zero.

- Review the remaining stored frames listed above. If runtime bytes change, recapture the
  affected route after the final build, using the existing local server on port 8000 and
  `node evidence/mvp-preview/2026-09-05/capture.mjs`. Do not overwrite historical SC-27A frames.
- Complete a three-minute Tour and two-minute object → source locator → force → export route
  on the actual intended demo device if available. Record device/browser and outcome. A
  headless browser or zoom-equivalent viewport is not a physical projector/phone check.
- If no human or hardware is available, leave that evidence pending and describe the first
  sharing as guided feedback. Do not invent participants, sign-offs or successful rehearsal.

Known deferrals remain: ineffective Research Large type; selected-object invoker focus in
Research; tooltip/invalid-URL notice omissions in the overlay audit. Fix only if one prevents
the actual promised core demonstration. Ordinary zoom has passed automated route coverage.

## 7. Build discipline if a runtime fix is required

No application edit is required merely to finish these documents or assemble the ZIP.
For a necessary runtime edit:

1. Edit canonical source/data, update focused tests, and use `npm run build && npm run pack`
   for local iteration. Run affected tests and presentation validation where relevant.
2. Commit the final application inputs, then run:

   ```sh
   npm run build:release
   npm run pack
   npm run verify
   npm run verify:identity
   ```

   `build:release` rejects dirty application inputs. Do not weaken that check. Generated
   artifacts are committed afterward; reporting/test commits do not need to alter app revision.
3. Run affected Chromium and second-browser coverage on those exact generated bytes. Broaden
   to the overlay/camera matrix only if the fix changes shared overlay/camera behavior.
4. Reproduce the clean build, update the candidate hashes in `DELIVERY.md`, and bind any new
   screenshots/logs to that candidate. A runtime change invalidates an old artifact hash.

The current successful reproduction used a detached worktree at
`/tmp/titin-preview-repro.grdSOx` (macOS may show `/private/tmp/...`) on `8674dd7`, with a copy
of the pinned `node_modules`. It may still be present; confirm with `git worktree list`.
It is disposable and contains no development edits. Do not use it as the active development
branch. The repo already contains all required build/identity scripts; add no wrapper framework.

## 8. Assemble and check the shareable package

**No distribution ZIP exists at this handoff.** The standalone and generated release directory
exist. The [scientist note](../../../evidence/mvp-preview/2026-09-05/SCIENTIST_NOTE.md) is a draft.

1. Resolve the pause result and update `DELIVERY.md` with completed versus pending evidence.
   Finalize the scientist note and remove its draft-distribution sentence only after assembling
   the actual package. Keep preview/independent-review status explicit.
2. Stage a directory containing `index.html`, the **entire** `release/` tree, `LICENSE`,
   `SCIENTIST_NOTE.md`, and `DELIVERY.md`. Retain required third-party license notices already
   present in the standalone. Put the two note files at the package root, as their instructions
   assume. Do not ship `node_modules`, tests, or the repository's private working metadata.
3. ZIP that directory, compute its SHA-256, then extract it to a fresh temporary directory.
   Compare its `index.html`, manifest and manifest-listed artifacts against the frozen candidate.
   From the repository, run the existing verifier with those **extracted** paths:

   ```sh
   node scripts/verify_artifact_identity.mjs --file /absolute/extracted/path/index.html --manifest /absolute/extracted/path/release/MANIFEST.json
   ```

4. Open the extracted `index.html` using `file://` and complete the primary route offline.
   Open the static fallback slides too. **There is no `release/fallback/index.html`.** The
   fallback consists of six SVGs: `scope.svg`, `architecture.svg`, `extension.svg`,
   `lattice.svg`, `provenance.svg`, `limitations.svg`. They are separate from the text
   `release/LEARN_TRANSCRIPT.md`. Do not introduce a new slide player to finish this sprint.
5. Record the ZIP path/hash and extracted-package results in an external delivery record.
   Avoid putting a ZIP's hash inside that same ZIP; that would create a self-reference.

No hosting destination or scientist recipients were supplied. Do not send messages on the
owner's behalf. If publishing is subsequently authorized to a specific destination, fetch back
the actual hosted bytes with the existing identity verifier's `--url` option and test the route
at that URL. A localhost pass is not hosted parity.

## 9. Definition of done for the junior engineer

- [x] Pause-start timeout investigated and core start/pause/resume/replay behavior verified.
      Trace-diagnosed as host starvation, test-only fix, plus a new resume regression.
- [x] Affected Chromium checks pass with the failure disposition recorded honestly.
      3/3, 9/9, 13/13, then the full integrated command re-run: 71/71, exit 0. The original
      failure is described as unreproduced, not as explained.
- [x] Second-browser Tour/replay/force/evidence route and actual exports checked.
      Three engines, not one: Firefox 18/18 on the preview routes and 9/9 on Stretch, and
      WebKit 27/27 across all four. Plus the download gate and a presenter-route walk on the
      standalone over file://.
- [x] Remaining visual review and available intended-device rehearsal recorded.
      All seven remaining frames reviewed; no demo hardware or participants were available,
      and that is recorded as pending rather than described as done.
- [x] Exact candidate/manifest and model-unchanged checks still hold.
- [x] Scientist note finalized; ZIP assembled, extracted, byte-verified and opened offline;
      static SVG fallback checked. Finalizing the note meant auditing it against
      `data/scientific_scope.json`: its scope sentence asserted `excluded_claims[0]` and was
      corrected. The fallback check found four measured layout defects;
      they are recorded in `FALLBACK_SLIDE_FINDINGS.md`, named in the shipped `DELIVERY.md`,
      and left unfixed because fixing them re-issues the frozen manifest.
- [x] Delivery record has actual checks, remaining limitations, ZIP identity and preview status.
- [x] Source/artifacts/evidence committed on `codex/mvp-preview`; `git status` understood/clean.
- [x] `release_ready` is still false; independent validation is not claimed; no new scope added.

Stop when this checklist is complete. Feedback from the first scientists is the next phase,
not a reason to preemptively expand this sprint.
