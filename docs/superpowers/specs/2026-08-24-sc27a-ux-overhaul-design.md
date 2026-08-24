# SC-27A — Final UX and visual design overhaul

> **Status:** Revised design contract, 2026-08-24. This version supersedes the initial junior
> design after independent browser, source, responsive, and regression-suite review. It is paired
> with `docs/superpowers/plans/2026-08-24-sc27a-ux-overhaul-implementation.md`.
>
> **Relationship to the governing plan:**
> `docs/superpowers/plans/2026-08-09-titin-mvp-readiness-synthesis.md` defines SC-27 as
> accessibility, human validation, expert sign-off, and release. This contract inserts **SC-27A**
> before that work and renames the existing release-validation sprint **SC-27B**. SC-27B begins
> only after the redesigned candidate is complete and frozen.
>
> **Scientific scope:** none. No biological coordinate, mechanical parameter, claim, source,
> decision record, evidence class, or model input changes. Presentation copy, camera composition,
> presentation colors, layout, and interaction structure may change. If implementation discovers
> that a desired UX statement is not supported by an existing approved claim, the statement is
> omitted; SC-27A does not reopen science.

---

## 1. Outcome

The final experience must do two jobs without showing both interfaces at once:

1. Give a first-time viewer a visually compelling, five-beat explanation of titin in one
   sarcomere.
2. Give a specialist a contextual route from any visible object or value to measurements,
   limitations, exact sources, reproducibility information, and exports.

The cold open is a composed scientific image with one obvious continuation. The user is not asked
to choose a scene, audience vocabulary, evidence tab, or advanced control before learning what
titin is.

At the end of SC-27A:

- titin is the visual subject and the filament context is the ground;
- the Guided surface has at most **four visible chrome controls on the cold open** and at most
  **seven on any beat**;
- the Guided route contains five learner beats, one visual question per beat, and one Next action;
- no Guided story card requires internal scrolling at a release viewport or 200% text zoom;
- Research opens contextually and retains every current expert artifact and export;
- mobile has no focus-induced horizontal displacement, covered continuation control, or competing
  stage/drawer scroll regions;
- every epistemic label derives from one presentation-owned mapping of the canonical evidence
  classes; and
- SC-27B receives one final, verified candidate rather than a design still being tuned.

---

## 2. Independent measured baseline

### 2.1 Desktop hierarchy

The committed application was exercised at 1280×720 and 1440×900 before this revision.

- At 1280×720, the first Guided state exposes 29 interactive nodes under the broad live-DOM count
  that includes projected canvas label targets. The junior audit's narrower visible-chrome metric
  counts 26 at 1440×900. Both establish the same problem: the learner sees too many decisions.
- The sarcomere reads as a roughly 100 px horizontal band while the top-left brand/mode block,
  top-right scope block, 500 px story card, onboarding pill, help panel, and 110 px stage bar all
  compete for emphasis.
- The chapter card occupies about 41% of viewport height at 1280×720.
- Chapter 1 renders two controls with the identical label “Next: Follow one giant molecule.” The
  same duplication recurs throughout the route.
- Chapters 1 and 2 use nearly the same visible framing; advancing does not produce a clear visual
  revelation.
- Chapter 4 adds story-local stretch actions while the global length and Stretch controls remain
  visible.
- Chapter 6 has 569 px of story content in a 468 px client area at 1280×720. It scrolls internally
  without a visible continuation cue.
- Explore is an inventory rather than a task-oriented expert entry. The drawer contains 2,643
  words in total; candidate hashes precede the selected object's scientific content.

### 2.2 Mobile hierarchy

At 375×812 in the live application:

- the scope row measured about 776 px wide inside a 375 px viewport;
- the initial story sheet had about 300 px of content inside a 192 px client area;
- the onboarding pill covered lesson text;
- the Explore drawer exposed an approximately 8,797 px scroll surface;
- focus and overflow could displace stage controls horizontally off-screen; and
- the stage, story sheet, onboarding hint, and permanent controls competed for the same lower
  portion of the viewport.

