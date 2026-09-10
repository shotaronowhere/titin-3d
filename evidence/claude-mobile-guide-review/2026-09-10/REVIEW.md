# Independent review — mobile guide disclosure + mobile stretch legibility

**Reviewer:** Claude (Opus 5), read-only pass over `CHANGES.diff`, the eight screenshots, the six test logs, and the current sources in `/Users/shotaro/Downloads/artifacts`. I did not run the app, the build, or any test. Everything below is either (a) **observed** in a supplied screenshot, (b) **derived from source**, or (c) **judgment** — each finding says which.

---

## 1. Verdict

**The change addresses the user's request, and the direction is right — but it should not ship as-is.**

On the user's two complaints:

- *"takes up most of the space and can't be minimized"* — solved, and measurably. Comparing `stretch-before.png` with `guide-390.png` (both 390×844, same beat): the card drops from roughly 466 px to roughly 294 px tall (~55% → ~35% of the viewport), so the stage lane above it grows from ~278 px to ~450 px. **Observed**, pixel estimates approximate.
- *"the stretch is hard to see and visualize on mobile"* — improved. The thick pink/grey I-band and A-band bars plus the "I-band +200 nm vs 2,000 nm sarcomere" readout give a phone reader a direct answer to "what actually changed". Comparing `guide-390.png` (2,000 nm) with `guide-390-expanded.png` (2,400 nm) — these are *different lengths*, not a like-for-like geometry comparison — the pink bar visibly lengthens while the grey bar does not. I checked the arithmetic against the canonical records (`ShowcaseOverlay.js:146-154`, `GeometryEngine.js:103-117`): the drawn bars are proportional to the bracket spans to within perspective foreshortening, and the "+200 nm" figure is the correct Δ of the I-band bracket. **Derived from source; consistent with the screenshots.**

**What blocks delivery:** four existing browser specs will fail, and one of those failures is a genuine user-facing regression rather than a stale assertion. The implementer ran a targeted subset (guide-disclosure ×3 browsers, the Stretch suite, two of six Tour-shell viewports); the specs that break are all outside that subset. Items **M1–M4** below are must-fix. None of them requires a redesign; the largest is a two-line CSS/JS condition.

---

## 2. Must-fix

### M1. On short phones the first-use "tap a structure" invitation becomes unreachable — regression + 3 failing tests

**Where:** `src/index.template.html:2223-2239` (`syncInspectHintSurface`), called at `:2424`; interacts with the new `#guidedCardBody[hidden]` at `:721`.
**Affected:** any viewport with `height < 700` in Tour (375×667, 390×684, 360×640, 320×568 …), collapsed state — which is the *default* on those devices.

On a compact stage the hint is deliberately moved into the card's flow: `if (hint.parentElement !== $('guidedCardBody')) $('guidedCardBody').prepend(hint)`. The body is now `hidden` when collapsed, so the hint is inside a `display:none` ancestor and never renders. **Observed:** `guide-320.png` (collapsed) shows no hint anywhere; `guide-320-expanded.png` shows the "Inspect a label" pill inside the card. Since short phones start collapsed, the only affordance telling a reader the model is tappable is gone by default.

This also breaks `test/browser/ux-overhaul.spec.js:534` (`await expect(page.locator('#inspectHint')).toBeVisible()`) for all three `COMPACT_HEIGHT_VIEWPORTS` (`:500-503`), across all five beats. **Derived from source** — deterministic, not flaky.

**Fix:** the inline treatment exists because a compact stage has no free lane; a collapsed card *creates* that lane. Gate on it:

```js
const inline = compactHeight && !hint.hidden && !guideCollapsed
  && state.audienceMode === AUDIENCE_MODES.guided;
```

and let the existing floating placer run otherwise. Add a `guide-disclosure` assertion that the hint is visible in both disclosure states at 320×568.

### M2. Hiding `#stageForce` when collapsed removes the beat's quantitative claim by default — and breaks 4 tests

**Where:** `src/index.template.html:738` (`#guidedCard[data-collapsed="true"] #stageForce { display: none; }`).
**Affected:** all mobile/portrait-tablet viewports, collapsed (the default), Stretch beat.

