# Titin Showcase — SC-0 Design and Scientific Contract

**Status:** SC-0 implementation contract

**Reviewed:** 2026-08-02

**Machine-readable claim matrix:** `data/showcase_claims.json`

**Governing sequence:** `SHOWCASE_COMPLETION_PLAN.md`

This contract freezes the scientific and visual decisions that must be true before showcase UI or geometry work begins. It does not add a new titin model, change any biological coordinate, or make a cardiac variant of the application.

---

## 1. Scope lock

The application teaches broadly applicable titin concepts through its existing reference:

- species: *Homo sapiens*;
- sequence: UniProt `Q8WZ42`;
- model: canonical skeletal N2A-containing titin;
- state: named explicitly and kept independent from biochemical activation.

“Generic titin visualization” means that the guided narrative focuses on conserved roles—continuity, passive elasticity, scaffold organization, centering, anchoring, and qualified mechanosensory context. It does not mean that an isoform-free molecule exists.

The showcase will not add:

- a cardiac titin mode;
- an alternative-isoform mechanical solver;
- lab-specific branding or scientific positioning;
- automatic coupling between sarcomere length and activation;
- cardiac accessory-protein coordinates in the skeletal model.

Context from another tissue is allowed only when its source, state, compatibility, and transfer limit travel with the claim. A cross-tissue source cannot silently authorize geometry.

---

## 2. Admission decisions

### Z-disc

Admit a close-up of interdigitating antiparallel actin and α-actinin crosslinks. Its local network is based on the heterogeneous thin-form Z-disc measured in isolated fast mouse psoas myofibrils. The source interpreted this as a lower-strain form, but did not establish a universal state mapping.

The close-up may show a few measured α-actinin doublets at approximately 6 nm spacing. It must not repeat those doublets regularly across the complete disc.

Admit the measured palindromic telethonin complex topology: two antiparallel titin Z1Z2 fragments around one telethonin molecule. Mapping the isolated complex into the complete in-situ Z-disc remains schematic.

Do not show a universal small-square, basketweave, or alternating titin–actin zigzag. The actin/α-actinin network and titin/telethonin complex must remain distinguishable.

### Bare zone and M-band

The existing lattice-wide 160 nm translucent M-line block is scientific and visual debt scheduled for SC-3.

Its replacement separates three concepts:

1. **Bare zone:** a head-free thick-filament region, communicated primarily by myosin-head absence.
2. **Midpoint:** a narrow coordinate reference at the sarcomere center.
3. **M-band:** protein integration and crosslink context near the center, shown only through sparse evidence-coded relationships.

The 160 nm interval may label the current bare-zone extent. It may not become the width of a protein plate or of an M1 density.

Primary immunoelectron localization supports titin entering the M-band and the
organization of myomesin and M-protein around its lines. Those measurements
establish component relationships, but no source line coordinate is transferred
into the retained human reference. Mouse-psoas cryo-ET independently shows
pleomorphic M-band crosslinking density while explicitly leaving individual
protein identities unresolved.

The 2023 native cardiac M-band reconstruction is used only as a limitation source: M1 was absent from its averaged map, some protein density remained unresolved, and flexible links could average out. No coordinate from that reconstruction enters the retained model.

### MyBP-C

Admit MyBP-C as a Tier B, optional, off-by-default skeletal C-zone context layer.

The skeletal study supports:

- MyBP-C association with the C-zone;
- approximately three MyBP-C molecules in an approximately 43 nm repeat context;
- a thick-filament-bound C-terminal region;
- flexible or variably associated middle/N-terminal regions;
- regulatory effects on lattice and myosin-head state.

It does not support exact human-Q8WZ42-compatible coordinates. Therefore the renderer may use sparse yellow markers or flexible schematic paths, but must not show:

- imported cardiac cMyBP-C coordinates;
- a rigid identical bridge at every repeat;
- an exact stripe register or reach;
- obligatory thin-filament contact;
- direct titin contact inferred only from C-zone colocalization.

The titin A-band story must remain complete when MyBP-C is hidden.

### Thin-filament regulation

Defer troponin/tropomyosin and calcium-state geometry. It is scientifically legitimate but not necessary to explain titin and would redirect the guided experience toward a generic contraction lesson.

Any future admission requires:

- actual actin, tropomyosin, and troponin isoforms displayed;
- separate calcium and sarcomere-length state axes;
- structural movement rather than generic “active-site dots”;
- no effect on titin mechanics without a separately sourced coupling model.

### Expert-only titin context

Admit three qualified Evidence-mode cards:

- N2A as a structural and interaction hub, without invented partner coordinates;
- titin kinase/M-region identity, while leaving mechanosensory activation contested;
- titin tension and MyBP-C as proposed contributors to length-dependent thick-filament regulation, without an active-mechanics animation.

