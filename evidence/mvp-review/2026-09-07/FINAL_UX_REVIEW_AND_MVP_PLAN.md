**Titin: final UX review and bounded MVP finish**

Reviewed September 7–8, 2026. Review and proposed implementation plan only; the application, scientific inputs, generated release, and distribution ZIP have not been changed. The evidence directory retains the date on which this review began.

**Decision: freeze the scientific model; finish a scientist-feedback preview in one capped engineering day.** The existing implementation has enough substance to demonstrate useful AI-assisted scientific software. Its strongest differentiator is an inspectable connection between a rendered object, a scientific claim, source preparation, exact locator, limitation, and reproducible output. The remaining opportunity is making that substance immediately visible and understandable.

Do not distribute the current candidate unchanged: two reproducible scientific presentation defects below should be corrected first. Beyond those, prefer the small changes in this plan over another modeling or redesign sprint. Independent scientific validation and human learning outcomes remain unestablished; sharing with researchers is how to obtain that feedback.

The repository is already beyond the original SC-27A handoff. The September 5 preview improvements and September 6 verification/packaging are complete. Do not repeat that implementation backlog. This plan describes only the remaining delta found in this review.

**What was reviewed and verified**

- Clean application baseline on `main`, HEAD `32e8941`; application source revision `557f09aaa6f663b4e1bf958ef6c44357861a4d16`. Later reporting/test commits explain the different revisions.
- Live standalone Tour: all five beats at 1280×720; Stretch from 2200 to 2400 nm; object selection → evidence → expanded source locator; Research Inspect and Architecture. Fresh 390×844 opening, route, stretch card, and force disclosure. These were computer-controlled browser reviews, not participant or physical-device sessions.
- Read the presentation orchestration, camera/framing, inspection resolver, source presenter, mechanics, exports, release generation, sprint handoffs, and previous review/delivery records. This was a targeted code review, not an exhaustive proof of every module or scientific claim.
- Fresh `npm test`: **617/617 passed**, no skips or failures, approximately 125 seconds. [Log](/Users/shotaro/Downloads/artifacts/evidence/mvp-review/2026-09-07/node-tests.log).
- Fresh build/pack currency, raw artifact identity/boundary, TypeScript, scientific-scope, mechanical-parameter, claim-support, and release-gate checks passed. `release_ready` remains **false**; the gate validator verifies that outstanding evidence is represented honestly.
- Fresh read-only model probes confirmed force suppression at 1900, 2500, and 3000 nm; supported output at 2000/2200/2400 nm; extrapolated output at 2450 nm. Rounded supported central values are approximately 0.18/0.5/1.3 pN per titin. These are model estimates. The same probes reproduce the folded-domain inspection defect. [Results](/Users/shotaro/Downloads/artifacts/evidence/mvp-review/2026-09-07/probes.json), [reproducer](/Users/shotaro/Downloads/artifacts/evidence/mvp-review/2026-09-07/probe.mjs).
- Historical verification on these identical application bytes includes Chromium 71/71 integrated preview checks, Firefox 27/27 across the four preview suites, WebKit 27/27, exports, clean reproduction, and an extracted offline package walkthrough. Those checks were **not rerun** as browser suites in this review; the full historical SC-27A matrix is not a fresh result.

| Reviewed artifact | SHA-256 |
|---|---|
| Scientific model fingerprint | `7badc8e270e73e8bae3d84420448e6c79fee9e41bfdb0ca790484750ef329ef6` |
| `index.html` | `b5ee9beb2ea4f7b9c26dd25d5574018952a4f1518c6af12573e4b758086f4f5e` |
| `release/MANIFEST.json` | `13cb66e61e55cbbc4966219ce22ed35da5cf56b812987c6611d3d59ae6c0d4ac` |
| Existing September 6 ZIP | `a469e9d6956cc2f465aeea87cf4af79888a27ed5f962ea8aa4fc3ee672a1fcf6` |

The ZIP exists at `/Users/shotaro/Downloads/titin-sarcomere-preview-2026-09-06-557f09a.zip`. Its hash was checked again after the interrupted review resumed. It contains the current defects and must be superseded after fixes.

**Findings, ranked by delivery value**

