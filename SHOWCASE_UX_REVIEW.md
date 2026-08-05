# Titin showcase — design and experience review

Reviewed build: `index.html`, fingerprint `9774e0580508` (`npm run check:build` → *index.html is
current*, so what is reviewed here is what ships).

## Method

The page was loaded in headless Chrome (software WebGL) at 1440×900 and captured at the exact URL
states the SC-8 matrix defines, so every observation below is reproducible from a hash:

| Capture | State |
|---|---|
| `shot_guided.png`, `c1_1440.png` | `#mode=guided&step=orientation&sl=2200&scale=context&camera=view.titin_story&target=titin` |
| `c2_arch.png` | `…&step=architecture&scale=detail&target=titin_domains` |
| `c3_pevk.png` | `…&step=elastic_regions&sl=2400&scale=detail&camera=region.PEVK` |
| `c4_anchors.png` | `…&step=anchors&camera=closeup.zdisc&target=Z1Z2` |
| `c5_czone.png` | `…&step=anchored_scaffold&camera=closeup.czone&target=Aband_super` |
| `ev_drawer.png` | `#mode=evidence&…&evidence=1` |
| `pinned_titin.png` | guided + pinned Titin annotation |

Images are in the session scratchpad:
`/private/tmp/claude-501/-Users-shotaro-Downloads-artifacts/92596c9a-abf0-40e2-a459-37767e21584e/scratchpad/shots/`.
Software rendering reproduces geometry, colour and layout exactly; only antialiasing quality may
differ from a GPU.

---

## Verdict at a glance

| Question | Answer |
|---|---|
| Is titin showcased? | **No.** It is the smallest, faintest object in its own frame. |
| Is its role clear? | **In the words, yes. In the picture, no.** No chapter shows titin doing anything. |
| Will experts be impressed? | **By the rigor, yes — if they read.** The render itself will not earn that reading, and the project's single most expert-facing asset (a validated WLC force model) never appears on screen. |
| Are laymen educated? | **Partly.** The prose is genuinely excellent. The one interaction that would teach a layman what titin *is* — stretching the sarcomere — is locked inside Evidence mode. |
| Is the control bar well laid out? | **No.** There is no control bar. There is one 18-section scrolling drawer whose first two screens are prose, with every control below the fold. |
| Sources placement | **Currently at the top**, exactly where you did not want them, and there is no consolidated bibliography anywhere. |
| Click popups | **Structurally right already** — title, evidence chip, lay text, detail, citations last. Too long, covers its own subject, duplicated into the chapter card. |
| Overall polish | **The engineering is exceptional. The presentation layer is a prototype wearing it.** |

**The one-sentence diagnosis:** guided mode dims the context to make titin the subject
(`GUIDED_COMPONENT_COLOR`, `SarcomereScene.js:148`) but never brightens titin, so instead of a
hierarchy you get a uniformly dark frame in which the hero is a ~5 px, 55 %-opaque hairline.

---

## P0 — the things that decide whether this lands

### P0-1 · Titin has no visual presence

**Evidence.** In the default frame the titin tube is `2 × (9 nm ÷ 6) × 1.65 ≈ 4.95 nm` across
(`SarcomereScene.js:955–957`, `TITIN_RENDER_STYLE.guided_radius_scale`). The default camera fits
`1.35 × ` the half-sarcomere span (`Viewer.js:462–480`), ≈ 1.07 px/nm at 1440 px — so titin is
**≈ 5 px wide**. It is drawn at `SCHEMATIC` opacity **0.55** (`SarcomereScene.js:36–45`), the
second-faintest class in the vocabulary, on a `#0e1116` background. Everything around it is opaque.
The subject occupies well under 1 % of frame area and is the *least* opaque thing in it.

**Why this is the top item.** Every other fix is cosmetic if the protein the page is named after
reads as a scratch on the glass.

**Fix, without breaking the evidence contract.** The contract is *opacity encodes confidence*. Keep
it — but stop spending it on the subject's legibility:

1. Draw the continuity trace with `Line2`/`LineMaterial` (`three/addons/lines/`) at a
   **screen-space** 3–4 px, `worldUnits: false`, so titin holds a constant readable width at every
   zoom instead of vanishing when you pull back. It is already a separate object
   (`_titinContinuityTrace`, `SarcomereScene.js:395–412`) with `depthTest:false` and
   `renderOrder:12`, so this is a material swap, not a redesign.
2. Add a **subject halo**: a second, slightly larger additive-blended tube at low opacity, or an
   `UnrealBloomPass` restricted to a layer that contains only titin. A highlight channel is not an
   evidence channel — you already argued exactly this for selection colour
   (`SarcomereScene.js:137–139`). Say so once in the render-meaning text.
