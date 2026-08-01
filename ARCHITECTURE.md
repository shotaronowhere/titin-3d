# Titin Visualization — Completed Architecture (Phases 0–9)

**Governing principle (MASTER_PLAN Phase 2):** *the renderer consumes the
scientific specification rather than containing biological constants in
application code.* Five canonical specification records are the **single source
of truth**; additional JSON records contain derived strategy, mechanics, and
coordinate measurements. No module in `src/` hardcodes a biological number that
belongs in the specification.

## Directory layout

```
data/                      canonical spec + derived scientific records
  sarcomere.json, titin.json, structural_states.json
  geometry_sources.json, references.json
  geometry_strategy.json, mechanical_model.json
  structure_measurements.json, interdomain_measurements.json
  context_measurements.json
  structures/manifest.json  URLs, SHA-256 pins, and byte sizes for raw inputs

scripts/                   reproducible structural pipeline and validators
  fetch_structures.py       fetches/verifies all byte-pinned raw inputs
  parse_structure.py        Gemmi parser; polymer-only, alternate-conformer safe
  measure_structure.py      coordinate measurement primitives
  measure_structures.py     canonical multi-entry measurements
  fit_geometry.py           validated capsule/ellipsoid fitting adapter
  generate_proxy.py         deterministic procedural-proxy descriptor writer

src/                       spec-consuming model, API, geometry, and renderer
  model/                    loading, provenance, public model boundary
  geometry/                 mechanics, representation, lattice, context detail
  api/                      supported headless and browser biological facades
  render/                   Three.js scene and interactive viewer

test/                       phase, renderer, API, and standalone guards
```

## Data flow

```
canonical spec + derived measurements ─▶ Spec (validated) ─▶ TitinModel
   ├─ GeometryEngine                 ▶ filament landmarks + common-force titin
   ├─ Strategy/Representation        ▶ primitives and domain transforms
   ├─ LatticeGeometry/ContextDetail  ▶ transverse and periodic context
   ├─ Provenance/Annotations         ▶ evidence, sources, caveats, anchors
   └─ TitinVisualization             ▶ supported Three.js/browser facade
```

## Contract the viewer relies on

- `TitinModel.create(reader)` → loads and **validates** the spec (throws on any
  integrity/numerical failure — the app refuses to render a bad spec).
- `model.geometryAt(sl_nm)` → half-sarcomere geometry inside the supported
  1900–3000 nm range. Filament landmarks interpolate between defined states;
  titin's elastic regions are re-solved at one common series force. Guarantees:
  - **thick filament (A-band) length is invariant** across all SL;
  - **titin extension stays confined to the I-band** (span == I-band width);
  - **titin is never uniformly scaled** — nonuniform recruitment emerges from
    the cited mechanics; keyframe partitions remain an explicit audit mode;
  - **lattice d10** follows the constant-volume law computed at the exact SL
    (labelled quasi-static idealization).
- `model.geometry.checkForbidden(geom)` → returns violations of the spec's
  forbidden-depiction rules; empty = valid. The renderer can assert this per frame.
- `model.provenance.*` / `model.unknowns()` → back the evidence-indicator and
  honest-uncertainty UI (Phase 10). `forParameter(component, name)` accepts either
  a component id (`thick_filament`) or the geometry_sources human name
  (`Thick filament`) and matches the parameter name tolerantly; a lookup **miss**
  returns `{found:false, available:[...]}` and is deliberately NOT reported as
  `UNKNOWN`, so a missing key can never be mistaken for a spec-declared genuine
  unknown. `listParameters()` / `parametersFor(component)` enumerate valid names.

## Phase 3 — Geometry Strategy layer

`data/geometry_strategy.json` maps each biological element to the **simplest
primitive that preserves its scientifically meaningful structure** (topology,
scale, aspect ratio, axes, spacing, periodicity — surface polygon accuracy is
secondary). It is a **derived** layer, not one of the five source-of-truth files:
it *references* spec parameters (by source param + DOI) rather than restating
numbers, and is validated against the spec at load (coverage of every component
and region, primitives drawn from a declared vocabulary, every cited param/DOI
resolves, evidence labels reduce to a plan class). Absence of the file is not a
spec failure — the strategy layer is optional.

- **Primitives are not Platonic solids by default.** Ig/Fn3 folds → `capsule`
  (~4 nm axial, MEASURED; lateral width SCHEMATIC — not resolved in the spec).
  Filaments → `cylinder`; Z-disc/M-line → `box` (plane normal to X); lattice →
  `lattice_rule`; the single kinase domain → `ellipsoid`.
