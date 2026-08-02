# Titin 3D Visualization — Master MVP Work Plan

## Objective

Build a scientifically defensible, interactive 3D educational visualization of titin at two scales:

1. **Sarcomere context view** — titin correctly positioned relative to the Z-disc, thin filaments, thick filaments, M-line, and repeating sarcomere architecture.
2. **Titin detail view** — isolated titin showing its major regions, domain architecture, approximate physical geometry, and structural changes as sarcomere length changes.

The goal is not atom-level completeness.

The goal is the simplest model that accurately preserves the known:

* topology;
* dimensions and relative scale;
* spatial arrangement;
* orientations and angles;
* attachment relationships;
* repeating geometry;
* mechanically meaningful structural changes.

Unknown structure must remain explicitly unknown rather than being invented.

## Completion Scope

For this repository's completed MVP, Phases 0–10 and Milestones 0–6 are the
required release scope. Phases 11–12 are retained below as optional future
extensions and were intentionally excluded from the completion requirement on
2026-08-02. This scope decision does not remove the continuous numerical,
scientific, source-integrity, and browser checks already included in the Phase 10
release gate.

## Showcase Completion Addendum

The completed MVP now has a separate, non-renumbering showcase sequence, SC-0
through SC-9. It improves presentation quality and expert auditability without
reopening Phases 0–10 or making optional Phases 11–12 part of the completion
requirement.

Governing records:

```text
SHOWCASE_COMPLETION_PLAN.md       reviewed work packages and release gates
SHOWCASE_DESIGN_CONTRACT.md       scope, admission, visual, and attention rules
data/showcase_claims.json         machine-readable claim and omission matrix
scripts/validate_showcase_claims.py  executable SC-0 contract gate
```

SC-0 was completed on 2026-08-02. It locks the existing human skeletal
N2A-containing Q8WZ42 reference while allowing a broad titin narrative. It does
not admit a cardiac titin mode, another isoform model, or a laboratory-specific
narrative. Cross-tissue context must retain its source scope and transfer limit.

The showcase implementation must preserve these boundaries:

- titin remains the primary visual and narrative subject;
- bare zone, sarcomere midpoint, and M-band crosslink context remain distinct;
- Z-disc detail is a scoped local topology, not a universal regular lattice;
- MyBP-C is optional, subordinate, and schematic unless compatible coordinates
  are independently established;
- troponin/tropomyosin regulation remains post-core optional work;
- presentation geometry cannot move biological anchors or strengthen evidence;
- source figures are not copied merely because their scientific claims are cited.

The next showcase package is SC-1: presentation data and the Guided/Evidence
audience shell. The detailed completion definition remains in
`SHOWCASE_COMPLETION_PLAN.md`.

---

# Core Architecture

The project should follow this pipeline:

```text
peer-reviewed evidence + structural databases
                    ↓
        scientific synthesis
                    ↓
machine-readable geometric specification
                    ↓
         procedural Three.js model
                    ↓
   interactive educational visualization
```

Supporting pipelines:

```text
PDB / mmCIF
    ↓
Python measurement and preprocessing
    ↓
primitive fit or lightweight structural proxy
    ↓
optional Blender inspection / cleanup
    ↓
GLB
    ↓
Three.js
```

The **scientific geometric specification**, not Three.js, Blender, or any individual model asset, is the source of truth.

---

# Phase 0 — Deep Scientific Research

Before significant visualization work, perform a dedicated research phase specifically optimized for building the 3D model.

Review the major peer-reviewed literature on:

* titin structure and domain organization;
* titin placement within the sarcomere;
* Z-disc, I-band, A-band, and M-line organization;
* thick- and thin-filament geometry;
* sarcomere lattice geometry;
* titin anchoring and protein interactions;
* titin mechanics across physiological sarcomere lengths;
* experimentally resolved titin domains and complexes.

Prioritize:

* highly cited foundational studies;
* primary structural studies;
* major cryo-EM, EM, tomography, crystallography, NMR, and related structural work;
* authoritative reviews from established researchers;
* recent work that materially revises older structural models.

Trace important quantitative claims back to primary sources whenever possible.

Do not treat review diagrams, AlphaFold predictions, inferred models, and experimentally resolved structures as equivalent evidence.

Explicitly document disagreements and unresolved questions.

---

## Research Questions

The research phase should determine, as accurately as current evidence permits:

### Sarcomere organization