These are release defects even when every control remains technically present in the DOM.

### 2.3 Regression-suite blind spot

The complete 28-test Chromium `controls.spec.js` suite passed against these broken states. Existing
tests prove reachability, state restoration, URL behavior, and broad layout budgets; they do not
prove:

- that the primary action is visually unique;
- that focused controls do not scroll an overflow-hidden canvas sideways;
- that a hint does not cover lesson text;
- that the story continuation is visible without an unannounced inner scroll;
- that the model, rather than the chrome, wins the frame; or
- that a first-time user understands which navigation vocabulary to use.

SC-27A adds perceptual and task-hierarchy gates without weakening the existing scientific and state
contracts.

### 2.4 Visual-weight diagnosis

`data/render_style.json` already declares a 5 px Guided titin trace, a 1.65 radius scale, and a
presentation halo. Titin is not failing because it is literally one pixel wide. It fails because:

- approximately 89.5% of the uncovered stage is flat background in the current cold open;
- context geometry is long, shallow, and dark;
- full-purity titin pink is used on card borders and hint pills while the rendered molecule is
  shaded by lighting and opacity; and
- identity color, selection color, evidence opacity, active-control color, and chrome accents all
  compete without a simple learner-facing legend.

The overhaul changes composition and channel hierarchy, not scientific dimensions.

---

## 3. Locked product architecture

### 3.1 Two surfaces, not three modes

The product has exactly two top-level surfaces:

| Surface | User-facing label | Purpose |
|---|---|---|
| Guided | **Tour** | Five-beat explanation with one visual idea at a time |
| Evidence workbench | **Research** | Contextual inspection, measures, evidence, sources, build, and exports |

“Story” is not a mode and is removed. “Explore” is renamed Research because opening it reveals a
scientific workbench, not an unstructured playground.

The header contains:

- a noninteractive product title;
- one quiet, bounded scope button; and
- one Research toggle.

The scope button uses concise text such as `Human TTN Q8WZ42-1 · 2,200 nm` and opens
**Research → Inspect → Scope details**. Decision counts, fingerprints, and caveats move to their
relevant Research sections.

### 3.2 Five learner beats

The presentation contract advances from `titin-presentation/2` to `titin-presentation/3`. URL state
remains v2; presentation-schema version and URL version are independent.

| Order | Canonical ID | Learner question | Visual contract | Absorbs |
|---:|---|---|---|---|
| 1 | `meet_sarcomere` | What is this unit, and which molecule is the motor? | Titin, actin, and myosin visible together; active motor distinction explicit | existing chapter 1 |
| 2 | `follow_titin` | Where does one titin run and where is it anchored? | Complete Z-disc-to-M-line locator with both ends named in the same frame | existing route + `inspect_anchors` |
| 3 | `stretch_spring` | How is titin built, and what changes during stretch? | Architecture close-up leading into the existing reversible stretch comparison | `molecular_architecture` + existing stretch |
| 4 | `scaffold_thick_filament` | What does titin do besides recoil? | A-band scaffold in context plus a concise three-role summary; no invented partner geometry | existing scaffold + existing interaction/signaling claim summaries |
| 5 | `knowledge_recap` | What is measured, modeled, inferred, schematic, or not known? | Full route recap, five presentation chips, and object-to-source invitation | existing recap |

Removed canonical chapter IDs remain URL aliases:

- `molecular_architecture` → `stretch_spring`
- `inspect_anchors` → `follow_titin`

Existing legacy aliases continue to canonicalize. Control-scene vocabulary is not deleted; it
remains available to URL restoration, Research, tests, and exports.

Each beat has:

- one title;
- one visible sentence of no more than 30 words;
- one visual question;
- one unique Next action;
- at most one contextual demonstration; and
- one screen-reader state announcement that is not repeated as visible body copy.