| Priority | Finding and evidence | Smallest useful change |
|---|---|---|
| **P1 — correct before sharing** | Research → Inspect → Scope details says **“Human skeletal-muscle reference construct Q8WZ42-1.”** This contradicts the canonical no-tissue-specific scope and its excluded claim. The same error was corrected in the scientist note, but remains in the live app. [Source](/Users/shotaro/Downloads/artifacts/src/index.template.html:826), [scope exclusions](/Users/shotaro/Downloads/artifacts/data/scientific_scope.json:146), [screenshot](/Users/shotaro/Downloads/artifacts/evidence/mvp-review/2026-09-07/frames/scope-contradiction.jpg). | Populate the construct statement from `model.scientificScope.publicBadge` or its normalized sequence fields. Keep the passive-geometry/activation explanation. Do not alter the scope ledger to justify the stray sentence. Check both the ordinary Research entry and the scope-badge entry in the built standalone. |
| **P2 — correct before sharing** | Research → Inspect → All scenes and display controls → Architecture selects **“Folded titin domains”**, but its audit says **“Not applicable to this non-titin target.”** The resolver recognizes titin regions and component `titin`, but omits `titin_domains`. [Resolver](/Users/shotaro/Downloads/artifacts/src/presentation/ParameterTable.js:169), [UI fallback](/Users/shotaro/Downloads/artifacts/src/index.template.html:3785), [screenshot](/Users/shotaro/Downloads/artifacts/evidence/mvp-review/2026-09-07/frames/architecture-classification.jpg). | Treat `titin_domains` as a titin aggregate for reference metadata. Report the full-reference count as such; leave the single residue interval absent because an aggregate is not one contiguous selected domain. Preserve null titin metadata for myosin and other actual non-titin components. Test all three cases. |
| **P2 — highest visual ROI** | Beat 3 enters with ordinary hero framing; pressing Stretch then synchronously installs maximum-sweep framing. The model visibly shifts upward and becomes smaller before length comparison. The ruler changes from 100 nm in the entry frame to 200 nm in the endpoint frame. Camera motion and biological geometry change are hard to separate. [Entry](/Users/shotaro/Downloads/artifacts/evidence/mvp-review/2026-09-07/frames/desktop-stretch-2200.jpg), [endpoint](/Users/shotaro/Downloads/artifacts/evidence/mvp-review/2026-09-07/frames/desktop-stretch-2400.jpg), [entry camera](/Users/shotaro/Downloads/artifacts/src/index.template.html:3332), [Stretch camera](/Users/shotaro/Downloads/artifacts/src/index.template.html:5174). | Establish the existing maximum-sweep framing when entering the stretch lesson, after its card layout is measured. Keep that frame through drag, play, pause, and replay. Avoid changing shared camera mathematics. Provide direct spatial labels for the extensible I-band and the A-band span held fixed in this model. |
| **P2 — expose the expert payoff** | Beat 5 ends with Replay and an evidence vocabulary. It has no direct object-evidence action. When titin is selected earlier, **Sources for this object** begins at approximately y=1082 in the 720-pixel desktop viewport, below the first screen. [Recap](/Users/shotaro/Downloads/artifacts/evidence/mvp-review/2026-09-07/frames/desktop-recap.jpg), [evidence landing](/Users/shotaro/Downloads/artifacts/evidence/mvp-review/2026-09-07/frames/desktop-evidence.jpg), [button placement](/Users/shotaro/Downloads/artifacts/src/index.template.html:932). | Add one beat-5 “Inspect titin’s evidence” action using the existing object selection/evidence route. Move the existing object-source button next to the selected-object heading. Preserve the claims and limitations below; no new evidence system or bibliography redesign. |
| **P2 — make the force route answer its question** | The force link correctly focuses Passive force, but at 390×844 most of the first screen is introductory and limitation prose; the graph begins near the bottom and the current readout follows it. [Screenshot](/Users/shotaro/Downloads/artifacts/evidence/mvp-review/2026-09-07/frames/mobile-force.jpg), [renderer](/Users/shotaro/Downloads/artifacts/src/index.template.html:3148). | Put the rounded current value, model/transfer status, sensitivity interpretation, and graph first; follow with the existing full caveats, regional table, and parameter audit. Preserve immediate unsupported/extrapolated warnings and the statement that parameter sensitivity is not a confidence interval. Reorder existing content before considering new collapsible UI. |
| **P2 on a promised fallback route** | The shipped SVG fallback has four previously measured collisions/clipped labels, including overprinted scope text. The scientist note explicitly sends users there when WebGL fails. [Existing findings and measurements](/Users/shotaro/Downloads/artifacts/evidence/mvp-preview/2026-09-05/FALLBACK_SLIDE_FINDINGS.md). This review read that evidence; it did not perform a fresh SVG layout audit. | Fix the generator’s running text cursor and bounded label placement, then regenerate. If that exceeds its budget, name the existing text transcript as the fallback in the scientist note and stop recommending the defective SVG deck. A changed manifest is routine release work, not a reason to preserve illegibility indefinitely. |