These cards do not become new geometry or state variables.

---

## 3. Visual grammar

The candidate identity palette is:

| Biological identity | Candidate color | Role |
|---|---:|---|
| Titin | `#F04D7A` | Primary narrative protein |
| Myosin/thick filament | `#55789F` | Subdued structural and motor context |
| Actin/thin filament | `#C68A45` | Subdued sliding-filament context |
| MyBP-C | `#E2BF45` | Optional accessory context |
| α-Actinin | `#38B8C8` | Z-disc crosslink context |
| M-band crosslinks | `#8D6BC3` | Central integration context |

These values are candidates, not release-approved colors. SC-8 must test text/control contrast, common color-vision simulations, grayscale, and the actual projector.

Four visual channels remain independent:

1. **Identity:** hue plus a direct name.
2. **Selection:** a same-family rim, outline, or luminance change; selection never recolors titin gold.
3. **Evidence:** text badge plus line/opacity treatment; evidence is never color-only.
4. **Uncertainty:** omission or a labeled uncertainty envelope; missing structure is not filled with decoration.

Additional rules:

- “SCHEMATIC” appears in text wherever an exact-looking path could be misunderstood.
- Leader lines and brackets must read as screen-space annotation, not molecular bonds.
- Direct labels attach to live biological anchors and move with the scene.
- A highlight may change appearance but never coordinates, evidence opacity, or scientific metadata.
- Titin remains the highest-salience protein in every Guided chapter.
- Presentation traces, brackets, labels, and halos are excluded from scientific bounding boxes and measurements.

---

## 4. Attention budget

Guided mode is constrained to:

- one primary biological target per chapter;
- at most three secondary context labels on desktop;
- at most two secondary context labels on mobile;
- one pinned tooltip;
- 25–45 words of main explanatory copy;
- one camera transition communicating one scientific change.

When titin is the target, context begins in a candidate 35–55% opacity range. Final values depend on projector and accessibility tests and may not override evidence styling.

Detail appears only where it answers the active question:

- Z-disc network and telethonin: Z-disc close-up;
- M-band crosslinks: M-band close-up;
- MyBP-C: A-band scaffold Evidence view;
- domain/repeat detail: only when resolvable;
- transverse spacing: dedicated orthographic lattice view.

MyBP-C and thin-filament regulation are off by default. A low-priority label is hidden before it is allowed to overlap, detach from its anchor, or obscure titin.

Reduced-motion mode must produce the same final biological state immediately. Animation is a communication device and never becomes a measured trajectory.

---

## 5. Claim and source contract

Every entry in `data/showcase_claims.json` records:

- unique object ID and display name;
- admission decision and release tier;
- audience and scientific claim;
- species/muscle/isoform/state scope;
- claim evidence class;
- render evidence class;
- source role, compatibility, and transfer limit;
- render encoding;
- explicit non-claims;
- source-asset policy.

Scientific claims resolve through `data/references.json`. Internal pipeline claims resolve to existing repository files. Cross-tissue and isolated-structure sources carry non-empty transfer limits.

The presentation layer may summarize a record but may not strengthen its evidence class. Where one object combines evidence levels, the visible object and tooltip report the weakest evidence relevant to the rendered property.

---

## 6. Source-asset and licensing contract

No attached reference illustration or paper figure is copied into the product.

The user-supplied illustrations and Wikipedia example are composition references only. New visual material must be procedural project geometry, project-authored overlay design, or an independently licensed asset recorded before use.

A citation permits discussion of a scientific claim; it does not grant permission to reproduce a figure. Any future source-derived asset requires a separate record containing license, attribution, transformation, and the exact file used.

---

## 7. SC-0 acceptance gate

SC-0 is complete only when all of the following are true:

- the claim matrix passes `scripts/validate_showcase_claims.py`;
- the canonical claim payload matches its reviewer-pinned SHA-256 digest;
- all external source IDs resolve in `data/references.json`;
- every admitted external source has complete, directly linkable citation metadata;
- all internal sources exist;
- every visual object has claim, scope, claim evidence, render evidence, source, render meaning, non-claims, and asset policy;
- the reference remains human skeletal N2A-containing Q8WZ42;
- no cardiac or alternate-isoform mode is admitted;
- MyBP-C remains optional and schematic;
- M1 density remains omitted;
- the universal Z-disc lattice icon remains omitted;
- thin-filament regulation remains deferred;
- source figures remain uncopied;
- the full repository verification suite passes.

The destructive negative-control suite must also reject scope changes, missing
objects, stronger evidence, source-transfer promotion, altered attention rules,
copied-source assets, missing primary M-band evidence, and incomplete citation
metadata for the specific semantic reason under test.

SC-0 authorizes SC-1 presentation-data and audience-shell work. It does not authorize SC-2/SC-3 biological geometry to bypass their own implementation tests.