### 3.3 Guided control budget

Persistent Guided chrome:

1. Scope details
2. Research
3. Previous
4. Next

Tour progress is noninteractive text plus five visual markers. It does not create seven tab stops.
The first Previous and final Next/Replay state remain truthful, but no duplicate chapter-action row
exists.

Only beat 3 adds contextual mechanics controls:

5. Sarcomere-length slider
6. Stretch/Pause
7. Current force readout, which opens its contextual measure explanation

The color key becomes contextual on-model labeling rather than three permanent buttons. Beat 1
names Titin, Myosin, and Actin together; later beats name only the current subject and required
landmarks. Existing projected label hit targets survive and remain keyboard/pointer-operable
through the canvas interaction model. They are not counted as visible chrome because they do not
paint extra buttons.

No Guided scene row, More sheet, Restart button, Restore button, Force info button, Learn button,
Story button, scene-truth echo, or duplicate next-action row remains. Previous-view restoration is
offered contextually only after a user has manually changed framing and only inside Research.

#### Counting contract

Two metrics are recorded separately:

- **Visible chrome affordances:** visible painted buttons, inputs, links, tabs, and button-role
  elements outside the WebGL/science-overlay target layer whose box intersects the viewport.
- **Tabbable chrome targets:** the same set, excluding disabled elements and requiring effective
  `tabIndex >= 0`.

The word “focusable” is never used for a selector that merely counts visible elements.

Acceptance:

- cold open: at most 4 visible chrome affordances and at most 3 tabbable chrome targets;
- beats 1, 2, 4, and 5: at most 4 visible chrome affordances;
- beat 3: at most 7 visible chrome affordances;
- the canvas remains one focus stop with its existing internal keyboard inspection route; and
- no two visible actions have the same accessible name and effect.

### 3.4 Object explanation path

Selecting a structure produces one compact explanation:

1. Object name
2. One lay sentence
3. One presentation evidence chip
4. `Why we know this ›`

The short card never includes a raw hash, exhaustive limitation list, or full bibliography.
`Why we know this` opens Research directly on the selected object's evidence and sources. Research
retains the raw canonical evidence class even when Guided uses a simpler presentation label.

### 3.5 Research information architecture

Research retains the four current task families but changes their entry behavior:

- **Inspect** — selected object, construct/region identity, placement, render semantics, and scene
  controls relevant to that object;
- **Measure** — current value first, then plots, equations, parameters, regimes, and sensitivity;
- **Evidence** — current claim first, then limitations/non-claims, then optional all-claim inventory;
- **Sources & build** — contextual sources first, then exports, reproduction, fingerprints, and
  build identity.

Rules:

- opening Research from the header defaults to Inspect, not Evidence;
- opening from an object, force readout, chip, or `Why we know this` lands on the relevant tab and
  selection;
- only the current object's or value's primary section is expanded by default;
- “all claims,” “all sources,” and complete component/scene inventories are explicit secondary
  actions;
- build fingerprints are removed from the drawer header;
- the Research scene chooser is a compact menu inside Inspect rather than a permanent stage row;
- every existing export remains reachable and byte-compatible; and
- desktop uses a bounded side drawer, while mobile uses a full-viewport sheet. Mobile never leaves
  the drawer and stage bar competing for the same screen region.

### 3.6 Responsive composition

#### Desktop and tablet landscape

- The stage owns the viewport.
- The story surface occupies no more than 30% of viewport width and contains no inner scroll.
- Research opens as a 380–440 px side drawer where the remaining stage stays usable.

#### Phone and tablet portrait

- Guided uses a stage region above a compact narrative sheet.
- The sheet shows progress, title, one sentence, Previous, and Next without scrolling.
- Beat 3 may expand the sheet for the slider, but Next remains visible.
- Research is a full-viewport sheet with one scroll container and a persistent Close control.
- The scope line has `min-width: 0`, bounded content, and a real ellipsis; child min-content width
  may not enlarge the stage.
