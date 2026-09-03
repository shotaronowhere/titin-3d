# SC-27A handoff — five-beat Tour and contextual Research

- Starting commit: `914a3940b276865722396ab29cb9719bc0c88bc3`.
- Engineering status: **IMPLEMENTATION VERIFIED; INDEPENDENT CLOSURE PENDING; FINAL FREEZE
  BLOCKED**. Product, compatibility, build, export, accessibility-automation, and evidence-capture
  work is implemented. The candidate passes the complete 138-test Chromium SC-27A surface plus
  9/9 standalone smoke tests and the complete 80-test SC-27A UX surface in both Firefox and WebKit.
  Engineering closure is not claimed until an independent review returns zero actionable findings;
  the most recent such review is the Codex round recorded in
  `evidence/ux/SC-27A/CODEX-SENIOR-REVIEW.md`, which has not yet returned zero.
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
| Source revision | `914a3940b276865722396ab29cb9719bc0c88bc3` | `f40cc66e891c2843b2d8ecbe66a2fcded995ecae` (verified application source) |
| App revision | `5bae463fa933662cc215e7eb994165694236aa4b` | `f40cc66e891c2843b2d8ecbe66a2fcded995ecae` |
| Build-input fingerprint | `2c216b264d5ae530fd894749ab689c17f79c3c1630be6a44ea674782fafb3a09` | `5ff8017125a9fbde0aedc693f11c13c0dbe17d163bc0a1cf1839b8af5fe02305` |
| Model-input-manifest fingerprint | `39e3e31b6fc990289f77bcf08d3fcecaeec24fc2701374a3086256cecd102c25` | unchanged |
| Model fingerprint | `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6` | unchanged |
| Standalone SHA-256 | `01f195e5186b5a6e1997e16d71f109de717ae1906c93a88e9fb142a328bd88b9` | `f63157c6d5cbbf022ab375d444562eb1d0d40e4c3923d058df452186a1a0ee3b` |
| Detached manifest SHA-256 | n/a | `83bdf50ab47c2dd9c632ff245e8ebeba957611782fe60bb0a8b36f74b5576cfa` |
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
objects; the compact object card gives a name, lay explanation, evidence chip, visible canonical
class disclosure where the Guided label groups two classes, and one “Why we know this” route into
the full claim and exact sources. Closing Research restores focus to its invoker.

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
| Persistent length slider and Play/Reset/Force | Beat-3 slider, Stretch, and force route; full detail in Research Measure | Slider/Stretch/Force contextualized; dead duplicate Reset removed |
| Persistent scene/ring/myosin controls | Research Inspect → All scenes and display controls | Retained contextually |
| Persistent colour legend | Direct labels plus the Research Measure structure key | Replaced without losing pointer, keyboard, or touch selection |
| More dialog | Four Research tabs | Removed as duplicate navigation |
| More → Inspect / Measure / Sources | Matching Research tabs | Retained |
| Keyboard help | Accessible canvas description plus presenter script | Retained nonvisually; accelerators are not painted as a second Tour vocabulary |
| Object previous/next carousel | Direct labels and Research inventory | Removed as incidental carousel chrome |
| Object full-detail / source buttons | One `Why we know this` route → selected Evidence → exact Sources | Consolidated |
| Object expert-card shortcut | Contextual Research Evidence inventory | Removed as a duplicate route; the expert cards remain present |
| Picked-instance line | No replacement | Removed; Research Inspect retains object, region, mapped-feature, render, and claim detail without promising instance-level output |
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

The permanently hidden legacy UI branches identified during review were removed with their event
handlers, writes, and orphaned styles. Backward compatibility is data-level URL alias migration,
not hidden DOM controls.

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

