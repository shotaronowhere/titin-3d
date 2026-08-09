# Provisional research synthesis for SD-01 through SD-05

- Record status: `UNREVIEWED_AI_SYNTHESIS`
- Prepared: 2026-08-10
- Revision: 2, after adversarial source and coordinate audit on 2026-08-10
- Candidate model fingerprint reviewed:
  `7c32782023041e9e4ced13b30828ffadda11f08e6b744d1a6857cfbb18a68d5c`
- Authority: none. This record is research assistance, not a scientific ruling, named-human
  review, implementation verification, or permission to change a decision status.
- Consumption rule: `data/scientific_decisions.json` remains authoritative. No validator,
  generator, runtime surface, release gate, or SC-20 implementation may consume this record as an
  approval.

## Executive determination

The source review supports strong candidate outcomes for all five questions, but it also confirms
why an engineer or AI must not self-approve them:

1. The pinned UniProt `DOMAIN` features are not a complete biological titin-domain map. In the N2A
   interval, the experimentally solved I81 domain is absent from UniProt's `DOMAIN` list even though
   PDB 5JOE/7AHS and primary papers establish it. Treating a database feature count as the whole
   architecture would preserve a known error.
2. The current A-band partition contains 179 imported UniProt domain rows beginning at residue
   14019. Separately, Bennett et al. consider 183 nomenclature-defined domains from A/I1 through
   A170 to be approximately associated with the cross-bridge region. No reviewed crosswalk yet
   maps those 183 named domains onto the current residue intervals. The literature also does not
   support the current exact 595 nm, 620 nm, 30 nm, and 150 nm intervals as one coherent geometry
   for the Q8WZ42-1 reference sequence.
3. The 11-domain sequence pattern, the 3.98 nm mean axial domain spacing, the 43.1 nm H periodicity,
   the approximately 45.5 nm L periodicity, and the approximately 14.3 nm myosin-crown spacing are
   distinct quantities. The source papers do not make 45.5 nm the exact molecular length of one
   titin super-repeat.
4. The current force output combines rat-psoas, recombinant-human, sequence-derived, and schematic
   inputs without a construct-specific validation or uncertainty model. It is useful as an
   engineering model but is not an approved human Q8WZ42-1 single-molecule force prediction.
5. The current representative-path policy is the defensible depiction. The isolated 2-titin:1-
   telethonin complex does not establish whole-sarcomere titin copy number, azimuth, or a complete
   in-situ load path.

Recommended reviewer dispositions are therefore:

| Decision | Recommended disposition | Short reason |
| --- | --- | --- |
| SD-01 | Remain `PENDING`; then `APPROVED` only after an exact source-by-source coordinate and nomenclature crosswalk | The four-Ig N2A architecture is supported, but the exact N2A start and distal-Ig/A-I partition are not yet reconciled |
| SD-02 | `DEFERRED` with the exact non-metric representation below | The measurements constrain landmarks but do not justify one exact cross-preparation axial partition |
| SD-03 | `APPROVED` with separated quantities and forbidden inferences | The primary sources distinguish the values clearly |
| SD-04 | `DEFERRED`; suppress release-facing quantitative pN output | Source-context laws can be retained for model development, but the transfer is not validated |
| SD-05 | `APPROVED` with the wording revisions below | Local topology is supported; global stoichiometry and complete attachment paths are not |

These are recommendations to the required reviewers, not actual status changes.

## SD-01 — sequence construct, N2A definition, and region partition

### Recommended disposition

Remain `PENDING`. SD-01 has no `DEFERRED` implementation path. The reviewer can approve it only
after supplying an exact crosswalk that reconciles the UniProt feature boundaries, experimental
construct boundaries, PDB/SIFTS mappings, and A/I-domain nomenclature. The ruling should bind to
canonical human Q8WZ42-1, sequence version 4, length 34,350 aa. No isoform offset is applied.

Once that ruling exists, extending the feature schema to admit structure/literature-backed domains
is an implementation requirement, not a precondition that an engineer may use to self-approve the
ruling. Implementation verification remains a separate later step.

