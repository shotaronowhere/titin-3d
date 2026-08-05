# Titin 3D Visualization — Showcase Completion Plan

**Status:** implementation plan, reviewed 2026-08-02

**Baseline:** Phases 0–10 and Milestones 0–6 remain complete at commit `b4d661f`

**Purpose:** turn the completed scientific MVP into a presentation-quality, broadly useful titin experience for both first-time viewers and domain specialists

**Implementation status:** SC-0 through SC-4 complete on 2026-08-02; SC-5 through SC-7 complete on 2026-08-05; SC-8's automated half is complete and its human and browser gates are instrumented but outstanding

This plan is a showcase addendum. It does not reopen the completed MVP scope or relabel the optional Phase 11/12 material in `MASTER_PLAN.md`. Every showcase increment must preserve the existing scientific specification, continuous mechanics, provenance, standalone-HTML build, and GitHub Pages behavior.

---

## 1. Review verdict

The original showcase sequence had the correct priorities, but it needed five substantive corrections before implementation:

1. **Do not expand into a cardiac titin mode.** The completed model already has a defensible N2A-containing reference and a continuous mechanical implementation. The showcase should explain broadly applicable titin concepts through that model, while the expert disclosure names the actual reference. “Generic” describes the educational narrative, not an imaginary isoform-free molecule.
2. **The M-band plan must not promote an unresolved M1 density.** The 2023 native cardiac reconstruction did not resolve M1 in its averaged M-band map. The application may mark the sarcomere midpoint/M-band center as a coordinate reference, but it may call a density “M1” only when that line is sourced independently and carries its own evidence class.
3. **The Z-disc detail must show the correct two-sarcomere relationship.** The telethonin complex joins two antiparallel titin Z1–Z2 N-termini associated with adjacent half-sarcomeres. It must not appear as a decorative cap on one isolated titin strand, and the actin/α-actinin zigzag must not be misrepresented as alternating end-to-end titin and actin.
4. **MyBP-C and troponin/tropomyosin must not become release-critical scope creep.** They are scientifically valuable context, but neither is required to explain titin’s central spring, scaffold, centering, and signaling roles. MyBP-C may be added only as an explicitly schematic, optional C-zone context layer supported for the retained model scope. Thin-filament regulation remains a post-core option.
5. **“Impressive” needs audience evidence, not internal confidence.** The release gate must include structured comprehension testing with non-specialists, a claim-level expert review, and a projector/demo rehearsal. Passing code tests alone cannot establish presentation effectiveness.

With these corrections, the plan can produce an experience that is approachable to a lay viewer and credible to a titin expert. It cannot guarantee that a particular laboratory will be impressed; that requires external review. The plan therefore defines measurable novice and expert acceptance gates before claiming readiness.

---

## 2. Showcase definition of success

### 2.1 First-time-viewer outcome

After a two- to three-minute guided tour, a viewer without muscle-biology training should be able to explain that:

1. titin is one continuous molecule spanning a half-sarcomere from the Z-disc to the M-band;
2. titin is not the motor that actively shortens muscle—actin and myosin slide, while titin supplies passive elasticity, structural organization, centering, and regulatory/mechanosensory functions;
3. the elastic I-band portion is regionally heterogeneous rather than one uniform coil;
4. tandem-Ig chains primarily straighten and disordered spring regions extend over the modeled range, while the thick-filament-bound A-band portion does not uniformly stretch;
5. some displayed geometry is measured, some is modeled or schematic, and the application says which is which.

### 2.2 Titin-expert outcome

A specialist should immediately be able to determine:

- species, muscle type, isoform, structural state, and source for the active scene;
- which coordinates are measured, modeled, inferred, schematic, or unknown;
- that the visualization teaches broadly applicable titin concepts through a canonical human skeletal N2A-containing reference rather than claiming a nonexistent isoform-neutral molecule;
- that no cardiac isoform or cardiac-specific mechanical behavior has been added;
- how titin continuity, domain counts, I-band extension, A-band anchoring, lattice spacing, and copy-number claims are validated;
- what the model deliberately does not claim, including exact unresolved paths, active crossbridge dynamics, a universal Z-disc lattice, or a complete M-band molecular structure.

### 2.3 Presenter outcome

The application should support a reliable live demonstration without setup friction:

- one standalone `index.html`;
- the same science and behavior on `file://`, local HTTP, and GitHub Pages;
- a deterministic guided route with reset and chapter shortcuts;
- a compact Evidence mode for unscripted expert questions;
- no required network request during the demonstration;
- a static fallback image set if WebGL, projection hardware, or the browser fails.

---

## 3. Scope tiers

### Tier A — required for showcase release

- explicit skeletal N2A scope and state labeling;
- Guided and Evidence experiences;
- stronger titin visual hierarchy and continuity cues;
- live band/zone brackets;
- corrected bare-zone, M-band, and Z-disc presentation;
- object-linked tooltips with readable citations and evidence;
- orthographic transverse lattice comparison;
- guided narrative, expert deep dives, and AI/provenance explanation;
- scientific, visual, accessibility, performance, standalone, and audience validation.

### Tier B — desirable if it passes the science and attention-budget gates

- optional schematic MyBP-C C-zone context, only if retained-scope evidence supports the placement;
- N2A interaction-hub, titin-kinase/M-region, and mechanotransduction explainers;
- proposed length-dependent thick-filament activation explainer, labeled as proposed rather than settled;
- presentation exports and shareable URL state.

### Tier C — explicitly optional after the core showcase is complete

- troponin/tropomyosin Ca²⁺-off/on structural reference with its actual isoform composition disclosed;
- disease-variant overlays;
- atom-level molecular viewers;
- light-theme publication mode;
- narrated audio or video export.

Tier C work must not delay or destabilize Tier A.

---

## 4. Scientific guardrails