Cold-open visible word count is 87 at narrow/tablet sizes and 99 at desktop sizes. No measured
header/story overlap occurs. Two distinct diagnostics are recorded without conflating them:
chrome-free stage area is 65.35–85.42%, while actual composed scientific pixels occupy 4.19–8.30%
of the stage and span a 56.66–82.80% bounding box. The latter is measured by pixel-differencing each
composed stage against the same frame with WebGL geometry and the scientific SVG overlay hidden.
At all six release viewports the cold open is within the exact four-visible / three-tabbable
contract, and the dense beat-3 mechanics state keeps its force readout and Next action inside the
card with no story scroll or horizontal overflow.

Rendered semantic-camera checks cover all five beats at all six release viewports. A separate
exhaustive gate covers every supported combination of 5 beats × 7 semantic scenes × 6 release
viewports = 210 settled states in Chromium, Firefox, and WebKit. It measures every painted SVG text
family—scale, identity, locator, termini, and the visible first-use hint—using a 3 px both-axis
tolerance; exact hint intersections are rejected. It also verifies the two Z-disc boundaries,
M-line, locator anchors, truthful visible-span rectangle, reachable titin path, viewport bounds,
and header/story clearance.

That 210-state matrix has exactly three axes and no more. Every one of its states is a Tour
(`depth=learn`) state at `sl=2200`, entered directly at one beat, with the viewport fixed for the
lifetime of the state. It therefore says nothing on its own about crossing a beat boundary, about
Research, about the stretch range, or about any mid-session viewport change. Four separate gates
cover those axes, each in Chromium, Firefox, and WebKit:

| Axis the 210-state matrix cannot see | Gate |
|---|---|
| Beat-to-beat transitions through `hashchange`/`popstate` | Browser Back/Forward across the beat-4 → beat-5 boundary at all six release viewports, with the console-error contract live |
| Mid-session viewport and orientation change | Research opened, then resized in both directions at 768×1024 ↔ 1024×768 and 375×812 ↔ 1280×720 |
| Research (`depth=explore`) overlay states | Every beat × scene at each visible desktop Research viewport |
| Viewport heights below the declared envelope | Every beat at 375×667, 390×684, and 360×640 |

Within those gates the frame contract is: transition frames may temporarily mark movable labels
pending while the semantic camera is moving, and every settled frame must reach one of three
explicit terminal verdicts — `resolved`, `hidden` when mobile Research's full-screen sheet makes
the canvas inert and invisible, or `suppressed:compact-stage` below the governed
`compact_stage_height_px` envelope, where the free band between stage header and Tour card cannot
hold the rail honestly. No settled frame may paint an overprint, and none may stay `pending` or
`unresolved`. `data-label-layout` carries that all-family verdict; `data-terminus-layout` carries
the narrower verdict of the two movable terminus labels, which is the only family the resolver
moves.