The force chip is not decoration: it carries the beat's only number-with-evidence-class (`≈1.3 pN · supported · modeled passive force per titin`) and is the sole route into the passive-force evaluation (`$('stageForce')` → `openEvidence(…, 'measure')`, `showcase_phase13.test.js:92`). With the collapsed default, a phone reader on the Stretch beat sees a title, a slider and a Play button — no explanation and no force. **Judgment:** the collapsed grid has a free second column (`:739` makes Play span `1 / -1`), so this space wasn't reclaimed for anything; keeping the chip in column 2 costs nothing visible. `guide-390.png` shows the empty row width available.

`display:none` also makes the element unclickable, so these will fail (**derived from source**):

| Spec | Line | Viewport |
|---|---|---|
| `test/browser/final-polish.spec.js` | `:40` | 390×844, 320×740 |
| `test/browser/final-polish.spec.js` | `:113` | 390×844 |
| `test/browser/mvp-preview.spec.js` | `:54` | 390×844 |
| `test/browser/mvp-preview.spec.js` | `:103` | 390×844 |

**Fix:** drop rule `:738`; keep the chip in the collapsed row (optionally shorten its label below ~360 px to the value plus class, with the full text as the accessible name). Then remove the `aria-controls="… stageForce"` half at `:822` and revert the conditional branch at `ux-overhaul.spec.js:432-436` to the plain containment assertion. If the team prefers to keep it hidden, the four tests above must be updated *and* README's "expand the guide to see the force readout" needs a matching note in the release limitations, not just the README.

### M3. `controls.spec.js` chrome budget was not updated — 6 tests fail

**Where:** `test/browser/controls.spec.js:41-42` (`counts.visible <= 4`, `counts.tabbable <= 3`), run over all six `SC27A_VIEWPORTS`.

`ux-overhaul.spec.js:378-382` was correctly bumped to the new list `['scopeBadge','audienceEvidence','guideToggle','chapterPrevious','chapterNext']` = 5 visible / 4 tabbable (`#scopeBadge` is a `<button>`, `:799`). `controls.spec.js` measures the identical boot state with the old caps and was left untouched. **Derived from source**; the passing 375×812 shell run confirms `#guideToggle` is visible at mobile widths too.

**Fix:** raise `controls.spec.js:41-42` to `5` / `4` to match, in the same commit.

### M4. The guide toggle and every resize now discard a manually adjusted camera

**Where:** `src/index.template.html:1329-1337` (toggle handler calls `applyCameraPreset()`) and `:5443` (`audienceReframePending = true`, previously `||= usesStretchComparisonFrame()`).
**Affected:** all viewports, all modes, after any manual orbit/pinch/pan.

A manual gesture sets `state.sceneId = null` but leaves `state.cameraPreset` intact (`:5150-5160`). `usesStretchComparisonFrame()` (`:3503-3508`) then returns false, so `applyCameraPreset()` falls to `visualization.frame(name, framing)` and snaps back to the named preset. Two new paths reach it:

- **Toggle:** a phone reader pinch-zooms into the I-band — exactly what the user said was hard to see — then taps *Show guide* to read about it, and the zoom is thrown away.
- **Resize:** `scheduleViewportSync` is bound to `resize`, `orientationchange` and the media-query change (`:5448-5450`), and now unconditionally re-applies the preset. Rotating a phone, an iOS URL-bar height change, or a desktop window resize in Research all reset a Custom camera. Before this change the flag was only set for the stretch comparison frame (which a manual camera has already left) or a real mode change — the comment at `:1307-1315` states that "only when the mode ACTUALLY changed" rule explicitly.

**Derived from source.** `stretch.spec.js:294-324` asserts a manual camera survives a *slider* change but never a toggle or a resize, so the suite cannot catch this; worse, the preset label stays "Custom" while the pose resets, so a label-based assertion would pass anyway.

**Fix:** reuse the condition the Custom path already establishes.

```js
const cameraFollowsPreset = () => state.sceneId !== null;
// toggle:
measureTourCard();
if (cameraFollowsPreset()) applyCameraPreset();
// scheduleViewportSync:
audienceReframePending ||= cameraFollowsPreset();
```