These are release invariants, not stylistic preferences.

### 4.1 Titin and contraction

- Do not say or imply that titin is the actomyosin motor.
- Use “shortened geometry” or “short sarcomere” for length presets unless activation is independently defined.
- Keep sarcomere length and biochemical activation as orthogonal state axes.
- Thick- and thin-filament lengths remain invariant while overlap and anchor separation change.
- Do not animate folded-domain unfolding as ordinary physiological extension in the default story.

### 4.2 Isoform and tissue scope

- The default model is `Q8WZ42`, canonical human skeletal N2A-containing titin.
- The guided story may use “titin” when describing conserved concepts, but the persistent scope badge and every expert readout must name the reference.
- No new cardiac, alternative-isoform, or muscle-specific mechanical mode is part of this plan.
- Existing context values derived from other muscle preparations retain their current `muscle_type`, source, state, and transfer caveats.
- A value marked `skeletal_transfer: NOT established` cannot enter authoritative N2A geometry or be promoted for showcase convenience.

### 4.3 Z-disc

- Show antiparallel actin filaments from adjacent sarcomeres interdigitating in the Z-disc.
- Show α-actinin as the actin crosslinking element; do not describe the chevron/zigzag as alternating titin and actin ends.
- If telethonin is rendered, depict the palindromic complex of two titin Z1–Z2 N-termini from opposite directions.
- A small-square or basketweave motif must be tied to the specific muscle/state evidence; neither is a universal Z-disc icon.
- Exact lateral titin routing through the Z-disc remains unknown unless separately resolved.

### 4.4 Bare zone and M-band

- The central head-free bare zone is a region of the thick filament, not a solid protein plate.
- The M-band is the crosslinking architecture near the sarcomere center; it is not synonymous with the complete 160 nm head-free region.
- Absence of myosin heads should communicate the bare zone.
- A midpoint marker is a coordinate reference, not automatically an observed M1 density.
- Myomesin/OBSL1/titin/M-protein detail must carry protein-specific evidence; unresolved density cannot be assigned by visual convenience.
- The M-band close-up must show titin arriving from both half-sarcomeres, not terminating at an opaque wall.

### 4.5 MyBP-C context

- MyBP-C is an accessory thick-filament/C-zone protein, not part of titin itself.
- Do not import exact cardiac cMyBP-C coordinates into the retained N2A reference.
- Admit a MyBP-C layer only if the SC-0 audit finds evidence sufficient for the claimed muscle/context and records the transfer limits.
- If admitted, exact path, reach, orientation, stripe placement, and thin-filament contact default to `SCHEMATIC` unless independently supported.
- Do not render every MyBP-C molecule as a rigid, identical thick-to-thin bridge.
- Do not imply a direct titin–MyBP-C contact merely because both share the C-zone periodic context.
- If evidence is insufficient for an honest layer, omit the geometry and explain in Evidence mode why MyBP-C is not shown.

### 4.6 Lattice mechanics

- Use the existing lattice coordinates and `d10` calculation; a presentation view may not re-derive a competing lattice.
- Label constant-volume scaling as a model/idealization.
- Use states inside the declared working range for the primary comparison; the 1900 nm and 3000 nm references must be identified as references outside that working band where applicable.
- Do not imply that a passive length sweep reproduces the time-dependent radial behavior of active contraction.

### 4.7 Animation and scale

- Smooth interpolation is a communication device, not a measured molecular trajectory.
- A structure may only appear when its repeat is resolvable at the current zoom.
- Screen-space highlights, leader lines, brackets, and continuity traces are presentation geometry and must be declared as such.
- Detail views may simplify or isolate context but may not move biological anchors.

---

## 5. Information and software architecture

### 5.1 New presentation record

Add a required `data/presentation.json`. It contains no authoritative coordinates. It references existing scientific IDs and records:

```text
schema/version
audience modes
scope badges
guided chapters
lay summaries
expert expansions
target component/region IDs
recommended scene/view/visibility state
source IDs
not-claimed text
presenter shortcuts
```

Validation must reject:

- missing or duplicate IDs;
- narrative targets that do not exist;
- source IDs absent from `references.json`;
- a scientific sentence without at least one source or explicit `SCHEMATIC` designation;
- presentation text that assigns a stronger evidence class than the target claim.

`SpecLoader.js`, the Python validators, the standalone builder, and registry-coverage tests must all treat the new file as required.

### 5.2 Public biological state

Extend `TitinVisualization` without exposing Three.js types:

```text
audience_mode: guided | evidence
story_step: ID | null
sarcomere_length_nm: number
structural_state: named keyframe | null
selected_component_or_region: ID | null
regulatory_state: optional, independent, absent from Tier A
```

The biological state remains the existing N2A-containing model. Audience/story modes may choose camera, visibility, and explanatory copy, but they may not replace the scientific model or mechanical solver.

### 5.3 Recommended modules

Keep specialized geometry outside the already large scene class:

- `src/geometry/ZDiscDetail.js`
- `src/geometry/MBandDetail.js`
- `src/geometry/MyBPCContext.js` only if the SC-0 admission gate passes
- `src/geometry/LatticeCrossSection.js`
- `src/render/AnnotationOverlay.js`
- `src/presentation/StoryController.js`

`SarcomereScene.js` remains the assembly/visibility layer. `Viewer.js` remains responsible for camera/projection transitions. `TitinAnnotations.js` remains the source for biological annotation descriptors and is extended rather than bypassed.

### 5.4 Reproducible URL state

Use a compact URL hash or query representation for:

- audience mode;
- story step;
- sarcomere length;
- camera preset, not arbitrary floating camera coordinates;
- selected component/region;
- evidence display.

Unknown or incompatible values must fail visibly or fall back with an explicit message; they must not silently produce a different scientific state.

---

## 6. Visual and interaction system