The final capture manifest contains 25 software-composition candidates: all six release viewports,
all five beats, beat 3 before/after stretch, selected Titin, four Research contexts, mobile Research,
200%-equivalent browser reflow (640×360 CSS pixels at device scale 2, producing a 1280×720 image),
reduced motion, grayscale, protanopia, deuteranopia, tritanopia, and projector composition. Its
Chromium overlay matrix separately records 330 settled states — 210 Tour beat/scene/viewport
states, 105 desktop Research states, and 15 compact-height states — with zero collisions and zero
covered science labels. Three hundred and twenty-seven reach `resolved` on both the all-family and
terminus verdicts; the three compact-height exceptions record `suppressed:compact-stage` on the
family whose lane the Tour chrome consumes, and all 330 place the first-use invitation. The audit
also records two Research viewport round-trips and one mobile beat-4 → beat-5 history round-trip
with their per-state verdicts. Every capture remains
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
7,562 samples and 5,174 intended targets; `check:hitgrid` reproduces those static fixture counts.
Separately, the final Chromium pointer-path run resolves 5,150 of 5,174 intended samples:
**99.54%** aggregate. Rings 0 through 4 resolve at 100%; ring 8 resolves at 98.99%. The only 95.38%
cell is the compact mobile lattice view, where missed samples resolve through the declared
nearest-visible-context policy. Projected labels have coarse invisible SVG hit areas; blank stage
gestures share that SVG interaction plane with orbit/pan/zoom and deterministic picking. WebKit's SVG-root event
targeting is handled by a geometric hit-area fallback that dispatches the same label action and does
not broaden the scientific ray-picking policy.

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
| `test/browser/ux-overhaul.spec.js` | New contract | Added six-viewport cold and beat-3 budgets, force containment, unique action, no story scroll/overlap/overflow, rendered beat-1/2/5 semantic-camera and visible-span checks, contextual source path, mobile single-scroll sheet, Guided canonical-class disclosure, reduced-motion parity, 200%-equivalent reflow, double-fire prevention, and WCAG 2.0/2.1/2.2 axe scans across cold, mechanics, recap, and Research states. |
| `test/presentation.test.js` | Contract | Migrated schema/order/alias/source assertions to presentation v3 and exactly five beats. |
| `test/showcase_phase2.test.js` | Contract | Updated canonical initial scene/beat and added shipped Guided-contour endpoint coverage while retaining model and state truth. |
| `test/showcase_phase7.test.js` | Contract + incidental | Preserved presentation integrity; replaced seven-chapter and duplicate action expectations with v3 constraints. |
| `test/showcase_phase8.test.js` | Contract | Preserved alias, URL, transcript, source, visual-matrix, and release-pack behavior for the new IDs and 48 cells. |
| `test/showcase_phase9.test.js` | Contract | Updated the handoff vocabulary check from retired Guided naming to the current Tour/Research surfaces. |
| `test/showcase_phase11.test.js` | Contract | Updated initial canonical story state only. |
| `test/showcase_phase12.test.js` | Contract + incidental | Re-routed focus/visibility/Research structure checks and removed assumptions about the deleted persistent stage bar. |
| `test/showcase_phase13.test.js` | Contract | Updated the Research naming/path while preserving source behavior. |
| `test/showcase_phase15.test.js` | Contract | Updated the semantic chapter mapping while retaining render-style/science assertions. |
| `test/showcase_phase17.test.js` | Contract | Updated presentation schema identity and made the accelerator test accurately assert the nonvisual accessible canvas description. |
| `test/showcase_phase18.test.js` | Contract | Updated the canonical story step and removed a dead `.object-sources` term from the live source-link contrast selector check. |
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
| `npm test` | **PASS** — 616/616 Node tests on the final source |
| `npm run verify` | **PASS** — all generated-input checks, 616 Node tests, destructive controls, and JS/Python validators pass; pending human/release sections are truthfully represented and reject unsupported readiness claims |
| `npm run verify:sc27a` | **PASS** — 185/185 focused unit/contract tests, all negative controls, presentation/style/gate validators, hit grid, 48-cell matrix, and artifact identity |
| `check:hitgrid` | **PASS ON FINAL APP SOURCE** — the static fixture reproduces exactly: 7,562 samples, 5,174 intended targets, 14 scene cells |
| Chromium pointer resolution | **PASS** — browser ray-picking resolves 5,150/5,174 intended samples (99.54%); reviewed miss dispositions unchanged |
| `check:matrix` | **PASS** — 48 reproducible cells |
| Chromium | **PASS** — 147/147 in one uninterrupted pass: 138 SC-27A browser tests plus 9 standalone smoke tests |
| Firefox | **PASS FOR THE COMPLETE FINAL AFFECTED SURFACE** — 80/80 SC-27A UX tests |
| WebKit | **PASS FOR THE COMPLETE FINAL AFFECTED SURFACE** — 80/80 SC-27A UX tests |
| Build / pack / identity | **PASS** — standalone and 22-output release pack current; embedded inputs and post-candidate evidence disjoint |
| Offline file/HTTP and denied external network | **PASS** — source/standalone/file boot and local locator/claim export remain operational with external network denied |
| Final UX capture audit | **PASS (automated diagnostics only)** — 25/25 unique captures match their recorded SHA-256, 6 viewport records, and a 330-state Chromium overlay matrix (210 Tour, 105 Research, 15 compact-height) has zero label or hint collisions and zero covered science labels, with every state placing the first-use invitation; every human reviewer disposition remains PENDING |
| Human accessibility / visual review | PENDING — SC-27A/SC-27B human work |

