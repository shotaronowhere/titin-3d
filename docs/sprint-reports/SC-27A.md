# SC-27A handoff — five-beat Tour and contextual Research

- Starting commit: `914a3940b276865722396ab29cb9719bc0c88bc3`.
- Engineering status: **IMPLEMENTATION COMPLETE; FINAL FREEZE BLOCKED**. Product, compatibility,
  build, export, accessibility-automation, and evidence-capture work is implemented. Chromium and
  Firefox are green. A full WebKit pass reached 79/80 and the remaining test passed alone, but later
  WebKit reruns became host-blocked before page load under severe memory pressure; this is recorded
  below rather than over-claimed as a clean full-engine pass.
- Human status: **PENDING**. No target-frame reviewer, formative participant, accessibility
  reviewer, scientific expert, projector operator, or final lay participant was invented or
  inferred. Consequently this candidate is not yet eligible for freeze.
- `release_ready` remains `false`. No SC-27B human, expert, hardware, deployment, or release gate is
  claimed.

SC-27A is presentation-only. Scientific coordinates, geometry strategy, force laws, parameters,
claim wording, evidence adjudication, and scientific decisions remain unchanged. The model
fingerprint is still
`7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6`.

## Candidate identity

| Identity | Start | Current generated candidate |
|---|---|---|
| Source revision | `914a3940b276865722396ab29cb9719bc0c88bc3` | `1b72ba022a16aaceb19d209d97e81f3074862c8d` |
| App revision | `5bae463fa933662cc215e7eb994165694236aa4b` | `1b72ba022a16aaceb19d209d97e81f3074862c8d` |
| Build-input fingerprint | `2c216b264d5ae530fd894749ab689c17f79c3c1630be6a44ea674782fafb3a09` | `2fa9a7ef4428ccbeab79841160b4a358b2b8eeb86a9f4ae3a0508b2055cdd907` |
| Model-input-manifest fingerprint | `39e3e31b6fc990289f77bcf08d3fcecaeec24fc2701374a3086256cecd102c25` | unchanged |
| Model fingerprint | `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6` | unchanged |
| Standalone SHA-256 | `01f195e5186b5a6e1997e16d71f109de717ae1906c93a88e9fb142a328bd88b9` | `6efc5c10ebc35959c190ebf3b26c93c6e414b4e3a8c794b0cb1cb9d4d7cf3508` |
| Detached manifest SHA-256 | n/a | `e324417a3de1f10db663b05f72b911bf7712b92e8838967ccc4efb7895dbb896` |
| Export-contract fingerprint | `a081b2a893b717ea345697c27f1edb074f0cb4d50f2e93dbd0604239c1f8c843` | unchanged |

The final column is the verified generated engineering candidate. It is not a release-freeze
identity because the explicitly human prerequisites below remain pending.

## Design result

The former seven-chapter Learn surface is now a five-beat Tour with one visual question, one short
visible summary, one primary forward transition, a single Previous/Next vocabulary, and Replay at
the end. The scientific stage is the hero: the persistent stage bar and More dialog no longer
compete with it. Mechanics appear in beat 3 only. A geometry-derived locator keeps the complete
Z-disc-to-M-line route truthful while the camera shows a representative half-route.

Research is a bounded desktop drawer and a full-screen mobile sheet. It owns four contextual tabs:
Inspect, Measure, Evidence, and Sources & build. Direct Titin, Myosin, and Actin labels select stage
objects; the compact object card gives a name, lay explanation, evidence chip, and one “Why we know
this” route into the full claim and exact sources. Closing Research restores focus to its invoker.

The visual system has a single declaration in `data/render_style.json`: a dark scientific-stage
gradient, muted contextual filaments, reserved pink titin identity, a non-scientific screen-space
halo/contour, restrained chrome, visible focus, and reduced-motion parity. No geometry width or
evidence class changes with presentation emphasis.

## Five-beat migration and aliases