* Where does titin physically run?
* What structures does it attach to?
* How is it arranged through the Z-disc, I-band, A-band, and M-line?
* How many titin molecules occur per relevant repeating sarcomere unit?
* What is known about longitudinal and transverse placement?
* What filament lattice geometry is established?
* What spacings, periodicities, symmetries, axial offsets, and repeating relationships are known?

### Titin architecture

Determine:

* major titin regions;
* domain sequence and organization;
* Ig and FnIII domain arrangements;
* PEVK organization;
* N2A/N2B regions as relevant;
* kinase and terminal regions;
* anchoring and interaction regions;
* experimentally resolved domains and complexes.

### Quantitative geometry

Extract every useful reported:

* length;
* width;
* contour length;
* end-to-end distance;
* aspect ratio;
* principal axis;
* angle;
* curvature;
* spacing;
* periodicity;
* orientation;
* copy number;
* attachment position;
* extension ratio;
* lattice relationship.

For every quantitative value record:

```text
value
unit
species
isoform
muscle type
biological state
experimental method
uncertainty / range
primary source
```

Do not silently combine incompatible measurements from different species, isoforms, muscle types, or experimental conditions.

### Mechanical behavior

Determine what is known across physiologically relevant sarcomere lengths:

* which titin regions change length;
* how domain spacing and orientation change;
* how PEVK and other extensible regions behave;
* how anchor positions move;
* what structural changes occur during normal contraction and extension;
* which events occur only under extreme experimental forces.

Do not represent rare domain unfolding as ordinary muscle contraction unless evidence supports that interpretation.

---

# Phase 1 — Scientific Geometric Specification

Convert the research into an explicit engineering model before building detailed graphics.

For every modeled component record, where applicable:

```text
id
name
biological role
parent structure

position
dimensions
orientation
principal axes

attachment points
relationships to neighboring structures
repeating geometry

domain sequence / count

mechanical behavior
state dependence

species
isoform
biological condition

evidence classification
primary references
notes / uncertainty
```

Use a consistent coordinate system:

```text
X = longitudinal sarcomere axis
Y/Z = transverse filament lattice plane
```

Use nanometers as the canonical scientific unit.

All important visualization parameters must be traceable to evidence or an explicitly documented modeling assumption.

---

## Evidence Classification

Every meaningful geometric claim should be classified as:

### MEASURED

Direct quantitative or experimentally resolved evidence.

### STRONGLY INFERRED

Not directly resolved but tightly constrained by multiple independent observations.

### MODELED

Computed by a named, executable law from declared inputs whose evidence classes are
MEASURED or STRONGLY INFERRED. A model output is not a direct observation and must
record its law, inputs, sources, solved quantity, and applicable caveat.

### INFERRED

A plausible interpretation supported by incomplete evidence.

### SCHEMATIC

A visualization choice introduced for communication.

### UNKNOWN

Insufficient or conflicting evidence.

The application should never imply that modeled, inferred, or schematic structures
are experimentally resolved.

---

# Phase 2 — Data Architecture

Recommended structure:

```text
/data
    sarcomere.json
    titin.json
    structural_states.json
    geometry_sources.json
    references.json

/assets
    /domains
    /complexes

/scripts
    parse_structure.py
    measure_structure.py
    fit_geometry.py
    generate_proxy.py
    validate_geometry.py

/src
    /model
    /geometry
    /viewer
```

The renderer should consume the scientific specification rather than contain biological constants in application code.

---

# Phase 3 — Geometry Strategy

Use the simplest geometry that preserves scientifically meaningful structure.

Available primitives should include:

```text
sphere
ellipsoid
capsule
cylinder
cone
curve / spline
tube
plane
Platonic solid
other low-poly polyhedron
custom fitted mesh
```

Use Platonic solids where they genuinely approximate observed geometry.

Do not force proteins into Platonic forms merely for visual consistency.

Priority should be given to preserving:

```text
topology
scale
dimensions
aspect ratio
principal axes
angles
curvature
spacing
orientation
attachment geometry
periodicity
mechanically meaningful movement
```

Surface polygon accuracy is secondary.

Where literature reports mathematical or geometric relationships, encode them explicitly rather than approximating them visually by eye.

---

# Phase 4 — Titin Representation

Represent titin hierarchically.

## Level 0 — Backbone

Represent the known or inferred titin path with scientifically defined 3D curves.