Final-candidate browser coverage ran against build-input fingerprint `5ff8017125a9…` and standalone
SHA-256 `f63157c6d5cb…`. The embedded application revision is the exact verified source commit
`f40cc66`.

Two browser routes carry an explicit extended budget rather than the default per-test timeout: the
1440×900 shell gate, which walks all five beats through real animated camera transitions, and the
SC-26 handoff gate, which boots five times around twenty file downloads. Both pass every assertion;
only their duration exceeds the shared default.

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

The bounded post-remediation Claude retry succeeded after the earlier CLI login failure. It
re-verified all 14 findings (13 fixed, one partial) and judged the engineering implementation
complete, while correctly retaining the automated-WebKit and human/freeze qualifications. Its one
P2, four P3 cleanup findings, and semantic-camera coverage gap were then remediated: Guided selected
objects disclose their canonical inference class without changing the five-label curriculum; dead
hidden branches and beat-4's inert bracket declaration are gone; axe includes WCAG 2.1/2.2 AA tags;
and the six-viewport rendered camera gate described above now passes in Chromium, Firefox, and
WebKit. The exact review and dispositions are recorded in
`evidence/ux/SC-27A/CLAUDE-SENIOR-REVIEW.md`.

The next authenticated Claude deep review found no P0/P1 and judged the engineering implementation
complete, but reported two P2 and eleven P3 correctness, cleanup, documentation, and gate-quality
items. All thirteen were remediated in `3bb85c0` and `dd54521`: generated release vocabulary and
screen-reader progress now say Tour/Research/Beat; the false picked-instance promise is gone; the
hit-grid attribution is precise; dead UI and `locatorTicks` code are removed; exactly five recap
definitions were shortened; label safe areas and label-box constants agree; Guided/Research
inference disclosure is symmetric; contrast records are bound to canonical palette roles; all five
beats are shell-gated; and locator assertions use rendered SVG geometry. The release validator now
has 27 destructive mutations, including absent-colour and role-swap controls.

After these fixes, `npm run verify`, `npm run verify:sc27a`, Chromium 86/86, Firefox 19/19, WebKit
19/19, and the 25-capture audit all pass. The final Claude closure result belongs in the companion
review file; none of this changes the pending human/release sections or `release_ready: false`.

An authenticated closure attempt then returned a contradictory headline: it said PASS while also
reporting one P2 and five P3 actionable findings. It was therefore treated as a failed review, not
as approval. All six findings were remediated in app commit `8586a5c`: the release gate now names
the actual Research Measure structure key and browser coverage exercises it by pointer, keyboard,
and touch; permanently hidden legacy nodes, handlers, render paths, vocabulary, and styles were
removed; the generated transcript says Tour; focus/overflow coverage dynamically visits every
visible enabled shell control; viewport assertions require full containment; and the Tour recap has
an explicit accessible group role. A stale SC-21 test that still required the deleted extension
chart was corrected in test-only commit `061ad45` to lock the current Measure contribution table.

On this rebuilt candidate, `npm run verify` passes 606/606, `npm run verify:sc27a` passes 175/175,
Chromium passes 77/77 SC-27A plus 9/9 smoke, Firefox passes 19/19, WebKit passes 19/19, and the audit
contains 25 refreshed captures across six viewports.

The next strict Claude closure review correctly treated the prior contradictory result as a
failure and independently found two P2 and four P3 items. All six are remediated in application
commit `0240a2b`: `x` now enters the complete Stretch beat through the normal chapter route; the
capture baseline uses no motion preference and the script rejects duplicate observation hashes;
the generated candidate is recorded with its evidence rather than existing only in a dirty tree;
the final eight orphaned classes and inert interaction-help visual rules are gone; the README is
current through SC-27A; the visible source action says beat; and axe activates, verifies, and scans
all four Research tabs at mobile and desktop sizes. The final regression cleanup also updates two
older tests whose assertions still named retired Guided/dead-selector behavior.