### 6.1 Layout

Replace the single permanently dense 320 px inspector with three layers:

1. **Stage:** the 3D scene, direct labels, band brackets, and chapter title.
2. **Guided card:** one short explanation, previous/next, and an evidence link.
3. **Evidence drawer:** measurements, component controls, sources, caveats, and advanced close-ups.

The Evidence drawer may be docked on wide screens and bottom-sheet/modal on narrow screens. The main scene should not be reduced to a narrow strip during the guided presentation.

### 6.2 Visual grammar

| Meaning | Treatment |
|---|---|
| Titin identity | vivid magenta/red |
| Myosin/thick filament | subdued blue |
| Actin/thin filament | subdued ochre |
| MyBP-C | yellow |
| α-actinin | cyan |
| M-band crosslinks | violet |
| Selected titin | brighter titin-family rim, not gold replacement |
| Measured | solid/highest permitted opacity |
| Modeled/inferred | lower opacity plus label badge |
| Schematic | distinct badge and optional dash pattern |
| Unknown extent | omitted or uncertainty envelope |

Identity, selection, and evidence are three independent channels. No code path may collapse them into one color or opacity decision.

The palette must pass contrast checks and remain distinguishable under common color-vision simulations and in grayscale. No explanation may depend on red-versus-green discrimination.

### 6.3 Direct labels and collision handling

- Project model anchors into a DOM/SVG overlay.
- Use short direct labels in Guided mode and expandable labels in Evidence mode.
- Apply deterministic collision avoidance, priority, and edge clamping.
- Hide low-priority labels before allowing overlap.
- Keep leader-line endpoints attached during orbit, resize, length changes, and camera animation.
- Direct labels must never look like molecular bonds.

### 6.4 Picking and tooltips

Raycast major meshes, region tubes, and instanced domains. Map `instanceId` back to the biological record. The supported API returns the biological annotation, not the intersected Three.js object.

Every pinned tooltip contains:

1. plain-language name and role;
2. expert detail;
3. species/muscle/isoform/state;
4. evidence badge;
5. short bibliographic citation;
6. clickable DOI/PDB/UniProt link;
7. “what this shape encodes”;
8. “not claimed.”

Hover previews, click pins, touch opens, Escape closes, and the DOM structure list provides an equivalent keyboard path. Text must be inserted with safe DOM APIs rather than unescaped HTML.

### 6.5 Camera and transition grammar

- Each guided chapter owns a deterministic camera preset and target.
- A story-scale or view switch resets incompatible focus before framing the new view.
- A transverse educational view uses orthographic projection or a dedicated cross-section scene; it never inherits a longitudinal region zoom.
- Camera easing remains interruptible and respects reduced motion.
- Animation pauses whenever a tooltip is pinned or the browser tab is hidden.
- A single Reset action returns to the active chapter’s canonical camera and visibility state.

---

## 7. Work packages and gates

### SC-0 — Claim audit, scope lock, and design contract

#### Work

- Build the new-claim matrix and source every proposed addition.
- Verify M-band terminology and any line positions against primary sources.
- Define exactly which Z-disc motif is shown and for what muscle/state.
- Decide whether retained-scope evidence is sufficient to admit a schematic MyBP-C C-zone layer; otherwise record the omission explicitly.
- Decide the Tier B interaction-hub and mechanosensing content.
- Write the visual grammar and attention budget.
- Add the reviewed plan and later add a showcase section to `MASTER_PLAN.md` without renumbering the MVP.

#### Gate

- Every proposed visual object has a claim, scope, source, evidence class, and omission statement.
- The reviewed claim payload is independently digest-pinned, every admitted external source has complete linkable metadata, and destructive controls reject scope, evidence, transfer, object-manifest, visual-grammar, and attention-budget drift.
- No source figure is copied into the product without an explicit compatible license; supplied illustrations are design references only.
- No cardiac titin type, cardiac mechanical mode, or exact cardiac accessory-protein placement has entered the plan.
- No Tier C work is required to make Tier A coherent.

### SC-1 — Presentation data and dual audience shell

**Status: COMPLETE (2026-08-02).** The required, cross-file-validated
`presentation.json`, Guided/Evidence shell, always-visible scope/state badge,
geometry-versus-activation length language, out-of-working-range warnings, public
presentation state, deterministic URL codec, responsive Evidence drawer, runtime
fallback notices, standalone embedding, and destructive negative controls are in
place. The original inspector controls and scientific readouts remain available in
Evidence mode.

#### Work

- Add and validate `presentation.json`.
- Implement Guided/Evidence modes.
- Add a visible scope/state badge above the fold.
- Move advanced controls into an Evidence drawer.
- Rename visible length presets to distinguish geometry from activation.
- Flag reference states outside the working range.
- Add shareable deterministic URL state.
- Preserve all existing controls and API capabilities.

#### Gate

- The scope is visible without scrolling at desktop and presentation resolutions.
- Guided mode contains no raw evidence inventory until requested.
- Evidence mode exposes every existing scientific readout.
- URL reload reproduces the same supported biological state.
- No old API or standalone test regresses.

### SC-2 — Titin hierarchy, continuity, and length story

**Status: COMPLETE (2026-08-02).** The delivered overlay is derived from the
canonical Level-0 backbone and live mechanical partition. N2A/PEVK use a
consistently reduced render-only radius, rather than changing thickness only on
selection; this is necessary to satisfy the same phase's stronger invariant that
selection changes no geometry. The M-band is a center marker only, while the
separately derived bare-zone bracket carries the axial extent. Final review also
made bracket visibility depend on the live projected camera axis, preserved source
metadata under selection with an explicit regression gate, and added a bounded
local verification command so exhaustive destructive controls can remain a CI job.

#### Work