The backbone controls positioning but should not imply that the real molecule is literally a smooth tube.

## Level 1 — Domain Architecture

Place repeated domain representations along the backbone according to the known sequence and organization.

Potential component classes include:

```text
Ig-like domain
FnIII domain
PEVK region
N2A / N2B region
flexible linker
kinase region
terminal / anchoring region
```

Each domain instance should contain:

```text
domain ID
sequence position
domain class

position
orientation
scale

geometry archetype

evidence classification
source
```

## Level 2 — Structural Proxies

For important experimentally resolved structures, substitute lightweight geometry derived from the real structure.

## Level 3 — Molecular Reference

Keep original PDB/mmCIF structures as offline validation assets.

Full molecular structures do not need to load in the production browser visualization.

---

# Phase 5 — Repeated Domain Strategy

Do not create unique high-resolution geometry for every titin domain.

Instead:

1. identify meaningful structural domain classes;
2. select representative experimental structures;
3. create one or a small number of lightweight archetypes per class;
4. instance them throughout titin;
5. apply individual position, orientation, scale, and spacing where evidence supports differences.

Conceptually:

```text
representative experimental structure
                ↓
      validated archetype
                ↓
       Three.js InstancedMesh
                ↓
individual scientifically defined transforms
```

Most structural information should live in the arrangement and transforms, not in excessive mesh complexity.

---

# Phase 6 — PDB / Structural Data Pipeline

Treat PDB/mmCIF files as scientific source data rather than default runtime assets.

For each relevant structure:

```text
PDB / mmCIF
      ↓
identify relevant biological assembly
      ↓
extract required chain / domain / complex
      ↓
preserve biological coordinates and scale
      ↓
measure dimensions and principal axes
      ↓
identify major bends and interaction geometry
      ↓
choose simplest appropriate representation
      ↓
validate approximation
      ↓
export lightweight asset if required
```

Possible representations:

```text
fitted ellipsoid
fitted capsule
primitive composition
Platonic / polyhedral approximation
low-poly hull
decimated molecular surface
custom low-poly proxy
```

The chosen representation should preserve the scientifically important geometry.

A very large molecular structure may ultimately contribute only a small proxy asset or a set of fitted geometric parameters.

---

# Phase 7 — Sarcomere Context Model

Build the initial sarcomere directly in Three.js.

Use approximately:

```text
cylinders       → thick and thin filaments
simple meshes   → Z-disc and M-line structures
curves / tubes  → representative titin paths
InstancedMesh   → repeated domains and filaments
```

Start with one clear longitudinal sarcomere.

Then add enough neighboring structures to communicate genuine 3D organization.

Add detailed transverse lattice geometry only when:

1. the geometry is scientifically defensible; and
2. it materially improves understanding.

Do not add complexity solely for visual richness.

---

# Phase 8 — Mechanical Model

Do not implement molecular dynamics for the MVP.

Define a small set of literature-supported reference states, ideally:

```text
contracted
resting
stretched
```

Also expose a continuous parameter such as:

```text
sarcomereLength
```

Changing this parameter should recompute:

```text
sarcomere geometry
        ↓
anchor positions
        ↓
titin backbone paths
        ↓
region-specific extension
        ↓
domain positions
        ↓
domain orientations and spacing
```

Do not uniformly scale titin.

Different regions should respond according to their experimentally supported mechanical behavior.

Folded domain meshes should normally remain rigid unless evidence supports a specific conformational change.

Smooth visual interpolation may occur between scientifically defined states, but interpolation must not be presented as directly measured molecular motion.

---

# Phase 9 — Primary Implementation Stack

## Three.js + TypeScript-checked JavaScript

Use Three.js as the primary visualization and procedural geometry engine.

The implementation uses native ES modules with JSDoc types and runs the complete
production source tree through strict TypeScript analysis. This preserves direct
browser modules while satisfying the phase's static-type boundary; test fixtures
remain runtime-checked because they intentionally construct invalid shapes.

Use it for:

* procedural sarcomere construction;
* titin path generation;
* instanced domain geometry;
* structural state updates;
* browser interaction;
* annotations;
* educational controls.

The core API should use biological concepts rather than raw rendering operations:

```text
createSarcomere(...)
createTitin(...)
createTitinPath(...)
createDomainChain(...)
placeDomainsAlongPath(...)
setSarcomereLength(...)
setStructuralState(...)
```

Keep low-level Three.js implementation behind these abstractions.