- Focusing every control must leave `documentElement.scrollWidth <= innerWidth + 1`,
  `canvas.scrollLeft === 0`, and the active control intersecting the viewport.

---

## 4. Visual design contract

### 4.1 Semantic hero composition

The half-sarcomere's extreme aspect ratio cannot be solved by fitting alone. The cold open combines:

1. a **hero view** that looks shallowly into the local filament context and fills the frame with
   depth; and
2. a **full-sarcomere locator rail** derived from current mirrored geometry that shows both Z-disc
   boundaries, the central M-line, the I/A-band organization, and one representative titin
   half-route from its N-terminal Z-disc anchor to its C-terminal M-line anchor.

The locator prevents a rich crop from being mistaken for the complete molecule. It reuses projected
geometry and existing band/terminus data; it does not invent a second scientific model.

`closeup.lattice` proves that existing geometry can fill the frame, but it is not the cold-open
camera: a down-axis lattice view cannot teach titin's longitudinal route. A new presentation-only
hero camera is tuned against the following semantic checks:

- titin, actin, and myosin are simultaneously distinguishable in beat 1;
- the full locator, both Z-disc boundaries, central M-line, and selected titin termini are visible
  in beats 1, 2, and 5;
- no named object is behind the story, header, or continuation control;
- any crop is explicitly represented in the locator;
- the visible context has depth without obscuring titin; and
- the composed geometry share is recorded as a diagnostic, not accepted as a substitute for these
  semantic checks.

The previous ≥50% geometry-share target is retained as a design aspiration for the hero region, not
as a release gate that can be passed by filling the canvas with irrelevant context.

### 4.2 Figure and ground

Guided context colors for `thick_filament`, `myosin_head`, and `thin_filament` move toward neutral at
constant relative luminance. Final hex values are accepted only after all declared object-contrast
ratios and the titin-dominance margin are recomputed from the shipped values.

Color roles:

- protein identity: hue and luminance;
- selected/focal object: contour, halo, and explicit label;
- evidence class: text chip and pattern; and
- active UI control: neutral control accent, not titin pink.

No channel performs two of these jobs.

### 4.3 Titin emphasis

- `trace_px`, `guided_radius_scale`, and scientific/world-space geometry remain unchanged.
- The presentation halo may strengthen within a declared bound.
- A dark separation contour follows the same screen-space path.
- Halo and contour are documented as reading aids, not molecular envelopes or evidence channels.
- Full-purity `#ff5d7d` is reserved for the true titin swatch/identity and the molecule. Borders,
  hint pills, progress, and generic focus use reduced-chroma or neutral tokens.

The existing evidence opacity remains scientifically faithful in object metadata and rendering, but
Guided never asks a learner to decode opacity. Every named Guided object must remain legible through
composition, luminance, labels, and contour. Research alone exposes the confidence-display legend
and the complete canonical ladder.

### 4.4 Background and depth

The stage does not become lighter. The background uses one declared presentation record in
`data/render_style.json`:

- a lightest permitted stage value no lighter than the current contrast-safe maximum;
- a darker spatial/depth value; and
- any vignette or gradient implementation details.

`Viewer.js`, rendered-pixel tests, and release-gate validation consume that record. A color literal
in a comment may not satisfy a “ships in source” test. Validation compares the lightest declared
background value against every foreground pair; any darker area only increases contrast.

A vignette must be behind geometry, not a screen overlay that darkens the objects whose contrast is
being certified. Fog, if used, receives a declared maximum attenuation and rendered-pixel review.

### 4.5 Type system

Default shipped type, not the optional projector toggle, must be readable:

| Role | Minimum default size |
|---|---:|
| Guided body | 15 px desktop, 16 px phone |
| Primary controls | 14 px |
| Research body/table | 13 px |
| Metadata and evidence chips | 12 px |
| On-stage scientific labels | 12 px |