3. Give titin a dark contour (inverted-hull or an outline pass) so it separates from the background
   rather than dissolving into it.
4. Keep the physical radius honest and keep declaring it — the readout already says
   *"titin tube radius (render width, not a molecular diameter)"* (`SarcomereScene.js:1404`).

### P0-2 · The composition reads as an unfitted viewport

**Evidence.** `c1_1440.png`: the sarcomere is a thin band across the middle third; roughly 85 % of
the canvas is empty black. The band brackets (*Z-disc, I-band, A-band · half, C-zone, bare zone*)
float **~330 px above** the structure they bracket, because their lane is positioned from the page
header, not from the model: `laneY = Math.min(height * 0.32, headerBottom + 18)`
(`index.template.html:791`). Nothing connects a bracket to the thing it labels.
`ev_drawer.png`: switching Guided → Evidence takes 370 px of canvas and the Z-disc is **cut off at
the left edge** — `setAudienceMode` calls `visualization.resize()` (`index.template.html:634`) but
never reframes.

**Fix.**
- `focusSpan` margin 1.35 → ~1.12, and bias the target ~8 % above centre so the structure sits on a
  compositional third with the chapter card in the lower-left.
- Derive the bracket lane from the **projected top of the model**, not from `headerBottom`, and add
  6–8 px drop ticks from each bracket end down to the axis it measures.
- Reframe after any canvas-size change (mode switch, window resize), not just resize the renderer.
- Fill the dead space deliberately: a faint depth-graded lattice behind the subject, or a vignette,
  is worth more than black.

### P0-3 · The didactic interaction is locked in expert mode

**Evidence.** The sarcomere-length slider and its four presets live inside `#panel`
(`index.template.html:437–441`), and `#panel` is `display:none` unless
`data-mode="evidence"`. In Guided mode a visitor cannot stretch the sarcomere at all. Chapter 3
("Different regions extend differently") therefore *tells* them about extension with a static bar
chart at 2400 nm instead of letting them feel it. There is also no legend in Guided mode — the
legend is drawer-only — so the chapter-1 line *"shown in red beside actin and myosin"* leaves the
reader unable to tell which dark cylinder is actin and which is myosin.

**Fix.** Promote a stage-level control bar (see the layout proposal below). Stretching the sarcomere
and watching PEVK take over is the single best thing this model can do for a layman; it must be one
gesture from the first frame. Add a 3–4 swatch on-canvas key in Guided mode whenever filament
context is on.

### P0-4 · The drawer is an essay with controls hidden under it

**Evidence.** `ev_drawer.png`: clicking **Evidence & controls** lands on *Selected structure*
(an empty heading — `index.template.html:412–413` renders the `h2` even when the box is hidden),
then *Current guided claim*, then a full screen of *Expert cards* prose. **Zero controls are visible
above the fold.** Scale / Sarcomere length / View / Close-up / Detail / Components / Titin regions
come after ~2 screens of scrolling, in a flat list of 18 sections with no grouping and no collapse.
Sources appear inside the claim block near the **top** — the placement you flagged. There is no
bibliography view anywhere; the 46 records in `data/references.json` are reachable only one claim at
a time.

**Fix.** Tabs, with sources last:

```
┌ Evidence & controls ─────────────────────── Close ┐
│  Inspect │ Measure │ Evidence │ Sources & build   │
├───────────────────────────────────────────────────┤
│ Inspect  → selected structure, structure index,   │
│            advanced controls (close-ups, detail   │
│            toggles, components, titin regions)    │
│ Measure  → geometry at this length, lattice       │
│            cross-section, passive force (P1-1)    │
│ Evidence → claims by class, current guided claim, │
│            expert cards, not-claimed              │
│ Sources  → full bibliography grouped by topic,    │
│    & build build fingerprint, "cite this view"    │
└───────────────────────────────────────────────────┘
```

### P0-5 · The inspector card

`pinned_titin.png` shows the anatomy is already what you asked for — title, evidence chip, lay text,
Expert / Scope / Render means / Not claimed, citations at the bottom (`renderPinnedSelection`,
`index.template.html:1468–1498`; `detailBlock`, `1389–1405`). Four problems:

1. **Too much at once.** A layman gets five labelled paragraphs. Put Expert/Scope/Render/Not-claimed
   behind a `▸ For specialists` disclosure — expanded by default in Evidence mode, collapsed in
   Guided.
2. **It covers its subject.** The card is placed relative to the anchor
   (`renderObjectOverlay`, `1611–1653`) but at 370 × ~380 px it lands on the model. Prefer the
   canvas side *away* from the anchor and clamp so the leader dot is never occluded.