| Order | Canonical v3 beat | Purpose | Silently migrated v1/v2 IDs |
|---:|---|---|---|
| 1 | `meet_sarcomere` | Define the unit; separate actomyosin motor function from titin | `orientation` |
| 2 | `follow_titin` | Trace one titin from Z-disc to M-line and name its anchors | `anchors`, `inspect_anchors` |
| 3 | `stretch_spring` | Compare extension and passive mechanics | `architecture`, `molecular_architecture`, `elastic_regions` |
| 4 | `scaffold_thick_filament` | Show A-band/thick-filament scaffold context | `anchored_scaffold` |
| 5 | `knowledge_recap` | Recap claims, evidence language, limitations, and provenance | `evidence_audit`, `provenance_pipeline` |

Every canonical beat has exactly one visual question, one single-sentence visible summary of no more
than 30 words, complete narration, one forward action, registered claims/sources, and an explicit
semantic scene. URL v2 aliases canonicalize directly to these IDs without an intermediate state.

## Old control and export migration inventory

| Former path/control | SC-27A destination | Disposition |
|---|---|---|
| Learn / Explore audience toggle | Tour is the default; `Research` opens the workbench | Renamed and simplified |
| Story reopen and Hide story | Compact Tour card remains present | Obsolete collapse controls hidden |
| Seven chapter dots / chapter metadata | Five noninteractive progress marks and “Beat n of 5” | Replaced |
| Per-chapter action row | Sole `Next` transition | Duplicate actions removed |
| Previous / Next | Previous / Next | Retained as the only Tour navigation vocabulary |
| Restart | Final-beat `Replay` | Replaced contextually |
| Restore previous view | Research-only contextual restore appears after a real manual camera gesture | Retained without adding Tour chrome |
| Chapter Evidence | Beat-5 chips or contextual Research Evidence | Migrated |
| Persistent length slider and Play/Reset/Force | Beat-3 slider, Stretch, and force route; full detail in Research Measure | Contextualized |
| Persistent scene/ring/myosin controls | Research Inspect → All scenes and display controls | Retained contextually |
| Persistent colour legend | Direct labels plus Research Inspect inventory | Replaced without losing selection |
| More dialog | Four Research tabs | Removed as duplicate navigation |
| More → Inspect / Measure / Sources | Matching Research tabs | Retained |
| Keyboard help | Accessible canvas description plus presenter script | Retained nonvisually; accelerators are not painted as a second Tour vocabulary |
| Object previous/next carousel | Direct labels and Research inventory | Removed as incidental carousel chrome |
| Object full-detail / source buttons | One `Why we know this` route → selected Evidence → exact Sources | Consolidated |
| Object expert-card shortcut | Contextual Research Evidence inventory | Removed as a duplicate route; the expert cards remain present |
| Picked-instance line | Research Inspect exact locator | Removed from the compact object card and retained in the specialist path |
| Hint dismiss button | Hint clears on the first real selection | Removed to avoid spending a fifth cold-open control |
| Text scale / close | Research header | Retained |
| Filament context toggle | Research Inspect | Retained |
| Regions and annotations | Research Inspect inventory | Retained |
| Confidence display | Research Evidence | Retained |
| Value/object/scene/chapter/all source filters | Research Sources & build | Retained |
| Reproduction worksheet and build identities | Research Sources & build | Retained |
| Copy canonical URL-v2 link | Research Sources & build | Retained |
| `titin-state.json` | Research Sources & build | Retained deterministically |
| `force-curve.csv` | Research Sources & build | Retained deterministically |
| `regional-extension.csv` | Research Sources & build | Retained deterministically |
| `claim-support.json` | Research Sources & build | Retained deterministically |

Hidden compatibility nodes remain only where existing state bindings require them; they are not
painted or tabbable and do not consume the Tour budget.

## Before/after UX diagnostics

These are automated diagnostics, not human quality judgments.