Add a regression test: orbit manually at 390×844, toggle the guide, assert `expectSameCamera(page, custom)`; repeat across a `setViewportSize` change.

I'd also note the original run's timeout at `guide-browser-tests.log:63-77` (`stretch.spec.js:294` exceeding 60 s in `settledCamera`, passing on rerun with 120 s) is at least *consistent* with extra unconditional reframes; I can't confirm causation without running it, but I would not write it off as pure flake until M4 is fixed and the test is re-run at the original budget.

---

## 3. Should-fix

### S1. The scale ruler is withdrawn on short phones in favour of a readout that says "+0 nm" in the entry state

**Where:** `src/index.template.html:2794-2800` sets `compactStretchComparisonShown`, consuming the gate at `:2851`.
**Observed:** `guide-320.png` — no "200 nm" ruler, and the replacement text reads *"I-band +0 nm vs 2,000 nm sarcomere"*, which conveys nothing. The "titin line ≈N× reading width, not scale" caption was already suppressed below 700 px (`:2870`, pre-existing), so on a short phone in Stretch the frame now carries **no scale reference at all** at its default length.

The ruler's own comment (`:2845-2849`) argues it exists so "a viewer who cannot see the scale cannot tell an honest LOD withdrawal from a missing feature". Trading it for a zero-valued sentence at the state the reader lands on is the wrong side of that trade. **Judgment**, but it's the project's own stated standard.

**Fix (smallest):** only take the lane when the comparison is actually saying something — `compactStretchComparisonShown = height < STAGE_LAYOUT.compact_stage_height_px && change !== 0`. **Better (my recommendation):** leave the ruler alone and put the extension next to the length it derives from, in `#stageLengthReadout` (`:841`), which stays visible in the collapsed card — e.g. `2,400 nm · I-band +200`. That keeps the ruler, keeps the number on screen when the card is collapsed, and removes the lane contention entirely. Either way, README (`:89-95` of the new paragraph) should say the ruler is replaced on short screens, since it currently only advertises what was added.

### S2. The inspect-hint pill paints over the new comparison bars

**Observed:** `guide-390-expanded.png` — the "Click or tap a structure to explain it" pill sits across the middle of the pink/grey bars at ~y 289; only the bar ends either side of the pill are visible. The labels below it are clear, so the collision is invisible to the existing checks.

**Cause (derived from source):** `resolveInspectHintPosition` builds `labelBoxes` from `svg.querySelectorAll('text')` only (`:2272-2275`), and `auditPaintedOverlayLayout` likewise inspects `text` nodes (`:2190-2214`). The new 6 px bars are `path` elements (`:2788-2792`), so neither the placer nor the audit can see them — the overlay still reports `data-label-layout="resolved"`.

**Fix:** include the comparison geometry in both sets, e.g. add `[data-stretch-comparison] path` rects to `labelBoxes` in the placer and to the audited nodes. That preserves the existing "the pill must not make a clear layout visually false" rule (`:2242-2247`) now that a non-text mark carries meaning.

### S3. The new inner scroller contradicts the documented 200 %-zoom decision

**Where:** `src/index.template.html:743-745` (`@media (max-height: 500px) { #guidedCard { max-height: 550px } }`) sitting directly beneath the comment at `:711-713`: *"Keep the Tour as one document scroll surface instead of shrinking text or adding an internal story-card scrollbar."*

At 640×360 (the 1280×720-at-200 % case that comment names) the app is a 680 px document-scroll surface (`:714-718`); the new cap plus `#guidedCardBody { overflow-y: auto }` (`:724`) turns the expanded card into a nested scroller — precisely what the comment rejected. The existing guard at `ux-overhaul.spec.js:791-792` no longer catches it, because at that viewport `innerHeight <= 500` makes the guide start collapsed, so `scrollHeight === clientHeight === 0` and the assertion passes vacuously. **Derived from source.**

**Fix:** exempt short viewports — `@media (max-height: 500px) { #guidedCard { max-height: none } #guidedCardBody { overflow: visible } }` — and extend the 200 %-zoom test to expand the guide before asserting. If the nested scroller is intentional, the comment at `:711-713` needs to be rewritten rather than left contradicting the rule below it.