The first two are verified defects. The UX priorities are expert review judgments grounded in the observed screens; they are not measured novice failure rates.

**The visual experience to aim for**

The current interface is restrained and consistent, but the overview is not yet a strong visual explanation. In the full-route views, titin is a narrow pink strip among faint filaments; beats 1 and 2 look similar. The biological aspect ratio explains much of the thinness. Do not solve it by stretching molecular geometry vertically, adding an unlabeled cartoon coil, inventing domain unfolding, or making schematic poses look experimentally resolved.

Use the existing scale changes and a small number of spatial labels to make five successive ideas visible:

| Beat | What the viewer should understand | Presentation target using existing capabilities |
|---|---|---|
| 1. Meet the sarcomere | Muscle fibers contain repeated Z-to-Z units; myosin provides motor action. | Make the existing full-sarcomere locator unmistakable as **one sarcomere** and identify the enlarged half. Keep titin, actin, and myosin labels. A brief “Muscle fiber → repeating sarcomeres” context line is sufficient; no new muscle model. |
| 2. Follow titin | One molecule connects a Z-disc to the central M-line. | Emphasize the two endpoints and route. Proposed labels: **Z-disc: anchored end** and **M-line: central end**, retaining N/C terminology where needed. Avoid repeating the opening’s explanatory load. |
| 3. Stretch | I-band extension changes while the A-band allocation stays fixed in this model. | Show the extensible and fixed spans directly against the enlarged molecule, using projected canonical anchors. Keep a stable comparison camera. Retain the current explicit Replay behavior and optional force explanation. This is the principal interactive demonstration. |
| 4. Scaffold | Titin associates with the thick filament; it is more than a uniform elastic string. | Preserve the existing C-zone close-up as the molecular reveal. Identify titin and myosin there; keep the locator visible so the zoom has context. Do not add partners or claim an exact repeat register. |
| 5. Inspect the evidence | A scientific picture contains claims with different kinds of support. | Close with one concrete object-to-source example and the new evidence action. Keep the five-class key available, but let the conclusion lead with what titin does. Replay remains secondary. |

The clearest payoff is: **move the model, explain the regional change, then open the evidence behind it.** For researchers, seeing the exact preparation and locator is more persuasive than a larger citation count or a claim that AI has validated the science.

The existing scaffold close-up already provides a useful change in visual scale:

![Existing C-zone close-up; retain it and improve identification rather than build a new renderer](/Users/shotaro/Downloads/artifacts/evidence/mvp-review/2026-09-07/frames/desktop-scaffold.jpg)

All proposed labels are presentation copy, not implemented changes. Bind them to the existing supported claims and current model state. Limit the number shown so mobile remains legible. If the two new stretch labels cannot be placed safely within the timebox, retain the stable frame and improve the existing locator labels instead of starting an inset or collision-engine project.

**One engineer, eight engineering hours maximum**

No exact deadline or final hosting destination was supplied. These are planning budgets, not promises of elapsed time or estimates based on measured implementation work. Work in order and batch canonical changes before final artifact generation.