| Viewport | Baseline tabbable chrome | SC-27A visible / tabbable chrome | Baseline known overflow | SC-27A horizontal overflow | Tour story scroll |
|---|---:|---:|---|---:|---|
| 375×812 | 20 | 4 / 3 | stage header, stage controls | 0 px | 112 / 112 px |
| 390×844 | 20 | 4 / 3 | stage header, stage controls | 0 px | 112 / 112 px |
| 768×1024 | not captured | 4 / 3 | not captured | 0 px | 90 / 90 px |
| 1024×768 | not captured | 4 / 3 | not captured | 0 px | 139 / 139 px |
| 1280×720 | 27 | 4 / 3 | SR-only announcement only | 0 px | 117 / 117 px |
| 1440×900 | 27 | 4 / 3 | SR-only announcement only | 0 px | 117 / 117 px |

Cold-open visible word count is 91–92 at narrow/tablet sizes and 104 at desktop sizes. No measured
header/story overlap occurs. Two distinct diagnostics are recorded without conflating them:
chrome-free stage area is 65.35–85.42%, while actual composed scientific pixels occupy 4.62–8.66%
of the stage and span a 57.14–83.23% bounding box. The latter is measured by pixel-differencing each
composed stage against the same frame with WebGL geometry and the scientific SVG overlay hidden.
At all six release viewports the cold open is within the exact four-visible / three-tabbable
contract, and the dense beat-3 mechanics state keeps its force readout and Next action inside the
card with no story scroll or horizontal overflow.

The final capture manifest contains 25 software-composition candidates: all six release viewports,
all five beats, beat 3 before/after stretch, selected Titin, four Research contexts, mobile Research,
200%-equivalent browser reflow (640×360 CSS pixels at device scale 2, producing a 1280×720 image),
reduced motion, grayscale, protanopia, deuteranopia, tritanopia, and projector composition. Every
capture remains
`PENDING — human visual review not performed`.

## Palette and contrast

Ratios are recomputed after 8-bit rounding by `validate_render_style.py` and sampled again in the
browser suite. They describe presentation separation; filament-object ratios below 3:1 are
intentional non-text context and are never the only identity cue.

| Pair | Ratio |
|---|---:|
| Titin `#ff5d7d` / lightest stage `#0e1116` | 6.406:1 |
| Thick filament `#3f454c` / lightest stage | 1.951:1 |
| Myosin head `#41464c` / lightest stage | 1.986:1 |
| Thin filament `#636b67` / lightest stage | 3.449:1 |
| Thin / thick filament | 1.767:1 |
| Thin filament / myosin head | 1.737:1 |
| Titin dominance margin over the strongest context object | 1.858× |

Text/focus contrast and rendered backgrounds are automated. Grayscale and three declared
linear-RGB colour-vision software compositions are captured as diagnostics only; they do not claim
perceptual fidelity or replace the required human visual/colour review, which remains pending.

## Picking and hit-grid review

The hero camera intentionally changed the fixture camera name from `titin_story` to `titin_hero`;
the scientific targets and sampling grid did not change. The regenerated 14-cell fixture contains
7,562 samples, 5,174 intended targets, and 5,150 intended resolutions: **99.54%** aggregate. Rings 0
through 4 resolve at 100%; ring 8 resolves at 98.99%. The only 95.38% cell is the compact mobile
lattice view, where missed samples resolve through the declared nearest-visible-context policy.
Chromium, Firefox, and WebKit produce the same counts. Projected labels have coarse invisible SVG
hit areas; blank stage gestures share that SVG interaction plane with orbit/pan/zoom and
deterministic picking. WebKit's SVG-root event targeting is handled by a geometric hit-area fallback
that dispatches the same label action and does not broaden the scientific ray-picking policy.

## Test-contract triage

