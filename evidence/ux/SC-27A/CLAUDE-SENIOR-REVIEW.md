# Claude senior review record

This is an automated senior code review, not a human scientific, accessibility,
visual, or formative disposition.

- Reviewer runtime: Claude Code 2.1.226
- Model/mode: Claude Opus, high effort, read-only plan mode
- Scope: the SC-27A working diff against the design and implementation plan
- Original review artifact: `/Users/shotaro/.claude/plans/act-as-the-senior-melodic-rivest.md`
- Result: 14 findings, no P0
- Boundary result: the exact model fingerprint, all 11 protected inputs,
  `release_ready: false`, and every human gate remained intact

## Finding disposition

| # | Priority | Finding | Final disposition |
|---:|---|---|---|
| 1 | P1 | `titin_hero` did not render declared band brackets | Fixed and browser-covered |
| 2 | P1 | protected legacy claim pointers could resolve to the wrong current beat | Fixed through one data-owned migration consumed by runtime, Python validation, inventory generation, and deterministic export; protected ledger unchanged |
| 3 | P1 | five v2 scientific non-claims were lost in the chapter merge | Restored and pinned by a v2 fixture |
| 4 | P1 | beat-3 force text overflowed and included a 9 px class | Fixed with containment/wrapping and a 12 px class; dense states covered at six viewports |
| 5 | P1 | report claimed a 200% gate that did not exist | Fixed with a 640×360 CSS viewport/2× DPR equivalent and browser reflow gate |
| 6 | P2 | SC-25 evidence generator froze live fields with historical halo opacity | Fixed; only the protected historical opacity stays pinned and all other fields derive live in a clean-room regeneration test |
| 7 | P2 | Guided palette had two authorities | Fixed; runtime and tests derive from the single JSON record |
| 8 | P2 | substring-only source validators could pass on comments | Removed; behavioral validators/tests cover consumption |
| 9 | P2 | no beat-3 narrow/dense automated coverage | Fixed at six viewports, including force and Next containment |
| 10 | P2 | axe coverage was cold-open/severe-only | Expanded across cold, beat 3, beat 5, and Research at mobile/desktop with zero WCAG violations required |
| 11 | P2 | chips were live regions and definitions were tooltip-only | Fixed; chips are not status regions and five definitions are visible in beat 5 |
| 12 | P2 | shortcut tests/reporting claimed visual visibility for an intentionally nonvisual guide | Corrected to the accessible nonvisual contract |
| 13 | P2 | geometry-share diagnostic measured chrome rather than composed geometry | Fixed through same-frame WebGL/SVG pixel differencing; both diagnostics are separately named |
| 14 | P3 | stale counts, narrow scope truncation, weak naming/coverage, unrecorded removals, permissive evidence parser | Fixed where actionable; the all-alias silent migration concern was rejected because the governing design requires removed IDs to migrate silently |

The review's residual requests for rendered canonical-class disclosure,
pointer single-fire behavior, and shipped Guided contour coverage were also added.
An expanded axe run subsequently found a real nested-interactive defect in the
reference strip; its container is now an accessible group rather than an image
role containing buttons.

## Post-remediation re-review

The bounded Claude Opus/high-effort read-only retry succeeded after the earlier
CLI authentication failure. It reviewed baseline `914a394`, implementation
`1b72ba0`, and evidence commit `3b9d07f` without modifying the tree. Its verdict
was that the engineering implementation was complete, while human evidence and
candidate freeze remained correctly blocked.

Claude rechecked all 14 original findings: 13 were fixed and one was partial.
It then reported one P2, four P3 cleanup items, and one named coverage gap:

| Priority | Final-review residual | Post-review disposition |
|---|---|---|
| P2 | `STRONGLY INFERRED` and `INFERRED` were visually indistinguishable on a selected Tour object | Fixed without changing the approved five-label curriculum: the Guided object chip now visibly discloses `scientific class: strongly inferred`; Research retains the same canonical disclosure |
| P3 | Permanently hidden inspection-dismiss, instance, expert-card, source, and chapter-class branches remained | Removed with their handlers, writes, and orphaned styles; the retained specialist destinations remain in Research |
| P3 | Beat 4 declared `band_brackets` even though the close-up intentionally suppresses them | Removed the inert beat declaration; active bracket declarations remain unchanged |
| P3 | Axe tags stopped at WCAG 2.0 A/AA | Expanded to `wcag21aa` and `wcag22aa` in addition to the existing tags; mobile/desktop Tour and Research scans pass |
| P3 | A hidden chapter-evidence node was still written on every beat | Removed the node and write |
| Coverage | Semantic-camera safe-area verification was source-oriented rather than rendered | Added rendered checks for beats 1, 2, and 5 at all six release viewports: Z/M locator vocabulary, both termini, truthful visible-span geometry, reachable titin path, viewport bounds, and header/story occlusion |