### Evidence-backed architecture

The primary N2A literature defines the architectural element as four Ig domains, I80 through I83,
with an approximately 100-residue UN2A sequence between I80 and I81. The human source records do
not collapse into one exact, non-overlapping boundary table without adjudication:

| Element | Source-reported Q8WZ42 coordinates | Evidence and unresolved limit |
| --- | --- | --- |
| I80 | UniProt `Ig-like 77`: 9366–9470; experimental I80–UN2A–I81 construct: 9353–9671 | The construct establishes only its experimental extent, not an exact fold boundary. Its start at 9353 overlaps the pinned preceding `Ig-like 76` feature at 9272–9361; the records therefore require a crosswalk rather than a “flanking residues” assumption |
| UN2A | Experimental construct: 9472–9581 | Zhou et al. define UN2A at these coordinates. Their core construct is stated as 9505–9544; PDB/SIFTS maps deposited 7NIP residues to 9504–9544, with 40 of 41 deposited residues modeled. Preserve this one-residue record discrepancy |
| I81 | Experimental/PDB 5JOE construct: 9582–9671; also contained in the 7AHS I81–I83 construct at 9582–9851 | A human folded I81 is established and is absent from UniProt's `DOMAIN` rows. Do not infer its endpoint from the start of the next UniProt row |
| I82 | UniProt `Ig-like 78`: 9660–9755; contained in PDB 7AHS | This UniProt interval overlaps the experimental I81 construct through 9671. The exact fold/linker crosswalk requires adjudication |
| I83 | UniProt `Ig-like 79`: 9760–9851; contained in human PDB 7AHS | PDB 6YJ0 is mouse titin and is not evidence for an exact human Q8WZ42 boundary |

The architecture should not be represented as one Ig plus a 364-residue coil at 9852–10215. The
four-Ig N2A element ends with I83 at residue 9851 in the human structural construct. The following
interval has no pinned UniProt `DOMAIN` feature and no UniProt PEVK-repeat feature, but database
silence is not permission to assign it a biological name, conformation, or mechanical law.

### Candidate region partition

| Region/decision point | Coordinates or alternatives | Folded/repeat content | Required treatment |
| --- | --- | --- | --- |
| Proximal-Ig/N2A start | The current proximal region begins at 801. The experimental construct starts at 9353; the UniProt I80 feature starts at 9366; either may be rejected as a biological boundary | Counting only rows contained from residue 801 (and therefore excluding the two Z-disc Ig rows), an end at 9352 gives 73 Ig rows and leaves `Ig-like 76` crossing the boundary; an end at 9365 gives 74 contained rows | Reviewer must choose and justify a boundary or supply a source-backed replacement; until then do not publish an exact proximal-Ig count or contour |
| `N2A` | Start unresolved as above; end 9851 | I80, UN2A, I81, I82, I83 | Four Ig domains are established. The 39 nm contour applies to one N2A-Us under the AFM construct conditions described in SD-04, not to this full interval |
| Unadjudicated interval | 9852–10215 | No pinned UniProt `DOMAIN` feature or UniProt PEVK-repeat feature | Preserve as an explicit sequence interval with structure, biological-region identity, and mechanics `UNKNOWN` |
| `PEVK` | 10216–12022 | 31 UniProt PEVK repeats | Retain the current boundaries; distinguish repeat-bearing subintervals from intervening sequence |
| Distal-Ig/A-I unresolved interval | 12023–14018 | 16 contained UniProt Ig rows | Do not split 12 plus 4 merely to reconcile a literature total. Reviewer must map these rows to the A/I nomenclature and then assign elastic versus thick-filament-associated membership |
| Current downstream A-band interval | 14019–32177 | 179 contained UniProt Ig/Fn3 rows | Preserve as the current database-feature observation. Do not equate it, alone or plus four preceding rows, to Bennett's A/I1–A170 set without a domain-name/residue crosswalk |

The previously proposed 13565 cutoff is withdrawn. It was an arithmetic reconciliation, not a
source-mapped boundary.