| Order | Budget | Deliverable and acceptance | Cut if the budget is threatened |
|---|---:|---|---|
| 1 | 0.25 h | Record the scientist-feedback-preview scope and this task list. Keep the nine model inputs, force laws, sequence boundaries, uncertainty policy, and formal release flags unchanged. | No new release process, schema, or review dashboard. |
| 2 | 1.0 h | Correct scope copy and folded-domain classification; focused regressions on actual scope output plus titin aggregate / titin region / non-titin metadata. | These two corrections survive every cut. Keep the fix local. |
| 3 | 1.5 h | Stable Stretch entry/play/replay framing; at most two spatial teaching labels. Both endpoints and controls remain visible at 1280×720 and 390×844. | Cut new labels before camera consistency. No new inset, comparative solver, or global camera rewrite. |
| 4 | 1.0 h | Direct evidence action at the end; source button above the fold; current force and chart before extended audit prose. Context and focus return work. | Prioritize moving the existing source button and force readout. Cut the new final action if integration expands. |
| 5 | 0.5 h | Small orientation/scaffold label and copy improvements, using the five-beat target above. | First polish item to drop. No materials, lighting, global CSS, or camera redesign. |
| 6 | 0.5 h | Repair fallback text layout if it fits; otherwise revise the delivery instructions to use the existing transcript. Correct the stale README “pause timeout unresolved / packaging remains” status. | Use the transcript fallback rather than extending a deck-design task. |
| 7 | 2.25 h | Build, run the relevant checks, visually inspect final changed routes, repackage, verify extracted bytes, and rehearse on the intended machine if available. | Cut optional implementation before cutting final verification. No physical-device claim without the actual device. |
| Reserve | 1.0 h | Reproducible core-path regressions only. | No additional feature work. |
| **Total** | **8.0 h** | One final candidate for scientist feedback. | Stop adding improvements. |

If only a few hours remain, take the **minimum route**: the two scientific presentation fixes, verified replacement artifact/package, current delivery instructions, and a guided walkthrough of the existing views. Defer all visual changes. Budget approximately 2–3 engineering hours, subject to verification. The current wrong statements do not become acceptable because the deadline is close.

The recommended eight-hour route offers more independent-reader value: a cleaner comparison and a discoverable evidence trail. A broad redesign, new isoforms, active contraction, richer molecular simulation, or a new framework adds substantial uncertainty while delaying the same feedback opportunity. Under this deadline those are poor tradeoffs. There is no measured utility function here that would justify claiming a mathematically proven global Pareto optimum.

**Implementation boundaries and verification**

The application template is 5,287 lines and owns much of the UI state, layout, navigation, and animation orchestration. Its concentration of responsibilities is a maintenance concern, but splitting it apart during this finish would add regression risk. Keep edits local to the identified presentation/inspection paths. `MechanicalModel.js` already separates numerical evaluation from applicability; preserve that separation.

For the domain fix, include `titin_domains` in the titin reference-metadata classification without inventing a single residue span for the entire aggregate. Assert that myosin still receives no TTN accession. For the scope fix, resolve the displayed construct from the canonical ledger so another hand-written sentence cannot drift independently.

For Stretch, ordinary beat navigation must continue preserving the current length. Only explicit endpoint replay resets it. Apply the existing maximum-extent frame after measuring beat-3 chrome; do not reset the slider to achieve a prettier screenshot. Keep the camera stable while the length changes, including pause/resume and reduced-motion endpoints. Use canonical projected anchors for any span labels and do not substitute a titin subregion span for the whole half-I-band width.

Use the existing commands and tests. During implementation run affected tests; on the final clean candidate run `npm run build:release`, `npm run pack`, `npm run verify`, and `npm run verify:identity`. The release builder requires clean application inputs: follow the existing source-commit → generated-artifact workflow, without weakening it. Do not hand-edit `index.html` or generated release files.

Run the dedicated Stretch/MVP, evidence/workbench, and standalone smoke browser suites for the changed routes. Exercise the final result in a second intended browser engine. Add focused behavior assertions for the two defects and any new navigation/camera behavior; do not merely assert that a new label string appears somewhere in source. If a proposed fix unexpectedly requires shared overlay/camera changes, either include their affected matrix coverage or cut that fix back to the local version.