The new camera gate exposed one real 1024×768 closing-frame collision. The five
existing evidence definitions were shortened without changing their meaning,
which reduced the closing-card height and cleared the N-terminal label while
preserving the design's 30%-width and five-label contracts. Chromium's DOM/SVG
geometry check was then made engine-neutral by comparing authored SVG geometry;
Firefox and WebKit both passed the corrected gate.

Post-review verification on the clean candidate includes 606/606 Node tests,
all destructive controls, 86/86 Chromium browser tests (77 SC-27A plus 9 smoke),
19/19 affected Firefox UX tests, and 19/19 affected WebKit UX tests. This remains
an automated senior review record, not human scientific, accessibility, visual,
or formative evidence.

The final aggregate run also exposed a validator-routing issue outside Claude's
findings: object-contrast rows still searched `SarcomereScene.js` for literal
colours after the Guided palette became data-owned. Commit `d9c072f` points that
check at `data/render_style.json` and adds a destructive mutation for a declared
colour absent from the canonical palette. `npm run verify:sc27a` then passed end
to end: 175/175 focused tests, all negative controls, all validators, the 7,562-
sample hit grid, the 48-cell matrix, and artifact identity.

## Deep follow-up review and fixes

Claude Opus/high-effort then reviewed the remediated implementation, tests,
generated pack, evidence, and report in read-only mode. It found no P0/P1 and
judged the engineering implementation **COMPLETE**, while correctly judging
release/freeze **BLOCKED** on the declared human work. It reported two P2 and
eleven P3 follow-up findings; all thirteen were remediated:

| Priority | Finding | Disposition |
|---|---|---|
| P2 | Generated screen-reader progress still said Chapter | ReleasePack now says Beat and the generated transcript is pinned |
| P2 | The report falsely promised a picked-instance specialist path | The promise was removed; actual Research fields are stated exactly |
| P3 | Generated release documents retained old Learn/Explore/chapter vocabulary | Generator, presenter keys, presentation data, and all 22 generated outputs now use Tour/Research/Beat |
| P3 | The report attributed browser hit-resolution counts to `check:hitgrid` | The report now separates fixture reproducibility from Chromium pointer-path resolution |
| P3 | `locatorTicks()` was orphaned | Removed |
| P3 | The report said five definitions were shortened when six had changed | The literal INFERRED definition was restored; exactly five recap definitions remain shortened |
| P3 | Terminus safe-area logic clamped only the anchor, not label ink | The anchor clamp now reserves the full label area above the header |
| P3 | The shell gate sampled only beats 1 and 3 | All five beats are checked at all six viewports |
| P3 | `label_box_px` and its comment were stale | The value is 96 px and the comment matches the 12 px/~83 px rendered label |
| P3 | Canonical inference disclosure was asymmetric | Both INFERRED and STRONGLY INFERRED are disclosed consistently in Guided and Research |
| P3 | Object contrast validated colour membership, not palette role | Every pair is bound to its exact canonical JSON role; absent-colour and role-swap controls fail closed |
| P3 | Permanently hidden More/story/carousel UI remained | Nodes, handlers, writes, branches, and orphaned styles were removed |
| P3 | Locator assertions read authored SVG attributes | Tests transform SVG endpoints through `getScreenCTM()` and compare rendered screen geometry |

The fixes are in app commit `3bb85c0`; test-only stabilization is in `dd54521`.
Verification on that tree is: 606/606 full Node tests; 175/175 focused tests;
27/27 release-gate destructive mutations; 77/77 Chromium SC-27A browser tests;
9/9 Chromium smoke tests; 19/19 Firefox UX tests; 19/19 WebKit UX tests; the
7,562-sample hit-grid fixture; the 48-cell matrix; exact artifact identity; and
25 refreshed captures across six viewports.

## Closure-attempt findings and remediation

The next authenticated Claude Opus/high-effort closure attempt returned an
internally contradictory result: its headline said PASS while its body contained
one P2 and five P3 actionable findings. Under the zero-actionable-finding closure
rule, that result was treated as **FAIL**, not approval.

| Priority | Finding | Disposition |
|---|---|---|
| P2 | The `inspection_affordance` PASS still promised legend operability after the Guided legend was removed, and its browser test did not exercise the retained Research key | The gate now names the Research Measure structure key exactly; Chromium coverage activates its entries by pointer, keyboard, and real touch after navigating the sheet |
| P3 | Permanently hidden legacy controls, charts, handlers, render branches, and orphaned styles remained | Removed the Guided mode button, duplicate action/restore paths, persistent stage bar and Reset/Force/legend nodes, compact claim branch, regional extension chart, associated vocabulary, handlers, observers, rendering, obstacles, and styles |
| P3 | The generated text-only transcript heading still said Learn | Generator and release output now say `Text-only Tour transcript` |
| P3 | Focus/overflow coverage used a fixed selector list and omitted `audienceEvidence` | The gate now discovers every visible enabled header/Tour button or input dynamically, requires the Research control, focuses each, and checks document/canvas overflow |
| P3 | `assertInViewport` accepted partial intersection rather than full containment | It now requires every edge to stay within the viewport, with only a one-pixel rounding tolerance |
| P3 | `tourEvidenceRecap` carried an accessible name on a generic role-less element | It now has `role="group"` with its existing label |

