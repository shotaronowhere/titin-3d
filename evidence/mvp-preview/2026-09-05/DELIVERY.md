# Scientist-feedback preview delivery — 2026-09-05

**Completion update, 2026-09-06: IMPLEMENTED, VERIFIED AND PACKAGED FOR FEEDBACK.**
This records the checks that were actually run. It is not a declaration that the formal
release gates pass, and it claims no independent scientific or human usability result.
Finish instructions followed: `docs/superpowers/plans/2026-09-06-titin-mvp-preview-finish.md`.

This file travels in the shared package, but everything it links to — logs, traces, frames,
export files and the companion records named below — stays in the project repository under
`evidence/mvp-preview/2026-09-05/`. Those links therefore do not resolve from inside the
package; ask for the repository to read them.

Implementation of the bounded plan was authorized by the project owner on 2026-09-05.
This decision permits a scientist-feedback preview, not a formally validated public
release. `data/release_gates.json` remains unchanged with `release_ready: false`.
Historical SC-27A evidence remains historical; no human approval is inferred from AI work.

## Implemented scope

- Corrected the N2A summary; added the mixed-structure explanation and its existing primary
  sources to the stretch narration. Clarified muscle → sarcomere → one Z-to-M titin route.
- Displayed-scene notes now use built manifest counts. Full lattice verification still runs
  and its descriptor notes remain available internally as `lastVerificationNotes`.
- Explicit endpoint Replay stretch resets to the working-range minimum. Intermediate
  pause/resume, user interruption, URL restoration, and ordinary length preservation remain
  in the implementation, and pause/resume now carries its own browser regression.
- Beat 3 opens in the existing Spring composition. The paired lattice inset stays in Research.
- Tour force is labeled as a modeled estimate. Its action focuses/scrolls to Passive force;
  the detailed sensitivity disclosure sits with the number. Research precision is retained.
- Updated the README and generated transcripts/release pack. Finalized the scientist note and
  assembled the distribution ZIP; its identity is recorded outside the package, in
  [PACKAGE.md](PACKAGE.md), so the archive does not reference its own hash.

The nine model-input files, solver, numerical parameters, geometry construction, scientific
decisions, and formal release gates are unchanged. Presentation/build identities change.

## Candidate and verification

| Identity | Value |
|---|---|
| Branch | `codex/mvp-preview` |
| Application source commit | `557f09aaa6f663b4e1bf958ef6c44357861a4d16` |
| Generated artifact commit | `8674dd7` |
| Model fingerprint | `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6` |
| Build-input fingerprint | `d7970b235a73ab1df2e93e26807cda95cb9b0d769b41eccd4ec2169747cbd33f` |
| `index.html` SHA-256 | `b5ee9beb2ea4f7b9c26dd25d5574018952a4f1518c6af12573e4b758086f4f5e` |
| `release/MANIFEST.json` SHA-256 | `13cb66e61e55cbbc4966219ce22ed35da5cf56b812987c6611d3d59ae6c0d4ac` |

- **PASS:** `npm run verify`, exit 0; **617/617 Node tests**, typecheck, generated-output
  currency, destructive negative controls, scientific/presentation/export/gate validators,
  matrix structure check, and Python structure-pipeline smoke. See [verify.log](verify.log).
- **PASS:** raw artifact identity and artifact-boundary verification. See [identity.log](identity.log).
- **PASS:** clean detached-worktree rebuild of the standalone and release pack; all **23 files**
  compared byte-for-byte and the worktree remained clean. See [reproducibility.json](reproducibility.json).
- **RESOLVED:** the 2026-09-05 integrated Chromium run was **69/70, exit 1**
  ([chromium.log](chromium.log)). The one failure is diagnosed in
  [pause-failure/DIAGNOSIS.md](pause-failure/DIAGNOSIS.md): the preserved trace shows the poll's
  own first `#sl` read taking 10.5 s and returning **2053 nm** two seconds after the 8 s expect
  budget had already expired — the sweep had started and moved, and the assertion never ran.
  Every action in that trace is 5–20× slower than normal, so this is host starvation, not a
  defect. The fix is **test-only**: one explicit 30 s budget on the "sweep has started" poll,
  matching the headroom the supported-maximum assertion has carried since SC-24. No predicate,
  global timeout, retry setting or assertion was changed, and no application input was touched.
