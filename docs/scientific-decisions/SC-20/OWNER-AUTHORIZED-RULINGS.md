# SC-20 owner-authorized scientific rulings

- Record schema: `titin-owner-authorized-rulings/1`
- Authorization date: `2026-08-12`
- Authority: project owner instruction that reputable journals and well-cited papers are sufficient
  for project scientific approval
- Adjudicator: OpenAI Codex, performing citation-backed synthesis under that authorization
- Independent human expert review claimed: **no**
- Scope: implementation rulings for SD-01 through SD-05; this record does not satisfy the separate
  SC-27 human-review, usability, or release-attestation gates
- Reviewed model fingerprint: `7c32782023041e9e4ced13b30828ffadda11f08e6b744d1a6857cfbb18a68d5c`

The word “approved” below means approved for this project's implementation under the owner's stated
evidence policy. It does not mean journal peer review of this software, clinical validation, or an
independent specialist attestation.

## SD-01 — APPROVED with a conservative coordinate policy

Use canonical human UniProt Q8WZ42-1, sequence version 4, length 34,350 aa. The implementation
partition is:

| Region | Canonical residues | Count used by the renderer | Basis and limit |
| --- | ---: | ---: | --- |
| `prox_Ig` | 801–9365 | 74 Ig-like domains | Ends immediately before UniProt I80 (`Ig-like 77`, 9366–9470). This is a reproducible project boundary, not a claim that UniProt fixes the biological N2A edge uniquely. |
| `N2A` | 9366–9851 | 4 Ig-like domains plus UN2A | I80–UN2A–I81–I82–I83. I81 is experimentally established but absent from the imported UniProt DOMAIN rows. Preserve the 9582–9671 experimental I81 / 9660–9755 UniProt I82 overlap as a source crosswalk conflict; do not “repair” it by arithmetic. |
| `post_N2A_unknown` | 9852–10215 | 0 | Explicit unadjudicated sequence interval. Structure, biological-region name, physical contour, and mechanics remain `UNKNOWN`; it is excluded from the force law rather than assigned silently to N2A or PEVK. |
| `PEVK` | 10216–12022 | 31 sequence repeats; no folded-domain glyphs | Retain the pinned UniProt PEVK-repeat-bearing interval. |
| `dist_Ig` | 12023–14018 | 16 Ig-like domains | Directly contained UniProt rows. The exact distal-Ig/A-I nomenclature crosswalk remains unresolved, so this is an explicit project interval and not a universal A/I-junction claim. |

Store imported UniProt feature count (152), curated biological fold count (153, adding I81), and
rendered fold count (153) separately. No validator may force them to be equal.

Primary evidence: UniProt Q8WZ42 feature snapshot; Zhou et al. `10.1016/j.jmb.2021.166901`, Fig. 1,
Methods constructs, PDB 7NIP; Stronczek et al. `10.1085/jgp.202012766`, I81–I83 construct and PDB
7AHS; PDB 5JOE; TITINdb2 `10.1093/bioadv/vbaf062`. The newer I82 and I82–I83 studies
`10.1007/s10858-026-00493-2` and `10.1002/pro.70378` use mouse constructs and corroborate domain
identity/structure, not exact human Q8WZ42 boundaries.

Public caveat: “N2A is shown as the human I80–UN2A–I81–I82–I83 element. Canonical Q8WZ42-1
coordinates are used under an explicit project boundary policy; the I81/I82 source overlap and the
following 9852–10215 interval remain unresolved, and no conformation or mechanics is assigned to
that interval.”

## SD-02 — DEFERRED with a non-metric topology

Reject the conflicting 595/620 nm A-band claims, the 30 nm kinase molecular span, and the 150 nm
straight M-line molecular span. Preserve one continuous display path from the A/I junction to the
sarcomere midpoint, but classify all A/M subregion coordinates as `SCHEMATIC` display allocation,
not molecular lengths or exact boundaries.

The admissible kinase placement observations remain separate:

- 78 ± 8 nm from the source-defined M1 line by STED across mouse cardiac and mouse/rabbit psoas;
- proposed titin-α and titin-β placements near 77 and 105 nm from the M-band center in native
  relaxed mouse cardiac cryo-ET;
- isolated kinase N-to-C extent 4.45 nm and longest extent 6.53 nm in repository measurements.

For a bounded deterministic display, use 70–105 nm from the sarcomere midpoint as an owner-approved
schematic placement envelope. It is the union-rounded display envelope of the reported/proposed
landmarks, **not** a confidence interval. Put the compact kinase glyph at the envelope midpoint;
keep its measured proxy size independent of the envelope. The A-band path reaches the outer edge of
that envelope; the M-line path enters the midpoint from its inner edge. These allocations preserve
continuity but claim no molecular span.

