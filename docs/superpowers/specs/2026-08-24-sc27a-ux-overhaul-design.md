# SC-27a — Final UX and Visual Design Overhaul

> **Status:** Design, 2026-08-24. Approved forks recorded in §3. Not yet an implementation plan.
>
> **Relationship to the governing plan:** `docs/superpowers/plans/2026-08-09-titin-mvp-readiness-synthesis.md`
> defines SC-27 as *"Accessibility, human validation, expert sign-off, and release."* This spec does
> not replace that sprint. It inserts **SC-27a** before it and renames the existing sprint
> **SC-27b**. The reason is in §8: the lay-comprehension gate requires all five participants to see
> one frozen candidate, and re-running it costs five fresh consented, pre-registered, un-coached
> participants. The study should be aimed at the final design, not at the current one.
>
> **Scientific scope:** none. No biological coordinate, mechanical parameter, claim, source, decision
> record, or evidence class changes. Three guided component colours (`thick_filament`, `myosin_head`,
> `thin_filament`) and the stage background are re-derived under the §5 constraints. All four are
> declared presentation values, not scientific ones, and every declared contrast ratio that depends
> on them is recomputed and re-declared rather than assumed.

---

## 1. Outcome

One frame that makes a layman want to look, and one control surface small enough that they do not
have to decide anything before they learn something — without demoting a single scientific claim
from reachable to unreachable.

Concretely, at the end of SC-27a:

1. The cold open reads as a composed image, not an unfitted viewport.
2. Titin is the figure and the filament lattice is the ground, by luminance and composition.
3. Learn mode presents **7 control affordances** — realising the "~8" ruling of §3.3 — which render
   as **15 focusable targets** under the §2.1 metric, down from 26 at chapter 1 and 33 at chapter 4.
4. Every expert artifact that exists today still exists and is reachable in one click from the
   object or number it belongs to.
5. A layman can name what kind of statement they are looking at, and find its source, without being
   taught a six-word vocabulary first.

---

## 2. Measured baseline

All figures below were measured against the committed `index.html` at
model `7badc8e270e7`, app `5bae463fa933662cc215e7eb994165694236aa4b`, build inputs `2c216b264d5a`,
in Chromium at `deviceScaleFactor: 1`. They are reproducible; the measurement scripts are throwaway
and are not part of the deliverable.

### 2.1 Control and text density

| State | Viewport | Visible controls | In the story card | Words in viewport |
|---|---|---|---|---|
| Learn, ch. 1 `meet_sarcomere` | 1440×900 | 26 | 7 | 237 |
| Learn, ch. 4 `stretch_spring` | 1440×900 | **33** | **14** | 339 |
| Learn, ch. 4 `stretch_spring` | 390×844 | 18 | 8 | 208 |
| Explore | 1440×900 | 25 | — | 403 |

The Explore drawer holds **2,643 words** in total; 403 of them are in the viewport, so roughly
2,240 require scrolling. Counting selector:
`button, input, select, a[href], [role="tab"]`, filtered to non-zero box intersecting the viewport.

Excluded from the counts, deliberately: three `<rect class="label-hit" role="button">` hit targets
over on-canvas landmark labels. They are invisible, they coincide with labels already drawn, and
they are a good affordance. They are not clutter and must survive.

### 2.2 The frame

- **89.5%** of the canvas not covered by a UI panel is flat `#0e1116`.
- The rendered sarcomere occupies a band of roughly **100 px — about 11% of frame height**.
- Geometry spans x ∈ [42, 1439] at 1440 px: it does **not** bleed off the left edge; it **is
  clipped at the right**, and titin's own trace reaches the right edge with it.
- The story card is **32.7%** of viewport height at 1440×900 and **40.9%** at 1280×720.

### 2.3 Titin's visual weight

Titin is **not** a hairline. `data/render_style.json` sets `trace_px: 5.0`, and the rendered median
column thickness measures 5 px, with `halo_radius_scale: 3.2` and `halo_opacity: 0.2` already
present. The problem is not line width. It is that 5 px of subject sits inside an 89.5% void, and
that the chrome is louder than the molecule:

| Element | Pink saturation, `R − min(G,B)` |
|---|---|
| Rendered titin, canvas band | mean **74.9**, peak 79 |
| Story-card border | peak **162** |
| Inspect-hint pill | peak **162** |

`--titin` is `#ff5d7d`, whose saturation is exactly 162. **The chrome paints titin's own colour at
full purity while the molecule renders at under half of it.**

### 2.4 Two navigation vocabularies

`data/scenes.json` carries seven `scenes` (chapter scenes, keyed `meet_sarcomere` … `knowledge_recap`)
and seven `control_scenes` (button scenes, keyed `overview` … `lattice`). They are near-duplicates:

| Chapter | `SCENES` twin | Difference |
|---|---|---|
| `meet_sarcomere` | Overview | none that renders |
| `inspect_anchors` | Z-anchor | none that renders |
| `scaffold_thick_filament` | A-band scaffold | none that renders |
| `knowledge_recap` | Overview | none that renders |
| `follow_titin` | Titin alone | `scale` only |
| `molecular_architecture` | Architecture | `camera_preset` only |
| `stretch_spring` | Spring | `scale` only |

"None that renders" is precise: the four pairs differ only in that control scenes explicitly pin
`lattice_rings_1: true` and `extended_lattice: false`, which is exactly what chapters inherit —
every chapter has `visibility.rings: null`, and `SceneController.js:150` computes
`rings = Number(visibility.rings) || 1`.

Two control-scene cameras are never reached by the story: `closeup.junction` and `closeup.lattice`.

### 2.5 Duplication and collision defects

- Every chapter's `next_actions[0].label` is the same string as the Next button beside it. At
  chapter 1 both read *"Next: Follow one giant molecule"*; at chapter 4 both read
  *"Next: Inspect both anchors"*. This is structural, not a one-off.
- The **More** sheet's "ALL SCENES" grid is the same seven scenes visible in the bar behind it.
- During Stretch, `#stretchHint` *"Watch the I-band bracket"* renders at (628, 754, 184×32) with
  `z-index: auto`, inside `#inspectHint` at (582, 730, 275×48) with `z-index: 9`. The instruction
  is occluded by the hint it should have replaced.
- `#sceneTruth` prints "Overview" beside a button already labelled "Overview".
- **`narration` and `lay_summary` are byte-identical in all seven chapters** — the same prose stored
  under two keys that serve different audiences. §6 C0 turns this from a defect into the lever that
  lets the card get short without shortening the transcript.

### 2.6 Boot fragility

`focusSpan: contentCenterYPx requires a finite pixel position and a measurable viewport`
(`src/render/Viewer.js:592`) is reachable **only** when `container.clientHeight === 0`:
`unobscuredFrameOptions` falls back to `canvasBox.height / 2`, so the requested value is provably
finite. When it throws, boot dies and the user is told *"The committed build may be corrupt or out
of date"* — which is false. The same class already degrades gracefully for width
(`Viewer.js:376–377`) and hard-fails for height.

Reproduced 100% in the in-app Chromium preview pane; not reproduced under Playwright Chromium at
1440×900, 400×120, or 300×60. **No test asserts the throw**, so making it degrade is safe.

### 2.7 Test surface

**594 Node tests** (`npm test`, 594 pass / 0 fail, ~119 s) and **75 Chromium tests**
(`playwright test --list --project=chromium`). 669 total.

---

## 3. Approved design rulings

Three forks were put to the project owner on 2026-08-21 and resolved:

1. **Scientific-honesty chrome — demote to one quiet line.** The cold open keeps a single muted
   identity line that opens the full scope panel on click. Evidence chips, decision counts,
   fingerprints and caveats move into Explore and into the object inspector, where they stay
   verbatim. Nothing is deleted or softened; the claims still travel with every object and value.
2. **Titin's dominance — composition plus a highlight channel.** The declared render-width
   multiplier does not move. Titin earns the frame through framing, figure/ground and a declared
   highlight channel, not through exaggeration.