Visually inspect the changed entry, stretch endpoints, scaffold, evidence, and force states at desktop and phone sizes, plus keyboard and browser-zoom access. One real novice walkthrough, if someone is available, should ask where one titin begins/ends, which molecule supplies motor action, and what changes in Stretch. A failure to answer is feedback for a bounded correction, not a reason to create a new formal cohort. Availability of human review must not be invented.

Regenerate the scientist note, delivery identity, and distribution ZIP as needed. Extract the actual replacement ZIP and compare its standalone, manifest, and manifest-listed artifacts; open the extracted core route offline. Preserve superseded review evidence with its old hashes rather than rewriting it to appear current. If a site is subsequently published to a specified destination, verify the fetched hosted bytes and primary route there. Localhost verification is not deployment parity.

**SC-27B disposition and the stopping rule**

Override SC-27B as a prerequisite to **this limited feedback preview**, not as a declaration that its scientific or human evidence exists. Defer the five-person confirmatory study, formal independent sign-offs, comprehensive projector/device programme, and repeated zero-finding AI closure. Keep their actual statuses pending and `release_ready: false`. Keep claim provenance, no-tissue-specific scope, force omission boundaries, and artifact identity intact.

After the two listed defects are corrected, block only on a demonstrated materially misleading scientific statement, broken Tour/Stretch/evidence/export route, inability to use that route on the promised platform, or broken/mismatched delivered artifacts. Apply this rule to observed problems, not hypothetical possibilities. Optional improvements are dropped when the cap is reached; the cap does not authorize shipping a known core defect.

Known remaining limitations can stay recorded: ineffective Research Large type; selection-invoker focus restoration; tooltip/invalid-URL audit omissions; extreme short-viewport composition; lack of physical-device, novice-comprehension, and independent-scientist evidence. During this review a desktop-to-phone resize also cropped the model until a fresh load; a cold phone load framed it correctly. Treat resize recovery as a deferred robustness issue unless device rotation/resizing is part of the promised demonstration. Do not generalize the cold-load result into an all-mobile PASS.

**How to present the finished preview**

Use a three-minute explanation followed by a two-minute expert inspection. These are targets to rehearse, not measured completion times.

1. Explain muscle fibers and repeated sarcomeres; identify myosin’s motor role and the one-half-sarcomere enlargement.
2. Follow titin from Z-disc to M-line.
3. Run Stretch, explicitly replay it, and point out the changing I-band and the A-band span held fixed in the model.
4. Use the existing scaffold close-up to reveal the molecular organization.
5. Select titin, inspect a claim, and expand the source locator/preparation. Then open the modeled force explanation and export a state.

Avoid making raw force precision, the number of tests, or AI authorship the opening attraction. The reference construct, preparation transfers, schematic geometry, and model-versus-measurement distinctions should be easy to inspect throughout.

For an asynchronous first sharing, supply the verified app/package, the short scientist note, and three feedback prompts: **What is misleading? Which transfer or assumption needs correction? What single change matters most before wider educational use?** Do not add an account system, survey backend, or new explainer video as a launch prerequisite. No scientist messages or publication have been performed by this review.

**Scientific spot-check limits**

Primary-paper abstract/search records were checked for two central distinctions: N2A includes a structured UN2A core with flexible linkers, and the PEVK elasticity experiments used rat-psoas preparations. These support retaining the corrected N2A lesson and explicit preparation-transfer limits; they do not independently validate this complete reference-sequence model. [Zhou et al., 2021](https://pubmed.ncbi.nlm.nih.gov/33647290/), [Linke et al., 1998](https://pubmed.ncbi.nlm.nih.gov/9653138/). Full PMC retrieval encountered browser-verification/rate-limit pages, so no full-paper re-adjudication is claimed.

The apparently different counts “four Ig domains in N2A” and “three fully contained pinned DOMAIN features in this sequence interval” are not, by themselves, a proven contradiction: they refer to different counting definitions/boundaries. Do not reopen sequence partitioning on that observation alone. Likewise, a force estimate becoming larger over the declared range is a result of this parameterized model, not validation of absolute human muscle force.

**Completion of this review:** two must-fix scientific presentation defects identified and reproduced; a bounded implementation and verification plan supplied; 13 live-review screenshots and a read-only probe saved. Application and model unchanged. Implement the agreed finish once, then use researcher feedback to choose the next work.