- **Assembly by mechanical class, not appearance.** Folded regions
  (`prox_Ig`, `dist_Ig`, …) are `instanced_repeat` — N capsules that *straighten*
  along the widening span. `PEVK` is a variable-length disordered path. `N2A`
  is a `composite_spring`: one declared rigid Ig-like fold in series with a
  variable-length WLC path, without inventing residue-level placement.
- **Geometric relationships are encoded explicitly, not eyeballed**: myosin crown
  periodicity (14.3 / 43.1 nm), the 11-domain / 45.5 nm A-band super-repeat,
  the d10(SL) constant-volume law, and the Ig axial:lateral aspect — each with its
  source param and DOI.
- `model.sceneAt(sl_nm)` → renderable primitive descriptors (position/axis/length +
  `preserves` / `not_claimed` + per-claim evidence) the viewer instantiates.
- `model.verifyScene(scene)` → `{errors, notes}`. `errors` are hard invariant
  violations (A-band length invariant, titin-span == I-band half-width,
  disordered ≠ folded). `notes` record known modelling caveats.

### Z-disc anchoring convention (resolved in the spec layer)

The elastic tandem-Ig spring emerges at the **Z-disc periphery**, not the Z-disc
centre: Z1Z2 is anchored within the Z-disc lattice (telethonin/T-cap), occupying
the Z-disc half-width. The free I-band extension therefore spans **Z-disc edge →
thick-filament tip**, i.e. its length is

```
elastic titin span = I-band half-width − Z-disc half-width
```

and the distal Ig lands **exactly at the A-band tip** at every sarcomere length.
This is enforced identically in all four layers — the spec keyframes
(`structural_states.json`, `titin.json`), `GeometryEngine.checkForbidden`,
`SpecLoader` validation, and the Python `validate_geometry.py` — and tested in
`dataLayer.test.js`. `I_band_half_width_nm` itself is unchanged (it is the standard
Z-centre → A-tip anatomical measure); only the *elastic titin budget* is the
edge-corrected span. (Earlier drafts summed the extension to the full I-band
half-width while laying it from the Z-disc edge, pushing the distal Ig ~25 nm past
the A-band tip; that offset is now removed at the spec layer.)

**Evidence class:** the anchoring topology (Z1Z2 in the Z-disc, elastic Ig into the
I-band) is STRONGLY INFERRED from titin Z-disc structure; the Z-disc half-width
itself is a SCHEMATIC/approximate dimension, so the correction is encoded as
"elastic region begins at the Z-disc boundary," not as an exact-to-the-nm claim.

## Running

```
npm run verify                         # complete release gate
npm run check:structures               # verify optional raw-source cache
npm run serve                          # then open http://localhost:8000/
```

The viewer is `index.html` at the package root. It loads `three` through an
import map from `node_modules`, with no bundler, so the code running in the
browser is byte-identical to the code the test suite verifies. Any static server
works; a `file://` open will not, because ES module imports require HTTP.

## Phase 4 — Titin Representation (hierarchical)

`src/geometry/TitinRepresentation.js`, exposed through `TitinModel`:

| Level | Call | Content |
|---|---|---|
| 0 Backbone | `backboneAt(sl)` | Control-point path Z-disc centre -> M-line centre. `render_as_tube: false` — the backbone positions geometry but must not be drawn as a smooth solid tube. |
| 1 Domains | `domainInstancesAt(sl)` | 287 records: 285 folded domains plus N2A and PEVK disordered paths; every record carries the mandated fields. |
| 2 Proxies | `structuralProxies()` | Measured procedural proxies for Ig-like, Fn3, and kinase, each backed by multiple byte-pinned PDB entries and enclosure checks. |
| 3 Reference | `molecularReference()` | `load_in_browser: false` — full PDB/mmCIF stay offline validation assets. |

`verifyRepresentation(sl)` enforces chain continuity, the M-line terminus, the
Level-1 field set, and the two forbidden depictions below.

### Straightening, not stretching

The folded contour exceeds the available span throughout the physiological range
(proximal Ig: 77 x 4 nm = 308 nm of folded domains in an 81-279 nm span). Domains
are therefore placed by **axial rise** and **tilted**, never scaled: `scale` is
always 1. `cos(tilt) = rise / folded_length`. At the physiological maximum the
distal Ig reaches exactly 4.000 nm/domain (0 deg tilt) — fully straightened,
never unfolded.

`rise > folded_length` is interpreted by `mechanical_class`, not globally:

* `anchored` (Z1Z2, A-band, M-line) — the excess is inter-domain linker set by the
  binding partner's periodicity; recorded as `interdomain_linker_nm`. Real
  architecture, not deformation.
