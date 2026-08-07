# Titin 3D Visualization — Project Progress Tracker

*Living document. Source of truth for goals: `MASTER_PLAN.md`. Earlier session logs
below are historical snapshots; this header and the latest completion record are
authoritative when an old snapshot says work is still open.*

**Last updated:** 2026-08-07 — showcase sequence SC-0 … SC-17 complete
**Current phase:** MVP complete; the showcase sequence is complete in everything
a machine can decide
**Next phase:** none coded. What remains needs people, a WebGL browser, or the
presenting hardware — see “Outstanding work” below.

---

## Phase status overview

| Phase | Name | Status |
|---|---|---|
| 0 | Deep Scientific Research | ✅ **COMPLETE** — all review items closed |
| 1 | Scientific Geometric Specification | ✅ **COMPLETE** — canonical spec and derived measurement corpus validated |
| 2 | Data Architecture | ✅ **COMPLETE** |
| 3 | Geometry Strategy | ✅ **COMPLETE** |
| 4 | Titin Representation | ✅ **COMPLETE** |
| 5 | Repeated Domain Strategy | ✅ **COMPLETE** |
| 6 | PDB / Structural Data Pipeline | ✅ **COMPLETE** |
| 7 | Sarcomere Context Model | ✅ **COMPLETE** |
| 8 | Mechanical Model | ✅ **COMPLETE** |
| 9 | Primary Implementation Stack | ✅ **COMPLETE** — release, source, and browser gates passed |
| 10 | Browser Experience | ✅ **COMPLETE** — interaction, scale navigation, region focus, accessibility, and state truth gates passed |
| 11 | Validation | ⏭ **OUT OF SCOPE** — optional expansion skipped; continuous automated validation retained |
| 12 | AI-Assisted Engineering Workflow | ⏭ **OUT OF SCOPE** — optional workflow expansion intentionally skipped |

## MVP milestone status

| Milestone | Deliverable | Status |
|---|---|---|
| M0 | Research package | ✅ **COMPLETE** |
| M1 | Geometric specification (5 JSON files) | ✅ **COMPLETE** |
| M2 | Schematic browser model | ✅ **COMPLETE** |
| M3 | Titin domain architecture | ✅ **COMPLETE** |
| M4 | Experimental structural proxies | ✅ **COMPLETE** |
| M5 | Mechanical states | ✅ **COMPLETE** |
| M6 | Educational interface & polish | ✅ **COMPLETE** |

## Showcase extension status

The showcase sequence is an addendum and does not reopen or renumber MVP Phases
0–10. Optional MVP Phases 11–12 remain skipped.

| Showcase package | Name | Status |
|---|---|---|
| SC-0 | Claim audit, scope lock, and design contract | ✅ **COMPLETE** — reviewer-pinned 20-object matrix, complete source records, and 18-mutation destructive gate |
| SC-1 | Presentation data and dual-audience shell | ✅ **COMPLETE** |
| SC-2 | Titin hierarchy, continuity, and length story | ✅ **COMPLETE** |
| SC-3 | Z-disc and M-band correction | ✅ **COMPLETE** |
| SC-4 | Object-linked annotations and evidence access | ✅ **COMPLETE** |
| SC-5 | Thick-filament context and optional MyBP-C | ✅ **COMPLETE** |
| SC-6 | Orthographic lattice comparison | ✅ **COMPLETE** |
| SC-7 | Guided narrative and expert depth | ✅ **COMPLETE** |
| SC-8 | Integrated validation and audience evaluation | ✅ **COMPLETE** — automated portion; the audience gates themselves need people |
| SC-9 | Release, rehearsal, and handoff | ✅ **COMPLETE** — pack generated and staleness-gated; the rehearsal needs the presenting hardware |

A second sequence followed, planned in
`docs/superpowers/plans/2026-08-05-titin-showcase-dual-audience.md` (Revision 2,
written after driving the shipped build in a browser). Each sprint has its own
gate file `test/showcase_phaseNN.test.js` and a `verify:scNN` script.

| Showcase package | Name | Status |
|---|---|---|
| SC-10 | Titin becomes the subject | ✅ **COMPLETE** — screen-space continuity ribbon and halo, without touching evidence opacity |
| SC-11 | Framing, overlay composition, and frame cost | ✅ **COMPLETE** — close-up chapters reach their declared cameras; overlays run on change, not per frame; scale bar |
| SC-12 | The stage control bar | ✅ **COMPLETE** — length, presets, views and the stretch sweep on the stage in both modes; narrow-viewport layout |
| SC-13 | The inspector card, the drawer, and sources | ✅ **COMPLETE** — tabbed drawer, bibliography, citable view link, provenance across the stage |
| SC-14 | Passive force: the expert payload | ✅ **COMPLETE** — force readout and force–extension curve sampled from the existing pipeline |
| SC-15 | Make the mechanism visible | ✅ **COMPLETE** — disordered-chain slack, declared schematic |
| SC-16 | The anchor close-up | ✅ **COMPLETE** — envelope ghosting, fitted Z-disc glyph, measured Cα backbones at resolvable zoom |
| SC-17 | Presentation readiness | ✅ **COMPLETE** — projector type scale with a 9 px floor, presenter keys bound, release record rebaselined |

SC-0 artifacts: `SHOWCASE_DESIGN_CONTRACT.md`,
`data/showcase_claims.json`, and `scripts/validate_showcase_claims.py`. The
claim payload is SHA-256 pinned independently in the validator, and admitted
external sources must provide complete linkable citation metadata. The
reference remains human skeletal N2A-containing Q8WZ42; no cardiac titin mode or
lab-specific narrative was admitted. MyBP-C is admitted only as optional
schematic skeletal C-zone context, while thin-filament regulation is deferred.

---

## Phase 0 — final state (all items closed)

**Complete:**
- Literature corpus: 728 unique papers (Europe PMC, 2015–2026), thematically tagged → `titin_corpus_full.csv`
- Synthesis + landscape figures → `titin_literature_map.md`, `fig1_landscape.png`, `fig2_geometry.png`
- Landmark papers (23 structural) → `titin_landmark_papers.csv`
- Geometry reference w/ full provenance schema + evidence class (**25 params**) → `titin_geometry_reference.csv`
- Structural DB inventory: 64 PDB structures + UniProt domain architecture → `titin_structural_inventory.md`, `titin_pdb_inventory.csv`

**Session-3 additions (closed the 3 pending decisions + lattice gap):**
1. ✅ **Primary-source verification** — fetched full text and verified load-bearing values. Two corrections made:
   - Ig unfolding force: split into **physiological folding 6–8 pN** (Rivas-Pardo/Fernández 2016, confirmed) vs **AFM fast-pulling 150–300 pN** (EXTREME). The earlier "~200 pN" was misattributed to the 6–8 pN paper — now corrected.
   - Thick-filament periodicity **43.1 nm + 45.5 nm** confirmed directly against Caremani 2021 (JGP).
   - N2A contour 39 nm / persistence 0.35 nm confirmed against Frontiers 2020.
   - `verified` + `verify_note` columns added to every geometry row.
2. ✅ **Open-controversies section** → `titin_controversies.md` (active-force debate + Granzier/Gotthardt positions).
3. ✅ **Transverse lattice geometry** → `titin_lattice_addendum.md` + `fig3_lattice.png` + 5 new rows in geometry reference.

**Key scientific anchors established (carry forward):**
- One titin = one half-sarcomere (Z-disc → M-line); human titin Q8WZ42 = 34,350 aa
- Domain architecture: 152 Ig-like + 132 Fn3 + 1 kinase; 38 super-repeats; C-zone = 11×11 domains
- Thick-filament axial repeat = **43.1 nm** (myosin), titin super-repeat **45.5 nm**, 3 myosin crowns/repeat (Caremani 2021, verified)
- Folded Ig/Fn3 domain ≈ 4 nm axial
- **Transverse lattice:** hexagonal, 1 thick : 2 thin (vertebrate); Irving directly measures decreasing d₁₀ with length and an approximately 7.5 nm intact/skinned offset in rat cardiac trabeculae. The Desmos calibration is separately **MODELED** (numerically reproduced as d₁₀=34.99 nm at SL=2.85), while its constant-volume scaling **d₁₀ ∝ 1/√SL** is a labelled idealization. ⚠️ Real muscle is not strictly isovolumetric (time-varying Poisson ratio; Cass 2021).
- ⚠️ Ig unfolding = EXTREME state (150–300 pN AFM); physiological titin fold/unfold is 6–8 pN. Do NOT animate unfolding as ordinary contraction.
- ⚠️ Titin ACTIVE force generation is CONTESTED — model titin as passive Ca²⁺-/phospho-tunable spring only (Granzier/Gotthardt consensus); active-force/winding-filament is a hypothesis, label as such.
- ⚠️ AlphaFold DB has NO full-length titin (34k aa > limit) — per-domain only, always pLDDT-flagged
- Coordinate convention (from plan): X = longitudinal sarcomere axis; Y/Z = transverse lattice; unit = nm

## Artifacts index (this project)

| File | Purpose |
|---|---|
| `MASTER_PLAN.md` | Project goal & full phase plan (source of truth) |
| `PHASE0_REVIEW.md` | Phase 0 completeness assessment |
| `PROGRESS.md` | This file |
| `titin_literature_map.md` | Phase 0 synthesis report |
| `titin_structural_inventory.md` | PDB + domain architecture inventory |
| `titin_controversies.md` | Open controversies + Granzier/Gotthardt lab positions |
| `titin_lattice_addendum.md` | Transverse lattice geometry + Desmos model verification |
| `titin_geometry_reference.csv` | Curated geometry (25 params) w/ provenance + evidence class + verification → seeds Phase 1 |
| `titin_pdb_inventory.csv` | 64 experimental structures, region-classified |
| `titin_landmark_papers.csv` | 23 landmark structural papers |
| `titin_lattice_papers.csv` | Top 60 lattice-spacing papers (audit trail) |
| `titin_labpositions_papers.csv` | Top 80 Granzier/Gotthardt/active-force papers (audit trail) |
| `titin_corpus_full.csv` | Full 728-paper corpus, tagged |
| `titin_extracted_params_raw.csv` | 228 raw extracted params (audit trail) |
| `fig1_landscape.png`, `fig2_geometry.png`, `fig3_lattice.png` | Landscape, geometry, lattice figures |

## Phase 1 — final state (Milestone 1 complete, session 4)

**The scientific geometric specification is the project's source of truth (per MASTER_PLAN). All 5 files built directly from authoritative inputs — UniProt Q8WZ42 (domain architecture) + `titin_geometry_reference.csv` (verified quantitative values) — not from memory.**

| Spec file | Contents | Key facts encoded |
|---|---|---|
| `sarcomere.json` | 5 components (Z-disc, thin, thick, M-line, lattice) + copy number | Coordinate model, X = longitudinal nm, origin Z-disc; thick filament INVARIANT; transverse lattice d₁₀(SL) law |
| `titin.json` | 8 regions Z→M, residue spans, domain counts, mechanics | Ig 152 / Fn3 132 reconcile exactly with UniProt; PEVK 10216–12022; kinase 32178–32432; all elongation in I-band |
| `structural_states.json` | 4 SL states (1900/2200/2400/3000 nm) + transition rules | Titin I-band recruitment order (Ig straighten → N2A → PEVK), NOT uniform scaling; forbidden depictions listed |
| `geometry_sources.json` | 25 params, full provenance schema | value/unit/species/isoform/muscle/state/method/uncertainty/source/evidence_class/verified |
| `references.json` | 20 keyed bibliography entries | Every DOI cited in the spec resolves here (validated) |