- Establish the new accessible identity palette.
- Increase titin salience and reduce context salience in Guided mode.
- Replace gold selection with a titin-family highlight that preserves evidence opacity.
- Reduce selected PEVK/N2A render thickness.
- Add a render-only x-ray/continuity trace using the exact canonical backbone points.
- Add N- and C-terminal direction labels.
- Add live Z-disc, I-band, A-band, C-zone, bare-zone, and M-band brackets.
- Suppress horizontal brackets when free orbit makes the live axis non-longitudinal.
- Reframe the opening shot around one readable titin path with ghosted lattice context.
- Build a synchronized region-extension chart derived from the same mechanical output as the 3D scene.
- Visually distinguish folded-domain straightening from disordered-chain extension.

#### Gate

- Titin is identifiable within five seconds in a silent screenshot.
- Titin remains visually continuous at 1280×720, 1920×1080, and 390×844.
- The continuity trace and brackets move no biological coordinate.
- Region selection changes no geometry, evidence opacity, or source metadata.
- Folded domains remain rigid in the default physiological story.
- Existing continuity and mechanical tests plus new visual-state tests pass.

### SC-3 — Z-disc and M-band correction

**Completed 2026-08-02.** The retained implementation removes the former 160 nm
M-line slab, keeps that interval exclusively as the thick-filament bare zone,
uses a zero-width midpoint ring plus sparse schematic M-band relationship
proxies, and adds target- and resolvability-gated Z-disc topology. The completion
audit also makes the local motif invariant to surrounding lattice-ring count,
restricts the sourced ~6 nm alpha-actinin doublets and their LOD measurement to
Evidence mode, depicts a finite antiparallel Z1Z2-telethonin sandwich, and
reevaluates crown, twist, and anchor thresholds independently during live zoom.
Nine focused positive and destructive tests are in
`test/showcase_phase3.test.js`; the bounded gate is `npm run verify:sc3`, which
also rejects a stale standalone `index.html`.

#### Work: bare zone and M-band

- Remove the lattice-wide translucent 160 nm M-line slab.
- Keep the bare zone as a thick-filament/head-distribution property.
- Represent its extent through head absence, a subtle bracket, and optional presentation tint.
- Replace the old `mline` visual with a midpoint/M-band reference and separately evidence-coded crosslinks.
- Add mirrored titin M-regions from both half-sarcomeres.
- Add sparse schematic myomesin-family crosslinks only at sourced positions/relationships.
- Show any independently sourced M-lines as individual claims; do not infer M1 from the 2023 averaged map.

#### Work: Z-disc

- Add a zoom-gated motif of interdigitating antiparallel actin.
- Add α-actinin doublets/crosslinks using the selected skeletal structural evidence.
- Add two opposing titin Z1–Z2 chains and the telethonin sandwich.
- Keep unresolved lateral titin routing absent or explicitly schematic.
- Do not combine relaxed small-square and activated basketweave motifs into one hybrid.

#### Gate

- “Bare zone,” “M-band center,” and any specific M-line are independently named.
- No solid block obscures the M-band close-up.
- M-band titin visibly continues through the central two-half-sarcomere relationship.
- Z-disc viewers cannot reasonably infer an alternating titin–actin end-to-end chain.
- Detail disappears below its resolvability threshold.
- Negative tests reject restoration of the 160 nm M-line box or single-ended telethonin depiction.

### SC-4 — Object-linked annotations and evidence access

**Completed 2026-08-02.** The retained implementation replaces detached marker
sprites with direct biological raycasting and one DOM/SVG explanation overlay.
Components, titin region tubes, individual instanced folded domains, Z-disc
details, and M-band details resolve to stable biological IDs rather than Three.js
objects. A validated `data/annotations.json` catalog supplies dual-audience copy,
scope, claim/render evidence, render meaning, non-claims, and bibliography keys;
all short citations and outbound links are resolved from `data/references.json`.
Pointer hover previews, click/tap pinning, canvas arrow-key navigation, Enter/Space,
Escape, screen-reader announcements, the Guided story card, component/region state,
and the Evidence drawer share the same selection and annotation resolver. Logical
selections re-resolve their model anchor after mode, camera, viewport, and mechanical
rebuild changes. Ten focused tests and destructive catalog mutations are in
`test/showcase_phase4.test.js`; the bounded gate is `npm run verify:sc4`, which also
rejects a stale standalone `index.html`.

#### Work

- Extend annotations with lay text, expert text, scope, evidence, short citation, resolved link, render meaning, and not-claimed text.
- Implement raycasting for components, titin regions, instanced domains, and new detail structures.
- Add DOM/SVG tooltip and leader-line overlay.
- Replace raw DOI strings with human-readable citations and source links.
- Synchronize canvas selection, tooltip, story card, and Evidence drawer.
- Add keyboard/touch equivalence.
- Remove detached annotation squares where direct labels supersede them.

#### Gate

- Every visible biological component can be explained in one interaction.
- Every pinned explanation exposes its source and evidence in one interaction.
- Tooltip anchors remain correct after orbit, resize, mode change, and mechanical rebuild.
- No source/evidence relationship is duplicated in unvalidated UI constants.
- Accessibility tests cover focus order, Escape, touch, and screen-reader labels.

### SC-5 — Thick-filament context and optional MyBP-C