### Domain-total consequence

The project's global total of 152 Ig-like domains is the number of imported UniProt `DOMAIN` rows,
not a defensible statement that the canonical molecule contains only 152 biological Ig folds.
TITINdb2 and experimentally solved constructs identify folded domains absent from that feature list,
including I81. SC-20 should therefore store at least three separate counts:

- `uniprot_domain_feature_count`;
- `curated_biological_domain_count` with source and coordinate crosswalk;
- `rendered_domain_count` plus every intentional omission.

No validator should force those distinct counts to be numerically identical.

### Required public wording

> N2A is the I80–UN2A–I81–I82–I83 signaling element. This view uses canonical human
> Q8WZ42-1 coordinates, but the exact I80 start and the downstream distal-Ig/A-I-junction
> crosswalk remain under specialist review. UN2A and the following unadjudicated interval are
> schematic; no measured in-situ conformation is claimed.

### Sources reviewed

- UniProt Q8WZ42, canonical sequence and feature table:
  <https://www.uniprot.org/uniprotkb/Q8WZ42>
- Zhou et al., 2021, especially Fig. 1, Methods constructs, and PDB 7NIP:
  <https://doi.org/10.1016/j.jmb.2021.166901>
- Stronczek et al., 2021, I81–I83 residues 9582–9851 and PDB 7AHS:
  <https://doi.org/10.1085/jgp.202012766>
- RCSB/SIFTS primary records for PDB 5JOE, 7AHS, 7NIP, and mouse 6YJ0:
  <https://www.rcsb.org/structure/5JOE>, <https://www.rcsb.org/structure/7AHS>,
  <https://www.rcsb.org/structure/7NIP>, <https://www.rcsb.org/structure/6YJ0>
- Lanzicher et al., 2020, N2A-Us mechanical construct:
  <https://doi.org/10.3389/fphys.2020.00173>
- TITINdb2 domain/structure crosswalk and its stated differences from UniProt features:
  <https://doi.org/10.1093/bioadv/vbaf062>

## SD-02 — A-band, kinase, bare-zone, and M-line axial budget

### Recommended disposition

`DEFERRED`, with a non-metric schematic representation. The evidence rejects the current internally
conflicting exact values, but it does not establish one exact set of boundaries from the A/I
junction through titin m10 for the tissue-neutral Q8WZ42-1 reference sequence.

### Measurements that may be stored but must not be collapsed

| Observation | Source context | Permitted use |
| --- | --- | --- |
| Mean A-band domain spacing 3.98 nm, 95% CI 3.92–4.03 | Glutaraldehyde-fixed isolated rabbit-psoas skeletal myofibrils in rigor; antibody localization/regression | A source-specific mean axial spacing, not a universal 4 nm contour or exact molecular path |
| A/I-region antibody positions around 780–820 nm from the source-defined M1 line; A170 around 75–106 nm depending datum/model | Mixed skeletal preparations and methods summarized by Bennett et al. | Landmark constraints with individual provenance. `M1 line` is the source's axial datum, not an identification of the model's molecular M1 density |
| C-zone approximately 600–110 nm from the middle of the A-band/M-band | Skinned mouse papillary myocardium, IEM/SIM | Cardiac C-zone localization; not an exact boundary for the tissue-neutral reference sequence |
| Bare-zone edge approximately 77 nm from the middle of the M-band; modeled C-zone end approximately 33 nm before that edge | Mouse cardiac observations plus schematic inference in Tonino et al. | A cardiac reference observation and derived placement, not a universal 160 nm full bare-zone identity |
| TK antibody localization: 78 ± 8 nm from the M1 line | STED using mouse cardiac plus mouse- and rabbit-psoas myofibrils | A cross-preparation antibody observation. The reported resolution does not distinguish proposed P1 and A1 placements 43 nm apart |
| Proposed TK placements near 77 and 105 nm from the M-band center | Native relaxed mouse cardiac cryo-ET model; clear titin-α path and proposed titin-β path | Keep the α and β proposals distinct; neither is an exact coordinate transfer to Q8WZ42-1 |
| Isolated kinase longest extent 6.53 nm, N-to-C 4.45 nm | Recombinant structures measured in the repository | Render-envelope evidence only; not in-situ axial placement |
| A170–NL–TK–CRD–IgM1 is compact | Recombinant human multidomain structure | Reject a simple straight 4 nm/domain chain through this transition; `IgM1` here names the titin domain, not the M1 line |