The cleanup exposed one stale SC-21 regression that still required the deleted
extension chart. The test was corrected to lock the current Measure contribution
table and its explicit separation of regional extension, added length, and
incremental compliance.

The rebuilt candidate is app revision
`8586a5c7a790e1d4ce222445c60c6770b9196099`, build-input fingerprint
`067005fbe8d936a87f50ea77e554cdc2a951b1dfd600645d5422b696a415989a`,
standalone SHA-256
`f2357366036bb67978efc3324c14bafa61f792710b1d14f087680dfaf8e520e7`,
and detached-manifest SHA-256
`4a51a4ab274a1936c2533a5ad04686edf9c70e80e8067edc253ad18f6916a0a4`.
Verification on this exact candidate is: 606/606 full Node tests; 175/175
focused tests; all destructive controls and validators; 77/77 Chromium SC-27A
browser tests; 9/9 Chromium smoke tests; 19/19 Firefox UX tests; 19/19 WebKit
UX tests; the 7,562-sample hit grid; the 48-cell matrix; exact artifact identity;
and 25 refreshed captures across six viewports.

Status at this point: **PENDING FINAL ZERO-FINDING CLAUDE RERUN**. The prior
contradictory headline is not counted as a pass.

## Strict closure review findings and remediation

The following authenticated Claude Opus/high-effort read-only review applied the
zero-actionable-finding rule consistently. It returned **engineering FAIL** with
zero P0, zero P1, two P2, and four P3 findings. Its complete review artifact is
`/Users/shotaro/.claude/plans/your-immediately-preceding-sc-27a-logical-tiger.md`.

| Priority | Finding | Disposition |
|---|---|---|
| P2 | `x` changed only the spring scene, leaving Tour narration and progress on the prior beat | All `story.*` accelerators now route through `applyChapter`; browser coverage presses `x` from beats 1 and 5 and requires beat 3, its URL state, and contextual mechanics |
| P2 | Baseline and reduced-motion screenshots used the same reduced-motion context and were byte-identical | Baselines now use `no-preference`; the dedicated diagnostic still uses `reduce`; capture fails if any two observation PNGs share a SHA-256 |
| P3 | The regenerated candidate existed only in the working tree | The final standalone, release pack, capture audit, reports, and regression updates are committed together as candidate evidence; the embedded app identity remains the latest build-input commit by design |
| P3 | Eight dead legacy CSS classes remained | Removed `.object-evidence`, `.object-detail`, `.object-sources`, `.object-disclosure`, `.status-pill`, `.bib-row`, `.bib-title`, and `.card-findings`, preserving live mixed-selector terms |
| P3 | README status and usage documentation stopped at SC-23/seven-chapter Guided behavior | README now covers SC-24 through SC-27A, the five-beat Tour, Research workbench, contextual mechanics, current shortcuts, presentation v3, and the truthful release boundary |
| P3 | Axe scanned only Inspect in Research | At both 375×812 and 1280×720, the gate now activates and asserts visibility of Inspect, Measure, Evidence, and Sources before scanning each with WCAG 2.0/2.1/2.2 A/AA tags |

A second plan-mode pass identified two adjacent cleanup details while inspecting
the same code: the visible source action still said “chapter,” and visual CSS
targeted the screen-reader-only interaction-help element. The action now says
“Sources for this beat,” while its data compatibility key remains stable; the
inert visual rules are removed and the accessible help text remains.

The rebuilt candidate is app revision
`0240a2b3a7b233cd2aef432b86cbd0e852688d03`, build-input fingerprint
`80b0759d9d0530befafa6c6f340e7332a9f3eff6f04b33f6d8deba44a952bb08`,
standalone SHA-256
`a354001a34cac770e1a3a51bb905d803671fe815852c79d74a73a7d45820ec1d`,
and detached-manifest SHA-256
`ca566084c38cbee7f8dbf0523ccf8391befd0ec1adee9119c4eaaf52c791674f`.
Verification on that exact candidate is: 606/606 full Node tests; 175/175
focused tests; all destructive controls and validators; 78/78 Chromium SC-27A
browser tests; 9/9 Chromium smoke tests; 20/20 Firefox UX tests; 20/20 WebKit
UX tests; the 7,562-sample hit grid; the 48-cell matrix; exact artifact identity;
and 25 unique refreshed captures across six viewports.

Status at this point: **PENDING FINAL ZERO-FINDING CLAUDE RERUN**. Full
release/freeze remains independently blocked on the declared human work.