* `extensible_straighten` (prox_Ig, dist_Ig) — excess would mean the fold itself
  lengthened, i.e. **Ig unfolding**, a forbidden depiction. Flagged as an error.

### A-band zoning

A-band titin is placed by the MEASURED super-repeat periodicity rather than by
even division: C-zone = 11 super-repeats x 11 domains = 121 domains over
11 x 45.5 = 500.5 nm; the remaining 58 domains occupy the tip-proximal D-zone.

### Honest gaps

* Azimuth about the thick filament is UNKNOWN; rendered on-axis as SCHEMATIC.
* Per-position Ig/Fn3 **order** within mixed regions is not resolved in the spec.
  Counts are honoured exactly; the render order is an arbitrary tie-break, marked
  per instance in `domain_class_evidence` — not a sequence claim.
* `sequence_position` divides each region's residue span evenly across its domain
  count (`evidence_class: INFERRED`).

### Phase-4 review (session 8) — two-axis evidence on domain instances

Each instance now carries **two independent evidence claims**, never conflated:

| Field | Question it answers |
|---|---|
| `domain_evidence_class` | How well is the domain's own **size** known? |
| `placement_evidence_class` | How well is its **axial spacing** known? |
| `evidence_class` | The conservative **floor** of the two (`_weakest`) |

A MEASURED domain size does not license a MEASURED placement. `_weakest` ranks
UNKNOWN < SCHEMATIC < INFERRED < MODELED < STRONGLY INFERRED < MEASURED and
returns the lesser; an unrecognised label ranks as INFERRED, never as MEASURED.

**MODELED** (added session 9) is the only class whose values are *computed*
rather than observed: a quantity produced by an explicit physical law, cited to
primary literature, whose every parameter is itself MEASURED or STRONGLY
INFERRED and none of which was fitted to the value being produced. It ranks
*below* STRONGLY INFERRED — a derived consequence is not an observation — and
carries preconditions no other class needs, all validator-enforced: the record
must declare `model_basis` (the law + its source) and `modeled_from` (the class
of every input), and if any input is weaker than STRONGLY INFERRED the value
takes that weaker class with MODELED demoted to a parenthetical qualifier. This
prevents modelling from laundering confidence upward. Its render opacity (0.87)
sits between INFERRED (0.82) and STRONGLY INFERRED (0.92) so the ladder stays
monotone on screen. Sole current use: the I-band extension partition.

**Modelled values inherit the isoform scope of their parameters.** The chain
parameters are rat psoas; this spec is human canonical Q8WZ42 with a much longer
PEVK. Fractional extension `z/Lc` is a function of force alone, hence
isoform-independent; *absolute* force is not (predicted force at SL 3.0 um runs
10.4 -> 67.2 pN as PEVK contour falls 542 -> 240 nm). Agreement in pN with a
psoas measurement is therefore recorded as a cross-isoform *plausibility check*,
never as validation.

**A-band zoning is evidentially asymmetric.** `geometry_sources.json` records a
super-repeat periodicity for the **C-zone only** (11 x 11 domains @ 45.5 nm).
The tip-proximal **D-zone has no sourced periodicity**: its 58 domains are spread
evenly across the leftover 119.5 nm, which yields ~2.06 nm rise (59 deg implied
tilt). That spacing is a *rendering choice*, marked SCHEMATIC — it must not be
read as a measured structural claim, and the viewer should not present D-zone
tilt as evidence of anything.

Effective evidence by group (resting):

| Group | Effective class |
|---|---|
| C-zone | MEASURED |
| Z1Z2, prox_Ig, dist_Ig, Mline | INFERRED (uniform division of a sourced span) |
| D-zone, kinase | SCHEMATIC |
| N2A fold placement / N2A coil / PEVK | INFERRED / UNKNOWN / UNKNOWN |
| I-band extension partition | MODELED (series force balance) |

**Instance shape is uniform.** All three construction paths (folded repeat,
single copy, disordered chain) emit the same field set — no `undefined` anywhere,
so consumers can group by `mechanical_class` without special-casing. Disordered
regions report `axial_rise_nm`/`interdomain_linker_nm` as `null`
(**inapplicable** — no folded unit), which is distinct from `0` (measured as zero).

### Phase-4 completion check (session 8) — plan conformance

Verified against the plan's Phase 4 text directly (lines 328-382), not from memory:

| Plan requirement | Status |
|---|---|
| L0 backbone, 3D curve, not implying a smooth tube | `backboneAt(sl)` — 9 points / 8 segments, `render_as_tube: false` |
| L1 domains placed along the backbone by sequence/organisation | `domainInstancesAt(sl)` — 287 records |
| L1 instance fields (9 mandated) | required fields present on all 287, no `undefined` |
| L2 lightweight geometry from resolved structures | measured procedural proxies for Ig-like, Fn3, and kinase |
| L3 PDB/mmCIF kept offline, not browser-loaded | `molecularReference()` — `load_in_browser: false` |

**Component-class vocabulary.** `domain_class` names the **fold**, not the mechanical
role. Two plan-listed classes are deliberately never emitted:

- `terminal_anchor` — Z1/Z2 and M-line M-domains are real Ig folds, emitted as
  `Ig_like`; their anchoring role is carried by `mechanical_class: 'anchored'`.
  Emitting them as `terminal_anchor` would discard fold identity to restate a role
  already recorded on another axis.
- `flexible_linker` — no region is typed as a standalone linker; inter-domain
  spacing in bound regions is per-instance `interdomain_linker_nm`.

`N2B` is absent because this model is the skeletal **N2A** isoform (Q8WZ42);
cardiac N2B/N2BA is out of scope per `sarcomere.json.isoform_reconciliation`.
A test locks the fold/role separation so a reclassification cannot happen silently.

## Phase 5 — Repeated Domain Strategy

`src/geometry/InstancingPlan.js`. Turns Level-1 domain instances into
**InstancedMesh-ready batches**: one shared archetype + N per-instance transforms.
Emits no meshes and imports no renderer — Three.js consumes this, not the reverse.

    representative experimental structure -> validated archetype
      -> InstancedMesh -> individual scientifically defined transforms

**287 records collapse to three archetype batches** (Ig_like 152, Fn3 132,
kinase 1) plus two non-instanced variable-length paths (`N2A.chain` and
`PEVK.chain`). The N2A Ig-like fold is batched; its coil is not.

### Step 2 — representative structures (selected, NOT measured)

| archetype | PDB | res (A) | Q8WZ42 span | note |
|---|---|---|---|---|
| `Ig_like` | 3PUC | 0.96 | 33774-33871 | titin M7; highest-res single human titin Ig |
| `Fn3` | 8OMW | 1.05 | 16525-16630 | titin Fn3-20; lies in `Aband_super` |
| `kinase` | 1TKI | 2.00 | 32172-32492 | autoinhibited kinase domain |

Selected from UniProt Q8WZ42's 64 PDB cross-references by criteria fixed in advance
(human only; fold class from Pfam, never from the title; titin as subject not as an
incidental complex component; single domain preferred; wild-type only). Provenance,
rejected candidates and caveats live in
`geometry_strategy.representative_structure_selection`.

At the Phase-5 selection point these were identity claims only. Phase 6 then
downloaded byte-pinned coordinate inputs, measured multiple independent entries,
and fitted/validated the procedural envelopes. Current batches therefore report
`geometry_derived_from_coordinates: true`; Ig/Fn3 axial lengths intentionally
remain the reviewed literature value while lateral geometry is coordinate-derived.

### Archetype resolution is per DOMAIN CLASS, not per region

A defect fixed here: `unit_archetype` is a *region* property, but `Aband_super` is
mixed (47 Ig_like + 132 Fn3). Region-level resolution drew all 179 with the **Ig**
exemplar and left the `Fn3` archetype permanently unreachable — the same dead-vocabulary
problem closed for `DOMAIN_CLASSES` in Phase 4. `_archetypeFor()` now resolves per
instance. Because Ig_like and Fn3 carry the same 4.0 nm axial length from the same
source, the fix was a **pure relabel**: instance position sums are unchanged
(Sx = 127200.550 at SL 2200). A guard throws if a future archetype's axial length
ever diverges from the zone `unit` used to compute rise and tilt.

### Azimuth: forced by chain continuity, still SCHEMATIC

Level 1 reports tilt but leaves `azimuth_deg` null — genuinely UNKNOWN. A renderer
must pick one, and the pick is not free:

* **constant azimuth** — all domains lean the same way, so the chain walks off axis:
  77 prox_Ig domains x 4.0 nm x sin(50.7 deg) ~ **238 nm** of transverse drift inside a
  ~1100 nm half-sarcomere. Physically impossible.
* **alternating 0/180 deg** — consecutive domains lean opposite ways; amplitude
  (L/2)sin(tilt) ~ 1.5 nm and the junction gap is **exactly zero**, because
  L cos(tilt) equals the axial rise by construction.