| Touched assertion surface | Classification | SC-27A disposition |
|---|---|---|
| `test/browser/controls.spec.js` | Contract + incidental | Preserved state, keyboard, focus, URL, source, mobile-sheet, and target-size assertions; replaced obsolete stage-bar/More placement and the old generic unobscured-area ratio with named cold/dense-state layout checks plus a composed-geometry diagnostic. |
| `test/browser/evidence.spec.js` | Contract | Re-routed object detail, claim fields, exact sources, focus restoration, and desktop/mobile research inventory through contextual Research without weakening content assertions. |
| `test/browser/learn.spec.js` | Contract + incidental | Preserved narration, claims, semantic state, and transcript coverage; replaced seven-chapter/dot/control-row assumptions with the five canonical beats and sole continuation. |
| `test/browser/picking.spec.js` | Contract | Preserved pointer/keyboard picking, selection truth, hit-grid semantics, and direct-label operability; made pointer clicks exercise the painted label centre and coarse SVG hit target. |
| `test/browser/stretch.spec.js` | Contract | Preserved length/mechanics/state/history assertions; moved the public stretch route into beat 3 and force detail into Research Measure. |
| `test/browser/workbench.spec.js` | Contract | Preserved expert Inspect/Measure/Evidence/Sources inventory, exact claims, offline sources, exports, and deep-link behavior under the renamed Research workbench. |
| `test/browser/smoke.spec.js` | Contract + incidental | Preserved boot, contrast, drawer/sheet, focus, and responsive smoke checks; replaced obsolete Explore/old story chrome selectors. |
| `test/browser/ux-overhaul.spec.js` | New contract | Added six-viewport cold and beat-3 budgets, force containment, unique action, no story scroll/overlap/overflow, contextual source path, mobile single-scroll sheet, rendered canonical-class disclosure, reduced-motion parity, 200%-equivalent reflow, double-fire prevention, and axe scans across cold, mechanics, recap, and Research states. |
| `test/presentation.test.js` | Contract | Migrated schema/order/alias/source assertions to presentation v3 and exactly five beats. |
| `test/showcase_phase2.test.js` | Contract | Updated canonical initial scene/beat and added shipped Guided-contour endpoint coverage while retaining model and state truth. |
| `test/showcase_phase7.test.js` | Contract + incidental | Preserved presentation integrity; replaced seven-chapter and duplicate action expectations with v3 constraints. |
| `test/showcase_phase8.test.js` | Contract | Preserved alias, URL, transcript, source, visual-matrix, and release-pack behavior for the new IDs and 48 cells. |
| `test/showcase_phase9.test.js` | Contract | Updated presentation schema identity only. |
| `test/showcase_phase11.test.js` | Contract | Updated initial canonical story state only. |
| `test/showcase_phase12.test.js` | Contract + incidental | Re-routed focus/visibility/Research structure checks and removed assumptions about the deleted persistent stage bar. |
| `test/showcase_phase13.test.js` | Contract | Updated the Research naming/path while preserving source behavior. |
| `test/showcase_phase15.test.js` | Contract | Updated the semantic chapter mapping while retaining render-style/science assertions. |
| `test/showcase_phase17.test.js` | Contract | Updated presentation schema identity and made the accelerator test accurately assert the nonvisual accessible canvas description. |
| `test/showcase_phase18.test.js` | Contract | Updated the current canonical story step only. |
| `test/showcase_phase23.test.js` | Contract | Replaced the seven-chapter curriculum contract with exactly five beats, aliases, narration, claim/source closure, and one action. |
| `test/showcase_phase24.test.js` | Contract | Updated Tour interaction-surface and camera expectations while retaining camera/state truth. |
| `test/showcase_phase25.test.js` | Contract | Updated direct-label hit-surface expectation, retained picking policy/target identity, and added byte-identical clean-room SC-25 evidence regeneration. |
| `test/showcase_phase26.test.js` | Contract | Retained deterministic exports and now requires every downloaded JSON public binding to resolve directly against the current candidate. |
| `test/showcase_phase27a.test.js` | New contract | Locks protected-input digests, exact model fingerprint, the data-owned public-binding migration, v2 non-claim preservation, evidence-language mapping, control-budget declaration, palette declaration, and `release_ready: false`. |