### Deferred representation

1. Remove the unsupported 595 nm declared length and do not retain 620 nm as a biological claim
   merely because it equals the current coordinate difference.
2. Store Bennett et al.'s approximately cross-bridge-associated A/I1–A170, 183-domain observation
   in its source nomenclature. Do not map it to the current 179 domain rows or add four preceding
   rows until SD-01 supplies the exact nomenclature/residue crosswalk.
3. Store every measured landmark above as a separate source observation with its own species,
   muscle, preparation, method, uncertainty, and locator.
4. Render A-band titin as bound along the thick filament from the I/A junction toward the central
   head-free region, but do not place an exact distal endpoint from the deferred observations.
5. Render one compact kinase glyph at an `A/M transition` target. Its scientific axial coordinate is
   `null`. Evidence mode may show the 78 ± 8 nm STED result and the separately proposed 77/105 nm
   cardiac placements as distinct source markers; do not merge them into a confidence interval.
6. Render titin m1–m10 as a sparse, irregular, schematic path entering the M-band network. Do not
   give the sequence a 150 nm straight-chain span, and do not allocate the unaccounted sequence as
   empty axial distance.
7. Keep the sarcomere midpoint marker zero-width. Do not equate that marker, the source-defined M1
   line, any unresolved M1 density, titin m1, kinase, the full bare zone, or the M-band.

### Exact public caveat

> A-band and M-band titin are shown as a schematic bound path. Published localizations constrain
> the A/I junction, C-zone, bare-zone edge, kinase, and M-band in different species and
> preparations; this view does not claim exact boundaries for the tissue-neutral human Q8WZ42-1
> reference sequence or a straight molecular path through those landmarks. Source-defined M1-line
> distances and titin m-domain names are distinct.

### Sources reviewed

- Bennett et al., 2020, Figs. 1–6 and Tables 1–4:
  <https://doi.org/10.1016/j.jmb.2020.06.025>
- Tonino et al., 2019, especially Fig. 8:
  <https://doi.org/10.1016/j.yjmcc.2019.05.026>
- Tamborrini et al., 2023, native cardiac filament, 78 ± 8 nm antibody localization, and proposed
  77/105 nm TK placements:
  <https://doi.org/10.1038/s41586-023-06690-5>
- Bogomolovas et al., 2021, compact human A170–M1 kinase-region structure:
  <https://doi.org/10.15252/embr.201948018>
- Obermann et al., 1996, M-band titin immunolocalization:
  <https://doi.org/10.1083/jcb.134.6.1441>

## SD-03 — axial quantities, periodicities, and register

### Recommended disposition

`APPROVED`, using separate fields and the forbidden-inference rules below.