3. **Citations are the loudest thing at the bottom** — full-width underlined 11 px links. Make them
   one muted 9–10 px line: `Sources: Fürst 1988 · UniProt Q8WZ42`, with the full title on hover.
4. **Duplicated.** The same lay text is repeated verbatim in the chapter card
   (`guidedSelection`, `1490–1492`). Keep a chip there (`Selected: Titin ✕`), not the paragraph.

Add `‹ ›` to step between structures in the card — the keyboard already does this
(`index.template.html:2110–2116`), the pointer cannot.

---

## Proposed stage layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▬ Titin across the sarcomere            Guided │ Evidence   REFERENCE SCOPE  │
│                                                             Human skeletal…  │
│                                                                              │
│        ┌──── I-band ────┬─────────── A-band · half ──────────┐               │
│        ╷                ╷                                    ╷   ← drop ticks│
│   ═══════════════════════════════════════════════════════════════            │
│   ▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂ titin, 3–4 px screen-space + halo ▂▂▂              │
│   ═══════════════════════════════════════════════════════════════            │
│                                                                              │
│  ┌ CHAPTER 1 OF 7 ─────────────┐              ▬ titin  ▬ myosin  ▬ actin     │
│  │ Meet titin in the sarcomere │                            ← guided legend  │
│  │ …                           │                                            │
│  │ ‹ Prev   Next ›   Restart   │                                            │
│  └─────────────────────────────┘                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Sarcomere length ●────────────── 2,200 nm   1900 · 2200 · 2400 · 3000  ▶     │
│ View: Route · Side · Down-axis · Lattice    Actin+myosin ▣    Evidence ⌄     │
└──────────────────────────────────────────────────────────────────────────────┘
```

Rules that make it work:

- **The bar is present in both modes.** Guided is not a reduced feature set; it is a reduced
  *explanation* set. Length, camera and context are didactic, not advanced.
- **One row of primaries, one row of frequently-switched views.** Everything else stays in the
  drawer.
- **▶ plays a stretch sweep** 1900 → 2400 nm with the regional bars animating. That is the demo
  moment, and it is currently impossible to perform without narrating a slider drag.
- **Presets keep their OUTSIDE RANGE styling** — that honesty is good and costs nothing here.
- Bind the shortcuts you already declare: `data/presentation.json:presenter_shortcuts` defines
  restart / show-extension / open-evidence, and **nothing in the page binds them to a key** (only
  Escape and Arrow handling exist, `index.template.html:692`, `2110`). `1`–`7` for chapters, `E`,
  `R`, `Space`.

---

## P1 — what would actually impress a titin researcher

Ranked by (impact × credibility) ÷ effort.

1. **Show the force.** `data/mechanical_model.json` holds a Marko–Siggia WLC / eWLC series solution
   with persistence lengths taken from primary sources, *no fitted parameters*, and a
   `source_validation` block that reproduces published PEVK forces to ±0.5 pN. It computes
   `model_force_pN` = 0.12 / 0.52 / 1.47 / 10.36 pN at 1900 / 2200 / 2400 / 3000 nm and per-region
   `compliance_share`. **None of this appears in the UI.** Titin's biomechanical role *is* force; a
   live `passive force ≈ 0.52 pN per molecule · MODELED` readout, a small force–extension curve with
   the current length marked, and the compliance-share split (prox-Ig 0.61 → PEVK 0.27 at 2200 nm
   flipping to 0.30 → 0.62 at 2400 nm) would be the most expert-legible thing on the page. The
   science is already done and validated; this is a presentation task.
2. **Make the mechanism visible in 3D.** The chart says *folded domains straighten · disordered
   chain extends*; the render shows a smooth pipe at every length. At region focus, draw tandem Ig
   as discrete beads whose spacing visibly opens, and PEVK as a coil that uncoils. That single
   change turns chapter 3 from an assertion into a demonstration.
3. **Real coordinates at maximum zoom.** You already fetch, hash and measure 1TIT, 3PUC, 5JDJ, 8OMW,
   8OT5, 1TKI, 4JNW (`data/structures/manifest.json`, `titin_pdb_inventory.csv`). Swapping the
   archetype capsule for an actual Ig backbone at the deepest close-up is the "oh, they really did
   it" moment for a structural audience — and it stays inside your evidence rules, because those are
   measured coordinates with a provenance record.
4. **Fix the anchor close-up.** Chapter 4 claims the two-titin/one-telethonin clamp; `c4_anchors.png`
   shows the camera buried in a translucent slab. The Z-disc envelope is 50 nm wide and
   *lattice-wide* laterally (`data/sarcomere.json`), so at the 200 nm close-up span it fills the
   frame and hides the topology the chapter is about. Ghost it (wireframe or ≤15 % opacity) whenever
   `anchor_detail.target === 'zdisc'`.
5. **Region focus needs a standoff.** `focusSpan` uses `max(40, span × 1.35)`
   (`Viewer.js:466–467`), so focusing N2A (6.8 nm at 2200 nm) or PEVK (70 nm) puts the camera inside
   the tube — `c3_pevk.png` is a featureless pink wall. Use `max(span × 1.35, ~140 nm)` and keep the
   neighbouring regions in frame; a region is only meaningful *in series* with the ones beside it.
6. **"Cite this view."** The URL already round-trips the full presentation state and the drawer
   already shows a build fingerprint. One button that copies `URL + build 9774e0580508` turns every
   screenshot in a talk into a reproducible pointer. Nearly free, and no other tool in this space
   does it.

**Correction to an earlier draft of this review:** I first wrote that titin kinase, the N2A
interaction hub, and isoform context were missing. They are not. `data/presentation.json` ships
**seven** reviewed expert cards — `n2a_hub_card`, `kinase_signaling_card`, `length_activation_card`,
`isoform_diversity_card`, `unresolved_questions_card`, `aband_scaffold_card`, `mybpc_scope_card` —
each bound to an ADMITTED claim in `data/showcase_claims.json`. The content is written and sourced.

The real defect is that it is **unreachable**: seven dense cards render as one stacked wall in a
single scrolling column, with no index, and with no link from the structure each one is about.
Selecting the `kinase` titin region tells you nothing about the kinase card that already exists. The
fix is a binding (`related_target_ids` per card) and a link from the pinned inspector — not new
writing.

---

## P2 — polish and hygiene

- **Per-frame forced layout.** The render loop calls `renderScienceOverlay()` and
  `renderObjectOverlay()` every frame (`index.template.html:2148–2155`); both read
  `getBoundingClientRect()` and the second writes `style.left/top` then reads `offsetWidth` — a
  forced synchronous reflow twice per frame, against the drawer's large DOM in Evidence mode. Move to
  on-demand rendering (render on control change / camera motion / damping) and update overlays from
  the same trigger. Suggestive data point: headless capture of a guided state takes ~20 s, the same
  capture in Evidence mode did not complete in 150 s.
- **Type scale.** 9–10 px is the dominant size in the drawer, 8 px in `.pipeline-records`. The
  release pack has a projector-rehearsal gate; this will fail it. Add a presentation text scale, or
  raise the drawer base to 12 px.
- **Empty section headings.** *Selected structure* renders its `h2` with nothing under it until
  something is picked. Hide the heading with its content.
- **Copy.** Chapter 1 says titin is "shown in red"; the annotation says "highlighted in pink"; the
  token is `#ff5d7d`. Pick one word.