**Completed 2026-08-05.** The A-band story is now carried by an `aband_scaffold`
descriptor derived from the same canonical records the band brackets already use:
the eleven-domain 45.5 nm super-repeat, its eleven C-zone copies, the
near-commensurate 43.1 nm myosin repeat with its 2.4 nm residual stated rather
than elided, and the 620 nm anchored span measured off the live Level-0 segment
so its invariance with sarcomere length is observed, not asserted. The SC-0
admission gate passed, so `src/geometry/MyBPCContext.js` adds a sparse, Evidence-only,
off-by-default C-zone layer: eleven stripes of three markers at the sourced
fast-skeletal ~43 nm periodicity, keeping MyBP-C's own repeat rather than borrowing
titin's 45.5 nm, which would have asserted an exact shared register. The completion
audit also collapsed three separate `X_end - n x periodicity` derivations of the
C-zone into one: `TitinRepresentation.cZoneAt` now owns it, and the C-zone domain
block, the SC-2 band bracket, and the MyBP-C layer all consume that record.
Two gates govern visibility — the stripe spacing must resolve, and the C-zone must
fill at least half the frame, so the layer stays confined to its own close-up
instead of decorating a whole-sarcomere overview — and the marker radius is clamped
against the live titin tube radius so subordination holds for any caller. A `czone`
close-up supplies the framing that the reviewed attention budget presupposes when
it confines MyBP-C to "its relevant close-up", the same way the Z-disc and M-band
layers each ship with theirs.
Stripe register, azimuth, reach, and pose are SCHEMATIC and cannot be promoted;
`validateMyBPCContext` rejects a promoted placement class, a Guided audience, an
identical rigid pose across the layer, drift from the sourced periodicity, a
molecule reaching the thin-filament surface, and any asserted titin contact. The
periodicity and molecule count come from two new fast-skeletal `geometry_sources.json`
records, never from the cardiac 8G4L chain placement, and two Evidence-mode
`expert_cards` in `presentation.json` — required by both the JS and Python
presentation validators whenever the MyBP-C claim is admitted — record the
scaffold/ruler qualification and why the cardiac coordinates were not imported.
Fourteen focused positive and destructive tests are in `test/showcase_phase5.test.js`;
the bounded gate is `npm run verify:sc5`, which also rejects a stale standalone
`index.html`. This phase additionally repaired a pre-existing gap: `annotations.json`
had been a required spec file since SC-4 but was never registered in
`validate_geometry.py`'s coverage guard, so the whole-project `npm run verify`
gate was failing and nothing validated the catalog there.

#### Work

- Strengthen the existing A-band story: titin’s superrepeat organization, thick-filament binding, and invariant anchored span.
- Explain that titin is a scaffold/ruler-like organizer as well as an I-band spring, while keeping causal regulatory mechanisms appropriately qualified.
- If the SC-0 admission gate passes, add MyBP-C as an optional context component in the C-zone.
- Use only placement and periodicity that are defensible for the retained model scope.
- Mark the exact MyBP-C domain path, orientation, reach, and any thin-filament contact `SCHEMATIC` unless supported by scope-compatible evidence.
- Keep MyBP-C sparse and visually subordinate to titin.
- Do not draw an obligatory rigid bridge.
- Add an Evidence-mode explanation of why exact cardiac coordinates were not imported.
- If the admission gate fails, show no MyBP-C geometry and provide a concise “not shown” note instead of inventing placement.

#### Gate

- The A-band titin story is understandable without MyBP-C enabled.
- MyBP-C, if admitted, is visibly an accessory context protein rather than part of titin.
- No exact cardiac coordinate or cardiac titin type is introduced.
- A schematic MyBP-C path can never acquire `MEASURED` placement evidence.
- Hiding MyBP-C changes no titin, filament, overlap, or lattice coordinate.
- A negative test rejects a rigid universal bridge or unsourced direct titin–MyBP-C contact.

### SC-6 — Orthographic lattice breathing comparison

**Completed 2026-08-05.** `src/geometry/LatticeCrossSection.js` emits two
same-scale transverse panels as plane coordinates plus ONE shared linear scale,
rather than adding an orthographic camera and then asserting nothing perspective
leaked in: circles drawn from that record cannot foreshorten and cannot disagree
about scale, so both projection gates hold by construction and are checkable
without a GPU. Every site and every d10 comes back verbatim from
`LatticeGeometry.latticePatch`, so no second lattice solver exists. The d10
dimension line is built from two ring-1 neighbours, which makes its drawn length
equal d10 by geometry rather than by label, and it meets the (1,0) row it
measures to at a right angle; the validator rejects a line whose length and label
disagree. The comparison panel is a named structural state inside the declared
2,000–2,400 nm working band, chosen as whichever candidate lies furthest from the
displayed length so the pair is never degenerate, and the band itself is parsed
from the sourced literature parameter and cross-checked against the band
`presentation.json` declares. Each panel ghosts the other's thick lattice, the
constant-volume caveat and the four non-claims render beside the panels rather
than only in the evidence inventory, and `time_resolved_contraction_implied` is
validated false. The perspective down-axis close-up no longer calls itself a
cross-section. Thirteen focused positive and destructive tests are in
`test/showcase_phase6.test.js`; the bounded gate is `npm run verify:sc6`, which
also rejects a stale standalone `index.html`.

#### Work

- Create `LatticeCrossSection` from the existing evaluated lattice sites.
- Use an orthographic view with circular thick/thin cross-sections.
- Show current `d10` with a dimension line.
- Add a same-scale comparison inside the normal 2000–2400 nm working band.
- Optionally ghost the previous state to show radial displacement.
- Keep axial and transverse readouts synchronized.
- Show the constant-volume caveat beside the comparison, not only deep in the Evidence drawer.

#### Gate

- No perspective tunnel or foreshortened cylinders appear in the educational cross-section.
- Cross-section sites are exactly the existing `LatticeGeometry` output.
- Increasing sarcomere length monotonically reduces displayed `d10` under the current declared model.
- Both comparison panels share center, scale, and projection.
- The view never implies time-resolved active contraction.

### SC-7 — Guided narrative and expert depth