So the alternation is *forced*, not cosmetic. It remains SCHEMATIC: it claims chain
continuity and no net drift, and does **not** claim any domain's true azimuth.
Parity comes from the domain's index **within its region**, not within the batch —
batch order interleaves regions and would break the zig-zag at region boundaries.
Untilted domains carry `azimuth_deg: null` (the rotation is degenerate at tilt 0).

### Continuity guard couples geometry to evidence

`junctionContinuity(sl)` reconstructs both end points of every domain in 3D and
compares each junction gap to the inter-domain linker the model already reports.
All folded-domain junctions now fit their linker budgets at every supported state.
The former 1.580 nm `Aband_super.58 -> .59` D/C seam was removed by constructing a
connected schematic D-zone: an even set of paired tilted domains followed by two
untilted terminal domains that meet the measured, untilted C-zone. D-zone placement
remains SCHEMATIC; continuity is a topological requirement, not an evidence upgrade.

Tests 51 -> **59**. Validator 143 -> **163** checks. 6 Phase-5 negative controls
(`scripts/neg_control_phase5.mjs`) each trip their target guard; 3 validator negative
controls verified and the strategy file restored identical.

### Phase-5 review (session 9) — two guard defects found and fixed

**Defect 1 — a declared domain was silently undepicted.** `titin.json` declares
`N2A.domain_composition.Ig_like = 1` with evidence **MEASURED**, but N2A's assembly
strategy is `tube`, whose own rationale says "NO folded domains — disordered". So one
MEASURED domain never reached the renderer, and nothing detected it. Worse, my own
Phase-5 validator check exempted N2A **by name** (`_zero <= _nofold | {"N2A"}`) — the
escape hatch was hiding precisely this.

The tension is inherited from a *partition* choice, not a measurement error: the
literature's "N2A element" is Ig80-Ig83 plus UN2A, so it straddles this spec's
`prox_Ig` (801-9851) / `N2A` (9852-10215) boundary. All 77 proximal Ig domains are
assigned to `prox_Ig`, where they *are* instanced, leaving N2A's declared Ig count
with nothing inside its own span to place.

The completion repair preserves the reviewed boundary and count: N2A is now a
`composite_spring` containing one generic Ig-like fold plus one WLC coil. Its
region-internal residue order remains explicitly unresolved, so the placement is
INFERRED rather than presented as coordinate-resolved. `declaredVsInstanced(sl)`
now reports no N2A shortfall, and the validator verifies the composite rule instead
of exempting N2A by name.

**Defect 2 — the azimuth guard was checked per batch, not per region.** A batch spans
several regions, so forcing one whole region to a constant azimuth still left two
distinct values in the batch and the guard reported **zero** azimuth errors. The
continuity guard did catch it (76 chain-break errors), so nothing was silently wrong —
but guard #6 did not do what its message claimed. Now grouped per region, which is the
scale at which the chain must stay on axis; the negative control that previously
produced 0 azimuth errors now produces 1.

Tests 59 -> **62**. Validator 163 -> **168** checks. Negative controls 6 -> **8**.
Geometry **byte-identical** at all four states (Sx 91988.650 / 127200.550 /
150968.150 / 212806.750) — this review changed guards and evidence records, not a
single coordinate.

## Phase 6 — PDB / Structural Data Pipeline

`scripts/measure_structures.py` → `data/structure_measurements.json` →
`scripts/adopt_measurements.py` → spec → `src/geometry/StructuralProxies.js` (level 2).

Treats mmCIF as scientific **source data**, not a runtime asset. Nine steps, per
the plan: assembly → chain → biological coordinates → dimensions/principal axes →
bends and interaction geometry → primitive choice → approximation validation →
export only if required.

### Entries measured

| class | entries | independent | chains fitted |
|---|---|---|---|
| Ig_like | 3PUC, 5JDJ, 1TIT | 3 | 18 |
| Fn3 | 8OMW, 8OT5 | 2 | 7 |
| kinase | 1TKI, 4JNW | 2 | 4 |

Alternates were recorded in Phase 5 specifically so Phase 6 could test whether
folded geometry is region-invariant. It is: 5JDJ alone contributes 16 copies of
the Ig fold from a different region of the molecule, clustering tightly
(long-axis SD 0.240 nm). Crystallographic copies are reported separately from
independent entries and never inflate *n*.

### Mapping validation

Every chain is aligned to Q8WZ42 rather than trusted from SIFTS. This caught
two things a numbering-only approach would have missed:

- **Expression-tag remnants.** 3PUC begins `GP…`, 8OMW `S…`, 5JDJ `GAM…`. SIFTS
  and the UniProt cross-reference are both off-by-one for these. Tag residues are
  excluded from every fit, so dimensions describe the domain, not the construct.