- **`innerHTML` for spec strings** in the metrics table (`1867`), legend (`1891`) and notes (`1956`),
  where the rest of the page is scrupulous about DOM APIs. Local data, so not a live risk — but it is
  the one inconsistency in an otherwise immaculate pattern.
- **Mobile** could not be captured in this environment; at 390 px the chapter card is
  `min(500px, 100vw − 28px)` and will occupy ~40 % of the viewport height. Worth a real-device pass
  once the stage bar exists, since the bar competes for the same space.

---

## Do not change these

They are the reason this can become a genuinely serious piece of work:

- The evidence vocabulary and its enforcement: six classes, never silently promoted, imported rather
  than restated (the comment at `index.template.html:513–517` describes a real bug this prevented).
- Per-object `not_claimed` lists. Almost nothing in science communication does this. Experts will
  notice it immediately.
- The counted provenance pipeline — figures counted from loaded records at render time so the
  diagram cannot drift from the data.
- The mechanical model's *no fitted parameters* discipline plus published-value validation.
- URL state round-tripping, the build fingerprint, the negative controls, the staleness-gated
  release pack, keyboard navigation of 3D structures, and honest LOD withdrawal with the pixel
  measurement that caused it.
- The chapter prose. It is genuinely dual-audience and does not condescend in either direction.

---

## Suggested order

1. P0-1 titin presence, P0-2 framing → the first frame stops looking broken. (Highest leverage.)
2. P0-3 stage control bar with stretch → the demo becomes performable.
3. P0-5 inspector disclosure + citation line → matches the interaction model you described.
4. P0-4 drawer tabs with sources last → controls become findable, sources stop leading.
5. P1-1 force readout → the expert payload.
6. P1-2/3/4/5 → mechanism, real coordinates, anchor close-up, region standoff.