No user-facing information required to complete the Tour or lay protocol ships at 9–10 px. A rare
developer/build identifier may be smaller only inside Sources & build and must still survive 200%
zoom. Line heights use relative units; no label container receives a fixed pixel height.

### 4.6 Motion

Camera movement and the existing stretch demonstration provide the visual drama. SC-27A adds no
decorative continuous motion. Every transition:

- explains a state change;
- is interruptible;
- has a reduced-motion path that lands immediately in the same semantic state; and
- cannot leave a hint, card, locator, or URL out of sync.

---

## 5. Content and evidence language

### 5.1 Visible text budget

- `lay_summary`: one sentence, at most 30 words per beat.
- `narration`: retains the complete approved concepts needed by transcripts and pacing; merging
  chapters concatenates and edits narration carefully rather than deleting concept coverage.
- `state_change_announcement`: screen-reader/status channel, not repeated in the visible story body.
- cold-open visible text under the existing viewport-word counting method: target ≤110 words.
- any Guided beat: target ≤150 visible words.
- Research initial viewport: target ≤220 visible words before the user expands a section.

The presentation validator continues to enforce the `[110, 190]` second tour window, concept
coverage, claim bindings, and transcript order. Five beats do not mean a five-sentence transcript;
they mean five visible moments.

### 5.2 Presentation-owned evidence mapping

The canonical scientific ladder remains unchanged:

`UNKNOWN < SCHEMATIC < INFERRED < MODELED < STRONGLY INFERRED < MEASURED`

The lay mapping is presentation state and belongs in `data/presentation.json`, not
`data/geometry_strategy.json`. `geometry_strategy.json` is one of the model inputs enumerated in the
SC-26 handoff; changing it would change the scientific model fingerprint contrary to this contract.

`presentation.json` declares and defines:

| Canonical class | Guided label |
|---|---|
| `MEASURED` | Measured |
| `MODELED` | Modeled |
| `STRONGLY INFERRED` | Inferred |
| `INFERRED` | Inferred |
| `SCHEMATIC` | Schematic |
| `UNKNOWN` | Not known |

A validator imports the canonical class list and requires the mapping keys to match it exactly.
Research shows both the Guided label and raw class when they differ, for example
`Inferred · scientific class: strongly inferred`. No class is rewritten in claim data.

Beat 5 teaches the five Guided chips with one-line definitions. Every selected-object card uses the
same chip component and ends with `Why we know this`.

### 5.3 Muscle-to-sarcomere framing

The Tour must explain that the visualization is about titin in one sarcomere, the repeating
contractile unit. It must not add a muscle → myofibril → sarcomere illustration unless an existing
approved claim and source explicitly entail every label and relationship in that illustration.

Within the current science freeze, the safe orientation is a concise title/subtitle and beat-1 copy
bound to `sarcomere_definition` and `actomyosin_motor_function`. A desirable but unsupported
muscle-scale diagram is omitted rather than treated as harmless decoration.

### 5.4 Lay-study coverage matrix

| Final question | Primary beat/path |
|---|---|
| Define a sarcomere | Beat 1, with two Z-disc boundaries visible in the locator/context |
| Identify titin and its route | Beat 2, full-sarcomere locator with the representative half-route and direct titin label |
| Distinguish titin from the motor | Beat 1, explicit myosin/actin/titin identities |
| Explain stretch | Beat 3, before/after state and persistent locator |
| Identify anchors | Beat 2, Z-disc and M-line termini in the same frame |
| Explain spring, scaffold, signaling roles | Beats 3–4 and beat-5 recap |
| Find evidence | Selected object → `Why we know this` |
| Distinguish claim kinds | Beat 5 chips and contextual evidence card |

The UI must teach the assessed behavior; the study must not compensate for a missing visual path by
coaching.

---

## 6. Hard constraints

### 6.1 Protected scientific inputs