- **A real sequence variant.** 1TIT residue 3 is GLU where canonical Q8WZ42 has
  LYS at 12679. RCSB reports `rcsb_mutation_count 0`, so it is not an annotated
  engineered mutation — 1TIT is a 1996 NMR structure predating the current
  canonical sequence. Registered in `DOCUMENTED_VARIANTS`; an *undocumented*
  internal mismatch is a hard validator failure, because it may mean a
  mis-registered chain.

Two identity metrics, deliberately separated — the original single `identity_frac`
(matches ÷ full observed length) conflated them and made a clean structure with a
longer tag look like a sequence mismatch:

- `core_identity_frac` — matches across the contiguous mapped span. *Did we
  measure the right protein?* Must be ≥0.98.
- `native_residue_frac` — mapped ÷ observed. *How much of what we observed is
  titin?* Must be ≥0.90.

### What was adopted, and what was not

`scripts/adopt_measurements.py` is deliberately narrow and idempotent. **A
measured number may only be adopted where it cannot silently overwrite a
reviewed, literature-sourced value that drives layout.**

| value | before | after | why |
|---|---|---|---|
| `lateral_diameter_nm` Ig / Fn3 / kinase | 2.0 / 2.0 / 3.0, **SCHEMATIC** | 2.636 / 3.216 / 4.660, MEASURED | render-only placeholder; a strict evidence upgrade |
| `axial_length_nm` kinase | *absent* | 4.531 (N-to-C) | every kinase instance emitted `folded_length_nm: null` |
| `axial_length_nm` Ig / Fn3 | 4.0, literature | **unchanged** | see below |
| `aspect_ratio_axial_lateral` | derived from the placeholder | recomputed | would otherwise be internally inconsistent |

Ig/Fn3 axial length stays at 4.0 nm (10.1016/j.jmb.2020.06.025) for four reasons:
it drives layout globally (rise, tilt, every coordinate); the measurements do not
contradict it (4.0 nm lies 1.03 SD and 1.30 SD from the measured means); 2–3
independent entries is too thin to overturn a reviewed value, and crystallographic
terminal disorder biases N-to-C upward (3PUC's extended N-terminal tail gives
5.17 nm against a 4.13 nm median over 16 copies of 5JDJ); and Ig measures
4.319 while Fn3 measures 4.419, so adopting both would break the Phase-5 invariant
that the two share **one** axial length.

**Geometry invariance is the check that proves this.** Domain-position fingerprints
are byte-identical before and after adoption at all four canonical states
(SL 1900/2200/2400/3000 → Sx 91988.650 / 127200.550 / 150968.150 / 212806.750).
The only behavioural change at adoption time was `folded_null` 3 → 2: the kinase's
null was filled, leaving null folded lengths only on the PEVK path and N2A's coil
subcomponent. N2A now also carries its separately batched generic Ig component.

### Representation choice (plan step 7) and why no mesh ships

- **Ig_like → capsule.** 98.8% heavy-atom enclosure; N-to-C within 8.4° of the
  long axis, so a chain-aligned capsule is faithful.
- **Fn3 → capsule.** 98.2% enclosure; measurably wider cross-section than Ig.
- **kinase → ellipsoid.** Its N-to-C vector lies **42.7° off its own longest
  principal axis** — the long axis is *not* the chain direction (contour 122 nm
  against a 4.5 nm N-to-C separation). So the ellipsoid marks **size and position
  only**; its rotation about the sarcomere axis stays UNKNOWN and is listed in
  `not_claimed`. The axial length adopted is the N-to-C extent, never the 6.65 nm
  long axis.

No GLB export. Every fitted primitive is fully described by three or four numbers,
so level 2 publishes **procedural parameters**; a mesh would add a binary asset
carrying no geometric information beyond these values while inviting the reader to
believe surface detail is claimed. Full mmCIF stays a level-3 offline validation
asset (`load_in_browser: false`), unchanged.

### Provenance

Measurements are registered as first-class sources, not file paths: each PDB entry
gets a `PDB:<id>` key in `references.json` (precedent: `UniProt:Q8WZ42`), each
derived measurement a `PDB:<a>+<b> (Phase 6 measurement, <class>)` key with
`depends_on`, and each measured quantity a row in `geometry_sources.json`. The spec
loader rejects any citation that is not registered — it caught this adoption on the
first attempt, which is the guard working as intended.

### Guards