## Python

Use Python for:

* PDB/mmCIF parsing;
* measurements;
* coordinate analysis;
* principal-axis calculations;
* primitive fitting;
* structural simplification;
* scientific data generation;
* numerical validation.

## Blender

Use Blender only where it provides clear additional value:

* inspecting complex molecular structures;
* simplifying or cleaning a difficult structural proxy;
* comparing proxy geometry visually against a source structure;
* producing high-quality offline renders.

Blender should not be required to build, run, or modify the core MVP.

---

# Phase 10 — Browser Experience

The MVP should support:

* orbit, zoom, and pan;
* sarcomere context view;
* isolated titin detail view;
* smooth navigation between scales;
* contracted/resting/stretched presets;
* continuous sarcomere-length control;
* structural labels;
* titin-region highlighting;
* component visibility controls;
* optional evidence/confidence display.

The interface should prioritize scientific comprehension over visual spectacle.

---

# Phase 11 — Validation

Validation should be continuous and partly automated.

## Numerical checks

Validate where applicable:

```text
distances
angles
domain counts
relative lengths
attachment coordinates
filament spacing
principal orientations
periodicity
sarcomere dimensions
state-dependent changes
```

## Proxy validation

For simplified experimental structures, compare against source data:

```text
bounding dimensions
aspect ratios
principal axes
major bends
attachment / interaction positions
```

## Standard visual validation views

Automatically generate consistent views of:

```text
longitudinal sarcomere
transverse sarcomere
isolated titin
major attachment regions
contracted state
resting state
stretched state
```

These should make geometry errors easy to identify.

---

# Phase 12 — AI-Assisted Engineering Workflow

Claude Code or Codex may accelerate implementation but must not act as the authority for scientific structure.

Recommended loop:

```text
scientific specification
        ↓
agent implements model
        ↓
deterministic browser render
        ↓
automated screenshots
        ↓
visual inspection
        ↓
numerical validation
        ↓
revision
```

Agents should work through the constrained biological geometry API wherever possible.

No geometry should enter the authoritative model solely because an AI-generated result looks plausible.

---

# MVP Delivery Sequence

## Milestone 0 — Research package

Deliver:

* rigorous scientific synthesis;
* quantitative geometry extraction;
* structural database inventory;
* uncertainty analysis;
* source bibliography.

## Milestone 1 — Geometric specification

Deliver machine-readable:

```text
sarcomere.json
titin.json
structural_states.json
geometry_sources.json
references.json
```

## Milestone 2 — Schematic browser model

Implement:

```text
Z-disc
M-line
thick filaments
thin filaments
representative titin path
```

Success criterion:

A viewer immediately understands where titin sits within a sarcomere.

## Milestone 3 — Titin domain architecture

Add:

* major regions;
* repeated domain archetypes;
* scientifically defined positioning and orientation.

Success criterion:

The isolated titin view communicates its organization and approximate physical structure without atom-level complexity.

## Milestone 4 — Experimental structural proxies

Replace simple geometry selectively where PDB-derived structure materially improves scientific fidelity.

## Milestone 5 — Mechanical states

Implement:

```text
contracted
resting
stretched
continuous sarcomere-length control
```

with region-specific deformation.

## Milestone 6 — Educational interface and polish

Add:

* annotations;
* visibility controls;
* context/detail navigation;
* evidence indicators;
* final performance optimization.

---

# Explicitly Defer

Do not spend MVP effort on:

```text
full atomistic titin rendering
molecular dynamics
unique molecular models for every repeated domain
full muscle-fiber simulation
photorealistic molecular surfaces
real-time physical simulation
browser-hosted Blender
manual construction of authoritative scientific geometry
AI-invented missing structures
```

---

# Final Design Rules

### 1. Evidence first

No important geometry should exist without either:

```text
a scientific source
or
an explicit documented visualization assumption
```

### 2. Preserve meaningful geometry, not polygons

Use the simplest representation that preserves the important structure.

### 3. Keep science separate from rendering

The durable artifact is the scientific geometric specification.

Three.js is the renderer.

Python is the scientific tooling layer.

Blender is an optional asset workshop.

### 4. Represent uncertainty honestly

Measured, inferred, schematic, and unknown structures must remain distinguishable.

### 5. Optimize for understanding

For every visual element ask:

**What scientifically meaningful information does this geometry encode?**

If the answer is nothing, simplify or remove it.