The only deleted assertions were incidental claims about removed button existence/placement,
seven-dot progress, duplicate action rows, or the More dialog. Scientific state, URL, export, source,
accessibility, picking, evidence, and deterministic-build assertions were retained or strengthened.

## Verification matrix

| Gate | Final-source result |
|---|---|
| Protected-input digest audit | **PASS** — all 11 named files match start; `docs/scientific-decisions/**` has no diff |
| Model fingerprint | **PASS** — exact SC-26 value `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6` |
| `npm test` | **PASS** — 606/606 Node tests on the final source |
| `npm run verify` | **EXPECTED NONZERO AT HUMAN GATES** — all preceding generated-input checks, 606 Node tests, destructive controls, and JS/Python validators passed; `validate:gates` truthfully rejected seven outstanding human/release sections |
| `npm run verify:sc27a` | **EXPECTED NONZERO AT HUMAN GATES** — 175/175 focused unit/contract tests plus negative controls and preceding validators passed; the command then stopped at the same seven outstanding release gates |
| `check:hitgrid` | **PASS BEFORE FINAL CSS-ONLY ADJUSTMENT** — 7,562 samples / 14 cells; 5,150/5,174 intended samples resolved. No picking/model/fixture input changed afterward. A redundant final-source rerun later timed out at `page.goto` under the same host memory pressure, before exercising a sample. |
| `check:matrix` | **PASS** — 48 reproducible cells |
| Chromium | **PASS** — full 80/80; after the final two engine-neutral layout adjustments, all 21 affected Stretch/SC-27A browser scenarios passed again |
| Firefox | **PASS** — full 80/80 on the final source |
| WebKit | **HOST-BLOCKED FOR A SINGLE CLEAN FULL RUN** — full 79/80, with only reduced-motion Stretch outstanding; that test then passed 1/1 alone. Later fresh-worker reruns stalled in `setViewportSize` before application load while the 8 GB host had about 60 MB free and roughly 3 GB occupied by compressed memory. No product assertion reproducibly fails. |
| Build / pack / identity | **PASS** — standalone and 22-output release pack current; embedded inputs and post-candidate evidence disjoint |
| Offline file/HTTP and denied external network | **PASS** — source/standalone/file boot and local locator/claim export remain operational with external network denied |
| Final UX capture audit | **PASS (automated diagnostics only)** — 25 captures, 6 viewport records, zero horizontal overflow/cold-open header-story collision; every reviewer disposition remains PENDING |
| Human accessibility / visual review | PENDING — SC-27A/SC-27B human work |

Final-source browser coverage ran against build-input fingerprint `2fa9a7ef4428…` and standalone
SHA-256 `6efc5c10ebc3…`. Chromium's full pass preceded only the final 2 px cross-engine label reserve and
30 px tablet badge cap increase; the complete 21-test surface affected by those two adjustments
passed on the final source. Firefox's full pass and all WebKit runs used the final source.

## Protected-input proof

| Protected file | Start/current SHA-256 |
|---|---|
| `data/sarcomere.json` | `de959c99df017ab61760b0dae934e02dca2727e06b6c99cc9e56ae6815d30e0a` |
| `data/titin.json` | `7d060801a816aacd864e0c16c390154f0457b58a5881cf4caa620c2bf77fdca9` |
| `data/titin_sequence_features.json` | `93ddde035429517cd2448182717df2177ce82e75b0f64c650bd958ad805cddc5` |
| `data/structural_states.json` | `569713b992b5d3dbaa26af59afefab76a7f05763735c94b8fbef76408738cf9a` |
| `data/geometry_sources.json` | `060978ad60b8d3a36f0e13befaaa0070195d4852da16cdb0ae24a072bd36e6ff` |
| `data/geometry_strategy.json` | `7d9836233d05cec540fb67b6a908a20ac579b86c30f393865a1f0a3bbd900e0f` |
| `data/context_measurements.json` | `1a2aedd179ba16eb6cca150b7d114aeb382e1c2414dca8b52e906ae6ad9e42d7` |
| `data/domain_backbones.json` | `62ae7aea19d8ac5ae6e88e5ff41b283daefe2a5de61fb18840bb872ec8f71d82` |
| `data/mechanical_parameters.json` | `c7fbf33ce82469f1fc346526e58e84c7c5434ad2b926ed05c37d27c443414cc3` |
| `data/claim_support.json` | `f4fb9575dbdabad76d9eadc57bde0fa9dc46d6d3b5df3081abf592351a6227d4` |
| `data/scientific_decisions.json` | `52e6a97c3cb8001c685d04d3684cc835ef8f58b44749ef522777f664d3118de5` |