`StructuralProxies.verify()` (JS) and the Phase-6 block in `validate_geometry.py`
(spec). Both refuse to let a size measurement become an orientation claim, a
measurement silently displace a literature value, or a primitive that fails to
enclose its atoms pass as an envelope. Negative controls:
`scripts/neg_control_phase6.mjs` (7) and `scripts/neg_control_phase6_spec.py` (8,
restoring every file byte-identically). `scripts/audit_phase6.mjs` prints what
level 2 actually claims; `scripts/geometry_fingerprint.mjs` proves placement did
not move.

**Known limitation.** Fn3 rests on 2 independent entries and both are 2023
depositions of A-band domains; the Ig sample is stronger (3 entries, 3 regions,
19 chains). Adding a third independent Fn3 entry would be the next improvement.

### Interaction geometry between consecutive domains (Phase 6 review)

Per-class archetype geometry and inter-domain geometry come from *disjoint* entry
sets, by necessity:

| question | entries | why |
|---|---|---|
| per-domain SIZE | single-domain crystals (3PUC, 5JDJ, 1TIT, 8OMW, 8OT5, 1TKI, 4JNW) | an isolated domain is not deformed by a neighbour |
| domain-to-domain RELATIONSHIP | tandem crystals (2J8O, 3LPW, 8BNQ, 8BXR) | a single-domain file contains no relationship to measure |
| lattice-free SPACING check | 8G4L cryo-EM, 6.4 A, in situ | bounds the tandem crystals' packing limitation |

The separation is enforced by validator checks, not convention: using a tandem or
the in-situ entry for per-domain size is rejected, and the inter-domain record may
carry no size-like field.

`interdomain_geometry` is **evidence about a convention, never a coordinate**. An
Ig-Ig linker is flexible, so each crystal shows one conformation partly selected
by packing. The measurement's job is to say whether the SCHEMATIC
alternating-azimuth policy is consistent with observed tandems (it is: |twist|
median 163 deg, near antiparallel) and to exclude a *constant* azimuth. It does
not license a per-domain azimuth, and `adopted_as_coordinates` is permanently
false. A test asserts that deleting the record entirely moves no coordinate at any
canonical sarcomere length.

Resolution governs what each entry may claim. The 6.4 A in-situ entry contributes
centroid spacing only; per-domain axes, bend and twist are deliberately not
fitted, because that backbone cannot support an angle. Guards reject any attempt
to attach an angle to it.

Assembly stoichiometry is *computed*, not asserted. A declared multimer (5JDJ
declares 8 dimers) is adjudicated against observed inter-chain contacts; there,
the largest interfaces are not between declared partners, indicating lattice
packing. Because every chain is fitted individually, stoichiometry cannot affect
a reported dimension — and a guard asserts exactly that.

## Phase 7 — Sarcomere Context Model

Phase 7 adds the transverse (lattice) layer and the Three.js render layer, and
ships the first interactive viewer. It moved **no axial coordinate**: all four
canonical-state geometry fingerprints are byte-identical to their Phase 6 values
(fingerprints remain validated at all four canonical states; n=287,
folded_null=2 for the two disordered paths).

### Primitive assignment (plan conformance)

| Plan requirement | What ships |
| --- | --- |
| cylinders → thick/thin filaments | `CylinderGeometry`, length derived from the descriptor's `start_nm`/`end_nm` so a mesh cannot disagree with its extent |
| simple meshes → Z-disc, M-line | `BoxGeometry` slabs; axial width MEASURED, transverse extent render-only |
| curves/tubes → titin paths | `TubeGeometry` over a CatmullRom through domain positions |
| InstancedMesh → repeated domains **and** filaments | filament meshes plus evidence-split domain meshes sharing **3** archetype geometries (570 folded domains across both halves) |

### The transverse layer is a patch, not a claim about tissue

`LatticeGeometry` builds a hexagonal thick-filament patch and places thin
filaments at trigonal points. Two identities are enforced in code and in the
scene verifier, not merely documented:

```text
a      = 2 * d10 / sqrt(3)        # lattice constant from the modeled d10
d_MA   = a / sqrt(3)              # myosin-actin centre distance at a trigonal point
```

The spec's stored triple (`d10_spacing` 34.99, `lattice_constant` 40.4,
`myosin_actin_center` 23.33 nm) is **not** a resting-state triple — inverting the
constant-volume law recovers SL ≈ 2850 nm, matching the component's own note. At
that SL the construction reproduces both stored `lattice_constant` and stored
`myosin_actin_center` to < 0.01 nm, so it is checked against numbers it did not
consume. The triple and its 4.03×10⁶ nm³ calibration are explicitly **MODELED**;
Irving's measurements instead support the direction of length dependence and the
intact/skinned offset. `surface_separation` is derived from the same law plus the declared
filament radii. It is not fitted to a literature band: published surface
distances vary with species, preparation, temperature, and osmotic compression.
The source table records Caremani's approximately 8–15 nm rabbit-psoas interval
as condition-specific context, not an independent validation of this renderer.