**Validation passed:** all 5 valid JSON; every cited DOI present in references.json; 0 params missing evidence_class or source; titin domain totals reconcile (Ig=152, Fn3=132). Verification figure `fig4_phase1_spec.png` renders the 4 length states — thick filament invariant, I-band widens, PEVK recruits only at high stretch. Re-runnable validator: `validate_spec.py` (numerical identities + integrity, exit 0 = pass; seeds Phase 11).

**Session-4 review corrections (2 real findings fixed):**
1. **Evidence classification was over-collapsed.** First pass used only MEASURED / STRONGLY INFERRED, which implied render shapes were experimentally resolved — the exact trap the plan forbids. Fixed: added `evidence_by_claim` to every sarcomere component and titin region, splitting each into its distinct claims — residue span/domain count = MEASURED (UniProt); axial length/position = STRONGLY INFERRED; render geometry proxy = SCHEMATIC; detailed 3D conformation = UNKNOWN. All 5 plan classes (MEASURED / STRONGLY INFERRED / INFERRED / SCHEMATIC / UNKNOWN) now present and distinguishable. Added explicit `unknowns` arrays to sarcomere.json + titin.json (titin 3D path, PEVK/N2A tertiary structure, azimuthal titin arrangement, super-repeat register).
2. **Isoform reconciliation made explicit.** titin.json is skeletal N2A (canonical Q8WZ42); some filament values are cardiac cryo-EM (conserved architecture). Added `meta.isoform_reconciliation` documenting this as intentional cross-muscle use (per-value muscle_type in geometry_sources), NOT silent combination. Cardiac N2B/N2BA titin explicitly out of scope.

**Coordinate model constants (nm):** thick filament 1600 (invariant), thin 1050, Z-disc 50, M-line bare zone 160. Half-sarcomere = SL/2; I-band half-width = SL/2 − 800. Reference state = resting SL 2200.

**Extension model (STRONGLY INFERRED partition; recruitment order MEASURED):** at working lengths (2.0–2.4 µm) elongation is dominated by proximal-Ig straightening; PEVK recruits substantially only toward 3.0 µm. Do not linearly scale titin uniformly — use the per-state `titin_I_band_extension` values.

## Artifacts index — Phase 1 additions

| File | Purpose |
|---|---|
| `sarcomere.json` | Half-sarcomere component spec (source of truth for renderer) |
| `titin.json` | Titin molecule region/domain/mechanics spec |
| `structural_states.json` | SL states + transition rules for length-change animation |
| `geometry_sources.json` | 25 params, full provenance schema |
| `references.json` | Bibliography (20 entries) |
| `fig4_phase1_spec.png` | Phase 1 spec verification figure (4 length states) |
| `validate_spec.py` | Re-runnable spec validator (JSON validity, cross-refs, domain reconciliation, numerical identities, evidence vocabulary) |

## Phase 2 — Data Architecture (COMPLETE, session 5)

Built the `titin_app/` project scaffold matching the plan's layout exactly
(`/data`, `/assets/{domains,complexes}`, `/scripts`, `/src/{model,geometry,viewer}`,
`/test`) and the spec-consuming data layer. **Governing principle honored: no
module hardcodes a biological constant — every value is read from `data/*.json`.**

Data layer (ES modules under `src/`):
- `model/SpecLoader.js` — loads + validates the 5 JSONs; validator mirrors
  `validate_geometry.py` (cross-refs, domain reconciliation, per-state numerical
  identities, evidence vocabulary). Throws `SpecValidationError` — app refuses a bad spec.
- `model/Provenance.js` — resolves evidence class + sources for any component/region/
  parameter; exposes explicit `unknowns[]`. Unclassified → UNKNOWN, never fabricated.
- `geometry/GeometryEngine.js` — interpolatable API `geometryAt(SL)`; interpolates
  spec keyframes (recruitment order preserved, NOT uniform scaling); lattice d10 from
  constant-volume law at exact SL; `checkForbidden()` enforces the forbidden rules structurally.
- `model/TitinModel.js` — top-level entry point the viewer consumes.
- `model/readNode.js` / `readBrowser.js` — environment-agnostic spec readers.

`/scripts` PDB pipeline (`parse/measure/fit/generate`) written as honest documented
scaffolds raising `NotImplementedError` — Milestone 4 (deferred); geometry through
Milestone 3 comes from schematic proxies in the spec.

Verification: `node --test` → **14/14 pass**, including scientific invariants
(thick filament length invariant across SL range; titin confined to I-band; PEVK
recruits nonlinearly vs prox_Ig; d10 monotonic; per-claim provenance; explicit
unknowns; forbidden rules surfaced). `validate_geometry.py` → exit 0 from any cwd.
`ARCHITECTURE.md` documents the layer + viewer contract.

## Phase 3 — Geometry Strategy (COMPLETE, session 6)

Mapped each biological element to the simplest primitive that preserves its
scientifically meaningful structure. Built as a machine-readable strategy file +
a consuming module (no hardcoded primitive choices), consistent with the Phase-2
architecture principle.

- **`data/geometry_strategy.json`** (new derived layer, NOT one of the 5 canonical
  files): primitive vocabulary; domain archetypes (Ig/Fn3 → `capsule` ~4 nm axial
  MEASURED, lateral SCHEMATIC; kinase → `ellipsoid`); per-component + per-region
  primitive assignments; and an explicit `geometric_relationships` block (crown
  14.3/43.1 nm, A-band 11-domain/45.5 nm super-repeat, d10(SL) law, Ig aspect) —
  every dimensional value referenced to its geometry_sources param + DOI, never
  restated. Deliberately does NOT force proteins into Platonic solids.
- **`src/geometry/GeometryStrategy.js`**: `sceneAt(SL)` → renderable primitive
  descriptors combining strategy + live spec dimensions (zero biological constants);
  folded regions → `instanced_repeat` capsules that straighten; disordered N2A/PEVK
  → `tube` with NO folded instances. `verifyScene` → `{errors, notes}`.
- **Wiring**: `SpecLoader` loads + validates the strategy (coverage, vocab, param/DOI
  resolution, evidence classes); `TitinModel` exposes `sceneAt`/`verifyScene`.
- **Tests**: 28/28 pass (9 new Phase-3, incl. a negative test that an out-of-vocab
  primitive is rejected). `validate_geometry.py` → exit 0.

✅ **Resolved (session 6, at the spec layer with user authorization): Z-disc
anchoring offset.** The elastic tandem-Ig spring emerges at the Z-disc **edge**
(Z1Z2 is anchored inside the Z-disc), so the elastic titin budget = I-band
half-width − Z-disc half-width, and distal Ig now lands **exactly at the A-band
tip** at every state. Fixed by absorbing the constant −25 nm into `prox_Ig` (the
baseline-compliance element) so every reviewed recruitment delta (N2A/PEVK/dist_Ig)
is preserved unchanged; only the constant anchoring offset shifted. `prox_Ig` stays
positive and below its 308 nm folded-contour ceiling at every state. The corrected
identity is enforced in all four layers (`structural_states.json` + `titin.json`
data, `GeometryEngine.checkForbidden`, `SpecLoader`, `validate_geometry.py`) and
tested (`dataLayer.test.js`); `verifyScene` now returns zero errors AND zero notes.
`I_band_half_width_nm` (Z-centre → A-tip anatomy) is unchanged. Grounding: STRONGLY
INFERRED Z-disc titin topology; Z-disc width itself is SCHEMATIC, so encoded as
"elastic region begins at the Z-disc boundary," not an exact-nm claim.

## Resume instructions

Phases 0–3 are complete. To resume: read `MASTER_PLAN.md` (goal) + this file
(state) + `titin_app/ARCHITECTURE.md` (data layer + strategy). **Next is Phase 4 /
Milestone 2 — the Three.js viewer** — build `src/viewer/` on top of `TitinModel`,
driven by `model.sceneAt(SL)` (primitive descriptors) so it consumes the strategy
+ spec and never hardcodes geometry. The Z-disc anchoring offset is resolved
(distal titin lands at the A-band tip), so the viewer can render the I-band path
directly with no positional caveat. Carry forward all ⚠️ directives (extreme-state
unfolding, contested active force,
idealized lattice law). Node env `node` (v26) available; `node --test` runs the suite.

## Cross-phase audit (session 7)

Audited Phases 0-3 against the master plan's explicit field mandates (re-read from
the plan text, not from memory).

**Phase 0 — quantitative-value metadata: PASS.** All 25 parameters in
`geometry_sources.json` carry all 9 required fields (value, unit, species, isoform,
muscle_type, biological_state, method, uncertainty, primary_source).

**Phase 1 — component records: GAP FOUND AND FIXED.** `sarcomere.json` components
carried the full ~20-field record, but `titin.json` regions were missing 8 mandated
fields — most consequentially `attachment_points` and `repeating_geometry`, which the
project objective explicitly names ("attachment relationships", "repeating geometry").
Added to all 8 regions: parent_structure, dimensions_nm, orientation, principal_axes,
attachment_points, relationships, repeating_geometry, biological_condition, notes.

Attachment claims are sourced, not asserted from memory. Terminal-anchor complexes were
verified against RCSB (1YA5 titin Z1Z2:telethonin; 3KNB titin C-term:obscurin-like 1,
both X-ray) and their primary citations resolved via Crossref, adding two references:
- 10.1038/nature04343  (Z1Z2:telethonin palindromic Z-disc anchor)
- 10.1038/embor.2010.65 (titin C-terminus:OBSL1 M-line assembly)

Honesty preserved: orientation records the axial direction as STRONGLY INFERRED while
marking azimuthal placement UNKNOWN; `dimensions_nm.lateral_extent_YZ` is explicitly
null/UNKNOWN with render width labelled SCHEMATIC. No geometry changed — spec output is
bit-identical (distal titin still meets the A-band tip at every state; 28/28 tests pass).

**Also fixed:** an `extension_model` ambiguity — the worm-like-chain end-to-end estimate
sits alongside the schematic layout length; all 4 elastic regions now carry a note naming
`structural_states.json` as the source of truth for layout. No numbers changed.

**Validator hardened** (`validate_geometry.py`, 113 checks): now enforces the Phase-0
9-field rule, Phase-1 component-record completeness for both files, and that every
attachment point cites a reference that actually exists with a valid evidence class.
A missing key fails; a deliberately empty value (a lattice has no binding partners) passes
— "where applicable" per the plan. Verified by negative control: removing a mandated field
makes the validator exit 1.

## Phase 4 — Titin Representation (session 8) — COMPLETE

Read the plan's actual Phase 4 text first. **Phase 4 is "Titin Representation"
(hierarchical Levels 0-3), not the Three.js viewer** — earlier sessions had
mislabelled it. The viewer is Phase 9/10.

Built `src/geometry/TitinRepresentation.js` (Levels 0-3) + 13 tests (28 -> 41).

**Spec bug found and fixed — 25 nm break in the titin polypeptide.** The Z-disc
origin correction (session 6) had been applied to the I-band regions but never
propagated to the anchored regions, leaving `dist_Ig` ending at 300.0 while
`Aband_super` began at 325.0. Titin is a single continuous chain, so this was a
real topology error. Fixed by pinning A-band titin to the thick-filament tip
(`X_start` 325.0 -> 300.0, span 595 -> 620).