The exact rebuilt identity is app `0240a2b3a7b233cd2aef432b86cbd0e852688d03`, build inputs
`80b0759d9d0530befafa6c6f340e7332a9f3eff6f04b33f6d8deba44a952bb08`, standalone
`a354001a34cac770e1a3a51bb905d803671fe815852c79d74a73a7d45820ec1d`, and detached manifest
`ca566084c38cbee7f8dbf0523ccf8391befd0ec1adee9119c4eaaf52c791674f`. On that exact candidate,
`npm run verify` passes 606/606, `npm run verify:sc27a` passes 175/175, Chromium passes 78/78 SC-27A
plus 9/9 smoke, Firefox passes 20/20, WebKit passes 20/20, and the uniqueness-checked audit contains
25 refreshed captures across six viewports. A final Claude zero-finding rerun is required before
the automated senior-review gate can be called PASS.

The following authenticated Claude closure run (`act-as-the-final-indexed-meteor.md`) applied that
zero-finding rule and therefore returned **engineering FAIL** despite confirming that all six prior
strict-review findings were closed. It found one P2 and five P3 issues: the selected-object screen
reader announcement overstated where exact sources appeared; several visible strings and generated
labels still used Guided/Evidence/chapter vocabulary; README described obsolete Evidence-drawer
routes; one build-id selector was inert; Research body/metadata text fell below the design floor;
and two labelled generic containers lacked explicit group roles.

Application commit `706a90d` closes all six. The announcement now names the actual “Why we know
this” and Research source routes; user-facing and generated material consistently uses
Tour/Research/beat; README names Research → Sources & build and Research-only expert cards; the
orphaned selector is removed; visible text has a 12 px minimum with the explicitly permitted 9 px
build-id exception and 13 px Research claims/citations; and both labelled containers use
`role="group"`. Regression tests pin the wording, type floor, roles, and generated group labels.

The exact remediated identity is app `706a90d89464b3bab0c4e52d986c74390cb19807`, build inputs
`ffe30411c59b63abd414a16ae71e450fbe2e6c7057845c11c80043054ab0eee1`, standalone
`041f0e7c4b13eb0e8ed54921648f599e77294d2e8f34d12e03ce65b84d690ec1`, and detached manifest
`6f688128da1b33616e6352a8d0705ca090642d09ccd3b997fb142fc4cce820c7`. On that exact candidate,
`npm run verify` passes 608/608, `npm run verify:sc27a` passes 177/177, Chromium passes 78/78 SC-27A
plus 9/9 smoke, Firefox passes 20/20, WebKit passes 20/20, and the uniqueness-checked audit contains
25 refreshed captures across six viewports. Status remains **PENDING FINAL ZERO-FINDING CLAUDE
RERUN**; release/freeze remains separately blocked on the declared human work.

The next authenticated Claude review (`act-as-the-final-vivid-salamander.md`) independently
confirmed every preceding finding closed, but correctly returned **engineering FAIL** under the
zero-finding rule with zero P0, zero P1, one P2, and two P3 findings. The P2 was a mode-dependent
residue: a selection made while Research was open still announced the Tour-only pinned-card route.
The P3 items were the remaining “Evidence-only” MyBP-C README phrase and two report rows that
correctly quoted Chromium pointer-resolution numbers but incorrectly attributed them to the static
hit-grid fixture.

Application commit `5f08a3b` closes all three. The live announcement now branches by actual mode:
Tour names “Why we know this,” while Research names Selected structure in the Research Evidence tab.
The existing desktop and responsive Research-detail browser routes assert that exact announcement.
README now says the MyBP-C context is Research-only, with a regression preventing the old phrase.
The picking section and verification matrix now separate `check:hitgrid` fixture reproduction
(7,562 samples, 5,174 intended targets, 14 cells) from Chromium ray-picking resolution
(5,150/5,174, 99.54%).