**Completed 2026-08-05.** The guided route is now the seven chapters the plan
specifies: locate titin, read its architecture, watch regional extension, inspect
its anchors, see titin as a scaffold, audit the evidence, and close with the
build pipeline. Each owns one takeaway, one deterministic camera, one visibility
configuration, sourced copy, and its non-claims; the route uses four distinct
cameras — including the SC-6 `czone` close-up and the Z-disc anchor close-up — so
it moves rather than parking on one shot. Two of the plan's gates are now
machine-checked rather than asserted: a declared `tour_pacing` reading model puts
the shipped copy at 121 s against a 110–190 s window, and the "one main idea, not
a dense paragraph" rule is enforced as 2–3 sentences with no sentence over 30
words, because a word cap alone permits a single 45-word sentence. Five new
expert cards cover N2A as an interaction hub, titin kinase, proposed
length-dependent activation, isoform diversity, and the unresolved azimuthal,
M-band, and active-mechanics questions. Every card now carries a
`findings` list whose entries are ESTABLISHED, PROPOSED, or OPEN, so the
established-versus-proposed distinction is structural and rendered as labelled
rows; a card resting on an INFERRED claim that marks nothing PROPOSED is
rejected. `src/presentation/ProvenancePipeline.js` counts each of the six
pipeline stages from the loaded records at render time, so a diagram about
auditability cannot itself carry hand-written numbers. Twelve focused positive
and destructive tests are in `test/showcase_phase7.test.js` and eight new
destructive presentation controls were added; the bounded gate is
`npm run verify:sc7`. Two pre-existing defects were repaired on the way: chapter
targets validated against `sarcomere.components` while the runtime offered the
broader pickable set that `annotations.json` records, and derived Phase-6
measurement sources (`PDB:1TKI+4JNW (…)`) had no link route at all, so any UI
citing one threw — the Python validator had been calling them linkable while the
JS resolver could not link them.

#### Main guided route

1. **Locate titin:** one continuous molecule from Z-disc to M-band.
2. **Read its architecture:** elastic I-band regions versus anchored A-band scaffold.
3. **Watch regional extension:** tandem-Ig straightening and disordered-region extension, not uniform scaling.
4. **Inspect its anchors:** Z-disc tension transfer and M-band/thick-filament integration.
5. **See titin as a scaffold:** A-band superrepeats, thick-filament integration, and optional MyBP-C context.
6. **Audit the evidence:** what is measured, modeled, inferred, schematic, and unknown.

Each chapter owns:

```text
one scientific takeaway
one deterministic camera
one visibility/detail configuration
one 25–45 word lay explanation
one optional expert expansion
one or more sources
one not-claimed statement where needed
```

#### Expert deep dives

Add concise, separately evidence-coded cards for:

- N2A as a mechanical and interaction hub;
- titin kinase/M-region signaling, without presenting a single settled mechanosensing mechanism;
- proposed titin contribution to length-dependent thick-filament activation;
- a concise statement that alternative splicing creates tissue- and muscle-specific titin isoforms, without adding another model;
- unresolved questions in azimuthal placement, M-band organization, and active mechanics.

#### AI/provenance chapter

End the presentation with a compact, inspectable pipeline:

```text
primary paper / PDB / UniProt
              ↓
coordinate or literature measurement
              ↓
evidence-classified specification
              ↓
executable mechanical/geometric model
              ↓
procedural render
              ↓
positive and destructive negative tests
```

The message is not “AI drew a convincing protein.” It is “AI helped build and audit a reproducible model whose claims remain tied to evidence.” This directly supports the demonstration objective and is more credible to scientists.

#### Gate

- The main tour completes in approximately two to three minutes without opening the Evidence drawer.
- A chapter contains one main idea; no chapter depends on reading a dense paragraph.
- Every camera/visibility transition is deterministic and resettable.
- Expert cards distinguish established findings from proposed mechanisms.
- Reduced-motion mode replaces animation with immediate, scientifically equivalent state changes.

### SC-8 — Integrated validation and audience evaluation

**Automated half complete 2026-08-05; audience gates instrumented and OUTSTANDING.**
This phase cannot be declared complete from inside the repository, and the record
says so. `data/release_gates.json` carries every SC-8 gate with its status, and
`scripts/validate_release_gates.py` refuses a `PASS` that is not backed by the
evidence which would have earned it: participant-level answers meeting the 80%
criterion for the lay test, named reviewers with zero unresolved critical findings
for the expert review, a full captured cell set with a human reviewer for the
visual matrix. Fifteen destructive controls in
`scripts/neg_control_release_gates.py` prove each of those shortcuts is rejected,
and `release_ready` cannot be true while any gate is outstanding.

What is done: thirteen integration tests in `test/showcase_phase8.test.js` cover
the ten listed areas, including the three that had no home before — that no
presentation combination changes the model or solver (swept over 32 option
combinations at four lengths), that every combination keeps titin continuous, and
that every supported URL state round-trips. All seven listed destructive controls
run together in `scripts/neg_control_showcase_release.mjs`; the two that are
invariance rather than rejection are each run twice, once against the real
implementation and once against a saboteur, so the check is falsifiable.
`src/presentation/VisualMatrix.js` generates the 52-cell capture set as viewport
plus reproducible URL hash, each round-trip checked at construction, and
`scripts/capture_visual_matrix.mjs` emits it as a checklist or manifest for
whoever has a browser. Accessibility contrast is computed rather than asserted —
all eleven declared pairs clear WCAG AA against the shipped stylesheet — and the
lifecycle checks prove twelve rebuilds and mode changes leak no object or GPU
resource and that an idle frame rebuilds nothing. The bounded gate is
`npm run verify:sc8`.

What is outstanding, and why: the visual matrix needs a browser with WebGL to
capture and a person to review; the lay comprehension test needs at least three
independent non-specialists; the expert claim review needs a muscle or titin
specialist; the 200% text-zoom check needs a real browser; and the target
browser/GPU/projector check belongs to the SC-9 preflight. One accessibility
defect was found and fixed rather than recorded: controls were ~28 px tall, so
coarse-pointer devices now get the 44 px minimum touch target.

