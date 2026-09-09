# Assessment of Claude's final review

Reviewed September 9, 2026. Candidate: application source `dcdb403a759bd3df1f7d7bc821f3a73aeeb10caa`, standalone HTML SHA256 `d04fbf3b9298829821d89e7fcbd9616b67d1291f3886ac9d15617764b9c4e27c`.

**Decision:** Claude found real presentation defects and correctly separates private researcher feedback from a broader release. Its strongest additions are the locator/model overlap and the force chart's tiny text. Its weakest parts are the proposed one-line chart fix, the claim that preserving the evidence package outweighs every improvement, and several overly categorical interpretations of measurements and validation gaps.

The frozen preview remains suitable for private researcher feedback with its disclosed limitations. For the intended polished showcase, I recommend one bounded presentation patch for chart readability and locator separation, plus a short explanation of the opposite titin path. No new model, renderer, or broad visual sprint is justified by this review.

## Evidence checked for this critique

- Re-read the relevant UI styles, chart generator, scope bindings, overlay audit and locator painter, framing helper, mirrored scene construction, chapter records, render-style validator, release contrast records, browser tests, and final delivery logs.
- Visually inspected nine exact-candidate images: desktop beats 1–5, desktop force, phone force, phone scaffold, and phone sources.
- Rechecked **all 22** screenshot hashes against their capture index, current HTML against that index and the ZIP's embedded HTML, and ZIP/manifest identity. All matched. `git diff dcdb403 HEAD -- src data scripts test` was empty. See [identity checks](critique-identity-checks.json).
- Ran a fresh isolated Chromium measurement probe at 1280×720 and 390×844. Opened the force panel and measured SVG text scaling, clipping bounds, and label-box intersections at the shipped size and temporary 18/24-unit sizes. Styles were changed only inside disposable browser pages. See [probe](check-chart.mjs) and [measurements](chart-measurements.json).
- Did not edit application source, model data, generated releases, or the delivered ZIP. Did not rerun the full suite, perform human usability testing, or independently validate biology.

## Findings worth acting on

| Claude finding | Credibility | Recommendation |
|---|---|---|
| **F2: Force-chart text is too small** | Confirmed, with corrected numbers. The proposed fix causes additional layout problems. | **Highest priority for the polished showcase.** Fix responsive chart typography and margins together. |
| **F1: Locator overlaps the main model** | Confirmed in final desktop Stretch/finale images; the overlay audit does not test against rendered geometry. | **Second priority.** Suppress or separate colliding locator content without changing the camera or model. |
| **F3: Mirrored pink path can look like one molecule continuing** | Mirroring and same-color rendering are confirmed. Actual reader confusion is a plausible risk, not observed evidence. | **Clarify now in the introduction.** Add an in-app clarification if making a new presentation candidate. Do not recolor geometry as the first remedy. |
| **F8: Hashes precede scientific sources** | Confirmed. Important to the expert evidence journey, but not a correctness failure. | Useful optional polish if a presentation rebuild is already happening; do not reopen the package for this alone. |
| **F6: Desktop accession is truncated** | Confirmed. Full identity remains in the title/Scope destination. | Low priority. A compact, data-derived identity is sensible later; do not displace the more important fixes. |
| **F7: Phone identity is hard-coded** | Confirmed latent maintenance risk. It is correct for this frozen candidate. | Defer; fix with F6 if the header is revisited. |
| **F5: Rendered contrast differs from declared ratios** | Real distinction, but the validator explicitly computes palette-color ratios. The broader “false declared numbers” interpretation is too strong. | Clarify the scope of the contrast evidence later. Do not retune rendering or replace deterministic palette ratios with a few screenshot samples now. |
| **F4: Thin composition and unused canvas** | Fair visual judgment. Ink percentages are not a validated quality metric. | Defer shared framing changes until actual audience feedback. |
| **Existing Large type defect** | Confirmed in CSS; Claude correctly agrees with the earlier review. | Resolve alongside typography if possible, or remove the misleading control in the new candidate. Do not rely on it for a projected demo. |

### F2: credible defect, inadequate proposed repair