The exact rebuilt identity is app `5f08a3b5d1575de70dc28c8d4b6fd6b41b66e448`, build inputs
`960a5603312e25f30fd41632fb84d88b2229c3c110f508464e531c21eb219686`, standalone
`5c92f9e759acb516599f2cd92e9706c568a123dde82c3061f6732e73147e6a91`, and detached manifest
`e4cd231e29fd7e333485114537bde4b24bc2883bf0e86b751f1ea02b2324c74f`. `npm run verify` passes
608/608 and `npm run verify:sc27a` passes 177/177 on that identity; full browser reruns are recorded
in the verification matrix above. Status remains **PENDING FINAL ZERO-FINDING CLAUDE RERUN**;
release/freeze remains separately blocked on the declared human work.

The next authenticated Claude closure review (`act-as-the-final-iridescent-summit.md`) confirmed
all three vivid-salamander findings closed, then returned **engineering FAIL** under the same strict
rule with zero P0, one P1, two P2, and three P3 findings:

| Priority | Finding | Disposition |
|---|---|---|
| P1 | The two full locator endpoint labels collided with each other at widths from 520 through 933 px, including the required 768×1024 capture | Locator vocabulary now switches from full to compact according to the actual rendered strip width and a governed 410 px threshold; the subsequently added exhaustive gate now checks every painted SVG text family across all 210 supported states per engine |
| P2 | Tour rendered a full locator and band brackets in the same overlay lane, duplicating vocabulary and creating collision risk | One pure `stageOverlayLane` decision now gives Tour's measurable locator exclusive ownership and Research's requested brackets exclusive ownership; the two cannot render together |
| P2 | A unit test claimed locator/bracket mutual exclusion while source-level conditions allowed both | The unit and source contracts now pin the single overlay-lane decision and exhaustively assert its Tour, Research, and unmeasurable cases |
| P3 | Mobile Research made the canvas inert while the selected-object live region remained inside it | The live region now sits outside the inert canvas; desktop and 375×812 Research selection tests require that it has no inert ancestor and announce the Research-specific route |
| P3 | `locatorPlaceLabel`, `publicPresentationState`, and `applyVisibility` were dead | All three functions and the orphaned hidden-state set are removed; a regression rejects their return |
| P3 | Stage-layout documentation still described locator/bracket visibility as independent and page code repeated the from/to arithmetic | The layout contract now documents exclusive lane ownership, and the page consumes `locatorExtent`'s canonical endpoints without duplicating arithmetic |

Application commit `65789d3` closes all six findings. The regenerated exact candidate is app
`65789d3b5dcf43dff298eede934c65e10845678d`, build inputs
`47e5a46809306a1b4fcf4a65a2f2fd7621cfddcd06e3f4ce0215660446e270c7`, standalone
`f2f43e6c3228fadb7ef06cb8c3f9140cac8c558422a923657399b7dd214ca013`, and detached manifest
`e3104796d15be0823d7594a38ee4647a8ce948ec48b3c14256fbd32d4dc54637`.

On that exact candidate, `npm run verify` passes 608/608, `npm run verify:sc27a` passes 177/177,
Chromium passes 78/78 SC-27A plus 9/9 smoke, Firefox passes 20/20, WebKit passes 20/20, and the
capture audit records 25 unique captures, six viewport records, and zero cold-open scientific-label
collisions at those viewports. That cold-only scope was subsequently found insufficient and is
superseded by the 210-state matrix below. Status is **PENDING FINAL ZERO-FINDING CLAUDE RERUN**;
release/freeze remains separately blocked on the declared human work.