- **PASS:** Chromium after that change — the pause test alone `--repeat-each=3` (3/3), the
  whole Stretch suite (9/9), Stretch plus the MVP preview suites together (13/13), and then
  the plan's exact integrated command re-run end to end: **71/71 passed, exit 0**, 16.2
  minutes ([chromium-integrated-final.log](chromium-integrated-final.log)). That is the
  original 70 checks, now all passing, plus one new regression. It was added because nothing
  previously checked that resuming from a paused intermediate length continues from it
  instead of resetting to the working minimum; its predicate was then proved non-vacuous by
  a positive control that ran the same instrumentation against a real endpoint replay and
  correctly reported the reset. Logs in [pause-failure/](pause-failure/).
- **PASS:** all three engines, on these bytes. **Firefox 18/18** across the MVP preview,
  learn and evidence suites ([firefox.log](firefox.log)) — the Tour, endpoint replay,
  reduced-motion replay, the desktop and mobile force route, and the source/claim routes —
  then **Firefox 9/9** on the Stretch suite and **WebKit 27/27** on all four of those suites
  ([engines.log](engines.log)). The plan asked for one second browser; the Stretch and WebKit
  passes were added because the changed and newly added tests live in the Stretch suite and
  had only been exercised on Chromium, and because Safari is the likely engine on a Mac or
  iPad demo and had no result for this candidate. This is three engines on the preview
  routes, not a rerun of the historical SC-27A cross-engine matrix.
- **PASS:** exports. The deterministic-download gate passes on Chromium
  ([downloads.log](downloads.log)), and the presenter route was walked on the **standalone
  candidate over `file://`** — Research → Sources & build → all four download buttons at
  2,400 nm and 1,900 nm. All eight files carry the frozen model fingerprint, app revision,
  build-input and export-contract fingerprints, with `candidate_manifest_verified: true` and
  nine pinned inputs. At the unsupported 1,900 nm state the three force cells are **empty,
  not zero**, with an explicit `not_evaluated` reason. See [exports.json](exports.json),
  [exports.mjs](exports.mjs) and `exports/`.
- **REVIEWED:** the remaining stored frames — mobile beats 2, 4 and 5, the mobile stretch
  endpoint, both 640×360 zoom-equivalent states, and the desktop force frame. The corrected
  N2A and Z-to-M copy reads correctly, the Tour force chip shows `≈1.3 pN · supported ·
  modeled passive force per titin` against a raw central value of 1.2847 pN, the endpoint
  control reads `↻ Replay stretch`, the lattice cross-section is absent from beat 4, and the
  Passive force heading clears the sticky Research tabs. This is AI visual review, not human
  comprehension evidence.
- **CORRECTED:** the scientist note that ships beside this record is the only shipped
  document **not** generated from gated canonical records, so it was audited against
  `data/scientific_scope.json`. Its scope sentence read "the human skeletal-muscle reference
  construct is Q8WZ42-1" — which asserts `excluded_claims[0]`, "that Q8WZ42-1 is a
  tissue-specific human skeletal-muscle isoform", and contradicts the application's own scope
  badge, "no tissue-specific claim". It now names the construct with no tissue assigned and
  disclaims the opposite excluded claim, that titin is isoform- or tissue-neutral. The rest of
  the note holds: the N2A sentence is verbatim from `data/presentation.json`; the supported,
  extrapolated and not-evaluated boundaries match `regime_policy` exactly; the "Why we know
  this" and "Sources for this object" routes exist in the application; and the three-minute
  claim matches the manifest's 186 presenter seconds. The generated release documents were
  checked for the same error and are clean — they use "skeletal" only of the source
  preparations the parameters transfer from.