3. **Control surface — cut to ~8, one navigation system.** Learn keeps chapter dots, Back, Next,
   the length slider, Stretch, an Explore toggle, and the colour key. Counted exactly, that ruling
   is **7 affordances / 15 focusable targets**; §6 B and §9.5 use the precise figures.

---

## 4. Design principles

1. **One subject, one story, one control surface.** If two affordances reach the same state, one
   goes.
2. **Depth on demand.** Nothing expert appears pre-emptively; everything expert is one click from
   the object or number it belongs to.
3. **Compose, don't fit.** A half-sarcomere is a ~120:1 aspect-ratio object. Framed near side-on in
   a 16:9 canvas it can only ever be a thin band. `frame_margin_factor` is already 1.12
   (`StageLayout.js:17`) and the frame is still 89.5% empty. Fitting cannot fix this; only
   composition can.
4. **Fill the frame with geometry, never with a lighter backdrop.** §5.2 proves the backdrop is not
   available.
5. **Derive, never restate.** The project has already been bitten by this
   (`data/geometry_strategy.json`, defect PH3-1: *"index.html restated the evidence vocabulary and
   so mis-displayed MODELED as UNKNOWN"*; lesson: *"a vocabulary restated in a second place is a
   vocabulary that will drift"*). Every new lay-facing label derives from the canonical record.

---

## 5. Hard constraints discovered

These were established during design and are the reason several obvious moves are not available.
**Any implementation that ignores §5.1–§5.3 will fail `npm run verify`.**

### 5.1 The colour contract is at its floor

`data/release_gates.json` declares 19 `contrast_pairs` (validated against `src/index.template.html`)
and 6 `object_contrast_pairs` (validated against `src/render/SarcomereScene.js`).
`scripts/validate_release_gates.py:169–187` requires, for each pair, that the ratio meets its floor
**and** that both hex literals physically appear in the named source file.

Current object-pair headroom:

| Pair | Floor | Actual | Headroom |
|---|---|---|---|
| `actin_vs_crowns_guided` | 1.7 | 1.74 | **+0.04** |
| `myosin_vs_stage_guided` | 1.9 | 1.95 | **+0.05** |
| `actin_vs_myosin_guided` | 1.7 | 1.78 | **+0.08** |
| `titin_vs_actin_guided` | 1.7 | 1.86 | +0.16 |
| `titin_vs_myosin_guided` | 2.6 | 3.29 | +0.69 |
| `titin_vs_stage_guided` | 5.5 | 6.41 | +0.91 |

Four of six sit within 0.16 of their floor. **Naive desaturation of actin and myosin will break the
gate.** §6 A2 gives the move that does not.

### 5.2 The stage background cannot get lighter

`titin_vs_stage_guided` ≥ 5.5 caps background luminance at 0.01467. But `myosin_vs_stage_guided`
≥ 1.9 caps it at **0.00685**, and that is the binding constraint. The current `#0e1116` sits at
0.00552. Worked examples:

| Candidate background | titin_vs_stage | myosin_vs_stage |
|---|---|---|
| `#0b0e12` | 6.55 | 1.99 |
| `#0e1116` (current) | 6.41 | 1.95 |
| `#141821` | 6.02 | **1.83 — FAILS** |
| `#181d27` | 5.72 | **1.74 — FAILS** |

A "low-contrast gradient to lift the void" is **not available**. The background may go *darker*
(which raises every ratio) with a vignette. Fullness must come from geometry and depth — which the
existing `closeup.lattice` framing already demonstrates.

### 5.3 A second, stricter luminance rule

`test/showcase_phase25.test.js:531` requires, for every entry in `GUIDED_COMPONENT_COLOR` except
`telethonin`:

```js
titinAgainstStage > ratio(colour, stage) * 1.5
```

Tightest current margin is `thin_filament` at +1.23; all nine pass. Equal-luminance desaturation
(§6 A2) preserves this margin exactly, because it is a function of luminance alone.

Three consequences:

- The test **hardcodes `const stage = 0x0e1116`** (`:547`) and does not read `Viewer.js:190`.
  Changing the scene background without updating this constant leaves a green test that no longer
  measures anything real.
- Verification is from **declared constants, not rendered pixels**. Depth fog therefore does not
  break the test — but by the same token the test stops proving what it claims if fog materially
  darkens context objects. Fog's maximum attenuation must be bounded and the bound declared, so the
  luminance argument still holds at the far plane.
- Worse, the validator's "ships in source" check is a **substring match over the lowercased file**.
  `#0e1116` appears in `src/render/SarcomereScene.js` exactly once — at line 245, **inside a
  comment** (*"Against #0e1116: thick …"*). The real value lives in `Viewer.js:190`. So the stage
  colour that the object-contrast gate declares is currently verified against prose. Change
  `Viewer.js:190` alone and every check still passes, against a stale comment.

**The stage background therefore has four homes that must move in one commit:** `Viewer.js:190`, the
comment at `SarcomereScene.js:245`, `showcase_phase25.test.js:547`, and the `background` field of the
**two** object pairs that name it (`myosin_vs_stage_guided`, `titin_vs_stage_guided`).

The seven *text* pairs that also name `#0e1116` — `body_text`, `stage_bar_label`, `stage_readout`,
`stage_force_label`, `stage_force_class`, `selected_extension_row`, `disabled_extension_row` — are
declared against the CSS token `--bg` in `index.template.html`, which is a different declaration from
the WebGL scene background. Changing the scene background alone leaves all seven untouched. Keep that
separation; changing both at once multiplies the re-declaration surface from 2 pairs to 9.

### 5.4 The lay gate names four classes; the vocabulary has six

`data/geometry_strategy.json → meta.evidence_classes` is the canonical ladder:

```
UNKNOWN < SCHEMATIC < INFERRED < MODELED < STRONGLY INFERRED < MEASURED
```

The scored question `distinguish_claim_kinds` asks a layman to distinguish
*"measured, modeled, inferred, and schematic"* — **four of the six**. `STRONGLY INFERRED` and
`UNKNOWN` are not named. Today `index.template.html:3061` prints `chapter.evidence_class` raw, so
the **first evidence class a layman ever sees is `STRONGLY INFERRED` on chapter 1** — one of the two
the question does not name.

`UNKNOWN` cannot be folded into any of the four: its canonical definition is *"Not established; must
be depicted as unknown rather than invented."* So the lay surface needs **five** buckets, four of
them scored. `STRONGLY INFERRED` presenting under the lay word "Inferred" is a downgrade in declared
confidence, which `data/structural_states.json:110` already establishes as *"the honest direction."*

This mapping is declared **in `data/geometry_strategy.json`**, derived at runtime, and never
restated in the template — per §4.5.

### 5.5 URL state and the picking hit grid

`CONTROL_SCENE_IDS` is an exported frozen contract in `SceneController.js:17`, and `scene` is a
v2 URL key. Removing the scene *buttons* must not remove the scene *vocabulary*: deep links, the
`url_state` automated check, and the legacy v1→v2 migration all depend on it.
**Keep the vocabulary, remove the buttons.**

`test/fixtures/picking_hit_grid.json` is generated by `scripts/build_picking_hit_grid.mjs` from the
projected visible titin paths of the control scenes at fixed viewports. **Changing the default
camera invalidates it.** Its own contract states that individual samples cannot be added, removed or
nudged, so the sanctioned path is full regeneration via `npm run build:hitgrid`, followed by review
and `npm run check:hitgrid`.

### 5.6 Accessibility floors that must survive

- `text_zoom` (200%) is PENDING and human-verified in SC-27b: **no label container may take a fixed
  pixel height.**
- `controls.spec.js:368` — coarse-pointer targets meet a **44 px** floor.
- `reduced_motion` is an automated PASS (`test/showcase_phase7.test.js`); every new transition needs
  a reduced-motion path, and `picking.spec.js:319` requires the onboarding invitation to appear
  without a pulse.
- `object_contrast` requires objects a caption names to be separable **by luminance, not hue alone**.

---

## 6. Work

### Section A — The stage

**A1 · Compose the default frame.** Replace the near-side-on cold open with a framing that looks
*into* the lattice, context filaments receding, so the frame is filled by geometry and depth.
Reframe on every canvas-size change and mode switch, not just resize the renderer.

Measured fill of the non-UI canvas across existing framings, all at 1440×900 on the committed build:

| Framing | Rendered share | Note |
|---|---|---|
| `view.oblique` | **2.2%** | worst of all — the diagonal backs the camera off |
| `view.titin_story` (today's cold open) | 10.5% | |
| `region.prox_Ig` (chapter 3) | 18.8% | |
| `closeup.lattice` | **70.8%** | already built; the story never visits it |

**Target: ≥50%.** 70.8% is demonstrated achievable by machinery that already ships. Note that an
oblique angle alone makes the problem *worse*, not better — depth into the lattice is what fills the
frame, so A1 is a framing-and-context change, not a camera-direction tweak.

*Constraint:* §5.5 — regenerate and review the hit grid. *Verify:* rendered share ≥50%;
`npm run check:hitgrid` passes.

**A2 · Figure/ground by equal-luminance desaturation.** Move `thick_filament`, `myosin_head` and
`thin_filament` toward neutral **at constant relative luminance**. Because contrast ratio is a
function of luminance alone, every declared ratio in §5.1 and §5.3 is preserved *by construction*
while the context stops competing with titin for chroma. Verified feasible:

| Chroma retained | myosin | actin | crowns | All six floors | Min headroom |
|---|---|---|---|---|---|
| 100% (today) | `#2d4661` | `#337467` | `#33475d` | pass | +0.043 |
| 55% | `#374554` | `#4b6f68` | `#3b4652` | pass | +0.028 |
| 35% | `#3c454e` | `#566d68` | `#3f464d` | pass | +0.024 |

*Constraint:* the ±1-bit rounding to 8-bit channels perturbs luminance slightly, so the
implementation must **recompute all six ratios and the §5.3 margin from the final hexes** rather
than assume, and re-declare them in `data/release_gates.json`. Headroom stays thin at every option;
that is a property of the existing palette, not of this change.

*This section is gate-critical, not aesthetic:* `distinguish_motor` — *"distinguish titin from the
ATP-powered motor"* — is the only question in the lay protocol with a **5/5** floor. It is a
figure/ground problem.

**A3 · Highlight channel.** Raise `halo_opacity` from 0.2 and add a dark contour so titin separates
from the ground rather than dissolving into it. `trace_px`, `guided_radius_scale` and every declared
width multiplier stay exactly where they are. Declare the halo once, in the render-meaning text, as
a highlight channel and not an evidence channel — the same argument the project already makes for
selection colour. *Note:* this matters less than A1/A2/A6. Titin is 5 px, not 3; the deficit is
context, not width.

*Bound, if anyone reaches for `trace_px` anyway:* `scripts/validate_render_style.py:65–68` enforces
`(trace_px + line_pick_threshold_px) / 2 ≤ emphasized_titin_tolerance_px`. At the shipped
`line_pick_threshold_px: 6.0` and `emphasized_titin_tolerance_px: 10.0`, that caps `trace_px` at
**14.0**. `halo_opacity` is not in that validator's `numeric_positive` list and carries no declared
ceiling, which is precisely why raising it must be justified in the render-meaning text rather than
just tuned.

**A4 · Darken and vignette.** Per §5.2 the background may not lighten. Go slightly darker with a
vignette, which raises every ratio in §5.1. *Constraint:* the four-home rule at the end of §5.3 —
`Viewer.js:190`, the comment at `SarcomereScene.js:245`, `showcase_phase25.test.js:547`, and the two
object pairs — all in one commit. Leave the CSS `--bg` token alone.

**A5 · Legibility of the scale unit.** `.science-label` is `font-size: 9px`
(`index.template.html:397`). Raise it. **Do not move the reading-width caption** — it is already
beside the scale bar at `(barX, barY + 11)`, and its disappearance at close zoom is correct
behaviour: `illustrativeWidthRatio` returns `null` when `drawnPx <= molecularPx`, so it hides
exactly when there is no exaggeration left to declare. *Constraint:* §5.6 — no fixed pixel height.

**A6 · Stop the chrome out-saturating the subject.** Card borders, hint pills and accents must not
use `--titin` at full purity (saturation 162) while the molecule renders at 74.9. Derive chrome
accents at reduced chroma. *Constraint:* `titin_identity` (`#ff5d7d` on `#161b22`, min 4.5) is a
declared text pair; the identity swatch keeps the true colour, the borders do not.

### Section B — Control surface, 26/33 → 15 focusable targets

Learn presents seven affordances: **chapter dots · Back · Next · length slider · Stretch · Explore ·
colour key.**

Two of the seven expand into siblings, so the §2.1 selector count lands at **15**: 7 chapter dots,
Back, Next, slider, Stretch, Explore, and 3 colour-key chips. The measured target is 15, not 7 — the
two numbers count different things and both appear in §9 so the exit criterion is testable. Critically,
15 must hold at **every** chapter: today the count varies from 26 to 33 because chapters inject a
variable number of `next_actions` into the card.

| Removed | Where it goes |
|---|---|
| `SCENES` row (7 buttons) | They are the chapters (§2.4). `closeup.lattice` becomes a beat in ch. 6; `closeup.junction` is reachable from ch. 3. Vocabulary stays per §5.5. |
| `More` sheet | Its "ALL SCENES" grid was the row behind it; its four Explore links move to the Explore toggle. |
| Duplicate next-action button | The Next button already carries the identical string. |
| `Restart`, `Restore previous view` | Chapter dots. Restore surfaces only after the camera has actually moved. |
| `Hide story` | The card collapses on canvas interaction and expands on hover/tap. |
| `Force info` | Tap the force readout. |
| `Learn` / `Explore` / `Story` trio | One Explore toggle; Story reopen folds into the chapter dots. |
| `#sceneTruth` label | Redundant with the active chapter dot. |
| One of the two colliding hints | The inspect hint is spent by the first inspection (already its behaviour); the stretch instruction takes the position. |

*Constraints:* 44 px coarse-pointer floor; keyboard route through every remaining control; the three
`label-hit` canvas targets survive untouched.

### Section C — Text budget

**C0 · `narration` and `lay_summary` are byte-identical in all seven chapters.** Of every duplication
in §2.4–§2.5, this is the one that makes this section tractable. They are *separate
fields* serving *different audiences*: `lay_summary` is what the card renders; `narration` is what
the transcript and the pacing model consume. **Decouple them.** The card gets short; the transcript
stays complete.

**C1 · The pacing gate is a window with a floor, and it is nearly at its ceiling.**
`scripts/validate_presentation.py:551–559` computes

```
seconds = (words(narration) + words(state_change_announcement)) / 160 * 60 + 7 * 5
```

and requires `110 ≤ seconds ≤ 190` from `tour_pacing.target_seconds`. Today: **390 gated words →
181.2 s.**

| Direction | Headroom |
|---|---|
| Add narration words | **23 words** before the 190 s ceiling fails |
| Cut narration words | 190 words before the 110 s floor fails |

`lay_summary` is **not counted by this gate**. Cutting the card text is therefore free with respect
to pacing — but only once C0 has decoupled the fields, because today they are the same string.

**C2 · Targets.**
- `lay_summary` → **≤30 words per chapter**, one idea each. Chapter 1 currently teaches two (what a
  sarcomere is; what titin is *not*), which is why it is 40.
- `narration` → unchanged in length. It is the transcript, and SC-23 gates the text-only and
  screen-reader transcripts for concept coverage, claim bindings, announcements and ordering. Cutting
  it risks concept coverage, and buys nothing the card needs.
- `state_change_announcement` → out of the card body. It is state narration, not a lesson. It stays
  in the record and in the transcript, where the pacing gate already counts it.
- Explore drawer → collapse every section by default except the one matching the current selection.
  The 2,643 words stay; the wall does not.
- Top-right scope block → one quiet line (§3.1).

*Verify:* `npm run validate:presentation` still reports a tour inside `[110, 190]`, and the SC-23
transcript gates still pass on concept coverage.

### Section D — Teaching the evidence vocabulary

The two scored questions this serves are `find_evidence` and `distinguish_claim_kinds`, each at 4/5.

1. Declare a lay presentation of the canonical ladder **in `data/geometry_strategy.json`** (§5.4),
   deriving five buckets: Measured · Modeled · Inferred · Schematic · Not known. `STRONGLY INFERRED`
   presents as Inferred; `UNKNOWN` presents as Not known and is never folded away.
2. One chip design, used identically on canvas, in the inspector, and in the drawer.
3. Chapter 7 (`knowledge_recap`) gains one beat that teaches the chips explicitly.
   **Hard constraint from §6 C1: there are 23 narration words of headroom before the pacing gate
   fails at 190 s.** A teaching beat written as narration will almost certainly exceed that. Deliver
   it as *interface* — the five chips with their one-line definitions, shown in the recap, not
   spoken — or offset it word-for-word against a cut elsewhere in `narration`. Whichever is chosen,
   re-run `npm run validate:presentation` before anything else in the sprint lands on top of it.
4. Every inspector card ends with a single **"Why we know this ›"** → sources. That is the
   `find_evidence` path, and it must work from an object the user picked themselves.

*Constraint:* §4.5 and §5.4 — derived, declared once, never restated in the template.

### Section E — Robustness

- `_contentCentreOffsetNm` skips the offset when the container is unmeasurable instead of throwing
  (`Viewer.js:587–597`), matching the width path at `Viewer.js:376–377`. Defer the first frame until
  after layout. Keep the genuine WebGL-absent fallback (`smoke.spec.js:132`) distinct from this
  path: a first-paint race must not say the build is corrupt.
- Cap the story card so it cannot take 40.9% of a 1280×720 viewport.
- Resolve the hint collision (§2.5).

### Section F — Test and gate triage

The removals in Section B touch element IDs asserted in **8 Node files** — `presentation` (7 tests),
`showcase_phase24` (13), `showcase_phase12` (25), `showcase_phase2` (9), `showcase_phase8` (13),
`showcase_phase13` (18), `showcase_phase18` (8), `showcase_phase25` (24) — and **roughly 18 of the
75 Chromium tests**, including:

`controls.spec.js` — layout budgets (×2), phone teaching actions, More focus trap, scene truth,
Custom lattice link, Story reopen, phone contextual controls, myosin detail across scenes, scene
detail controls, phone scene truth, Custom camera; `learn.spec.js` — chapter view recommendations;
`stretch.spec.js` — Pause/Reset, leaving Spring; `picking.spec.js` — pinned explanation placement,
cold-open legibility.

`controls.spec.js:148` is the clearest example of a contract that must be rewritten rather than
deleted: it asserts `#sl`, `#stagePlay`, two `#sceneControls` buttons and `#stageMore` are visible on
a phone. The *intent* — the common teaching actions are directly visible on a phone — survives; the
*element list* does not.

Every touched assertion is triaged into exactly one bucket, recorded in the sprint report:

- **Contract** — states something that must remain true (evidence is reachable; claims travel with
  objects; titin is continuous in every mode; URL state round-trips). Rewritten against the new UI,
  never weakened.
- **Incidental** — states that a particular button exists. Deleted with the button.

Regenerated artifacts: `npm run build:hitgrid`, `npm run check:matrix`, and the release-gate contrast
declarations of §5.1.

---

## 7. Explicitly out of scope

- Any biological coordinate, mechanical parameter, claim, source, decision record, or evidence class.
- The `SHOWCASE_COMPLETION_PLAN.md` Tier C items and the unshipped Tier B explainers.
- New scenes, new chapters, or new science content. Chapter 7 gains a *beat*, not a chapter.
- Raising `guided_radius_scale` or any declared width multiplier (ruling §3.2).
- Re-opening SD-01–SD-05.

---

## 8. Sequencing

```
SC-27a  overhaul  →  freeze candidate  →  SC-27b  accessibility · lay · expert · rehearsal · release
```

`lay_comprehension` is `PENDING` with `min_participants: 5` and `one_candidate_only: true`. That flag
means what the validator says it means — `scripts/validate_release_gates.py:219`: *"each participant
sees one candidate."* On PASS, `len(candidate_ids) == 1` requires **all five participants to have
seen the same frozen build**. It does not forbid running the study again later; `candidate_history`
is expected on PASS.

So the argument for this ordering is practical, not absolute: a redesign mid-study invalidates the
study, and a re-run costs five fresh participants under informed consent, preregistration, and no
coaching. Run it once, against the design that ships.

The same reasoning applies to `text_zoom`, `keyboard_route` and `guided_route_on_display`, all human
or browser checks currently PENDING, all of which would have to be re-executed after a UI change.

---

## 9. Exit criteria

1. `npm run verify` passes, including the re-declared contrast pairs of §5.1 and §A2.
2. `npm run test:browser` passes with every touched assertion triaged per §6 F and the triage
   recorded.
3. `npm run check:hitgrid` passes against a regenerated, reviewed grid.
4. `npm run check:build` reports the standalone current, and the three embedded identities are
   refreshed exactly once, after the last source change.
5. Learn presents 7 affordances / **15 focusable targets** at 1440×900 under the §2.1 selector, and
   the count is **identical at every chapter** — including `stretch_spring`, which shows 33 today.
   A chapter that varies the count has re-introduced the defect.
6. Recorded before/after for: rendered-geometry share of non-UI canvas (10.5% → ≥50%); viewport word
   count per mode; visible control count per chapter; the six object-contrast ratios; the §5.3
   margin; and the guided-tour duration in seconds against its `[110, 190]` window.
7. No release gate moves from PASS to PENDING or FAIL. `release_ready` stays `false`; SC-27a does
   not claim a human gate.
8. If the stage background moved, all four homes moved in the same commit (§5.3). Verified by
   `grep -rn 0e1116 src/ test/ data/`: the only remaining occurrences are the CSS `--bg` token and
   the seven text pairs that legitimately declare it, and no occurrence names the *stage*.

---

## 10. Risks

| Risk | Why it is real | Mitigation |
|---|---|---|
| Contrast floors are already at the edge | Four of six object pairs sit within 0.16 of their floor | §A2 preserves luminance by construction; recompute from final hexes and re-declare, never assume |
| A green test stops measuring anything | `showcase_phase25:547` hardcodes `0x0e1116`, and the validator satisfies its "ships in source" check against a **comment** at `SarcomereScene.js:245` while the real value sits in `Viewer.js:190` | §5.3 names all four homes; §9.8 makes moving them together an exit criterion with a `grep` check |
| Lay vocabulary drift | Already happened once — defect PH3-1 mis-displayed MODELED as UNKNOWN | §5.4 declares the lay mapping in the canonical record and derives it |
| Hit-grid churn hides a picking regression | The grid is a reviewed artifact and a new camera invalidates it wholesale | Regenerate in its own commit, review the diff before any other stage change lands |
| Removing controls removes a claim path | Some drawer routes are the only path to a source | §6 B moves every route; §9.2 triage forbids weakening a contract assertion |
| The new teaching beat breaks the build | The tour sits at 181.2 s against a 190 s ceiling — **23 words of headroom** — and §6 D adds content to chapter 7 | §6 D3 requires the beat be interface, not narration, or offset word-for-word; `npm run validate:presentation` before anything stacks on it |
| Cutting the card also cuts the transcript | `narration` and `lay_summary` are the same string today, so a careless edit shortens the transcript and risks SC-23 concept coverage | §6 C0 decouples the fields *first*; C2 fixes `narration` length as unchanged |
| Fog weakens a luminance guarantee it does not fail | Verification is from constants, not pixels | Bound and declare maximum attenuation (§5.3) |