The 1:2 thick:thin stoichiometry is the **infinite-lattice** ratio. A finite
patch cannot reach it (boundary thin sites are shared by fewer thick filaments),
and a control asserts that a finite patch claiming exactly 1:2 is rejected — the
manifest reports the achieved ratio with a note rather than the textbook one.

### Evidence is a rendered channel, and it is per claim

Opacity encodes evidence class (MEASURED → SCHEMATIC → UNKNOWN). Two decisions
were forced by that:

1. **Component evidence is per claim, not per component.** A filament's `length`
   is MEASURED while its `primitive_choice` is SCHEMATIC. The manifest reports
   `thick_filament.length` and `thick_filament.primitive_choice` separately, because
   flattening the component to one class erases exactly the distinction the spec
   is careful about. 49 claims are reported at SL=2200 with the lattice on.
2. **Domain archetypes are split by evidence class, sharing one geometry.**
   Fn3 placement is MEASURED for 121 instances (spec-recorded D-zone periodicity)
   and SCHEMATIC for 11. Rendering the archetype at its weakest member would draw
   121 measured domains at schematic transparency. Each `(archetype, class)` pair
   is therefore its own `InstancedMesh` **sharing the archetype geometry** — a cost
   in draw calls, not memory. `disposables` is a `Set` so a shared geometry is
   disposed exactly once rather than once per user.

| archetype | count | by evidence |
| --- | --- | --- |
| Ig_like | 152 | INFERRED 105, SCHEMATIC 47 |
| Fn3 | 132 | MEASURED 121, SCHEMATIC 11 |
| kinase | 1 | SCHEMATIC 1 |

Azimuthal arrangement of the six titin strands stays **SCHEMATIC** and a control
asserts it can never be promoted.

### Half-scoped versus sarcomere-scoped components

The sarcomere is built as one half plus a rotated clone. A 180° rotation about Y
preserves positive determinant and triangle winding while reversing the axial
direction; the M-line is drawn **once** on the shared plane. Two guards run at build time:
a sarcomere-scoped component duplicated into both halves is an error, and so is a
half-scoped component left unmirrored.

Below SL ≈ 2150 nm the SL-invariant thin filaments interdigitate past the M-line.
This is reported as `thin_filament_double_overlap` with its overshoot, because it
is a real state (ascending limb of the length–tension relation) that a reader
seeing two thin filaments cross at the centre should be able to confirm is
intended — and because it would otherwise look like a mirroring bug.

### Lattice off means the axial view, not a zero-ring lattice

A zero-ring patch contains no complete triangles and therefore no trigonal thin
sites. Initially the manifest still counted a central thin filament, claiming a
lattice while showing the on-axis idealization. Now `rings: 0` routes to the plain
axial scene, a degenerate patch is refused outright, drawn counts equal site
counts at every ring count, and the axial view *disclaims* transverse arrangement,
interfilament spacing, titin copy number and radial position rather than
reporting an empty `not_claimed` list — which would be the stronger, false claim.

### The viewer holds no biology

`Viewer.js` (camera, lighting, interaction) is separate from `SarcomereScene.js`
(scene construction) so scene construction stays verifiable headlessly — that
split is what makes the Phase 7 suite possible at all. Framing derives entirely
from the built scene's bounding box, with near/far planes computed from the scene
extent because a default frustum clips a structure of this scale. Lighting is
ambient plus two directionals with **no shadows**: shadows would imply an
illumination geometry that means nothing here and would corrupt the transparency
channel carrying evidence. Camera presets are stored as *directions*, so they
hold at any sarcomere length.

**Verification runs on every rebuild, not once at startup.** A state the user can
reach by dragging a slider must be as checked as one in the test suite; a
verification failure throws rather than rendering something unverified. A
permanent test sweeps 184 reachable states (23 lengths × lattice × domains ×
mirror), asserting each verifies clean, builds, and leaves the panel's three
readout fields non-empty.

### Guards

126 JS tests and **28** Phase 7 negative controls. Six of the controls guard
defects that were actually found while building this phase, not hypothetical
ones: lattice/axial SL divergence, axial-only scenes reporting no evidence,
evidence flattened per component, an empty `not_claimed` list, an archetype
collapsed to one opacity, and a shared geometry disposed once per user.