- **CAPTURED:** 16 frames for all five beats at 1280×720 and 390×844, stretch endpoints,
  force details, and two 640×360 browser-zoom-equivalent states. See [captures.json](captures.json)
  and `frames/`. Captures use reduced motion; they are not physical-device or human evidence.
- **PASS:** the assembled package. The staged directory was zipped, extracted to a fresh
  temporary directory, and the extracted `index.html` and `release/MANIFEST.json` verified with
  `scripts/verify_artifact_identity.mjs`; the extracted primary route and all six static
  fallback slides were then opened offline over `file://`. Identity, path and results are in
  [PACKAGE.md](PACKAGE.md), which is deliberately **outside** the archive.
- **PENDING:** rehearsal on the actual intended demo hardware, any human usability or
  comprehension result, independent scientific validation, and hosted-byte fetchback. No demo
  device, no participants and no hosting destination were supplied for this task, so none of
  these is claimed. The first sharing should be treated as guided feedback, not a rehearsed
  presentation.

The full historical SC-27A cross-engine/330-state matrix was not rerun for this candidate.
The integrated Chromium command explicitly excluded `@sweep` combinatorial UX tests; it
included the dedicated Stretch suite and the new replay regressions. A matrix **structure**
check is not a fresh screenshot-matrix capture.

## Explicit deferrals and limits

Formal SC-27B independent scientific sign-offs, confirmatory participant cohort, human
accessibility review, target-projector/device rehearsal, and repeated zero-finding AI closure
are deferred for this preview. No participant comprehension result or independent scientific
validation is claimed. No external deployment or scientist message was performed in this task.
Hosted-byte verification must be run against the actual URL when published, using the existing
`scripts/verify_artifact_identity.mjs --file index.html --manifest release/MANIFEST.json --url URL`.

Known minor issues retained from the review: Research Large type is ineffective; closing a
selected object does not restore its Research selection invoker; the overlay audit does not
cover the tooltip and invalid-URL notice. Ordinary browser zoom has separate route coverage.
These are recorded, not silently marked fixed.

**The static fallback deck has four measured layout defects, recorded and not fixed.** On
`release/fallback/scope.svg` — the slide the scientist note tells you to open first when 3D
is unavailable — the wrapped line `approximate passive pN per titin` is overprinted by
`Declared working range: 2000–2400 nm` across 400 × 20 px, so both are hard to read. On
`extension.svg` the label `235.4 nm · folded domains straighten` is clipped 83 px past the
right edge, and `Evidence: MODELED …` touches the row below it. On `architecture.svg`,
`bare zone · STRONGLY INFERRED` is clipped by 23 px and renders as `…STRONGLY INFERRE`.
Nothing false is displayed and every claim, number and evidence class is unchanged; these
are legibility defects on the contingency route, and the interactive Tour, Stretch, evidence
and export paths are intact. The measurements, the root cause and the proposed fix are in
`FALLBACK_SLIDE_FINDINGS.md` in the project repository. Fixing them regenerates manifest
artifacts, so it re-issues this frozen candidate's manifest and is an owner's decision.

Two further cosmetic observations from the 2026-09-06 frame review, neither a blocker and
neither fixed: at the 640×360 browser-zoom equivalent the beat-3 card fills the viewport, so
the 3-D stage has to be scrolled to — every core control stays visible and reachable, and
360 px is well below the declared 700 px stage-height envelope; and with Research open at
1280×720 the scope chip truncates the construct name to `Human TT…`, whose full value stays
in Research → Sources & build. The actual intended demo hardware still needs
a short rehearsal, and independent novice comprehension remains untested.

No new isoforms, molecular dynamics, active contraction, signaling animation, uncertainty
model, rendering rewrite, broad redesign, or new review framework was added.

Only a materially misleading scientific statement, a broken Tour/Stretch/evidence/export
path, inaccessible core navigation on the promised platform, or mismatched/broken delivered
bytes reopens this preview. Cosmetic polish and speculative issues go to later work.