Presentation alias and public-binding migration are isolated in one machine-readable record in
`data/presentation.json`; the runtime, Python validator, inventory generator, and deterministic
Research export consume that same record. The protected claim ledger is not edited, while the
downloaded `claim-support.json` exposes only current, directly resolvable public pointers. The SC-25
evidence generator freezes only the historical 0.20 halo-opacity field pinned by protected decision
`SD-05`; trace width, halo radius, evidence-opacity invariance, meaning, depiction, and picking fields
still regenerate from the live renderer. The SC-27A UX audit separately records the current 0.28
presentation halo. Generated captures, transcripts, manifests, and this report are not model inputs.

## Senior review and remediation

Claude Code 2.1.226, using Claude Opus at high effort in read-only planning mode, reviewed the full
working diff against the SC-27A design and implementation plan. It reported no P0 and confirmed the
model/protected-input/release-readiness boundaries. The review and finding-by-finding disposition
are preserved in `evidence/ux/SC-27A/CLAUDE-SENIOR-REVIEW.md`. Its reproducible findings were
remediated:

- restored dead `titin_hero` band brackets and all v2 scientific non-claims;
- centralized legacy claim-pointer migration and canonicalized downloaded claim exports;
- contained and raised the beat-3 force metadata to 12 px;
- replaced the fake CSS `zoom` capture with zoom-equivalent reflow and a browser gate;
- made every non-halo SC-25 audit field live and clean-room reproducible;
- removed the duplicate Guided palette authority and source-substring validation;
- expanded dense-state, axe, rendered evidence-language, and pointer double-fire coverage;
- made all five evidence definitions visible in beat 5 without ARIA live-region spam;
- recorded the actual composed-geometry share instead of relabeling chrome coverage; and
- corrected nonvisual keyboard-help tests/reporting and the narrow visible scope label.

The expanded axe scan then found and drove one additional fix: the exact reference strip is now an
accessible group rather than an image role containing nested buttons. Claude's suggestion that only
two removed IDs should migrate silently was rejected because the governing design explicitly says
all removed chapter IDs migrate without warning and existing aliases continue to canonicalize.
A post-remediation Claude re-review was requested; the long first client returned no response and a
bounded retry reported an expired CLI login. No second verdict is fabricated or implied.

## Formative findings and remaining limitations

There are no formative findings to anonymize because no real participant or specialist walkthrough
occurred. `evidence/ux/SC-27A/targets/README.md` and
`evidence/ux/SC-27A/formative/README.md` truthfully record the missing work and link blank,
identity-bound human review worksheets. This means the checklist
items “target frames reviewed before implementation” and “no unresolved recurring formative
failure” are not satisfied.

Remaining non-engineering work before candidate freeze:

1. obtain a human disposition on the target/final frame set;
2. conduct two or three titin-naive formative sessions and the specialist workflow with real people;
3. remediate any recurring Critical or Major finding and rerun affected automated/capture routes;
4. rerun the exact Task 10 command sequence after any remediation.

SC-27B then owns human accessibility review, the preregistered five-person final cohort, independent
sequence/mechanics review, physical projector rehearsal, deployment parity, and the release decision.

## Freeze disposition

**BLOCKED — do not freeze yet.** Automated engineering is complete and the scientific identity is
preserved, but SC-27A's real-human target/formative prerequisites have not occurred.
`release_ready: false` is therefore the only truthful state.