SC-27A must not modify:

- `data/sarcomere.json`
- `data/titin.json`
- `data/titin_sequence_features.json`
- `data/structural_states.json`
- `data/geometry_sources.json`
- `data/geometry_strategy.json`
- `data/context_measurements.json`
- `data/domain_backbones.json`
- `data/mechanical_parameters.json`
- scientific decision records, claim statements/classes, or source locators

Allowed presentation inputs include `data/presentation.json`, `data/scenes.json`, and
`data/render_style.json`. They change the app/build-input identities but must not change the model
fingerprint.

### 6.2 Contrast

Every final palette value is verified in three ways:

1. declared-color WCAG ratio against the lightest possible shipped background;
2. rendered-pixel sampling in the required Guided frames; and
3. grayscale and common color-vision simulation review.

Object pairs named together in copy must be separable by luminance, not hue alone. Chrome contrast
and object contrast remain separate declarations.

### 6.3 URL, scene vocabulary, and hit grid

- `CONTROL_SCENE_IDS` and URL v2 scene vocabulary remain supported.
- Removed chapter IDs migrate through `chapter_aliases` without a warning.
- Invalid states continue to fail closed with a visible notice.
- The new default camera requires full `npm run build:hitgrid` regeneration, review of the complete
  fixture diff, and `npm run check:hitgrid`.
- URL, export, browser-history, and exact-scene restoration tests remain contract tests.

### 6.4 Accessibility

- 44 px coarse-pointer target floor.
- Complete keyboard route with visible focus and logical order.
- 200% text zoom without lost lesson, control, or source path.
- Reduced motion reaches identical semantic state.
- No required meaning conveyed by color, opacity, or motion alone.
- Screen-reader transcript retains concept coverage and state announcements.
- The canvas remains inspectable by keyboard; projected label targets are preserved.

### 6.5 Boot robustness

An initially unmeasurable container is a layout race, not evidence of a corrupt build.
`_contentCentreOffsetNm` skips or defers the offset when the viewport height is zero, matching the
existing graceful width behavior. A genuine WebGL absence remains a distinct fallback.

---

## 7. Verification contract

### 7.1 Automated UX gates

A new SC-27A browser suite verifies at 375×812, 390×844, 768×1024, 1024×768, 1280×720, and
1440×900:

- visible and tabbable chrome counts by the §3.3 definitions;
- exactly one unique Next action;
- story `scrollHeight <= clientHeight + 1` in Guided;
- Next and the current takeaway are unobscured by `elementFromPoint`/bounding checks;
- no overlap among header, story, onboarding/stretch hint, and continuation control;
- zero document/canvas horizontal overflow before and after focusing every control;
- Research defaults and contextual deep-link destinations;
- mobile Research has exactly one scroll container and covers the stage controls;
- evidence-chip mapping and canonical-class disclosure;
- object → `Why we know this` → contextual source path;
- reduced-motion state parity; and
- no page or console errors.

Existing tests are triaged as:

- **Contract:** scientific state, URL, export, source, accessibility, picking, or evidence behavior.
  Rewrite against the new UI without weakening the assertion.
- **Incidental:** existence or placement of a removed button. Delete with the obsolete control.

Every touched assertion and its disposition is recorded in the SC-27A report.

### 7.2 Visual matrix

Before/after captures cover at minimum:

- cold open;
- full titin route;
- architecture/stretch before and after;
- scaffold;
- recap/evidence chips;
- selected-object explanation;
- Research Inspect, Measure, Evidence, and Sources;
- 375×812 Guided and Research;
- 200% zoom;
- reduced motion;
- grayscale; and
- the target projector/display viewport as a software composition capture; actual hardware
  rehearsal remains exclusively in SC-27B.

Each capture records candidate identities and a reviewer disposition. Geometry-share, viewport word
count, visible/tabbable controls, object contrast, and tour duration are recorded as diagnostics.
Human visual review decides whether the named object and action win the frame.

