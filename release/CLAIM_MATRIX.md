# Claim and evidence matrix

Generated from `data/showcase_claims.json` — build `7cc1c8d0ad9c`.
Do not edit by hand: run `npm run pack`.

| Object | Decision | Tier | Claim evidence | Render evidence | Sources |
| --- | --- | --- | --- | --- | --- |
| **Reference scope and state badge**<br>`scope_badge` | ADMIT | A | MEASURED | SCHEMATIC | [UniProt Consortium (2024) · UniProtKB](https://www.uniprot.org/uniprotkb/Q8WZ42/entry)<br>`data/structural_states.json` |
| **Continuous Z-disc-to-M-band titin path**<br>`titin_continuity_trace` | ADMIT | A | STRONGLY INFERRED | SCHEMATIC | [Fürst, Osborn, Nave, and Weber (1988) · Journal of Cell Biology](https://doi.org/10.1083/jcb.106.5.1563)<br>[UniProt Consortium (2024) · UniProtKB](https://www.uniprot.org/uniprotkb/Q8WZ42/entry) |
| **I-band spring regions and A-band scaffold**<br>`titin_region_architecture` | ADMIT | A | MEASURED | SCHEMATIC | [UniProt Consortium (2024) · UniProtKB](https://www.uniprot.org/uniprotkb/Q8WZ42/entry)<br>[Bennett et al. (2020) · J Mol Biol](https://doi.org/10.1016/j.jmb.2020.06.025) |
| **Regional I-band extension**<br>`regional_extension_story` | ADMIT | A | MODELED | MODELED | [Trombitás et al. (1998) · Journal of Cell Biology](https://doi.org/10.1083/jcb.140.4.853)<br>`data/mechanical_model.json` |
| **Live Z-disc, I-band, A-band, C-zone, bare-zone, and M-band brackets**<br>`band_and_zone_brackets` | ADMIT | A | STRONGLY INFERRED | SCHEMATIC | `data/sarcomere.json`<br>`data/structural_states.json` |
| **Scoped Z-disc actin/α-actinin network**<br>`zdisc_local_network` | ADMIT_SCHEMATIC | A | MEASURED | SCHEMATIC | [Wang et al. (2021) · Cell](https://doi.org/10.1016/j.cell.2021.02.047) |
| **α-Actinin crosslink doublets**<br>`zdisc_alpha_actinin_doublets` | ADMIT_SCHEMATIC | A | MEASURED | SCHEMATIC | [Wang et al. (2021) · Cell](https://doi.org/10.1016/j.cell.2021.02.047) |
| **Titin Z1Z2–telethonin sandwich**<br>`zdisc_telethonin_sandwich` | ADMIT_SCHEMATIC | A | MEASURED | SCHEMATIC | [Zou et al. (2006) · Nature](https://doi.org/10.1038/nature04343) |
| **Universal regular Z-disc lattice**<br>`universal_zdisc_lattice_icon` | OMIT | A | UNKNOWN | UNKNOWN | [Wang et al. (2021) · Cell](https://doi.org/10.1016/j.cell.2021.02.047)<br>[Burgoyne et al. (2015) · J Mol Biol](https://doi.org/10.1016/j.jmb.2015.08.018) |
| **Central head-free bare zone**<br>`bare_zone_head_absence` | REPLACE_CURRENT | A | STRONGLY INFERRED | SCHEMATIC | [Caremani et al. (2021) · J Gen Physiol](https://doi.org/10.1085/jgp.202012713)<br>`data/sarcomere.json` |
| **M-band midpoint and crosslink context**<br>`mband_midpoint_and_crosslinks` | REPLACE_CURRENT | A | STRONGLY INFERRED | SCHEMATIC | [Wang et al. (2021) · Cell](https://doi.org/10.1016/j.cell.2021.02.047)<br>[Obermann et al. (1996) · Journal of Cell Biology](https://doi.org/10.1083/jcb.134.6.1441)<br>[Sauer et al. (2010) · EMBO Reports](https://doi.org/10.1038/embor.2010.65) |
| **M1 density**<br>`mband_m1_density` | OMIT | A | UNKNOWN | UNKNOWN | [Tamborrini et al. (2023) · Nature](https://doi.org/10.1038/s41586-023-06690-5) |
| **Optional skeletal MyBP-C C-zone context**<br>`mybpc_czone_context` | ADMIT_SCHEMATIC | B | MEASURED | SCHEMATIC | [Hessel et al. (2024) · Nature Communications](https://doi.org/10.1038/s41467-024-46957-7) |
| **Orthographic myofilament lattice comparison**<br>`lattice_cross_section` | ADMIT | A | MODELED | MODELED | [Irving, Konhilas, de Tombe et al. (2000) · Am J Physiol Heart Circ Physiol](https://doi.org/10.1152/ajpheart.2000.279.5.h2568)<br>`data/sarcomere.json` |
| **Object-linked explanations and sources**<br>`object_linked_tooltips` | ADMIT | A | SCHEMATIC | SCHEMATIC | `data/showcase_claims.json`<br>`data/references.json` |
| **N2A interaction-hub expert card**<br>`n2a_interaction_hub_card` | ADMIT | B | MEASURED | SCHEMATIC | [Zhou et al. (2021) · J Mol Biol](https://doi.org/10.1016/j.jmb.2021.166901)<br>[Lanzicher et al. (2020) · Front Physiol](https://doi.org/10.3389/fphys.2020.00173) |
| **Titin kinase/M-region expert card**<br>`titin_kinase_card` | ADMIT | B | MEASURED | SCHEMATIC | [UniProt Consortium (2024) · UniProtKB](https://www.uniprot.org/uniprotkb/Q8WZ42/entry)<br>[This project (Phase 6 pipeline) (2026) · Derived measurement](https://www.rcsb.org/structure/1TKI) |
| **Proposed length-dependent activation context**<br>`length_dependent_activation_card` | ADMIT | B | INFERRED | SCHEMATIC | [Hessel et al. (2024) · Nature Communications](https://doi.org/10.1038/s41467-024-46957-7) |
| **Troponin/tropomyosin regulatory layer**<br>`thin_filament_regulation_layer` | DEFER | C | MEASURED | UNKNOWN | [Yamada, Namba, and Fujii (2020) · Protein Data Bank](https://doi.org/10.1038/s41467-019-14008-1) |
| **Evidence-to-render provenance explainer**<br>`ai_provenance_pipeline` | ADMIT | A | MEASURED | SCHEMATIC | `data/geometry_strategy.json`<br>`scripts/validate_geometry.py` |

## What each object claims, and does not

### Reference scope and state badge

**Claim.** The active visualization uses canonical human Q8WZ42, a skeletal N2A-containing titin reference, at the explicitly named structural state.

**Scope.** Homo sapiens; skeletal N2A-containing Q8WZ42; active state shown live

**Not claimed.**

- an isoform-neutral titin molecule
- a cardiac titin model
- a universal physiological resting length

### Continuous Z-disc-to-M-band titin path

**Claim.** One titin polypeptide runs continuously through a half-sarcomere from its Z-disc N terminus to its M-band C terminus.

**Scope.** Human Q8WZ42 topology in the retained half-sarcomere model

**Not claimed.**

- a resolved smooth molecular trajectory
- known transverse azimuth along the entire chain
- uniform spring behavior along the chain

### I-band spring regions and A-band scaffold

**Claim.** Titin is regionally heterogeneous: elastic I-band segments lie in series with an A-band segment integrated with the thick filament and a terminal M-region.

**Scope.** Human Q8WZ42 region order; current N2A-containing model

**Not claimed.**

- atom-level region surfaces
- a single elastic constant for all regions
- exact unresolved linker conformations

### Regional I-band extension

**Claim.** Across the modeled range, tandem-Ig chains primarily straighten while disordered spring regions extend; ordinary length change does not require widespread folded-domain unfolding.

**Scope.** Current modeled Q8WZ42 length states; passive geometry, not activation

**Not claimed.**

- normalization of AFM-scale Ig unfolding
- a measured time trajectory
- activation-dependent titin stiffening

### Live Z-disc, I-band, A-band, C-zone, bare-zone, and M-band brackets

**Claim.** The named sarcomere regions occupy distinct axial intervals, and their live boundaries must follow the same geometry used by the scene.

**Scope.** Current half-sarcomere geometry at the selected sarcomere length

**Not claimed.**

- that a bracket is a molecular structure
- that the bare zone and M-band are synonyms
- that all band boundaries are sharp molecular interfaces

### Scoped Z-disc actin/α-actinin network

**Claim.** Antiparallel actin filaments from adjacent sarcomeres interdigitate in the Z-disc and are crosslinked by α-actinin in a heterogeneous local network.

**Scope.** Fast mouse psoas thin-form Z-disc, interpreted as a lower-strain isolated-myofibril state; topology-only context for the human reference

**Not claimed.**

- a universal small-square lattice
- a universal basketweave state
- exact human Q8WZ42 lateral routing
- alternating end-to-end titin and actin

### α-Actinin crosslink doublets

**Claim.** The selected fast-psoas thin-form reconstruction contains α-actinin crosslink doublets separated by approximately 6 nm, with heterogeneous larger spacings.

**Scope.** Fast mouse psoas thin-form Z-disc only

**Not claimed.**

- regular repetition across the entire Z-disc
- presence in every muscle type or state
- a titin-actin end-to-end zigzag

### Titin Z1Z2–telethonin sandwich

**Claim.** Telethonin forms a palindromic 2:1 sandwich with two antiparallel titin Z1Z2 N-terminal fragments.

**Scope.** Experimentally resolved human titin fragment complex; mapped topologically into the retained Z-disc close-up

**Not claimed.**

- a decorative cap on one titin chain
- a resolved full in-situ titin route
- that telethonin crosslinks actin

### Universal regular Z-disc lattice

**Claim.** No single regular small-square, basketweave, or zigzag icon is admitted as the universal Z-disc arrangement.

**Scope.** All muscle types and structural states

**Not claimed.**

- that the omitted motif is biologically absent
- that Z-disc topology is completely unknown

### Central head-free bare zone

**Claim.** The bare zone is a central region of the bipolar thick filament characterized by absence of myosin heads, not a solid protein slab.

**Scope.** Relaxed mammalian skeletal thick-filament context; current modeled bare-zone interval

**Not claimed.**

- a 160 nm-wide M-line protein
- an impermeable central wall
- a complete molecular description of the bare zone

### M-band midpoint and crosslink context

**Claim.** The M-band is protein crosslinking and integration architecture near the sarcomere center, where thick filaments and titin from opposing half-sarcomeres meet.

**Scope.** Generic skeletal sarcomere relationship; exact crosslink positions unresolved in the retained model

**Not claimed.**

- complete M-band molecular structure
- exact myomesin/OBSL1 coordinates
- an opaque M-line wall
- identity of unresolved density

### M1 density

**Claim.** The sarcomere midpoint may be labeled as a coordinate reference, but no density in this showcase is identified as M1 from the 2023 averaged reconstruction.

**Scope.** Limitation from relaxed mouse cardiac M-band reconstruction; no coordinate transfer

**Not claimed.**

- that M1 is biologically absent
- that the midpoint marker is an observed density
- that cardiac M-band coordinates apply to the current reference

### Optional skeletal MyBP-C C-zone context

**Claim.** Skeletal MyBP-C is an accessory C-zone protein associated with the thick filament in an approximately 43 nm periodic context and can influence lattice and myosin-head regulation.

**Scope.** Fast MyBP-C in permeabilized mouse psoas; optional context for the human skeletal N2A model

**Not claimed.**

- cardiac cMyBP-C coordinates
- a universal rigid thick-to-thin bridge
- a direct titin–MyBP-C contact
- three exact molecules at every human titin superrepeat

### Orthographic myofilament lattice comparison

**Claim.** The current model places thick and thin filaments in a hexagonal lattice and predicts decreasing d10 as sarcomere length increases under its declared constant-volume idealization.

**Scope.** Current modeled lattice; primary comparison restricted to the declared 2000–2400 nm working band

**Not claimed.**

- time-resolved active contraction
- strict biological isovolumetry
- directly measured human skeletal d10
- a second lattice solver

### Object-linked explanations and sources

**Claim.** Every visible biological component must expose its role, active scope, evidence, shape encoding, source, and explicit non-claims without changing the underlying geometry.

**Scope.** Application presentation layer

**Not claimed.**

- that the leader line is a molecular bond
- that selection changes evidence
- that a citation validates an unsourced artistic detail

### N2A interaction-hub expert card

**Claim.** The N2A element contains a structured UN2A core with flexible flanks and experimentally characterized CARP binding; it can be discussed as an interaction hub without adding partner coordinates.

**Scope.** Human N2A-region structural and binding evidence; current Q8WZ42 region

**Not claimed.**

- complete N2A signalosome composition
- resolved partner coordinates
- one universal downstream pathway

### Titin kinase/M-region expert card

**Claim.** Titin contains a kinase domain near the A/M junction; its structural presence is established, while a single mechanical activation and signaling mechanism is not treated as settled.

**Scope.** Human Q8WZ42 kinase region; mechanism deliberately limited

**Not claimed.**

- a settled mechanosensor mechanism
- in-situ kinase orientation
- causal downstream signaling animation

### Proposed length-dependent activation context

**Claim.** Passive titin tension and MyBP-C are among proposed contributors to length-dependent thick-filament regulation, but the current visualization does not simulate that mechanism.

**Scope.** Qualified expert context; no cardiac mode and no active-mechanics implementation

**Not claimed.**

- settled causality
- that titin is the actomyosin motor
- automatic coupling between sarcomere length and activation

### Troponin/tropomyosin regulatory layer

**Claim.** Thin-filament calcium regulation is valid context but is outside the release-critical titin story and remains absent unless the separate post-core admission test passes.

**Scope.** Optional future structural reference with actual isoform composition disclosed

**Not claimed.**

- troponin binding-site dots as a complete regulatory mechanism
- calcium state inferred from sarcomere length
- generic isoform-free thin-filament geometry

### Evidence-to-render provenance explainer

**Claim.** The application is generated from cited scientific records, measured or modeled data, explicit evidence classes, procedural geometry, and executable validation rather than from an unaudited AI illustration.

**Scope.** This repository's implementation and validation workflow

**Not claimed.**

- that AI is a scientific authority
- that passing tests proves every biological interpretation
- that procedural geometry is experimental density