The active desktop drawer rule is [src/index.template.html:629](../../../src/index.template.html#L629), which overrides the earlier 370 px maximum cited by Claude. At 1280 px, the drawer measures 396.80 px and the chart measures 359.80 px. The phone chart is 354 px wide. The source SVG remains 620×300 with 12-unit text ([chart styles](../../../src/index.template.html#L420), [chart generator](../../../src/index.template.html#L2979)).

The new browser measurements are:

| Text size in SVG units | Desktop effective size | Phone effective size | Geometric problems measured |
|---|---:|---:|---|
| 12, shipped | 6.93 px | 6.81 px | No label boxes outside the SVG or intersecting each other in these two states. Readability is still poor. |
| 18, Claude's proposal | 10.39 px | 10.22 px | The long vertical axis title extends outside the SVG; the first x/y tick-label boxes intersect. |
| 24, diagnostic only | 13.85 px | 13.63 px | The vertical title and rightmost tick extend outside the SVG; additional label-box intersections occur. |

These are browser geometry measurements, not an accessibility conformance test. They establish that a blind font-size increase is not an adequate fix. In particular, checking only the rightmost tick at 18 units misses the actual vertical-title problem.

The smallest sound implementation is a coordinated chart-label change: keep the same force data, domain and regime information; shorten or move the long axis title into readable HTML; use enough margins and fewer ticks if needed; and choose font sizes based on final screen size. Aim for ordinary readable chart text, roughly 12–14 screen pixels at the supported narrow layout, with a separate actual-display check for projection. This is a design target, not a claimed WCAG minimum font size. Verify text bounds and collisions at supported desktop/phone widths and representative force states. Enlarging the chart text should not hide the sensitivity explanation or source action.

Large type is related but distinct. The rules at lines 521–527 leave `.sub`, `.note`, lists and table cells at 13 px, the same size used in ordinary Research at line 556. A parent font-size change cannot enlarge those fixed descendants, and the SVG uses its own text style. Fix or hide that control rather than continuing to promise projector readability it does not deliver. This does not require enlarging every piece of interface chrome.

### F1: real collision; fix the occupied locator area, not just two words

[Desktop Stretch](../../mvp-final/2026-09-08/scroll-corrected-frames/desktop-beat-3.png) visibly puts the locator's I-band/A-band text on the main molecular view. The [finale](../../mvp-final/2026-09-08/scroll-corrected-frames/desktop-beat-5.png) also overlaps locator geometry with the model. `auditPaintedOverlayLayout` at line 2110 only compares text boxes with chrome and other text boxes. “Resolved” means those checks passed; it does not certify geometry separation.

Claude's explanation of the story-card height and shared framing rule is credible. Its proposed suppression is directionally sensible, but removing only the two lower names may leave the locator rail overlapping the model. Admission/suppression must cover the actual conflicting locator area. Use existing projection and layout information with an appropriate visual margin; withdraw the whole secondary locator when necessary, keeping the main model's clear termini and applicable band labels. A molecular centerline alone is not the top of a thick rendered filament.

Check the affected beats, sweep endpoints, and ordinary narrow layouts visually. Do not convert the text-box “resolved” flag into an unsupported claim that all WebGL geometry is unobscured. Do not reopen shared camera framing to solve this bounded overlay problem.

### F3: teach the distinction; do not diagnose wrong molecular geometry

The scene's mirrored group is a clone rotated through the M-line ([SarcomereScene.js:1852](../../../src/render/SarcomereScene.js#L1852)). The Tour records enable it in the opening and “Follow one giant molecule” beats. The enlarged image predominantly frames one half, but pink continues past the labelled C-terminal anchor at the right edge.

Claude is right about possible ambiguity, but “undisclosed” overstates the absence of context: the opening says the enlarged view shows one half-sarcomere, beat 2 explicitly says one titin spans half a sarcomere, and the locator draws two halves. What is missing is a direct explanation of the visible continuation. We have not observed anyone actually misreading it.

Use a short clarification such as: **“Follow the highlighted titin from Z-disc to M-line; pink visible beyond the M-line belongs to the opposite half's representative titin path.”** Apply that wording where the mirrored path is present; Stretch itself has `mirror: false`. Do not imply the image depicts biological copy number or an exact molecular joining arrangement.

A covering sentence is sufficient for an accompanied private review. It is only a mitigation for a standalone educational app: users who receive the HTML without its original message will not see it. If a presentation patch is made, put a concise clarification at the point of learning. Fading cloned materials is unnecessary as a first remedy and brings avoidable rendering/state-management concerns.

## Claims to qualify or reject

**“Every finding is worth less than the evidence chain” is not a technical conclusion.** The package cost is real, and an immovable deadline can justify shipping the existing preview. But the old evidence remains valid for the old artifact. A new candidate requires new identity, generated outputs, required checks, relevant visual evidence and a newly verified ZIP; it does not erase prior engineering work or demand that unchanged biological assumptions be re-adjudicated. Preserve the frozen package, batch the selected fixes once, and refresh the required evidence once. Do not pass old screenshots off as proof of changed bytes. The number of previous tests should not make a visible defect untouchable.

**The contrast discrepancy is primarily an evidence-scope problem.** `scripts/validate_render_style.py:149–162` explicitly compares the declared numbers to arithmetic on the 8-bit palette colors. Those values can be correct while shaded rendered pixels are darker. Comments and release-gate descriptions do make broader claims about stage/projector separation, so it is fair to say the existing arithmetic does not demonstrate those claims. It is not fair to say the palette numbers themselves have been falsified. Screenshots support the practical observation that the scene is dim; Claude's exact pixel maxima were not independently reproduced here, and the pasted review does not include its sampling scripts/masks.

There is also no blanket scientific-image exemption from graphical contrast requirements. W3C ties the exception to an essential particular presentation. A deliberate subdued palette alone does not establish that exception. Neither review has performed the needed object-by-object conformance assessment. [W3C guidance](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html).

**The ink percentages quantify one thresholding method, not visual quality or learning.** Camera crop, excluded regions, background choice, antialiasing and the low 1.15:1 threshold affect the count. The stills substantiate the thin composition without granting those percentages the authority of an objective design score. More occupied pixels would not necessarily improve the explanation. Agree with deferring camera work; do not promise motion will compensate for weak still composition.

**Motion has behavioral test evidence, but no demonstrated aesthetic verdict.** The listed visual captures use reduced motion and do not establish transition smoothness or visual impact. However, the final Chromium and Firefox logs include `MVP endpoint replay traverses the working range twice without losing the Spring frame`, and its test at `test/browser/mvp-preview.spec.js:13` explicitly checks a running intermediate state followed by completion. Thus “neither review has any evidence of motion” is too broad. Correct formulation: animated playback is exercised by tests; these still-image reviews do not establish how good it looks or performs on the presentation hardware.

**No novice study means learning effectiveness is unknown.** It does not prove the app is ineffective or that a clearly labelled public prototype must be withheld. The visible usability issues, distribution expectations, browser support and the claims made at launch should determine that decision. A small uncoached novice check is useful before claiming successful lay education; a formal educational study is not automatically an MVP requirement.

**“WebKit is the only engine on iPhone” is too categorical.** Apple supports entitled alternative engines in the EU. This factual correction does not establish any browser's availability on a particular recipient's phone and does not reduce the need to check actual iPhone Safari before advertising that experience. [Apple documentation](https://developer.apple.com/support/alternative-browser-engines/).

Stopping repeated stalled WebKit harness runs was sensible within the private-preview fallback. A permanent ban on further Safari checks would be inappropriate if the actual audience or demonstration requires Safari. Partial passes are limited positive observations; neither empty locator logs nor timeout shapes identify the failure's cause.

**Scientific traceability is credible; biological validation remains absent.** The scope records, disclosure of transferred parameters, per-claim limitations and selected-source workflow support Claude's praise. They do not independently establish that the model, numerical parameter transfers or all source mappings are scientifically correct. The tissue-neutral wording is a legitimate clarity question for researchers, not a demonstrated biological error requiring an emergency change. Ask about it directly and preserve the current explicit no-tissue-specific-force limitation.

Minor identity-report correction: the `9463727d…` digest Claude calls `MANIFEST.sha256` is the digest of `release/MANIFEST.json` checked here. Its overall artifact identity conclusion is still correct.

## Recommended stop line

1. **Fix chart readability and the misleading Large type behavior.** This is worthwhile for ordinary expert use, not just a projector. Make a bounded chart/panel typography change, not a new charting system.
2. **Resolve the locator/model collision.** Prefer conservative overlay withdrawal to new camera framing or geometry.
3. **Clarify the mirrored path in the introduction.** If rebuilding, make the clarification available inside the applicable Tour beat as well. Rehearse the actual demo setup before a high-stakes presentation.

The sources-first reorder is the strongest optional extra: it directly supports the main expert action and changes content order rather than the scientific claim. It is reasonable to include if already regenerating the package and the selected-source/focus route is rechecked; it is also reasonable to defer under a hard deadline. Header identity cleanup and contrast-evidence wording can wait. Defer lighting, palette, composition, new labels or anatomy, force-law changes, additional isoforms, and any broad redesign.

For a private feedback request that must go out immediately, none of the confirmed defects requires withholding the existing package. For the promised polished showcase, chart readability and locator separation are worthwhile finishing work. Then ship for feedback; another open-ended internal review cycle has lower expected value than observing actual researchers and newcomers use the product.