### 7.3 Formative review before freeze

Before the SC-27B candidate is frozen:

- review high-fidelity desktop/mobile target frames before implementation;
- run two or three formative sessions with titin-naive participants;
- run at least one specialist workflow review covering object inspection, a measurement, a
  limitation, an exact source, and an export;
- record first-action hesitation, time to identify titin, navigation errors, missed controls,
  object-to-source success, and qualitative confusion;
- remediate recurring failures; and
- do not reuse formative participants in the final five-person cohort.

Formative results never satisfy SC-27B human gates.

---

## 8. Sequencing

```
target frames and IA
  → presentation schema/content
  → Guided shell
  → stage composition and visual system
  → contextual Research
  → responsive/accessibility
  → automated and visual gates
  → formative review and remediation
  → full verification
  → freeze one candidate
  → SC-27B accessibility · five-person lay study · expert review · rehearsal · release
```

No final participant, release reviewer, or deployment evidence is collected before the final
candidate freeze. A post-freeze UI change creates a new candidate and invalidates affected evidence.

---

## 9. Exit criteria

SC-27A is complete only when:

1. The model fingerprint is unchanged from SC-26.
2. `npm run verify` passes from the final source state.
3. The complete Chromium browser suite passes, followed by the required Firefox/WebKit matrix.
4. `npm run check:hitgrid`, `npm run check:matrix`, `npm run check:build`, and
   `npm run check:pack` pass after regeneration and review.
5. The five-beat presentation validates for schema, pacing, concept coverage, transcripts, aliases,
   claims, and sources.
6. Cold open and every beat meet the exact §3.3 control budgets.
7. Guided has no internal story scroll, duplicate action, overflow, focus displacement, or covered
   continuation at any release viewport or 200% zoom.
8. Research retains all current expert controls, measurements, evidence, sources, build details,
   deep links, and deterministic exports.
9. The final palette passes declared and rendered contrast checks, grayscale, and color-vision
   review.
10. Before/after metrics and the complete test-triage table are recorded.
11. Formative review has no unresolved recurring critical navigation or comprehension failure.
12. `release_ready` remains `false`; no human or deployment gate is claimed by SC-27A.

---

## 10. Explicitly out of scope

- Biological geometry, force laws, parameters, evidence classes, claim wording, source adjudication,
  or new scientific decisions.
- A new muscle-scale 3D model or unsupported muscle/myofibril hierarchy illustration.
- New partner coordinates, activation simulation, tissue/isoform comparison, or mechanosignaling
  animation.
- Removing Research artifacts or weakening deterministic exports.
- Treating automated accessibility, screenshot review, or formative sessions as final human
  validation.

---

## 11. Principal risks and mitigations

| Risk | Mitigation |
|---|---|
| A rich crop hides the molecule's complete route | Full-route geometry-derived locator plus semantic camera checks |
| Seven dots recreate button clutter | Noninteractive progress; Previous/Next are the sole Tour navigation |
| Simplified evidence language changes science | Mapping lives in presentation data; validator requires exact canonical keys; Research shows raw classes |
| Presentation mapping changes the model fingerprint | `geometry_strategy.json` and every model input are protected; mapping lives in `presentation.json` |
| Background verification drifts from rendering | One `render_style.json` declaration consumed by Viewer and validators; no comment-substring proof |
| Context desaturation breaks contrast | Preserve luminance by construction, then recompute from final hexes and sample rendered frames |
| Short cards cut transcript concepts | Visible summaries and narration remain separate; transcript and pacing validators gate the merge |
| Mobile focus scrolls hidden overflow | Focus every control at every narrow viewport and assert document/canvas scroll state |
| Removing controls removes an expert path | Contextual Research route tests and a complete contract/incidental assertion inventory |
| Human study is spent on a weak candidate | Target-frame review and formative sessions occur before freeze; final cohort sees one candidate |