| Quantity | Approved candidate label | Value/source context | Evidence class | Not claimed |
| --- | --- | --- | --- | --- |
| C-zone sequence unit | `c_zone_sequence_super_repeat_domain_count` | 11 Ig/Fn3 domains in the declared sequence pattern | `MEASURED` for sequence composition | an axial length |
| Mean axial domain spacing | `rabbit_psoas_mean_titin_domain_spacing_nm` | 3.98 nm; 95% CI 3.92–4.03; antibody-localization regression on glutaraldehyde-fixed rigor myofibrils | `MEASURED` | every domain is exactly this long; universal human spacing; an unfixed relaxed-state value |
| Derived 11-domain interval | `derived_11_domain_interval_nm` | 11 × 3.98 = 43.8 nm; transformed slope-CI endpoints approximately 43.1–44.3 | `STRONGLY INFERRED` | an individually measured molecular end-to-end length or an independent measurement |
| Myosin helical H periodicity | `myosin_head_H_periodicity_nm` | approximately 43.1 nm at 35 °C; 43.17 in demembranated rabbit psoas with 5% Dextran and 43.11 in intact resting mouse EDL | `MEASURED` | invariant across temperature, activation, lattice spacing, or preparation |
| Myosin crown spacing | `myosin_crown_spacing_nm` | approximately 14.3–14.4 nm; third-order axial spacing of the H array | `MEASURED` | a titin-domain spacing |
| Purely axial L periodicity | `thick_filament_L_periodicity_nm` | approximately 45.5 nm; best estimate 45.54 nm from M2L in demembranated rabbit psoas at 35 °C with 5% Dextran; source warns it remains approximate | `MEASURED` for the diffraction spacing | exact titin super-repeat molecular length |
| Proposed titin origin of L | `L_periodicity_titin_origin_hypothesis` | possible association with C-type titin super-repeats, modeled as 11 repeats overlapping 35 rather than 33 myosin-head layers | `INFERRED` | proven molecular identity, exact molecular length, or register |
| MyBP-C/titin register | `mybpc_titin_register_observations` | source-dependent estimates around super-repeat domains 8–11 | `INFERRED` | one exact universal binding domain/register |

The value `45.5` must be removed from any field named `titin_super_repeat_nm`. Similar magnitudes do
not make the H periodicity, L periodicity, mean sequence-domain interval, and MyBP-C register the
same physical quantity.

### Exact public wording

> Titin's C-zone sequence repeats every 11 domains. In fixed rabbit-psoas rigor myofibrils, an
> antibody-localization regression gives a mean axial domain spacing of 3.98 nm, implying about
> 43.8 nm per 11-domain interval. Separately, near-physiological-temperature diffraction resolves
> an approximately 43.1 nm myosin helical periodicity and an approximately 45.5 nm purely axial
> thick-filament periodicity. A titin contribution to the latter is a structural hypothesis, not
> an exact molecular-length or register measurement.

### Sources reviewed

- Bennett et al., 2020:
  <https://doi.org/10.1016/j.jmb.2020.06.025>
- Tonino et al., 2019:
  <https://doi.org/10.1016/j.yjmcc.2019.05.026>
- Caremani et al., 2021, especially Table 1 and “Origin of the L periodicity”:
  <https://doi.org/10.1085/jgp.202012713>

## SD-04 — force laws, parameter transfers, and supported range

### Recommended disposition

`DEFERRED`. Retain the deterministic solver for engineering and later sensitivity work, but suppress
release-facing quantitative pN output until the corrected SD-01 contours are regenerated and a
mechanics specialist approves the cross-species/construct transfer and uncertainty treatment.

### Parameter-level recommendation

| Current input | Candidate treatment |
| --- | --- |
| Tandem-Ig WLC, persistence length 21 nm | Retain only as a cited rat-psoas/reference-model input. Do not claim it as a measured value for both corrected human proximal and distal chains without a direct locator and sensitivity range |
| UN2A WLC, contour 39 nm and persistence 0.34–0.35 nm | Attribute these values to one 104-residue human N2A-Us as inferred by comparing recombinant AFM constructs containing zero, one, or two N2A-Us copies flanked by duplicated I80/I81 domains and terminal handles. Do not describe N2A-Us as measured in isolation, or assign this contour to the full four-Ig N2A element or residues 9852–10215 |
| PEVK extensible WLC, persistence length 0.55 nm and stretch modulus 185 pN | Retain only as the entropic–enthalpic modified-WLC fit to the rat-psoas PEVK data using an assumed 476 nm contour. Separate it from the pure-entropic WLC fit (`A` approximately 0.65 nm), which became inadequate above approximately 12 pN or 60% extension. The 60% point is a model crossover, not the modified-WLC validity limit |
| 300 K | Label as a model convention, not a measured subject temperature |
| Current contour lengths | Invalidate and regenerate after SD-01. Do not hand-copy old force or partition outputs |