The same block governs landscape phones (844×390 etc.): the JS default (`:1320`, `innerHeight <= 500`) correctly starts them collapsed, and no landscape viewport appears in any spec. Worth one case in `guide-disclosure.spec.js`.

### S4. Default-collapsed hides the entire lesson on a phone's first load

**Judgment**, not a defect. `guideCollapsed = mobileResearchMedia.matches || window.innerHeight <= 500` (`:1320`) means a first-time phone visitor lands on beat 1 with a title, Previous/Next and *Show guide* — the question, the summary, the evidence recap (beat 5) and the lattice figure (beat 4, `#guidedLattice` at `:833`) are all inside the collapsed body. For a teaching artefact, hiding the teaching by default is a strong choice to make silently; the user asked for *collapsible*, which is a weaker claim. Note the release imagery inherits it: every `*_mobile` entry in `release/SCREENSHOT_PACK.md:45-78` will now capture a card with no explanation.

Cheap alternatives, in order of my preference: (1) when collapsed, keep `#chapterSummary` visible clamped to two lines (`-webkit-line-clamp`) so the guide *previews* rather than vanishes, with the toggle reading "More"/"Less"; (2) default expanded on every beat except Stretch, where the stage is the point; (3) keep the current default but persist an explicit choice (see O4). If the current behaviour is deliberate, add an expanded mobile capture to the screenshot pack so the release record still shows the lesson.

---

## 4. Optional polish

- **O1 — `tabindex="0"` on a region that often doesn't scroll** (`:827`). Correct for WCAG 2.1.1 when the body overflows; a dead tab stop when it doesn't. Set it only when `scrollHeight > clientHeight` inside `syncGuideDisclosure`. Related: this stop is invisible to `chromeCounts` (`helpers.js:88-90` matches only form/link/role elements), so `tourControlBudget`'s `tabbableChromeTargets` (`TourView.js:17`) now understates the real tab order by one on desktop. Either exclude it or count it.
- **O2 — `aria-controls="guidedCardBody stageForce"`** (`:822`) claims control of `#stageForce` at every breakpoint, but rule `:738` only applies on mobile. Harmless, inaccurate. Moot if M2 is fixed by keeping the chip.
- **O3 — Focus loss on an auto-collapse.** `scheduleViewportSync` (`:5438-5441`) can hide a body that contains the focused element (an evidence chip, or the region itself) when a rotation crosses the media query before any explicit choice. Move focus to `#guideToggle` if `guidedCardBody.contains(document.activeElement)` before hiding.
- **O4 — The choice doesn't survive a reload or a shared link.** `guidePreferenceChosen` is module state only. The project already uses `localStorage` for `titin.sc25.inspect-hint-seen`; the same pattern would fit.
- **O5 — Baseline geometry recomputed per frame.** `model.geometryAt(presentation.scope.working_range_nm[0])` (`:2796`) runs inside the overlay pass; in `mechanical` partition mode that is a force-balance solve (`GeometryEngine.js:123-130`), and during a sweep the signature short-circuit doesn't help because the length changes every frame. Hoist it to a module constant — the value can never change. While there, derive both sides through the same accessor (`bracketById('aband').start_nm` is the same quantity as `thick_filament.X_start`, `ShowcaseOverlay.js:152`) so the two sources can't drift apart silently.
- **O6 — Label wording.** The canonical bracket is `'A-band · half'` (`ShowcaseOverlay.js:151`); the compact label says `'A-band · fixed'` (`:2786`), and the pair of adjacent bars reads as a whole sarcomere. Likewise "I-band +200 nm" is per half-sarcomere while the sarcomere itself moved 400 nm — internally consistent with the bar, ambiguous on its own. The desktop label has the same gap, so this is pre-existing, but the new readout is the first place a *number* is attached to it. `'A-band · half · fixed'` and "this I-band" would close it.
- **O7 — Expanded state at 320×568** (`guide-320-expanded.png`, **observed**): the body clips text mid-line ("During stretch, folded-domain chains") with a divider immediately below and no fade/shadow, so it reads as broken layout rather than a scroll region; and the stage compresses to roughly 65 px, where the "200 nm" ruler overprints the titin path and the two terminus labels crowd the molecule. The 70 dvh cap is the reader's own choice, so I wouldn't call it a defect — but a scroll affordance on `#guidedCardBody` and a floor on the stage lane (e.g. `min(70dvh, 100dvh - 240px)`) would both help.