The next authenticated Claude closure review (`act-as-the-final-vectorized-flask.md`) confirmed all
six iridescent-summit findings closed, then returned **engineering FAIL** under the strict rule with
zero P0, zero P1, two P2, and two P3 findings. It found reachable label overprints in supported
noncanonical beat/scene combinations; undercoverage that omitted beats 3/4, noncanonical scenes,
scale/identity labels, and all but the cold-open capture state; imprecise report wording about the
prior P1 and audit scope; and the unused `band-bracket` marker class.

Application commits `0db1970`, `c8d7b87`, `fc82467`, and `d21c3e7` close those findings and the
adjacent defects exposed by the stronger gate. All painted SVG label families and the visible
first-use hint now resolve against canvas, header, card, and one another in two dimensions; the
scientific anchor stays fixed while only the leader endpoint, text, and matching hit target move.
Unplaceable transition frames are explicitly pending only while the semantic camera moves; settled
frames are strict. Batching prevents old/new scene DOM from being measured together, mobile
Research hides overlays while its canvas is inert, and the orphaned marker is gone.

The exact remediated identity is app `d21c3e7b039c537218f93e89f79a58b90d94756d`, build inputs
`9a2b54e75a46055a56dc6ae050047ce0ac2a443fe95354058c8a56a770b7d864`, standalone
`95edae66036748f23fb181fb417c9a5a1eae9662aa186895c216093b4f759227`, and detached manifest
`44a90e7ddf9b0051dd4cd22477e2552d0b8ef183ff79c7b16025ef12b34ba2f3`. On that identity,
`npm run verify` passes 608/608, `npm run verify:sc27a` passes 177/177, Chromium passes 108/108
SC-27A plus 9/9 smoke, Firefox passes 50/50, WebKit passes 50/50, and the 25-capture audit records a
zero-failure 210-state Chromium overlay matrix. Status remains **PENDING FINAL ZERO-FINDING CLAUDE
RERUN**; release/freeze remains separately blocked on the declared human work.

The next authenticated Claude closure review (`act-as-the-final-luminous-harbor.md`) independently
confirmed all four vectorized-flask findings closed for the states the new gate covers, then
returned **engineering FAIL** under the strict rule with zero P0, zero P1, three P2, and four P3
findings. Every one of them lived in a state the 210-state matrix structurally could not observe: a
beat transition through `hashchange`/`popstate`, a mid-session viewport or orientation change, the
Research surface, or a viewport shorter than the declared envelope. The beat-transition path in
particular repainted the previous round's terminus overprint, at its exact magnitudes, as a settled
frame at 375×812 and 390×844 in all three engines.

Application commits `a01ec84`, `3648b85`, `784dee4`, `a707691`, `09b4e15`, `053b26e`, `5aa36e9`, and
`6029da7` close all seven findings and the adjacent defects the closure work exposed.
`restorePresentationFromHash` now measures once, after the whole restored DOM; the mobile-Research
decision is re-derived from a coalesced `resize`/`orientationchange`/media-query sync instead of
being cached in `canvas.inert`; the overlay withdraws on any non-renderable stage rather than
running a placement pass on a zero-height canvas; the first-use invitation has three shorter copy
variants and an in-card lane below the governed compact-stage envelope; `data-label-layout` became
an all-family verdict with the movable-terminus verdict split into `data-terminus-layout`;
band-bracket label centres are clamped into the canvas box; and the capture audit waits for a
terminal overlay verdict, scores only painted text, and walks Research and compact-height states in
addition to the Tour matrix. The gate-scope wording above and in the review record is corrected to
the matrix's real axes.

The exact remediated identity is app `6029da7d46cbad98d9ea036087cfd30284c385b7`, build inputs
`93efeccf9bbc041c60e5b2f194e469e5ca28884cd129f64ea860f811f7867cd5`, standalone
`3ea829c2072b4b0f742fed77d0a1f46a776116b0a42a51bf02fef7662a8096c6`, and detached manifest
`973651ff02e98cd4f5936f6f8ecf33538d1eb69d3b1518e67b1e05119c1ec480`. On that identity,
`npm run verify` passes 610/610, `npm run verify:sc27a` passes 179/179, Chromium passes 144/144 in
one uninterrupted pass (135 SC-27A plus 9 smoke), Firefox passes 77/77, WebKit passes 77/77, and the
25-capture audit records a zero-collision 330-state Chromium overlay matrix plus three recorded
transition round-trips. All 11 protected digests, `docs/scientific-decisions/**`, and the model
fingerprint `7badc8e270e7…` are byte-identical to the sprint baseline. Status remains **PENDING
FINAL ZERO-FINDING CLAUDE RERUN**; release/freeze remains separately blocked on the declared human
work.