For the PEVK fit, contour uncertainty and stretch modulus are coupled in the source: changing the
assumed contour from 450 to 500 nm changed the fitted stretch modulus from approximately 150 to
250 pN while leaving the persistence length comparatively stable. Any retained development model
must carry that dependence rather than treating 185 pN as construct-independent.

### Supported and unsupported use

- A qualitative, deterministic comparison of how one chosen series-chain parameterization changes
  with model length is supportable.
- A measured or individualized human-Q8WZ42-1 force is not supportable.
- The 1,900 nm state is outside the declared 2,000–2,400 nm working range. Because the equations have
  no slack, contact, or compression law, the model cannot determine whether any of those regimes
  applies; it must not display a biological quantitative force there.
- The 3,000 nm state is also outside the declared working range. Its current PEVK state is near the
  source's pure-entropic-to-enthalpic crossover, not a demonstrated validity limit of the modified
  WLC. The numerical transfer to this human reference sequence remains unvalidated.
- Even within 2,000–2,400 nm, the numerical pN output remains an unvalidated transfer until the
  corrected architecture, titin stoichiometry convention, parameter covariance, and preparation
  mapping are reviewed.
- Ig unfolding/refolding, hysteresis, filament contact, compression, and phosphorylation-state
  dependence are absent. Ordinary working-length animation must keep Ig domains folded.
- The existing one-at-a-time sensitivity table is useful but is not an uncertainty distribution,
  confidence interval, validation set, or covariance analysis.

### Exact public caveat while deferred

> Quantitative passive force is withheld pending specialist review. The underlying curve is an
> illustrative series-chain calculation that combines rat-psoas tandem-Ig and entropic–enthalpic
> PEVK fits, recombinant-human N2A-Us construct measurements, and canonical-sequence contours. It
> is not a measured or individualized human force, has no confidence interval, and does not model
> slack, contact, compression, hysteresis, or Ig unfolding.

If a development-only value remains visible in Evidence mode, prefix it with `Unreviewed model:` and
keep the complete caveat adjacent to the number.

### Sources reviewed

- Linke et al., 1998, PEVK force-extension fits, contour dependence, and entropic/enthalpic
  crossover:
  <https://doi.org/10.1073/pnas.95.14.8052>
- Lanzicher et al., 2020, comparative recombinant N2A-Us AFM constructs and the reported 1.4%
  effect in an adult-cardiac-N2BA simulation (predicted by the authors to be still smaller in fetal
  cardiac and skeletal titins):
  <https://doi.org/10.3389/fphys.2020.00173>
- Stronczek et al., 2021, N2A domain architecture:
  <https://doi.org/10.1085/jgp.202012766>

## SD-05 — terminal anchoring, stoichiometry, and depiction semantics

### Recommended disposition

`APPROVED` with the following bounded wording and depiction rules.

### Approved candidate claims

1. **Telethonin topology:** “In the recombinant human complex, one telethonin molecule forms an
   antiparallel sandwich with two titin Z1Z2 fragments.” Evidence class `MEASURED`; render class
   `SCHEMATIC`. Do not call telethonin the sole titin anchor or infer the complete in-situ load path.
2. **Z-disc network:** “Antiparallel thin filaments from adjacent sarcomeres interdigitate at the
   Z-disc and are crosslinked by α-actinin in a heterogeneous network.” Evidence class `MEASURED`
   for the cited mouse-psoas preparation; render class `SCHEMATIC`. Do not claim a universal square
   lattice or exact human titin route.
3. **α-Actinin spacing:** Retain the directly observed “6 nm α-actinin doublets” claim and bind it
   to the selected thin-form fast-mouse-psoas Z-disc in rigor. Separately, Supplementary Fig. S7E
   reports adjacent-α-actinin histogram peaks at 6–9, 24–27, and 36–39 nm; the 24–27 nm peak is
   described as arising from the other two spacing classes. Do not substitute the histogram bins
   for the doublet observation or repeat any spacing regularly across the whole disc.