Grounds (meets the user's bar — strongly implied by logic + sourced geometry):
1. Chain continuity — the A-band segment is bound to the thick filament, which
   begins at that tip; a gap in a covalent polypeptide is not physical.
2. Independent constraint — the anchored chain (620 + 30 + 150) now sums to
   exactly 800 nm = the half thick-filament length, which is SL-invariant
   because the filament is rigid. This was NOT fitted; it fell out.
3. 595 nm was never a sourced measurement (absent from geometry_sources.json,
   classed derived/STRONGLY INFERRED). No MEASURED value was altered.

Geometry output is unchanged (distal titin still meets the A-tip at
150/300/400/700); only the documented anchored layout moved.

**Validator: 113 -> 140 checks.** Added Phase-4 chain topology (continuity,
N-/C-terminus anchoring, anchored span == half thick filament, A-band tip
pinning) and a per-state unfolding guard on extensible tandem-Ig regions.
All verified by negative control (reintroducing the gap fails 3 tests; shrinking
the archetype fails the unfolding guard).

## Phase 4 review (session 8) — COMPLETE

Probed what the 41 tests did not cover. Clean: instance sources all resolve in
references.json; domain_class within DOMAIN_CLASSES; `I_band_half_width_nm` is
identical to `thick_filament.X_start` at every SL (the aTip assumption holds);
no non-finite numerics; A-band geometry is SL-invariant and translates rigidly.

**Two real defects found and fixed:**

1. **Evidence overclaim on D-zone placement.** D-zone instances claimed MEASURED,
   but the spec's super-repeat periodicity covers the C-zone only — the D-zone
   spacing came from my own even division. Split evidence into
   `domain_evidence_class` + `placement_evidence_class` with a `_weakest` floor;
   D-zone placement is now SCHEMATIC. Uniform-division regions dropped
   MEASURED -> INFERRED. Only the C-zone claims MEASURED placement.
2. **`kinase` and disordered instances emitted `undefined`** for mechanical_class,
   axial_rise_nm, etc. — would break any consumer grouping by class. All three
   construction paths now emit a uniform field set; disordered regions use `null`
   (inapplicable) rather than 0.

A third overclaim surfaced *from the new test itself*: N2A/PEVK effective class
led with "MEASURED (sequence)" though their rendered geometry is unknown. Now
floored to UNKNOWN.

Tests 41 -> **49**; validator 140 -> **143 checks**; both exit 0, validate_spec
exit 0. Negative controls verified: D-zone claiming MEASURED fails exactly the
C-zone test; dropping a field fails exactly the uniformity test; inflating the
super-repeat count fails the zoning fit. Rendered geometry byte-identical
(position sums unchanged at SL 1900/2200/2400/3000).

**Phase 4 is complete.** Next: Phase 5 (Repeated Domain Strategy) or Phase 6 (PDB pipeline).

### Phase 4 completion check (session 8)

Re-read the plan's Phase 4 section (lines 328-382 of the master plan) and checked
each deliverable against the running model rather than against memory. All four
levels present; all 9 mandated L1 fields on all 286 instances; L2 empty and L3
offline-only, both by design.

One documentation gap closed: `DOMAIN_CLASSES` exported `flexible_linker` and
`terminal_anchor`, which nothing can emit — making the in-vocabulary test pass
vacuously for them. This is correct behaviour (fold class != mechanical role;
Z1Z2/Mline are Ig folds that are `anchored`) but the decision was unrecorded.
Now documented at the definition and locked by a test that fails if Z1Z2 or
Mline is reclassified away from `Ig_like`/`anchored`, verified by negative control.

Tests 49 -> **51**. Validator 143 checks, exit 0; validate_spec exit 0.
Geometry unchanged (position sums identical at SL 1900/2200/2400/3000).

**PHASE 4 IS COMPLETE.**

## Phase 5 — Repeated Domain Strategy — COMPLETE (session 8)

Implemented against the plan's five steps (plan text lines 383-411, read directly).

| Plan step | Implementation |
|---|---|
| 1 identify structural domain classes | `Ig_like`, `Fn3`, `kinase` from `domain_composition`; PEVK/N2A carry no folded archetype |
| 2 select representative experimental structures | 3PUC (0.96 A), 8OMW (1.05 A), 1TKI (2.00 A) — chosen from UniProt Q8WZ42's 64 PDB xrefs by pre-fixed criteria, all re-verified against RCSB (resolution, method, single-entity, Homo sapiens) |
| 3 small number of lightweight archetypes | 3 archetypes; capsule/capsule/ellipsoid primitives, literature-sourced dimensions |
| 4 instance them | `InstancingPlan.batchesAt(sl)` — 286 instances -> **3 draw calls** + 2 non-instanced disordered regions |
| 5 individual transforms where evidence supports | per-instance position / tilt / azimuth / spacing, each with its own evidence class; `scale` fixed at 1 by policy |

**Two defects found and fixed:**

1. **Archetype resolved per region, not per domain class** — all 132 A-band Fn3
   domains were drawn with the Ig exemplar and the `Fn3` archetype was unreachable.
   Fixed via `_archetypeFor()`. Pure relabel (Ig and Fn3 share 4.0 nm from one
   source), so geometry is unchanged: Sx = 127200.550 at SL 2200, matching the
   Phase-4 record exactly. Guarded against future divergence.
2. **My own first continuity metric was wrong** — it measured transverse offset only
   and reported false breaks in Z1Z2/Mline, where the offset is legitimately spanned
   by inter-domain linker. Rewritten in full 3D against the linker budget the model
   already reports.

**Scientific finding:** azimuth alternation is *forced by chain continuity*, not
chosen for appearance — constant azimuth would drift prox_Ig ~238 nm off axis, while
alternating 0/180 deg closes each junction to exactly zero. Recorded as SCHEMATIC
regardless, since the true azimuths are unknown.

**Known limitation (reported, not hidden):** 1 of 278 junctions —
`Aband_super.58 -> .59` at the D/C zone boundary — overruns its linker by 1.580 nm.
This is a consequence of the unsourced D-zone spacing and is reported as a note
*because that placement is SCHEMATIC*; the guard escalates it to a hard error if the
evidence class is ever upgraded to MEASURED (verified by negative control).

Tests 51 -> **59** pass. Validator **163** checks, exit 0. `validate_spec` exit 0.
6 Phase-5 negative controls + 3 validator negative controls all fire correctly.

**PHASE 5 IS COMPLETE.** Next: Phase 6 (PDB / structural data pipeline) — downloads
the three selected structures, measures them, and fits the primitives, filling the
deliberately-empty Level 2.

### Phase-5 review (session 9)

Probed what the 59 passing tests did not cover. Two guard defects found, both real:

1. **N2A declares 1 MEASURED `Ig_like` domain that is never instanced** — and my own
   validator check exempted N2A *by name*, hiding it. Root cause is the literature's
   N2A element (Ig80-Ig83 + UN2A) straddling this spec's `prox_Ig`/`N2A` boundary.
   Recorded as an explicit guarded gap in `undepicted_declared_domains` and flagged
   for Phase-1 spec review; `declaredVsInstanced()` + verify check 9 make any
   *undocumented* shortfall a hard error. Neither silently dropped nor invented.
2. **Azimuth guard checked per batch instead of per region** — one region stuck at a
   constant azimuth slipped through (the continuity guard caught it, so nothing was
   silently wrong, but the guard's message overclaimed). Now per region.

Tests 59 -> **62**, validator 163 -> **168**, negative controls 6 -> **8** (both new
ones fire on their target guard). `validate_spec` exit 0. Geometry byte-identical at
SL 1900/2200/2400/3000.

**PHASE 5 REMAINS COMPLETE** — with one item handed to Phase 1 (N2A/prox_Ig region
partition) and one known limitation still reported (D/C zone junction, SCHEMATIC).

## Phase 6 — PDB / Structural Data Pipeline — COMPLETE (session 10)

Structures measured as source data; level 2 now publishes fitted primitives.

- `scripts/measure_structures.py` — 9-step pipeline, byte-reproducible across runs.
  7 entries (Ig 3PUC/5JDJ/1TIT, Fn3 8OMW/8OT5, kinase 1TKI/4JNW), 29 chains fitted.
- `scripts/adopt_measurements.py` — idempotent; deliberately narrow.
- `src/geometry/StructuralProxies.js` — level 2, procedural parameters, no mesh asset.

**Adopted:** lateral diameters (SCHEMATIC 2.0/2.0/3.0 → MEASURED 2.636/3.216/4.660 nm);
kinase axial length 4.531 nm (was absent — every kinase instance emitted a null
folded length). **Retained:** Ig/Fn3 axial length at the literature 4.0 nm, because it
drives layout, the measurements corroborate rather than contradict it (1.03 / 1.30 SD),
and Ig 4.319 ≠ Fn3 4.419 would break the Phase-5 single-axial-length invariant.

**Geometry proven unmoved:** fingerprints byte-identical at SL 1900/2200/2400/3000
(Sx 91988.650 / 127200.550 / 150968.150 / 212806.750, n=286). Only `folded_null`
changed, 3 → 2 — the kinase null filled, PEVK and N2A still genuinely unknown.

Two findings the alignment check produced that numbering alone would have missed:
- Expression-tag remnants in 3PUC/8OMW/5JDJ; SIFTS off-by-one for all three.
  Tag residues excluded from every fit.
- A real variant: 1TIT residue 3 is GLU where canonical Q8WZ42 has LYS at 12679,
  with `rcsb_mutation_count 0` — a 1996 deposition predating the canonical sequence.
  Registered in `DOCUMENTED_VARIANTS`; undocumented mismatches now fail hard.

Metric defect found and fixed during review: the original `identity_frac` was
matches ÷ full observed length, conflating "did we measure the right protein" with
"how much of this is tag". Split into `core_identity_frac` (contiguous mapped span,
≥0.98) and `native_residue_frac` (≥0.90). The split immediately surfaced the 1TIT
variant the aggregate had been hiding. Relabeling only — all dimensions reproduced
identically.

**Kinase orientation stays UNKNOWN.** Its N-to-C vector lies 42.7° off its own longest
principal axis, so the 6.65 nm extent is not the chain direction. The ellipsoid marks
size and position only; guards forbid using that extent as an axial length.

Verification: 73/73 JS tests · 257 validator checks · 7 JS negative controls ·
8 spec negative controls (all restoring byte-identically) · audit 0 errors ·
validate_spec exit 0.

Known limitation: Fn3 rests on 2 independent entries, both 2023 A-band depositions.
A third independent Fn3 entry is the next improvement.

## Phase 6 — REVIEW (session 11)

Reviewed against the plan text (lines 411-455). Two real defects found in work
previously reported complete, both fixed; one addition made.

**Defect 1 — false provenance statement.** `method.assembly` asserted in prose
that "all selected entries are monomeric". 5JDJ declares 8 *dimeric* assemblies,
so the claim was false. Rather than reword it, the claim is now *computed*:
`verify_assembly()` ranks inter-chain heavy-atom contacts per entry and
adjudicates any declared multimer against the observed interfaces. For 5JDJ the
largest interfaces are **not** between declared partners, which is the signature
of lattice packing rather than biology — as expected for an Ig domain that exists
as a bead on a single polypeptide. Each chain is fitted individually, so assembly
stoichiometry never affected any reported dimension; all dimensions verified
unchanged. (A near-miss while implementing this: gemmi's assembly generators use
`subchain` ids while model chains use `name`; comparing them directly would have
matched nothing and made the guard vacuously pass. Fixed with an explicit
polymer-only mapping.)

**Defect 2 — plan step 5 half-delivered.** The step requires "major bends **and
interaction geometry**"; only bends existed. Cause: every entry selected in
Phase 5 holds a *single* domain (the criteria deliberately "prefer a single
domain over a tandem so the exemplar matches one archetype instance"), so within
each entry all SIFTS ranges are identical and no domain-to-domain relationship
exists in the file. That criterion is right for per-class geometry and is exactly
why interaction geometry needs its own selection.

New `scripts/measure_interdomain.py` measures consecutive-domain geometry from
tandem depositions (2J8O, 3LPW, 8BNQ, 8BXR, 6YGN), using UniProt-annotated domain
boundaries as the partition and the alignment-verified residue mapping from the
existing pipeline. Per pair: centre-to-centre distance, inter-axis bend, and a
signed dihedral about the linking vector (the azimuthal twist). 6YGN correctly
yields zero pairs — its observed domains flank the kinase and are not
consecutive; the guard working as designed.

Result: |twist| median **163.2 deg** over 4 independent pairs (range 62.8-175.0),
clustering near the antiparallel value the instancing policy already assumed.
The alternating-azimuth policy previously rested only on a chain-continuity
argument; it now has empirical corroboration, and a *constant* azimuth is
excluded by measurement as well as by argument.

Adopted narrowly. Ig-Ig linkers are flexible: each crystal shows one
conformation, partly selected by packing, so this is a distribution and not a
canonical value. `adopted_as_coordinates: false`; the azimuth policy stays
SCHEMATIC; the measured centre-to-centre distance is explicitly *not* equated
with the spec's axial rise (the spec derives rise from region span / domain
count, a different quantity that includes linker extension under load). Tandem
and single-domain entry sets are disjoint and guarded as such — a tandem
crystal's domains are in contact, so using one for per-domain size would measure
a packed conformation.

**Addition — lattice-free cross-check.** 8G4L (cryo-EM human cardiac myosin
filament, 6.4 A) carries titin Ig117-Fn73 *in situ* in 6 copies with no crystal
lattice, which directly bounds the tandem crystals' stated limitation. Folded in
as `in_situ_cross_check`: spacing median **4.102 nm over 60 pairs**, versus
4.551 nm in crystals and the **4.0 nm literature value the spec retains** — i.e.
within 0.10 nm of the retained value, independently corroborating the decision to
keep literature driving layout. Resolution discipline is enforced in code: at
6.4 A this contributes centroid spacing **only**, and per-domain axes, bend and
twist are deliberately not fitted, because that backbone cannot support an angle
claim. Guards reject any attempt to give this entry an angle or use it for size.

State: **82/82 JS tests** (was 73), **312 validator checks** (was 257),
**22 review negative controls** + 7 JS + 8 spec, validate_spec clean, both
measurement pipelines byte-reproducible, both adoptions idempotent, and all four
canonical-state geometry fingerprints **identical** to the pre-review values
(91988.650 / 127200.550 / 150968.150 / 212806.750) — the review added evidence
and guards, and moved no coordinate.

---

## Session 10 — Phase 7 (Sarcomere Context Model) complete

Phase 7 adds the transverse lattice layer, the Three.js render layer, and the
first interactive viewer (`index.html`). Every primitive the plan names is now
in use: cylinders for filaments, box slabs for Z-disc and M-line, tubes for
titin paths, and `InstancedMesh` for repeated filaments **and** repeated domains
(568 domain instances across both halves drawn from **3** geometries).

**Four defects found in pre-existing code before new work began**, all fixed with
guards: `validate_spec.py` resolved paths through the working directory and was
validating a stale duplicate; its I-band identity ignored the Z-disc and was off
by 25 nm on every state (the data was right, the check was wrong); the thin
filament was placed from the wrong origin; and the I-band/overlap intersection
missed a kink at SL = 2310 nm, with error up to 24.75 nm.

**Two inconsistencies found in Phase 7's own first draft.** The lattice applied
the constant-volume law to raw SL while the axial engine clamped SL to the
keyframe range — a 3.6 nm disagreement for the same input depending on call
path. All SL now routes through one clamp, clamping is reported rather than
hidden, and a verifier rule fails the scene if the two layers ever disagree.
Separately, `rings: 0` produced a "lattice" with no trigonal sites while still
counting a central thin filament; lattice-off now routes to the plain axial
scene and a degenerate patch is refused.

**Two honesty defects in the render manifest.** Evidence was reported for the
lattice only, so the axial view claimed *no* evidence for filaments that plainly
have some; and `not_claimed` was empty without the lattice, which is the stronger
and false statement. Evidence is now reported **per claim** rather than per
component (`thick_filament.length` MEASURED, `thick_filament.primitive_choice`
SCHEMATIC — 49 claims at SL = 2200), because flattening erases exactly the
distinction the spec is careful about; and the axial view explicitly disclaims
transverse arrangement, spacing, copy number and radial position.

**The most substantive finding.** Rendering a domain archetype at its weakest
member's evidence would have drawn Fn3's 121 MEASURED instances at SCHEMATIC
transparency. Each `(archetype, evidence class)` pair is now its own
`InstancedMesh` **sharing one archetype geometry** — a cost in draw calls, not
memory — so every domain renders at its own confidence:

```text
Ig_like  151 = INFERRED 104 + SCHEMATIC 47
Fn3      132 = MEASURED 121 + SCHEMATIC 11
kinase     1 = SCHEMATIC 1
```

This forced `disposables` to become a `Set` (a shared geometry must be disposed
once, not once per user), and the manifest's instanced-mesh inventory to be read
off the built tree rather than predicted from inputs.

Scene verification runs on **every** rebuild, not once at startup: a state
reachable by dragging a slider must be as checked as one in the test suite, and a
verification failure throws rather than rendering something unverified. 184
reachable states are swept as a permanent test.

State: **126/126 JS tests** (was 82), **312 validator checks**, **28 Phase 7
negative controls** (six of which guard defects actually found, not hypothetical
ones) plus all prior-phase controls and audits still passing, `validate_spec`
clean — and all four canonical-state geometry fingerprints **byte-identical** to
their Phase 6 values (91988.650 / 127200.550 / 150968.150 / 212806.750, n=286,
folded_null=2). The entire transverse, domain-instancing and render effort moved
**no axial coordinate**.

---

## Session 11 — Figure 1 composed (six panels, every claim pixel-verified)

`titin_sarcomere_figure.png` (180 mm wide, 300 dpi) is the first publication-grade
deliverable. Every panel is a rasterization of the SAME verified scene graph via
`scripts/export_tris.mjs` + the offline painter's-algorithm renderer — there is no
second, hand-drawn asset that could drift from the model.

Claims in the figure, and how each was established FROM THE RENDERED PIXELS
(not from the model that produced them):

| claim | measured | spec | err |
|---|---|---|---|
| A-band invariant | 1601.6 nm at all three SL | 1600 | 0.10% |
| total span grows | 1950 / 2250 / 3050 nm | SL + Z-disc | <0.1% |
| titin spans Z-to-Z | 1893 / 2192 / 2991 nm | = SL | <0.4% |
| lattice compresses | a 49.5 -> 39.4 nm | spec a | 0.05% |
| filament diameter invariant | 64 px in both d and e | invariant | exact |

Defects found and fixed this session:

1. **Panel a wasted its frame** (filled 0.33 x 0.17). Cause: `fov` is VERTICAL, so
   a 4.5:1 panel gets an enormous horizontal extent. Fixed with `fit_fov()`, which
   iterates the fov against the measured projected ink bbox rather than guessing,
   plus a diagonal camera azimuth so a 16:1 object uses the frame's height at all.
   Final fill 0.84 x 0.90.
2. **Cropping the lattice panels to their own bboxes would have broken the shared
   scale** — c was 465 px wide, d 389, so equal grid cells would have magnified d
   and understated the compression. Both are now padded to ONE canvas
   (465x638) and this is asserted, then re-verified by measuring the
   thick-filament disc height out of the written PNGs (64 px in both).
3. **Span annotations in the titin panel landed between strips** with all but one
   label clipped, because they were drawn in figure coordinates. Redrawn in
   per-axes coordinates so each label belongs to its own strip.
4. **A file-shuffling step to renumber panels clobbered the legend.** Panels are now
   regenerated from their definitions (`write_legend()`), never moved between names.

The apparent disc-size difference between the two lattice panels that prompted this
session was **not** a defect: measured disc diameter is 64 px in both. It was
preview scaling of two differently-sized PNGs.

## Session 14 — Phase 7 review: figure rebuild + a clamp-provenance defect

**Question asked:** review the work, is Phase 7 complete?

**Answer: Phase 7 is complete.** Every MASTER_PLAN Phase 7 requirement is met and
gated by tests:

| Phase 7 requirement | Implementation | Gate |
|---|---|---|
| cylinders -> thick/thin filaments | `CylinderGeometry` | phase7 tests |
| simple meshes -> Z-disc, M-line | `BoxGeometry` | phase7 tests |
| curves/tubes -> titin paths | `CatmullRomCurve3` + `TubeGeometry` | phase7 tests |
| `InstancedMesh` -> repeated domains + filaments | one per evidence class / archetype | neg control (no double-dispose) |
| one clear longitudinal sarcomere | `SarcomereScene.build()` | smoke test |
| neighbouring structure for 3-D organization | lattice patch + mirror through M-line | phase7 tests |
| transverse lattice only when defensible | constant-volume d10 law, hexagonal identities | 6 identity tests |

State: **134/134 JS tests** (was 130), **312 validator checks**, **31 Phase 7
negative controls**, all passing. New: `scripts/smoke_phase7.mjs`.

### Defect found and fixed: the lattice layer denied its own clamping

`GeometryStrategy._latticeLayer()` read its SL from `geom.sarcomere_length_nm` —
a value `geometryAt()` had *already clamped* to the keyframe range [1900, 3000].
So `latticePatch()` never saw an out-of-range request and reported
`was_clamped: false` for one. A scene requested at SL 1600 returned
`{evaluated_at_sl_nm: 1900, sarcomere_length_requested_nm: 1900, was_clamped: false}`
— it claimed to have been built at the value it was asked for, when it had
silently been built at 1900.

This is exactly the failure mode the project exists to avoid: the geometry was
right, but the provenance asserted knowledge the model does not have.

Fixed by passing `geom.requested_sl_nm` through. `latticePatch()` applies the
same clamp, so **no filament moved** — lattice constants at every clamped request
are bit-identical to the clamp boundary, asserted in a new test. Only the
provenance changed:

| requested | evaluated | was_clamped | a (nm) |
|---|---|---|---|
| 1500 | 1900 | **true** (was false) | 49.489 |
| 1600 | 1900 | **true** (was false) | 49.489 |
| 1900 | 1900 | false | 49.489 |
| 3000 | 3000 | false | 39.385 |
| 3400 | 3000 | **true** (was false) | 39.385 |

Four tests added and **verified to fail when the fix is reverted** (test 131
fails, 133/134). They cover: out-of-range reported as clamped; in-range not
reported as clamped; clamping changes provenance only, never geometry; and the
axial and transverse layers agree on the evaluated SL (they clamp independently,
so a disagreement would draw filaments at one SL and a lattice at another).

Severity is limited: the UI slider is bounded to `model.slRange()` = [1900, 3000],
so the path is unreachable from the app and only an API consumer could hit it. But
`data/*.json` is the source of truth and other consumers read this descriptor.

### Figure 1 rebuilt — the shared-scale claim was false twice

Panel c's caption claims it shares panel b's horizontal scale. It did not.

**Mechanism:** `imshow` forces `aspect='equal'`, so an axes box shrinks to its
image's aspect. Panels b and c have different aspects, so identical requested
margins produced *different drawn axes widths* — different nm/px. A tight-bbox
save setting was a second, independent cause.

Diagnosing it took four attempts, each abandoned for a recorded reason: guessing
row bands as height fractions caught the wrong strips; segmenting into ink
row-blocks worked for b but not c (row labels merge vertically with the strips
there); measuring the source render arrays proved the *geometry* was correct
before it reached the figure, localizing the fault to the layout layer.

**Fix:** abandon margin-based layout. Every panel is placed with explicit
`add_axes` at exactly its image aspect, with b and c sharing one axes width in
pixels. Verified from the composite's own pixels:

- b and c drawn axes width **2031.50 px both** (ratio 1.000000, asserted)
- d and e drawn axes width **535.75 px both** (ratio 1.000000, asserted)
- both axial panels read **1.69329 nm/px**
- panel b spans 1954.1 / 2253.8 / 3053.0 nm (true 1950 / 2250 / 3050)
- panel c spans 1894.8 / 2194.5 / 2992.0 nm (true SL 1900 / 2200 / 3000, max err 0.27%)

Composition then broke the same claim a *second* time, via the same mechanism
inside gridspec cells: a cell whose height is limiting shrinks the axes width, and
differing aspects shrink differently. Grid cells are now forbidden for the axial
panels, with the reason in the composer docstring.

**Panel a was genuinely clipped** — 179 px of ink in the left column, cutting the
Z-disc. Its earlier edge check misfired because panel a is opaque: the alpha
channel is uniform, so it carries no information about ink. Switching the check to
luminance revealed it. The fov fit is now clipping-aware, with the failure mode
recorded: the fit converges on the ink bounding box, which is only measurable once
the ink is *inside* the frame, so an over-tight fill target converges while still
clipped. Final correction computed analytically — decompose the camera basis,
convert the measured ink-centre offset into a look-at shift in world nm, scale fov
by measured/target fill. Result: no edge ink, fills 0.822 x 0.782, centred to 38 px.

### Second false alarm, resolved by measurement

The two lattice cross-sections *appeared* to have reversed spacings in the
composite. Flood-fill labelling of the filament blobs showed panel d (SL 1900) has
**210.6 px** nearest-neighbour spacing vs panel e (SL 3000) at **167.5 px** —
ratio 1.25731 against the spec's own 1.25656, err **0.06%**. Both panels read
identical nm/px (0.2350 / 0.2351). Not reversed; a misread preview.

This is the second time a preview-scaling artifact was reported as a defect
(session 13 was the first). Standing rule: **measure the written pixels, do not
trust the preview.** And the lattice pair must stay on one common crop window —
cropping each to its own bounding box would magnify one and make the compression
the pair exists to demonstrate read as smaller than it is.

Figure 1 is now 180 x 265.9 mm at 300 dpi, 6 panels.

## Session 15 — Titin's context measured from deposited coordinates

The user asked whether we are missing the helical wrapping of the filaments, and
whether myosin's rod-plus-head, staggered-rotated arrangement is too much detail.
They also supplied their own prior research (notes + 3 figures).

### Their notes cross-validate against our spec

Our constant-volume d10 law reproduces the d10 values in their notes to 0.01%
(SL 2000/2250/2500 nm -> 41.774/39.385/37.364 vs their 41.77/39.38/37.36). Same
source lineage. Their actin crossover figure (36-37 nm) is confirmed below.

### A declared UNKNOWN was actually resolved in 2023

sarcomere.json declared "Azimuthal arrangement of the 6 titin molecules" UNKNOWN
and adopted six-fold-at-60-deg as least-committal. Measuring PDB 8G4L (human
cardiac C-zone, 6 A, doi:10.1038/s41586-023-06691-4) shows this is WRONG in shape,
not just in phase:

  three 120 deg sectors, each with a TA/TB PAIR 30 deg apart
  TA outer shell r = 8.57 nm ; TB inner shell r = 6.85 nm
  two radii, not one; radial gap 1.72 nm

Our schematic put all six on one 7.5 nm shell at 60 deg. The unknowns entry is now
amended with a `superseded` block preserving the old reasoning. 3-fold exactness is
IMPOSED by the reconstruction, so it is not evidence of exact in-vivo symmetry.

### Crowns are quasi-helical, and the rotations are unequal

Measured from 8G4L: 3 crowns, mean axial spacing 144.4 A (X-ray 14.3-14.4 nm).
Reducing head-tail-junction azimuths mod 120 deg gives unequal successive rotations
summing to 120 deg by closure. Our centroid-based estimate was {29.3, 30.2, 60.4};
the paper reports {32, 16, 72} measured to the IHM junction. USE THE PAPER'S VALUES
— ours differ because the reference point differs, not because the paper is wrong.
Either way the conclusion holds: it is a quasi-helix, not a straight 3-start helix.

### The 430 A vs 45.5 nm scare was not a conflict

8G4L's C-zone repeat is 430 A; our titin super-repeat is 45.54 nm. Caremani 2021
(10.1085/jgp.202012713) resolves it: the thick filament has TWO closely spaced axial
periodicities — 43.1 nm myosin-helical and 45.54 nm with no helical component, the
latter being the titin/MyBP-C super-repeat. Both spec values are right and measure
different things. Over 11 C-zone repeats they drift ~26.8 nm apart.

### Filament diameters: our 15 nm is the BACKBONE, not the envelope

Measured from 8G4L: backbone (tail residues >1100) diameter 14.25 nm; including
heads 32.6 nm. Literature quotes both (~15 and ~30 nm) for different things — do
not "correct" one to the other. Titin sits at 6.85-8.57 nm radius, i.e. essentially
ON the 7.13 nm backbone surface, not floating outside it.

### Actin measured from 6KN7 (human cardiac thin filament, Ca-free, 6.6 A)

  axial rise/subunit 2.756 nm (lit 2.735) ; twist/subunit -166.60 deg (canonical)
  crossover repeat 37.02 nm (lit 36-37, user notes 36-37) ; CA envelope 8.24 nm

TRAP: the crossover is 180 deg of the LONG-PITCH helix, not of the genetic helix.
Computing it from the genetic helix gives a nonsense 59.5 A. Use
n = 180/(180-|twist|) subunits x rise.

New file: data/context_measurements.json — 15 measurements with per-item source and
evidence_class, 5 explicit not_claimed entries.

## Session 15b — Context depiction policy: what we depict, and why not

User direction: record the details of the structures AND the explicit reasoning for
not depicting them. If a detail helps explain titin's role, is cheap, doesn't
distract, or is standard in scientific illustration, include it. A maximally
detailed view is possible later; for now at least note the major geometry.

New: `geometry_strategy.json:context_depiction_policy`. Companion to
`undepicted_declared_domains` (same job, for titin's own domains).

### Four admission tests, applied in order

1. Does it explain titin's role? (primary — can carry a detail alone)
2. Is it resolvable in the view it's read in? (>~4 px/period; <2 px ALIASES)
3. Is it standard in scientific illustration? (absence is itself a distraction)
4. Does it cost more than it returns, or distract?

### Verdicts

ADMIT this pass: myosin head pairs on crowns; quasi-helical crown rotation
(unequal, [32,16,72] deg); thin-filament long-pitch twist (37.02 nm crossover).
DEFER to a maximal pass: actin subunit double-helix; troponin/tropomyosin; cMyBP-C.
PERMANENTLY EXCLUDE: inter-filament superlattice disorder.

### The measurement that decided two of these

Triangle count decides NOTHING here — instancing makes 12540 heads + 28880 actin
subunits ~5.4M triangles across 3 InstancedMesh classes. The binding constraint is
on-screen resolvability. At full-sarcomere scale (1200 px viewport):

  actin subunit rise  2.756 nm -> 1.3 px  ALIASES (below 2 px Nyquist)
  actin crossover    37.02 nm -> 17.8 px  reads fine
  ratio 13.4x

So the thin filament's TWIST is depictable at context scale while its SUBUNITS are
not. These are two separate decisions about the same filament, usually conflated.
Drawing subunits at 1.3 px/period doesn't look small — it generates a moire beat
that is an artifact of sampling, i.e. it actively misinforms.

### Why myosin heads are load-bearing, not decoration

Titin's 3 sectors and myosin's 3-fold crown symmetry ARE THE SAME SYMMETRY, and
titin strands interact with specific crowns (TA with CrH/CrD). A bare cylinder makes
titin's measured sectoring look like an arbitrary modelling choice — it inverts the
model's central claim. Crown ROTATION is admitted because it's ~free (one azimuth
per instance) and because equalising the rotations to 40 deg would invent the
regularity the measurements exclude.

### cMyBP-C: deferred for SCOPE, not geometry

It shares titin's 45.54 nm super-repeat and binds the same C-zone, so it is arguably
titin's story. But 8G4L is CARDIAC and our declared scope is skeletal N2A. Do NOT
port cardiac coordinates across.

### Two guards fired, both correctly — do not "fix" them by relaxing

1. SpecLoader requires every `source`/`sources` value to be a KEY in
   references.json, not prose. My first draft put "8G4L; cross-checked against
   X-ray..." in a `source` field -> 6 validation errors. Fixed by registering 4 new
   refs (10.1007/s10974-023-09642-8, 10.1038/s41586-023-06691-4, PDB:8G4L, PDB:6KN7)
   and moving prose to `source_note`.
2. phase7 test 94 asserted the azimuthal unknown class matches /UNKNOWN/. Amending
   the spec to MEASURED broke it. This was a REAL signal, not a stale test: the spec
   now says MEASURED while the renderer still draws the six-fold schematic.

Resolved by declaring the gap in `RADIAL_TITIN_POLICY.known_divergence_from_measurement`
rather than hiding it, and replacing the test with two stronger ones:
  - if the spec is no longer UNKNOWN, the renderer MUST declare its divergence,
    name the measurement file and source, state why the schematic is retained, and
    the superseded entry must preserve its prior reasoning
  - the declared magnitudes must match a recomputation

TRAP corrected mid-session: I first wrote max_azimuthal_error_deg: 17.2. Computing it
showed the error is a RANGE over the schematic's free (unclaimed) phase — best case
15.0 deg, worst 30.0 deg — because equal 60 deg spacing cannot reproduce a 30 deg
intra-pair gap. Radial error 1.07 nm (TA 8.57 vs rendered 7.5).

Negative controls confirm both new tests bite: removing the declaration -> fail;
falsifying 15.0 -> 5.0 -> fail; restored -> 54/54.

### Gate
136/136 JS tests (was 134; +2), 311 validator checks ALL PASS, neg controls
phase5 fails-as-intended / phase6 7-0 / phase7 31-0, smoke test full SL range OK.

## Session 15c — Is Phase 7 complete? Phase audit against the plan text

User asked whether Phase 7 is complete or whether the new context measurements
require followup, possibly in earlier geometry phases. Answered by reading the plan
verbatim, not from memory: extraction anchored on full `^#{1,3}\s*Phase\s+\d+` headings
and captured the number, because an earlier session's regex silently dropped phases by
matching single digits inside multi-digit ones. 13 phases found (0-12).

**Phase 7 is COMPLETE as specified.** Its own text says "cylinders -> thick and thin
filaments". Everything it names is implemented and gated. The three features admitted
last session (myosin heads, crown rotation, thin-filament twist) go BEYOND that text,
so they are a scope EXTENSION, not a Phase 7 defect. Proposed as Phase 7b — Context
Detail. The plan's cylinder-level simplification was written before we knew the C-zone
was resolved at 6 A; the limiting factor is now the spec text, not the implementation.

The audit did surface five real followup items, written to
`geometry_strategy.json:followup_register` and classified by owning phase. Three fixed
here:

- **PH1-1** (a violation I introduced): all 15 context measurements omitted
  `muscle_type`, which `sarcomere.json:meta.isoform_reconciliation` requires per value
  as the condition for using cardiac numbers at all. Added to all 15 (all cardiac),
  plus `skeletal_transfer`: 4 conserved (actin helical parameters), 11 NOT established
  for skeletal N2A. Those 11 must not be adopted into skeletal geometry — this is
  independently why cMyBP-C and the measured titin azimuths are deferred.
- **PH3-1** (predates this session): `thick_filament_crown_periodicity.encode_as` has
  said "instanced crown markers along thick-filament cylinder" since Phase 3, and no
  crown geometry has ever existed in src/. Nothing validated that a directive is
  realised. Same defect class as the spec/renderer azimuth divergence. Durable fix: a
  validator check that every `encode_as` is realised or declared in
  `unrealised_directives` with a reason and owning item.
- **PH11-1**: `context_measurements.json` was read by no code and validated by nothing,
  and its schema key had drifted from the `titin-<name>-measurements/1` convention.
  Both fixed; 9 new checks over it.

Two remain open: **PH6-1** — the 8G4L/6KN7 numbers were measured ad hoc with a
hand-rolled `_atom_site` parser rather than the gemmi + SIFTS pipeline, two of whose
scripts are still NotImplementedError scaffolds. Method gap, not a bad number: crown
spacing, actin crossover, actin twist and entity composition each corroborate
independently. **PH1-2** — spec crown spacing 14.3 (STRONGLY INFERRED) vs measured
14.44 differ by 0.14 nm, about 1/4 of 8G4L's own 6 A resolution. They AGREE; this is a
possible evidence-class promotion, not a correction.

Three traps worth keeping:

1. **A directive mentioned only in a comment is not realised.** The first version of
   the encode_as check passed the crown directive because `crown` appeared in a prose
   comment in LatticeGeometry.js. Strip comments AND string literals before searching.
2. **Generic structural nouns pass every directive vacuously.** After stripping
   comments the check still passed on the token `thick` — 69 hits across any sarcomere
   renderer, while `crown` had 0. Excluded thick/thin/filament/lattice/titin/domain/etc.
3. **The 3x crown relation cannot guard the substitution.** I first wrote the PH1-2
   guard as 3 x spacing vs the 43.1 nm repeat. 14.3 and 43.1 are INDEPENDENTLY sourced:
   3 x 14.3 = 42.90 and 3 x 14.44 = 43.32 miss 43.1 by 0.20 and 0.22 nm in OPPOSITE
   directions, so no tolerance separates them and the negative control confirmed the
   swap passed. Replaced with a re-sourcing guard: adopting the measured value requires
   citing 8G4L. Uncited swap now fails, cited swap passes.

Gate: 136/136 JS tests, 328 validator checks (up from 311), phase-5/6/7 negative
controls behave as designed, 3 new negative controls confirm the new checks bite.

---

# Session 10 — Phase 9 (Primary Implementation Stack)

Phase 9 asked for a biological API over Three.js, Python for coordinate work, and
Blender only where it adds value. **Blender was not needed** — see the closing note.

## What was built

A two-layer API in the plan's own vocabulary. All seven names the plan specifies now
exist and are gated by a test that fails if any is renamed:

* headless (`src/api/titinApi.js`) — `createSarcomere`, `createTitin`,
  `createTitinPath`, `createDomainChain`, `placeDomainsAlongPath`, plus
  `describeLength` / `regionOfDomain`. Answers biological questions with numbers; no
  Three.js import.
* Three.js-facing (`src/api/TitinVisualization.js`) — `setSarcomereLength`,
  `setStructuralState`, and component visibility. The only place those numbers meet
  the renderer.

`setComponentVisibility` was added to `SarcomereScene` as a real feature (Phase 10
requires it) after the alternative was caught: build-time flags `showFilaments` /
`showTitin` that **no code read**, so an "isolated titin" view would silently still
draw filaments — the PH3-1 defect class. Visibility is applied to the BUILT tree, not
by rebuilding from a reduced component set, because titin's A-band segment is anchored
relative to the thick filament and re-deriving without it could MOVE titin. Hiding
changes what is drawn, never what is claimed.

## Three defects the tests found in their own author's work

1. **Unknown option keys were silently ignored.** The test suite was written with
   `sarcomereLength` where the API takes `sarcomereLengthNm`. The facade ignored the
   misspelling and fell through to its "neither length nor state supplied" refusal —
   meaning a caller who asked for a specific length could be shown a *different* one
   with no error. Unknown keys are now a hard refusal that names the near-miss. Each
   entry point declares its own extra accepted keys so the length vocabulary stays
   defined in one place.
2. **P9-01 — `index.html` restated the evidence vocabulary.** A hardcoded five-class
   list predating `MODELED` sorted a modelled claim into `UNKNOWN` — four rungs too
   weak, in the one panel whose job is reporting evidence class. Latent (no manifest
   value carries MODELED yet), so it would have activated silently. The page now
   imports `EVIDENCE_CLASSES`; a gate forbids any array literal in the page from
   enumerating classes and was negative-tested by reintroducing the original list.
3. **P9-02 — the validator checked data that did not exist.** 10 checks over
   `mechanical_model.json.isoform_scope` and `.cross_isoform_plausibility_check` were
   saved while the blocks they check were not, and the saved artifacts were
   byte-identical to the working copies — so the saved project state was internally
   inconsistent and the validator failed from a clean checkout. The content had
   survived only in the prose of `figures/phase8_partition_correction.md`.

## The trap in fixing P9-02

Reconstructing by transcription would have baked in a wrong solver convention. An
independent reimplementation gave 7.853 pN where the prose said 7.911 — because
`mechanical_model.py` floors N2A at `rigid_nm` and gives the coil `Lc - rigid_nm`,
not the full `Lc`. Every restored number was re-derived with the reference
implementation the validator itself imports: the SL 2.90/2.95/3.00 um table
(7.911 / 9.052 / 10.359 pN), the isoform force sensitivity
(10.4 -> 14.6 -> 25.8 -> 67.2 pN as PEVK contour falls 542.1 -> 450 -> 350 -> 240 nm),
and the exactly-zero spread of fractional extension across contour lengths.

**A validator and the data it validates must be saved together, or the pass is not
reproducible.**

## Python role: already discharged, and the stubs now say so

Phase 9 assigns Python principal-axis calculation and primitive fitting. Both were
already implemented in `measure_structures.py` (PCA via `eigh`; capsule AND ellipsoid
fitted per chain with enclosure fractions against the heavy-atom cloud), with the
per-class choice and its rationale recorded by `adopt_measurements.py` and a <95%
enclosure refused by `StructuralProxies.validate()`. `fit_geometry.py` and
`generate_proxy.py` were rewritten to state this and to warn that adding a second
fitting path over the same coordinates would create two answers with no way to say
which is authoritative. The mesh half stays unimplemented deliberately: the fitted
primitives are three-to-four-number capsules and ellipsoids that Three.js builds
procedurally, so a GLB would be a second encoding able to drift from the validated one.

## Blender

Not required, and not a gap. Its Phase 9 uses are inspecting complex structures,
cleaning a difficult proxy, visual proxy-vs-source comparison, and offline renders.
Nothing here needs them: the proxies are analytic primitives whose fidelity is
measured numerically (enclosure fraction) rather than judged by eye, and the plan
requires Blender never be needed to build, run, or modify the MVP.

Gate: **217 JS tests** (24 new in phase9.test.js), **458 validator checks**, TypeScript
strict on `src/` at **zero diagnostics**, all 10 spec files parse, `npm run verify`
exits 0. Region extension across the modelled range stays non-uniform
(prox_Ig x2.98, N2A x4.33, PEVK x53.24, dist_Ig x2.98) — uniform scaling would make
these equal.

---

# Session 11 — Post-Phase-9 review (blank page diagnosis)

User report: "the index.html doesn't show anything besides the legend and slider."

## The diagnosis, and why it is not deferred Phase 10 work

Not normal, and not deferred. The symptom is the signature of the ES module never
executing. The panel `h2` headings, the sub-text, and the bare `<input type="range">`
are STATIC markup and render with zero JavaScript; the canvas and all ten JS-filled
containers stay empty. So "only headings and a slider" is precisely what a
non-executing module looks like.

Code defects were ruled out before delivery was suspected:

* Phase 9 `setComponentVisibility` starts with an empty `hidden` set, defaults every
  button to `on`, and only mutates objects matching a component predicate.
* The importmap, `node_modules/three` 0.185.1, and the `three/addons/` mapping all
  resolve; all 15 reachable modules and 10 spec files exist.
* Every method the page calls on `model` / `viewer` / `viewer.sarcomere`, and every
  imported name, resolves against the real classes in Node.
* Building with exactly the options the page passes on first paint: 21 drawables,
  0 invisible, 0 effectively transparent, finite 2250 nm bbox.

The real defect (P9-03) was that the page could not TELL the reader any of this. Its
only error surface is `fail()`, which writes into `#err` from inside the very module
that had not run. Both ordinary causes fail exactly this way and report only to the
devtools console: opening the page as a `file://` URL (same-origin policy blocks both
module resolution and the `fetch()` of `data/*.json`), and serving from the wrong
directory (404s on `./data` and `./node_modules`).

## Fix

A boot diagnostic as a CLASSIC (non-module) script — load-bearing, because a module
cannot report its own failure to load. It detects `file://` up front, listens for
resource errors in CAPTURE phase (they do not bubble), catches unhandled rejections
from the spec fetch, and writes a plain-language cause plus the correct serving
commands into the visible `#err` box. `npm run serve` added.

`window.__titinBoot.ready`, set AFTER `viewer.start()`, arms a 6 s watchdog. Both
placements matter: a false alarm in an error channel is as damaging as a missed one,
and a signal set BEFORE `start()` would mask a failure in `start()` itself. The flag
assignment is guarded (`if (window.__titinBoot)`) so a blocked classic script cannot
throw at the end of an otherwise-working page.

Gated twice — a source gate, and a RUNTIME gate that extracts the classic script and
executes it against a fake DOM under three scenarios: `file://` (fires, names the
remedy), 404 (fires, names the failed resource), healthy (stays silent). All three
failure modes were negative-tested by reintroducing them: removing the success signal,
moving it before `start()`, and redirecting output away from `#err` each make the
suite fail.

## Also found

* **P9-04 (open, Phase 10)** — `TitinVisualization` has no importer outside
  `test/phase9.test.js`; `index.html` still drives `Viewer`/`SarcomereScene` directly.
  The isolated titin detail view exists in the API and is asserted headlessly but has
  never been rendered in a browser. Left for Phase 10, where "smooth navigation
  between scales" is specified.
* **P9-05 (open, Phase 10)** — Phase 9 lists "annotations" but no sprite, canvas
  texture, text geometry, or HTML-overlay label mechanism exists anywhere in
  `src/render/` or `src/api/`. Residual constraint: a label must never render over
  UNKNOWN geometry without carrying that class.
* `describeLength(model, sl)` takes a bare number while every neighbour takes an
  options object. Intentional, but it printed `[object Object]`; the diagnostic now
  names the fix. Found by making the mistake.

## Correction to the session-10 log

Session 10 reported "458 validator checks". The true figure is **457** discrete
checks — the earlier count matched the trailing "ALL CHECKS PASSED" banner as well.

## Gate

221 JS tests (4 new), 457 validator checks, tsc strict on `src/` at 0 diagnostics,
`npm run verify` exits 0. End-to-end: extension is confined to the I-band
(PEVK x53.24, N2A x4.33, prox_Ig / dist_Ig x2.98) with Z-disc, A-band, kinase and
M-line all at x1.00 — titin is inextensible where it is bound.

## Residual — honest limitation

The page could not be observed directly. This sandbox refuses socket binds
(`PermissionError` on `bind`) and headless Chrome aborts, so NO browser screenshot
backs any of this up. Scene-correctness evidence is headless Node; diagnostic evidence
is a fake-DOM execution of the real extracted script. A browser check is a Phase 11
validation item.

---

# Session 12 — The blank page, root-caused: a single-file viewer has no siblings

User report: the boot diagnostic (added session 11) fired in the Claude Science
artifact viewer, showing the watchdog message and "Browser reported: unknown error";
the user asked whether opening index.html directly explains it.

## The diagnosis

Yes — and the diagnostic's own wording pinned it down. It showed the **watchdog**
branch, NOT the `file://` branch. That distinction is the diagnosis: the protocol was
not `file:`, so the page WAS being served. It was served as a lone HTML file with no
sibling directories, so every relative request 404s — the import map's
`./node_modules/three/build/three.module.js` and SpecLoader's seven `./data/*.json`.

This is not a user error and not deferred Phase 10 work. `index.html` is structurally
incapable of working in a single-file viewer, and session 11's advice ("serve it over
HTTP") was incomplete: a viewer offers no directory to serve. The development layout
is still correct — the code the browser runs is byte-identical to what `node --test`
verifies — so index.html is unchanged. What was missing was a DERIVED artifact.

## What was built: titin_standalone.html (1.51 MB, zero network requests)

`scripts/build_standalone.mjs` + `npm run build:standalone`. esbuild bundles the
page's entry modules into one ordinary ES module (three r0.185.1 inlined from the same
node_modules the tests run against); the 7 spec files are embedded as a frozen object
served by a reader satisfying the same `fetchJson(name) -> Promise<object>` contract
`browserReader` implements, so **SpecLoader is untouched and cannot tell the
difference**. The boot diagnostic's serve-over-HTTP advice is suppressed, since that is
exactly the wrong instruction for a file needing no server.

Anti-drift by construction: entry modules are discovered by following imports from
index.html, and the spec list is read from SpecLoader's own manifest — neither is
restated in the builder.

## Two real corruption bugs, caught before shipping

**The `$&` splice.** The first bundle had a stray `</script>` in its payload. Cause:
`three.module.min.js` contains `roughnessMapUv:$&&E(...)` because its minifier named a
variable `$`. In the STRING form of `String.replace`, `$&` means "insert the match" —
so passing the assembled bundle as a replacement string spliced the ENTIRE original
page module into the middle of Three.js. Output was 1.19 MB and looked plausible.
Fixed by routing every replacement through the function form (`lit()`), where `$` is
ordinary, with the reasoning recorded in the script so it is not silently reverted.

**Unescaped `<`.** `JSON.stringify` does not escape `<`, so any embedded source
containing `</script>` would end the HTML element early. Rather than rely on no source
ever containing it, `<` is escaped as `\u003c` unconditionally (plus U+2028/U+2029,
legal in JSON but illegal raw in a JS string literal).

The builder now refuses to emit output it cannot vouch for: script-element balance,
absence of the splice signature, no surviving `./data/` or `node_modules/` reference.

## A clever approach abandoned for an ordinary one

The first builder hand-rolled module loading: one `blob:` URL per module, a custom
resolver, specifiers rewritten in dependency order, nothing transpiled. It executed
correctly under a Node simulation (`data:` URLs standing in for blobs) — three r185 and
OrbitControls both loaded, the model built, the scene produced 8 drawables over a
2250 x 45 x 45 nm box. It was still **replaced with esbuild**, because blob:-URL module
graphs vary across browsers and CSP settings and none of that is verifiable in this
sandbox. Preferring the widely-exercised mechanism over the clever one is the right
trade when you cannot test the clever one.

## Verification (231 tests, 457 validator checks, tsc 0, `npm run verify` exit 0)

`test/standalone.test.js` (10 tests) rebuilds the file each run, so it can never pass
against a stale artifact, and verifies the SHIPPED file rather than the builder's
intentions — extracting the inlined bundle from the HTML and executing it:

* embedded spec matches `data/` byte-for-byte by sha256, all 7 files;
* every spec file the loader requests is embedded (discovered from SpecLoader);
* model + scene build from the shipped file alone at 1900/2200/3000 nm;
* the I-band layout is **identical to the served page** at 1900/2200/2400/3000 nm;
* extension stays non-uniform (PEVK x53.24, N2A x4.33, Ig x2.98) — the guard against
  uniform scaling creeping in;
* HTML script-element balance and the `$&` splice signature;
* the builder refuses when a referenced spec file is absent (negative-tested).

A fake-DOM execution of the standalone's real module body reached
`new WebGLRenderer` — i.e. Three.js loaded from the inlined bundle and the model built
from embedded specs — and failed only there, which is the expected no-GPU-in-Node
outcome. The harness threw on any `fetch` attempt; none occurred.

One negative test initially failed to trip the builder's guard. The cause was
informative rather than a defect: spec discovery is REDUNDANT (the manifest and the
loader's field assignments both yield the 7 names), so emptying `SPEC_FILES` alone does
not shrink the set. The test was rewritten to reference a nonexistent spec file, which
does bite, and the redundancy is now asserted deliberately.

## Still open (historical session-12 snapshot)

P9-04 and P9-05 were open at this point in the chronology. Both were resolved by the
2026-08-01 Phase 9 completion audit recorded at the end of this file.

---

# Session 13 — "you can't zoom in close enough": the geometry was there, the camera couldn't reach it

User report: the standalone works (first success report in the project), followed by
two questions — is it the same as index.html, and can we have a close-up view, since
zoom appears insufficient to see the myosin heads and the twisted actin.

## First move: check whether the geometry exists before promising a view of it

It does. `ContextDetail.js` already builds myosin head pairs on helically arranged
crowns (rod-plus-head morphology, IHM folded-back skeleton) and the thin-filament
long-pitch twist (crossover repeat, drawn without subunits). `CONTEXT_DETAIL_POLICY`
declares exactly that, and declares what is NOT claimed: actin subunit positions,
troponin/tropomyosin, cMyBP-C. A user-facing toggle ("myosin heads + twist") already
existed in the page. So the request was never for missing geometry — it was a camera
problem, and that reframing is what made the diagnosis quick.

## Root cause 1 (P10-01): the near plane was a hard floor on approach

`frame()` computed `camera.near = max(1, distance - radius*2)` ONCE, from the
whole-sarcomere bounding sphere, and never updated it. The numbers:

    fov 35, scene radius 1125 nm
    framing distance = 4302 nm
    camera.near      = 2052 nm   <- frozen here

A dolly reduces the camera-to-target distance but left `near` at 2052 nm, so any
approach closer than 2052 nm put the entire scene behind the near plane. The
structure did not get closer; it disappeared. And `OrbitControls.minDistance` /
`maxDistance` had never been set at all.

Fix: `_updateFrustum()` derives `near = max(0.1, 0.02 * currentOrbitDistance)` and a
far that still clears the structure, called EVERY FRAME before render. A structure
spanning 2250 nm and a feature spanning 14.3 nm cannot share one fixed frustum;
tying near to distance holds depth precision constant at every scale.
`minDistance = 3` nm (a myosin head is ~19 nm), `maxDistance = 20000` nm.

## Root cause 2 (P10-02): the orbit centre is the one place heads do not exist

`frame()` targets the bounding-box centre — X=1100 nm at SL=2200, which is the
M-line, inside the head-free bare zone. The overlap zone (where crowns and heads
live) is 300–1020 nm. So a dolly moved the user AWAY from the heads toward the one
axial region that has none. Two independent defects compounding: approach was
forbidden, and what it approached was empty.

## The close-up vocabulary (P10-03)

Six presets in `CLOSEUPS`. Two design rules, both load-bearing:

* **Landmarks are FUNCTIONS of the geometry, never constants.** The I/A junction sits
  at X=150 nm contracted and X=700 nm extended. A hardcoded X would aim at empty
  space at other lengths. Verified: five landmarks move >50 nm across the range,
  and the Z-disc correctly does not move (it is the origin).
* **Distance is SOLVED from a declared span**, `(spanNm/aspect/2)/tan(fov/2)`, not
  tuned by eye — so the same preset shows the same physical span on any viewport.

`closeUp()` returns the measurement that justifies the view (span shown, crown
spacing px, crossover px, threshold), so the panel displays evidence rather than
asserting "this is a close-up". Measured across the six presets: crown spacing
66–191 px, crossover repeat 171–494 px, against the 2 px aliasing threshold.

The crown preset aims 35% into the overlap zone; the twist preset aims at the I-band
side of the junction, where no thick filament occludes the helix; `lattice` is
near-axial for the hexagonal cross-section.

## Two UI ordering decisions, both recorded in the source

1. Selecting a close-up forces `showContextDetail` ON — a close-up on the crown array
   with that layer off shows a bare cylinder and reads as a rendering failure.
2. The camera moves BEFORE the rebuild. The aliasing gate reads the CURRENT view
   width, so rebuilding first would evaluate it against the wide shot and leave the
   heads withdrawn. Choosing a wide framing clears the close-up selection, since
   leaving it highlighted would claim the camera is somewhere it is not.

## Two of my own probes were wrong, and both were informative

* `sceneAt(sl, {rings: 2})` returned a descriptor with NO lattice, so the detail
  report came back null and it looked like the layer was broken. `sceneAt(sl)` takes
  no options; it is `contextSceneAt(sl, {rings})` that carries the lattice, and the
  crown branch lives inside `if (lat)`. The page was always calling it correctly.
  The test now uses the same path the page does, with that mistake noted in place.
* A depth-precision test asserted `far/near <= 1000`, a bound I guessed rather than
  derived. It failed at the crown preset (1942) — but computing the physically
  meaningful quantity showed that view has 0.14 nm depth resolution at the
  background. The bound was arbitrary, so the test was rewritten to assert depth
  resolution finer than 1 nm (features are 14–19 nm). Weakening the assertion would
  have been wrong; so would have breaking the far-plane requirement to satisfy it.

## Answering the first question: is the standalone the same as index.html?

Yes, and it is DERIVED, which is the important part — I had to rebuild it or the
close-ups would not be in it. `npm run build:standalone` regenerated 1.52 MB and the
presets appeared automatically, because entry modules are discovered by following
imports and nothing is restated in the builder. Editing `geometry_strategy.json` for
the register also required a rebuild, since the standalone embeds the specs by
sha256 and `standalone.test.js` would have caught the drift.

## Gate

243 tests (231 + 12 new), 457 validator checks, tsc strict 0, `npm run verify` exit 0,
ALL CHECKS PASSED.

## Still open (historical session-13 snapshot)

P9-04 and P9-05 were open at this point in the chronology. Both were resolved by the
2026-08-01 Phase 9 completion audit recorded below. N2A/PEVK-specific interaction is
Phase 10 work and is not a Phase 9 completion condition.

---

# 2026-08-01 — Phase 9 completion audit

Phase 9 is complete. This audit reconstructed the canonical source tree, made the
environment reproducible, hardened the biological API boundary, connected the page
to the supported facade, implemented evidence-aware annotations, and replaced the
structural-coordinate scaffolds with an executable Gemmi/NumPy pipeline.

## Completion conditions closed

- **P9-04:** `index.html` now instantiates and controls `TitinVisualization`; the
  page no longer bypasses the public facade with a direct `Viewer` construction.
- **P9-05:** context and titin-detail annotation descriptors include model-coordinate
  anchors, target identifiers, evidence classes, claim-level evidence, sources, and
  explicit non-claims. The scene renders corresponding Three.js marker sprites and
  the page exposes readable annotation text.
- **P9-06:** headless lengths are strictly range-checked; the interactive facade is
  the only clamping boundary and reports the requested/applied values.
- **P9-07:** caller-supplied paths must be the complete canonical curve in canonical
  order. Missing, reordered, shifted, malformed, and uniform-resampling attempts are
  refused.
- The Phase 8 force-balanced partition is the default for intermediate lengths and
  is labelled `MODELED`; the committed keyframes remain available explicitly as the
  `keyframe` reference/audit mode, with the interpolation caveat disclosed in the UI.
- Exact JavaScript and Python dependency versions are recorded in `package-lock.json`
  and `requirements.txt`; `npm ci` plus a fresh virtual environment reproduces the
  supported toolchain.

## Gate

`npm run verify` exits 0: strict production-source TypeScript analysis has zero
diagnostics; **227/227** Node tests pass; all 46 runtime negative controls pass
(9 Phase-5, 7 Phase-6 JavaScript, 8 Phase-6 specification, and 22 Phase-6 review);
geometry and specification validators report `ALL CHECKS PASSED`; and the offline
structural-coordinate smoke test reports `structure pipeline smoke: PASS`. The
committed standalone artifact is byte-compared with a fresh in-memory build, so the
gate cannot pass against stale embedded code or data and does not conceal drift by
rewriting the artifact during verification.

The complete optional coordinate cache also passes its independent integrity gate:
`npm run check:structures` verifies **29/29** URL/byte/SHA-256-pinned files. Re-running
the three coordinate measurement programs reproduced the committed JSON byte for
byte (`03831e…` structure, `8129a9…` interdomain, `d5634c…` context). This includes the
corrected actin-only axis fit for 6KN7 and the manifest-pinned 8G4L SIFTS input.

The test files intentionally exercise invalid calls and loosely shaped fixtures, so
there is no misleading `typecheck:tests` release script. Runtime negative tests are
the authoritative gate for those cases; strict static analysis remains mandatory for
all production modules.

## Rendered browser validation

The served page was rendered in the in-app Chromium browser on 2026-08-01. The
1900/2200/2400/3000 nm presets each updated the slider, half-sarcomere metrics,
overlap, d10 spacing, and annotation anchors without a boot or error-panel entry. A
free 2350 nm slider state produced a 1175.0 nm half-sarcomere. All six close-ups
(`crowns`, `twist`, `junction`, `zdisc`, `mline`, and `lattice`) produced a nonempty
1920×1440 WebGL canvas and a geometry-derived target/readout. Isolated-titin mode
rendered all eight named regions with evidence class, coordinate anchor, and source
text. A final browser audit also verified that switching from a context close-up to
isolated titin clears and disables context-only close-ups, and that the evidence and
non-claim panels omit hidden sarcomere components. The served page and portable build
both produced an empty browser warning/error log.

This supersedes the earlier chronological notes saying that no real browser had
rendered the project.

The freshly rebuilt `titin_standalone.html` was also rendered independently: it
started at 2200 nm with a nonempty 1920×1440 WebGL canvas, seven geometry rows, four
context annotations, and no boot or error-panel entry. Its final SHA-256 is
`d8917611c61e49e817e5b023b23f3167bce9ec75bbbbc54e35e96ccf108882bb`.

---

# 2026-08-01 — Root standalone and GitHub Pages deployment closure

The editable page and deployable artifact now have unambiguous roles:

- `src/index.template.html` is the reviewed page source.
- Root `index.html` is the generated, self-contained application and the only
  browser-facing deliverable.
- `npm run build` regenerates it; `npm run check:build` byte-compares it with a
  fresh build and fails on drift.

The generated file embeds Three.js, application modules, and every scientific JSON
record. Its boot guard explicitly permits `file://` only when the builder's
`__titinStandalone` marker is present, retaining the visible failure diagnostic for
an accidentally opened unbundled source page. Therefore the same committed root
file can be double-clicked, served locally, or published from a GitHub Pages branch
root without `node_modules`, a deployment workflow, or a second filename.

The former `titin_standalone.html` is superseded by root `index.html`; retaining two
equivalent generated entry points would recreate the drift risk this change removes.

## Gate

`npm run verify` exits 0 with **228/228** Node tests passing, strict type analysis
clean, both scientific validators reporting `ALL CHECKS PASSED`, all negative
controls passing, and the structural-coordinate smoke test passing. The standalone
suite executes the generated page's real classic boot scripts under `file://` and
proves that the marker suppresses the source-only rejection while preserving the
healthy watchdog path.

The root page also rendered from a plain static HTTP server with one nonempty
1920×1440 WebGL canvas, seven metric rows, no visible error panel, and no browser
warnings/errors. Changing to the 2400 nm preset updated the live readout. The server
received only the root HTML request, confirming that the deployed page made no
requests for `node_modules`, `src`, or `data` siblings.

---

# 2026-08-01 — Phase 10 Browser Experience completion

Phase 10 is complete. Every capability named in `MASTER_PLAN.md` is present in the
supported generated application: explicit orbit/zoom/pan; sarcomere context and
single-molecule isolated-titin scales; interruptible smooth navigation; the three
named biological presets plus continuous 1 nm length control; coordinate-anchored
structural labels; canonical titin-region highlighting/focus; truthful component
visibility; and an optional confidence display.

## Completion decisions

- The eight Level-0 titin regions are distinct tubes with exact canonical axial
  boundaries. Level-1 points shape their interiors. A planar surface clamp removes
  only TubeGeometry radius overhang at an oblique end ring; no path or domain
  coordinate moves.
- Selection colour and evidence opacity are independent channels. Folded domains
  retain archetype/evidence `InstancedMesh` batching and receive per-instance
  colours. N2A and PEVK path selection creates no false folded domains.
- Region selection persists through sarcomere-length, scale, and zoom-LOD rebuilds.
  Continuous length changes refocus the newly solved canonical span and continue to
  show the interpolation caveat.
- Isolated titin is one Z-disc-to-M-line molecule: lattice/context detail and
  mirroring are forced off, while domain detail is forced on. The corresponding
  controls expose those effective states and are disabled rather than accepting
  misleading no-op input.
- Camera moves use a 650 ms symmetric cubic transition, yield immediately to direct
  manipulation, and honor live `prefers-reduced-motion` changes. Visible-only scene
  bounds keep hidden context geometry from contaminating isolated-titin framing.
- Component visibility updates the public state report, evidence list, legend, and
  built-versus-hidden metrics. LOD-triggered rebuilds refresh the same readout.
  Fixed-size screen-space annotation markers stay legible at whole-sarcomere and
  region-focus scales.

## Automated gate

`npm run verify` exits 0. Root `index.html` is current against its source/data inputs;
strict production type analysis reports zero diagnostics; **240/240** Node tests
pass; all Phase 5/6 negative controls pass; both scientific validators report
`ALL CHECKS PASSED`; and the Gemmi/NumPy structural-coordinate smoke pipeline passes.
The 12 Phase-10 tests additionally guard plan-capability coverage, exact region
boundaries, geometry/evidence invariance under highlighting, disordered-region
honesty, selection persistence, component-report synchronization, fixed-size
markers, LOD readout refresh, camera motion/reduced motion, visible-only detail
framing, and accessible page wiring.

The final generated artifact is 1,692,922 bytes with SHA-256
`43373ecda9ad8250be8e61045b21d67d823757f25bcecf16b322dcdb5babfee7`.

## Rendered browser validation

The generated root page was served and exercised in the in-app Chromium browser.
It produced one nonempty 1920×1440 WebGL canvas at a 960×720 CSS viewport, eight
region controls, four state presets, no visible error panel, and no browser warnings
or errors. Isolated mode reported one titin strand and all 285 folded domains;
context-only controls and components exposed their disabled/off states.

Selecting PEVK highlighted and focused its canonical path, then a continuous move to
2350 nm updated its live span from 25.8 to 55.7 nm and showed the explicit
resting-to-stretched interpolation disclosure. The selection survived scale changes;
the optional confidence panel toggled its pressed/hidden state; and hiding the thick
filament removed its evidence and legend entry while changing its metric to
`built … (hidden)`. Final visual inspection confirmed that screen-space annotation
markers remain approximately 20 px rather than expanding into molecule-obscuring
squares at region focus. Three reloads generated only three root HTML requests,
confirming the standalone made no sibling `src`, `data`, or dependency requests.

This record supersedes all earlier chronological notes that describe Phase 10 as
open or partially complete. Phases 0–10 and Milestones 0–6 are complete. Under the
final project scope recorded in `MASTER_PLAN.md`, Phases 11–12 are optional future
extensions and intentionally excluded; there is no remaining required phase.

---

# Showcase sequence complete (session 2026-08-07, SC-17)

This record supersedes every earlier note that describes any showcase package as
open. **SC-0 … SC-17 are complete**: the ten packages of
`SHOWCASE_COMPLETION_PLAN.md` §7 and the eight sprints of
`docs/superpowers/plans/2026-08-05-titin-showcase-dual-audience.md`. Nothing
beyond SC-17 is planned anywhere in the repository; a further sprint would have
to be newly authored.

## Automated gate

`npm run verify` exits 0: **471/471** Node tests (serially — the `test` script
now carries `--test-concurrency=1`, which SC-17 fixed because `verify` chains
it), zero TypeScript diagnostics under `strict` + `checkJs`, `index.html` and
`release/` both current against their inputs, four negative-control suites (18
SC-0 mutations, presentation, showcase release, 24 release-gate mutations), all
five scientific validators, the 52-cell capture matrix well formed, and the
Gemmi/NumPy structural smoke pipeline.

The committed artifact is 2,166,361 bytes. SC-17 rebaselined
`data/release_gates.json` → `performance.baseline` from the SC-7 figure to that
number, which moves the derived size ceiling from 2,385,847 to 2,599,633; the
ceiling is computed from that record and written down nowhere else.

## Outstanding work

None of it is code. Ten of the 56 recorded gate checks are outstanding, and
every one needs a person, a WebGL browser, or the presenting hardware:

| Gate | What it needs | Blocks |
|---|---|---|
| `visual_matrix` | 52 cells captured from the standalone build at four viewports, then reviewed by a person including colour-vision and grayscale | conditions `titin_continuity`, `lattice_legible` |
| `lay_comprehension` | ≥3 independent non-specialists, 5 questions, 4 scored, ≥80% correct, no coaching | condition `novice_comprehension` |
| `expert_review` | ≥1 muscle or titin specialist, 7 questions, no unresolved CRITICAL finding | condition `expert_clear` |
| `demo_rehearsal` | 6 checks on the presenting machine and display; `release/PREFLIGHT.md` is the script | condition `rehearsal_and_fallback` |
| `accessibility.text_zoom` | labels legible at 200% browser zoom | the accessibility section |
| `performance.target_hardware` | the real browser, GPU and projector | the performance section |

Before spending a reviewer's time, two LLM personas were driven through the
deployed build against those same two protocols. Their findings — one critical
data error, five major, and three shipping presentation defects, each marked
verified or unverified — are in `SHOWCASE_PREREVIEW_FINDINGS.md`. That document
is **not** either gate and nothing from it has been recorded here; both gates
still require the people the record names.

Eight of the twelve final release conditions already pass. `release_ready` stays
`false` until all six rows above are recorded, and
`scripts/validate_release_gates.py` refuses a PASS that is not backed by
recorded evidence — participant answers, named reviewers, captured cells — so
none of this can be claimed rather than done.

Optional and deliberately not scheduled: `SHOWCASE_COMPLETION_PLAN.md` Tier C,
the unshipped Tier B explainers (N2A interaction hub, titin-kinase/M-region,
mechanotransduction, length-dependent thick-filament activation), the §8
thin-filament regulation extension — never admitted — and `MASTER_PLAN.md`
Phases 11–12.