---

## 5. Test coverage: what's missing

Beyond the four predicted failures in M1–M3, the gaps I'd close:

1. **No toggle-during-playback test.** Reading `toggleSweep`/`stopSweep` (`:5346-5396`), toggling the guide does *not* stop the sweep — the stop hooks are the render surface, the slider and the button — and `applyCameraPreset` re-establishes the frame mid-sweep. That's the behaviour you want, and nothing pins it.
2. **No manual-camera-survives-disclosure/resize test** (see M4).
3. **The shell contract went vacuous on mobile.** `ux-overhaul.spec.js:395` and `:427-428` assert the guide body doesn't scroll; with the body hidden, `scrollHeight === clientHeight === 0`. Assert the *expanded* card at mobile viewports, or the contract no longer covers the case it was written for.
4. **The new spec's scroll check is conditional** (`guide-disclosure.spec.js:26-30`) — it only runs where content overflows, so on 768×1024 and possibly 390×844 the keyboard-scrolling path may not execute at all. `guide-scroll-tests.log` confirms it for 320 on WebKit; the log doesn't tell you whether the branch was taken on the others.
5. **Untested viewports affected by the new unconditional `#guidedCard { max-height: calc(100dvh - 130px) }`** (`:722`, which overrides the previous `max-height: none` at `:594`/`:679`). Only 375×812 and 1280×720 shell tests were run. At 1024×768 the card is a 307 px-wide column with a 638 px cap — if beat 4's lattice card was naturally taller than that, `ux-overhaul.spec.js:427-428` now fails. I can't measure it; run the full six-viewport shell suite.
6. **No landscape-phone coverage** at all (S3).
7. **axe results aren't in the evidence folder.** The implementer reports clean WCAG2A/AA/2.1AA scans at 320/390/768/1280, but the saved artefact is absent and `ux-overhaul.spec.js:796-827` (the committed axe gate) is not in any log here.

---

## 6. Strongest aspects

- The disclosure semantics are right: a real `<button>` with `aria-expanded` kept in sync with a visible label change (`:1322-1337`), verified on Chromium/Firefox/WebKit including keyboard Space/Enter (`guide-cross-browser.log`, 12/12).
- The two-tier default is a genuinely good detail: the screen decides until the reader decides, and `guidePreferenceChosen` (`:5438`) stops a later resize from overriding an explicit choice. `guide-disclosure.spec.js:64-79` pins both halves.
- The structural split is well chosen — navigation, slider, playback, the final-beat evidence CTA and the `role="status"` announcement all live *outside* the collapsible body (`:835-850`), so collapsing costs no control and no live-region continuity.
- Reframing on disclosure change and feeding the measured card box back through `unobscuredFrameOptions` (`:5317-5333`) means the model actually recentres into the space the collapse frees, rather than leaving it empty — visible in `guide-390.png`.
- The new numbers come from canonical records rather than restated constants, and the compact-stage threshold stays a single governed value (`showcase_phase27a.test.js:315-321` was updated to 8 branches rather than allowing a literal).
- 618/618 Node tests and 12/12 cross-browser disclosure scenarios are real coverage for the surface that changed.

---

## 7. Validation limits

I did not run the app, the build, the browser suite, the Node suite or axe; every predicted failure above is inferred from reading the specs against the current sources, and every layout claim marked *observed* comes from the eight supplied PNGs, which I measured by eye. Those captures are from the implementation session, so small post-capture accessibility edits may not be reflected; the 2,000 nm and 2,400 nm images are different model states and I have not treated them as a like-for-like geometry comparison. Passing logs cover only the subset actually executed — the guide-disclosure spec, the Stretch suite, two of six Tour-shell viewports, and one history rerun at a raised budget — and none of them is evidence about the specs named in M1–M3, which were not run. There was no physical-device testing and no human usability study, so all claims about how the collapsed default *feels* to a reader (S4, O7) are judgment, not measurement.