4. **M-band:** “Near the sarcomere midpoint, titin C-terminal regions, thick filaments, myomesin,
   and obscurin/OBSL1 participate in a heterogeneous integration network.” Use `STRONGLY INFERRED`
   for the generalized relationship and `SCHEMATIC` for the render. Do not assign unresolved
   densities or exact partner coordinates.
5. **M10–OBSL1:** The isolated recombinant human M10–OBSL1 Ig1 head-to-tail complex is `MEASURED`.
   It is not a complete M-band attachment map.
6. **Representative path:** “One representative titin sequence path is shown. The number and
   azimuth of titin molecules around each native filament are not depicted.” This is a depiction
   disclaimer, not a one-copy stoichiometry claim.

### Depiction rules

- Keep two antiparallel Z1Z2 proxies visible through a finite telethonin overlap; never draw
  telethonin as a cap on one chain.
- Draw α-actinin as relationship connectors between antiparallel actin filaments. Restrict
  source-specific doublet/histogram detail to Evidence mode and resolvable zoom. Label the source
  as isolated fast mouse psoas in rigor and the chosen thin-form Z-disc as one preparation-specific
  reconstruction; the authors' strain/state interpretation remains a hypothesis.
- Keep the Z-disc slab visually subordinate in close-up so it does not imply a solid wall or hide
  the supported local topology.
- Keep the midpoint coordinate marker zero-width. Draw sparse M-band relationship context without
  identifying unresolved density or turning the region into an opaque plate. Do not conflate the
  marker, an M1 line/density, or titin m1.
- Do not add a six-strand/whole-filament titin view. The older three-versus-six titin estimates and
  newer cardiac filament tracks are not an approved stoichiometry for this reference construct.

### Exact public caveat

> Terminal close-ups show supported local relationships, not complete attachment mechanisms.
> Telethonin's 2-titin:1 topology is measured for an isolated human complex. The α-actinin
> doublets come from one thin-form fast-mouse-psoas Z-disc reconstructed in rigor, and M-band
> context comes from specific preparations. One representative titin path is shown, with native
> copy number, azimuth, and unresolved partner coordinates intentionally unspecified.

### Sources reviewed

- Zou et al., 2006 and PDB 1YA5, recombinant human 2:1 topology:
  <https://doi.org/10.1038/nature04343>
- Wang et al., 2021, mouse-psoas Z-disc and M-band cryo-ET:
  <https://doi.org/10.1016/j.cell.2021.02.047>
- Obermann et al., 1996, M-band component localization:
  <https://doi.org/10.1083/jcb.134.6.1441>
- Sauer et al., 2010 and PDB 3KNB, human M10–OBSL1 complex:
  <https://doi.org/10.1038/embor.2010.65>

## Verification scope

`npm run verify:sc19` validates the repository's authoritative, generated, runtime, citation,
decision-ledger, and negative-control state. Passing it establishes that this research-only file
did not mutate or bypass those controls. It does **not** validate the scientific entailment of this
document, approve any candidate disposition, verify a literature coordinate crosswalk, or replace
the required human review.

## What remains for qualified reviewers

The reviewers do not need to repeat the repository engineering audit, but they must independently:

1. open the cited locators and confirm the coordinate/nomenclature crosswalk;
2. resolve the 9353-versus-9366 N2A start alternatives, the PDB/UniProt I81–I82 overlap, and the
   distal-Ig/A-I nomenclature-to-residue mapping without reusing the withdrawn 13565 arithmetic
   cutoff unless independent source evidence establishes it;
3. accept the exact deferred SD-02 and SD-04 caveats or provide better bounded representations;
4. disclose conflicts, consent to publication of their review metadata, and sign the reviewed
   payload digest against the current model fingerprint;
5. after implementation, verify that the resulting model and byte-digested evidence implement the
   ruling. A source ruling alone is not implementation verification.

Until those actions occur, SD-01 through SD-05 remain `PENDING`, SC-20 remains blocked, and this
document must never be cited as human approval.