#### Automated science and data tests

Retain all existing tests and add coverage for:

- presentation target/source integrity;
- the presentation layer leaving the underlying model and solver unchanged;
- rejection of unapproved cross-muscle coordinate transfer;
- schematic MyBP-C placement remaining schematic, if that layer is admitted;
- bare-zone/M-band separation;
- Z-disc opposing-chain topology;
- tooltip completeness and evidence monotonicity;
- lattice cross-section parity;
- URL-state compatibility;
- every new visibility/mode combination preserving titin continuity.

#### Destructive negative controls

Prove rejection of:

- an unapproved cardiac MyBP-C coordinate adopted into the retained model;
- a schematic MyBP-C path promoted to measured;
- an M-line box assigned the bare-zone width;
- a single titin chain inserted into the telethonin sandwich;
- a presentation claim without a source/evidence status;
- automatic coupling of short length to activation;
- a selected region that changes geometry or evidence opacity.

#### Deterministic visual matrix

Capture at minimum:

- 1920×1080 presentation/projector;
- 1440×900 desktop;
- 1280×720 compact laptop;
- 390×844 mobile.

Cover:

- every guided chapter;
- Evidence mode;
- all current-reference keyframes and working-range endpoints;
- Z-disc, M-band, lattice, PEVK/N2A, and A-band close-ups;
- the A-band scaffold view with MyBP-C both enabled and disabled if admitted;
- selected and unselected states;
- reduced motion;
- representative color-vision and grayscale review.

Use fixed camera state, device scale, seeded presentation geometry where applicable, and disabled animation for screenshot capture. Pixel comparison supplements human review; it does not determine scientific correctness.

#### Lay comprehension test

Before release, test the guided experience with at least three independent non-specialists; five is preferable. Without coaching, ask them to:

1. identify titin;
2. identify its two anchors;
3. explain what changes as the sarcomere length changes;
4. state whether titin is the active motor;
5. distinguish a source-backed structure from a schematic aid.

Release criterion: at least 80% of participants answer the first four correctly after one tour, and no recurring misconception is caused by the interface.

#### Expert claim review

Obtain review from at least one muscle/titin specialist before labeling the showcase expert-ready; two independent reviewers are preferable. Give them the claim matrix, source links, and standard screenshot set. Ask specifically:

- Is the actual N2A-containing reference visible to experts without burdening the general story?
- Is titin continuous and correctly routed at the claimed scale?
- Are spring mechanics described without normalizing domain unfolding?
- Are Z-disc and M-band simplifications defensible?
- Is MyBP-C represented without a false rigid-bridge or titin-contact claim?
- Is any static evidence or schematic device presented as a measured trajectory?
- Does any artistic device look like an experimental observation?

Release criterion: zero unresolved critical scientific findings. Lesser disagreements must be recorded as limitations or addressed.

#### Accessibility and usability

- WCAG-oriented text and control contrast.
- Full keyboard route through guided steps, controls, and annotations.
- Touch targets suitable for tablets.
- Focus order matches visual order.
- `prefers-reduced-motion` honored.
- Selection and evidence are never color-only.
- Direct labels remain legible at 200% text zoom.

#### Performance and lifecycle

- Record the existing baseline before adding new geometry.
- Do not rebuild geometry per animation frame.
- Retain instancing for repeated structures.
- Use LOD/resolvability gates for molecular detail.
- Verify repeated rebuilds and mode changes do not grow object/resource counts.
- Document any standalone-size or first-render regression above 20% and either justify or correct it.
- Test the exact browser/GPU/projector configuration intended for the presentation.

#### Gate

- Full `npm run verify` succeeds.
- The generated standalone file is current and scientifically identical to the source build.
- Automated, visual, accessibility, performance, lay, and expert gates all pass.

### SC-9 — Release, rehearsal, and handoff

#### Release artifacts

- standalone `index.html`;
- GitHub Pages deployment;
- updated `README.md` with Guided/Evidence instructions;
- updated scope statement and showcase completion status;
- one-page claim/evidence matrix;
- standard screenshot review pack;
- scientific limitations/not-claimed sheet;
- short presenter script;
- demo-day preflight checklist;
- static fallback slides/images generated from the approved build.

#### Demo-day preflight

1. Open the deployed GitHub Pages URL and the offline standalone file.
2. Confirm both report the same build/checksum.
3. Run the guided route once on the actual display/projector.
4. Check typography, color, animation, WebGL, and pointer behavior.
5. Confirm Reset and chapter shortcuts.
6. Keep the static fallback pack locally available.
7. Do not depend on opening external citations during the live narrative.

#### Final release definition

The showcase is complete only when:

```text
existing Phase 0–10 gates still pass
+ every new claim has source, scope, state, evidence, and not-claimed metadata
+ no unapproved cross-muscle coordinate can enter the retained mechanics
+ no apparent titin discontinuity remains at supported presentation sizes
+ bare zone and M-band are visually and terminologically distinct
+ Z-disc topology cannot be read as alternating titin/actin ends
+ MyBP-C is either honestly schematic or explicitly omitted
+ lattice breathing is legible and labeled as modeled
+ novice comprehension threshold is met
+ expert review has no unresolved critical finding
+ standalone, local-server, and GitHub Pages outputs agree
+ projector rehearsal and fallback package are complete
```

---

## 8. Optional extension — thin-filament regulation

This extension begins only after Tier A is accepted.

### Admission test

It is admitted only if it answers a question the titin narrative otherwise cannot answer and does not redirect attention from titin toward a generic contraction lesson.

### If admitted