Primary evidence: Bennett et al. `10.1016/j.jmb.2020.06.025`, Figs. 1–6 and Tables 1–4; Tonino et
al. `10.1016/j.yjmcc.2019.05.026`, especially Fig. 8; Tamborrini et al.
`10.1038/s41586-023-06690-5`; Bogomolovas et al. `10.15252/embr.201948018`; Obermann et al.
`10.1083/jcb.134.6.1441`. Hoover Browne et al. `10.1085/jgp.202513891` strengthens the evidence
that the mouse P-zone has a structural role, but does not supply exact human Q8WZ42 axial boundaries.

Public caveat: “A-band and M-band titin are shown as a schematic bound path. Published localizations
constrain the A/I junction, C-zone, bare-zone edge, kinase, and M-band in different species and
preparations; this view does not claim exact boundaries for the tissue-neutral human Q8WZ42-1
reference sequence or a straight molecular path through those landmarks. Source-defined M1-line
distances and titin m-domain names are distinct.”

## SD-03 — APPROVED with physically distinct fields

Adopt the following non-interchangeable quantities:

| Field | Value | Evidence | Preparation and not-claimed rule |
| --- | ---: | --- | --- |
| `c_zone_sequence_super_repeat_domain_count` | 11 domains | `MEASURED` sequence composition | Not an axial length. |
| `rabbit_psoas_mean_titin_domain_spacing_nm` | 3.98; 95% CI 3.92–4.03 | `MEASURED` | Fixed isolated rabbit-psoas rigor myofibrils; not universal human spacing. |
| `derived_11_domain_interval_nm` | 43.78; transformed CI 43.12–44.33 | `STRONGLY INFERRED` | Arithmetic transformation of the preceding regression; not an independent molecular-span measurement. |
| `myosin_head_H_periodicity_nm` | 43.17 (context value) | `MEASURED` | Rabbit psoas at 35 °C with 5% Dextran; preparation dependent. |
| `myosin_crown_spacing_nm` | 14.3 (display source value) | `MEASURED` | Third-order crown spacing; not titin-domain spacing. |
| `thick_filament_L_periodicity_nm` | 45.54, approximate | `MEASURED` diffraction spacing | Not an exact titin super-repeat molecular length. |
| `L_periodicity_titin_origin_hypothesis` | possible titin contribution | `INFERRED` | Not proven identity or exact register. |

Primary evidence: Bennett et al. `10.1016/j.jmb.2020.06.025`; Tonino et al.
`10.1016/j.yjmcc.2019.05.026`; Caremani et al. `10.1085/jgp.202012713`, Figs. 4–7, Table 1, and
“Origin of the L periodicity.” Remove every field or sentence that treats 45.5 nm as the exact
molecular length of one 11-domain titin repeat.

## SD-04 — DEFERRED; quantitative force is not public evidence

Retain the deterministic common-force solver as a development/audit model only. It combines
rat-psoas polymer parameters, recombinant-human N2A information, and a Q8WZ42-1 sequence layout;
it omits slack/buckling/contact, isoform-dependent terms, phosphorylation states, uncertainty
propagation, and unfolding/refolding transitions. The 2025 human-fibre study
`10.1113/EP092361` provides tissue/fibre-level human passive-viscoelastic evidence but does not
validate these single-molecule parameter transfers.

Public caveat: “Regional extension is a deterministic model illustration. Quantitative pN output is
withheld because the current parameter transfers, validity range, uncertainty, slack/contact, and
unfolding omissions have not been validated for human Q8WZ42-1.”

## SD-05 — APPROVED for the consumed depiction rules

- Show one representative Q8WZ42-1 molecule per primary half-sarcomere path; do not expose the
  six-strand rendering as a public view or interpret the representative path as copy number.
- Telethonin: preserve the measured recombinant-human antiparallel 2-titin:1-telethonin sandwich
  topology; do not claim telethonin alone bears all in-situ titin tension.
- α-Actinin/Z-disc: keep the fast-mouse-psoas thin-form local network and approximate 6 nm
  doublets preparation-labelled and schematic; do not universalize the lattice.
- M-band: use a zero-width midpoint coordinate and sparse schematic relationships; do not identify
  unresolved density or assign exact myomesin/OBSL1 coordinates.

Primary evidence: `10.1038/nature04343` / PDB 1YA5; `10.1016/j.cell.2021.02.047`;
`10.1083/jcb.134.6.1441`; `10.1038/embor.2010.65` / PDB 3KNB.

Public caveat: “One representative titin molecule is shown. Copy number and azimuth are not encoded;
terminal partners preserve only source-supported topology, while unresolved in-situ paths remain
schematic.”