### Independent Codex closure review

Every closure review above was performed by a Claude model. Eleven rounds from one
model family share one set of blind spots, and the strict zero-actionable-finding
rule had never been met, so the candidate was put to a different model family.

`codex-cli` 0.149.0, run read-only against `cf8c1d0`, returned **engineering
FAIL** with zero P0, zero P1, four P2, and two P3 findings — six defects eleven
Claude rounds had not found. The pattern is worth recording: those rounds had
converged on the scientific-label overlay and driven it through an exhaustive
beat × scene × viewport matrix, but no gate in that matrix ever selected an
object or operated the accessibility controls. Both are one click from a cold
open, and both held real defects — a pinned explanation that covered the locator
and identity labels while the overlay still reported `resolved`, and a `Large
type` control that made the pinned explanation smaller.

The full record, including the adjacent placement and cross-engine defects the
remediation exposed, is `evidence/ux/SC-27A/CODEX-SENIOR-REVIEW.md`. Application
commits `5664016`, `b85a3cd`, and `0c67821` close all six. Three existing tests
asserted the defective behaviour and were corrected to the intended contract
rather than loosened.

A second Codex round against the remediated candidate independently confirmed all
six closed, then returned FAIL again with four P2 and two P3 findings — three of
the four P2s being incompleteness in the remediation rather than new territory.
Two were closed (`d7c7d1a`, `f40cc66`); three remain **open, known, and
non-blocking**, recorded with their reasons in
`evidence/ux/SC-27A/CODEX-SENIOR-REVIEW.md`:

| Open finding | Why it is deferred |
|---|---|
| `Large type` enlarges nothing visible in Research | Fixing it means changing Research panel type sizes, which moves the 48-cell visual matrix and the overlay gates — a design change, not a defect fix |
| The overlay chrome list omits `#urlNotice` and `#objectTooltip` | The audit gap is confirmed by code reading; the reviewer could not verify a current-frame collision. Reachable only with an invalid-URL notice or an active hover |
| Escape focuses the canvas rather than a Research selection's invoker | Keyboard-only, and adjacent to the focus-restoration contract rather than a regression from it |

On the final identity, `npm run verify` passes 616/616, `npm run verify:sc27a`
passes 185/185, Chromium passes 147/147 in one uninterrupted pass (138 SC-27A
plus 9 smoke), Firefox passes 80/80, WebKit passes 80/80, and the 25-capture
audit records a zero-collision 330-state overlay matrix. Zero-finding closure is
**not** claimed. Release and freeze remain separately blocked on the declared
human work.

The browser gate now also pins an object at three viewports in all three engines
and requires every painted scientific label to stay clear of the explanation.

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

**BLOCKED — do not freeze yet.** On this candidate every declared automated gate passes: the full
and focused Node suites, all destructive controls and validators, the complete Chromium browser
suite in one uninterrupted pass, the Firefox and WebKit UX surfaces, artifact identity, and the
capture audit. The scientific identity is preserved — all 11 protected digests,
`docs/scientific-decisions/**`, and the model fingerprint are byte-identical to the sprint baseline.

Two things nevertheless remain, and either alone forbids a freeze. The strict closure rule requires
one independent Claude review of this exact candidate that returns **zero** actionable findings;
every round so far has returned findings, so that rerun is still pending. Independently of it,
SC-27A's real-human target and formative prerequisites have not occurred at all.
`release_ready: false` is therefore the only truthful state.