- Pin and measure the required calcium-free and calcium-bound thin-filament structures through the existing raw-source pipeline.
- State the actual actin, tropomyosin, and troponin isoform composition of each structure.
- Render actin, continuous tropomyosin, and troponin regulatory units only at resolvable close-up scale.
- Use `regulatory_state` independently from sarcomere length.
- Show tropomyosin positional change rather than generic “troponin binding-site dots.”
- Keep the layer off by default and label the actual source structure and isoform composition rather than calling it generic.

### Gate

- Length changes cannot alter calcium state.
- Calcium state cannot alter the current titin mechanics without a separately sourced coupling model.
- The regulatory repeat and actin crossover are independently represented and tested.
- The layer remains visually subordinate to the titin story.

---

## 9. Implementation and commit sequence

Use small, reviewable commits. Each commit that changes source, scientific data, or dependencies must regenerate `index.html` and pass its targeted tests. Each completed work package must pass `npm run verify` before the next package begins.

1. `docs: add reviewed showcase completion plan`
2. `data: add showcase claim and presentation records`
3. `ui: add guided and evidence experience shell`
4. `render: strengthen titin hierarchy and live band overlays`
5. `science: separate bare zone and M-band representations`
6. `render: add evidence-scoped Z-disc and M-band detail`
7. `ui: add object-linked annotations and citations`
8. `science: decide and document MyBP-C context admission`
9. `render: add schematic MyBP-C context or explicit omission note`
10. `render: add orthographic lattice comparison`
11. `presentation: integrate guided route and expert deep dives`
12. `validation: add visual, accessibility, performance, and negative gates`
13. `release: finalize standalone showcase and review package`

If MyBP-C is admitted, its source/adoption record must pass independently before its renderer is added. If the evidence gate fails, commits 8–9 produce the documented omission instead of geometry.

---

## 10. Risk register

| Risk | Consequence | Control |
|---|---|---|
| “Generic” treated as isoform-free | Expert-level scientific ambiguity | Broad narrative plus persistent expert scope disclosure |
| Length shown as activation | Lay and expert misconception | Rename states; independent state axes; persistent disclosure |
| Literal spring imagery | Incorrect normal-unfolding interpretation | Domain straightening plus disordered-chain extension |
| M-line/bare-zone conflation | Misidentified central architecture | Remove slab; separate region, midpoint, and crosslinks |
| Universalized Z-disc motif | Overclaim across muscle/state | Scope motif and label evidence/state |
| Rigid or over-precise MyBP-C bridge | Overstated context geometry | Schematic-only admission gate or explicit omission |
| Visual overload | Titin loses narrative priority | Guided attention budget; LOD; Tier C deferral |
| Evidence opacity reduces legibility | Accurate but unreadable view | Context dimming and outlines without promoting evidence |
| WebGL/projector failure | Live demonstration interruption | Preflight, offline file, deterministic static fallback |
| Standalone drift | Local and hosted science diverge | Build checksum and existing standalone gates |
| Screenshot flakiness | False regression noise | Deterministic cameras/state and human review |
| AI spectacle framing | Experts distrust provenance | End with evidence pipeline, negative controls, and limitations |

---

## 11. Primary evidence baseline for implementation

The SC-0 audit must verify every claim actually used. The sources below are an evidence queue, not permission to transfer geometry between tissues or isoforms. Cardiac studies are retained only where they constrain shared sarcomere context, document a limitation, or support a clearly optional reference layer; they do not create a cardiac titin mode.

### 11.1 Core titin evidence

- Wang et al., *The molecular basis for sarcomere organization in vertebrate skeletal muscle*, Cell (2021), DOI: [10.1016/j.cell.2021.02.047](https://doi.org/10.1016/j.cell.2021.02.047)
- Trombitás et al., *Titin extensibility in situ: entropic elasticity of permanently folded and permanently unfolded molecular segments*, J Cell Biol (1998), DOI: [10.1083/jcb.140.4.853](https://doi.org/10.1083/jcb.140.4.853)
- Zou et al., *Palindromic assembly of the giant muscle protein titin in the sarcomeric Z-disk*, Nature (2006), DOI: [10.1038/nature04343](https://doi.org/10.1038/nature04343)

### 11.2 Conditional structural context and limitation evidence

- Hessel et al., *Myosin-binding protein C regulates the sarcomere lattice and stabilizes the OFF states of myosin heads*, Nat Commun (2024), DOI: [10.1038/s41467-024-46957-7](https://doi.org/10.1038/s41467-024-46957-7)
- Burgoyne et al., *Three-Dimensional Structure of Vertebrate Muscle Z-Band: The Small-Square Lattice Z-Band in Rat Cardiac Muscle*, J Mol Biol (2015), DOI: [10.1016/j.jmb.2015.08.018](https://doi.org/10.1016/j.jmb.2015.08.018)
- Tamborrini et al., *Structure of the native myosin filament in the relaxed cardiac sarcomere*, Nature (2023), DOI: [10.1038/s41586-023-06690-5](https://doi.org/10.1038/s41586-023-06690-5)
- Dutta et al., *Cryo-EM structure of the human cardiac myosin filament*, Nature (2023), DOI: [10.1038/s41586-023-06691-4](https://doi.org/10.1038/s41586-023-06691-4)
- Yamada et al., *Cardiac muscle thin filament structures reveal calcium regulatory mechanism*, Nat Commun (2020), DOI: [10.1038/s41467-019-14008-1](https://doi.org/10.1038/s41467-019-14008-1)
- Irving et al., *Myofilament lattice spacing as a function of sarcomere length in isolated rat myocardium*, Am J Physiol Heart Circ Physiol (2000), DOI: [10.1152/ajpheart.2000.279.5.H2568](https://doi.org/10.1152/ajpheart.2000.279.5.H2568)

Later or secondary sources may clarify context, but they may not silently replace the primary evidence behind a quantitative or structural claim. Every conditional source must carry a visible tissue, isoform, state, evidence-class, and transfer-limit disclosure at its point of use.
